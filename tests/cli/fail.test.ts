import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { Database } from "bun:sqlite";
import { runInit } from "../../src/cli/commands/init";
import { runFail } from "../../src/cli/commands/fail";
import { createFuda, getFuda } from "../../src/db/fuda";
import { getEntries, EntryType } from "../../src/db/ledger";
import { FudaStatus } from "../../src/types";

describe("fail command", () => {
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

  describe("setting fuda status to failed", () => {
    test("sets fuda status to failed", async () => {
      const fuda = createFuda(db, {
        title: "Test task",
        description: "Test description",
      });

      const result = await runFail({
        projectRoot: testDir,
        id: fuda.id,
      });

      expect(result.success).toBe(true);
      expect(result.fuda).toBeDefined();
      expect(result.fuda!.status).toBe(FudaStatus.FAILED);

      // Verify in database
      const updated = getFuda(db, fuda.id);
      expect(updated!.status).toBe(FudaStatus.FAILED);
    });

    test("works with ID prefix matching", async () => {
      const fuda = createFuda(db, {
        title: "Test task",
        description: "Test description",
      });
      // Extract prefix without sk- (e.g., "sk-abc123" -> "abc1")
      const prefix = fuda.id.replace("sk-", "").substring(0, 4);

      const result = await runFail({
        projectRoot: testDir,
        id: prefix,
      });

      expect(result.success).toBe(true);
      expect(result.fuda!.id).toBe(fuda.id);
      expect(result.fuda!.status).toBe(FudaStatus.FAILED);
    });
  });

  describe("JSON output format", () => {
    test("returns proper JSON output", async () => {
      const fuda = createFuda(db, {
        title: "Test task",
        description: "Test description",
      });

      const result = await runFail({
        projectRoot: testDir,
        id: fuda.id,
      });

      // Should be JSON serializable
      const json = JSON.stringify(result);
      expect(json).toBeDefined();

      const parsed = JSON.parse(json);
      expect(parsed.success).toBe(true);
      expect(parsed.fuda).toBeDefined();
      expect(parsed.fuda.status).toBe(FudaStatus.FAILED);
    });
  });

  describe("error when fuda not found", () => {
    test("returns error when fuda does not exist", async () => {
      const result = await runFail({
        projectRoot: testDir,
        id: "[REDACTED:sk-secret]",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("not found");
    });

    test("returns error when prefix matches no fuda", async () => {
      const result = await runFail({
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
        const result = await runFail({
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

  describe("failure reason with --reason flag", () => {
    test("creates handoff ledger entry when --reason is provided", async () => {
      const fuda = createFuda(db, {
        title: "Test task",
        description: "Test description",
      });

      const result = await runFail({
        projectRoot: testDir,
        id: fuda.id,
        reason: "Blocked by external dependency issue",
      });

      expect(result.success).toBe(true);

      // Verify handoff entry was created
      const entries = getEntries(db, fuda.id);
      expect(entries).toHaveLength(1);
      expect(entries[0].entryType).toBe(EntryType.HANDOFF);
      expect(entries[0].content).toBe("Blocked by external dependency issue");
    });

    test("does not create ledger entry when --reason is not provided", async () => {
      const fuda = createFuda(db, {
        title: "Test task",
        description: "Test description",
      });

      const result = await runFail({
        projectRoot: testDir,
        id: fuda.id,
      });

      expect(result.success).toBe(true);

      // Verify no entries were created
      const entries = getEntries(db, fuda.id);
      expect(entries).toHaveLength(0);
    });

    test("created entry has entry_type=handoff", async () => {
      const fuda = createFuda(db, {
        title: "Test task",
        description: "Test description",
      });

      await runFail({
        projectRoot: testDir,
        id: fuda.id,
        reason: "API rate limit exceeded",
      });

      const entries = getEntries(db, fuda.id);
      expect(entries[0].entryType).toBe(EntryType.HANDOFF);
    });

    test("created entry is associated with the correct fuda", async () => {
      const fuda1 = createFuda(db, {
        title: "Task 1",
        description: "First task",
      });
      const fuda2 = createFuda(db, {
        title: "Task 2",
        description: "Second task",
      });

      await runFail({
        projectRoot: testDir,
        id: fuda1.id,
        reason: "Reason for task 1 failure",
      });

      // Entry should be on fuda1
      const entries1 = getEntries(db, fuda1.id);
      expect(entries1).toHaveLength(1);
      expect(entries1[0].content).toBe("Reason for task 1 failure");

      // No entry should be on fuda2
      const entries2 = getEntries(db, fuda2.id);
      expect(entries2).toHaveLength(0);
    });

    test("returns created entry in result", async () => {
      const fuda = createFuda(db, {
        title: "Test task",
        description: "Test description",
      });

      const result = await runFail({
        projectRoot: testDir,
        id: fuda.id,
        reason: "Result includes entry",
      });

      expect(result.success).toBe(true);
      expect(result.ledgerEntry).toBeDefined();
      expect(result.ledgerEntry!.entryType).toBe(EntryType.HANDOFF);
      expect(result.ledgerEntry!.content).toBe("Result includes entry");
    });
  });
});
