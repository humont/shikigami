import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { Database } from "bun:sqlite";
import { runInit } from "../../src/cli/commands/init";
import { runAdd } from "../../src/cli/commands/add";
import { createFuda } from "../../src/db/fuda";
import { getFudaDependenciesFull } from "../../src/db/dependencies";
import { FudaStatus, SpiritType, DependencyType } from "../../src/types";

describe("add command", () => {
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

  describe("basic creation", () => {
    test("creates a fuda with title and description", async () => {
      const result = await runAdd({
        title: "Test task",
        description: "Test description",
        projectRoot: testDir,
      });

      expect(result.success).toBe(true);
      expect(result.fuda).toBeDefined();
      expect(result.fuda!.title).toBe("Test task");
      expect(result.fuda!.description).toBe("Test description");
    });

    test("creates fuda with ready status when no blockers", async () => {
      const result = await runAdd({
        title: "New task",
        description: "New description",
        projectRoot: testDir,
      });

      expect(result.success).toBe(true);
      // Fuda without blocking dependencies are auto-promoted to ready
      expect(result.fuda!.status).toBe(FudaStatus.READY);
    });

    test("creates fuda with pending status when has blockers", async () => {
      const blocker = createFuda(db, {
        title: "Blocker task",
        description: "Must complete first",
      });

      const result = await runAdd({
        title: "Blocked task",
        description: "Has blocker",
        dependsOn: [blocker.id],
        projectRoot: testDir,
      });

      expect(result.success).toBe(true);
      // Fuda with blocking dependencies stay pending
      expect(result.fuda!.status).toBe(FudaStatus.BLOCKED);
    });

    test("creates fuda with default spirit type of code", async () => {
      const result = await runAdd({
        title: "New task",
        description: "New description",
        projectRoot: testDir,
      });

      expect(result.success).toBe(true);
      expect(result.fuda!.spiritType).toBe(SpiritType.CODE);
    });

    test("creates fuda with generated id", async () => {
      const result = await runAdd({
        title: "New task",
        description: "New description",
        projectRoot: testDir,
      });

      expect(result.success).toBe(true);
      expect(result.fuda!.id).toMatch(/^sk-[a-z0-9]{4,6}$/);
    });
  });

  describe("creation with priority", () => {
    test("creates fuda with specified priority", async () => {
      const result = await runAdd({
        title: "High priority task",
        description: "Important",
        priority: 10,
        projectRoot: testDir,
      });

      expect(result.success).toBe(true);
      expect(result.fuda!.priority).toBe(10);
    });

    test("creates fuda with default priority of 0", async () => {
      const result = await runAdd({
        title: "Default priority task",
        description: "Normal",
        projectRoot: testDir,
      });

      expect(result.success).toBe(true);
      expect(result.fuda!.priority).toBe(0);
    });

    test("accepts negative priority", async () => {
      const result = await runAdd({
        title: "Low priority task",
        description: "Can wait",
        priority: -5,
        projectRoot: testDir,
      });

      expect(result.success).toBe(true);
      expect(result.fuda!.priority).toBe(-5);
    });
  });

  describe("creation with spirit type", () => {
    test("creates fuda with code spirit type", async () => {
      const result = await runAdd({
        title: "General task",
        description: "General work",
        spiritType: SpiritType.CODE,
        projectRoot: testDir,
      });

      expect(result.success).toBe(true);
      expect(result.fuda!.spiritType).toBe(SpiritType.CODE);
    });

    test("creates fuda with review spirit type", async () => {
      const result = await runAdd({
        title: "Review task",
        description: "Code review",
        spiritType: SpiritType.REVIEW,
        projectRoot: testDir,
      });

      expect(result.success).toBe(true);
      expect(result.fuda!.spiritType).toBe(SpiritType.REVIEW);
    });

    test("creates fuda with test spirit type", async () => {
      const result = await runAdd({
        title: "Testing task",
        description: "Write tests",
        spiritType: SpiritType.TEST,
        projectRoot: testDir,
      });

      expect(result.success).toBe(true);
      expect(result.fuda!.spiritType).toBe(SpiritType.TEST);
    });

    test("creates fuda with prd spirit type", async () => {
      const result = await runAdd({
        title: "PRD task",
        description: "Write requirements",
        spiritType: SpiritType.PRD,
        projectRoot: testDir,
      });

      expect(result.success).toBe(true);
      expect(result.fuda!.spiritType).toBe(SpiritType.PRD);
    });

    test("creates fuda with task spirit type", async () => {
      const result = await runAdd({
        title: "Breakdown task",
        description: "Break down PRD",
        spiritType: SpiritType.TASK,
        projectRoot: testDir,
      });

      expect(result.success).toBe(true);
      expect(result.fuda!.spiritType).toBe(SpiritType.TASK);
    });
  });

  describe("creation with dependencies", () => {
    test("creates fuda with single dependency", async () => {
      const dependency = createFuda(db, {
        title: "Dependency task",
        description: "Must complete first",
      });

      const result = await runAdd({
        title: "Dependent task",
        description: "Depends on another",
        dependsOn: [dependency.id],
        projectRoot: testDir,
      });

      expect(result.success).toBe(true);
      expect(result.fuda).toBeDefined();

      const deps = getFudaDependenciesFull(db, result.fuda!.id);
      expect(deps).toHaveLength(1);
      expect(deps[0].dependsOnId).toBe(dependency.id);
    });

    test("creates fuda with multiple dependencies", async () => {
      const dep1 = createFuda(db, {
        title: "First dependency",
        description: "Dep 1",
      });
      const dep2 = createFuda(db, {
        title: "Second dependency",
        description: "Dep 2",
      });

      const result = await runAdd({
        title: "Multi-dependent task",
        description: "Depends on two tasks",
        dependsOn: [dep1.id, dep2.id],
        projectRoot: testDir,
      });

      expect(result.success).toBe(true);

      const deps = getFudaDependenciesFull(db, result.fuda!.id);
      expect(deps).toHaveLength(2);
      expect(deps.map((d) => d.dependsOnId)).toContain(dep1.id);
      expect(deps.map((d) => d.dependsOnId)).toContain(dep2.id);
    });

    test("creates dependency with default blocks type", async () => {
      const dependency = createFuda(db, {
        title: "Blocking task",
        description: "Blocks another",
      });

      const result = await runAdd({
        title: "Blocked task",
        description: "Is blocked",
        dependsOn: [dependency.id],
        projectRoot: testDir,
      });

      expect(result.success).toBe(true);

      const deps = getFudaDependenciesFull(db, result.fuda!.id);
      expect(deps[0].type).toBe(DependencyType.BLOCKS);
    });

    test("creates dependency with specified type", async () => {
      const dependency = createFuda(db, {
        title: "Related task",
        description: "Related to another",
      });

      const result = await runAdd({
        title: "Related task 2",
        description: "Also related",
        dependsOn: [dependency.id],
        depType: DependencyType.RELATED,
        projectRoot: testDir,
      });

      expect(result.success).toBe(true);

      const deps = getFudaDependenciesFull(db, result.fuda!.id);
      expect(deps[0].type).toBe(DependencyType.RELATED);
    });

    test("resolves dependency by ID prefix", async () => {
      const dependency = createFuda(db, {
        title: "Dependency task",
        description: "Must complete first",
      });
      const prefix = dependency.id.slice(3, 7); // Get 4 chars after "sk-"

      const result = await runAdd({
        title: "Dependent task",
        description: "Depends on another",
        dependsOn: [prefix],
        projectRoot: testDir,
      });

      expect(result.success).toBe(true);

      const deps = getFudaDependenciesFull(db, result.fuda!.id);
      expect(deps).toHaveLength(1);
      expect(deps[0].dependsOnId).toBe(dependency.id);
    });
  });

  describe("creation with parent fuda", () => {
    test("creates fuda with parent reference", async () => {
      const parent = createFuda(db, {
        title: "Parent task",
        description: "Parent",
      });

      const result = await runAdd({
        title: "Child task",
        description: "Child",
        parentFudaId: parent.id,
        projectRoot: testDir,
      });

      expect(result.success).toBe(true);
      expect(result.fuda!.parentFudaId).toBe(parent.id);
    });

    test("resolves parent by ID prefix", async () => {
      const parent = createFuda(db, {
        title: "Parent task",
        description: "Parent",
      });
      const prefix = parent.id.slice(3, 7); // Get 4 chars after "sk-"

      const result = await runAdd({
        title: "Child task",
        description: "Child",
        parentFudaId: prefix,
        projectRoot: testDir,
      });

      expect(result.success).toBe(true);
      expect(result.fuda!.parentFudaId).toBe(parent.id);
    });
  });

  describe("error handling", () => {
    test("returns error when dependency not found", async () => {
      const result = await runAdd({
        title: "Task with missing dep",
        description: "Has invalid dependency",
        dependsOn: ["nonexistent"],
        projectRoot: testDir,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Dependency not found");
      expect(result.error).toContain("nonexistent");
    });

    test("returns error when parent fuda not found", async () => {
      const result = await runAdd({
        title: "Orphan task",
        description: "Invalid parent",
        parentFudaId: "nonexistent",
        projectRoot: testDir,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Parent fuda not found");
      expect(result.error).toContain("nonexistent");
    });

    test("returns error when shiki not initialized", async () => {
      const uninitializedDir = mkdtempSync(join(tmpdir(), "shiki-uninit-"));

      try {
        const result = await runAdd({
          title: "Test task",
          description: "Test",
          projectRoot: uninitializedDir,
        });

        expect(result.success).toBe(false);
        expect(result.error).toContain("not initialized");
      } finally {
        rmSync(uninitializedDir, { recursive: true, force: true });
      }
    });
  });

  describe("JSON output format", () => {
    test("returns JSON-serializable result", async () => {
      const result = await runAdd({
        title: "Test task",
        description: "Test description",
        projectRoot: testDir,
      });

      const json = JSON.stringify(result);
      expect(json).toBeDefined();

      const parsed = JSON.parse(json);
      expect(parsed.success).toBe(true);
      expect(parsed.fuda).toBeDefined();
    });

    test("fuda object contains all expected fields", async () => {
      const result = await runAdd({
        title: "Complete task",
        description: "Full description",
        priority: 5,
        spiritType: SpiritType.REVIEW,
        projectRoot: testDir,
      });

      const fuda = result.fuda!;

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
      const result = await runAdd({
        title: "Bad task",
        description: "Invalid",
        dependsOn: ["invalid-id"],
        projectRoot: testDir,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(typeof result.error).toBe("string");
    });
  });
});
