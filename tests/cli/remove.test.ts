import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { Database } from "bun:sqlite";
import { runInit } from "../../src/cli/commands/init";
import { runRemove } from "../../src/cli/commands/remove";
import { createFuda, getFuda } from "../../src/db/fuda";

describe("remove command", () => {
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

  describe("soft deletes fuda by ID", () => {
    test("soft deletes fuda by full ID", async () => {
      const fuda = createFuda(db, {
        title: "Test task",
        description: "Test description",
      });

      const result = await runRemove({
        projectRoot: testDir,
        id: fuda.id,
      });

      expect(result.success).toBe(true);

      // Verify fuda is soft deleted (has deleted_at set)
      const row = db
        .query("SELECT deleted_at FROM fuda WHERE id = ?")
        .get(fuda.id) as { deleted_at: string | null };
      expect(row.deleted_at).not.toBeNull();
    });

    test("soft deletes fuda by ID prefix", async () => {
      const fuda = createFuda(db, {
        title: "Test task",
        description: "Test description",
      });
      const prefix = fuda.id.replace("sk-", "").substring(0, 4);

      const result = await runRemove({
        projectRoot: testDir,
        id: prefix,
      });

      expect(result.success).toBe(true);

      // Verify fuda is soft deleted
      const row = db
        .query("SELECT deleted_at FROM fuda WHERE id = ?")
        .get(fuda.id) as { deleted_at: string | null };
      expect(row.deleted_at).not.toBeNull();
    });

    test("soft deleted fuda is not returned by getFuda", async () => {
      const fuda = createFuda(db, {
        title: "Test task",
        description: "Test description",
      });

      await runRemove({
        projectRoot: testDir,
        id: fuda.id,
      });

      // getFuda should not return soft-deleted fuda
      const retrieved = getFuda(db, fuda.id);
      expect(retrieved).toBeNull();
    });
  });

  describe("soft deletes with reason", () => {
    test("stores delete reason when provided", async () => {
      const fuda = createFuda(db, {
        title: "Test task",
        description: "Test description",
      });

      const result = await runRemove({
        projectRoot: testDir,
        id: fuda.id,
        reason: "No longer needed",
      });

      expect(result.success).toBe(true);

      const row = db
        .query("SELECT delete_reason FROM fuda WHERE id = ?")
        .get(fuda.id) as { delete_reason: string | null };
      expect(row.delete_reason).toBe("No longer needed");
    });

    test("delete reason is null when not provided", async () => {
      const fuda = createFuda(db, {
        title: "Test task",
        description: "Test description",
      });

      await runRemove({
        projectRoot: testDir,
        id: fuda.id,
      });

      const row = db
        .query("SELECT delete_reason FROM fuda WHERE id = ?")
        .get(fuda.id) as { delete_reason: string | null };
      expect(row.delete_reason).toBeNull();
    });
  });

  describe("soft deletes with actor", () => {
    test("stores deleted_by when provided", async () => {
      const fuda = createFuda(db, {
        title: "Test task",
        description: "Test description",
      });

      const result = await runRemove({
        projectRoot: testDir,
        id: fuda.id,
        deletedBy: "agent-123",
      });

      expect(result.success).toBe(true);

      const row = db
        .query("SELECT deleted_by FROM fuda WHERE id = ?")
        .get(fuda.id) as { deleted_by: string | null };
      expect(row.deleted_by).toBe("agent-123");
    });

    test("deleted_by is null when not provided", async () => {
      const fuda = createFuda(db, {
        title: "Test task",
        description: "Test description",
      });

      await runRemove({
        projectRoot: testDir,
        id: fuda.id,
      });

      const row = db
        .query("SELECT deleted_by FROM fuda WHERE id = ?")
        .get(fuda.id) as { deleted_by: string | null };
      expect(row.deleted_by).toBeNull();
    });

    test("stores both reason and actor when provided", async () => {
      const fuda = createFuda(db, {
        title: "Test task",
        description: "Test description",
      });

      const result = await runRemove({
        projectRoot: testDir,
        id: fuda.id,
        reason: "Duplicate task",
        deletedBy: "human-user",
      });

      expect(result.success).toBe(true);

      const row = db
        .query("SELECT delete_reason, deleted_by FROM fuda WHERE id = ?")
        .get(fuda.id) as { delete_reason: string | null; deleted_by: string | null };
      expect(row.delete_reason).toBe("Duplicate task");
      expect(row.deleted_by).toBe("human-user");
    });
  });

  describe("error handling for non-existent fuda", () => {
    test("returns error when fuda does not exist", async () => {
      const result = await runRemove({
        projectRoot: testDir,
        id: "sk-nonexistent",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("not found");
    });

    test("returns error when prefix matches no fuda", async () => {
      const result = await runRemove({
        projectRoot: testDir,
        id: "xyz",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("not found");
    });
  });

  describe("error handling for already deleted fuda", () => {
    test("returns error when fuda is already deleted", async () => {
      const fuda = createFuda(db, {
        title: "Test task",
        description: "Test description",
      });

      // First delete should succeed
      const firstResult = await runRemove({
        projectRoot: testDir,
        id: fuda.id,
      });
      expect(firstResult.success).toBe(true);

      // Second delete should fail
      const secondResult = await runRemove({
        projectRoot: testDir,
        id: fuda.id,
      });

      expect(secondResult.success).toBe(false);
      expect(secondResult.error).toBeDefined();
    });
  });

  describe("JSON output format", () => {
    test("returns JSON-serializable result on success", async () => {
      const fuda = createFuda(db, {
        title: "Test task",
        description: "Test description",
      });

      const result = await runRemove({
        projectRoot: testDir,
        id: fuda.id,
      });

      // Should be JSON serializable
      const json = JSON.stringify(result);
      expect(json).toBeDefined();

      const parsed = JSON.parse(json);
      expect(parsed.success).toBe(true);
    });

    test("returns JSON-serializable result on error", async () => {
      const result = await runRemove({
        projectRoot: testDir,
        id: "sk-nonexistent",
      });

      // Should be JSON serializable even on error
      const json = JSON.stringify(result);
      expect(json).toBeDefined();

      const parsed = JSON.parse(json);
      expect(parsed.success).toBe(false);
      expect(parsed.error).toBeDefined();
    });
  });

  describe("error when shiki not initialized", () => {
    test("returns error when shiki not initialized", async () => {
      const uninitializedDir = mkdtempSync(join(tmpdir(), "shiki-uninit-"));

      try {
        const result = await runRemove({
          projectRoot: uninitializedDir,
          id: "sk-test",
        });

        expect(result.success).toBe(false);
        expect(result.error).toContain("not initialized");
      } finally {
        rmSync(uninitializedDir, { recursive: true, force: true });
      }
    });
  });
});
