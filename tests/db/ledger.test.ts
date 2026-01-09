import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { Database } from "bun:sqlite";
import { initializeDb } from "../../src/db/index";
import {
  addEntry,
  getEntries,
  getEntriesByType,
  EntryType,
  type LedgerEntry,
} from "../../src/db/ledger";
import { createFuda } from "../../src/db/fuda";

describe("fuda_ledger", () => {
  let db: Database;

  beforeEach(() => {
    db = new Database(":memory:");
    initializeDb(db);
  });

  afterEach(() => {
    db.close();
  });

  describe("addEntry", () => {
    test("creates a handoff entry", () => {
      const fuda = createFuda(db, { title: "Test", description: "Desc" });

      const entry = addEntry(db, {
        fudaId: fuda.id,
        entryType: EntryType.HANDOFF,
        content: "Completed initial setup, passing to next agent",
      });

      expect(entry.id).toBeDefined();
      expect(entry.fudaId).toBe(fuda.id);
      expect(entry.entryType).toBe(EntryType.HANDOFF);
      expect(entry.content).toBe("Completed initial setup, passing to next agent");
      expect(entry.spiritId).toBeNull();
      expect(entry.createdAt).toBeInstanceOf(Date);
    });

    test("creates a learning entry", () => {
      const fuda = createFuda(db, { title: "Test", description: "Desc" });

      const entry = addEntry(db, {
        fudaId: fuda.id,
        entryType: EntryType.LEARNING,
        content: "Discovered that the API requires authentication",
      });

      expect(entry.entryType).toBe(EntryType.LEARNING);
      expect(entry.content).toBe("Discovered that the API requires authentication");
    });

    test("creates entry with spirit_id", () => {
      const fuda = createFuda(db, { title: "Test", description: "Desc" });

      const entry = addEntry(db, {
        fudaId: fuda.id,
        entryType: EntryType.HANDOFF,
        content: "Agent handoff note",
        spiritId: "agent-123",
      });

      expect(entry.spiritId).toBe("agent-123");
    });

    test("rejects invalid fuda_id", () => {
      expect(() =>
        addEntry(db, {
          fudaId: "sk-nonexistent",
          entryType: EntryType.HANDOFF,
          content: "This should fail",
        })
      ).toThrow();
    });

    test("rejects invalid entry_type", () => {
      const fuda = createFuda(db, { title: "Test", description: "Desc" });

      expect(() =>
        addEntry(db, {
          fudaId: fuda.id,
          entryType: "invalid" as EntryType,
          content: "This should fail",
        })
      ).toThrow();
    });

    test("includes timestamp on creation", () => {
      const fuda = createFuda(db, { title: "Test", description: "Desc" });
      const before = new Date(Date.now() - 1000);

      const entry = addEntry(db, {
        fudaId: fuda.id,
        entryType: EntryType.HANDOFF,
        content: "Test entry",
      });

      expect(entry.createdAt).toBeInstanceOf(Date);
      expect(entry.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
    });
  });

  describe("getEntries", () => {
    test("returns all entries for a fuda", () => {
      const fuda = createFuda(db, { title: "Test", description: "Desc" });

      addEntry(db, { fudaId: fuda.id, entryType: EntryType.HANDOFF, content: "Entry 1" });
      addEntry(db, { fudaId: fuda.id, entryType: EntryType.LEARNING, content: "Entry 2" });
      addEntry(db, { fudaId: fuda.id, entryType: EntryType.HANDOFF, content: "Entry 3" });

      const entries = getEntries(db, fuda.id);
      expect(entries).toHaveLength(3);
    });

    test("returns entries only for specified fuda", () => {
      const fuda1 = createFuda(db, { title: "Fuda 1", description: "Desc" });
      const fuda2 = createFuda(db, { title: "Fuda 2", description: "Desc" });

      addEntry(db, { fudaId: fuda1.id, entryType: EntryType.HANDOFF, content: "Fuda 1 entry" });
      addEntry(db, { fudaId: fuda2.id, entryType: EntryType.LEARNING, content: "Fuda 2 entry" });

      const entries = getEntries(db, fuda1.id);
      expect(entries).toHaveLength(1);
      expect(entries[0].fudaId).toBe(fuda1.id);
    });

    test("returns entries in chronological order (oldest first)", () => {
      const fuda = createFuda(db, { title: "Test", description: "Desc" });

      addEntry(db, { fudaId: fuda.id, entryType: EntryType.HANDOFF, content: "First" });
      addEntry(db, { fudaId: fuda.id, entryType: EntryType.LEARNING, content: "Second" });
      addEntry(db, { fudaId: fuda.id, entryType: EntryType.HANDOFF, content: "Third" });

      const entries = getEntries(db, fuda.id);
      expect(entries[0].content).toBe("First");
      expect(entries[1].content).toBe("Second");
      expect(entries[2].content).toBe("Third");
    });

    test("returns empty array for fuda with no entries", () => {
      const fuda = createFuda(db, { title: "Test", description: "Desc" });

      const entries = getEntries(db, fuda.id);
      expect(entries).toEqual([]);
    });

    test("returns empty array for non-existent fuda", () => {
      const entries = getEntries(db, "sk-nonexistent");
      expect(entries).toEqual([]);
    });
  });

  describe("getEntriesByType", () => {
    test("filters entries by handoff type", () => {
      const fuda = createFuda(db, { title: "Test", description: "Desc" });

      addEntry(db, { fudaId: fuda.id, entryType: EntryType.HANDOFF, content: "Handoff 1" });
      addEntry(db, { fudaId: fuda.id, entryType: EntryType.LEARNING, content: "Learning 1" });
      addEntry(db, { fudaId: fuda.id, entryType: EntryType.HANDOFF, content: "Handoff 2" });

      const entries = getEntriesByType(db, fuda.id, EntryType.HANDOFF);
      expect(entries).toHaveLength(2);
      expect(entries.every((e) => e.entryType === EntryType.HANDOFF)).toBe(true);
    });

    test("filters entries by learning type", () => {
      const fuda = createFuda(db, { title: "Test", description: "Desc" });

      addEntry(db, { fudaId: fuda.id, entryType: EntryType.HANDOFF, content: "Handoff 1" });
      addEntry(db, { fudaId: fuda.id, entryType: EntryType.LEARNING, content: "Learning 1" });
      addEntry(db, { fudaId: fuda.id, entryType: EntryType.LEARNING, content: "Learning 2" });

      const entries = getEntriesByType(db, fuda.id, EntryType.LEARNING);
      expect(entries).toHaveLength(2);
      expect(entries.every((e) => e.entryType === EntryType.LEARNING)).toBe(true);
    });

    test("returns entries in chronological order (oldest first)", () => {
      const fuda = createFuda(db, { title: "Test", description: "Desc" });

      addEntry(db, { fudaId: fuda.id, entryType: EntryType.HANDOFF, content: "First handoff" });
      addEntry(db, { fudaId: fuda.id, entryType: EntryType.LEARNING, content: "Learning" });
      addEntry(db, { fudaId: fuda.id, entryType: EntryType.HANDOFF, content: "Second handoff" });

      const entries = getEntriesByType(db, fuda.id, EntryType.HANDOFF);
      expect(entries[0].content).toBe("First handoff");
      expect(entries[1].content).toBe("Second handoff");
    });

    test("returns empty array when no entries of type exist", () => {
      const fuda = createFuda(db, { title: "Test", description: "Desc" });

      addEntry(db, { fudaId: fuda.id, entryType: EntryType.HANDOFF, content: "Only handoff" });

      const entries = getEntriesByType(db, fuda.id, EntryType.LEARNING);
      expect(entries).toEqual([]);
    });

    test("returns empty array for non-existent fuda", () => {
      const entries = getEntriesByType(db, "sk-nonexistent", EntryType.HANDOFF);
      expect(entries).toEqual([]);
    });
  });

  describe("entry ID", () => {
    test("each entry has unique ID", () => {
      const fuda = createFuda(db, { title: "Test", description: "Desc" });

      addEntry(db, { fudaId: fuda.id, entryType: EntryType.HANDOFF, content: "Entry 1" });
      addEntry(db, { fudaId: fuda.id, entryType: EntryType.LEARNING, content: "Entry 2" });

      const entries = getEntries(db, fuda.id);
      expect(entries[0].id).not.toBe(entries[1].id);
    });

    test("entry ID has expected format", () => {
      const fuda = createFuda(db, { title: "Test", description: "Desc" });

      const entry = addEntry(db, {
        fudaId: fuda.id,
        entryType: EntryType.HANDOFF,
        content: "Test",
      });

      // Entry IDs should follow the sk- prefix pattern like other IDs
      expect(entry.id).toMatch(/^sk-/);
    });
  });
});
