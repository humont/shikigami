import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { Database } from "bun:sqlite";
import { runInit } from "../../src/cli/commands/init";
import { runFinish } from "../../src/cli/commands/finish";
import { createFuda, getFuda } from "../../src/db/fuda";
import { addFudaDependency } from "../../src/db/dependencies";
import { FudaStatus, DependencyType } from "../../src/types";

describe("finish command", () => {
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

  describe("setting fuda status to done", () => {
    test("sets fuda status to done", async () => {
      const fuda = createFuda(db, {
        title: "Test task",
        description: "Test description",
      });

      const result = await runFinish({
        projectRoot: testDir,
        id: fuda.id,
      });

      expect(result.success).toBe(true);
      expect(result.fuda).toBeDefined();
      expect(result.fuda!.status).toBe(FudaStatus.DONE);

      // Verify in database
      const updated = getFuda(db, fuda.id);
      expect(updated!.status).toBe(FudaStatus.DONE);
    });

    test("works with ID prefix matching", async () => {
      const fuda = createFuda(db, {
        title: "Test task",
        description: "Test description",
      });
      // Extract prefix without sk- (e.g., "sk-abc123" -> "abc1")
      const prefix = fuda.id.replace("sk-", "").substring(0, 4);

      const result = await runFinish({
        projectRoot: testDir,
        id: prefix,
      });

      expect(result.success).toBe(true);
      expect(result.fuda!.id).toBe(fuda.id);
      expect(result.fuda!.status).toBe(FudaStatus.DONE);
    });
  });

  describe("JSON output format", () => {
    test("returns proper JSON output", async () => {
      const fuda = createFuda(db, {
        title: "Test task",
        description: "Test description",
      });

      const result = await runFinish({
        projectRoot: testDir,
        id: fuda.id,
      });

      // Should be JSON serializable
      const json = JSON.stringify(result);
      expect(json).toBeDefined();

      const parsed = JSON.parse(json);
      expect(parsed.success).toBe(true);
      expect(parsed.fuda).toBeDefined();
      expect(parsed.fuda.status).toBe(FudaStatus.DONE);
    });
  });

  describe("error when fuda not found", () => {
    test("returns error when fuda does not exist", async () => {
      const result = await runFinish({
        projectRoot: testDir,
        id: "[REDACTED:sk-secret]",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("not found");
    });

    test("returns error when prefix matches no fuda", async () => {
      const result = await runFinish({
        projectRoot: testDir,
        id: "xyz",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("not found");
    });
  });

  describe("error when shiki not initialized", () => {
    test("returns error when shiki not initialized", async () => {
      const uninitializedDir = mkdtempSync(join(tmpdir(), "shiki-uninit-"));

      try {
        const result = await runFinish({
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

  describe("updating dependent task readiness", () => {
    test("marks dependent pending tasks as ready when blocker is finished", async () => {
      // Create a blocker task and a dependent task
      const blocker = createFuda(db, {
        title: "Blocker task",
        description: "This blocks the dependent",
      });
      const dependent = createFuda(db, {
        title: "Dependent task",
        description: "This depends on blocker",
      });

      // Add dependency: dependent is blocked by blocker
      addFudaDependency(db, dependent.id, blocker.id, DependencyType.BLOCKS);

      // Verify dependent is pending initially
      expect(getFuda(db, dependent.id)!.status).toBe(FudaStatus.PENDING);

      // Finish the blocker
      const result = await runFinish({
        projectRoot: testDir,
        id: blocker.id,
      });

      expect(result.success).toBe(true);

      // Dependent should now be ready
      const updatedDependent = getFuda(db, dependent.id);
      expect(updatedDependent!.status).toBe(FudaStatus.READY);
    });

    test("does not mark dependent as ready if other blockers remain", async () => {
      // Create two blockers and a dependent
      const blocker1 = createFuda(db, {
        title: "Blocker 1",
        description: "First blocker",
      });
      const blocker2 = createFuda(db, {
        title: "Blocker 2",
        description: "Second blocker",
      });
      const dependent = createFuda(db, {
        title: "Dependent task",
        description: "This depends on both blockers",
      });

      // Add dependencies
      addFudaDependency(db, dependent.id, blocker1.id, DependencyType.BLOCKS);
      addFudaDependency(db, dependent.id, blocker2.id, DependencyType.BLOCKS);

      // Finish only blocker1
      await runFinish({
        projectRoot: testDir,
        id: blocker1.id,
      });

      // Dependent should still be pending (blocker2 not done)
      const updatedDependent = getFuda(db, dependent.id);
      expect(updatedDependent!.status).toBe(FudaStatus.PENDING);
    });
  });
});
