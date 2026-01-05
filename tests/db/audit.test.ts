import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { Database } from "bun:sqlite";
import { initializeDb } from "../../src/db/index";
import {
  logAuditEntry,
  getAuditLog,
  getAllAuditLog,
  AuditOperation,
  type AuditEntry,
} from "../../src/db/audit";
import { createFuda } from "../../src/db/fuda";

describe("audit log", () => {
  let db: Database;

  beforeEach(() => {
    db = new Database(":memory:");
    initializeDb(db);
  });

  afterEach(() => {
    db.close();
  });

  describe("logAuditEntry", () => {
    test("logs a create operation", () => {
      const fuda = createFuda(db, { title: "Test", description: "Desc" });

      // createFuda now automatically logs a create entry, so we have 1 already
      const logs = getAuditLog(db, fuda.id);
      expect(logs).toHaveLength(1);
      expect(logs[0].fudaId).toBe(fuda.id);
      expect(logs[0].operation).toBe(AuditOperation.CREATE);
      expect(logs[0].actor).toBe("unknown"); // default actor
    });

    test("logs an update operation with field changes", () => {
      const fuda = createFuda(db, { title: "Test", description: "Desc" });

      logAuditEntry(db, {
        fudaId: fuda.id,
        operation: AuditOperation.UPDATE,
        field: "status",
        oldValue: "pending",
        newValue: "in_progress",
        actor: "agent-123",
      });

      const logs = getAuditLog(db, fuda.id);
      expect(logs).toHaveLength(2); // 1 from create + 1 from update
      expect(logs[0].field).toBe("status");
      expect(logs[0].oldValue).toBe("pending");
      expect(logs[0].newValue).toBe("in_progress");
      expect(logs[0].actor).toBe("agent-123");
    });

    test("logs a delete operation", () => {
      const fuda = createFuda(db, { title: "Test", description: "Desc" });

      logAuditEntry(db, {
        fudaId: fuda.id,
        operation: AuditOperation.DELETE,
        actor: "user-456",
      });

      const logs = getAuditLog(db, fuda.id);
      expect(logs).toHaveLength(2); // 1 from create + 1 from delete
      expect(logs[0].operation).toBe(AuditOperation.DELETE);
    });

    test("includes timestamp", () => {
      const fuda = createFuda(db, { title: "Test", description: "Desc" });
      // SQLite datetime('now') has second precision, so allow 1 second tolerance
      const before = new Date(Date.now() - 1000);

      logAuditEntry(db, {
        fudaId: fuda.id,
        operation: AuditOperation.CREATE,
        actor: "cli",
      });

      const logs = getAuditLog(db, fuda.id);
      expect(logs[0].timestamp).toBeInstanceOf(Date);
      expect(logs[0].timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime());
    });
  });

  describe("getAuditLog", () => {
    test("returns entries for specific fuda", () => {
      const fuda1 = createFuda(db, { title: "Fuda 1", description: "Desc" });
      const fuda2 = createFuda(db, { title: "Fuda 2", description: "Desc" });

      // Each createFuda now logs automatically, so no need to manually log

      const logs = getAuditLog(db, fuda1.id);
      expect(logs).toHaveLength(1); // 1 from createFuda
      expect(logs[0].fudaId).toBe(fuda1.id);
    });

    test("returns entries in chronological order (newest first)", () => {
      const fuda = createFuda(db, { title: "Test", description: "Desc" });

      // createFuda already logged a CREATE, now add more entries
      logAuditEntry(db, { fudaId: fuda.id, operation: AuditOperation.UPDATE, field: "status", oldValue: "pending", newValue: "ready", actor: "cli" });
      logAuditEntry(db, { fudaId: fuda.id, operation: AuditOperation.UPDATE, field: "status", oldValue: "ready", newValue: "in_progress", actor: "agent" });

      const logs = getAuditLog(db, fuda.id);
      expect(logs).toHaveLength(3); // 1 from create + 2 updates
      expect(logs[0].newValue).toBe("in_progress"); // Most recent first
      expect(logs[2].operation).toBe(AuditOperation.CREATE); // Oldest last
    });

    test("respects limit parameter", () => {
      const fuda = createFuda(db, { title: "Test", description: "Desc" });

      for (let i = 0; i < 10; i++) {
        logAuditEntry(db, { fudaId: fuda.id, operation: AuditOperation.UPDATE, field: "status", oldValue: `${i}`, newValue: `${i + 1}`, actor: "cli" });
      }

      const logs = getAuditLog(db, fuda.id, { limit: 5 });
      expect(logs).toHaveLength(5);
    });

    test("returns empty array for fuda with no logs", () => {
      const logs = getAuditLog(db, "sk-nonexistent");
      expect(logs).toEqual([]);
    });
  });

  describe("audit entry ID", () => {
    test("each entry has unique ID", () => {
      const fuda = createFuda(db, { title: "Test", description: "Desc" });

      logAuditEntry(db, { fudaId: fuda.id, operation: AuditOperation.CREATE, actor: "cli" });
      logAuditEntry(db, { fudaId: fuda.id, operation: AuditOperation.UPDATE, field: "status", oldValue: "pending", newValue: "ready", actor: "cli" });

      const logs = getAuditLog(db, fuda.id);
      expect(logs[0].id).not.toBe(logs[1].id);
      expect(logs[0].id).toMatch(/^\d+$/); // Auto-incrementing integer
    });
  });

  describe("getAllAuditLog", () => {
    test("returns all audit entries across all fudas", () => {
      const fuda1 = createFuda(db, { title: "Fuda 1", description: "Desc" });
      const fuda2 = createFuda(db, { title: "Fuda 2", description: "Desc" });

      // createFuda now logs automatically (2 entries)
      logAuditEntry(db, { fudaId: fuda1.id, operation: AuditOperation.UPDATE, field: "status", oldValue: "pending", newValue: "ready", actor: "agent" });

      const logs = getAllAuditLog(db);
      expect(logs).toHaveLength(3); // 2 creates + 1 update
    });

    test("returns entries in chronological order (newest first)", () => {
      const fuda1 = createFuda(db, { title: "Fuda 1", description: "Desc" });
      const fuda2 = createFuda(db, { title: "Fuda 2", description: "Desc" });

      // createFuda logs automatically (2 entries already)
      logAuditEntry(db, { fudaId: fuda1.id, operation: AuditOperation.UPDATE, field: "status", oldValue: "pending", newValue: "ready", actor: "agent" });

      const logs = getAllAuditLog(db);
      expect(logs[0].newValue).toBe("ready"); // Most recent
      expect(logs[2].fudaId).toBe(fuda1.id); // First entry was fuda1 create
      expect(logs[2].operation).toBe(AuditOperation.CREATE);
    });

    test("respects limit parameter", () => {
      const fuda = createFuda(db, { title: "Test", description: "Desc" });

      for (let i = 0; i < 10; i++) {
        logAuditEntry(db, { fudaId: fuda.id, operation: AuditOperation.UPDATE, field: "status", oldValue: `${i}`, newValue: `${i + 1}`, actor: "cli" });
      }

      const logs = getAllAuditLog(db, { limit: 5 });
      expect(logs).toHaveLength(5);
    });

    test("returns empty array when no audit entries exist", () => {
      const logs = getAllAuditLog(db);
      expect(logs).toEqual([]);
    });
  });

  describe("default actor", () => {
    test("uses 'unknown' as default actor when not provided", () => {
      const fuda = createFuda(db, { title: "Test", description: "Desc" });

      // createFuda already logged with default actor
      const logs = getAuditLog(db, fuda.id);
      expect(logs).toHaveLength(1);
      expect(logs[0].actor).toBe("unknown");
    });

    test("uses provided actor when specified", () => {
      const fuda = createFuda(db, { title: "Test", description: "Desc" }, "my-agent");

      const logs = getAuditLog(db, fuda.id);
      expect(logs).toHaveLength(1);
      expect(logs[0].actor).toBe("my-agent");
    });
  });
});
