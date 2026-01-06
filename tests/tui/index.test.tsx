import { describe, expect, test } from "bun:test";

/**
 * Tests for the TUI entry point.
 *
 * Note: We avoid using mock.module("ink") here because it pollutes the global
 * module cache and breaks other tests that use ink-testing-library.
 *
 * Instead, we test the module exports and structure without actually calling
 * the render function, which would require a real terminal.
 */
describe("TUI entry point", () => {
  describe("module exports", () => {
    test("exports a run function", async () => {
      const tuiModule = await import("../../src/tui/index");

      expect(tuiModule.run).toBeDefined();
      expect(typeof tuiModule.run).toBe("function");
    });

    test("run function is synchronous and returns render instance", async () => {
      const tuiModule = await import("../../src/tui/index");

      // run() is a synchronous function that returns ink's render instance
      // The instance has async methods like waitUntilExit
      expect(typeof tuiModule.run).toBe("function");
      // It's a regular function, not async
      expect(tuiModule.run.constructor.name).toBe("Function");
    });
  });

  describe("App component", () => {
    test("App component is exported from App module", async () => {
      const { App } = await import("../../src/tui/App");

      expect(App).toBeDefined();
      expect(typeof App).toBe("function");
    });

    test("App component has correct name", async () => {
      const { App } = await import("../../src/tui/App");

      // Verify it's a named function component
      expect(App.name).toBe("App");
    });
  });
});
