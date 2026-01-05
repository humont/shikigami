import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { Database } from "bun:sqlite";
import { runInit } from "../../src/cli/commands/init";
import { runStart } from "../../src/cli/commands/start";
import { createFuda, getFuda, updateFudaStatus } from "../../src/db/fuda";
import { FudaStatus } from "../../src/types";

describe("start command", () => {
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

  describe("setting fuda status to in_progress", () => {
    test("sets fuda status to in_progress", async () => {
      const fuda = createFuda(db, {
        title: "Test task",
        description: "Test description",
      });

      const result = await runStart({
        projectRoot: testDir,
        id: fuda.id,
      });

      expect(result.success).toBe(true);
      expect(result.fuda).toBeDefined();
      expect(result.fuda!.status).toBe(FudaStatus.IN_PROGRESS);

      // Verify in database
      const updated = getFuda(db, fuda.id);
      expect(updated!.status).toBe(FudaStatus.IN_PROGRESS);
    });

    test("works with ID prefix matching", async () => {
      const fuda = createFuda(db, {
        title: "Test task",
        description: "Test description",
      });
      // Extract prefix without sk- (e.g., "sk-abc123" -> "abc1")
      const prefix = fuda.id.replace("sk-", "").substring(0, 4);

      const result = await runStart({
        projectRoot: testDir,
        id: prefix,
      });

      expect(result.success).toBe(true);
      expect(result.fuda!.id).toBe(fuda.id);
      expect(result.fuda!.status).toBe(FudaStatus.IN_PROGRESS);
    });
  });

  describe("assigned-spirit-id flag", () => {
    test("supports --assigned-spirit-id flag", async () => {
      const fuda = createFuda(db, {
        title: "Test task",
        description: "Test description",
      });

      const result = await runStart({
        projectRoot: testDir,
        id: fuda.id,
        assignedSpiritId: "agent-123",
      });

      expect(result.success).toBe(true);
      expect(result.fuda!.status).toBe(FudaStatus.IN_PROGRESS);
      expect(result.fuda!.assignedSpiritId).toBe("agent-123");

      // Verify in database
      const updated = getFuda(db, fuda.id);
      expect(updated!.assignedSpiritId).toBe("agent-123");
    });
  });

  describe("JSON output format", () => {
    test("returns proper JSON output", async () => {
      const fuda = createFuda(db, {
        title: "Test task",
        description: "Test description",
      });

      const result = await runStart({
        projectRoot: testDir,
        id: fuda.id,
      });

      // Should be JSON serializable
      const json = JSON.stringify(result);
      expect(json).toBeDefined();

      const parsed = JSON.parse(json);
      expect(parsed.success).toBe(true);
      expect(parsed.fuda).toBeDefined();
      expect(parsed.fuda.status).toBe(FudaStatus.IN_PROGRESS);
    });
  });

  describe("error when fuda not found", () => {
    test("returns error when fuda does not exist", async () => {
      const result = await runStart({
        projectRoot: testDir,
        id: "[REDACTED:sk-secret]",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("not found");
    });

    test("returns error when prefix matches no fuda", async () => {
      const result = await runStart({
        projectRoot: testDir,
        id: "xyz",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("not found");
    });
  });

  describe("error when shiki not initialized", () => {
    test("returns error when shiki not initialized", async () => {
      const uninitializedDir = mkdtempSync(join(tmpdir(), "shiki-uninit-"));

      try {
        const result = await runStart({
          projectRoot: uninitializedDir,
          id: "sk-test",
        });

        expect(result.success).toBe(false);
        expect(result.error).toContain("not initialized");
      } finally {
        rmSync(uninitializedDir, { recursive: true, force: true });
      }
    });
  });

  describe("claim protection", () => {
    test("fails when fuda is already in_progress", async () => {
      const fuda = createFuda(db, {
        title: "Test task",
        description: "Test description",
      });
      updateFudaStatus(db, fuda.id, FudaStatus.IN_PROGRESS);

      const result = await runStart({
        projectRoot: testDir,
        id: fuda.id,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("already being worked on");
    });

    test("fails when fuda status is done", async () => {
      const fuda = createFuda(db, {
        title: "Test task",
        description: "Test description",
      });
      updateFudaStatus(db, fuda.id, FudaStatus.DONE);

      const result = await runStart({
        projectRoot: testDir,
        id: fuda.id,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Cannot start fuda");
      expect(result.error).toContain("done");
    });

    test("fails when fuda status is failed", async () => {
      const fuda = createFuda(db, {
        title: "Test task",
        description: "Test description",
      });
      updateFudaStatus(db, fuda.id, FudaStatus.FAILED);

      const result = await runStart({
        projectRoot: testDir,
        id: fuda.id,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Cannot start fuda");
      expect(result.error).toContain("failed");
    });

    test("error message hints to find other work", async () => {
      const fuda = createFuda(db, {
        title: "Test task",
        description: "Test description",
      });
      updateFudaStatus(db, fuda.id, FudaStatus.IN_PROGRESS);

      const result = await runStart({
        projectRoot: testDir,
        id: fuda.id,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("shiki list --status ready");
    });
  });
});
