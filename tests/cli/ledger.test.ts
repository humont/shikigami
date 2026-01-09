import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { Database } from "bun:sqlite";
import { runInit } from "../../src/cli/commands/init";
import { runLedger, runLedgerAdd } from "../../src/cli/commands/ledger";
import { createFuda } from "../../src/db/fuda";
import { addEntry, EntryType } from "../../src/db/ledger";

describe("ledger command", () => {
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

  describe("viewing ledger entries", () => {
    test("returns all entries for a fuda", async () => {
      const fuda = createFuda(db, {
        title: "Test task",
        description: "Test description",
      });
      addEntry(db, {
        fudaId: fuda.id,
        entryType: EntryType.HANDOFF,
        content: "First handoff",
      });
      addEntry(db, {
        fudaId: fuda.id,
        entryType: EntryType.LEARNING,
        content: "Learned something",
      });

      const result = await runLedger({ id: fuda.id, projectRoot: testDir });

      expect(result.success).toBe(true);
      expect(result.entries).toHaveLength(2);
    });

    test("returns entries in chronological order (oldest first)", async () => {
      const fuda = createFuda(db, {
        title: "Test task",
        description: "Test description",
      });
      addEntry(db, {
        fudaId: fuda.id,
        entryType: EntryType.HANDOFF,
        content: "First",
      });
      addEntry(db, {
        fudaId: fuda.id,
        entryType: EntryType.LEARNING,
        content: "Second",
      });

      const result = await runLedger({ id: fuda.id, projectRoot: testDir });

      expect(result.success).toBe(true);
      expect(result.entries![0].content).toBe("First");
      expect(result.entries![1].content).toBe("Second");
    });

    test("returns empty array for fuda with no entries", async () => {
      const fuda = createFuda(db, {
        title: "Test task",
        description: "Test description",
      });

      const result = await runLedger({ id: fuda.id, projectRoot: testDir });

      expect(result.success).toBe(true);
      expect(result.entries).toEqual([]);
    });

    test("finds fuda by prefix", async () => {
      const fuda = createFuda(db, {
        title: "Test task",
        description: "Test description",
      });
      addEntry(db, {
        fudaId: fuda.id,
        entryType: EntryType.HANDOFF,
        content: "Entry",
      });

      const prefix = fuda.id.slice(3, 7);
      const result = await runLedger({ id: prefix, projectRoot: testDir });

      expect(result.success).toBe(true);
      expect(result.entries).toHaveLength(1);
    });

    test("returns error for non-existent fuda", async () => {
      const result = await runLedger({ id: "sk-nonexistent", projectRoot: testDir });

      expect(result.success).toBe(false);
      expect(result.error).toContain("not found");
    });
  });

  describe("filtering by type", () => {
    test("filters to handoffs only", async () => {
      const fuda = createFuda(db, {
        title: "Test task",
        description: "Test description",
      });
      addEntry(db, {
        fudaId: fuda.id,
        entryType: EntryType.HANDOFF,
        content: "Handoff 1",
      });
      addEntry(db, {
        fudaId: fuda.id,
        entryType: EntryType.LEARNING,
        content: "Learning 1",
      });
      addEntry(db, {
        fudaId: fuda.id,
        entryType: EntryType.HANDOFF,
        content: "Handoff 2",
      });

      const result = await runLedger({
        id: fuda.id,
        projectRoot: testDir,
        type: "handoff",
      });

      expect(result.success).toBe(true);
      expect(result.entries).toHaveLength(2);
      expect(result.entries!.every((e) => e.entryType === EntryType.HANDOFF)).toBe(true);
    });

    test("filters to learnings only", async () => {
      const fuda = createFuda(db, {
        title: "Test task",
        description: "Test description",
      });
      addEntry(db, {
        fudaId: fuda.id,
        entryType: EntryType.HANDOFF,
        content: "Handoff 1",
      });
      addEntry(db, {
        fudaId: fuda.id,
        entryType: EntryType.LEARNING,
        content: "Learning 1",
      });
      addEntry(db, {
        fudaId: fuda.id,
        entryType: EntryType.LEARNING,
        content: "Learning 2",
      });

      const result = await runLedger({
        id: fuda.id,
        projectRoot: testDir,
        type: "learning",
      });

      expect(result.success).toBe(true);
      expect(result.entries).toHaveLength(2);
      expect(result.entries!.every((e) => e.entryType === EntryType.LEARNING)).toBe(true);
    });

    test("returns error for invalid type", async () => {
      const fuda = createFuda(db, {
        title: "Test task",
        description: "Test description",
      });

      const result = await runLedger({
        id: fuda.id,
        projectRoot: testDir,
        type: "invalid",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid type");
    });
  });

  describe("adding entries", () => {
    test("creates learning entry by default", async () => {
      const fuda = createFuda(db, {
        title: "Test task",
        description: "Test description",
      });

      const result = await runLedgerAdd({
        id: fuda.id,
        content: "This is a learning",
        projectRoot: testDir,
      });

      expect(result.success).toBe(true);
      expect(result.entry).toBeDefined();
      expect(result.entry!.entryType).toBe(EntryType.LEARNING);
      expect(result.entry!.content).toBe("This is a learning");
    });

    test("creates handoff entry when type specified", async () => {
      const fuda = createFuda(db, {
        title: "Test task",
        description: "Test description",
      });

      const result = await runLedgerAdd({
        id: fuda.id,
        content: "Passing to next agent",
        type: "handoff",
        projectRoot: testDir,
      });

      expect(result.success).toBe(true);
      expect(result.entry!.entryType).toBe(EntryType.HANDOFF);
      expect(result.entry!.content).toBe("Passing to next agent");
    });

    test("creates learning entry when type explicitly specified", async () => {
      const fuda = createFuda(db, {
        title: "Test task",
        description: "Test description",
      });

      const result = await runLedgerAdd({
        id: fuda.id,
        content: "Discovered something",
        type: "learning",
        projectRoot: testDir,
      });

      expect(result.success).toBe(true);
      expect(result.entry!.entryType).toBe(EntryType.LEARNING);
    });

    test("finds fuda by prefix when adding", async () => {
      const fuda = createFuda(db, {
        title: "Test task",
        description: "Test description",
      });

      const prefix = fuda.id.slice(3, 7);
      const result = await runLedgerAdd({
        id: prefix,
        content: "Entry content",
        projectRoot: testDir,
      });

      expect(result.success).toBe(true);
      expect(result.entry!.fudaId).toBe(fuda.id);
    });

    test("returns error for non-existent fuda", async () => {
      const result = await runLedgerAdd({
        id: "sk-nonexistent",
        content: "Content",
        projectRoot: testDir,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("not found");
    });

    test("returns error for invalid type when adding", async () => {
      const fuda = createFuda(db, {
        title: "Test task",
        description: "Test description",
      });

      const result = await runLedgerAdd({
        id: fuda.id,
        content: "Content",
        type: "invalid",
        projectRoot: testDir,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid type");
    });
  });

  describe("error handling", () => {
    test("returns error when shiki not initialized", async () => {
      const uninitializedDir = mkdtempSync(join(tmpdir(), "shiki-uninit-"));

      try {
        const result = await runLedger({ id: "sk-abc123", projectRoot: uninitializedDir });

        expect(result.success).toBe(false);
        expect(result.error).toContain("not initialized");
      } finally {
        rmSync(uninitializedDir, { recursive: true, force: true });
      }
    });

    test("returns error when shiki not initialized (add)", async () => {
      const uninitializedDir = mkdtempSync(join(tmpdir(), "shiki-uninit-"));

      try {
        const result = await runLedgerAdd({
          id: "sk-abc123",
          content: "Content",
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
    test("returns JSON-serializable result for ledger", async () => {
      const fuda = createFuda(db, {
        title: "Test task",
        description: "Test description",
      });
      addEntry(db, {
        fudaId: fuda.id,
        entryType: EntryType.HANDOFF,
        content: "Entry content",
      });

      const result = await runLedger({ id: fuda.id, projectRoot: testDir });

      const json = JSON.stringify(result);
      expect(json).toBeDefined();

      const parsed = JSON.parse(json);
      expect(parsed.success).toBe(true);
      expect(Array.isArray(parsed.entries)).toBe(true);
    });

    test("returns JSON-serializable result for ledger add", async () => {
      const fuda = createFuda(db, {
        title: "Test task",
        description: "Test description",
      });

      const result = await runLedgerAdd({
        id: fuda.id,
        content: "Entry content",
        projectRoot: testDir,
      });

      const json = JSON.stringify(result);
      expect(json).toBeDefined();

      const parsed = JSON.parse(json);
      expect(parsed.success).toBe(true);
      expect(parsed.entry).toBeDefined();
    });

    test("ledger entries contain all expected fields", async () => {
      const fuda = createFuda(db, {
        title: "Test task",
        description: "Test description",
      });
      addEntry(db, {
        fudaId: fuda.id,
        entryType: EntryType.HANDOFF,
        content: "Entry content",
        spiritId: "agent-123",
      });

      const result = await runLedger({ id: fuda.id, projectRoot: testDir });
      const entry = result.entries![0];

      expect(entry).toHaveProperty("id");
      expect(entry).toHaveProperty("fudaId");
      expect(entry).toHaveProperty("entryType");
      expect(entry).toHaveProperty("content");
      expect(entry).toHaveProperty("spiritId");
      expect(entry).toHaveProperty("createdAt");
    });
  });
});
