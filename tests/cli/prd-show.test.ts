import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { Database } from "bun:sqlite";
import { runInit } from "../../src/cli/commands/init";
import { runPrdShow } from "../../src/cli/commands/prd/show";
import { createFuda, updateFudaStatus } from "../../src/db/fuda";
import { FudaStatus } from "../../src/types";

describe("prd show command", () => {
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

  describe("reading PRD content", () => {
    test("returns PRD file content when file exists", async () => {
      const prdsDir = join(testDir, ".shikigami", "prds");
      mkdirSync(prdsDir, { recursive: true });
      const prdContent = `# Auth Feature

## Overview

This is the auth feature PRD.

## Fuda

- [ ] Add login
- [ ] Add logout
`;
      writeFileSync(join(prdsDir, "2025-01-01_auth-feature.md"), prdContent);

      const result = await runPrdShow({
        id: "2025-01-01_auth-feature",
        projectRoot: testDir,
      });

      expect(result.success).toBe(true);
      expect(result.content).toBe(prdContent);
    });

    test("returns PRD path in result", async () => {
      const prdsDir = join(testDir, ".shikigami", "prds");
      mkdirSync(prdsDir, { recursive: true });
      writeFileSync(join(prdsDir, "2025-01-01_feature.md"), "# Feature");

      const result = await runPrdShow({
        id: "2025-01-01_feature",
        projectRoot: testDir,
      });

      expect(result.success).toBe(true);
      expect(result.path).toBe(".shikigami/prds/2025-01-01_feature.md");
    });

    test("returns prdId in result", async () => {
      const prdsDir = join(testDir, ".shikigami", "prds");
      mkdirSync(prdsDir, { recursive: true });
      writeFileSync(join(prdsDir, "2025-01-01_feature.md"), "# Feature");

      const result = await runPrdShow({
        id: "2025-01-01_feature",
        projectRoot: testDir,
      });

      expect(result.success).toBe(true);
      expect(result.prdId).toBe("2025-01-01_feature");
    });
  });

  describe("listing related fuda", () => {
    test("returns empty fuda array when no fuda reference the PRD", async () => {
      const prdsDir = join(testDir, ".shikigami", "prds");
      mkdirSync(prdsDir, { recursive: true });
      writeFileSync(join(prdsDir, "2025-01-01_feature.md"), "# Feature");

      const result = await runPrdShow({
        id: "2025-01-01_feature",
        projectRoot: testDir,
      });

      expect(result.success).toBe(true);
      expect(result.fuda).toEqual([]);
    });

    test("returns fuda that reference the PRD", async () => {
      const prdsDir = join(testDir, ".shikigami", "prds");
      mkdirSync(prdsDir, { recursive: true });
      writeFileSync(join(prdsDir, "2025-01-01_feature.md"), "# Feature");

      const fuda1 = createFuda(db, {
        title: "Task 1",
        description: "First task",
        prdId: "2025-01-01_feature",
      });
      const fuda2 = createFuda(db, {
        title: "Task 2",
        description: "Second task",
        prdId: "2025-01-01_feature",
      });

      const result = await runPrdShow({
        id: "2025-01-01_feature",
        projectRoot: testDir,
      });

      expect(result.success).toBe(true);
      expect(result.fuda).toHaveLength(2);
      expect(result.fuda!.map((f) => f.id)).toContain(fuda1.id);
      expect(result.fuda!.map((f) => f.id)).toContain(fuda2.id);
    });

    test("includes fuda status in response", async () => {
      const prdsDir = join(testDir, ".shikigami", "prds");
      mkdirSync(prdsDir, { recursive: true });
      writeFileSync(join(prdsDir, "2025-01-01_feature.md"), "# Feature");

      const fuda1 = createFuda(db, {
        title: "Blocked task",
        description: "First task",
        prdId: "2025-01-01_feature",
      });
      // fuda1 starts as blocked by default

      const fuda2 = createFuda(db, {
        title: "Done task",
        description: "Second task",
        prdId: "2025-01-01_feature",
      });
      updateFudaStatus(db, fuda2.id, FudaStatus.DONE);

      const result = await runPrdShow({
        id: "2025-01-01_feature",
        projectRoot: testDir,
      });

      expect(result.success).toBe(true);
      const blockedFuda = result.fuda!.find((f) => f.id === fuda1.id);
      const doneFuda = result.fuda!.find((f) => f.id === fuda2.id);

      expect(blockedFuda!.status).toBe(FudaStatus.BLOCKED);
      expect(doneFuda!.status).toBe(FudaStatus.DONE);
    });

    test("includes fuda title in response", async () => {
      const prdsDir = join(testDir, ".shikigami", "prds");
      mkdirSync(prdsDir, { recursive: true });
      writeFileSync(join(prdsDir, "2025-01-01_feature.md"), "# Feature");

      createFuda(db, {
        title: "Add login endpoint",
        description: "Task",
        prdId: "2025-01-01_feature",
      });

      const result = await runPrdShow({
        id: "2025-01-01_feature",
        projectRoot: testDir,
      });

      expect(result.success).toBe(true);
      expect(result.fuda![0].title).toBe("Add login endpoint");
    });

    test("excludes fuda from other PRDs", async () => {
      const prdsDir = join(testDir, ".shikigami", "prds");
      mkdirSync(prdsDir, { recursive: true });
      writeFileSync(join(prdsDir, "2025-01-01_feature-a.md"), "# Feature A");
      writeFileSync(join(prdsDir, "2025-01-02_feature-b.md"), "# Feature B");

      createFuda(db, {
        title: "Task A",
        description: "For feature A",
        prdId: "2025-01-01_feature-a",
      });
      createFuda(db, {
        title: "Task B",
        description: "For feature B",
        prdId: "2025-01-02_feature-b",
      });

      const result = await runPrdShow({
        id: "2025-01-01_feature-a",
        projectRoot: testDir,
      });

      expect(result.success).toBe(true);
      expect(result.fuda).toHaveLength(1);
      expect(result.fuda![0].title).toBe("Task A");
    });

    test("excludes soft-deleted fuda", async () => {
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
      db.run("UPDATE fuda SET deleted_at = datetime('now') WHERE id = ?", [
        deletedFuda.id,
      ]);

      const result = await runPrdShow({
        id: "2025-01-01_feature",
        projectRoot: testDir,
      });

      expect(result.success).toBe(true);
      expect(result.fuda).toHaveLength(1);
      expect(result.fuda![0].title).toBe("Active task");
    });
  });

  describe("orphan PRD references (file doesn't exist)", () => {
    test("returns success with warning when PRD file doesn't exist but fuda reference it", async () => {
      createFuda(db, {
        title: "Orphan task",
        description: "References missing PRD",
        prdId: "2025-01-01_missing-prd",
      });

      const result = await runPrdShow({
        id: "2025-01-01_missing-prd",
        projectRoot: testDir,
      });

      expect(result.success).toBe(true);
      expect(result.fileExists).toBe(false);
      expect(result.content).toBeUndefined();
    });

    test("still returns fuda when PRD file doesn't exist", async () => {
      const fuda = createFuda(db, {
        title: "Orphan task",
        description: "References missing PRD",
        prdId: "2025-01-01_missing-prd",
      });

      const result = await runPrdShow({
        id: "2025-01-01_missing-prd",
        projectRoot: testDir,
      });

      expect(result.success).toBe(true);
      expect(result.fuda).toHaveLength(1);
      expect(result.fuda![0].id).toBe(fuda.id);
    });

    test("returns path even when file doesn't exist", async () => {
      createFuda(db, {
        title: "Orphan task",
        description: "References missing PRD",
        prdId: "2025-01-01_missing-prd",
      });

      const result = await runPrdShow({
        id: "2025-01-01_missing-prd",
        projectRoot: testDir,
      });

      expect(result.success).toBe(true);
      expect(result.path).toBe(".shikigami/prds/2025-01-01_missing-prd.md");
    });
  });

  describe("error handling", () => {
    test("returns error when shiki not initialized", async () => {
      const uninitializedDir = mkdtempSync(join(tmpdir(), "shiki-uninit-"));

      try {
        const result = await runPrdShow({
          id: "2025-01-01_feature",
          projectRoot: uninitializedDir,
        });

        expect(result.success).toBe(false);
        expect(result.error).toContain("not initialized");
      } finally {
        rmSync(uninitializedDir, { recursive: true, force: true });
      }
    });

    test("returns error when PRD not found and no fuda reference it", async () => {
      const result = await runPrdShow({
        id: "nonexistent-prd",
        projectRoot: testDir,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("not found");
    });
  });

  describe("JSON output format", () => {
    test("returns JSON-serializable result", async () => {
      const prdsDir = join(testDir, ".shikigami", "prds");
      mkdirSync(prdsDir, { recursive: true });
      writeFileSync(join(prdsDir, "2025-01-01_feature.md"), "# Feature");

      createFuda(db, {
        title: "Task",
        description: "Test",
        prdId: "2025-01-01_feature",
      });

      const result = await runPrdShow({
        id: "2025-01-01_feature",
        projectRoot: testDir,
      });

      const json = JSON.stringify(result);
      expect(json).toBeDefined();

      const parsed = JSON.parse(json);
      expect(parsed.success).toBe(true);
    });

    test("result contains all expected fields for existing PRD", async () => {
      const prdsDir = join(testDir, ".shikigami", "prds");
      mkdirSync(prdsDir, { recursive: true });
      writeFileSync(join(prdsDir, "2025-01-01_feature.md"), "# Feature");

      createFuda(db, {
        title: "Task",
        description: "Test",
        prdId: "2025-01-01_feature",
      });

      const result = await runPrdShow({
        id: "2025-01-01_feature",
        projectRoot: testDir,
      });

      expect(result).toHaveProperty("success");
      expect(result).toHaveProperty("prdId");
      expect(result).toHaveProperty("path");
      expect(result).toHaveProperty("content");
      expect(result).toHaveProperty("fileExists");
      expect(result).toHaveProperty("fuda");
      expect(result.fileExists).toBe(true);
    });

    test("fuda objects contain id, title, and status", async () => {
      const prdsDir = join(testDir, ".shikigami", "prds");
      mkdirSync(prdsDir, { recursive: true });
      writeFileSync(join(prdsDir, "2025-01-01_feature.md"), "# Feature");

      createFuda(db, {
        title: "Task",
        description: "Test",
        prdId: "2025-01-01_feature",
      });

      const result = await runPrdShow({
        id: "2025-01-01_feature",
        projectRoot: testDir,
      });

      const fuda = result.fuda![0];
      expect(fuda).toHaveProperty("id");
      expect(fuda).toHaveProperty("title");
      expect(fuda).toHaveProperty("status");
    });
  });

  describe("prefix matching", () => {
    test("finds PRD by full id", async () => {
      const prdsDir = join(testDir, ".shikigami", "prds");
      mkdirSync(prdsDir, { recursive: true });
      writeFileSync(join(prdsDir, "2025-01-01_feature.md"), "# Feature");

      const result = await runPrdShow({
        id: "2025-01-01_feature",
        projectRoot: testDir,
      });

      expect(result.success).toBe(true);
      expect(result.prdId).toBe("2025-01-01_feature");
    });

    test("finds PRD by partial id prefix", async () => {
      const prdsDir = join(testDir, ".shikigami", "prds");
      mkdirSync(prdsDir, { recursive: true });
      writeFileSync(join(prdsDir, "2025-01-01_unique-feature.md"), "# Feature");

      const result = await runPrdShow({
        id: "2025-01-01_unique",
        projectRoot: testDir,
      });

      expect(result.success).toBe(true);
      expect(result.prdId).toBe("2025-01-01_unique-feature");
    });

    test("returns error when prefix matches multiple PRDs", async () => {
      const prdsDir = join(testDir, ".shikigami", "prds");
      mkdirSync(prdsDir, { recursive: true });
      writeFileSync(join(prdsDir, "2025-01-01_feature-a.md"), "# Feature A");
      writeFileSync(join(prdsDir, "2025-01-01_feature-b.md"), "# Feature B");

      const result = await runPrdShow({
        id: "2025-01-01_feature",
        projectRoot: testDir,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("multiple");
    });
  });
});
