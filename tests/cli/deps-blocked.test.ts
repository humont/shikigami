import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { Database } from "bun:sqlite";
import { runInit } from "../../src/cli/commands/init";
import { runDepsBlocked } from "../../src/cli/commands/deps/blocked";
import { createFuda } from "../../src/db/fuda";
import { addFudaDependency } from "../../src/db/dependencies";
import { DependencyType, FudaStatus } from "../../src/types";

describe("deps blocked command", () => {
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

  describe("shows blocking dependencies (blocks type)", () => {
    test("returns blocker with blocks type", async () => {
      const task = createFuda(db, { title: "My Task", description: "Task" });
      const blocker = createFuda(db, { title: "Blocker", description: "Blocking task" });
      addFudaDependency(db, task.id, blocker.id, DependencyType.BLOCKS);

      const result = await runDepsBlocked({
        projectRoot: testDir,
        id: task.id,
      });

      expect(result.success).toBe(true);
      expect(result.blocking).toHaveLength(1);
      expect(result.blocking![0].id).toBe(blocker.id);
      expect(result.blocking![0].type).toBe("blocks");
    });

    test("returns multiple blockers", async () => {
      const task = createFuda(db, { title: "My Task", description: "Task" });
      const blocker1 = createFuda(db, { title: "Blocker 1", description: "Blocking task 1" });
      const blocker2 = createFuda(db, { title: "Blocker 2", description: "Blocking task 2" });
      addFudaDependency(db, task.id, blocker1.id, DependencyType.BLOCKS);
      addFudaDependency(db, task.id, blocker2.id, DependencyType.BLOCKS);

      const result = await runDepsBlocked({
        projectRoot: testDir,
        id: task.id,
      });

      expect(result.success).toBe(true);
      expect(result.blocking).toHaveLength(2);
    });

    test("excludes done blockers", async () => {
      const task = createFuda(db, { title: "My Task", description: "Task" });
      const doneBlocker = createFuda(db, { title: "Done Blocker", description: "Done" });
      const pendingBlocker = createFuda(db, { title: "Pending Blocker", description: "Pending" });

      addFudaDependency(db, task.id, doneBlocker.id, DependencyType.BLOCKS);
      addFudaDependency(db, task.id, pendingBlocker.id, DependencyType.BLOCKS);

      // Mark one blocker as done
      db.run("UPDATE fuda SET status = ? WHERE id = ?", [FudaStatus.DONE, doneBlocker.id]);

      const result = await runDepsBlocked({
        projectRoot: testDir,
        id: task.id,
      });

      expect(result.success).toBe(true);
      expect(result.blocking).toHaveLength(1);
      expect(result.blocking![0].id).toBe(pendingBlocker.id);
    });

    test("supports ID prefix matching", async () => {
      const task = createFuda(db, { title: "My Task", description: "Task" });
      const blocker = createFuda(db, { title: "Blocker", description: "Blocking task" });
      addFudaDependency(db, task.id, blocker.id, DependencyType.BLOCKS);

      const prefix = task.id.replace("sk-", "").substring(0, 4);

      const result = await runDepsBlocked({
        projectRoot: testDir,
        id: prefix,
      });

      expect(result.success).toBe(true);
      expect(result.blocking).toHaveLength(1);
    });
  });

  describe("shows blocking dependencies (parent-child type)", () => {
    test("returns blocker with parent-child type", async () => {
      const child = createFuda(db, { title: "Child Task", description: "Child" });
      const parent = createFuda(db, { title: "Parent Task", description: "Parent" });
      addFudaDependency(db, child.id, parent.id, DependencyType.PARENT_CHILD);

      const result = await runDepsBlocked({
        projectRoot: testDir,
        id: child.id,
      });

      expect(result.success).toBe(true);
      expect(result.blocking).toHaveLength(1);
      expect(result.blocking![0].id).toBe(parent.id);
      expect(result.blocking![0].type).toBe("parent-child");
    });

    test("mixes blocks and parent-child blockers", async () => {
      const task = createFuda(db, { title: "My Task", description: "Task" });
      const blocker = createFuda(db, { title: "Blocker", description: "Blocking task" });
      const parent = createFuda(db, { title: "Parent", description: "Parent task" });
      addFudaDependency(db, task.id, blocker.id, DependencyType.BLOCKS);
      addFudaDependency(db, task.id, parent.id, DependencyType.PARENT_CHILD);

      const result = await runDepsBlocked({
        projectRoot: testDir,
        id: task.id,
      });

      expect(result.success).toBe(true);
      expect(result.blocking).toHaveLength(2);

      const types = result.blocking!.map(b => b.type);
      expect(types).toContain("blocks");
      expect(types).toContain("parent-child");
    });
  });

  describe("excludes non-blocking dependencies", () => {
    test("does not include related dependencies", async () => {
      const task = createFuda(db, { title: "My Task", description: "Task" });
      const related = createFuda(db, { title: "Related", description: "Related task" });
      addFudaDependency(db, task.id, related.id, DependencyType.RELATED);

      const result = await runDepsBlocked({
        projectRoot: testDir,
        id: task.id,
      });

      expect(result.success).toBe(true);
      expect(result.blocking).toHaveLength(0);
    });

    test("does not include discovered-from dependencies", async () => {
      const task = createFuda(db, { title: "My Task", description: "Task" });
      const origin = createFuda(db, { title: "Origin", description: "Origin task" });
      addFudaDependency(db, task.id, origin.id, DependencyType.DISCOVERED_FROM);

      const result = await runDepsBlocked({
        projectRoot: testDir,
        id: task.id,
      });

      expect(result.success).toBe(true);
      expect(result.blocking).toHaveLength(0);
    });

    test("only includes blocking types when mixed", async () => {
      const task = createFuda(db, { title: "My Task", description: "Task" });
      const blocker = createFuda(db, { title: "Blocker", description: "Blocking task" });
      const related = createFuda(db, { title: "Related", description: "Related task" });
      const discovered = createFuda(db, { title: "Discovered", description: "Discovered task" });

      addFudaDependency(db, task.id, blocker.id, DependencyType.BLOCKS);
      addFudaDependency(db, task.id, related.id, DependencyType.RELATED);
      addFudaDependency(db, task.id, discovered.id, DependencyType.DISCOVERED_FROM);

      const result = await runDepsBlocked({
        projectRoot: testDir,
        id: task.id,
      });

      expect(result.success).toBe(true);
      expect(result.blocking).toHaveLength(1);
      expect(result.blocking![0].id).toBe(blocker.id);
    });
  });

  describe("handles fuda with no blockers", () => {
    test("returns empty array for fuda with no dependencies", async () => {
      const task = createFuda(db, { title: "Independent Task", description: "No deps" });

      const result = await runDepsBlocked({
        projectRoot: testDir,
        id: task.id,
      });

      expect(result.success).toBe(true);
      expect(result.blocking).toEqual([]);
    });

    test("returns empty array when all blockers are done", async () => {
      const task = createFuda(db, { title: "My Task", description: "Task" });
      const blocker = createFuda(db, { title: "Blocker", description: "Done blocker" });
      addFudaDependency(db, task.id, blocker.id, DependencyType.BLOCKS);

      db.run("UPDATE fuda SET status = ? WHERE id = ?", [FudaStatus.DONE, blocker.id]);

      const result = await runDepsBlocked({
        projectRoot: testDir,
        id: task.id,
      });

      expect(result.success).toBe(true);
      expect(result.blocking).toEqual([]);
    });
  });

  describe("JSON output format", () => {
    test("returns JSON-serializable result", async () => {
      const task = createFuda(db, { title: "My Task", description: "Task" });
      const blocker = createFuda(db, { title: "Blocker", description: "Blocking task" });
      addFudaDependency(db, task.id, blocker.id, DependencyType.BLOCKS);

      const result = await runDepsBlocked({
        projectRoot: testDir,
        id: task.id,
      });

      const json = JSON.stringify(result);
      expect(json).toBeDefined();

      const parsed = JSON.parse(json);
      expect(parsed.success).toBe(true);
      expect(parsed.blocking).toBeDefined();
    });

    test("blocking objects contain expected fields", async () => {
      const task = createFuda(db, { title: "My Task", description: "Task" });
      const blocker = createFuda(db, { title: "Blocker", description: "Blocking task" });
      addFudaDependency(db, task.id, blocker.id, DependencyType.BLOCKS);

      const result = await runDepsBlocked({
        projectRoot: testDir,
        id: task.id,
      });

      const blockingItem = result.blocking![0];
      expect(blockingItem).toHaveProperty("id");
      expect(blockingItem).toHaveProperty("displayId");
      expect(blockingItem).toHaveProperty("title");
      expect(blockingItem).toHaveProperty("status");
      expect(blockingItem).toHaveProperty("type");
    });

    test("returns JSON-serializable result on error", async () => {
      const result = await runDepsBlocked({
        projectRoot: testDir,
        id: "sk-nonexistent",
      });

      const json = JSON.stringify(result);
      expect(json).toBeDefined();

      const parsed = JSON.parse(json);
      expect(parsed.success).toBe(false);
      expect(parsed.error).toBeDefined();
    });
  });

  describe("error handling", () => {
    test("returns error when fuda does not exist", async () => {
      const result = await runDepsBlocked({
        projectRoot: testDir,
        id: "sk-nonexistent",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("not found");
    });

    test("returns error when shiki not initialized", async () => {
      const uninitializedDir = mkdtempSync(join(tmpdir(), "shiki-uninit-"));

      try {
        const result = await runDepsBlocked({
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
