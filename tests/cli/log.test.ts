import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { Database } from "bun:sqlite";
import { runInit } from "../../src/cli/commands/init";
import { runLog, runLogAll } from "../../src/cli/commands/log";
import { createFuda, updateFudaStatus } from "../../src/db/fuda";
import { logAuditEntry, AuditOperation } from "../../src/db/audit";
import { FudaStatus } from "../../src/types";

describe("log command", () => {
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

  describe("viewing audit log", () => {
    test("returns audit entries for a fuda", async () => {
      const fuda = createFuda(db, {
        title: "Test task",
        description: "Test description",
      });
      // createFuda now automatically logs a CREATE entry

      const result = await runLog({ id: fuda.id, projectRoot: testDir });

      expect(result.success).toBe(true);
      expect(result.entries).toHaveLength(1);
      expect(result.entries![0].fudaId).toBe(fuda.id);
      expect(result.entries![0].operation).toBe(AuditOperation.CREATE);
    });

    test("returns multiple entries in chronological order (newest first)", async () => {
      const fuda = createFuda(db, {
        title: "Test task",
        description: "Test description",
      });
      // createFuda already logged CREATE
      logAuditEntry(db, {
        fudaId: fuda.id,
        operation: AuditOperation.UPDATE,
        field: "status",
        oldValue: "blocked",
        newValue: "in_progress",
        actor: "agent-123",
      });

      const result = await runLog({ id: fuda.id, projectRoot: testDir });

      expect(result.success).toBe(true);
      expect(result.entries).toHaveLength(2);
      expect(result.entries![0].operation).toBe(AuditOperation.UPDATE); // Most recent
      expect(result.entries![1].operation).toBe(AuditOperation.CREATE); // Oldest
    });

    test("returns create entry for fuda (automatic audit)", async () => {
      const fuda = createFuda(db, {
        title: "Test task",
        description: "Test description",
      });

      const result = await runLog({ id: fuda.id, projectRoot: testDir });

      expect(result.success).toBe(true);
      expect(result.entries).toHaveLength(1);
      expect(result.entries![0].operation).toBe(AuditOperation.CREATE);
    });

    test("finds fuda by prefix", async () => {
      const fuda = createFuda(db, {
        title: "Test task",
        description: "Test description",
      });
      // createFuda automatically logs CREATE

      // Use just the hash portion of the ID
      const prefix = fuda.id.slice(3, 7);
      const result = await runLog({ id: prefix, projectRoot: testDir });

      expect(result.success).toBe(true);
      expect(result.entries).toHaveLength(1);
    });

    test("returns error for non-existent fuda", async () => {
      const result = await runLog({ id: "sk-nonexistent", projectRoot: testDir });

      expect(result.success).toBe(false);
      expect(result.error).toContain("not found");
    });
  });

  describe("limit option", () => {
    test("respects limit parameter", async () => {
      const fuda = createFuda(db, {
        title: "Test task",
        description: "Test description",
      });
      for (let i = 0; i < 10; i++) {
        logAuditEntry(db, {
          fudaId: fuda.id,
          operation: AuditOperation.UPDATE,
          field: "status",
          oldValue: `${i}`,
          newValue: `${i + 1}`,
          actor: "cli",
        });
      }

      const result = await runLog({ id: fuda.id, projectRoot: testDir, limit: 5 });

      expect(result.success).toBe(true);
      expect(result.entries).toHaveLength(5);
    });
  });

  describe("error handling", () => {
    test("returns error when shiki not initialized", async () => {
      const uninitializedDir = mkdtempSync(join(tmpdir(), "shiki-uninit-"));

      try {
        const result = await runLog({ id: "sk-abc123", projectRoot: uninitializedDir });

        expect(result.success).toBe(false);
        expect(result.error).toContain("not initialized");
      } finally {
        rmSync(uninitializedDir, { recursive: true, force: true });
      }
    });
  });

  describe("viewing all audit logs (no id)", () => {
    test("returns all audit entries across all fudas", async () => {
      const fuda1 = createFuda(db, { title: "Task 1", description: "Desc" });
      const fuda2 = createFuda(db, { title: "Task 2", description: "Desc" });

      // createFuda now logs automatically (2 entries already)
      logAuditEntry(db, { fudaId: fuda1.id, operation: AuditOperation.UPDATE, field: "status", oldValue: "blocked", newValue: "ready", actor: "agent" });

      const result = await runLogAll({ projectRoot: testDir });

      expect(result.success).toBe(true);
      expect(result.entries).toHaveLength(3); // 2 creates + 1 update
    });

    test("returns entries in chronological order (newest first)", async () => {
      const fuda1 = createFuda(db, { title: "Task 1", description: "Desc" });
      const fuda2 = createFuda(db, { title: "Task 2", description: "Desc" });

      // createFuda now logs automatically (2 entries already)
      logAuditEntry(db, { fudaId: fuda1.id, operation: AuditOperation.UPDATE, field: "status", oldValue: "blocked", newValue: "ready", actor: "agent" });

      const result = await runLogAll({ projectRoot: testDir });

      expect(result.success).toBe(true);
      expect(result.entries![0].newValue).toBe("ready"); // Most recent
      expect(result.entries![2].operation).toBe(AuditOperation.CREATE); // Oldest
    });

    test("returns empty array when no audit entries exist", async () => {
      const result = await runLogAll({ projectRoot: testDir });

      expect(result.success).toBe(true);
      expect(result.entries).toEqual([]);
    });

    test("respects limit parameter", async () => {
      const fuda = createFuda(db, { title: "Task", description: "Desc" });

      for (let i = 0; i < 10; i++) {
        logAuditEntry(db, { fudaId: fuda.id, operation: AuditOperation.UPDATE, field: "status", oldValue: `${i}`, newValue: `${i + 1}`, actor: "cli" });
      }

      const result = await runLogAll({ projectRoot: testDir, limit: 5 });

      expect(result.success).toBe(true);
      expect(result.entries).toHaveLength(5);
    });

    test("returns error when shiki not initialized", async () => {
      const uninitializedDir = mkdtempSync(join(tmpdir(), "shiki-uninit-"));

      try {
        const result = await runLogAll({ projectRoot: uninitializedDir });

        expect(result.success).toBe(false);
        expect(result.error).toContain("not initialized");
      } finally {
        rmSync(uninitializedDir, { recursive: true, force: true });
      }
    });
  });

  describe("JSON output format", () => {
    test("returns JSON-serializable result", async () => {
      const fuda = createFuda(db, {
        title: "Test task",
        description: "Test description",
      });
      logAuditEntry(db, {
        fudaId: fuda.id,
        operation: AuditOperation.CREATE,
        actor: "cli",
      });

      const result = await runLog({ id: fuda.id, projectRoot: testDir });

      const json = JSON.stringify(result);
      expect(json).toBeDefined();

      const parsed = JSON.parse(json);
      expect(parsed.success).toBe(true);
      expect(Array.isArray(parsed.entries)).toBe(true);
    });

    test("audit entries contain all expected fields", async () => {
      const fuda = createFuda(db, {
        title: "Test task",
        description: "Test description",
      });
      logAuditEntry(db, {
        fudaId: fuda.id,
        operation: AuditOperation.UPDATE,
        field: "status",
        oldValue: "blocked",
        newValue: "ready",
        actor: "agent-123",
      });

      const result = await runLog({ id: fuda.id, projectRoot: testDir });
      const entry = result.entries![0];

      expect(entry).toHaveProperty("id");
      expect(entry).toHaveProperty("fudaId");
      expect(entry).toHaveProperty("operation");
      expect(entry).toHaveProperty("field");
      expect(entry).toHaveProperty("oldValue");
      expect(entry).toHaveProperty("newValue");
      expect(entry).toHaveProperty("actor");
      expect(entry).toHaveProperty("timestamp");
    });
  });
});
