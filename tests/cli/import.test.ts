import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { Database } from "bun:sqlite";
import { runInit } from "../../src/cli/commands/init";
import { runImport } from "../../src/cli/commands/import";
import { getFuda } from "../../src/db/fuda";
import { getFudaDependenciesFull } from "../../src/db/dependencies";

describe("import command", () => {
  let testDir: string;
  let db: Database;

  beforeEach(async () => {
    testDir = mkdtempSync(join(tmpdir(), "shiki-test-"));
    await runInit({ projectRoot: testDir });
    db = new Database(join(testDir, ".shiki", "shiki.db"));
  });

  afterEach(() => {
    db.close();
    rmSync(testDir, { recursive: true, force: true });
  });

  describe("file import", () => {
    test("imports single fuda from JSON file", async () => {
      const jsonPath = join(testDir, "import.json");
      writeFileSync(
        jsonPath,
        JSON.stringify({
          title: "Test fuda",
          description: "Test description",
        })
      );

      const result = await runImport({ file: jsonPath, projectRoot: testDir });

      expect(result.success).toBe(true);
      expect(result.count).toBe(1);
      expect(result.imported).toHaveLength(1);
    });

    test("imports multiple fuda from JSON array", async () => {
      const jsonPath = join(testDir, "import.json");
      writeFileSync(
        jsonPath,
        JSON.stringify([
          { title: "First fuda", description: "First description" },
          { title: "Second fuda", description: "Second description" },
        ])
      );

      const result = await runImport({ file: jsonPath, projectRoot: testDir });

      expect(result.success).toBe(true);
      expect(result.count).toBe(2);
      expect(result.imported).toHaveLength(2);
    });

    test("returns error for non-existent file", async () => {
      const result = await runImport({
        file: "/nonexistent/path.json",
        projectRoot: testDir,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("File not found");
    });

    test("returns error for invalid JSON", async () => {
      const jsonPath = join(testDir, "invalid.json");
      writeFileSync(jsonPath, "{ not valid json }");

      const result = await runImport({ file: jsonPath, projectRoot: testDir });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid JSON");
    });
  });

  describe("stdin import", () => {
    test("imports single fuda from stdin content", async () => {
      const stdinContent = JSON.stringify({
        title: "Stdin fuda",
        description: "Imported via stdin",
      });

      const result = await runImport({
        stdin: stdinContent,
        projectRoot: testDir,
      });

      expect(result.success).toBe(true);
      expect(result.count).toBe(1);
      expect(result.imported).toHaveLength(1);

      // Verify the fuda was created correctly
      const fuda = getFuda(db, result.imported![0]);
      expect(fuda).not.toBeNull();
      expect(fuda!.title).toBe("Stdin fuda");
      expect(fuda!.description).toBe("Imported via stdin");
    });

    test("imports multiple fuda from stdin with dependencies using $0/$1 syntax", async () => {
      const stdinContent = JSON.stringify([
        {
          title: "First task",
          description: "This runs first",
        },
        {
          title: "Second task",
          description: "Depends on first",
          dependencies: [{ id: "$0", type: "blocks" }],
        },
        {
          title: "Third task",
          description: "Depends on second",
          dependencies: [{ id: "$1", type: "blocks" }],
        },
      ]);

      const result = await runImport({
        stdin: stdinContent,
        projectRoot: testDir,
      });

      expect(result.success).toBe(true);
      expect(result.count).toBe(3);
      expect(result.imported).toHaveLength(3);

      // Verify dependencies were created correctly
      const [firstId, secondId, thirdId] = result.imported!;

      // Second should depend on first
      const secondDeps = getFudaDependenciesFull(db, secondId);
      expect(secondDeps).toHaveLength(1);
      expect(secondDeps[0].dependsOnId).toBe(firstId);
      expect(secondDeps[0].type).toBe("blocks");

      // Third should depend on second
      const thirdDeps = getFudaDependenciesFull(db, thirdId);
      expect(thirdDeps).toHaveLength(1);
      expect(thirdDeps[0].dependsOnId).toBe(secondId);
    });

    test("returns error for invalid JSON from stdin", async () => {
      const result = await runImport({
        stdin: "{ not valid json }",
        projectRoot: testDir,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid JSON");
    });

    test("returns error for missing required fields in stdin", async () => {
      const stdinContent = JSON.stringify({
        title: "Missing description",
        // description is missing
      });

      const result = await runImport({
        stdin: stdinContent,
        projectRoot: testDir,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("must have title and description");
    });

    test("imports fuda with all optional fields from stdin", async () => {
      const stdinContent = JSON.stringify({
        title: "Full fuda",
        description: "Has all fields",
        spiritType: "tengu",
        priority: 10,
        prdId: "PRD-001",
      });

      const result = await runImport({
        stdin: stdinContent,
        projectRoot: testDir,
      });

      expect(result.success).toBe(true);
      expect(result.count).toBe(1);

      const fuda = getFuda(db, result.imported![0]);
      expect(fuda!.spiritType).toBe("tengu");
      expect(fuda!.priority).toBe(10);
      expect(fuda!.prdId).toBe("PRD-001");
    });
  });

  describe("mutual exclusivity", () => {
    test("returns error when both file and stdin are provided", async () => {
      const jsonPath = join(testDir, "import.json");
      writeFileSync(
        jsonPath,
        JSON.stringify({ title: "File fuda", description: "From file" })
      );

      const result = await runImport({
        file: jsonPath,
        stdin: JSON.stringify({ title: "Stdin fuda", description: "From stdin" }),
        projectRoot: testDir,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Cannot use both file and stdin");
    });

    test("returns error when neither file nor stdin are provided", async () => {
      const result = await runImport({
        projectRoot: testDir,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Must provide either file or stdin");
    });
  });

  describe("dry run mode", () => {
    test("supports dry run with stdin", async () => {
      const stdinContent = JSON.stringify([
        { title: "First", description: "First desc" },
        { title: "Second", description: "Second desc" },
      ]);

      const result = await runImport({
        stdin: stdinContent,
        dryRun: true,
        projectRoot: testDir,
      });

      expect(result.success).toBe(true);
      expect(result.count).toBe(2);
      expect(result.imported).toEqual(["First", "Second"]);

      // Verify nothing was actually created
      const allFuda = db
        .query("SELECT * FROM fuda")
        .all();
      expect(allFuda).toHaveLength(0);
    });
  });

  describe("error handling", () => {
    test("returns error when shiki not initialized", async () => {
      const uninitDir = mkdtempSync(join(tmpdir(), "shiki-uninit-"));

      try {
        const result = await runImport({
          stdin: JSON.stringify({ title: "Test", description: "Test" }),
          projectRoot: uninitDir,
        });

        expect(result.success).toBe(false);
        expect(result.error).toContain("not initialized");
      } finally {
        rmSync(uninitDir, { recursive: true, force: true });
      }
    });
  });
});
