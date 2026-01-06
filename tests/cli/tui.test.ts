import { describe, expect, test, mock, beforeEach } from "bun:test";

// Track TUI run calls
let runCalls: any[] = [];
let mockInstance = {
  unmount: mock(() => {}),
  waitUntilExit: mock(() => Promise.resolve()),
};

// Mock the TUI module before importing the command
mock.module("../../src/tui/index", () => ({
  run: mock(() => {
    runCalls.push({});
    return mockInstance;
  }),
}));

describe("tui command", () => {
  beforeEach(() => {
    runCalls = [];
    mockInstance = {
      unmount: mock(() => {}),
      waitUntilExit: mock(() => Promise.resolve()),
    };
  });

  describe("command registration", () => {
    test("tui command is registered in CLI", async () => {
      // Use subprocess to check CLI help output without importing
      const proc = Bun.spawn(["bun", "run", "src/cli/index.ts", "--help"], {
        cwd: process.cwd(),
        stdout: "pipe",
        stderr: "pipe",
      });
      const output = await new Response(proc.stdout).text();
      await proc.exited;

      expect(output).toContain("tui");
    });

    test("tui command has description about launching TUI", async () => {
      const proc = Bun.spawn(["bun", "run", "src/cli/index.ts", "--help"], {
        cwd: process.cwd(),
        stdout: "pipe",
        stderr: "pipe",
      });
      const output = await new Response(proc.stdout).text();
      await proc.exited;

      // The help output should show tui with a description mentioning TUI/interface
      expect(output).toMatch(/tui\s+.*(?:TUI|interface)/i);
    });
  });

  describe("launches TUI entry point", () => {
    test("runTui calls the TUI run function", async () => {
      const { runTui } = await import("../../src/cli/commands/tui");

      await runTui();

      expect(runCalls.length).toBe(1);
    });

    test("runTui returns success result", async () => {
      const { runTui } = await import("../../src/cli/commands/tui");

      const result = await runTui();

      expect(result.success).toBe(true);
    });

    test("runTui returns the TUI instance", async () => {
      const { runTui } = await import("../../src/cli/commands/tui");

      const result = await runTui();

      expect(result.instance).toBeDefined();
      expect(result.instance.unmount).toBeDefined();
    });
  });

  describe("error handling", () => {
    test("returns error when TUI fails to launch", async () => {
      // Override mock to throw an error
      mock.module("../../src/tui/index", () => ({
        run: mock(() => {
          throw new Error("Failed to initialize TUI");
        }),
      }));

      // Clear module cache to pick up new mock
      delete require.cache[require.resolve("../../src/cli/commands/tui")];

      const { runTui } = await import("../../src/cli/commands/tui");

      const result = await runTui();

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});
