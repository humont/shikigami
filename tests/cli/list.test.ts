import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { Database } from "bun:sqlite";
import { runInit } from "../../src/cli/commands/init";
import { runList } from "../../src/cli/commands/list";
import { createFuda, updateFudaStatus } from "../../src/db/fuda";
import { FudaStatus } from "../../src/types";

describe("list command", () => {
  let testDir: string;
  let db: Database;

  beforeEach(async () => {
    testDir = mkdtempSync(join(tmpdir(), "shiki-test-"));
    await runInit({ projectRoot: testDir });
    db = new Database(join(testDir, ".shikigami", "shiki.db"));
  });

  afterEach(() => {
    db.close();
    rmSync(testDir, { recursive: true, force: true });
  });

  describe("listing all fuda", () => {
    test("returns empty array when no fuda exist", async () => {
      const result = await runList({ projectRoot: testDir });

      expect(result.success).toBe(true);
      expect(result.fudas).toEqual([]);
    });

    test("excludes done fuda by default", async () => {
      const fuda1 = createFuda(db, {
        title: "Pending task",
        description: "First description",
      });
      const fuda2 = createFuda(db, {
        title: "Done task",
        description: "Second description",
      });
      updateFudaStatus(db, fuda2.id, FudaStatus.DONE);

      const result = await runList({ projectRoot: testDir });

      expect(result.success).toBe(true);
      expect(result.fudas).toHaveLength(1);
      expect(result.fudas![0].title).toBe("Pending task");
    });

    test("excludes failed fuda by default", async () => {
      const fuda1 = createFuda(db, {
        title: "Pending task",
        description: "First description",
      });
      const fuda2 = createFuda(db, {
        title: "Failed task",
        description: "Second description",
      });
      updateFudaStatus(db, fuda2.id, FudaStatus.FAILED);

      const result = await runList({ projectRoot: testDir });

      expect(result.success).toBe(true);
      expect(result.fudas).toHaveLength(1);
      expect(result.fudas![0].title).toBe("Pending task");
    });

    test("includes all active statuses by default", async () => {
      createFuda(db, { title: "Pending", description: "desc" });
      const ready = createFuda(db, { title: "Ready", description: "desc" });
      updateFudaStatus(db, ready.id, FudaStatus.READY);
      const inProgress = createFuda(db, { title: "In Progress", description: "desc" });
      updateFudaStatus(db, inProgress.id, FudaStatus.IN_PROGRESS);
      const inReview = createFuda(db, { title: "In Review", description: "desc" });
      updateFudaStatus(db, inReview.id, FudaStatus.IN_REVIEW);
      const blocked = createFuda(db, { title: "Blocked", description: "desc" });
      updateFudaStatus(db, blocked.id, FudaStatus.BLOCKED);

      const result = await runList({ projectRoot: testDir });

      expect(result.success).toBe(true);
      expect(result.fudas).toHaveLength(5);
      const titles = result.fudas!.map((f) => f.title);
      expect(titles).toContain("Pending");
      expect(titles).toContain("Ready");
      expect(titles).toContain("In Progress");
      expect(titles).toContain("In Review");
      expect(titles).toContain("Blocked");
    });

    test("returns empty when all fuda are done", async () => {
      const fuda1 = createFuda(db, { title: "Done 1", description: "desc" });
      const fuda2 = createFuda(db, { title: "Done 2", description: "desc" });
      updateFudaStatus(db, fuda1.id, FudaStatus.DONE);
      updateFudaStatus(db, fuda2.id, FudaStatus.DONE);

      const result = await runList({ projectRoot: testDir });

      expect(result.success).toBe(true);
      expect(result.fudas).toHaveLength(0);
    });

    test("excludes soft-deleted fuda by default", async () => {
      const fuda1 = createFuda(db, {
        title: "Active task",
        description: "Still active",
      });
      const fuda2 = createFuda(db, {
        title: "Deleted task",
        description: "Soft deleted",
      });
      // Soft delete fuda2
      db.run(
        "UPDATE fuda SET deleted_at = datetime('now') WHERE id = ?",
        [fuda2.id]
      );

      const result = await runList({ projectRoot: testDir });

      expect(result.success).toBe(true);
      expect(result.fudas).toHaveLength(1);
      expect(result.fudas![0].title).toBe("Active task");
    });

    test("orders fuda by priority (descending) then created_at (ascending)", async () => {
      const lowPriority = createFuda(db, {
        title: "Low priority",
        description: "Low",
        priority: 1,
      });
      const highPriority = createFuda(db, {
        title: "High priority",
        description: "High",
        priority: 10,
      });
      const mediumPriority = createFuda(db, {
        title: "Medium priority",
        description: "Medium",
        priority: 5,
      });

      const result = await runList({ projectRoot: testDir });

      expect(result.success).toBe(true);
      expect(result.fudas).toHaveLength(3);
      expect(result.fudas![0].title).toBe("High priority");
      expect(result.fudas![1].title).toBe("Medium priority");
      expect(result.fudas![2].title).toBe("Low priority");
    });
  });

  describe("filtering by status", () => {
    test("filters fuda by single status", async () => {
      const pending = createFuda(db, {
        title: "Pending task",
        description: "Pending",
      });
      const done = createFuda(db, {
        title: "Done task",
        description: "Done",
      });
      updateFudaStatus(db, done.id, FudaStatus.DONE);

      const result = await runList({
        projectRoot: testDir,
        status: FudaStatus.DONE,
      });

      expect(result.success).toBe(true);
      expect(result.fudas).toHaveLength(1);
      expect(result.fudas![0].title).toBe("Done task");
    });

    test("filters fuda by pending status", async () => {
      const pending = createFuda(db, {
        title: "Pending task",
        description: "Pending",
      });
      const inProgress = createFuda(db, {
        title: "In progress task",
        description: "In progress",
      });
      updateFudaStatus(db, inProgress.id, FudaStatus.IN_PROGRESS);

      const result = await runList({
        projectRoot: testDir,
        status: FudaStatus.BLOCKED,
      });

      expect(result.success).toBe(true);
      expect(result.fudas).toHaveLength(1);
      expect(result.fudas![0].title).toBe("Pending task");
    });

    test("returns empty array when no fuda match status filter", async () => {
      createFuda(db, {
        title: "Pending task",
        description: "Pending",
      });

      const result = await runList({
        projectRoot: testDir,
        status: FudaStatus.FAILED,
      });

      expect(result.success).toBe(true);
      expect(result.fudas).toEqual([]);
    });
  });

  describe("JSON output format", () => {
    test("returns JSON-serializable result", async () => {
      createFuda(db, {
        title: "Test task",
        description: "Test description",
      });

      const result = await runList({ projectRoot: testDir });

      // Should be JSON serializable
      const json = JSON.stringify(result);
      expect(json).toBeDefined();

      const parsed = JSON.parse(json);
      expect(parsed.success).toBe(true);
      expect(Array.isArray(parsed.fudas)).toBe(true);
    });

    test("fuda objects contain all expected fields", async () => {
      createFuda(db, {
        title: "Test task",
        description: "Test description",
        priority: 5,
      });

      const result = await runList({ projectRoot: testDir });
      const fuda = result.fudas![0];

      expect(fuda).toHaveProperty("id");
      expect(fuda).toHaveProperty("title");
      expect(fuda).toHaveProperty("description");
      expect(fuda).toHaveProperty("status");
      expect(fuda).toHaveProperty("spiritType");
      expect(fuda).toHaveProperty("priority");
      expect(fuda).toHaveProperty("createdAt");
      expect(fuda).toHaveProperty("updatedAt");
    });
  });

  describe("empty state handling", () => {
    test("handles empty database gracefully", async () => {
      const result = await runList({ projectRoot: testDir });

      expect(result.success).toBe(true);
      expect(result.fudas).toEqual([]);
      expect(result.error).toBeUndefined();
    });

    test("returns error when shiki not initialized", async () => {
      const uninitializedDir = mkdtempSync(join(tmpdir(), "shiki-uninit-"));

      try {
        const result = await runList({ projectRoot: uninitializedDir });

        expect(result.success).toBe(false);
        expect(result.error).toContain("not initialized");
      } finally {
        rmSync(uninitializedDir, { recursive: true, force: true });
      }
    });
  });

  describe("all flag", () => {
    test("includes done fuda when all flag is set", async () => {
      const fuda1 = createFuda(db, {
        title: "Pending task",
        description: "First description",
      });
      const fuda2 = createFuda(db, {
        title: "Done task",
        description: "Second description",
      });
      updateFudaStatus(db, fuda2.id, FudaStatus.DONE);

      const result = await runList({ projectRoot: testDir, all: true });

      expect(result.success).toBe(true);
      expect(result.fudas).toHaveLength(2);
      expect(result.fudas!.map((f) => f.title)).toContain("Pending task");
      expect(result.fudas!.map((f) => f.title)).toContain("Done task");
    });

    test("includes failed fuda when all flag is set", async () => {
      const fuda1 = createFuda(db, {
        title: "Pending task",
        description: "First description",
      });
      const fuda2 = createFuda(db, {
        title: "Failed task",
        description: "Second description",
      });
      updateFudaStatus(db, fuda2.id, FudaStatus.FAILED);

      const result = await runList({ projectRoot: testDir, all: true });

      expect(result.success).toBe(true);
      expect(result.fudas).toHaveLength(2);
      expect(result.fudas!.map((f) => f.title)).toContain("Pending task");
      expect(result.fudas!.map((f) => f.title)).toContain("Failed task");
    });

    test("includes all statuses when all flag is set", async () => {
      createFuda(db, { title: "Pending", description: "desc" });
      const ready = createFuda(db, { title: "Ready", description: "desc" });
      updateFudaStatus(db, ready.id, FudaStatus.READY);
      const done = createFuda(db, { title: "Done", description: "desc" });
      updateFudaStatus(db, done.id, FudaStatus.DONE);
      const failed = createFuda(db, { title: "Failed", description: "desc" });
      updateFudaStatus(db, failed.id, FudaStatus.FAILED);

      const result = await runList({ projectRoot: testDir, all: true });

      expect(result.success).toBe(true);
      expect(result.fudas).toHaveLength(4);
      const titles = result.fudas!.map((f) => f.title);
      expect(titles).toContain("Pending");
      expect(titles).toContain("Ready");
      expect(titles).toContain("Done");
      expect(titles).toContain("Failed");
    });

    test("still excludes soft-deleted fuda when all flag is set", async () => {
      const fuda1 = createFuda(db, {
        title: "Active task",
        description: "Still active",
      });
      const fuda2 = createFuda(db, {
        title: "Deleted task",
        description: "Soft deleted",
      });
      db.run(
        "UPDATE fuda SET deleted_at = datetime('now') WHERE id = ?",
        [fuda2.id]
      );

      const result = await runList({ projectRoot: testDir, all: true });

      expect(result.success).toBe(true);
      expect(result.fudas).toHaveLength(1);
      expect(result.fudas![0].title).toBe("Active task");
    });
  });

  describe("limit option", () => {
    test("respects limit parameter", async () => {
      createFuda(db, { title: "Task 1", description: "Desc 1", priority: 3 });
      createFuda(db, { title: "Task 2", description: "Desc 2", priority: 2 });
      createFuda(db, { title: "Task 3", description: "Desc 3", priority: 1 });

      const result = await runList({ projectRoot: testDir, limit: 2 });

      expect(result.success).toBe(true);
      expect(result.fudas).toHaveLength(2);
      // Should return highest priority first
      expect(result.fudas![0].title).toBe("Task 1");
      expect(result.fudas![1].title).toBe("Task 2");
    });

    test("returns all fuda when limit exceeds count", async () => {
      createFuda(db, { title: "Task 1", description: "Desc 1" });
      createFuda(db, { title: "Task 2", description: "Desc 2" });

      const result = await runList({ projectRoot: testDir, limit: 100 });

      expect(result.success).toBe(true);
      expect(result.fudas).toHaveLength(2);
    });
  });
});
