import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, rmSync, existsSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { runInit, runInitWithConfirmation } from "../../src/cli/commands/init";
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

  describe("appending to AGENTS.md/CLAUDE.md", () => {
    const SHIKIGAMI_SECTION = `## Shikigami Task Management

This project uses Shikigami for AI agent task orchestration.
See .shikigami/AGENT_INSTRUCTIONS.md for the agent workflow guide.

Key commands:
- \`shiki ready --json\` - Get tasks ready to work on
- \`shiki agent-guide\` - View full agent workflow documentation`;

    describe("with --yes flag (non-interactive)", () => {
      test("appends shikigami reference to existing AGENTS.md", async () => {
        const agentsPath = join(testDir, "AGENTS.md");
        writeFileSync(agentsPath, "# Agents\n\nExisting content.\n");

        await runInit({ projectRoot: testDir, yes: true });

        const content = readFileSync(agentsPath, "utf-8");
        expect(content).toContain("# Agents");
        expect(content).toContain("Existing content.");
        expect(content).toContain("Shikigami Task Management");
        expect(content).toContain(".shikigami/AGENT_INSTRUCTIONS.md");
      });

      test("appends shikigami reference to existing CLAUDE.md", async () => {
        const claudePath = join(testDir, "CLAUDE.md");
        writeFileSync(claudePath, "# Claude Instructions\n\nBe helpful.\n");

        await runInit({ projectRoot: testDir, yes: true });

        const content = readFileSync(claudePath, "utf-8");
        expect(content).toContain("# Claude Instructions");
        expect(content).toContain("Be helpful.");
        expect(content).toContain("Shikigami Task Management");
      });

      test("appends to both AGENTS.md and CLAUDE.md if both exist", async () => {
        writeFileSync(join(testDir, "AGENTS.md"), "# Agents\n");
        writeFileSync(join(testDir, "CLAUDE.md"), "# Claude\n");

        const result = await runInit({ projectRoot: testDir, yes: true });

        expect(result.success).toBe(true);
        expect(readFileSync(join(testDir, "AGENTS.md"), "utf-8")).toContain("Shikigami");
        expect(readFileSync(join(testDir, "CLAUDE.md"), "utf-8")).toContain("Shikigami");
      });

      test("creates AGENTS.md if it does not exist", async () => {
        const agentsPath = join(testDir, "AGENTS.md");
        expect(existsSync(agentsPath)).toBe(false);

        await runInit({ projectRoot: testDir, yes: true });

        expect(existsSync(agentsPath)).toBe(true);
        const content = readFileSync(agentsPath, "utf-8");
        expect(content).toContain("Shikigami Task Management");
      });

      test("does not create CLAUDE.md if it does not exist", async () => {
        // CLAUDE.md is only modified if it already exists
        const claudePath = join(testDir, "CLAUDE.md");
        expect(existsSync(claudePath)).toBe(false);

        await runInit({ projectRoot: testDir, yes: true });

        // CLAUDE.md should not be created (only AGENTS.md is created)
        expect(existsSync(claudePath)).toBe(false);
      });
    });

    describe("skipping if already contains shikigami", () => {
      test("skips AGENTS.md if it already contains shikigami reference", async () => {
        const agentsPath = join(testDir, "AGENTS.md");
        const originalContent = "# Agents\n\n## Shikigami\n\nAlready configured.\n";
        writeFileSync(agentsPath, originalContent);

        await runInit({ projectRoot: testDir, yes: true });

        const content = readFileSync(agentsPath, "utf-8");
        // Should not have duplicate shikigami sections
        expect(content).toBe(originalContent);
      });

      test("skips CLAUDE.md if it already contains shikigami reference", async () => {
        const claudePath = join(testDir, "CLAUDE.md");
        const originalContent = "# Claude\n\nUse shikigami for tasks.\n";
        writeFileSync(claudePath, originalContent);

        await runInit({ projectRoot: testDir, yes: true });

        const content = readFileSync(claudePath, "utf-8");
        expect(content).toBe(originalContent);
      });

      test("case-insensitive check for shikigami", async () => {
        const agentsPath = join(testDir, "AGENTS.md");
        const originalContent = "# Agents\n\nSHIKIGAMI is configured.\n";
        writeFileSync(agentsPath, originalContent);

        await runInit({ projectRoot: testDir, yes: true });

        const content = readFileSync(agentsPath, "utf-8");
        expect(content).toBe(originalContent);
      });
    });

    describe("--no-agent-docs flag", () => {
      test("does not append to AGENTS.md when --no-agent-docs is set", async () => {
        const agentsPath = join(testDir, "AGENTS.md");
        const originalContent = "# Agents\n";
        writeFileSync(agentsPath, originalContent);

        await runInit({ projectRoot: testDir, noAgentDocs: true });

        const content = readFileSync(agentsPath, "utf-8");
        expect(content).toBe(originalContent);
        expect(content).not.toContain("Shikigami");
      });

      test("does not append to CLAUDE.md when --no-agent-docs is set", async () => {
        const claudePath = join(testDir, "CLAUDE.md");
        const originalContent = "# Claude\n";
        writeFileSync(claudePath, originalContent);

        await runInit({ projectRoot: testDir, noAgentDocs: true });

        const content = readFileSync(claudePath, "utf-8");
        expect(content).toBe(originalContent);
      });

      test("does not create AGENTS.md when --no-agent-docs is set", async () => {
        await runInit({ projectRoot: testDir, noAgentDocs: true });

        expect(existsSync(join(testDir, "AGENTS.md"))).toBe(false);
      });
    });

    describe("default behavior (no --yes flag)", () => {
      test("does not modify AGENTS.md without --yes flag", async () => {
        const agentsPath = join(testDir, "AGENTS.md");
        const originalContent = "# Agents\n";
        writeFileSync(agentsPath, originalContent);

        await runInit({ projectRoot: testDir });

        const content = readFileSync(agentsPath, "utf-8");
        expect(content).toBe(originalContent);
      });

      test("does not create AGENTS.md without --yes flag", async () => {
        await runInit({ projectRoot: testDir });

        expect(existsSync(join(testDir, "AGENTS.md"))).toBe(false);
      });
    });

    describe("result reporting", () => {
      test("reports which files were modified in result", async () => {
        writeFileSync(join(testDir, "AGENTS.md"), "# Agents\n");
        writeFileSync(join(testDir, "CLAUDE.md"), "# Claude\n");

        const result = await runInit({ projectRoot: testDir, yes: true });

        expect(result.success).toBe(true);
        expect(result.agentDocsModified).toBeDefined();
        expect(result.agentDocsModified).toContain("AGENTS.md");
        expect(result.agentDocsModified).toContain("CLAUDE.md");
      });

      test("reports created files separately from modified", async () => {
        // No existing files
        const result = await runInit({ projectRoot: testDir, yes: true });

        expect(result.success).toBe(true);
        expect(result.agentDocsCreated).toBeDefined();
        expect(result.agentDocsCreated).toContain("AGENTS.md");
      });

      test("reports skipped files", async () => {
        writeFileSync(join(testDir, "AGENTS.md"), "# Agents\n\nShikigami already here.\n");

        const result = await runInit({ projectRoot: testDir, yes: true });

        expect(result.success).toBe(true);
        expect(result.agentDocsSkipped).toBeDefined();
        expect(result.agentDocsSkipped).toContain("AGENTS.md");
      });
    });
  });

  describe(".gitignore handling", () => {
    test("appends .shikigami/ to existing .gitignore with header comment", async () => {
      const gitignorePath = join(testDir, ".gitignore");
      writeFileSync(gitignorePath, "node_modules/\n.env\n");

      await runInit({ projectRoot: testDir });

      const content = readFileSync(gitignorePath, "utf-8");
      expect(content).toContain("node_modules/");
      expect(content).toContain("# Shikigami");
      expect(content).toContain(".shikigami/");
    });

    test("does not create .gitignore if it does not exist", async () => {
      const gitignorePath = join(testDir, ".gitignore");
      expect(existsSync(gitignorePath)).toBe(false);

      await runInit({ projectRoot: testDir });

      expect(existsSync(gitignorePath)).toBe(false);
    });

    test("skips .gitignore if it already contains .shikigami", async () => {
      const gitignorePath = join(testDir, ".gitignore");
      const originalContent = "node_modules/\n.shikigami/\n";
      writeFileSync(gitignorePath, originalContent);

      await runInit({ projectRoot: testDir });

      const content = readFileSync(gitignorePath, "utf-8");
      expect(content).toBe(originalContent);
    });

    test("handles .gitignore with .shikigami without trailing slash", async () => {
      const gitignorePath = join(testDir, ".gitignore");
      const originalContent = "node_modules/\n.shikigami\n";
      writeFileSync(gitignorePath, originalContent);

      await runInit({ projectRoot: testDir });

      const content = readFileSync(gitignorePath, "utf-8");
      expect(content).toBe(originalContent);
    });

    test("reports gitignoreModified in result", async () => {
      const gitignorePath = join(testDir, ".gitignore");
      writeFileSync(gitignorePath, "node_modules/\n");

      const result = await runInit({ projectRoot: testDir });

      expect(result.success).toBe(true);
      expect(result.gitignoreModified).toBe(true);
    });

    test("does not report gitignoreModified if .gitignore does not exist", async () => {
      const result = await runInit({ projectRoot: testDir });

      expect(result.success).toBe(true);
      expect(result.gitignoreModified).toBeUndefined();
    });

    test("does not report gitignoreModified if already contains .shikigami", async () => {
      const gitignorePath = join(testDir, ".gitignore");
      writeFileSync(gitignorePath, ".shikigami/\n");

      const result = await runInit({ projectRoot: testDir });

      expect(result.success).toBe(true);
      expect(result.gitignoreModified).toBeUndefined();
    });

    test("adds newline before .shikigami if .gitignore does not end with newline", async () => {
      const gitignorePath = join(testDir, ".gitignore");
      writeFileSync(gitignorePath, "node_modules/");

      await runInit({ projectRoot: testDir });

      const content = readFileSync(gitignorePath, "utf-8");
      expect(content).toContain("node_modules/\n");
      expect(content).toContain("# Shikigami");
      expect(content).toContain(".shikigami/");
    });
  });

  describe("--force confirmation prompt", () => {
    test("prompts for confirmation before wiping db with --force", async () => {
      // First init
      await runInit({ projectRoot: testDir });

      let promptWasCalled = false;
      let receivedMessage = "";

      const mockConfirm = async (message: string) => {
        promptWasCalled = true;
        receivedMessage = message;
        return "y";
      };

      await runInitWithConfirmation({
        projectRoot: testDir,
        force: true,
        confirmFn: mockConfirm,
      });

      expect(promptWasCalled).toBe(true);
      expect(receivedMessage).toBeTruthy();
    });

    test("confirmation message clearly states database will be wiped", async () => {
      await runInit({ projectRoot: testDir });

      let receivedMessage = "";

      const mockConfirm = async (message: string) => {
        receivedMessage = message;
        return "y";
      };

      await runInitWithConfirmation({
        projectRoot: testDir,
        force: true,
        confirmFn: mockConfirm,
      });

      expect(receivedMessage.toLowerCase()).toContain("wipe");
      expect(receivedMessage.toLowerCase()).toContain("database");
    });

    test("confirmation message includes explicit warning for AI agents", async () => {
      await runInit({ projectRoot: testDir });

      let receivedMessage = "";

      const mockConfirm = async (message: string) => {
        receivedMessage = message;
        return "y";
      };

      await runInitWithConfirmation({
        projectRoot: testDir,
        force: true,
        confirmFn: mockConfirm,
      });

      expect(receivedMessage).toContain("WARNING");
      expect(receivedMessage).toContain("permanently delete all fuda data");
      expect(receivedMessage).toContain("AI agents should NOT proceed without explicit user approval");
    });

    test("answering 'y' proceeds with init", async () => {
      await runInit({ projectRoot: testDir });

      const mockConfirm = async () => "y";

      const result = await runInitWithConfirmation({
        projectRoot: testDir,
        force: true,
        confirmFn: mockConfirm,
      });

      expect(result.success).toBe(true);
      expect(existsSync(join(testDir, ".shikigami", "shiki.db"))).toBe(true);
    });

    test("answering 'n' aborts the operation", async () => {
      await runInit({ projectRoot: testDir });

      const mockConfirm = async () => "n";

      const result = await runInitWithConfirmation({
        projectRoot: testDir,
        force: true,
        confirmFn: mockConfirm,
      });

      expect(result.success).toBe(false);
      expect(result.aborted).toBe(true);
      expect(result.error).toContain("aborted");
    });

    test("answering anything other than 'y' aborts the operation", async () => {
      await runInit({ projectRoot: testDir });

      for (const answer of ["no", "N", "yes", "maybe", "", " "]) {
        const mockConfirm = async () => answer;

        const result = await runInitWithConfirmation({
          projectRoot: testDir,
          force: true,
          confirmFn: mockConfirm,
        });

        expect(result.success).toBe(false);
        expect(result.aborted).toBe(true);
      }
    });

    test("--yes flag skips confirmation prompt", async () => {
      await runInit({ projectRoot: testDir });

      let promptWasCalled = false;

      const mockConfirm = async () => {
        promptWasCalled = true;
        return "y";
      };

      const result = await runInitWithConfirmation({
        projectRoot: testDir,
        force: true,
        yes: true,
        confirmFn: mockConfirm,
      });

      expect(promptWasCalled).toBe(false);
      expect(result.success).toBe(true);
    });

    test("--json mode without --yes flag returns error", async () => {
      await runInit({ projectRoot: testDir });

      const result = await runInitWithConfirmation({
        projectRoot: testDir,
        force: true,
        json: true,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("--yes");
      expect(result.error).toContain("--json");
    });

    test("--json mode with --yes flag proceeds without prompt", async () => {
      await runInit({ projectRoot: testDir });

      let promptWasCalled = false;

      const mockConfirm = async () => {
        promptWasCalled = true;
        return "y";
      };

      const result = await runInitWithConfirmation({
        projectRoot: testDir,
        force: true,
        yes: true,
        json: true,
        confirmFn: mockConfirm,
      });

      expect(promptWasCalled).toBe(false);
      expect(result.success).toBe(true);
    });

    test("does not prompt when --force is not used", async () => {
      let promptWasCalled = false;

      const mockConfirm = async () => {
        promptWasCalled = true;
        return "y";
      };

      const result = await runInitWithConfirmation({
        projectRoot: testDir,
        confirmFn: mockConfirm,
      });

      expect(promptWasCalled).toBe(false);
      expect(result.success).toBe(true);
    });

    test("handles user cancellation (Ctrl+C) gracefully", async () => {
      await runInit({ projectRoot: testDir });

      const mockConfirm = async () => {
        const error = new Error("User force closed the prompt with SIGINT");
        error.name = "ExitPromptError";
        throw error;
      };

      const result = await runInitWithConfirmation({
        projectRoot: testDir,
        force: true,
        confirmFn: mockConfirm,
      });

      expect(result.success).toBe(false);
      expect(result.cancelled).toBe(true);
    });
  });
});
