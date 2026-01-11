import { describe, expect, test } from "bun:test";
import { runCli } from "./helpers";

describe("CLI help output", () => {
  describe("main help", () => {
    test("shows all top-level commands", async () => {
      const result = await runCli(["--help"]);

      expect(result.exitCode).toBe(0);

      const commands = [
        "init",
        "add",
        "show",
        "update",
        "start",
        "finish",
        "fail",
        "remove",
        "ready",
        "list",
        "status",
        "deps",
        "import",
        "log",
        "ledger",
        "search",
        "agent-guide",
        "upgrade",
        "lore",
      ];

      for (const cmd of commands) {
        expect(result.stdout).toContain(cmd);
      }
    });

    test("documents global --json flag", async () => {
      const result = await runCli(["--help"]);

      expect(result.stdout).toMatch(/--json/);
    });
  });

  describe("command descriptions", () => {
    test("each command has a description", async () => {
      const result = await runCli(["--help"]);

      // Each command line should have command name followed by description text
      const commandPatterns = [
        /init\s+.+/,
        /add\s+.+/,
        /show\s+.+/,
        /update\s+.+/,
        /start\s+.+/,
        /finish\s+.+/,
        /fail\s+.+/,
        /remove\s+.+/,
        /ready\s+.+/,
        /list\s+.+/,
        /status\s+.+/,
        /deps\s+.+/,
        /import\s+.+/,
        /log\s+.+/,
        /ledger\s+.+/,
        /search\s+.+/,
        /agent-guide\s+.+/,
        /upgrade\s+.+/,
        /lore\s+.+/,
      ];

      for (const pattern of commandPatterns) {
        expect(result.stdout).toMatch(pattern);
      }
    });
  });

  describe("subcommands", () => {
    test("deps subcommands appear in deps --help", async () => {
      const result = await runCli(["deps", "--help"]);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("add");
      expect(result.stdout).toContain("remove");
      expect(result.stdout).toContain("tree");
      expect(result.stdout).toContain("blocked");
    });

    test("deps subcommands have descriptions", async () => {
      const result = await runCli(["deps", "--help"]);

      expect(result.stdout).toMatch(/add\s+.+/);
      expect(result.stdout).toMatch(/remove\s+.+/);
      expect(result.stdout).toMatch(/tree\s+.+/);
      expect(result.stdout).toMatch(/blocked\s+.+/);
    });

    test("ledger subcommands appear in ledger --help", async () => {
      const result = await runCli(["ledger", "--help"]);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("add");
    });

    test("ledger add subcommand has description", async () => {
      const result = await runCli(["ledger", "--help"]);

      expect(result.stdout).toMatch(/add\s+.+/);
    });
  });
});
