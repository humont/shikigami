import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { Database } from "bun:sqlite";
import { runInit } from "../../src/cli/commands/init";
import { runSearch } from "../../src/cli/commands/search";
import { createFuda } from "../../src/db/fuda";
import { addEntry, EntryType } from "../../src/db/ledger";

describe("search command", () => {
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

  describe("combined search (default)", () => {
    test("searches both fuda and ledger by default", async () => {
      const fuda = createFuda(db, {
        title: "Database migration task",
        description: "Migrate the database",
      });
      addEntry(db, {
        fudaId: fuda.id,
        entryType: EntryType.LEARNING,
        content: "Database connection pooling discovered",
      });

      const result = await runSearch({ query: "database", projectRoot: testDir });

      expect(result.success).toBe(true);
      expect(result.fuda).toHaveLength(1);
      expect(result.ledger).toHaveLength(1);
    });

    test("returns combined results from multiple fuda and ledger entries", async () => {
      const fuda1 = createFuda(db, {
        title: "API authentication",
        description: "Implement OAuth",
      });
      const fuda2 = createFuda(db, {
        title: "User authentication",
        description: "Login flow",
      });
      addEntry(db, {
        fudaId: fuda1.id,
        entryType: EntryType.HANDOFF,
        content: "Authentication tokens implemented",
      });

      const result = await runSearch({ query: "authentication", projectRoot: testDir });

      expect(result.success).toBe(true);
      expect(result.fuda).toHaveLength(2);
      expect(result.ledger).toHaveLength(1);
    });

    test("returns only fuda when no ledger matches", async () => {
      createFuda(db, {
        title: "Testing feature",
        description: "Add unit tests",
      });

      const result = await runSearch({ query: "testing", projectRoot: testDir });

      expect(result.success).toBe(true);
      expect(result.fuda).toHaveLength(1);
      expect(result.ledger).toHaveLength(0);
    });

    test("returns only ledger when no fuda matches", async () => {
      const fuda = createFuda(db, {
        title: "Task",
        description: "Description",
      });
      addEntry(db, {
        fudaId: fuda.id,
        entryType: EntryType.LEARNING,
        content: "Critical bug discovered in production",
      });

      const result = await runSearch({ query: "critical", projectRoot: testDir });

      expect(result.success).toBe(true);
      expect(result.fuda).toHaveLength(0);
      expect(result.ledger).toHaveLength(1);
    });
  });

  describe("fuda-only search", () => {
    test("searches only fuda when --fuda-only flag is set", async () => {
      const fuda = createFuda(db, {
        title: "Database task",
        description: "Work on database",
      });
      addEntry(db, {
        fudaId: fuda.id,
        entryType: EntryType.LEARNING,
        content: "Database optimization notes",
      });

      const result = await runSearch({
        query: "database",
        fudaOnly: true,
        projectRoot: testDir,
      });

      expect(result.success).toBe(true);
      expect(result.fuda).toHaveLength(1);
      expect(result.ledger).toBeUndefined();
    });

    test("returns empty fuda array when no matches", async () => {
      createFuda(db, {
        title: "Task",
        description: "Description",
      });

      const result = await runSearch({
        query: "nonexistent",
        fudaOnly: true,
        projectRoot: testDir,
      });

      expect(result.success).toBe(true);
      expect(result.fuda).toHaveLength(0);
      expect(result.ledger).toBeUndefined();
    });
  });

  describe("ledger-only search", () => {
    test("searches only ledger when --ledger-only flag is set", async () => {
      const fuda = createFuda(db, {
        title: "Database task",
        description: "Work on database",
      });
      addEntry(db, {
        fudaId: fuda.id,
        entryType: EntryType.LEARNING,
        content: "Database optimization notes",
      });

      const result = await runSearch({
        query: "database",
        ledgerOnly: true,
        projectRoot: testDir,
      });

      expect(result.success).toBe(true);
      expect(result.fuda).toBeUndefined();
      expect(result.ledger).toHaveLength(1);
    });

    test("returns empty ledger array when no matches", async () => {
      const fuda = createFuda(db, {
        title: "Task",
        description: "Description",
      });
      addEntry(db, {
        fudaId: fuda.id,
        entryType: EntryType.HANDOFF,
        content: "Some content",
      });

      const result = await runSearch({
        query: "nonexistent",
        ledgerOnly: true,
        projectRoot: testDir,
      });

      expect(result.success).toBe(true);
      expect(result.fuda).toBeUndefined();
      expect(result.ledger).toHaveLength(0);
    });
  });

  describe("empty results handling", () => {
    test("returns empty arrays when no matches found", async () => {
      createFuda(db, {
        title: "Task",
        description: "Description",
      });

      const result = await runSearch({ query: "nonexistent", projectRoot: testDir });

      expect(result.success).toBe(true);
      expect(result.fuda).toHaveLength(0);
      expect(result.ledger).toHaveLength(0);
    });

    test("returns empty arrays when database is empty", async () => {
      const result = await runSearch({ query: "anything", projectRoot: testDir });

      expect(result.success).toBe(true);
      expect(result.fuda).toHaveLength(0);
      expect(result.ledger).toHaveLength(0);
    });
  });

  describe("result structure", () => {
    test("fuda results include id and title", async () => {
      createFuda(db, {
        title: "Test fuda title",
        description: "Test description",
      });

      const result = await runSearch({ query: "fuda", projectRoot: testDir });

      expect(result.success).toBe(true);
      expect(result.fuda![0]).toHaveProperty("id");
      expect(result.fuda![0]).toHaveProperty("title");
      expect(result.fuda![0].title).toBe("Test fuda title");
    });

    test("ledger results include id, fudaId, and content", async () => {
      const fuda = createFuda(db, {
        title: "Task",
        description: "Description",
      });
      addEntry(db, {
        fudaId: fuda.id,
        entryType: EntryType.LEARNING,
        content: "Important learning content",
      });

      const result = await runSearch({ query: "learning", projectRoot: testDir });

      expect(result.success).toBe(true);
      expect(result.ledger![0]).toHaveProperty("id");
      expect(result.ledger![0]).toHaveProperty("fudaId");
      expect(result.ledger![0]).toHaveProperty("content");
      expect(result.ledger![0].fudaId).toBe(fuda.id);
      expect(result.ledger![0].content).toBe("Important learning content");
    });

    test("fuda results include all expected fields", async () => {
      createFuda(db, {
        title: "Complete task",
        description: "Full description",
        priority: 5,
      });

      const result = await runSearch({ query: "Complete", projectRoot: testDir });
      const fuda = result.fuda![0];

      expect(fuda).toHaveProperty("id");
      expect(fuda).toHaveProperty("title");
      expect(fuda).toHaveProperty("description");
      expect(fuda).toHaveProperty("status");
      expect(fuda).toHaveProperty("priority");
    });

    test("ledger results include all expected fields", async () => {
      const fuda = createFuda(db, {
        title: "Task",
        description: "Description",
      });
      addEntry(db, {
        fudaId: fuda.id,
        entryType: EntryType.HANDOFF,
        content: "Handoff content",
        spiritId: "agent-123",
      });

      const result = await runSearch({ query: "Handoff", projectRoot: testDir });
      const entry = result.ledger![0];

      expect(entry).toHaveProperty("id");
      expect(entry).toHaveProperty("fudaId");
      expect(entry).toHaveProperty("entryType");
      expect(entry).toHaveProperty("content");
      expect(entry).toHaveProperty("spiritId");
      expect(entry).toHaveProperty("createdAt");
    });
  });

  describe("JSON output format", () => {
    test("returns JSON-serializable result for combined search", async () => {
      const fuda = createFuda(db, {
        title: "Searchable task",
        description: "Description",
      });
      addEntry(db, {
        fudaId: fuda.id,
        entryType: EntryType.LEARNING,
        content: "Searchable content",
      });

      const result = await runSearch({ query: "Searchable", projectRoot: testDir });

      const json = JSON.stringify(result);
      expect(json).toBeDefined();

      const parsed = JSON.parse(json);
      expect(parsed.success).toBe(true);
      expect(Array.isArray(parsed.fuda)).toBe(true);
      expect(Array.isArray(parsed.ledger)).toBe(true);
    });

    test("returns JSON-serializable result for fuda-only search", async () => {
      createFuda(db, {
        title: "Searchable task",
        description: "Description",
      });

      const result = await runSearch({
        query: "Searchable",
        fudaOnly: true,
        projectRoot: testDir,
      });

      const json = JSON.stringify(result);
      expect(json).toBeDefined();

      const parsed = JSON.parse(json);
      expect(parsed.success).toBe(true);
      expect(Array.isArray(parsed.fuda)).toBe(true);
    });

    test("returns JSON-serializable result for ledger-only search", async () => {
      const fuda = createFuda(db, {
        title: "Task",
        description: "Description",
      });
      addEntry(db, {
        fudaId: fuda.id,
        entryType: EntryType.HANDOFF,
        content: "Searchable entry",
      });

      const result = await runSearch({
        query: "Searchable",
        ledgerOnly: true,
        projectRoot: testDir,
      });

      const json = JSON.stringify(result);
      expect(json).toBeDefined();

      const parsed = JSON.parse(json);
      expect(parsed.success).toBe(true);
      expect(Array.isArray(parsed.ledger)).toBe(true);
    });
  });

  describe("error handling", () => {
    test("returns error when shiki not initialized", async () => {
      const uninitializedDir = mkdtempSync(join(tmpdir(), "shiki-uninit-"));

      try {
        const result = await runSearch({
          query: "test",
          projectRoot: uninitializedDir,
        });

        expect(result.success).toBe(false);
        expect(result.error).toContain("not initialized");
      } finally {
        rmSync(uninitializedDir, { recursive: true, force: true });
      }
    });

    test("returns error for mutually exclusive flags", async () => {
      const result = await runSearch({
        query: "test",
        fudaOnly: true,
        ledgerOnly: true,
        projectRoot: testDir,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("mutually exclusive");
    });
  });

  describe("search query behavior", () => {
    test("search is case-insensitive", async () => {
      createFuda(db, {
        title: "DATABASE Migration",
        description: "Run migrations",
      });

      const result = await runSearch({ query: "database", projectRoot: testDir });

      expect(result.success).toBe(true);
      expect(result.fuda).toHaveLength(1);
    });

    test("supports prefix matching with wildcard", async () => {
      createFuda(db, {
        title: "Authentication system",
        description: "Login feature",
      });

      const result = await runSearch({ query: "auth*", projectRoot: testDir });

      expect(result.success).toBe(true);
      expect(result.fuda).toHaveLength(1);
    });

    test("excludes soft-deleted fuda from results", async () => {
      const fuda = createFuda(db, {
        title: "Delete me",
        description: "Should not appear",
      });

      // Soft delete
      db.run(
        "UPDATE fuda SET deleted_at = datetime('now'), deleted_by = 'test' WHERE id = ?",
        [fuda.id]
      );

      const result = await runSearch({ query: "Delete", projectRoot: testDir });

      expect(result.success).toBe(true);
      expect(result.fuda).toHaveLength(0);
    });
  });
});
