import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { resolve, join } from "node:path";
import { tmpdir } from "node:os";
import { Database } from "bun:sqlite";
import { initializeDb } from "../../src/db/index";
import { createFuda, getFuda } from "../../src/db/fuda";
import { runInit } from "../../src/cli/commands/init";
import { runShow } from "../../src/cli/commands/show";
import { runList } from "../../src/cli/commands/list";
import type { Fuda } from "../../src/types";

// These tests verify display_id removal. They are skipped until the implementation
// task (sk-suca) is complete. Remove .skip when implementing the removal.
describe.skip("displayId removal", () => {
  describe("Fuda type", () => {
    test("Fuda type should not have displayId property", () => {
      // Type-level check: if displayId exists on Fuda, this test documents that it should be removed
      // After removal, the 'displayId' key should not exist in the Fuda interface
      const fudaKeys: (keyof Fuda)[] = [
        "id",
        "prdId",
        "title",
        "description",
        "status",
        "spiritType",
        "assignedSpiritId",
        "outputCommitHash",
        "retryCount",
        "failureContext",
        "parentFudaId",
        "priority",
        "createdAt",
        "updatedAt",
        "deletedAt",
        "deletedBy",
        "deleteReason",
      ];

      // This checks that displayId is NOT in the expected keys
      expect(fudaKeys).not.toContain("displayId" as keyof Fuda);
    });

    test("created fuda should not have displayId field", () => {
      const db = new Database(":memory:");
      initializeDb(db);

      const fuda = createFuda(db, {
        title: "Test",
        description: "Test description",
        prdId: "prd-test",
      });

      // After removal, fuda objects should not have displayId property
      expect("displayId" in fuda).toBe(false);

      db.close();
    });

    test("retrieved fuda should not have displayId field", () => {
      const db = new Database(":memory:");
      initializeDb(db);

      const created = createFuda(db, {
        title: "Test",
        description: "Test description",
      });

      const retrieved = getFuda(db, created.id);
      expect(retrieved).not.toBeNull();
      expect("displayId" in retrieved!).toBe(false);

      db.close();
    });
  });

  describe("display-id.ts utils", () => {
    test("display-id.ts utility file should not exist", () => {
      const displayIdPath = resolve(__dirname, "../../src/utils/display-id.ts");
      expect(existsSync(displayIdPath)).toBe(false);
    });

    test("display-id.test.ts test file should not exist", () => {
      const displayIdTestPath = resolve(__dirname, "../utils/display-id.test.ts");
      expect(existsSync(displayIdTestPath)).toBe(false);
    });
  });

  describe("database schema", () => {
    test("fuda table should not have display_id column", () => {
      const db = new Database(":memory:");
      initializeDb(db);

      const tableInfo = db.prepare("PRAGMA table_info(fuda)").all() as Array<{
        name: string;
      }>;
      const columnNames = tableInfo.map((col) => col.name);

      expect(columnNames).not.toContain("display_id");

      db.close();
    });
  });

  describe("CLI commands", () => {
    let testDir: string;
    let db: Database;

    beforeEach(async () => {
      testDir = mkdtempSync(join(tmpdir(), "shiki-display-id-test-"));
      await runInit({ projectRoot: testDir });
      db = new Database(join(testDir, ".shikigami", "shiki.db"));
    });

    afterEach(() => {
      db.close();
      rmSync(testDir, { recursive: true, force: true });
    });

    test("show command should not return displayId in result", async () => {
      const fuda = createFuda(db, {
        title: "Test task",
        description: "Test description",
        prdId: "prd-test",
      });

      const result = await runShow({ id: fuda.id, projectRoot: testDir });

      expect(result.success).toBe(true);
      expect(result.fuda).toBeDefined();
      // displayId should not be present in the result
      expect("displayId" in result.fuda!).toBe(false);
    });

    test("show command JSON output should not contain displayId", async () => {
      const fuda = createFuda(db, {
        title: "Test task",
        description: "Test description",
        prdId: "prd-test",
      });

      const result = await runShow({ id: fuda.id, projectRoot: testDir });
      const json = JSON.stringify(result);

      // displayId should not appear anywhere in JSON output
      expect(json).not.toContain("displayId");
    });

    test("list command should not return displayId in result fudas", async () => {
      createFuda(db, {
        title: "Test task",
        description: "Test description",
        prdId: "prd-test",
      });

      const result = await runList({ projectRoot: testDir });

      expect(result.success).toBe(true);
      expect(result.fudas).toBeDefined();
      expect(result.fudas!.length).toBeGreaterThan(0);

      // No fuda should have displayId
      for (const fuda of result.fudas!) {
        expect("displayId" in fuda).toBe(false);
      }
    });

    test("list command JSON output should not contain displayId", async () => {
      createFuda(db, {
        title: "Test task",
        description: "Test description",
        prdId: "prd-test",
      });

      const result = await runList({ projectRoot: testDir });
      const json = JSON.stringify(result);

      // displayId should not appear anywhere in JSON output
      expect(json).not.toContain("displayId");
    });
  });
});
