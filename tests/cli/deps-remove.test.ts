import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { Database } from "bun:sqlite";
import { runInit } from "../../src/cli/commands/init";
import { runDepsRemove } from "../../src/cli/commands/deps/remove";
import { createFuda } from "../../src/db/fuda";
import { addFudaDependency, getFudaDependenciesFull } from "../../src/db/dependencies";
import { DependencyType } from "../../src/types";

describe("deps remove command", () => {
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

  describe("removes existing dependency", () => {
    test("removes blocking dependency between two fuda", async () => {
      const fuda1 = createFuda(db, { title: "Task 1", description: "Desc 1" });
      const fuda2 = createFuda(db, { title: "Task 2", description: "Desc 2" });
      addFudaDependency(db, fuda1.id, fuda2.id, DependencyType.BLOCKS);

      // Verify dependency exists
      let deps = getFudaDependenciesFull(db, fuda1.id);
      expect(deps).toHaveLength(1);

      const result = await runDepsRemove({
        projectRoot: testDir,
        fudaId: fuda1.id,
        dependsOnId: fuda2.id,
      });

      expect(result.success).toBe(true);

      // Verify dependency removed
      deps = getFudaDependenciesFull(db, fuda1.id);
      expect(deps).toHaveLength(0);
    });

    test("removes parent-child dependency", async () => {
      const parent = createFuda(db, { title: "Parent", description: "Parent task" });
      const child = createFuda(db, { title: "Child", description: "Child task" });
      addFudaDependency(db, child.id, parent.id, DependencyType.PARENT_CHILD);

      const result = await runDepsRemove({
        projectRoot: testDir,
        fudaId: child.id,
        dependsOnId: parent.id,
      });

      expect(result.success).toBe(true);

      const deps = getFudaDependenciesFull(db, child.id);
      expect(deps).toHaveLength(0);
    });

    test("removes related dependency", async () => {
      const fuda1 = createFuda(db, { title: "Task 1", description: "Desc 1" });
      const fuda2 = createFuda(db, { title: "Task 2", description: "Desc 2" });
      addFudaDependency(db, fuda1.id, fuda2.id, DependencyType.RELATED);

      const result = await runDepsRemove({
        projectRoot: testDir,
        fudaId: fuda1.id,
        dependsOnId: fuda2.id,
      });

      expect(result.success).toBe(true);

      const deps = getFudaDependenciesFull(db, fuda1.id);
      expect(deps).toHaveLength(0);
    });

    test("supports ID prefix matching", async () => {
      const fuda1 = createFuda(db, { title: "Task 1", description: "Desc 1" });
      const fuda2 = createFuda(db, { title: "Task 2", description: "Desc 2" });
      addFudaDependency(db, fuda1.id, fuda2.id, DependencyType.BLOCKS);

      const prefix1 = fuda1.id.replace("sk-", "").substring(0, 4);
      const prefix2 = fuda2.id.replace("sk-", "").substring(0, 4);

      const result = await runDepsRemove({
        projectRoot: testDir,
        fudaId: prefix1,
        dependsOnId: prefix2,
      });

      expect(result.success).toBe(true);

      const deps = getFudaDependenciesFull(db, fuda1.id);
      expect(deps).toHaveLength(0);
    });

    test("only removes specified dependency, not others", async () => {
      const main = createFuda(db, { title: "Main", description: "Main task" });
      const dep1 = createFuda(db, { title: "Dep 1", description: "Dep 1" });
      const dep2 = createFuda(db, { title: "Dep 2", description: "Dep 2" });
      addFudaDependency(db, main.id, dep1.id, DependencyType.BLOCKS);
      addFudaDependency(db, main.id, dep2.id, DependencyType.RELATED);

      // Remove only dep1
      await runDepsRemove({
        projectRoot: testDir,
        fudaId: main.id,
        dependsOnId: dep1.id,
      });

      const deps = getFudaDependenciesFull(db, main.id);
      expect(deps).toHaveLength(1);
      expect(deps[0].dependsOnId).toBe(dep2.id);
    });
  });

  describe("error handling for non-existent dependency", () => {
    test("succeeds even when dependency does not exist (idempotent)", async () => {
      // Current implementation does not error when removing non-existent dependency
      const fuda1 = createFuda(db, { title: "Task 1", description: "Desc 1" });
      const fuda2 = createFuda(db, { title: "Task 2", description: "Desc 2" });

      // No dependency exists between fuda1 and fuda2
      const result = await runDepsRemove({
        projectRoot: testDir,
        fudaId: fuda1.id,
        dependsOnId: fuda2.id,
      });

      // Current behavior: succeeds (idempotent operation)
      expect(result.success).toBe(true);
    });
  });

  describe("error handling for non-existent fuda", () => {
    test("returns error when source fuda does not exist", async () => {
      const fuda = createFuda(db, { title: "Task 1", description: "Desc 1" });

      const result = await runDepsRemove({
        projectRoot: testDir,
        fudaId: "sk-nonexistent",
        dependsOnId: fuda.id,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("not found");
      expect(result.error).toContain("sk-nonexistent");
    });

    test("returns error when dependency fuda does not exist", async () => {
      const fuda = createFuda(db, { title: "Task 1", description: "Desc 1" });

      const result = await runDepsRemove({
        projectRoot: testDir,
        fudaId: fuda.id,
        dependsOnId: "sk-nonexistent",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("not found");
      expect(result.error).toContain("sk-nonexistent");
    });

    test("returns error when prefix matches no fuda", async () => {
      const fuda = createFuda(db, { title: "Task 1", description: "Desc 1" });

      const result = await runDepsRemove({
        projectRoot: testDir,
        fudaId: fuda.id,
        dependsOnId: "xyz",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("not found");
    });
  });

  describe("JSON output format", () => {
    test("returns JSON-serializable result on success", async () => {
      const fuda1 = createFuda(db, { title: "Task 1", description: "Desc 1" });
      const fuda2 = createFuda(db, { title: "Task 2", description: "Desc 2" });
      addFudaDependency(db, fuda1.id, fuda2.id, DependencyType.BLOCKS);

      const result = await runDepsRemove({
        projectRoot: testDir,
        fudaId: fuda1.id,
        dependsOnId: fuda2.id,
      });

      const json = JSON.stringify(result);
      expect(json).toBeDefined();

      const parsed = JSON.parse(json);
      expect(parsed.success).toBe(true);
    });

    test("returns JSON-serializable result on error", async () => {
      const result = await runDepsRemove({
        projectRoot: testDir,
        fudaId: "sk-nonexistent",
        dependsOnId: "sk-alsonotfound",
      });

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
        const result = await runDepsRemove({
          projectRoot: uninitializedDir,
          fudaId: "sk-test",
          dependsOnId: "sk-test2",
        });

        expect(result.success).toBe(false);
        expect(result.error).toContain("not initialized");
      } finally {
        rmSync(uninitializedDir, { recursive: true, force: true });
      }
    });
  });
});
