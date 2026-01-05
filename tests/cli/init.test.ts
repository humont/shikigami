import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, rmSync, existsSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { runInit } from "../../src/cli/commands/init";

describe("init command", () => {
  let testDir: string;

  beforeEach(() => {
    testDir = mkdtempSync(join(tmpdir(), "shiki-test-"));
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  test("creates .shiki directory", async () => {
    const result = await runInit({ projectRoot: testDir });

    expect(result.success).toBe(true);
    expect(existsSync(join(testDir, ".shiki"))).toBe(true);
  });

  test("creates database file", async () => {
    await runInit({ projectRoot: testDir });

    expect(existsSync(join(testDir, ".shiki", "shiki.db"))).toBe(true);
  });

  test("runs migrations and creates tables", async () => {
    await runInit({ projectRoot: testDir });

    // Verify tables exist by opening db
    const { Database } = await import("bun:sqlite");
    const db = new Database(join(testDir, ".shiki", "shiki.db"));
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
    expect(parsed.dbPath).toContain(".shiki");
  });
});
