import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, rmSync, existsSync, readFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { runInit } from "../../src/cli/commands/init";
import { AGENT_INSTRUCTIONS_CONTENT } from "../../src/content/agent-instructions";

describe("init command", () => {
  let testDir: string;

  beforeEach(() => {
    testDir = mkdtempSync(join(tmpdir(), "shiki-test-"));
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  test("creates .shikigami directory", async () => {
    const result = await runInit({ projectRoot: testDir });

    expect(result.success).toBe(true);
    expect(existsSync(join(testDir, ".shikigami"))).toBe(true);
  });

  test("creates database file", async () => {
    await runInit({ projectRoot: testDir });

    expect(existsSync(join(testDir, ".shikigami", "shiki.db"))).toBe(true);
  });

  test("runs migrations and creates tables", async () => {
    await runInit({ projectRoot: testDir });

    // Verify tables exist by opening db
    const { Database } = await import("bun:sqlite");
    const db = new Database(join(testDir, ".shikigami", "shiki.db"));
    const tables = db
      .query("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
      .all() as { name: string }[];
    const tableNames = tables.map((t) => t.name);

    expect(tableNames).toContain("fuda");
    expect(tableNames).toContain("fuda_dependencies");
    expect(tableNames).toContain("migrations");

    db.close();
  });

  test("fails without --force if already initialized", async () => {
    await runInit({ projectRoot: testDir });

    const result = await runInit({ projectRoot: testDir });
    expect(result.success).toBe(false);
    expect(result.error).toContain("already initialized");
  });

  test("succeeds with --force if already initialized", async () => {
    await runInit({ projectRoot: testDir });

    const result = await runInit({ projectRoot: testDir, force: true });
    expect(result.success).toBe(true);
  });

  test("returns JSON-serializable result", async () => {
    const result = await runInit({ projectRoot: testDir });

    // Should be JSON serializable
    const json = JSON.stringify(result);
    expect(json).toBeDefined();

    const parsed = JSON.parse(json);
    expect(parsed.success).toBe(true);
    expect(parsed.dbPath).toContain(".shikigami");
  });

  describe("AGENT_INSTRUCTIONS.md creation", () => {
    test("creates AGENT_INSTRUCTIONS.md on init", async () => {
      await runInit({ projectRoot: testDir });

      const instructionsPath = join(testDir, ".shikigami", "AGENT_INSTRUCTIONS.md");
      expect(existsSync(instructionsPath)).toBe(true);
    });

    test("AGENT_INSTRUCTIONS.md contains agent workflow content", async () => {
      await runInit({ projectRoot: testDir });

      const instructionsPath = join(testDir, ".shikigami", "AGENT_INSTRUCTIONS.md");
      const content = readFileSync(instructionsPath, "utf-8");

      // Should match the shared content exactly
      expect(content).toBe(AGENT_INSTRUCTIONS_CONTENT);
    });

    test("AGENT_INSTRUCTIONS.md is regenerated on init --force", async () => {
      await runInit({ projectRoot: testDir });

      const instructionsPath = join(testDir, ".shikigami", "AGENT_INSTRUCTIONS.md");

      // Modify the file
      const { writeFileSync } = await import("fs");
      writeFileSync(instructionsPath, "modified content");

      // Re-init with force
      await runInit({ projectRoot: testDir, force: true });

      const newContent = readFileSync(instructionsPath, "utf-8");
      expect(newContent).toBe(AGENT_INSTRUCTIONS_CONTENT);
      expect(newContent).not.toBe("modified content");
    });

    test("AGENT_INSTRUCTIONS.md is properly formatted markdown", async () => {
      await runInit({ projectRoot: testDir });

      const instructionsPath = join(testDir, ".shikigami", "AGENT_INSTRUCTIONS.md");
      const content = readFileSync(instructionsPath, "utf-8");

      // Should have markdown headers
      expect(content).toMatch(/^#\s+.+/m);
      // Should have code blocks for CLI examples
      expect(content).toMatch(/```/);
    });
  });
});
