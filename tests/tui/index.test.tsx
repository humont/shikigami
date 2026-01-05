import { describe, expect, test, mock, beforeEach, afterEach } from "bun:test";
import React from "react";

// Track render calls
let renderCalls: { component: React.ReactNode; options: any }[] = [];
let mockInstance = {
  unmount: mock(() => {}),
  waitUntilExit: mock(() => Promise.resolve()),
  clear: mock(() => {}),
};

// Mock the ink module before importing the entry point
mock.module("ink", () => ({
  render: mock((component: React.ReactNode, options?: any) => {
    renderCalls.push({ component, options });
    return mockInstance;
  }),
  Box: ({ children }: { children?: React.ReactNode }) => children,
  Text: ({ children }: { children?: React.ReactNode }) => children,
  useInput: mock(() => {}),
  useApp: mock(() => ({ exit: mock(() => {}) })),
}));

describe("TUI entry point", () => {
  beforeEach(() => {
    renderCalls = [];
    mockInstance = {
      unmount: mock(() => {}),
      waitUntilExit: mock(() => Promise.resolve()),
      clear: mock(() => {}),
    };
  });

  describe("render() is called", () => {
    test("calls ink render function when run is called", async () => {
      const { run } = await import("../../src/tui/index");

      await run();

      expect(renderCalls.length).toBe(1);
    });

    test("renders the App component", async () => {
      const { run } = await import("../../src/tui/index");
      const { App } = await import("../../src/tui/App");

      await run();

      expect(renderCalls.length).toBe(1);
      const rendered = renderCalls[0];
      // Check that the rendered component is an App element
      expect(rendered.component).toBeDefined();
      expect((rendered.component as React.ReactElement).type).toBe(App);
    });

    test("returns the render instance", async () => {
      const { run } = await import("../../src/tui/index");

      const instance = await run();

      expect(instance).toBeDefined();
      expect(instance.unmount).toBeDefined();
      expect(instance.waitUntilExit).toBeDefined();
    });
  });

  describe("fullscreen mode setup", () => {
    test("renders with fullscreen option enabled", async () => {
      const { run } = await import("../../src/tui/index");

      await run();

      expect(renderCalls.length).toBe(1);
      const options = renderCalls[0].options;
      expect(options).toBeDefined();
      expect(options.fullscreen).toBe(true);
    });

    test("passes exit handler to App component", async () => {
      const { run } = await import("../../src/tui/index");

      await run();

      expect(renderCalls.length).toBe(1);
      const rendered = renderCalls[0].component as React.ReactElement<{ onExit?: () => void }>;
      expect(rendered.props.onExit).toBeDefined();
      expect(typeof rendered.props.onExit).toBe("function");
    });

    test("exit handler calls unmount on the instance", async () => {
      const { run } = await import("../../src/tui/index");

      await run();

      expect(renderCalls.length).toBe(1);
      const rendered = renderCalls[0].component as React.ReactElement<{ onExit?: () => void }>;
      const onExit = rendered.props.onExit!;

      // Call the exit handler
      onExit();

      expect(mockInstance.unmount).toHaveBeenCalled();
    });
  });

  describe("edge cases", () => {
    test("handles multiple run calls", async () => {
      const { run } = await import("../../src/tui/index");

      await run();
      await run();

      expect(renderCalls.length).toBe(2);
    });
  });
});
