import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { Database } from "bun:sqlite";
import { runInit } from "../../src/cli/commands/init";
import { runShow } from "../../src/cli/commands/show";
import { createFuda, updateFudaStatus } from "../../src/db/fuda";
import { addFudaDependency } from "../../src/db/dependencies";
import { addEntry, EntryType } from "../../src/db/ledger";
import { DependencyType, FudaStatus } from "../../src/types";

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
        spiritType: "review",
      });

      const result = await runShow({ id: fuda.id, projectRoot: testDir });

      expect(result.success).toBe(true);
      expect(result.fuda!.title).toBe("Complete task");
      expect(result.fuda!.description).toBe("Full description");
      expect(result.fuda!.priority).toBe(7);
      expect(result.fuda!.spiritType).toBe("review");
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

  describe("displays PRD info", () => {
    test("returns prdId when fuda has PRD reference", async () => {
      const fuda = createFuda(db, {
        title: "Task with PRD",
        description: "Has PRD reference",
        prdId: "2025-01-09_feature-xyz",
      });

      const result = await runShow({ id: fuda.id, projectRoot: testDir });

      expect(result.success).toBe(true);
      expect(result.fuda!.prdId).toBe("2025-01-09_feature-xyz");
    });

    test("returns null prdId when fuda has no PRD reference", async () => {
      const fuda = createFuda(db, {
        title: "Task without PRD",
        description: "No PRD reference",
      });

      const result = await runShow({ id: fuda.id, projectRoot: testDir });

      expect(result.success).toBe(true);
      expect(result.fuda!.prdId).toBeNull();
    });

    test("returns prdPath resolved to .shikigami/prds/{prd_id}.md when fuda has PRD reference", async () => {
      const fuda = createFuda(db, {
        title: "Task with PRD",
        description: "Has PRD reference",
        prdId: "2025-01-09_feature-xyz",
      });

      const result = await runShow({ id: fuda.id, projectRoot: testDir });

      expect(result.success).toBe(true);
      expect(result.fuda!.prdPath).toBe(".shikigami/prds/2025-01-09_feature-xyz.md");
    });

    test("returns null prdPath when fuda has no PRD reference", async () => {
      const fuda = createFuda(db, {
        title: "Task without PRD",
        description: "No PRD reference",
      });

      const result = await runShow({ id: fuda.id, projectRoot: testDir });

      expect(result.success).toBe(true);
      expect(result.fuda!.prdPath).toBeNull();
    });

    test("prdId is included in JSON output", async () => {
      const fuda = createFuda(db, {
        title: "Task with PRD",
        description: "Has PRD reference",
        prdId: "my-prd-123",
      });

      const result = await runShow({ id: fuda.id, projectRoot: testDir });
      const json = JSON.stringify(result);
      const parsed = JSON.parse(json);

      expect(parsed.fuda.prdId).toBe("my-prd-123");
    });

    test("prdPath is included in JSON output", async () => {
      const fuda = createFuda(db, {
        title: "Task with PRD",
        description: "Has PRD reference",
        prdId: "my-prd-123",
      });

      const result = await runShow({ id: fuda.id, projectRoot: testDir });
      const json = JSON.stringify(result);
      const parsed = JSON.parse(json);

      expect(parsed.fuda.prdPath).toBe(".shikigami/prds/my-prd-123.md");
    });
  });

  describe("displays ledger entries", () => {
    test("returns empty entries array when fuda has no ledger entries", async () => {
      const fuda = createFuda(db, {
        title: "Task without entries",
        description: "No ledger entries",
      });

      const result = await runShow({ id: fuda.id, projectRoot: testDir });

      expect(result.success).toBe(true);
      expect(result.fuda!.entries).toBeDefined();
      expect(result.fuda!.entries).toEqual([]);
    });

    test("returns entries array with all ledger entries for the fuda", async () => {
      const fuda = createFuda(db, {
        title: "Task with entries",
        description: "Has ledger entries",
      });

      addEntry(db, {
        fudaId: fuda.id,
        entryType: EntryType.HANDOFF,
        content: "Handoff note",
        spiritId: "agent-1",
      });
      addEntry(db, {
        fudaId: fuda.id,
        entryType: EntryType.LEARNING,
        content: "Learning note",
        spiritId: "agent-2",
      });

      const result = await runShow({ id: fuda.id, projectRoot: testDir });

      expect(result.success).toBe(true);
      expect(result.fuda!.entries).toHaveLength(2);
      expect(result.fuda!.entries[0].content).toBe("Handoff note");
      expect(result.fuda!.entries[0].entryType).toBe(EntryType.HANDOFF);
      expect(result.fuda!.entries[1].content).toBe("Learning note");
      expect(result.fuda!.entries[1].entryType).toBe(EntryType.LEARNING);
    });

    test("entries include all fields: id, fudaId, entryType, content, spiritId, createdAt", async () => {
      const fuda = createFuda(db, {
        title: "Task with entry",
        description: "Has ledger entry",
      });

      addEntry(db, {
        fudaId: fuda.id,
        entryType: EntryType.LEARNING,
        content: "Full entry",
        spiritId: "agent-123",
      });

      const result = await runShow({ id: fuda.id, projectRoot: testDir });

      expect(result.success).toBe(true);
      const entry = result.fuda!.entries[0];
      expect(entry.id).toBeDefined();
      expect(entry.id).toMatch(/^sk-/);
      expect(entry.fudaId).toBe(fuda.id);
      expect(entry.entryType).toBe(EntryType.LEARNING);
      expect(entry.content).toBe("Full entry");
      expect(entry.spiritId).toBe("agent-123");
      expect(entry.createdAt).toBeDefined();
    });

    test("entries without spiritId have null spiritId", async () => {
      const fuda = createFuda(db, {
        title: "Task with entry",
        description: "Has ledger entry",
      });

      addEntry(db, {
        fudaId: fuda.id,
        entryType: EntryType.LEARNING,
        content: "Entry without spirit",
      });

      const result = await runShow({ id: fuda.id, projectRoot: testDir });

      expect(result.success).toBe(true);
      expect(result.fuda!.entries[0].spiritId).toBeNull();
    });
  });

  describe("displays predecessor handoffs", () => {
    test("returns empty predecessorHandoffs array when no blocking dependencies", async () => {
      const fuda = createFuda(db, {
        title: "Standalone task",
        description: "No dependencies",
      });

      const result = await runShow({ id: fuda.id, projectRoot: testDir });

      expect(result.success).toBe(true);
      expect(result.fuda!.predecessorHandoffs).toBeDefined();
      expect(result.fuda!.predecessorHandoffs).toEqual([]);
    });

    test("predecessorHandoffs contains handoffs from blocking dependency fudas", async () => {
      // Create predecessor and mark as done
      const predecessor = createFuda(db, {
        title: "Predecessor task",
        description: "Blocks the main task",
      });
      updateFudaStatus(db, predecessor.id, FudaStatus.DONE);

      addEntry(db, {
        fudaId: predecessor.id,
        entryType: EntryType.HANDOFF,
        content: "First handoff note",
        spiritId: "agent-1",
      });
      addEntry(db, {
        fudaId: predecessor.id,
        entryType: EntryType.HANDOFF,
        content: "Second handoff note",
        spiritId: "agent-2",
      });

      // Create current fuda that depends on predecessor
      const fuda = createFuda(db, {
        title: "Main task",
        description: "Has blocking dependency",
      });
      addFudaDependency(db, fuda.id, predecessor.id, DependencyType.BLOCKS);

      const result = await runShow({ id: fuda.id, projectRoot: testDir });

      expect(result.success).toBe(true);
      expect(result.fuda!.predecessorHandoffs).toHaveLength(2);
      expect(result.fuda!.predecessorHandoffs[0].content).toBe("First handoff note");
      expect(result.fuda!.predecessorHandoffs[1].content).toBe("Second handoff note");
    });

    test("predecessorHandoffs includes sourceFudaId", async () => {
      const predecessor = createFuda(db, {
        title: "Predecessor task",
        description: "Blocks the main task",
      });
      updateFudaStatus(db, predecessor.id, FudaStatus.DONE);

      addEntry(db, {
        fudaId: predecessor.id,
        entryType: EntryType.HANDOFF,
        content: "Handoff with source",
        spiritId: "agent-1",
      });

      const fuda = createFuda(db, {
        title: "Main task",
        description: "Has blocking dependency",
      });
      addFudaDependency(db, fuda.id, predecessor.id, DependencyType.BLOCKS);

      const result = await runShow({ id: fuda.id, projectRoot: testDir });

      expect(result.success).toBe(true);
      expect(result.fuda!.predecessorHandoffs[0].sourceFudaId).toBe(predecessor.id);
    });

    test("predecessorHandoffs includes sourceFudaTitle", async () => {
      const predecessor = createFuda(db, {
        title: "My Predecessor Title",
        description: "Blocks the main task",
      });
      updateFudaStatus(db, predecessor.id, FudaStatus.DONE);

      addEntry(db, {
        fudaId: predecessor.id,
        entryType: EntryType.HANDOFF,
        content: "Handoff with title",
        spiritId: "agent-1",
      });

      const fuda = createFuda(db, {
        title: "Main task",
        description: "Has blocking dependency",
      });
      addFudaDependency(db, fuda.id, predecessor.id, DependencyType.BLOCKS);

      const result = await runShow({ id: fuda.id, projectRoot: testDir });

      expect(result.success).toBe(true);
      expect(result.fuda!.predecessorHandoffs[0].sourceFudaTitle).toBe("My Predecessor Title");
    });

    test("predecessorHandoffs from parent-child dependency", async () => {
      const parent = createFuda(db, {
        title: "Parent task",
        description: "Parent of current task",
      });
      updateFudaStatus(db, parent.id, FudaStatus.DONE);

      addEntry(db, {
        fudaId: parent.id,
        entryType: EntryType.HANDOFF,
        content: "Handoff from parent",
        spiritId: "agent-1",
      });

      const fuda = createFuda(db, {
        title: "Child task",
        description: "Child of parent",
      });
      addFudaDependency(db, fuda.id, parent.id, DependencyType.PARENT_CHILD);

      const result = await runShow({ id: fuda.id, projectRoot: testDir });

      expect(result.success).toBe(true);
      expect(result.fuda!.predecessorHandoffs).toHaveLength(1);
      expect(result.fuda!.predecessorHandoffs[0].content).toBe("Handoff from parent");
    });

    test("multiple predecessors contribute handoffs", async () => {
      const predecessor1 = createFuda(db, {
        title: "First predecessor",
        description: "First blocking task",
      });
      updateFudaStatus(db, predecessor1.id, FudaStatus.DONE);
      addEntry(db, {
        fudaId: predecessor1.id,
        entryType: EntryType.HANDOFF,
        content: "Handoff from first",
        spiritId: "agent-1",
      });

      const predecessor2 = createFuda(db, {
        title: "Second predecessor",
        description: "Second blocking task",
      });
      updateFudaStatus(db, predecessor2.id, FudaStatus.DONE);
      addEntry(db, {
        fudaId: predecessor2.id,
        entryType: EntryType.HANDOFF,
        content: "Handoff from second",
        spiritId: "agent-2",
      });

      const fuda = createFuda(db, {
        title: "Main task",
        description: "Has multiple dependencies",
      });
      addFudaDependency(db, fuda.id, predecessor1.id, DependencyType.BLOCKS);
      addFudaDependency(db, fuda.id, predecessor2.id, DependencyType.BLOCKS);

      const result = await runShow({ id: fuda.id, projectRoot: testDir });

      expect(result.success).toBe(true);
      expect(result.fuda!.predecessorHandoffs).toHaveLength(2);
      const contents = result.fuda!.predecessorHandoffs.map((h) => h.content);
      expect(contents).toContain("Handoff from first");
      expect(contents).toContain("Handoff from second");
    });

    test("related dependencies do not contribute to predecessorHandoffs", async () => {
      const relatedFuda = createFuda(db, {
        title: "Related task",
        description: "Related but not blocking",
      });
      updateFudaStatus(db, relatedFuda.id, FudaStatus.DONE);
      addEntry(db, {
        fudaId: relatedFuda.id,
        entryType: EntryType.HANDOFF,
        content: "Handoff from related",
        spiritId: "agent-1",
      });

      const fuda = createFuda(db, {
        title: "Main task",
        description: "Has related dependency",
      });
      addFudaDependency(db, fuda.id, relatedFuda.id, DependencyType.RELATED);

      const result = await runShow({ id: fuda.id, projectRoot: testDir });

      expect(result.success).toBe(true);
      expect(result.fuda!.predecessorHandoffs).toEqual([]);
    });

    test("discovered-from dependencies do not contribute to predecessorHandoffs", async () => {
      const sourceFuda = createFuda(db, {
        title: "Source task",
        description: "Discovered from",
      });
      updateFudaStatus(db, sourceFuda.id, FudaStatus.DONE);
      addEntry(db, {
        fudaId: sourceFuda.id,
        entryType: EntryType.HANDOFF,
        content: "Handoff from source",
        spiritId: "agent-1",
      });

      const fuda = createFuda(db, {
        title: "Discovered task",
        description: "Discovered from source",
      });
      addFudaDependency(db, fuda.id, sourceFuda.id, DependencyType.DISCOVERED_FROM);

      const result = await runShow({ id: fuda.id, projectRoot: testDir });

      expect(result.success).toBe(true);
      expect(result.fuda!.predecessorHandoffs).toEqual([]);
    });

    test("only handoff entries contribute to predecessorHandoffs, not learnings", async () => {
      const predecessor = createFuda(db, {
        title: "Predecessor task",
        description: "Blocks the main task",
      });
      updateFudaStatus(db, predecessor.id, FudaStatus.DONE);

      addEntry(db, {
        fudaId: predecessor.id,
        entryType: EntryType.HANDOFF,
        content: "Handoff entry",
        spiritId: "agent-1",
      });
      addEntry(db, {
        fudaId: predecessor.id,
        entryType: EntryType.LEARNING,
        content: "Learning entry",
        spiritId: "agent-2",
      });

      const fuda = createFuda(db, {
        title: "Main task",
        description: "Has blocking dependency",
      });
      addFudaDependency(db, fuda.id, predecessor.id, DependencyType.BLOCKS);

      const result = await runShow({ id: fuda.id, projectRoot: testDir });

      expect(result.success).toBe(true);
      expect(result.fuda!.predecessorHandoffs).toHaveLength(1);
      expect(result.fuda!.predecessorHandoffs[0].content).toBe("Handoff entry");
    });
  });

  describe("JSON output includes ledger structure", () => {
    test("JSON output includes entries array", async () => {
      const fuda = createFuda(db, {
        title: "Task with entry",
        description: "Has ledger entry",
      });
      addEntry(db, {
        fudaId: fuda.id,
        entryType: EntryType.LEARNING,
        content: "Learning note",
      });

      const result = await runShow({ id: fuda.id, projectRoot: testDir });
      const json = JSON.stringify(result);
      const parsed = JSON.parse(json);

      expect(parsed.fuda.entries).toBeDefined();
      expect(Array.isArray(parsed.fuda.entries)).toBe(true);
      expect(parsed.fuda.entries).toHaveLength(1);
      expect(parsed.fuda.entries[0].content).toBe("Learning note");
    });

    test("JSON output includes predecessorHandoffs array", async () => {
      const predecessor = createFuda(db, {
        title: "Predecessor",
        description: "Blocking task",
      });
      updateFudaStatus(db, predecessor.id, FudaStatus.DONE);
      addEntry(db, {
        fudaId: predecessor.id,
        entryType: EntryType.HANDOFF,
        content: "Predecessor handoff",
      });

      const fuda = createFuda(db, {
        title: "Main task",
        description: "Blocked by predecessor",
      });
      addFudaDependency(db, fuda.id, predecessor.id, DependencyType.BLOCKS);

      const result = await runShow({ id: fuda.id, projectRoot: testDir });
      const json = JSON.stringify(result);
      const parsed = JSON.parse(json);

      expect(parsed.fuda.predecessorHandoffs).toBeDefined();
      expect(Array.isArray(parsed.fuda.predecessorHandoffs)).toBe(true);
      expect(parsed.fuda.predecessorHandoffs).toHaveLength(1);
      expect(parsed.fuda.predecessorHandoffs[0].content).toBe("Predecessor handoff");
      expect(parsed.fuda.predecessorHandoffs[0].sourceFudaId).toBe(predecessor.id);
      expect(parsed.fuda.predecessorHandoffs[0].sourceFudaTitle).toBe("Predecessor");
    });

    test("JSON output includes full ledger entry structure", async () => {
      const fuda = createFuda(db, {
        title: "Task with entry",
        description: "Has ledger entry",
      });
      addEntry(db, {
        fudaId: fuda.id,
        entryType: EntryType.HANDOFF,
        content: "Complete entry",
        spiritId: "spirit-abc",
      });

      const result = await runShow({ id: fuda.id, projectRoot: testDir });
      const json = JSON.stringify(result);
      const parsed = JSON.parse(json);

      const entry = parsed.fuda.entries[0];
      expect(entry).toHaveProperty("id");
      expect(entry).toHaveProperty("fudaId");
      expect(entry).toHaveProperty("entryType");
      expect(entry).toHaveProperty("content");
      expect(entry).toHaveProperty("spiritId");
      expect(entry).toHaveProperty("createdAt");
    });
  });
});
