import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { runCli } from "./helpers";

describe("runCli helper", () => {
  let testDir: string;

  beforeEach(() => {
    testDir = mkdtempSync(join(tmpdir(), "shiki-helper-test-"));
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  test("returns stdout from CLI", async () => {
    const result = await runCli(["--help"]);

    expect(result.stdout).toContain("shiki");
    expect(result.exitCode).toBe(0);
  });

  test("returns stderr from CLI on error", async () => {
    const result = await runCli(["nonexistent-command"]);

    expect(result.exitCode).not.toBe(0);
    expect(result.stderr).toBeTruthy();
  });

  test("supports cwd option", async () => {
    // Init in testDir
    const result = await runCli(["init"], { cwd: testDir });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("initialized");
  });

  test("supports stdin option", async () => {
    // First init
    await runCli(["init"], { cwd: testDir });

    // Try to init --force with 'n' stdin
    const result = await runCli(["init", "--force"], {
      cwd: testDir,
      stdin: "n\n",
    });

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("aborted");
  });

  test("captures exit code correctly", async () => {
    const successResult = await runCli(["--help"]);
    expect(successResult.exitCode).toBe(0);

    const failResult = await runCli(["show", "nonexistent-id"], { cwd: testDir });
    expect(failResult.exitCode).not.toBe(0);
  });
});
