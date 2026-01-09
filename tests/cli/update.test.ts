import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { Database } from "bun:sqlite";
import { runInit } from "../../src/cli/commands/init";
import { runUpdate } from "../../src/cli/commands/update";
import { createFuda, getFuda } from "../../src/db/fuda";
import { FudaStatus } from "../../src/types";

describe("update command", () => {
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

  describe("updating fuda status", () => {
    test("updates fuda status from pending to in_progress", async () => {
      const fuda = createFuda(db, {
        title: "Test task",
        description: "Test description",
      });

      const result = await runUpdate({
        projectRoot: testDir,
        id: fuda.id,
        status: FudaStatus.IN_PROGRESS,
      });

      expect(result.success).toBe(true);
      expect(result.fuda).toBeDefined();
      expect(result.fuda!.status).toBe(FudaStatus.IN_PROGRESS);

      // Verify in database
      const updated = getFuda(db, fuda.id);
      expect(updated!.status).toBe(FudaStatus.IN_PROGRESS);
    });

    test("updates fuda status from in_progress to done", async () => {
      const fuda = createFuda(db, {
        title: "Test task",
        description: "Test description",
      });
      db.run("UPDATE fuda SET status = ? WHERE id = ?", [
        FudaStatus.IN_PROGRESS,
        fuda.id,
      ]);

      const result = await runUpdate({
        projectRoot: testDir,
        id: fuda.id,
        status: FudaStatus.DONE,
      });

      expect(result.success).toBe(true);
      expect(result.fuda!.status).toBe(FudaStatus.DONE);
    });

    test("updates fuda status to failed", async () => {
      const fuda = createFuda(db, {
        title: "Test task",
        description: "Test description",
      });

      const result = await runUpdate({
        projectRoot: testDir,
        id: fuda.id,
        status: FudaStatus.FAILED,
      });

      expect(result.success).toBe(true);
      expect(result.fuda!.status).toBe(FudaStatus.FAILED);
    });

    test("updates fuda status using id prefix", async () => {
      const fuda = createFuda(db, {
        title: "Test task",
        description: "Test description",
      });
      // Extract prefix without sk- (e.g., "sk-abc123" -> "abc1")
      const prefix = fuda.id.replace("sk-", "").substring(0, 4);

      const result = await runUpdate({
        projectRoot: testDir,
        id: prefix,
        status: FudaStatus.IN_PROGRESS,
      });

      expect(result.success).toBe(true);
      expect(result.fuda!.id).toBe(fuda.id);
      expect(result.fuda!.status).toBe(FudaStatus.IN_PROGRESS);
    });

    test("updates updatedAt timestamp", async () => {
      const fuda = createFuda(db, {
        title: "Test task",
        description: "Test description",
      });
      const originalUpdatedAt = fuda.updatedAt;

      // SQLite datetime has second-level precision, wait over 1 second
      await new Promise((resolve) => setTimeout(resolve, 1100));

      const result = await runUpdate({
        projectRoot: testDir,
        id: fuda.id,
        status: FudaStatus.DONE,
      });

      expect(result.success).toBe(true);
      expect(result.fuda!.updatedAt.getTime()).toBeGreaterThan(
        originalUpdatedAt.getTime()
      );
    });
  });

  describe("JSON output format", () => {
    test("returns JSON-serializable result", async () => {
      const fuda = createFuda(db, {
        title: "Test task",
        description: "Test description",
      });

      const result = await runUpdate({
        projectRoot: testDir,
        id: fuda.id,
        status: FudaStatus.IN_PROGRESS,
      });

      // Should be JSON serializable
      const json = JSON.stringify(result);
      expect(json).toBeDefined();

      const parsed = JSON.parse(json);
      expect(parsed.success).toBe(true);
      expect(parsed.fuda).toBeDefined();
    });

    test("fuda object contains all expected fields", async () => {
      const fuda = createFuda(db, {
        title: "Test task",
        description: "Test description",
        priority: 5,
      });

      const result = await runUpdate({
        projectRoot: testDir,
        id: fuda.id,
        status: FudaStatus.DONE,
      });

      const updatedFuda = result.fuda!;
      expect(updatedFuda).toHaveProperty("id");
      expect(updatedFuda).toHaveProperty("title");
      expect(updatedFuda).toHaveProperty("description");
      expect(updatedFuda).toHaveProperty("status");
      expect(updatedFuda).toHaveProperty("spiritType");
      expect(updatedFuda).toHaveProperty("priority");
      expect(updatedFuda).toHaveProperty("createdAt");
      expect(updatedFuda).toHaveProperty("updatedAt");
    });
  });

  describe("error on invalid status", () => {
    test("returns error for invalid status value", async () => {
      const fuda = createFuda(db, {
        title: "Test task",
        description: "Test description",
      });

      const result = await runUpdate({
        projectRoot: testDir,
        id: fuda.id,
        status: "invalid_status" as FudaStatus,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid status");
    });

    test("lists valid status values in error message", async () => {
      const fuda = createFuda(db, {
        title: "Test task",
        description: "Test description",
      });

      const result = await runUpdate({
        projectRoot: testDir,
        id: fuda.id,
        status: "not_a_status" as FudaStatus,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("blocked");
      expect(result.error).toContain("done");
    });
  });

  describe("error on non-existent fuda", () => {
    test("returns error when fuda does not exist", async () => {
      const result = await runUpdate({
        projectRoot: testDir,
        id: "sk-nonexistent",
        status: FudaStatus.DONE,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("not found");
    });

    test("returns error when prefix matches no fuda", async () => {
      const result = await runUpdate({
        projectRoot: testDir,
        id: "xyz",
        status: FudaStatus.DONE,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("not found");
    });

    test("returns error when prefix is ambiguous", async () => {
      // Create two fuda - they'll have different random IDs
      const fuda1 = createFuda(db, {
        title: "Task 1",
        description: "Description 1",
      });
      const fuda2 = createFuda(db, {
        title: "Task 2",
        description: "Description 2",
      });

      // Use "sk-" prefix which matches all fuda
      const result = await runUpdate({
        projectRoot: testDir,
        id: "sk-",
        status: FudaStatus.DONE,
      });

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/ambiguous|multiple|not found/i);
    });
  });

  describe("error when shiki not initialized", () => {
    test("returns error when shiki not initialized", async () => {
      const uninitializedDir = mkdtempSync(join(tmpdir(), "shiki-uninit-"));

      try {
        const result = await runUpdate({
          projectRoot: uninitializedDir,
          id: "sk-test",
          status: FudaStatus.DONE,
        });

        expect(result.success).toBe(false);
        expect(result.error).toContain("not initialized");
      } finally {
        rmSync(uninitializedDir, { recursive: true, force: true });
      }
    });
  });

  describe("assigned spirit id", () => {
    test("assigns spirit to fuda when --assigned-spirit-id provided", async () => {
      const fuda = createFuda(db, {
        title: "Test task",
        description: "Test description",
      });

      const result = await runUpdate({
        projectRoot: testDir,
        id: fuda.id,
        status: FudaStatus.IN_PROGRESS,
        assignedSpiritId: "agent-123",
      });

      expect(result.success).toBe(true);
      expect(result.fuda!.assignedSpiritId).toBe("agent-123");

      // Verify in database
      const updated = getFuda(db, fuda.id);
      expect(updated!.assignedSpiritId).toBe("agent-123");
    });

    test("updates status and assigns spirit in one operation", async () => {
      const fuda = createFuda(db, {
        title: "Test task",
        description: "Test description",
      });

      const result = await runUpdate({
        projectRoot: testDir,
        id: fuda.id,
        status: FudaStatus.IN_PROGRESS,
        assignedSpiritId: "spirit-456",
      });

      expect(result.success).toBe(true);
      expect(result.fuda!.status).toBe(FudaStatus.IN_PROGRESS);
      expect(result.fuda!.assignedSpiritId).toBe("spirit-456");
    });

    test("clears spirit assignment when empty string provided", async () => {
      const fuda = createFuda(db, {
        title: "Test task",
        description: "Test description",
      });
      // Pre-assign a spirit
      db.run("UPDATE fuda SET assigned_spirit_id = ? WHERE id = ?", [
        "old-agent",
        fuda.id,
      ]);

      const result = await runUpdate({
        projectRoot: testDir,
        id: fuda.id,
        status: FudaStatus.DONE,
        assignedSpiritId: "",
      });

      expect(result.success).toBe(true);
      expect(result.fuda!.assignedSpiritId).toBeNull();
    });

    test("does not change assignment when flag not provided", async () => {
      const fuda = createFuda(db, {
        title: "Test task",
        description: "Test description",
      });
      // Pre-assign a spirit
      db.run("UPDATE fuda SET assigned_spirit_id = ? WHERE id = ?", [
        "existing-agent",
        fuda.id,
      ]);

      const result = await runUpdate({
        projectRoot: testDir,
        id: fuda.id,
        status: FudaStatus.DONE,
      });

      expect(result.success).toBe(true);
      expect(result.fuda!.assignedSpiritId).toBe("existing-agent");
    });
  });
});
