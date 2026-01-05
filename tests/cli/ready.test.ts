import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { Database } from "bun:sqlite";
import { runInit } from "../../src/cli/commands/init";
import { runReady } from "../../src/cli/commands/ready";
import { createFuda, updateFudaStatus } from "../../src/db/fuda";
import { addFudaDependency } from "../../src/db/dependencies";
import { FudaStatus, DependencyType } from "../../src/types";

describe("ready command", () => {
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

  describe("returns ready fuda ordered by priority", () => {
    test("returns fuda with ready status", async () => {
      const fuda = createFuda(db, {
        title: "Ready task",
        description: "Already ready",
      });
      updateFudaStatus(db, fuda.id, FudaStatus.READY);

      const result = await runReady({ projectRoot: testDir });

      expect(result.success).toBe(true);
      expect(result.fudas).toHaveLength(1);
      expect(result.fudas![0].title).toBe("Ready task");
    });

    test("orders by priority descending", async () => {
      const low = createFuda(db, {
        title: "Low priority",
        description: "Low",
        priority: 1,
      });
      const high = createFuda(db, {
        title: "High priority",
        description: "High",
        priority: 10,
      });
      const medium = createFuda(db, {
        title: "Medium priority",
        description: "Medium",
        priority: 5,
      });
      updateFudaStatus(db, low.id, FudaStatus.READY);
      updateFudaStatus(db, high.id, FudaStatus.READY);
      updateFudaStatus(db, medium.id, FudaStatus.READY);

      const result = await runReady({ projectRoot: testDir });

      expect(result.success).toBe(true);
      expect(result.fudas).toHaveLength(3);
      expect(result.fudas![0].title).toBe("High priority");
      expect(result.fudas![1].title).toBe("Medium priority");
      expect(result.fudas![2].title).toBe("Low priority");
    });

    test("excludes non-ready fuda", async () => {
      const ready = createFuda(db, {
        title: "Ready task",
        description: "Ready",
      });
      const pending = createFuda(db, {
        title: "Pending task",
        description: "Pending",
      });
      const inProgress = createFuda(db, {
        title: "In progress task",
        description: "Working",
      });
      const done = createFuda(db, {
        title: "Done task",
        description: "Completed",
      });
      updateFudaStatus(db, ready.id, FudaStatus.READY);
      // pending stays pending (has blocking dep to prevent auto-promotion)
      addFudaDependency(db, pending.id, ready.id, DependencyType.BLOCKS);
      updateFudaStatus(db, inProgress.id, FudaStatus.IN_PROGRESS);
      updateFudaStatus(db, done.id, FudaStatus.DONE);

      const result = await runReady({ projectRoot: testDir });

      expect(result.success).toBe(true);
      expect(result.fudas).toHaveLength(1);
      expect(result.fudas![0].title).toBe("Ready task");
    });
  });

  describe("auto-promotes pending fuda when dependencies are done", () => {
    test("promotes pending fuda with no dependencies to ready", async () => {
      const fuda = createFuda(db, {
        title: "No deps task",
        description: "Should become ready",
      });
      // Fuda is created as pending with no dependencies

      const result = await runReady({ projectRoot: testDir });

      expect(result.success).toBe(true);
      expect(result.fudas).toHaveLength(1);
      expect(result.fudas![0].title).toBe("No deps task");
      expect(result.fudas![0].status).toBe(FudaStatus.READY);
    });

    test("promotes pending fuda when blocking dependency is done", async () => {
      const blocker = createFuda(db, {
        title: "Blocker",
        description: "Must complete first",
      });
      const blocked = createFuda(db, {
        title: "Blocked task",
        description: "Waiting for blocker",
      });
      addFudaDependency(db, blocked.id, blocker.id, DependencyType.BLOCKS);
      updateFudaStatus(db, blocker.id, FudaStatus.DONE);

      const result = await runReady({ projectRoot: testDir });

      expect(result.success).toBe(true);
      const blockedFuda = result.fudas!.find((f) => f.title === "Blocked task");
      expect(blockedFuda).toBeDefined();
      expect(blockedFuda!.status).toBe(FudaStatus.READY);
    });

    test("does not promote pending fuda when blocking dependency is not done", async () => {
      const blocker = createFuda(db, {
        title: "Blocker",
        description: "Still in progress",
      });
      const blocked = createFuda(db, {
        title: "Blocked task",
        description: "Waiting for blocker",
      });
      addFudaDependency(db, blocked.id, blocker.id, DependencyType.BLOCKS);
      updateFudaStatus(db, blocker.id, FudaStatus.IN_PROGRESS);

      const result = await runReady({ projectRoot: testDir });

      expect(result.success).toBe(true);
      const blockedFuda = result.fudas!.find((f) => f.title === "Blocked task");
      expect(blockedFuda).toBeUndefined();
    });

    test("promotes when all blocking dependencies are done", async () => {
      const dep1 = createFuda(db, {
        title: "Dep 1",
        description: "First dependency",
      });
      const dep2 = createFuda(db, {
        title: "Dep 2",
        description: "Second dependency",
      });
      const blocked = createFuda(db, {
        title: "Multi-blocked task",
        description: "Waiting for both",
      });
      addFudaDependency(db, blocked.id, dep1.id, DependencyType.BLOCKS);
      addFudaDependency(db, blocked.id, dep2.id, DependencyType.BLOCKS);
      updateFudaStatus(db, dep1.id, FudaStatus.DONE);
      updateFudaStatus(db, dep2.id, FudaStatus.DONE);

      const result = await runReady({ projectRoot: testDir });

      expect(result.success).toBe(true);
      const blockedFuda = result.fudas!.find(
        (f) => f.title === "Multi-blocked task"
      );
      expect(blockedFuda).toBeDefined();
      expect(blockedFuda!.status).toBe(FudaStatus.READY);
    });

    test("does not promote when only some blocking dependencies are done", async () => {
      const dep1 = createFuda(db, {
        title: "Dep 1",
        description: "First dependency",
      });
      const dep2 = createFuda(db, {
        title: "Dep 2",
        description: "Second dependency",
      });
      const blocked = createFuda(db, {
        title: "Multi-blocked task",
        description: "Waiting for both",
      });
      addFudaDependency(db, blocked.id, dep1.id, DependencyType.BLOCKS);
      addFudaDependency(db, blocked.id, dep2.id, DependencyType.BLOCKS);
      updateFudaStatus(db, dep1.id, FudaStatus.DONE);
      updateFudaStatus(db, dep2.id, FudaStatus.IN_PROGRESS);

      const result = await runReady({ projectRoot: testDir });

      expect(result.success).toBe(true);
      const blockedFuda = result.fudas!.find(
        (f) => f.title === "Multi-blocked task"
      );
      expect(blockedFuda).toBeUndefined();
    });

    test("related dependencies do not block promotion", async () => {
      const related = createFuda(db, {
        title: "Related task",
        description: "Just related",
      });
      const fuda = createFuda(db, {
        title: "Main task",
        description: "Has related dep",
      });
      addFudaDependency(db, fuda.id, related.id, DependencyType.RELATED);
      // related dep is still pending

      const result = await runReady({ projectRoot: testDir });

      expect(result.success).toBe(true);
      const mainFuda = result.fudas!.find((f) => f.title === "Main task");
      expect(mainFuda).toBeDefined();
      expect(mainFuda!.status).toBe(FudaStatus.READY);
    });
  });

  describe("respects --limit flag", () => {
    test("returns only specified number of fuda", async () => {
      createFuda(db, { title: "Task 1", description: "Desc 1", priority: 3 });
      createFuda(db, { title: "Task 2", description: "Desc 2", priority: 2 });
      createFuda(db, { title: "Task 3", description: "Desc 3", priority: 1 });

      const result = await runReady({ projectRoot: testDir, limit: 2 });

      expect(result.success).toBe(true);
      expect(result.fudas).toHaveLength(2);
    });

    test("returns highest priority fuda when limited", async () => {
      createFuda(db, { title: "Low", description: "Desc", priority: 1 });
      createFuda(db, { title: "High", description: "Desc", priority: 10 });
      createFuda(db, { title: "Medium", description: "Desc", priority: 5 });

      const result = await runReady({ projectRoot: testDir, limit: 1 });

      expect(result.success).toBe(true);
      expect(result.fudas).toHaveLength(1);
      expect(result.fudas![0].title).toBe("High");
    });

    test("returns all fuda when limit exceeds count", async () => {
      createFuda(db, { title: "Task 1", description: "Desc 1" });
      createFuda(db, { title: "Task 2", description: "Desc 2" });

      const result = await runReady({ projectRoot: testDir, limit: 100 });

      expect(result.success).toBe(true);
      expect(result.fudas).toHaveLength(2);
    });
  });

  describe("handles empty ready list", () => {
    test("returns empty array when no fuda exist", async () => {
      const result = await runReady({ projectRoot: testDir });

      expect(result.success).toBe(true);
      expect(result.fudas).toEqual([]);
    });

    test("returns empty array when all fuda are blocked", async () => {
      const blocker = createFuda(db, {
        title: "Blocker",
        description: "In progress",
      });
      const blocked = createFuda(db, {
        title: "Blocked",
        description: "Waiting",
      });
      addFudaDependency(db, blocked.id, blocker.id, DependencyType.BLOCKS);
      updateFudaStatus(db, blocker.id, FudaStatus.IN_PROGRESS);

      const result = await runReady({ projectRoot: testDir });

      expect(result.success).toBe(true);
      expect(result.fudas).toHaveLength(0);
    });

    test("returns empty array when all fuda are done", async () => {
      const fuda = createFuda(db, {
        title: "Done task",
        description: "Completed",
      });
      updateFudaStatus(db, fuda.id, FudaStatus.DONE);

      const result = await runReady({ projectRoot: testDir });

      expect(result.success).toBe(true);
      expect(result.fudas).toEqual([]);
    });

    test("returns error when shiki not initialized", async () => {
      const uninitializedDir = mkdtempSync(join(tmpdir(), "shiki-uninit-"));

      try {
        const result = await runReady({ projectRoot: uninitializedDir });

        expect(result.success).toBe(false);
        expect(result.error).toContain("not initialized");
      } finally {
        rmSync(uninitializedDir, { recursive: true, force: true });
      }
    });
  });

  describe("JSON output format", () => {
    test("returns JSON-serializable result", async () => {
      createFuda(db, {
        title: "Test task",
        description: "Test description",
      });

      const result = await runReady({ projectRoot: testDir });

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

      const result = await runReady({ projectRoot: testDir });
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

    test("error result contains error message", async () => {
      const uninitializedDir = mkdtempSync(join(tmpdir(), "shiki-uninit-"));

      try {
        const result = await runReady({ projectRoot: uninitializedDir });

        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
        expect(typeof result.error).toBe("string");
      } finally {
        rmSync(uninitializedDir, { recursive: true, force: true });
      }
    });
  });
});
