import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { Database } from "bun:sqlite";
import { runInit } from "../../src/cli/commands/init";
import { runStatus } from "../../src/cli/commands/status";
import { createFuda, deleteFuda } from "../../src/db/fuda";
import { FudaStatus } from "../../src/types";

describe("status command", () => {
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

  describe("returns correct counts by status", () => {
    test("counts fuda in pending status", async () => {
      createFuda(db, { title: "Task 1", description: "Desc 1" });
      createFuda(db, { title: "Task 2", description: "Desc 2" });

      const result = await runStatus({ projectRoot: testDir });

      expect(result.success).toBe(true);
      expect(result.status?.pending).toBe(2);
      expect(result.status?.total).toBe(2);
    });

    test("counts fuda in ready status", async () => {
      const fuda1 = createFuda(db, { title: "Task 1", description: "Desc 1" });
      const fuda2 = createFuda(db, { title: "Task 2", description: "Desc 2" });
      db.run("UPDATE fuda SET status = ? WHERE id IN (?, ?)", [
        FudaStatus.READY,
        fuda1.id,
        fuda2.id,
      ]);

      const result = await runStatus({ projectRoot: testDir });

      expect(result.success).toBe(true);
      expect(result.status?.ready).toBe(2);
    });

    test("counts fuda in in_progress status", async () => {
      const fuda = createFuda(db, { title: "Task 1", description: "Desc 1" });
      db.run("UPDATE fuda SET status = ? WHERE id = ?", [
        FudaStatus.IN_PROGRESS,
        fuda.id,
      ]);

      const result = await runStatus({ projectRoot: testDir });

      expect(result.success).toBe(true);
      expect(result.status?.inProgress).toBe(1);
    });

    test("counts fuda in in_review status", async () => {
      const fuda = createFuda(db, { title: "Task 1", description: "Desc 1" });
      db.run("UPDATE fuda SET status = ? WHERE id = ?", [
        FudaStatus.IN_REVIEW,
        fuda.id,
      ]);

      const result = await runStatus({ projectRoot: testDir });

      expect(result.success).toBe(true);
      expect(result.status?.inReview).toBe(1);
    });

    test("counts fuda in blocked status", async () => {
      const fuda = createFuda(db, { title: "Task 1", description: "Desc 1" });
      db.run("UPDATE fuda SET status = ? WHERE id = ?", [
        FudaStatus.BLOCKED,
        fuda.id,
      ]);

      const result = await runStatus({ projectRoot: testDir });

      expect(result.success).toBe(true);
      expect(result.status?.blocked).toBe(1);
    });

    test("counts fuda in failed status", async () => {
      const fuda = createFuda(db, { title: "Task 1", description: "Desc 1" });
      db.run("UPDATE fuda SET status = ? WHERE id = ?", [
        FudaStatus.FAILED,
        fuda.id,
      ]);

      const result = await runStatus({ projectRoot: testDir });

      expect(result.success).toBe(true);
      expect(result.status?.failed).toBe(1);
    });

    test("counts fuda in done status", async () => {
      const fuda1 = createFuda(db, { title: "Task 1", description: "Desc 1" });
      const fuda2 = createFuda(db, { title: "Task 2", description: "Desc 2" });
      const fuda3 = createFuda(db, { title: "Task 3", description: "Desc 3" });
      db.run("UPDATE fuda SET status = ? WHERE id IN (?, ?, ?)", [
        FudaStatus.DONE,
        fuda1.id,
        fuda2.id,
        fuda3.id,
      ]);

      const result = await runStatus({ projectRoot: testDir });

      expect(result.success).toBe(true);
      expect(result.status?.done).toBe(3);
    });

    test("counts fuda across multiple statuses", async () => {
      const fuda1 = createFuda(db, { title: "Task 1", description: "Desc 1" }); // pending
      const fuda2 = createFuda(db, { title: "Task 2", description: "Desc 2" });
      const fuda3 = createFuda(db, { title: "Task 3", description: "Desc 3" });
      const fuda4 = createFuda(db, { title: "Task 4", description: "Desc 4" });

      db.run("UPDATE fuda SET status = ? WHERE id = ?", [FudaStatus.READY, fuda2.id]);
      db.run("UPDATE fuda SET status = ? WHERE id = ?", [FudaStatus.IN_PROGRESS, fuda3.id]);
      db.run("UPDATE fuda SET status = ? WHERE id = ?", [FudaStatus.DONE, fuda4.id]);

      const result = await runStatus({ projectRoot: testDir });

      expect(result.success).toBe(true);
      expect(result.status?.pending).toBe(1);
      expect(result.status?.ready).toBe(1);
      expect(result.status?.inProgress).toBe(1);
      expect(result.status?.done).toBe(1);
      expect(result.status?.total).toBe(4);
    });

    test("total equals sum of all statuses", async () => {
      createFuda(db, { title: "Task 1", description: "Desc 1" });
      createFuda(db, { title: "Task 2", description: "Desc 2" });
      const fuda3 = createFuda(db, { title: "Task 3", description: "Desc 3" });
      db.run("UPDATE fuda SET status = ? WHERE id = ?", [FudaStatus.DONE, fuda3.id]);

      const result = await runStatus({ projectRoot: testDir });

      expect(result.success).toBe(true);
      const status = result.status!;
      const sumOfStatuses =
        status.pending +
        status.ready +
        status.inProgress +
        status.inReview +
        status.blocked +
        status.failed +
        status.done;
      expect(status.total).toBe(sumOfStatuses);
    });
  });

  describe("handles empty database", () => {
    test("returns zero counts for empty database", async () => {
      const result = await runStatus({ projectRoot: testDir });

      expect(result.success).toBe(true);
      expect(result.status?.pending).toBe(0);
      expect(result.status?.ready).toBe(0);
      expect(result.status?.inProgress).toBe(0);
      expect(result.status?.inReview).toBe(0);
      expect(result.status?.blocked).toBe(0);
      expect(result.status?.failed).toBe(0);
      expect(result.status?.done).toBe(0);
      expect(result.status?.total).toBe(0);
    });
  });

  describe("excludes soft-deleted fuda", () => {
    test("does not count soft-deleted fuda", async () => {
      const fuda1 = createFuda(db, { title: "Task 1", description: "Desc 1" });
      const fuda2 = createFuda(db, { title: "Task 2", description: "Desc 2" });
      createFuda(db, { title: "Task 3", description: "Desc 3" });

      // Soft delete two fuda
      deleteFuda(db, fuda1.id);
      deleteFuda(db, fuda2.id);

      const result = await runStatus({ projectRoot: testDir });

      expect(result.success).toBe(true);
      expect(result.status?.pending).toBe(1);
      expect(result.status?.total).toBe(1);
    });

    test("excludes soft-deleted fuda from each status category", async () => {
      const fuda1 = createFuda(db, { title: "Task 1", description: "Desc 1" });
      const fuda2 = createFuda(db, { title: "Task 2", description: "Desc 2" });
      const fuda3 = createFuda(db, { title: "Task 3", description: "Desc 3" });

      db.run("UPDATE fuda SET status = ? WHERE id = ?", [FudaStatus.READY, fuda1.id]);
      db.run("UPDATE fuda SET status = ? WHERE id = ?", [FudaStatus.DONE, fuda2.id]);
      db.run("UPDATE fuda SET status = ? WHERE id = ?", [FudaStatus.DONE, fuda3.id]);

      // Delete one done fuda
      deleteFuda(db, fuda2.id);

      const result = await runStatus({ projectRoot: testDir });

      expect(result.success).toBe(true);
      expect(result.status?.ready).toBe(1);
      expect(result.status?.done).toBe(1); // Only one, not two
      expect(result.status?.total).toBe(2);
    });
  });

  describe("JSON output format", () => {
    test("returns JSON-serializable result", async () => {
      createFuda(db, { title: "Task 1", description: "Desc 1" });

      const result = await runStatus({ projectRoot: testDir });

      // Should be JSON serializable
      const json = JSON.stringify(result);
      expect(json).toBeDefined();

      const parsed = JSON.parse(json);
      expect(parsed.success).toBe(true);
      expect(parsed.status).toBeDefined();
    });

    test("status object contains all expected fields", async () => {
      const result = await runStatus({ projectRoot: testDir });

      expect(result.status).toHaveProperty("pending");
      expect(result.status).toHaveProperty("ready");
      expect(result.status).toHaveProperty("inProgress");
      expect(result.status).toHaveProperty("inReview");
      expect(result.status).toHaveProperty("blocked");
      expect(result.status).toHaveProperty("failed");
      expect(result.status).toHaveProperty("done");
      expect(result.status).toHaveProperty("total");
    });

    test("all status counts are numbers", async () => {
      const result = await runStatus({ projectRoot: testDir });

      expect(typeof result.status?.pending).toBe("number");
      expect(typeof result.status?.ready).toBe("number");
      expect(typeof result.status?.inProgress).toBe("number");
      expect(typeof result.status?.inReview).toBe("number");
      expect(typeof result.status?.blocked).toBe("number");
      expect(typeof result.status?.failed).toBe("number");
      expect(typeof result.status?.done).toBe("number");
      expect(typeof result.status?.total).toBe("number");
    });
  });

  describe("error when shiki not initialized", () => {
    test("returns error when shiki not initialized", async () => {
      const uninitializedDir = mkdtempSync(join(tmpdir(), "shiki-uninit-"));

      try {
        const result = await runStatus({ projectRoot: uninitializedDir });

        expect(result.success).toBe(false);
        expect(result.error).toContain("not initialized");
      } finally {
        rmSync(uninitializedDir, { recursive: true, force: true });
      }
    });
  });
});
