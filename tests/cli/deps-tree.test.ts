import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { Database } from "bun:sqlite";
import { runInit } from "../../src/cli/commands/init";
import { runDepsTree } from "../../src/cli/commands/deps/tree";
import { createFuda } from "../../src/db/fuda";
import { addFudaDependency } from "../../src/db/dependencies";
import { DependencyType } from "../../src/types";

describe("deps tree command", () => {
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

  describe("shows dependency tree with default depth", () => {
    test("returns tree with direct dependencies", async () => {
      const main = createFuda(db, { title: "Main Task", description: "Main" });
      const dep1 = createFuda(db, { title: "Dep 1", description: "Dep 1" });
      const dep2 = createFuda(db, { title: "Dep 2", description: "Dep 2" });
      addFudaDependency(db, main.id, dep1.id, DependencyType.BLOCKS);
      addFudaDependency(db, main.id, dep2.id, DependencyType.RELATED);

      const result = await runDepsTree({
        projectRoot: testDir,
        id: main.id,
      });

      expect(result.success).toBe(true);
      expect(result.tree).toBeDefined();
      expect(result.tree![main.id]).toBeDefined();
      expect(result.tree![main.id]).toHaveLength(2);
    });

    test("includes transitive dependencies in tree", async () => {
      const a = createFuda(db, { title: "Task A", description: "A" });
      const b = createFuda(db, { title: "Task B", description: "B" });
      const c = createFuda(db, { title: "Task C", description: "C" });
      // A -> B -> C
      addFudaDependency(db, a.id, b.id, DependencyType.BLOCKS);
      addFudaDependency(db, b.id, c.id, DependencyType.BLOCKS);

      const result = await runDepsTree({
        projectRoot: testDir,
        id: a.id,
      });

      expect(result.success).toBe(true);
      expect(result.tree![a.id]).toHaveLength(1);
      expect(result.tree![a.id][0].dependsOnId).toBe(b.id);
      expect(result.tree![b.id]).toHaveLength(1);
      expect(result.tree![b.id][0].dependsOnId).toBe(c.id);
    });

    test("supports ID prefix matching", async () => {
      const main = createFuda(db, { title: "Main Task", description: "Main" });
      const dep = createFuda(db, { title: "Dep 1", description: "Dep 1" });
      addFudaDependency(db, main.id, dep.id, DependencyType.BLOCKS);

      const prefix = main.id.replace("sk-", "").substring(0, 4);

      const result = await runDepsTree({
        projectRoot: testDir,
        id: prefix,
      });

      expect(result.success).toBe(true);
      expect(result.tree![main.id]).toBeDefined();
    });
  });

  describe("respects --depth flag", () => {
    test("depth 1 includes root and first level deps", async () => {
      const a = createFuda(db, { title: "Task A", description: "A" });
      const b = createFuda(db, { title: "Task B", description: "B" });
      const c = createFuda(db, { title: "Task C", description: "C" });
      const d = createFuda(db, { title: "Task D", description: "D" });
      // A -> B -> C -> D
      addFudaDependency(db, a.id, b.id, DependencyType.BLOCKS);
      addFudaDependency(db, b.id, c.id, DependencyType.BLOCKS);
      addFudaDependency(db, c.id, d.id, DependencyType.BLOCKS);

      // Depth 1: root (depth 0) + first level deps (depth 1) = A and B
      const result = await runDepsTree({
        projectRoot: testDir,
        id: a.id,
        depth: 1,
      });

      expect(result.success).toBe(true);
      expect(result.tree![a.id]).toBeDefined();
      expect(result.tree![b.id]).toBeDefined();
      expect(result.tree![c.id]).toBeUndefined(); // depth 2, excluded
    });

    test("depth 2 includes three levels", async () => {
      const a = createFuda(db, { title: "Task A", description: "A" });
      const b = createFuda(db, { title: "Task B", description: "B" });
      const c = createFuda(db, { title: "Task C", description: "C" });
      const d = createFuda(db, { title: "Task D", description: "D" });
      // A -> B -> C -> D
      addFudaDependency(db, a.id, b.id, DependencyType.BLOCKS);
      addFudaDependency(db, b.id, c.id, DependencyType.BLOCKS);
      addFudaDependency(db, c.id, d.id, DependencyType.BLOCKS);

      // Depth 2: A (0), B (1), C (2) = 3 levels
      const result = await runDepsTree({
        projectRoot: testDir,
        id: a.id,
        depth: 2,
      });

      expect(result.success).toBe(true);
      expect(result.tree![a.id]).toBeDefined();
      expect(result.tree![b.id]).toBeDefined();
      expect(result.tree![c.id]).toBeDefined();
      expect(result.tree![d.id]).toBeUndefined(); // depth 3, excluded
    });

    test("depth 0 returns only root node", async () => {
      const main = createFuda(db, { title: "Main Task", description: "Main" });
      const dep = createFuda(db, { title: "Dep 1", description: "Dep 1" });
      addFudaDependency(db, main.id, dep.id, DependencyType.BLOCKS);

      const result = await runDepsTree({
        projectRoot: testDir,
        id: main.id,
        depth: 0,
      });

      expect(result.success).toBe(true);
      // With depth 0, we get just the root
      expect(Object.keys(result.tree!).length).toBe(1);
      expect(result.tree![main.id]).toBeDefined();
    });
  });

  describe("handles fuda with no dependencies", () => {
    test("returns empty tree for fuda with no dependencies", async () => {
      const fuda = createFuda(db, { title: "Standalone Task", description: "No deps" });

      const result = await runDepsTree({
        projectRoot: testDir,
        id: fuda.id,
      });

      expect(result.success).toBe(true);
      expect(result.tree).toBeDefined();
      expect(result.tree![fuda.id]).toEqual([]);
    });
  });

  describe("handles deep dependency chains", () => {
    test("traverses chains up to default depth", async () => {
      // Create a chain of 5 fuda
      const fudas = [];
      for (let i = 0; i < 5; i++) {
        fudas.push(createFuda(db, { title: `Task ${i}`, description: `Desc ${i}` }));
      }

      // Create chain: 0 -> 1 -> 2 -> 3 -> 4
      for (let i = 0; i < 4; i++) {
        addFudaDependency(db, fudas[i].id, fudas[i + 1].id, DependencyType.BLOCKS);
      }

      const result = await runDepsTree({
        projectRoot: testDir,
        id: fudas[0].id,
      });

      expect(result.success).toBe(true);
      // Default depth is 10, so all 5 should be in tree
      expect(Object.keys(result.tree!).length).toBe(5);
    });

    test("handles diamond dependencies", async () => {
      // A -> B, A -> C, B -> D, C -> D
      const a = createFuda(db, { title: "Task A", description: "A" });
      const b = createFuda(db, { title: "Task B", description: "B" });
      const c = createFuda(db, { title: "Task C", description: "C" });
      const d = createFuda(db, { title: "Task D", description: "D" });

      addFudaDependency(db, a.id, b.id, DependencyType.BLOCKS);
      addFudaDependency(db, a.id, c.id, DependencyType.BLOCKS);
      addFudaDependency(db, b.id, d.id, DependencyType.BLOCKS);
      addFudaDependency(db, c.id, d.id, DependencyType.BLOCKS);

      const result = await runDepsTree({
        projectRoot: testDir,
        id: a.id,
      });

      expect(result.success).toBe(true);
      expect(result.tree![a.id]).toHaveLength(2);
      // D should appear only once in the tree despite two paths
      expect(result.tree![d.id]).toEqual([]);
    });
  });

  describe("JSON output format", () => {
    test("returns JSON-serializable result", async () => {
      const main = createFuda(db, { title: "Main Task", description: "Main" });
      const dep = createFuda(db, { title: "Dep 1", description: "Dep 1" });
      addFudaDependency(db, main.id, dep.id, DependencyType.BLOCKS);

      const result = await runDepsTree({
        projectRoot: testDir,
        id: main.id,
      });

      const json = JSON.stringify(result);
      expect(json).toBeDefined();

      const parsed = JSON.parse(json);
      expect(parsed.success).toBe(true);
      expect(parsed.tree).toBeDefined();
    });

    test("tree contains dependency objects with expected fields", async () => {
      const main = createFuda(db, { title: "Main Task", description: "Main" });
      const dep = createFuda(db, { title: "Dep 1", description: "Dep 1" });
      addFudaDependency(db, main.id, dep.id, DependencyType.BLOCKS);

      const result = await runDepsTree({
        projectRoot: testDir,
        id: main.id,
      });

      const dependency = result.tree![main.id][0];
      expect(dependency).toHaveProperty("fudaId");
      expect(dependency).toHaveProperty("dependsOnId");
      expect(dependency).toHaveProperty("type");
    });

    test("returns JSON-serializable result on error", async () => {
      const result = await runDepsTree({
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
      const result = await runDepsTree({
        projectRoot: testDir,
        id: "sk-nonexistent",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("not found");
    });

    test("returns error when shiki not initialized", async () => {
      const uninitializedDir = mkdtempSync(join(tmpdir(), "shiki-uninit-"));

      try {
        const result = await runDepsTree({
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
