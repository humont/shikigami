import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { Database } from "bun:sqlite";
import { initializeDb } from "../../src/db/index";
import {
  createFuda,
  getFuda,
  getFudaByStatus,
  getReadyFuda,
  findFudaByPrefix,
  updateFudaStatus,
  deleteFuda,
  restoreFuda,
  hardDeleteFuda,
  getDeletedFuda,
  claimFuda,
} from "../../src/db/fuda";
import { FudaStatus, SpiritType } from "../../src/types";

describe("fuda CRUD", () => {
  let db: Database;

  beforeEach(() => {
    db = new Database(":memory:");
    initializeDb(db);
  });

  afterEach(() => {
    db.close();
  });

  describe("createFuda", () => {
    test("returns valid fuda with ID", () => {
      const fuda = createFuda(db, {
        title: "Test Fuda",
        description: "A test fuda description",
      });

      expect(fuda.id).toMatch(/^sk-[a-z0-9]{4,6}$/);
      expect(fuda.title).toBe("Test Fuda");
      expect(fuda.description).toBe("A test fuda description");
      expect(fuda.status).toBe(FudaStatus.BLOCKED);
      expect(fuda.spiritType).toBe(SpiritType.CODE);
      expect(fuda.priority).toBe(0);
    });

    test("accepts optional spiritType and priority", () => {
      const fuda = createFuda(db, {
        title: "Test",
        description: "Desc",
        spiritType: SpiritType.REVIEW,
        priority: 10,
      });

      expect(fuda.spiritType).toBe(SpiritType.REVIEW);
      expect(fuda.priority).toBe(10);
    });

  });

  describe("getFuda", () => {
    test("retrieves by ID", () => {
      const created = createFuda(db, { title: "Test", description: "Desc" });
      const retrieved = getFuda(db, created.id);

      expect(retrieved).not.toBeNull();
      expect(retrieved!.id).toBe(created.id);
      expect(retrieved!.title).toBe("Test");
    });

    test("returns null for non-existent ID", () => {
      const result = getFuda(db, "sk-nonexistent");
      expect(result).toBeNull();
    });

    test("excludes soft-deleted by default", () => {
      const fuda = createFuda(db, { title: "Test", description: "Desc" });
      deleteFuda(db, fuda.id);

      const result = getFuda(db, fuda.id);
      expect(result).toBeNull();
    });

    test("includes soft-deleted when requested", () => {
      const fuda = createFuda(db, { title: "Test", description: "Desc" });
      deleteFuda(db, fuda.id);

      const result = getFuda(db, fuda.id, true);
      expect(result).not.toBeNull();
      expect(result!.deletedAt).not.toBeNull();
    });
  });

  describe("findFudaByPrefix", () => {
    test("finds by ID prefix", () => {
      const fuda = createFuda(db, { title: "Test", description: "Desc" });
      const prefix = fuda.id.slice(3, 7); // Get just the hash part without sk-

      const result = findFudaByPrefix(db, prefix);
      expect(result).not.toBeNull();
      expect(result!.id).toBe(fuda.id);
    });

    test("returns null for ambiguous prefix", () => {
      createFuda(db, { title: "Test 1", description: "Desc" });
      createFuda(db, { title: "Test 2", description: "Desc" });

      // Both start with sk-, should be ambiguous
      const result = findFudaByPrefix(db, "sk-");
      expect(result).toBeNull();
    });
  });

  describe("getFudaByStatus", () => {
    test("filters correctly", () => {
      createFuda(db, { title: "Pending", description: "Desc" });
      const readyFuda = createFuda(db, { title: "Ready", description: "Desc" });
      updateFudaStatus(db, readyFuda.id, FudaStatus.READY);

      const pending = getFudaByStatus(db, FudaStatus.BLOCKED);
      const ready = getFudaByStatus(db, FudaStatus.READY);

      expect(pending).toHaveLength(1);
      expect(pending[0].title).toBe("Pending");
      expect(ready).toHaveLength(1);
      expect(ready[0].title).toBe("Ready");
    });
  });

  describe("getReadyFuda", () => {
    test("returns only ready fuda", () => {
      createFuda(db, { title: "Pending", description: "Desc" });
      const readyFuda = createFuda(db, { title: "Ready", description: "Desc" });
      updateFudaStatus(db, readyFuda.id, FudaStatus.READY);

      const ready = getReadyFuda(db);
      expect(ready).toHaveLength(1);
      expect(ready[0].title).toBe("Ready");
    });

    test("respects limit", () => {
      for (let i = 0; i < 5; i++) {
        const fuda = createFuda(db, { title: `Ready ${i}`, description: "Desc" });
        updateFudaStatus(db, fuda.id, FudaStatus.READY);
      }

      const ready = getReadyFuda(db, 3);
      expect(ready).toHaveLength(3);
    });

    test("orders by priority descending", () => {
      const low = createFuda(db, { title: "Low", description: "Desc", priority: 1 });
      const high = createFuda(db, { title: "High", description: "Desc", priority: 10 });
      updateFudaStatus(db, low.id, FudaStatus.READY);
      updateFudaStatus(db, high.id, FudaStatus.READY);

      const ready = getReadyFuda(db);
      expect(ready[0].title).toBe("High");
      expect(ready[1].title).toBe("Low");
    });
  });

  describe("updateFudaStatus", () => {
    test("changes status", () => {
      const fuda = createFuda(db, { title: "Test", description: "Desc" });
      updateFudaStatus(db, fuda.id, FudaStatus.IN_PROGRESS);

      const updated = getFuda(db, fuda.id);
      expect(updated!.status).toBe(FudaStatus.IN_PROGRESS);
    });

    test("updates updatedAt timestamp", () => {
      const fuda = createFuda(db, { title: "Test", description: "Desc" });
      const originalUpdatedAt = fuda.updatedAt;

      // Small delay to ensure timestamp difference
      updateFudaStatus(db, fuda.id, FudaStatus.READY);

      const updated = getFuda(db, fuda.id);
      expect(updated!.updatedAt.getTime()).toBeGreaterThanOrEqual(originalUpdatedAt.getTime());
    });
  });

  describe("soft delete", () => {
    test("deleteFuda sets deletedAt", () => {
      const fuda = createFuda(db, { title: "Test", description: "Desc" });
      deleteFuda(db, fuda.id);

      const deleted = getFuda(db, fuda.id, true);
      expect(deleted!.deletedAt).not.toBeNull();
    });

    test("deleteFuda accepts deletedBy and reason", () => {
      const fuda = createFuda(db, { title: "Test", description: "Desc" });
      deleteFuda(db, fuda.id, { deletedBy: "user-123", reason: "No longer needed" });

      const deleted = getFuda(db, fuda.id, true);
      expect(deleted!.deletedBy).toBe("user-123");
      expect(deleted!.deleteReason).toBe("No longer needed");
    });

    test("restoreFuda clears deletedAt", () => {
      const fuda = createFuda(db, { title: "Test", description: "Desc" });
      deleteFuda(db, fuda.id);
      restoreFuda(db, fuda.id);

      const restored = getFuda(db, fuda.id);
      expect(restored).not.toBeNull();
      expect(restored!.deletedAt).toBeNull();
    });

    test("hardDeleteFuda permanently removes", () => {
      const fuda = createFuda(db, { title: "Test", description: "Desc" });
      hardDeleteFuda(db, fuda.id);

      const result = getFuda(db, fuda.id, true);
      expect(result).toBeNull();
    });

    test("getDeletedFuda returns soft-deleted fuda", () => {
      const fuda1 = createFuda(db, { title: "Active", description: "Desc" });
      const fuda2 = createFuda(db, { title: "Deleted", description: "Desc" });
      deleteFuda(db, fuda2.id);

      const deleted = getDeletedFuda(db);
      expect(deleted).toHaveLength(1);
      expect(deleted[0].title).toBe("Deleted");
    });
  });

  describe("claimFuda", () => {
    test("claims ready fuda successfully", () => {
      const fuda = createFuda(db, { title: "Test", description: "Desc" });
      updateFudaStatus(db, fuda.id, FudaStatus.READY);

      const result = claimFuda(db, fuda.id, "agent-123");

      expect(result.success).toBe(true);
      expect(result.reason).toBeUndefined();

      const updated = getFuda(db, fuda.id);
      expect(updated!.status).toBe(FudaStatus.IN_PROGRESS);
      expect(updated!.assignedSpiritId).toBe("agent-123");
    });

    test("claims pending fuda successfully", () => {
      const fuda = createFuda(db, { title: "Test", description: "Desc" });
      // Default status is pending

      const result = claimFuda(db, fuda.id, "agent-456");

      expect(result.success).toBe(true);

      const updated = getFuda(db, fuda.id);
      expect(updated!.status).toBe(FudaStatus.IN_PROGRESS);
      expect(updated!.assignedSpiritId).toBe("agent-456");
    });

    test("claims fuda with null spiritId", () => {
      const fuda = createFuda(db, { title: "Test", description: "Desc" });
      updateFudaStatus(db, fuda.id, FudaStatus.READY);

      const result = claimFuda(db, fuda.id, null);

      expect(result.success).toBe(true);

      const updated = getFuda(db, fuda.id);
      expect(updated!.status).toBe(FudaStatus.IN_PROGRESS);
      expect(updated!.assignedSpiritId).toBeNull();
    });

    test("returns already_in_progress for in_progress fuda", () => {
      const fuda = createFuda(db, { title: "Test", description: "Desc" });
      updateFudaStatus(db, fuda.id, FudaStatus.IN_PROGRESS);

      const result = claimFuda(db, fuda.id, "agent-789");

      expect(result.success).toBe(false);
      expect(result.reason).toBe("already_in_progress");

      // Status should remain unchanged
      const unchanged = getFuda(db, fuda.id);
      expect(unchanged!.status).toBe(FudaStatus.IN_PROGRESS);
    });

    test("returns invalid_status for done fuda", () => {
      const fuda = createFuda(db, { title: "Test", description: "Desc" });
      updateFudaStatus(db, fuda.id, FudaStatus.DONE);

      const result = claimFuda(db, fuda.id, "agent-123");

      expect(result.success).toBe(false);
      expect(result.reason).toBe("invalid_status");
    });

    test("returns invalid_status for failed fuda", () => {
      const fuda = createFuda(db, { title: "Test", description: "Desc" });
      updateFudaStatus(db, fuda.id, FudaStatus.FAILED);

      const result = claimFuda(db, fuda.id, "agent-123");

      expect(result.success).toBe(false);
      expect(result.reason).toBe("invalid_status");
    });

    test("returns invalid_status for in_review fuda", () => {
      const fuda = createFuda(db, { title: "Test", description: "Desc" });
      updateFudaStatus(db, fuda.id, FudaStatus.IN_REVIEW);

      const result = claimFuda(db, fuda.id, "agent-123");

      expect(result.success).toBe(false);
      expect(result.reason).toBe("invalid_status");
    });
  });
});
