import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { Database } from "bun:sqlite";
import { runInit } from "../../src/cli/commands/init";
import { runDepsAdd } from "../../src/cli/commands/deps/add";
import { createFuda } from "../../src/db/fuda";
import { getFudaDependenciesFull } from "../../src/db/dependencies";
import { DependencyType } from "../../src/types";

describe("deps add command", () => {
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

  describe("adds blocking dependency (default)", () => {
    test("creates blocking dependency between two fuda", async () => {
      const fuda1 = createFuda(db, { title: "Task 1", description: "Desc 1" });
      const fuda2 = createFuda(db, { title: "Task 2", description: "Desc 2" });

      const result = await runDepsAdd({
        projectRoot: testDir,
        fudaId: fuda1.id,
        dependsOnId: fuda2.id,
      });

      expect(result.success).toBe(true);
      expect(result.fudaId).toBe(fuda1.id);
      expect(result.dependsOnId).toBe(fuda2.id);

      // Verify dependency in database
      const deps = getFudaDependenciesFull(db, fuda1.id);
      expect(deps).toHaveLength(1);
      expect(deps[0].dependsOnId).toBe(fuda2.id);
      expect(deps[0].type).toBe(DependencyType.BLOCKS);
    });

    test("uses 'blocks' as default type when not specified", async () => {
      const fuda1 = createFuda(db, { title: "Task 1", description: "Desc 1" });
      const fuda2 = createFuda(db, { title: "Task 2", description: "Desc 2" });

      await runDepsAdd({
        projectRoot: testDir,
        fudaId: fuda1.id,
        dependsOnId: fuda2.id,
      });

      const deps = getFudaDependenciesFull(db, fuda1.id);
      expect(deps[0].type).toBe("blocks");
    });

    test("supports ID prefix matching", async () => {
      const fuda1 = createFuda(db, { title: "Task 1", description: "Desc 1" });
      const fuda2 = createFuda(db, { title: "Task 2", description: "Desc 2" });
      const prefix1 = fuda1.id.replace("sk-", "").substring(0, 4);
      const prefix2 = fuda2.id.replace("sk-", "").substring(0, 4);

      const result = await runDepsAdd({
        projectRoot: testDir,
        fudaId: prefix1,
        dependsOnId: prefix2,
      });

      expect(result.success).toBe(true);
      expect(result.fudaId).toBe(fuda1.id);
      expect(result.dependsOnId).toBe(fuda2.id);
    });
  });

  describe("adds parent-child dependency", () => {
    test("creates parent-child dependency with explicit type", async () => {
      const parent = createFuda(db, { title: "Parent Task", description: "Parent" });
      const child = createFuda(db, { title: "Child Task", description: "Child" });

      const result = await runDepsAdd({
        projectRoot: testDir,
        fudaId: child.id,
        dependsOnId: parent.id,
        type: "parent-child",
      });

      expect(result.success).toBe(true);

      const deps = getFudaDependenciesFull(db, child.id);
      expect(deps).toHaveLength(1);
      expect(deps[0].dependsOnId).toBe(parent.id);
      expect(deps[0].type).toBe(DependencyType.PARENT_CHILD);
    });
  });

  describe("adds related dependency", () => {
    test("creates related dependency with explicit type", async () => {
      const fuda1 = createFuda(db, { title: "Task 1", description: "Desc 1" });
      const fuda2 = createFuda(db, { title: "Related Task", description: "Related" });

      const result = await runDepsAdd({
        projectRoot: testDir,
        fudaId: fuda1.id,
        dependsOnId: fuda2.id,
        type: "related",
      });

      expect(result.success).toBe(true);

      const deps = getFudaDependenciesFull(db, fuda1.id);
      expect(deps).toHaveLength(1);
      expect(deps[0].dependsOnId).toBe(fuda2.id);
      expect(deps[0].type).toBe(DependencyType.RELATED);
    });
  });

  describe("adds discovered-from dependency", () => {
    test("creates discovered-from dependency with explicit type", async () => {
      const original = createFuda(db, { title: "Original Task", description: "Original" });
      const discovered = createFuda(db, { title: "Discovered Task", description: "Found during work" });

      const result = await runDepsAdd({
        projectRoot: testDir,
        fudaId: discovered.id,
        dependsOnId: original.id,
        type: "discovered-from",
      });

      expect(result.success).toBe(true);

      const deps = getFudaDependenciesFull(db, discovered.id);
      expect(deps).toHaveLength(1);
      expect(deps[0].dependsOnId).toBe(original.id);
      expect(deps[0].type).toBe(DependencyType.DISCOVERED_FROM);
    });
  });

  describe("error handling for non-existent fuda", () => {
    test("returns error when source fuda does not exist", async () => {
      const fuda = createFuda(db, { title: "Task 1", description: "Desc 1" });

      const result = await runDepsAdd({
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

      const result = await runDepsAdd({
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

      const result = await runDepsAdd({
        projectRoot: testDir,
        fudaId: fuda.id,
        dependsOnId: "xyz",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("not found");
    });
  });

  describe("error handling for self-reference", () => {
    test("allows self-reference (no error)", async () => {
      // Note: Current implementation does not prevent self-references
      // This test documents current behavior
      const fuda = createFuda(db, { title: "Task 1", description: "Desc 1" });

      const result = await runDepsAdd({
        projectRoot: testDir,
        fudaId: fuda.id,
        dependsOnId: fuda.id,
      });

      // Current implementation allows self-reference
      // If this should be an error, the implementation needs updating
      expect(result.success).toBe(true);
    });
  });

  describe("JSON output format", () => {
    test("returns JSON-serializable result on success", async () => {
      const fuda1 = createFuda(db, { title: "Task 1", description: "Desc 1" });
      const fuda2 = createFuda(db, { title: "Task 2", description: "Desc 2" });

      const result = await runDepsAdd({
        projectRoot: testDir,
        fudaId: fuda1.id,
        dependsOnId: fuda2.id,
      });

      const json = JSON.stringify(result);
      expect(json).toBeDefined();

      const parsed = JSON.parse(json);
      expect(parsed.success).toBe(true);
      expect(parsed.fudaId).toBeDefined();
      expect(parsed.dependsOnId).toBeDefined();
    });

    test("returns JSON-serializable result on error", async () => {
      const result = await runDepsAdd({
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

  describe("multiple dependencies", () => {
    test("can add multiple dependencies to same fuda", async () => {
      const main = createFuda(db, { title: "Main Task", description: "Main" });
      const dep1 = createFuda(db, { title: "Dep 1", description: "Desc 1" });
      const dep2 = createFuda(db, { title: "Dep 2", description: "Desc 2" });

      await runDepsAdd({
        projectRoot: testDir,
        fudaId: main.id,
        dependsOnId: dep1.id,
        type: "blocks",
      });

      await runDepsAdd({
        projectRoot: testDir,
        fudaId: main.id,
        dependsOnId: dep2.id,
        type: "related",
      });

      const deps = getFudaDependenciesFull(db, main.id);
      expect(deps).toHaveLength(2);
    });

    test("replaces existing dependency when adding same pair", async () => {
      const fuda1 = createFuda(db, { title: "Task 1", description: "Desc 1" });
      const fuda2 = createFuda(db, { title: "Task 2", description: "Desc 2" });

      await runDepsAdd({
        projectRoot: testDir,
        fudaId: fuda1.id,
        dependsOnId: fuda2.id,
        type: "blocks",
      });

      await runDepsAdd({
        projectRoot: testDir,
        fudaId: fuda1.id,
        dependsOnId: fuda2.id,
        type: "related",
      });

      // Should only have one dependency (replaced)
      const deps = getFudaDependenciesFull(db, fuda1.id);
      expect(deps).toHaveLength(1);
      expect(deps[0].type).toBe("related");
    });
  });

  describe("error when shiki not initialized", () => {
    test("returns error when shiki not initialized", async () => {
      const uninitializedDir = mkdtempSync(join(tmpdir(), "shiki-uninit-"));

      try {
        const result = await runDepsAdd({
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
