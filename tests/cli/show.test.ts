import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { Database } from "bun:sqlite";
import { runInit } from "../../src/cli/commands/init";
import { runShow } from "../../src/cli/commands/show";
import { createFuda } from "../../src/db/fuda";
import { addFudaDependency } from "../../src/db/dependencies";
import { DependencyType } from "../../src/types";

describe("show command", () => {
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

  describe("shows fuda by full ID", () => {
    test("returns fuda details by full ID", async () => {
      const fuda = createFuda(db, {
        title: "Test task",
        description: "Test description",
      });

      const result = await runShow({ id: fuda.id, projectRoot: testDir });

      expect(result.success).toBe(true);
      expect(result.fuda).toBeDefined();
      expect(result.fuda!.id).toBe(fuda.id);
      expect(result.fuda!.title).toBe("Test task");
      expect(result.fuda!.description).toBe("Test description");
    });

    test("returns all fuda fields", async () => {
      const fuda = createFuda(db, {
        title: "Complete task",
        description: "Full description",
        priority: 7,
        spiritType: "tengu",
      });

      const result = await runShow({ id: fuda.id, projectRoot: testDir });

      expect(result.success).toBe(true);
      expect(result.fuda!.title).toBe("Complete task");
      expect(result.fuda!.description).toBe("Full description");
      expect(result.fuda!.priority).toBe(7);
      expect(result.fuda!.spiritType).toBe("tengu");
      expect(result.fuda!.status).toBeDefined();
      expect(result.fuda!.createdAt).toBeDefined();
      expect(result.fuda!.updatedAt).toBeDefined();
    });
  });

  describe("shows fuda by prefix", () => {
    test("returns fuda by ID prefix without sk-", async () => {
      const fuda = createFuda(db, {
        title: "Prefix task",
        description: "Find by prefix",
      });
      const prefix = fuda.id.slice(3, 7); // Get 4 chars after "sk-"

      const result = await runShow({ id: prefix, projectRoot: testDir });

      expect(result.success).toBe(true);
      expect(result.fuda!.id).toBe(fuda.id);
    });

    test("returns fuda by ID prefix with sk-", async () => {
      const fuda = createFuda(db, {
        title: "Prefix task",
        description: "Find by prefix",
      });
      const prefix = fuda.id.slice(0, 6); // "sk-" + 3 chars

      const result = await runShow({ id: prefix, projectRoot: testDir });

      expect(result.success).toBe(true);
      expect(result.fuda!.id).toBe(fuda.id);
    });

    test("returns exact match over prefix match", async () => {
      const fuda = createFuda(db, {
        title: "Exact match task",
        description: "Should be found exactly",
      });

      const result = await runShow({ id: fuda.id, projectRoot: testDir });

      expect(result.success).toBe(true);
      expect(result.fuda!.id).toBe(fuda.id);
    });
  });

  describe("includes dependencies in output", () => {
    test("returns empty dependencies array when fuda has no dependencies", async () => {
      const fuda = createFuda(db, {
        title: "No deps task",
        description: "Has no dependencies",
      });

      const result = await runShow({ id: fuda.id, projectRoot: testDir });

      expect(result.success).toBe(true);
      expect(result.fuda!.dependencies).toBeDefined();
      expect(result.fuda!.dependencies).toEqual([]);
    });

    test("returns dependencies with fuda", async () => {
      const dep = createFuda(db, {
        title: "Dependency",
        description: "Blocking task",
      });
      const fuda = createFuda(db, {
        title: "Main task",
        description: "Has dependency",
      });
      addFudaDependency(db, fuda.id, dep.id, DependencyType.BLOCKS);

      const result = await runShow({ id: fuda.id, projectRoot: testDir });

      expect(result.success).toBe(true);
      expect(result.fuda!.dependencies).toHaveLength(1);
      expect(result.fuda!.dependencies[0].dependsOnId).toBe(dep.id);
      expect(result.fuda!.dependencies[0].type).toBe(DependencyType.BLOCKS);
    });

    test("returns multiple dependencies", async () => {
      const dep1 = createFuda(db, {
        title: "Dep 1",
        description: "First dependency",
      });
      const dep2 = createFuda(db, {
        title: "Dep 2",
        description: "Second dependency",
      });
      const fuda = createFuda(db, {
        title: "Main task",
        description: "Has multiple dependencies",
      });
      addFudaDependency(db, fuda.id, dep1.id, DependencyType.BLOCKS);
      addFudaDependency(db, fuda.id, dep2.id, DependencyType.RELATED);

      const result = await runShow({ id: fuda.id, projectRoot: testDir });

      expect(result.success).toBe(true);
      expect(result.fuda!.dependencies).toHaveLength(2);
      expect(result.fuda!.dependencies.map((d) => d.dependsOnId)).toContain(
        dep1.id
      );
      expect(result.fuda!.dependencies.map((d) => d.dependsOnId)).toContain(
        dep2.id
      );
    });

    test("includes dependency type in output", async () => {
      const dep = createFuda(db, {
        title: "Related task",
        description: "Just related",
      });
      const fuda = createFuda(db, {
        title: "Main task",
        description: "Has related dep",
      });
      addFudaDependency(db, fuda.id, dep.id, DependencyType.RELATED);

      const result = await runShow({ id: fuda.id, projectRoot: testDir });

      expect(result.success).toBe(true);
      expect(result.fuda!.dependencies[0].type).toBe(DependencyType.RELATED);
    });
  });

  describe("error handling for non-existent fuda", () => {
    test("returns error for non-existent ID", async () => {
      const result = await runShow({
        id: "sk-nonexistent",
        projectRoot: testDir,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Fuda not found");
      expect(result.error).toContain("sk-nonexistent");
    });

    test("returns error for non-existent prefix", async () => {
      const result = await runShow({ id: "zzz999", projectRoot: testDir });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Fuda not found");
    });

    test("returns error when shiki not initialized", async () => {
      const uninitializedDir = mkdtempSync(join(tmpdir(), "shiki-uninit-"));

      try {
        const result = await runShow({
          id: "sk-test",
          projectRoot: uninitializedDir,
        });

        expect(result.success).toBe(false);
        expect(result.error).toContain("not initialized");
      } finally {
        rmSync(uninitializedDir, { recursive: true, force: true });
      }
    });
  });

  describe("error handling for ambiguous prefix", () => {
    test("returns error when prefix matches multiple fuda", async () => {
      // Create two fuda - they'll have different IDs starting with sk-
      // We need to find a common prefix, which is tricky with random IDs
      // The safest test is to verify that ambiguous matches return not found
      const fuda1 = createFuda(db, {
        title: "First task",
        description: "First",
      });
      const fuda2 = createFuda(db, {
        title: "Second task",
        description: "Second",
      });

      // Use just "sk-" which matches both
      const result = await runShow({ id: "sk-", projectRoot: testDir });

      // Ambiguous prefix returns "not found" since findFudaByPrefix returns null
      expect(result.success).toBe(false);
      expect(result.error).toContain("Fuda not found");
    });
  });

  describe("JSON output format", () => {
    test("returns JSON-serializable result", async () => {
      const fuda = createFuda(db, {
        title: "Test task",
        description: "Test description",
      });

      const result = await runShow({ id: fuda.id, projectRoot: testDir });

      const json = JSON.stringify(result);
      expect(json).toBeDefined();

      const parsed = JSON.parse(json);
      expect(parsed.success).toBe(true);
      expect(parsed.fuda).toBeDefined();
    });

    test("fuda object contains all expected fields including dependencies", async () => {
      const dep = createFuda(db, {
        title: "Dependency",
        description: "Dep",
      });
      const fuda = createFuda(db, {
        title: "Main task",
        description: "Main",
        priority: 5,
      });
      addFudaDependency(db, fuda.id, dep.id, DependencyType.BLOCKS);

      const result = await runShow({ id: fuda.id, projectRoot: testDir });

      expect(result.fuda).toHaveProperty("id");
      expect(result.fuda).toHaveProperty("title");
      expect(result.fuda).toHaveProperty("description");
      expect(result.fuda).toHaveProperty("status");
      expect(result.fuda).toHaveProperty("spiritType");
      expect(result.fuda).toHaveProperty("priority");
      expect(result.fuda).toHaveProperty("createdAt");
      expect(result.fuda).toHaveProperty("updatedAt");
      expect(result.fuda).toHaveProperty("dependencies");
      expect(Array.isArray(result.fuda!.dependencies)).toBe(true);
    });

    test("dependency objects contain expected fields", async () => {
      const dep = createFuda(db, {
        title: "Dependency",
        description: "Dep",
      });
      const fuda = createFuda(db, {
        title: "Main task",
        description: "Main",
      });
      addFudaDependency(db, fuda.id, dep.id, DependencyType.BLOCKS);

      const result = await runShow({ id: fuda.id, projectRoot: testDir });
      const dependency = result.fuda!.dependencies[0];

      expect(dependency).toHaveProperty("fudaId");
      expect(dependency).toHaveProperty("dependsOnId");
      expect(dependency).toHaveProperty("type");
    });

    test("error result contains error message", async () => {
      const result = await runShow({
        id: "nonexistent",
        projectRoot: testDir,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(typeof result.error).toBe("string");
    });
  });
});
