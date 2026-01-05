import { describe, expect, test } from "bun:test";
import { runLore, runInteractiveLore } from "../../src/cli/commands/lore";
import { LORE_ENTRIES, type LoreEntry } from "../../src/content/lore";

describe("lore command", () => {
  describe("listing all terms", () => {
    test("returns all lore entries when no term specified", async () => {
      const result = await runLore({});

      expect(result.success).toBe(true);
      expect(result.entries).toBeDefined();
      expect(result.entries!.length).toBeGreaterThan(0);
    });

    test("each entry has required fields", async () => {
      const result = await runLore({});

      expect(result.success).toBe(true);
      for (const entry of result.entries!) {
        expect(entry).toHaveProperty("term");
        expect(entry).toHaveProperty("brief");
        expect(entry).toHaveProperty("lore");
        expect(entry).toHaveProperty("category");
      }
    });

    test("entries are grouped by category", async () => {
      const result = await runLore({});

      expect(result.success).toBe(true);
      const categories = new Set(result.entries!.map((e) => e.category));
      expect(categories.size).toBeGreaterThan(1);
    });
  });

  describe("viewing specific term", () => {
    test("returns single entry when term specified", async () => {
      const result = await runLore({ term: "fuda" });

      expect(result.success).toBe(true);
      expect(result.entry).toBeDefined();
      expect(result.entry!.term).toBe("fuda");
    });

    test("returns detailed lore for known term", async () => {
      const result = await runLore({ term: "shikigami" });

      expect(result.success).toBe(true);
      expect(result.entry).toBeDefined();
      expect(result.entry!.lore.length).toBeGreaterThan(50);
    });

    test("returns error for unknown term", async () => {
      const result = await runLore({ term: "nonexistent" });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Unknown term");
    });

    test("term matching is case-insensitive", async () => {
      const result = await runLore({ term: "FUDA" });

      expect(result.success).toBe(true);
      expect(result.entry).toBeDefined();
      expect(result.entry!.term).toBe("fuda");
    });

    test("term matching works with partial matches", async () => {
      const result = await runLore({ term: "shiki" });

      expect(result.success).toBe(true);
      expect(result.entry).toBeDefined();
      // Should match shikigami
      expect(result.entry!.term).toBe("shikigami");
    });
  });

  describe("JSON output format", () => {
    test("returns JSON-serializable result for list", async () => {
      const result = await runLore({});

      const json = JSON.stringify(result);
      expect(json).toBeDefined();

      const parsed = JSON.parse(json);
      expect(parsed.success).toBe(true);
      expect(Array.isArray(parsed.entries)).toBe(true);
    });

    test("returns JSON-serializable result for single term", async () => {
      const result = await runLore({ term: "fuda" });

      const json = JSON.stringify(result);
      expect(json).toBeDefined();

      const parsed = JSON.parse(json);
      expect(parsed.success).toBe(true);
      expect(parsed.entry).toBeDefined();
    });
  });

  describe("lore content", () => {
    test("includes core terms: fuda, shikigami, tengu, kitsune", async () => {
      const result = await runLore({});

      expect(result.success).toBe(true);
      const terms = result.entries!.map((e) => e.term);
      expect(terms).toContain("fuda");
      expect(terms).toContain("shikigami");
      expect(terms).toContain("tengu");
      expect(terms).toContain("kitsune");
    });

    test("includes onmyoji term", async () => {
      const result = await runLore({});

      expect(result.success).toBe(true);
      const terms = result.entries!.map((e) => e.term);
      expect(terms).toContain("onmyoji");
    });

    test("only includes mythical lore (spirits and artifacts)", async () => {
      const result = await runLore({});

      expect(result.success).toBe(true);
      const categories = new Set(result.entries!.map((e) => e.category));
      expect(categories).toContain("spirits");
      expect(categories).toContain("artifacts");
      expect(categories.size).toBe(2);
    });
  });
});

describe("lore entries data", () => {
  test("LORE_ENTRIES is exported and non-empty", () => {
    expect(LORE_ENTRIES).toBeDefined();
    expect(Array.isArray(LORE_ENTRIES)).toBe(true);
    expect(LORE_ENTRIES.length).toBeGreaterThan(0);
  });

  test("each lore entry has evocative prose", () => {
    for (const entry of LORE_ENTRIES) {
      // Lore should be descriptive, at least 100 characters
      expect(entry.lore.length).toBeGreaterThanOrEqual(100);
    }
  });
});

describe("interactive lore mode", () => {
  test("handles user cancellation gracefully", async () => {
    // Simulate ExitPromptError from @inquirer/prompts
    const mockPrompt = async () => {
      const error = new Error("User force closed the prompt with SIGINT");
      error.name = "ExitPromptError";
      throw error;
    };

    const result = await runInteractiveLore(mockPrompt);

    expect(result.cancelled).toBe(true);
    expect(result.error).toBeUndefined();
  });

  test("returns selected entry on successful selection", async () => {
    const mockPrompt = async () => "fuda";

    const result = await runInteractiveLore(mockPrompt);

    expect(result.cancelled).toBe(false);
    expect(result.entry).toBeDefined();
    expect(result.entry!.term).toBe("fuda");
  });

  test("propagates unexpected errors", async () => {
    const mockPrompt = async () => {
      throw new Error("Unexpected error");
    };

    const result = await runInteractiveLore(mockPrompt);

    expect(result.cancelled).toBe(false);
    expect(result.error).toBe("Unexpected error");
  });
});
