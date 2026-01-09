import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { Database } from "bun:sqlite";
import { runInit } from "../../src/cli/commands/init";
import { runStart } from "../../src/cli/commands/start";
import { createFuda, getFuda, updateFudaStatus } from "../../src/db/fuda";
import { addEntry, EntryType } from "../../src/db/ledger";
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

  describe("ledger context in JSON output", () => {
    test("output includes context.handoffs array", async () => {
      const fuda = createFuda(db, {
        title: "Test task",
        description: "Test description",
      });

      const result = await runStart({
        projectRoot: testDir,
        id: fuda.id,
      });

      expect(result.success).toBe(true);
      expect(result.context).toBeDefined();
      expect(result.context!.handoffs).toBeDefined();
      expect(Array.isArray(result.context!.handoffs)).toBe(true);
    });

    test("output includes context.learnings array", async () => {
      const fuda = createFuda(db, {
        title: "Test task",
        description: "Test description",
      });

      const result = await runStart({
        projectRoot: testDir,
        id: fuda.id,
      });

      expect(result.success).toBe(true);
      expect(result.context).toBeDefined();
      expect(result.context!.learnings).toBeDefined();
      expect(Array.isArray(result.context!.learnings)).toBe(true);
    });

    test("handoffs array contains all handoff entries for the fuda", async () => {
      const fuda = createFuda(db, {
        title: "Test task",
        description: "Test description",
      });

      addEntry(db, {
        fudaId: fuda.id,
        entryType: EntryType.HANDOFF,
        content: "First handoff note",
        spiritId: "agent-1",
      });
      addEntry(db, {
        fudaId: fuda.id,
        entryType: EntryType.HANDOFF,
        content: "Second handoff note",
        spiritId: "agent-2",
      });

      const result = await runStart({
        projectRoot: testDir,
        id: fuda.id,
      });

      expect(result.success).toBe(true);
      expect(result.context!.handoffs).toHaveLength(2);
      expect(result.context!.handoffs[0].content).toBe("First handoff note");
      expect(result.context!.handoffs[1].content).toBe("Second handoff note");
    });

    test("learnings array contains learning entries for the fuda", async () => {
      const fuda = createFuda(db, {
        title: "Test task",
        description: "Test description",
      });

      addEntry(db, {
        fudaId: fuda.id,
        entryType: EntryType.LEARNING,
        content: "Discovered API requires auth",
        spiritId: "agent-1",
      });
      addEntry(db, {
        fudaId: fuda.id,
        entryType: EntryType.LEARNING,
        content: "Found edge case in validation",
      });

      const result = await runStart({
        projectRoot: testDir,
        id: fuda.id,
      });

      expect(result.success).toBe(true);
      expect(result.context!.learnings).toHaveLength(2);
      expect(result.context!.learnings[0].content).toBe("Discovered API requires auth");
      expect(result.context!.learnings[1].content).toBe("Found edge case in validation");
    });

    test("empty arrays when fuda has no ledger entries", async () => {
      const fuda = createFuda(db, {
        title: "Test task",
        description: "Test description",
      });

      const result = await runStart({
        projectRoot: testDir,
        id: fuda.id,
      });

      expect(result.success).toBe(true);
      expect(result.context!.handoffs).toEqual([]);
      expect(result.context!.learnings).toEqual([]);
    });

    test("context entries include id, content, spiritId, and createdAt", async () => {
      const fuda = createFuda(db, {
        title: "Test task",
        description: "Test description",
      });

      addEntry(db, {
        fudaId: fuda.id,
        entryType: EntryType.HANDOFF,
        content: "Handoff with all fields",
        spiritId: "agent-123",
      });

      const result = await runStart({
        projectRoot: testDir,
        id: fuda.id,
      });

      expect(result.success).toBe(true);
      const handoff = result.context!.handoffs[0];
      expect(handoff.id).toBeDefined();
      expect(handoff.id).toMatch(/^sk-/);
      expect(handoff.content).toBe("Handoff with all fields");
      expect(handoff.spiritId).toBe("agent-123");
      expect(handoff.createdAt).toBeDefined();
    });

    test("context entries without spiritId have null spiritId", async () => {
      const fuda = createFuda(db, {
        title: "Test task",
        description: "Test description",
      });

      addEntry(db, {
        fudaId: fuda.id,
        entryType: EntryType.LEARNING,
        content: "Learning without spirit",
      });

      const result = await runStart({
        projectRoot: testDir,
        id: fuda.id,
      });

      expect(result.success).toBe(true);
      const learning = result.context!.learnings[0];
      expect(learning.spiritId).toBeNull();
    });

    test("does not include entries from other fuda", async () => {
      const fuda1 = createFuda(db, {
        title: "Fuda 1",
        description: "Test description",
      });
      const fuda2 = createFuda(db, {
        title: "Fuda 2",
        description: "Test description",
      });

      addEntry(db, {
        fudaId: fuda1.id,
        entryType: EntryType.HANDOFF,
        content: "Fuda 1 handoff",
      });
      addEntry(db, {
        fudaId: fuda2.id,
        entryType: EntryType.HANDOFF,
        content: "Fuda 2 handoff",
      });

      const result = await runStart({
        projectRoot: testDir,
        id: fuda1.id,
      });

      expect(result.success).toBe(true);
      expect(result.context!.handoffs).toHaveLength(1);
      expect(result.context!.handoffs[0].content).toBe("Fuda 1 handoff");
    });
  });
});
