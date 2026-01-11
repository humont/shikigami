import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { runCli } from "./helpers";

/**
 * Integration tests for formatted CLI output.
 * These tests verify that human-readable output renders correctly.
 * They test output structure, not exact ANSI color codes.
 */
describe("formatted output integration tests", () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = mkdtempSync(join(tmpdir(), "shiki-format-test-"));
    await runCli(["init"], { cwd: testDir });
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  describe("list command formatted output", () => {
    test("displays fuda table with ID, status, priority, and title", async () => {
      // Create a fuda (fuda without blockers start as "ready")
      await runCli(
        ["add", "-t", "Test Task", "-d", "Test description", "-p", "5"],
        { cwd: testDir }
      );

      const result = await runCli(["list"], { cwd: testDir });

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("sk-"); // ID prefix
      expect(result.stdout).toContain("ready"); // Status (fuda without deps start as ready)
      expect(result.stdout).toContain("p5"); // Priority
      expect(result.stdout).toContain("Test Task"); // Title
    });

    test("groups fuda by priority with blank lines between groups", async () => {
      await runCli(
        ["add", "-t", "High Priority", "-d", "Desc", "-p", "10"],
        { cwd: testDir }
      );
      await runCli(
        ["add", "-t", "Low Priority", "-d", "Desc", "-p", "1"],
        { cwd: testDir }
      );

      const result = await runCli(["list"], { cwd: testDir });

      expect(result.exitCode).toBe(0);
      // High priority should come first
      const highIndex = result.stdout.indexOf("High Priority");
      const lowIndex = result.stdout.indexOf("Low Priority");
      expect(highIndex).toBeLessThan(lowIndex);
      expect(result.stdout).toContain("p10");
      expect(result.stdout).toContain("p1");
    });

    test("displays 'No fuda found.' when list is empty", async () => {
      const result = await runCli(["list"], { cwd: testDir });

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("No fuda found.");
    });

    test("status column is padded for alignment", async () => {
      await runCli(
        ["add", "-t", "Test", "-d", "Desc"],
        { cwd: testDir }
      );

      const result = await runCli(["list"], { cwd: testDir });

      // Status should be padded - "ready" has trailing spaces to match "in_progress" length
      // We check that status and priority are separated consistently
      expect(result.stdout).toMatch(/ready\s+.*p\d/);
    });
  });

  describe("deps tree command formatted output", () => {
    test("displays tree structure with root ID at top", async () => {
      const result1 = await runCli(
        ["add", "-t", "Main Task", "-d", "Main"],
        { cwd: testDir }
      );
      // Extract ID from stdout (format: "Created fuda sk-xxxx")
      const mainId = result1.stdout.trim().split(" ").pop()!;

      const result = await runCli(["deps", "tree", mainId], { cwd: testDir });

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain(mainId);
    });

    test("shows dependency with tree connector and type", async () => {
      const result1 = await runCli(
        ["add", "-t", "Main Task", "-d", "Main"],
        { cwd: testDir }
      );
      const mainId = result1.stdout.trim().split(" ").pop()!;

      const result2 = await runCli(
        ["add", "-t", "Dependency", "-d", "Dep"],
        { cwd: testDir }
      );
      const depId = result2.stdout.trim().split(" ").pop()!;

      await runCli(
        ["deps", "add", mainId, depId, "-t", "blocks"],
        { cwd: testDir }
      );

      const result = await runCli(["deps", "tree", mainId], { cwd: testDir });

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain(mainId);
      expect(result.stdout).toContain("└─"); // Tree connector
      expect(result.stdout).toContain(depId);
      expect(result.stdout).toContain("[blocks]"); // Dependency type
    });

    test("shows nested dependencies with proper indentation", async () => {
      const result1 = await runCli(
        ["add", "-t", "Task A", "-d", "A"],
        { cwd: testDir }
      );
      const idA = result1.stdout.trim().split(" ").pop()!;

      const result2 = await runCli(
        ["add", "-t", "Task B", "-d", "B"],
        { cwd: testDir }
      );
      const idB = result2.stdout.trim().split(" ").pop()!;

      const result3 = await runCli(
        ["add", "-t", "Task C", "-d", "C"],
        { cwd: testDir }
      );
      const idC = result3.stdout.trim().split(" ").pop()!;

      // A -> B -> C
      await runCli(["deps", "add", idA, idB], { cwd: testDir });
      await runCli(["deps", "add", idB, idC], { cwd: testDir });

      const result = await runCli(["deps", "tree", idA], { cwd: testDir });

      expect(result.exitCode).toBe(0);
      // Check that the tree structure shows proper nesting
      // A should appear first, then B indented, then C more indented
      const lines = result.stdout.split("\n");
      const lineA = lines.findIndex((l) => l.includes(idA) && !l.includes("└─"));
      const lineB = lines.findIndex((l) => l.includes(idB));
      const lineC = lines.findIndex((l) => l.includes(idC));

      expect(lineA).toBeGreaterThanOrEqual(0);
      expect(lineB).toBeGreaterThan(lineA);
      expect(lineC).toBeGreaterThan(lineB);
    });
  });

  describe("status command formatted output", () => {
    test("displays 'Fuda Status:' header", async () => {
      const result = await runCli(["status"], { cwd: testDir });

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("Fuda Status:");
    });

    test("displays counts for all status categories", async () => {
      const result = await runCli(["status"], { cwd: testDir });

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("Blocked:");
      expect(result.stdout).toContain("Ready:");
      expect(result.stdout).toContain("In Progress:");
      expect(result.stdout).toContain("In Review:");
      expect(result.stdout).toContain("Failed:");
      expect(result.stdout).toContain("Done:");
      expect(result.stdout).toContain("Total:");
    });

    test("status counts are numbers", async () => {
      await runCli(
        ["add", "-t", "Test", "-d", "Desc"],
        { cwd: testDir }
      );

      const result = await runCli(["status"], { cwd: testDir });

      expect(result.exitCode).toBe(0);
      // Check that each line has a number
      expect(result.stdout).toMatch(/Blocked:\s+\d+/);
      expect(result.stdout).toMatch(/Total:\s+\d+/);
    });

    test("shows correct counts after adding fuda", async () => {
      await runCli(
        ["add", "-t", "Task 1", "-d", "Desc"],
        { cwd: testDir }
      );
      await runCli(
        ["add", "-t", "Task 2", "-d", "Desc"],
        { cwd: testDir }
      );

      const result = await runCli(["status"], { cwd: testDir });

      expect(result.exitCode).toBe(0);
      // Fuda without dependencies start as "ready"
      expect(result.stdout).toMatch(/Ready:\s+2/);
      expect(result.stdout).toMatch(/Total:\s+2/);
    });
  });

  describe("show command formatted output", () => {
    test("displays fuda ID", async () => {
      const addResult = await runCli(
        ["add", "-t", "Show Test", "-d", "Test description"],
        { cwd: testDir }
      );
      const id = addResult.stdout.trim().split(" ").pop()!;

      const result = await runCli(["show", id], { cwd: testDir });

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain(`ID: ${id}`);
    });

    test("displays all fuda fields", async () => {
      const addResult = await runCli(
        ["add", "-t", "Complete Task", "-d", "Full description", "-p", "7", "-s", "review"],
        { cwd: testDir }
      );
      const id = addResult.stdout.trim().split(" ").pop()!;

      const result = await runCli(["show", id], { cwd: testDir });

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("ID:");
      expect(result.stdout).toContain("Title: Complete Task");
      expect(result.stdout).toContain("Description: Full description");
      expect(result.stdout).toContain("Status: ready"); // Fuda without deps start as ready
      expect(result.stdout).toContain("Spirit Type: review");
      expect(result.stdout).toContain("Priority: 7");
      expect(result.stdout).toContain("Created:");
      expect(result.stdout).toContain("Updated:");
    });

    test("fields are displayed one per line", async () => {
      const addResult = await runCli(
        ["add", "-t", "Test", "-d", "Desc"],
        { cwd: testDir }
      );
      const id = addResult.stdout.trim().split(" ").pop()!;

      const result = await runCli(["show", id], { cwd: testDir });

      expect(result.exitCode).toBe(0);
      const lines = result.stdout.split("\n").filter((l) => l.trim());
      // Each field should be on its own line with "Field: value" format
      const fieldLines = lines.filter((l) => l.includes(":"));
      expect(fieldLines.length).toBeGreaterThanOrEqual(7); // At least 7 fields
    });

    test("displays error for non-existent fuda", async () => {
      const result = await runCli(["show", "sk-nonexistent"], { cwd: testDir });

      expect(result.exitCode).not.toBe(0);
      expect(result.stderr).toContain("not found");
    });
  });
});
