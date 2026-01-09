import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { Database } from "bun:sqlite";
import { initializeDb } from "../../src/db/index";
import { createFuda, deleteFuda } from "../../src/db/fuda";
import { addEntry, EntryType } from "../../src/db/ledger";
import {
  searchFuda,
  searchLedger,
  searchAll,
} from "../../src/db/search";

describe("FTS5 search", () => {
  let db: Database;

  beforeEach(() => {
    db = new Database(":memory:");
    initializeDb(db);
  });

  afterEach(() => {
    db.close();
  });

  describe("searchFuda", () => {
    test("finds fuda by title match", () => {
      createFuda(db, { title: "Implement authentication", description: "Add login" });
      createFuda(db, { title: "Fix bug", description: "Something else" });

      const results = searchFuda(db, "authentication");

      expect(results).toHaveLength(1);
      expect(results[0].title).toBe("Implement authentication");
    });

    test("finds fuda by description match", () => {
      createFuda(db, { title: "Task one", description: "Configure database connection" });
      createFuda(db, { title: "Task two", description: "Setup testing" });

      const results = searchFuda(db, "database");

      expect(results).toHaveLength(1);
      expect(results[0].description).toBe("Configure database connection");
    });

    test("finds multiple fuda matching query", () => {
      createFuda(db, { title: "API authentication", description: "JWT tokens" });
      createFuda(db, { title: "User authentication", description: "OAuth flow" });
      createFuda(db, { title: "Unrelated task", description: "Something else" });

      const results = searchFuda(db, "authentication");

      expect(results).toHaveLength(2);
    });

    test("returns empty array when no matches", () => {
      createFuda(db, { title: "Some task", description: "Some description" });

      const results = searchFuda(db, "nonexistent");

      expect(results).toEqual([]);
    });

    test("search is case-insensitive", () => {
      createFuda(db, { title: "Database Migration", description: "Run migrations" });

      const results = searchFuda(db, "DATABASE");

      expect(results).toHaveLength(1);
    });

    test("supports partial word matching with prefix", () => {
      createFuda(db, { title: "Authentication system", description: "Login feature" });

      const results = searchFuda(db, "auth*");

      expect(results).toHaveLength(1);
    });

    test("excludes soft-deleted fuda from results", () => {
      const fuda = createFuda(db, { title: "Delete me", description: "Should not appear" });
      deleteFuda(db, fuda.id);

      const results = searchFuda(db, "Delete");

      expect(results).toEqual([]);
    });

    test("returns fuda with all expected fields", () => {
      createFuda(db, {
        title: "Complete task",
        description: "Full description here",
        priority: 5,
      });

      const results = searchFuda(db, "Complete");

      expect(results).toHaveLength(1);
      expect(results[0]).toHaveProperty("id");
      expect(results[0]).toHaveProperty("title");
      expect(results[0]).toHaveProperty("description");
      expect(results[0]).toHaveProperty("status");
      expect(results[0]).toHaveProperty("priority");
    });
  });

  describe("searchLedger", () => {
    test("finds ledger entry by content match", () => {
      const fuda = createFuda(db, { title: "Task", description: "Desc" });
      addEntry(db, { fudaId: fuda.id, entryType: EntryType.HANDOFF, content: "Completed database schema" });
      addEntry(db, { fudaId: fuda.id, entryType: EntryType.LEARNING, content: "Unrelated note" });

      const results = searchLedger(db, "database");

      expect(results).toHaveLength(1);
      expect(results[0].content).toBe("Completed database schema");
    });

    test("finds multiple ledger entries matching query", () => {
      const fuda = createFuda(db, { title: "Task", description: "Desc" });
      addEntry(db, { fudaId: fuda.id, entryType: EntryType.HANDOFF, content: "API endpoint created" });
      addEntry(db, { fudaId: fuda.id, entryType: EntryType.LEARNING, content: "API requires auth" });
      addEntry(db, { fudaId: fuda.id, entryType: EntryType.HANDOFF, content: "Something else" });

      const results = searchLedger(db, "API");

      expect(results).toHaveLength(2);
    });

    test("returns empty array when no matches", () => {
      const fuda = createFuda(db, { title: "Task", description: "Desc" });
      addEntry(db, { fudaId: fuda.id, entryType: EntryType.HANDOFF, content: "Some content" });

      const results = searchLedger(db, "nonexistent");

      expect(results).toEqual([]);
    });

    test("search is case-insensitive", () => {
      const fuda = createFuda(db, { title: "Task", description: "Desc" });
      addEntry(db, { fudaId: fuda.id, entryType: EntryType.LEARNING, content: "IMPORTANT discovery" });

      const results = searchLedger(db, "important");

      expect(results).toHaveLength(1);
    });

    test("returns entries with all expected fields", () => {
      const fuda = createFuda(db, { title: "Task", description: "Desc" });
      addEntry(db, {
        fudaId: fuda.id,
        entryType: EntryType.HANDOFF,
        content: "Handoff note here",
        spiritId: "agent-123",
      });

      const results = searchLedger(db, "Handoff");

      expect(results).toHaveLength(1);
      expect(results[0]).toHaveProperty("id");
      expect(results[0]).toHaveProperty("fudaId");
      expect(results[0]).toHaveProperty("entryType");
      expect(results[0]).toHaveProperty("content");
      expect(results[0]).toHaveProperty("spiritId");
      expect(results[0]).toHaveProperty("createdAt");
    });

    test("finds entries across different fuda", () => {
      const fuda1 = createFuda(db, { title: "Task 1", description: "Desc" });
      const fuda2 = createFuda(db, { title: "Task 2", description: "Desc" });
      addEntry(db, { fudaId: fuda1.id, entryType: EntryType.HANDOFF, content: "Migration complete" });
      addEntry(db, { fudaId: fuda2.id, entryType: EntryType.LEARNING, content: "Migration requires downtime" });

      const results = searchLedger(db, "migration");

      expect(results).toHaveLength(2);
    });
  });

  describe("searchAll", () => {
    test("combines fuda and ledger results", () => {
      const fuda = createFuda(db, { title: "Database setup", description: "Configure DB" });
      createFuda(db, { title: "Other task", description: "Unrelated" });
      addEntry(db, { fudaId: fuda.id, entryType: EntryType.LEARNING, content: "Database connection pooling" });

      const results = searchAll(db, "database");

      expect(results.fuda).toHaveLength(1);
      expect(results.ledger).toHaveLength(1);
    });

    test("returns empty arrays when no matches", () => {
      createFuda(db, { title: "Some task", description: "Desc" });

      const results = searchAll(db, "nonexistent");

      expect(results.fuda).toEqual([]);
      expect(results.ledger).toEqual([]);
    });

    test("returns only fuda when no ledger matches", () => {
      createFuda(db, { title: "Authentication feature", description: "OAuth" });

      const results = searchAll(db, "authentication");

      expect(results.fuda).toHaveLength(1);
      expect(results.ledger).toEqual([]);
    });

    test("returns only ledger when no fuda matches", () => {
      const fuda = createFuda(db, { title: "Task", description: "Desc" });
      addEntry(db, { fudaId: fuda.id, entryType: EntryType.HANDOFF, content: "Discovered critical bug" });

      const results = searchAll(db, "critical");

      expect(results.fuda).toEqual([]);
      expect(results.ledger).toHaveLength(1);
    });

    test("result structure has fuda and ledger arrays", () => {
      const results = searchAll(db, "anything");

      expect(results).toHaveProperty("fuda");
      expect(results).toHaveProperty("ledger");
      expect(Array.isArray(results.fuda)).toBe(true);
      expect(Array.isArray(results.ledger)).toBe(true);
    });
  });

  describe("FTS trigger sync - fuda", () => {
    test("inserted fuda is immediately searchable", () => {
      createFuda(db, { title: "Searchable task", description: "Find me" });

      const results = searchFuda(db, "Searchable");

      expect(results).toHaveLength(1);
    });

    test("updated fuda title is searchable with new value", () => {
      const fuda = createFuda(db, { title: "Original title", description: "Desc" });

      // Update the title directly via SQL (simulating updateFuda if it existed)
      db.run("UPDATE fuda SET title = ?, updated_at = datetime('now') WHERE id = ?", [
        "Updated searchable title",
        fuda.id,
      ]);

      const oldResults = searchFuda(db, "Original");
      const newResults = searchFuda(db, "Updated searchable");

      expect(oldResults).toEqual([]);
      expect(newResults).toHaveLength(1);
    });

    test("updated fuda description is searchable with new value", () => {
      const fuda = createFuda(db, { title: "Task", description: "Original description" });

      db.run("UPDATE fuda SET description = ?, updated_at = datetime('now') WHERE id = ?", [
        "New searchable description",
        fuda.id,
      ]);

      const oldResults = searchFuda(db, "Original description");
      const newResults = searchFuda(db, "New searchable");

      expect(oldResults).toEqual([]);
      expect(newResults).toHaveLength(1);
    });

    test("hard deleted fuda is removed from search index", () => {
      const fuda = createFuda(db, { title: "Delete me now", description: "Desc" });

      // Hard delete
      db.run("DELETE FROM fuda WHERE id = ?", [fuda.id]);

      const results = searchFuda(db, "Delete me now");

      expect(results).toEqual([]);
    });

    test("soft-deleted fuda is removed from search results", () => {
      const fuda = createFuda(db, { title: "Soft delete test", description: "Desc" });

      deleteFuda(db, fuda.id);

      const results = searchFuda(db, "Soft delete");

      expect(results).toEqual([]);
    });

    test("restored fuda becomes searchable again", () => {
      const fuda = createFuda(db, { title: "Restore me", description: "Desc" });
      deleteFuda(db, fuda.id);

      // Restore by clearing deleted_at
      db.run("UPDATE fuda SET deleted_at = NULL, deleted_by = NULL, delete_reason = NULL WHERE id = ?", [fuda.id]);

      const results = searchFuda(db, "Restore me");

      expect(results).toHaveLength(1);
    });
  });

  describe("FTS trigger sync - ledger", () => {
    test("inserted ledger entry is immediately searchable", () => {
      const fuda = createFuda(db, { title: "Task", description: "Desc" });
      addEntry(db, { fudaId: fuda.id, entryType: EntryType.HANDOFF, content: "Immediately searchable content" });

      const results = searchLedger(db, "Immediately searchable");

      expect(results).toHaveLength(1);
    });

    test("updated ledger entry is searchable with new value", () => {
      const fuda = createFuda(db, { title: "Task", description: "Desc" });
      const entry = addEntry(db, { fudaId: fuda.id, entryType: EntryType.LEARNING, content: "Original content" });

      // Update the content
      db.run("UPDATE fuda_ledger SET content = ? WHERE id = ?", ["Updated searchable content", entry.id]);

      const oldResults = searchLedger(db, "Original content");
      const newResults = searchLedger(db, "Updated searchable");

      expect(oldResults).toEqual([]);
      expect(newResults).toHaveLength(1);
    });

    test("deleted ledger entry is removed from search index", () => {
      const fuda = createFuda(db, { title: "Task", description: "Desc" });
      const entry = addEntry(db, { fudaId: fuda.id, entryType: EntryType.HANDOFF, content: "Delete this entry" });

      db.run("DELETE FROM fuda_ledger WHERE id = ?", [entry.id]);

      const results = searchLedger(db, "Delete this entry");

      expect(results).toEqual([]);
    });

    test("ledger entries are removed when parent fuda is hard deleted", () => {
      const fuda = createFuda(db, { title: "Parent task", description: "Desc" });
      addEntry(db, { fudaId: fuda.id, entryType: EntryType.HANDOFF, content: "Child entry to be orphaned" });

      // Hard delete parent (cascade should remove ledger entries and their FTS data)
      db.run("DELETE FROM fuda WHERE id = ?", [fuda.id]);

      const results = searchLedger(db, "Child entry");

      expect(results).toEqual([]);
    });
  });
});
