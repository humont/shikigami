import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { Database } from "bun:sqlite";
import { runInit } from "../../src/cli/commands/init";
import { runPrdList } from "../../src/cli/commands/prd/list";
import { createFuda, updateFudaStatus } from "../../src/db/fuda";
import { FudaStatus } from "../../src/types";

describe("prd list command", () => {
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

  describe("listing PRD files", () => {
    test("returns empty array when no PRD files exist", async () => {
      const result = await runPrdList({ projectRoot: testDir });

      expect(result.success).toBe(true);
      expect(result.prds).toEqual([]);
    });

    test("lists PRD files from .shikigami/prds directory", async () => {
      const prdsDir = join(testDir, ".shikigami", "prds");
      mkdirSync(prdsDir, { recursive: true });
      writeFileSync(join(prdsDir, "2025-01-01_feature-a.md"), "# Feature A");
      writeFileSync(join(prdsDir, "2025-01-02_feature-b.md"), "# Feature B");

      const result = await runPrdList({ projectRoot: testDir });

      expect(result.success).toBe(true);
      expect(result.prds).toHaveLength(2);
      expect(result.prds!.map((p) => p.id)).toContain("2025-01-01_feature-a");
      expect(result.prds!.map((p) => p.id)).toContain("2025-01-02_feature-b");
    });

    test("only lists .md files", async () => {
      const prdsDir = join(testDir, ".shikigami", "prds");
      mkdirSync(prdsDir, { recursive: true });
      writeFileSync(join(prdsDir, "2025-01-01_feature.md"), "# Feature");
      writeFileSync(join(prdsDir, "2025-01-01_notes.txt"), "Notes");
      writeFileSync(join(prdsDir, "README"), "Readme");

      const result = await runPrdList({ projectRoot: testDir });

      expect(result.success).toBe(true);
      expect(result.prds).toHaveLength(1);
      expect(result.prds![0].id).toBe("2025-01-01_feature");
    });

    test("returns file path for each PRD", async () => {
      const prdsDir = join(testDir, ".shikigami", "prds");
      mkdirSync(prdsDir, { recursive: true });
      writeFileSync(join(prdsDir, "2025-01-01_feature.md"), "# Feature");

      const result = await runPrdList({ projectRoot: testDir });

      expect(result.success).toBe(true);
      expect(result.prds![0].path).toBe(".shikigami/prds/2025-01-01_feature.md");
    });
  });

  describe("fuda counts per PRD", () => {
    test("returns zero counts when PRD has no fuda", async () => {
      const prdsDir = join(testDir, ".shikigami", "prds");
      mkdirSync(prdsDir, { recursive: true });
      writeFileSync(join(prdsDir, "2025-01-01_feature.md"), "# Feature");

      const result = await runPrdList({ projectRoot: testDir });

      expect(result.success).toBe(true);
      expect(result.prds![0].fudaCount).toBe(0);
      expect(result.prds![0].statusBreakdown).toEqual({
        blocked: 0,
        ready: 0,
        in_progress: 0,
        in_review: 0,
        failed: 0,
        done: 0,
      });
    });

    test("returns fuda count for PRD", async () => {
      const prdsDir = join(testDir, ".shikigami", "prds");
      mkdirSync(prdsDir, { recursive: true });
      writeFileSync(join(prdsDir, "2025-01-01_feature.md"), "# Feature");

      createFuda(db, {
        title: "Task 1",
        description: "First task",
        prdId: "2025-01-01_feature",
      });
      createFuda(db, {
        title: "Task 2",
        description: "Second task",
        prdId: "2025-01-01_feature",
      });

      const result = await runPrdList({ projectRoot: testDir });

      expect(result.success).toBe(true);
      expect(result.prds![0].fudaCount).toBe(2);
    });

    test("returns status breakdown for PRD fuda", async () => {
      const prdsDir = join(testDir, ".shikigami", "prds");
      mkdirSync(prdsDir, { recursive: true });
      writeFileSync(join(prdsDir, "2025-01-01_feature.md"), "# Feature");

      const fuda1 = createFuda(db, {
        title: "Task 1",
        description: "Blocked task",
        prdId: "2025-01-01_feature",
      });
      // fuda1 starts as blocked by default

      const fuda2 = createFuda(db, {
        title: "Task 2",
        description: "Ready task",
        prdId: "2025-01-01_feature",
      });
      updateFudaStatus(db, fuda2.id, FudaStatus.READY);

      const fuda3 = createFuda(db, {
        title: "Task 3",
        description: "In progress task",
        prdId: "2025-01-01_feature",
      });
      updateFudaStatus(db, fuda3.id, FudaStatus.IN_PROGRESS);

      const fuda4 = createFuda(db, {
        title: "Task 4",
        description: "Done task",
        prdId: "2025-01-01_feature",
      });
      updateFudaStatus(db, fuda4.id, FudaStatus.DONE);

      const result = await runPrdList({ projectRoot: testDir });

      expect(result.success).toBe(true);
      expect(result.prds![0].fudaCount).toBe(4);
      expect(result.prds![0].statusBreakdown).toEqual({
        blocked: 1,
        ready: 1,
        in_progress: 1,
        in_review: 0,
        failed: 0,
        done: 1,
      });
    });

    test("counts fuda only for their respective PRDs", async () => {
      const prdsDir = join(testDir, ".shikigami", "prds");
      mkdirSync(prdsDir, { recursive: true });
      writeFileSync(join(prdsDir, "2025-01-01_feature-a.md"), "# Feature A");
      writeFileSync(join(prdsDir, "2025-01-02_feature-b.md"), "# Feature B");

      createFuda(db, {
        title: "Task A1",
        description: "First task for A",
        prdId: "2025-01-01_feature-a",
      });
      createFuda(db, {
        title: "Task A2",
        description: "Second task for A",
        prdId: "2025-01-01_feature-a",
      });
      createFuda(db, {
        title: "Task B1",
        description: "First task for B",
        prdId: "2025-01-02_feature-b",
      });

      const result = await runPrdList({ projectRoot: testDir });

      expect(result.success).toBe(true);
      const prdA = result.prds!.find((p) => p.id === "2025-01-01_feature-a");
      const prdB = result.prds!.find((p) => p.id === "2025-01-02_feature-b");

      expect(prdA!.fudaCount).toBe(2);
      expect(prdB!.fudaCount).toBe(1);
    });

    test("excludes soft-deleted fuda from counts", async () => {
      const prdsDir = join(testDir, ".shikigami", "prds");
      mkdirSync(prdsDir, { recursive: true });
      writeFileSync(join(prdsDir, "2025-01-01_feature.md"), "# Feature");

      createFuda(db, {
        title: "Active task",
        description: "Still active",
        prdId: "2025-01-01_feature",
      });
      const deletedFuda = createFuda(db, {
        title: "Deleted task",
        description: "Soft deleted",
        prdId: "2025-01-01_feature",
      });
      db.run(
        "UPDATE fuda SET deleted_at = datetime('now') WHERE id = ?",
        [deletedFuda.id]
      );

      const result = await runPrdList({ projectRoot: testDir });

      expect(result.success).toBe(true);
      expect(result.prds![0].fudaCount).toBe(1);
    });
  });

  describe("orphan PRD references", () => {
    test("returns empty orphans array when all prd_ids reference existing files", async () => {
      const prdsDir = join(testDir, ".shikigami", "prds");
      mkdirSync(prdsDir, { recursive: true });
      writeFileSync(join(prdsDir, "2025-01-01_feature.md"), "# Feature");

      createFuda(db, {
        title: "Task",
        description: "With valid PRD",
        prdId: "2025-01-01_feature",
      });

      const result = await runPrdList({ projectRoot: testDir });

      expect(result.success).toBe(true);
      expect(result.orphans).toEqual([]);
    });

    test("returns orphan prd_ids that reference non-existent PRD files", async () => {
      createFuda(db, {
        title: "Orphan task",
        description: "References missing PRD",
        prdId: "2025-01-01_missing-prd",
      });

      const result = await runPrdList({ projectRoot: testDir });

      expect(result.success).toBe(true);
      expect(result.orphans).toHaveLength(1);
      expect(result.orphans![0].prdId).toBe("2025-01-01_missing-prd");
    });

    test("includes fuda count for orphan prd_ids", async () => {
      createFuda(db, {
        title: "Orphan task 1",
        description: "First orphan",
        prdId: "2025-01-01_missing-prd",
      });
      createFuda(db, {
        title: "Orphan task 2",
        description: "Second orphan",
        prdId: "2025-01-01_missing-prd",
      });

      const result = await runPrdList({ projectRoot: testDir });

      expect(result.success).toBe(true);
      expect(result.orphans![0].fudaCount).toBe(2);
    });

    test("groups orphan fuda by prd_id", async () => {
      createFuda(db, {
        title: "Orphan A",
        description: "Missing PRD A",
        prdId: "missing-prd-a",
      });
      createFuda(db, {
        title: "Orphan B",
        description: "Missing PRD B",
        prdId: "missing-prd-b",
      });

      const result = await runPrdList({ projectRoot: testDir });

      expect(result.success).toBe(true);
      expect(result.orphans).toHaveLength(2);
      expect(result.orphans!.map((o) => o.prdId)).toContain("missing-prd-a");
      expect(result.orphans!.map((o) => o.prdId)).toContain("missing-prd-b");
    });

    test("excludes soft-deleted fuda from orphan counts", async () => {
      createFuda(db, {
        title: "Active orphan",
        description: "Still counts",
        prdId: "missing-prd",
      });
      const deletedFuda = createFuda(db, {
        title: "Deleted orphan",
        description: "Should not count",
        prdId: "missing-prd",
      });
      db.run(
        "UPDATE fuda SET deleted_at = datetime('now') WHERE id = ?",
        [deletedFuda.id]
      );

      const result = await runPrdList({ projectRoot: testDir });

      expect(result.success).toBe(true);
      expect(result.orphans![0].fudaCount).toBe(1);
    });

    test("does not include orphans when all orphan fuda are soft-deleted", async () => {
      const deletedFuda = createFuda(db, {
        title: "Deleted orphan",
        description: "Should not count",
        prdId: "missing-prd",
      });
      db.run(
        "UPDATE fuda SET deleted_at = datetime('now') WHERE id = ?",
        [deletedFuda.id]
      );

      const result = await runPrdList({ projectRoot: testDir });

      expect(result.success).toBe(true);
      expect(result.orphans).toEqual([]);
    });

    test("does not list fuda with null prd_id as orphans", async () => {
      createFuda(db, {
        title: "No PRD task",
        description: "Has no PRD reference",
      });

      const result = await runPrdList({ projectRoot: testDir });

      expect(result.success).toBe(true);
      expect(result.orphans).toEqual([]);
    });
  });

  describe("error handling", () => {
    test("returns error when shiki not initialized", async () => {
      const uninitializedDir = mkdtempSync(join(tmpdir(), "shiki-uninit-"));

      try {
        const result = await runPrdList({ projectRoot: uninitializedDir });

        expect(result.success).toBe(false);
        expect(result.error).toContain("not initialized");
      } finally {
        rmSync(uninitializedDir, { recursive: true, force: true });
      }
    });
  });

  describe("JSON output format", () => {
    test("returns JSON-serializable result", async () => {
      const prdsDir = join(testDir, ".shikigami", "prds");
      mkdirSync(prdsDir, { recursive: true });
      writeFileSync(join(prdsDir, "2025-01-01_feature.md"), "# Feature");

      const result = await runPrdList({ projectRoot: testDir });

      const json = JSON.stringify(result);
      expect(json).toBeDefined();

      const parsed = JSON.parse(json);
      expect(parsed.success).toBe(true);
      expect(Array.isArray(parsed.prds)).toBe(true);
    });

    test("PRD objects contain all expected fields", async () => {
      const prdsDir = join(testDir, ".shikigami", "prds");
      mkdirSync(prdsDir, { recursive: true });
      writeFileSync(join(prdsDir, "2025-01-01_feature.md"), "# Feature");

      createFuda(db, {
        title: "Task",
        description: "Test",
        prdId: "2025-01-01_feature",
      });

      const result = await runPrdList({ projectRoot: testDir });
      const prd = result.prds![0];

      expect(prd).toHaveProperty("id");
      expect(prd).toHaveProperty("path");
      expect(prd).toHaveProperty("fudaCount");
      expect(prd).toHaveProperty("statusBreakdown");
    });

    test("orphan objects contain expected fields", async () => {
      createFuda(db, {
        title: "Orphan task",
        description: "Missing PRD",
        prdId: "missing-prd",
      });

      const result = await runPrdList({ projectRoot: testDir });
      const orphan = result.orphans![0];

      expect(orphan).toHaveProperty("prdId");
      expect(orphan).toHaveProperty("fudaCount");
    });
  });

  describe("sorting", () => {
    test("sorts PRDs alphabetically by id", async () => {
      const prdsDir = join(testDir, ".shikigami", "prds");
      mkdirSync(prdsDir, { recursive: true });
      writeFileSync(join(prdsDir, "2025-01-03_feature-c.md"), "# C");
      writeFileSync(join(prdsDir, "2025-01-01_feature-a.md"), "# A");
      writeFileSync(join(prdsDir, "2025-01-02_feature-b.md"), "# B");

      const result = await runPrdList({ projectRoot: testDir });

      expect(result.success).toBe(true);
      expect(result.prds![0].id).toBe("2025-01-01_feature-a");
      expect(result.prds![1].id).toBe("2025-01-02_feature-b");
      expect(result.prds![2].id).toBe("2025-01-03_feature-c");
    });

    test("sorts orphans alphabetically by prdId", async () => {
      createFuda(db, {
        title: "Orphan C",
        description: "C",
        prdId: "missing-prd-c",
      });
      createFuda(db, {
        title: "Orphan A",
        description: "A",
        prdId: "missing-prd-a",
      });
      createFuda(db, {
        title: "Orphan B",
        description: "B",
        prdId: "missing-prd-b",
      });

      const result = await runPrdList({ projectRoot: testDir });

      expect(result.success).toBe(true);
      expect(result.orphans![0].prdId).toBe("missing-prd-a");
      expect(result.orphans![1].prdId).toBe("missing-prd-b");
      expect(result.orphans![2].prdId).toBe("missing-prd-c");
    });
  });
});
