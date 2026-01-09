import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { Database } from "bun:sqlite";
import { runInit } from "../../src/cli/commands/init";
import { runFinish } from "../../src/cli/commands/finish";
import {
  createFuda,
  getFuda,
  updateFudaStatus,
} from "../../src/db/fuda";
import { addFudaDependency } from "../../src/db/dependencies";
import { getEntries, EntryType } from "../../src/db/ledger";
import { FudaStatus, DependencyType } from "../../src/types";

const TEST_COMMIT_HASH = "test-commit-hash";

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
        commitHash: TEST_COMMIT_HASH,
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
        commitHash: TEST_COMMIT_HASH,
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
        commitHash: TEST_COMMIT_HASH,
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
        commitHash: TEST_COMMIT_HASH,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("not found");
    });

    test("returns error when prefix matches no fuda", async () => {
      const result = await runFinish({
        projectRoot: testDir,
        id: "xyz",
        commitHash: TEST_COMMIT_HASH,
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
          commitHash: TEST_COMMIT_HASH,
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
        commitHash: TEST_COMMIT_HASH,
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
        commitHash: TEST_COMMIT_HASH,
      });

      // Dependent should still be pending (blocker2 not done)
      const updatedDependent = getFuda(db, dependent.id);
      expect(updatedDependent!.status).toBe(FudaStatus.PENDING);
    });
  });

  describe("unblocked tasks hint", () => {
    test("returns empty unblockedFuda when no tasks were unblocked", async () => {
      const fuda = createFuda(db, {
        title: "Standalone task",
        description: "No dependents",
      });

      const result = await runFinish({
        projectRoot: testDir,
        id: fuda.id,
        commitHash: TEST_COMMIT_HASH,
      });

      expect(result.success).toBe(true);
      expect(result.unblockedFuda).toBeDefined();
      expect(result.unblockedFuda).toHaveLength(0);
    });

    test("returns unblocked fuda when one task becomes ready", async () => {
      const blocker = createFuda(db, {
        title: "Blocker task",
        description: "This blocks the dependent",
      });
      const dependent = createFuda(db, {
        title: "Dependent task",
        description: "This depends on blocker",
      });

      addFudaDependency(db, dependent.id, blocker.id, DependencyType.BLOCKS);

      const result = await runFinish({
        projectRoot: testDir,
        id: blocker.id,
        commitHash: TEST_COMMIT_HASH,
      });

      expect(result.success).toBe(true);
      expect(result.unblockedFuda).toBeDefined();
      expect(result.unblockedFuda).toHaveLength(1);
      expect(result.unblockedFuda![0].id).toBe(dependent.id);
      expect(result.unblockedFuda![0].title).toBe("Dependent task");
    });

    test("returns multiple unblocked fuda when several tasks become ready", async () => {
      const blocker = createFuda(db, {
        title: "Blocker task",
        description: "This blocks multiple tasks",
      });
      const dependent1 = createFuda(db, {
        title: "Dependent 1",
        description: "First dependent",
      });
      const dependent2 = createFuda(db, {
        title: "Dependent 2",
        description: "Second dependent",
      });

      addFudaDependency(db, dependent1.id, blocker.id, DependencyType.BLOCKS);
      addFudaDependency(db, dependent2.id, blocker.id, DependencyType.BLOCKS);

      const result = await runFinish({
        projectRoot: testDir,
        id: blocker.id,
        commitHash: TEST_COMMIT_HASH,
      });

      expect(result.success).toBe(true);
      expect(result.unblockedFuda).toBeDefined();
      expect(result.unblockedFuda).toHaveLength(2);

      const unblockedIds = result.unblockedFuda!.map((f) => f.id);
      expect(unblockedIds).toContain(dependent1.id);
      expect(unblockedIds).toContain(dependent2.id);
    });

    test("does not include tasks that remain blocked by other dependencies", async () => {
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
        description: "Blocked by both",
      });

      addFudaDependency(db, dependent.id, blocker1.id, DependencyType.BLOCKS);
      addFudaDependency(db, dependent.id, blocker2.id, DependencyType.BLOCKS);

      const result = await runFinish({
        projectRoot: testDir,
        id: blocker1.id,
        commitHash: TEST_COMMIT_HASH,
      });

      expect(result.success).toBe(true);
      expect(result.unblockedFuda).toBeDefined();
      expect(result.unblockedFuda).toHaveLength(0);
    });

    test("does not include tasks that were already ready", async () => {
      const blocker = createFuda(db, {
        title: "Blocker task",
        description: "Blocker",
      });
      const alreadyReady = createFuda(db, {
        title: "Already ready task",
        description: "Was already ready",
      });

      // Make the task ready before adding dependency relationship
      updateFudaStatus(db, alreadyReady.id, FudaStatus.READY);

      // Add a non-blocking dependency (related)
      addFudaDependency(db, alreadyReady.id, blocker.id, DependencyType.RELATED);

      const result = await runFinish({
        projectRoot: testDir,
        id: blocker.id,
        commitHash: TEST_COMMIT_HASH,
      });

      expect(result.success).toBe(true);
      expect(result.unblockedFuda).toBeDefined();
      expect(result.unblockedFuda).toHaveLength(0);
    });
  });

  describe("handoff notes with --notes flag", () => {
    test("creates handoff ledger entry when --notes is provided", async () => {
      const fuda = createFuda(db, {
        title: "Test task",
        description: "Test description",
      });

      const result = await runFinish({
        projectRoot: testDir,
        id: fuda.id,
        commitHash: TEST_COMMIT_HASH,
        notes: "Completed the feature, all tests pass",
      });

      expect(result.success).toBe(true);

      // Verify handoff entry was created
      const entries = getEntries(db, fuda.id);
      expect(entries).toHaveLength(1);
      expect(entries[0].entryType).toBe(EntryType.HANDOFF);
      expect(entries[0].content).toBe("Completed the feature, all tests pass");
    });

    test("does not create ledger entry when --notes is not provided", async () => {
      const fuda = createFuda(db, {
        title: "Test task",
        description: "Test description",
      });

      const result = await runFinish({
        projectRoot: testDir,
        id: fuda.id,
        commitHash: TEST_COMMIT_HASH,
      });

      expect(result.success).toBe(true);

      // Verify no entries were created
      const entries = getEntries(db, fuda.id);
      expect(entries).toHaveLength(0);
    });

    test("created entry has entry_type=handoff", async () => {
      const fuda = createFuda(db, {
        title: "Test task",
        description: "Test description",
      });

      await runFinish({
        projectRoot: testDir,
        id: fuda.id,
        commitHash: TEST_COMMIT_HASH,
        notes: "Handoff note content",
      });

      const entries = getEntries(db, fuda.id);
      expect(entries[0].entryType).toBe(EntryType.HANDOFF);
    });

    test("created entry is associated with the correct fuda", async () => {
      const fuda1 = createFuda(db, {
        title: "Task 1",
        description: "First task",
      });
      const fuda2 = createFuda(db, {
        title: "Task 2",
        description: "Second task",
      });

      await runFinish({
        projectRoot: testDir,
        id: fuda1.id,
        commitHash: TEST_COMMIT_HASH,
        notes: "Notes for task 1",
      });

      // Entry should be on fuda1
      const entries1 = getEntries(db, fuda1.id);
      expect(entries1).toHaveLength(1);
      expect(entries1[0].content).toBe("Notes for task 1");

      // No entry should be on fuda2
      const entries2 = getEntries(db, fuda2.id);
      expect(entries2).toHaveLength(0);
    });

    test("returns created entry in result", async () => {
      const fuda = createFuda(db, {
        title: "Test task",
        description: "Test description",
      });

      const result = await runFinish({
        projectRoot: testDir,
        id: fuda.id,
        commitHash: TEST_COMMIT_HASH,
        notes: "Result includes entry",
      });

      expect(result.success).toBe(true);
      expect(result.ledgerEntry).toBeDefined();
      expect(result.ledgerEntry!.entryType).toBe(EntryType.HANDOFF);
      expect(result.ledgerEntry!.content).toBe("Result includes entry");
    });
  });

  describe("commit hash storage", () => {
    test("stores commit hash in database", async () => {
      const fuda = createFuda(db, {
        title: "Test task",
        description: "Test description",
      });

      const result = await runFinish({
        projectRoot: testDir,
        id: fuda.id,
        commitHash: "abc123def456",
      });

      expect(result.success).toBe(true);
      const updated = getFuda(db, fuda.id);
      expect(updated!.outputCommitHash).toBe("abc123def456");
    });

    test("returns error when commit hash is empty", async () => {
      const fuda = createFuda(db, {
        title: "Test task",
        description: "Test description",
      });

      const result = await runFinish({
        projectRoot: testDir,
        id: fuda.id,
        commitHash: "",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Commit hash is required");
    });

    test("returns error when commit hash is whitespace only", async () => {
      const fuda = createFuda(db, {
        title: "Test task",
        description: "Test description",
      });

      const result = await runFinish({
        projectRoot: testDir,
        id: fuda.id,
        commitHash: "   ",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Commit hash is required");
    });

    test("includes commit hash in result fuda", async () => {
      const fuda = createFuda(db, {
        title: "Test task",
        description: "Test description",
      });

      const result = await runFinish({
        projectRoot: testDir,
        id: fuda.id,
        commitHash: "commit789",
      });

      expect(result.success).toBe(true);
      expect(result.fuda!.outputCommitHash).toBe("commit789");
    });
  });
});
