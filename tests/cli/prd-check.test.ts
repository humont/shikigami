import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { Database } from "bun:sqlite";
import { runInit } from "../../src/cli/commands/init";
import { runPrdCheck } from "../../src/cli/commands/prd/check";
import { createFuda } from "../../src/db/fuda";

describe("prd check command", () => {
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

  describe("validation success", () => {
    test("returns success when no fuda exist", async () => {
      const result = await runPrdCheck({ projectRoot: testDir });

      expect(result.success).toBe(true);
      expect(result.exitCode).toBe(0);
      expect(result.orphans).toEqual([]);
    });

    test("returns success when all prd_ids reference existing PRD files", async () => {
      const prdsDir = join(testDir, ".shikigami", "prds");
      mkdirSync(prdsDir, { recursive: true });
      writeFileSync(join(prdsDir, "2025-01-01_feature.md"), "# Feature");

      createFuda(db, {
        title: "Task 1",
        description: "Task with valid PRD",
        prdId: "2025-01-01_feature",
      });

      const result = await runPrdCheck({ projectRoot: testDir });

      expect(result.success).toBe(true);
      expect(result.exitCode).toBe(0);
      expect(result.orphans).toEqual([]);
    });

    test("returns success when fuda have no prd_id", async () => {
      createFuda(db, {
        title: "Task without PRD",
        description: "No PRD reference",
      });

      const result = await runPrdCheck({ projectRoot: testDir });

      expect(result.success).toBe(true);
      expect(result.exitCode).toBe(0);
      expect(result.orphans).toEqual([]);
    });

    test("returns success with mix of valid and null prd_ids", async () => {
      const prdsDir = join(testDir, ".shikigami", "prds");
      mkdirSync(prdsDir, { recursive: true });
      writeFileSync(join(prdsDir, "2025-01-01_feature.md"), "# Feature");

      createFuda(db, {
        title: "Task with PRD",
        description: "Has valid PRD",
        prdId: "2025-01-01_feature",
      });
      createFuda(db, {
        title: "Task without PRD",
        description: "No PRD",
      });

      const result = await runPrdCheck({ projectRoot: testDir });

      expect(result.success).toBe(true);
      expect(result.exitCode).toBe(0);
    });
  });

  describe("validation failure (orphan prd_ids)", () => {
    test("returns failure when prd_id references non-existent PRD file", async () => {
      createFuda(db, {
        title: "Orphan task",
        description: "References missing PRD",
        prdId: "2025-01-01_missing-prd",
      });

      const result = await runPrdCheck({ projectRoot: testDir });

      expect(result.success).toBe(false);
      expect(result.exitCode).toBe(1);
      expect(result.orphans).toHaveLength(1);
      expect(result.orphans![0].prdId).toBe("2025-01-01_missing-prd");
    });

    test("returns failure with count of affected fuda per orphan prd_id", async () => {
      createFuda(db, {
        title: "Orphan 1",
        description: "First orphan",
        prdId: "missing-prd",
      });
      createFuda(db, {
        title: "Orphan 2",
        description: "Second orphan same PRD",
        prdId: "missing-prd",
      });

      const result = await runPrdCheck({ projectRoot: testDir });

      expect(result.success).toBe(false);
      expect(result.exitCode).toBe(1);
      expect(result.orphans![0].fudaCount).toBe(2);
    });

    test("groups and reports multiple orphan prd_ids", async () => {
      createFuda(db, {
        title: "Orphan A",
        description: "Missing PRD A",
        prdId: "missing-a",
      });
      createFuda(db, {
        title: "Orphan B",
        description: "Missing PRD B",
        prdId: "missing-b",
      });

      const result = await runPrdCheck({ projectRoot: testDir });

      expect(result.success).toBe(false);
      expect(result.exitCode).toBe(1);
      expect(result.orphans).toHaveLength(2);
      expect(result.orphans!.map((o: { prdId: string }) => o.prdId).sort()).toEqual([
        "missing-a",
        "missing-b",
      ]);
    });

    test("returns failure even if some prd_ids are valid", async () => {
      const prdsDir = join(testDir, ".shikigami", "prds");
      mkdirSync(prdsDir, { recursive: true });
      writeFileSync(join(prdsDir, "2025-01-01_valid.md"), "# Valid");

      createFuda(db, {
        title: "Valid task",
        description: "Has valid PRD",
        prdId: "2025-01-01_valid",
      });
      createFuda(db, {
        title: "Invalid task",
        description: "Has missing PRD",
        prdId: "2025-01-01_missing",
      });

      const result = await runPrdCheck({ projectRoot: testDir });

      expect(result.success).toBe(false);
      expect(result.exitCode).toBe(1);
      expect(result.orphans).toHaveLength(1);
      expect(result.orphans![0].prdId).toBe("2025-01-01_missing");
    });
  });

  describe("soft-deleted fuda handling", () => {
    test("ignores soft-deleted fuda with orphan prd_ids", async () => {
      const deletedFuda = createFuda(db, {
        title: "Deleted orphan",
        description: "Should not count",
        prdId: "missing-prd",
      });
      db.run("UPDATE fuda SET deleted_at = datetime('now') WHERE id = ?", [
        deletedFuda.id,
      ]);

      const result = await runPrdCheck({ projectRoot: testDir });

      expect(result.success).toBe(true);
      expect(result.exitCode).toBe(0);
      expect(result.orphans).toEqual([]);
    });

    test("only counts active fuda when reporting orphan counts", async () => {
      createFuda(db, {
        title: "Active orphan",
        description: "Should count",
        prdId: "missing-prd",
      });
      const deletedFuda = createFuda(db, {
        title: "Deleted orphan",
        description: "Should not count",
        prdId: "missing-prd",
      });
      db.run("UPDATE fuda SET deleted_at = datetime('now') WHERE id = ?", [
        deletedFuda.id,
      ]);

      const result = await runPrdCheck({ projectRoot: testDir });

      expect(result.success).toBe(false);
      expect(result.exitCode).toBe(1);
      expect(result.orphans![0].fudaCount).toBe(1);
    });
  });

  describe("error handling", () => {
    test("returns error when shiki not initialized", async () => {
      const uninitializedDir = mkdtempSync(join(tmpdir(), "shiki-uninit-"));

      try {
        const result = await runPrdCheck({ projectRoot: uninitializedDir });

        expect(result.success).toBe(false);
        expect(result.error).toContain("not initialized");
        expect(result.exitCode).toBe(1);
      } finally {
        rmSync(uninitializedDir, { recursive: true, force: true });
      }
    });
  });

  describe("CI suitability", () => {
    test("exitCode 0 means success (CI pass)", async () => {
      const result = await runPrdCheck({ projectRoot: testDir });

      expect(result.exitCode).toBe(0);
    });

    test("exitCode 1 means failure (CI fail)", async () => {
      createFuda(db, {
        title: "Orphan",
        description: "Missing PRD",
        prdId: "missing",
      });

      const result = await runPrdCheck({ projectRoot: testDir });

      expect(result.exitCode).toBe(1);
    });

    test("provides summary message for CI output", async () => {
      createFuda(db, {
        title: "Task 1",
        description: "Missing PRD",
        prdId: "missing-a",
      });
      createFuda(db, {
        title: "Task 2",
        description: "Also missing PRD",
        prdId: "missing-b",
      });

      const result = await runPrdCheck({ projectRoot: testDir });

      expect(result.message).toBeDefined();
      expect(result.message).toContain("2");
      expect(result.message).toMatch(/orphan|invalid|missing/i);
    });

    test("provides success message when valid", async () => {
      const result = await runPrdCheck({ projectRoot: testDir });

      expect(result.message).toBeDefined();
      expect(result.message).toMatch(/valid|ok|pass|success/i);
    });
  });

  describe("JSON output format", () => {
    test("returns JSON-serializable result", async () => {
      createFuda(db, {
        title: "Orphan",
        description: "Missing",
        prdId: "missing-prd",
      });

      const result = await runPrdCheck({ projectRoot: testDir });

      const json = JSON.stringify(result);
      expect(json).toBeDefined();

      const parsed = JSON.parse(json);
      expect(parsed.success).toBe(false);
      expect(parsed.exitCode).toBe(1);
      expect(Array.isArray(parsed.orphans)).toBe(true);
    });

    test("orphan objects contain prdId and fudaCount", async () => {
      createFuda(db, {
        title: "Orphan",
        description: "Missing",
        prdId: "missing-prd",
      });

      const result = await runPrdCheck({ projectRoot: testDir });
      const orphan = result.orphans![0];

      expect(orphan).toHaveProperty("prdId");
      expect(orphan).toHaveProperty("fudaCount");
    });
  });

  describe("sorting", () => {
    test("sorts orphans alphabetically by prdId", async () => {
      createFuda(db, {
        title: "C",
        description: "C",
        prdId: "prd-charlie",
      });
      createFuda(db, {
        title: "A",
        description: "A",
        prdId: "prd-alpha",
      });
      createFuda(db, {
        title: "B",
        description: "B",
        prdId: "prd-bravo",
      });

      const result = await runPrdCheck({ projectRoot: testDir });

      expect(result.orphans![0].prdId).toBe("prd-alpha");
      expect(result.orphans![1].prdId).toBe("prd-bravo");
      expect(result.orphans![2].prdId).toBe("prd-charlie");
    });
  });
});
