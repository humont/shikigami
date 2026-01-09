import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { Database } from "bun:sqlite";
import { runInit } from "../../src/cli/commands/init";
import { createFuda, updateFudaStatus } from "../../src/db/fuda";
import { FudaStatus } from "../../src/types";
import { runCli } from "./helpers";

describe("CLI flag integration tests", () => {
  let testDir: string;
  let db: Database;

  beforeEach(async () => {
    testDir = mkdtempSync(join(tmpdir(), "shiki-flag-test-"));
    await runInit({ projectRoot: testDir });
    db = new Database(join(testDir, ".shikigami", "shiki.db"));
  });

  afterEach(() => {
    db.close();
    rmSync(testDir, { recursive: true, force: true });
  });

  describe("finish --notes flag", () => {
    test("note appears in output when --notes is provided", async () => {
      const fuda = createFuda(db, {
        title: "Test task",
        description: "Test description",
      });

      const result = await runCli(
        ["finish", fuda.id, "--commit-hash", "abc1234", "--notes", "Completed the feature, all tests pass"],
        { cwd: testDir }
      );

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("Finished fuda");
      expect(result.stdout).toContain("handoff note");
    });

    test("note appears in JSON output when --notes is provided", async () => {
      const fuda = createFuda(db, {
        title: "Test task",
        description: "Test description",
      });

      const result = await runCli(
        ["--json", "finish", fuda.id, "--commit-hash", "abc1234", "--notes", "My handoff message"],
        { cwd: testDir }
      );

      expect(result.exitCode).toBe(0);
      const parsed = JSON.parse(result.stdout);
      expect(parsed.success).toBe(true);
      expect(parsed.ledgerEntry).toBeDefined();
      expect(parsed.ledgerEntry.content).toBe("My handoff message");
    });

    test("no ledger entry when --notes is not provided", async () => {
      const fuda = createFuda(db, {
        title: "Test task",
        description: "Test description",
      });

      const result = await runCli(["--json", "finish", fuda.id, "--commit-hash", "abc1234"], { cwd: testDir });

      expect(result.exitCode).toBe(0);
      const parsed = JSON.parse(result.stdout);
      expect(parsed.success).toBe(true);
      expect(parsed.ledgerEntry).toBeUndefined();
    });
  });

  describe("fail --reason flag", () => {
    test("reason appears in output when --reason is provided", async () => {
      const fuda = createFuda(db, {
        title: "Test task",
        description: "Test description",
      });

      const result = await runCli(
        ["fail", fuda.id, "--reason", "Blocked by external dependency"],
        { cwd: testDir }
      );

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("Failed fuda");
      expect(result.stdout).toContain("failure reason");
    });

    test("reason appears in JSON output when --reason is provided", async () => {
      const fuda = createFuda(db, {
        title: "Test task",
        description: "Test description",
      });

      const result = await runCli(
        ["--json", "fail", fuda.id, "--reason", "API rate limit exceeded"],
        { cwd: testDir }
      );

      expect(result.exitCode).toBe(0);
      const parsed = JSON.parse(result.stdout);
      expect(parsed.success).toBe(true);
      expect(parsed.ledgerEntry).toBeDefined();
      expect(parsed.ledgerEntry.content).toBe("API rate limit exceeded");
    });

    test("no ledger entry when --reason is not provided", async () => {
      const fuda = createFuda(db, {
        title: "Test task",
        description: "Test description",
      });

      const result = await runCli(["--json", "fail", fuda.id], { cwd: testDir });

      expect(result.exitCode).toBe(0);
      const parsed = JSON.parse(result.stdout);
      expect(parsed.success).toBe(true);
      expect(parsed.ledgerEntry).toBeUndefined();
    });
  });

  describe("list --status flag", () => {
    test("filters fuda by status when --status is provided", async () => {
      const pending = createFuda(db, {
        title: "Pending task",
        description: "Pending description",
      });
      const ready = createFuda(db, {
        title: "Ready task",
        description: "Ready description",
      });
      updateFudaStatus(db, ready.id, FudaStatus.READY);

      const result = await runCli(["--json", "list", "--status", "ready"], {
        cwd: testDir,
      });

      expect(result.exitCode).toBe(0);
      const parsed = JSON.parse(result.stdout);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].title).toBe("Ready task");
      expect(parsed[0].status).toBe("ready");
    });

    test("filters by pending status", async () => {
      createFuda(db, {
        title: "Pending task",
        description: "Pending description",
      });
      const inProgress = createFuda(db, {
        title: "In progress task",
        description: "In progress description",
      });
      updateFudaStatus(db, inProgress.id, FudaStatus.IN_PROGRESS);

      const result = await runCli(["--json", "list", "--status", "blocked"], {
        cwd: testDir,
      });

      expect(result.exitCode).toBe(0);
      const parsed = JSON.parse(result.stdout);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].title).toBe("Pending task");
    });

    test("shows done fuda when --status done is used", async () => {
      const done = createFuda(db, {
        title: "Done task",
        description: "Done description",
      });
      updateFudaStatus(db, done.id, FudaStatus.DONE);
      createFuda(db, {
        title: "Pending task",
        description: "Pending description",
      });

      const result = await runCli(["--json", "list", "--status", "done"], {
        cwd: testDir,
      });

      expect(result.exitCode).toBe(0);
      const parsed = JSON.parse(result.stdout);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].title).toBe("Done task");
      expect(parsed[0].status).toBe("done");
    });
  });

  describe("ready --limit flag", () => {
    test("limits results when --limit is provided", async () => {
      createFuda(db, { title: "Task 1", description: "Desc 1", priority: 3 });
      createFuda(db, { title: "Task 2", description: "Desc 2", priority: 2 });
      createFuda(db, { title: "Task 3", description: "Desc 3", priority: 1 });

      const result = await runCli(["--json", "ready", "--limit", "2"], {
        cwd: testDir,
      });

      expect(result.exitCode).toBe(0);
      const parsed = JSON.parse(result.stdout);
      expect(parsed).toHaveLength(2);
    });

    test("returns highest priority fuda when limited", async () => {
      createFuda(db, { title: "Low", description: "Desc", priority: 1 });
      createFuda(db, { title: "High", description: "Desc", priority: 10 });
      createFuda(db, { title: "Medium", description: "Desc", priority: 5 });

      const result = await runCli(["--json", "ready", "--limit", "1"], {
        cwd: testDir,
      });

      expect(result.exitCode).toBe(0);
      const parsed = JSON.parse(result.stdout);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].title).toBe("High");
    });

    test("returns all fuda when limit exceeds count", async () => {
      createFuda(db, { title: "Task 1", description: "Desc 1" });
      createFuda(db, { title: "Task 2", description: "Desc 2" });

      const result = await runCli(["--json", "ready", "--limit", "100"], {
        cwd: testDir,
      });

      expect(result.exitCode).toBe(0);
      const parsed = JSON.parse(result.stdout);
      expect(parsed).toHaveLength(2);
    });
  });

  describe("--json global flag", () => {
    test("list command outputs valid JSON", async () => {
      createFuda(db, {
        title: "Test task",
        description: "Test description",
        priority: 5,
      });

      const result = await runCli(["--json", "list"], { cwd: testDir });

      expect(result.exitCode).toBe(0);
      expect(() => JSON.parse(result.stdout)).not.toThrow();
      const parsed = JSON.parse(result.stdout);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed[0]).toHaveProperty("id");
      expect(parsed[0]).toHaveProperty("title");
      expect(parsed[0]).toHaveProperty("status");
    });

    test("ready command outputs valid JSON", async () => {
      createFuda(db, {
        title: "Ready task",
        description: "Ready description",
      });

      const result = await runCli(["--json", "ready"], { cwd: testDir });

      expect(result.exitCode).toBe(0);
      expect(() => JSON.parse(result.stdout)).not.toThrow();
      const parsed = JSON.parse(result.stdout);
      expect(Array.isArray(parsed)).toBe(true);
    });

    test("show command outputs valid JSON", async () => {
      const fuda = createFuda(db, {
        title: "Test task",
        description: "Test description",
      });

      const result = await runCli(["--json", "show", fuda.id], { cwd: testDir });

      expect(result.exitCode).toBe(0);
      expect(() => JSON.parse(result.stdout)).not.toThrow();
      const parsed = JSON.parse(result.stdout);
      expect(parsed.id).toBe(fuda.id);
      expect(parsed.title).toBe("Test task");
    });

    test("status command outputs valid JSON", async () => {
      createFuda(db, { title: "Task 1", description: "Desc" });

      const result = await runCli(["--json", "status"], { cwd: testDir });

      expect(result.exitCode).toBe(0);
      expect(() => JSON.parse(result.stdout)).not.toThrow();
      const parsed = JSON.parse(result.stdout);
      expect(parsed).toHaveProperty("total");
      expect(parsed).toHaveProperty("blocked");
      expect(parsed).toHaveProperty("ready");
    });

    test("finish command outputs valid JSON", async () => {
      const fuda = createFuda(db, {
        title: "Test task",
        description: "Test description",
      });

      const result = await runCli(["--json", "finish", fuda.id, "--commit-hash", "abc1234"], { cwd: testDir });

      expect(result.exitCode).toBe(0);
      expect(() => JSON.parse(result.stdout)).not.toThrow();
      const parsed = JSON.parse(result.stdout);
      expect(parsed.success).toBe(true);
      expect(parsed.fuda).toBeDefined();
      expect(parsed.fuda.status).toBe("done");
    });

    test("fail command outputs valid JSON", async () => {
      const fuda = createFuda(db, {
        title: "Test task",
        description: "Test description",
      });

      const result = await runCli(["--json", "fail", fuda.id], { cwd: testDir });

      expect(result.exitCode).toBe(0);
      expect(() => JSON.parse(result.stdout)).not.toThrow();
      const parsed = JSON.parse(result.stdout);
      expect(parsed.success).toBe(true);
      expect(parsed.fuda).toBeDefined();
      expect(parsed.fuda.status).toBe("failed");
    });

    test("error output is valid JSON when --json is used", async () => {
      const result = await runCli(["--json", "show", "nonexistent"], {
        cwd: testDir,
      });

      expect(result.exitCode).toBe(1);
      expect(() => JSON.parse(result.stderr)).not.toThrow();
      const parsed = JSON.parse(result.stderr);
      expect(parsed.error).toBeDefined();
    });
  });
});
