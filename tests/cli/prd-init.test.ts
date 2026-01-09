import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, rmSync, existsSync, readFileSync, mkdirSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { runPrdInit } from "../../src/cli/commands/prd";

describe("prd init command", () => {
  let testDir: string;

  beforeEach(() => {
    testDir = mkdtempSync(join(tmpdir(), "shiki-prd-test-"));
    // Create .shikigami directory (simulating initialized project)
    mkdirSync(join(testDir, ".shikigami"));
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  test("creates PRD file in .shikigami/prds/ directory", async () => {
    const result = await runPrdInit({ name: "auth-feature", projectRoot: testDir });

    expect(result.success).toBe(true);
    expect(result.path).toContain(".shikigami/prds/");
    expect(result.path).toContain("auth-feature.md");
    expect(existsSync(result.path!)).toBe(true);
  });

  test("creates prds directory if it does not exist", async () => {
    const prdsDir = join(testDir, ".shikigami", "prds");
    expect(existsSync(prdsDir)).toBe(false);

    const result = await runPrdInit({ name: "new-feature", projectRoot: testDir });

    expect(result.success).toBe(true);
    expect(existsSync(prdsDir)).toBe(true);
  });

  test("uses today's date as filename prefix in YYYY-MM-DD format", async () => {
    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

    const result = await runPrdInit({ name: "test-feature", projectRoot: testDir });

    expect(result.success).toBe(true);
    expect(result.prdId).toBe(`${today}_test-feature`);
    expect(result.path).toContain(`${today}_test-feature.md`);
  });

  test("returns prdId without .md extension", async () => {
    const result = await runPrdInit({ name: "my-feature", projectRoot: testDir });

    expect(result.success).toBe(true);
    expect(result.prdId).not.toContain(".md");
  });

  test("creates file with basic template content", async () => {
    const result = await runPrdInit({ name: "basic-feature", projectRoot: testDir });

    expect(result.success).toBe(true);

    const content = readFileSync(result.path!, "utf-8");

    // Should have a title header based on the name
    expect(content).toMatch(/^# /m);
    expect(content).toContain("Basic Feature");

    // Should have overview section
    expect(content).toContain("## Overview");
  });

  test("converts name to title case in template header", async () => {
    const result = await runPrdInit({ name: "user-authentication", projectRoot: testDir });

    const content = readFileSync(result.path!, "utf-8");

    // user-authentication -> User Authentication
    expect(content).toContain("# User Authentication");
  });

  test("fails if name contains invalid characters", async () => {
    const result = await runPrdInit({ name: "bad/name", projectRoot: testDir });

    expect(result.success).toBe(false);
    expect(result.error).toContain("invalid");
  });

  test("fails if name contains spaces", async () => {
    const result = await runPrdInit({ name: "bad name", projectRoot: testDir });

    expect(result.success).toBe(false);
    expect(result.error).toContain("invalid");
  });

  test("fails if PRD with same name already exists for today", async () => {
    const today = new Date().toISOString().split("T")[0];

    // Create first PRD
    await runPrdInit({ name: "duplicate", projectRoot: testDir });

    // Try to create another with same name
    const result = await runPrdInit({ name: "duplicate", projectRoot: testDir });

    expect(result.success).toBe(false);
    expect(result.error).toContain("already exists");
  });

  test("allows same name on different days", async () => {
    const prdsDir = join(testDir, ".shikigami", "prds");
    mkdirSync(prdsDir, { recursive: true });

    // Create a PRD from a previous day
    const previousDate = "2025-01-01";
    const { writeFileSync } = await import("fs");
    writeFileSync(
      join(prdsDir, `${previousDate}_same-name.md`),
      "# Same Name\n\n## Overview\n"
    );

    // Creating for today should work
    const result = await runPrdInit({ name: "same-name", projectRoot: testDir });

    expect(result.success).toBe(true);
  });

  test("fails if .shikigami directory does not exist", async () => {
    // Remove .shikigami to simulate uninitialized project
    rmSync(join(testDir, ".shikigami"), { recursive: true });

    const result = await runPrdInit({ name: "test", projectRoot: testDir });

    expect(result.success).toBe(false);
    expect(result.error).toContain("not initialized");
  });

  test("returns JSON-serializable result", async () => {
    const result = await runPrdInit({ name: "json-test", projectRoot: testDir });

    expect(result.success).toBe(true);

    // Should be JSON serializable
    const json = JSON.stringify(result);
    expect(json).toBeDefined();

    const parsed = JSON.parse(json);
    expect(parsed.success).toBe(true);
    expect(parsed.prdId).toBeDefined();
    expect(parsed.path).toBeDefined();
  });

  describe("template content", () => {
    test("includes Fuda section placeholder", async () => {
      const result = await runPrdInit({ name: "with-fuda", projectRoot: testDir });

      const content = readFileSync(result.path!, "utf-8");

      expect(content).toContain("## Fuda");
    });

    test("template is valid markdown", async () => {
      const result = await runPrdInit({ name: "markdown-test", projectRoot: testDir });

      const content = readFileSync(result.path!, "utf-8");

      // Should start with a level 1 header
      expect(content).toMatch(/^# .+/);

      // Should have at least one level 2 header
      expect(content).toMatch(/^## .+/m);
    });
  });

  describe("name validation", () => {
    test("accepts lowercase alphanumeric with hyphens", async () => {
      const result = await runPrdInit({ name: "my-feature-123", projectRoot: testDir });

      expect(result.success).toBe(true);
    });

    test("accepts underscores", async () => {
      const result = await runPrdInit({ name: "my_feature", projectRoot: testDir });

      expect(result.success).toBe(true);
    });

    test("rejects empty name", async () => {
      const result = await runPrdInit({ name: "", projectRoot: testDir });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    test("rejects names with dots", async () => {
      const result = await runPrdInit({ name: "feature.v2", projectRoot: testDir });

      expect(result.success).toBe(false);
      expect(result.error).toContain("invalid");
    });
  });
});
