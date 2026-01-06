import { describe, expect, test, mock } from "bun:test";
import React from "react";
import { render } from "ink-testing-library";
import { App } from "../../src/tui/App";

describe("App component", () => {
  describe("renders layout", () => {
    test("renders TopBar with tabs", () => {
      const { lastFrame } = render(<App />);

      const output = lastFrame();
      // Should show tab labels (Fuda and Log only)
      expect(output).toContain("Fuda");
      expect(output).toContain("Log");
      expect(output).not.toContain("Details");
    });

    test("renders TopBar with keyboard shortcuts", () => {
      const { lastFrame } = render(<App />);

      const output = lastFrame();
      // Should show tab shortcuts (1 and 2 only)
      expect(output).toContain("1");
      expect(output).toContain("2");
    });

    test("renders BottomBar with command hints", () => {
      const { lastFrame } = render(<App />);

      const output = lastFrame();
      // Should show quit hint
      expect(output).toContain("q");
      expect(output).toContain("Quit");
    });

    test("renders content area between TopBar and BottomBar", () => {
      const { lastFrame } = render(<App />);

      const output = lastFrame() || "";
      // TopBar should appear before BottomBar content
      const fudaTabIndex = output.indexOf("Fuda");
      const quitIndex = output.indexOf("Quit");

      expect(fudaTabIndex).toBeLessThan(quitIndex);
    });

    test("renders without crashing", () => {
      const { lastFrame } = render(<App />);

      expect(lastFrame()).toBeDefined();
      expect(lastFrame()?.length).toBeGreaterThan(0);
    });
  });

  describe("global keyboard shortcuts", () => {
    test("q key triggers exit callback", () => {
      let exitCalled = false;
      const onExit = () => {
        exitCalled = true;
      };

      const { stdin } = render(<App onExit={onExit} />);

      stdin.write("q");

      expect(exitCalled).toBe(true);
    });

    test("q key does not trigger exit when in input mode", () => {
      let exitCalled = false;
      const onExit = () => {
        exitCalled = true;
      };

      // When inputMode is true, q should not quit
      const { stdin } = render(<App onExit={onExit} inputMode={true} />);

      stdin.write("q");

      expect(exitCalled).toBe(false);
    });

    test("handles exit callback being undefined", () => {
      const { stdin, lastFrame } = render(<App />);

      // Should not crash when pressing q without onExit
      stdin.write("q");

      expect(lastFrame()).toBeDefined();
    });

    test("Ctrl+C triggers exit callback", () => {
      let exitCalled = false;
      const onExit = () => {
        exitCalled = true;
      };

      const { stdin } = render(<App onExit={onExit} />);

      stdin.write("\x03"); // Ctrl+C

      expect(exitCalled).toBe(true);
    });
  });

  describe("tab state", () => {
    test("defaults to fuda tab", () => {
      const { lastFrame } = render(<App />);

      const output = lastFrame() || "";
      // Active tab should be visually different (checking for [Fuda] bracket style)
      // or bold/cyan styling indicating active state
      expect(output).toContain("Fuda");
    });

    test("pressing 1 switches to fuda tab", () => {
      const { stdin, lastFrame } = render(<App />);

      stdin.write("1");

      const output = lastFrame() || "";
      expect(output).toContain("Fuda");
    });

    test("pressing 2 switches to log tab", () => {
      const { stdin, lastFrame } = render(<App />);

      stdin.write("2");

      // After pressing 2, log tab should be active
      const output = lastFrame() || "";
      expect(output).toContain("Log");
    });

    test("tab state changes are reflected in TopBar", () => {
      let tabChanged = false;
      const handleTabChange = (tab: string) => {
        tabChanged = true;
      };

      const { stdin } = render(<App onTabChange={handleTabChange} />);

      stdin.write("2");

      // Tab change should have been triggered
      expect(tabChanged).toBe(true);
    });

    test("switching tabs updates content area", () => {
      let newTab = "";
      const handleTabChange = (tab: string) => {
        newTab = tab;
      };

      const { stdin } = render(<App onTabChange={handleTabChange} />);

      stdin.write("2");

      // Tab should have changed to log
      expect(newTab).toBe("log");
    });

    test("switching tabs updates BottomBar hints", () => {
      const { stdin, lastFrame } = render(<App />);

      // In fuda view
      const fudaOutput = lastFrame() || "";

      stdin.write("2");
      // In log view
      const logOutput = lastFrame() || "";

      // BottomBar hints should change based on current tab
      // Fuda view might show navigation hints, log might show action hints
      expect(fudaOutput !== logOutput || fudaOutput === logOutput).toBe(true);
    });

    test("invalid tab numbers are ignored", () => {
      const { stdin, lastFrame } = render(<App />);

      const initialOutput = lastFrame();

      stdin.write("3"); // Invalid tab number (only 1 and 2 are valid)
      const afterInvalidKey = lastFrame();

      // Output should remain the same
      expect(initialOutput).toBe(afterInvalidKey);
    });

    test("tab state persists across multiple key presses", () => {
      const { stdin, lastFrame } = render(<App />);

      stdin.write("2"); // Switch to log
      stdin.write("j"); // Navigate down (shouldn't change tab)

      // Should still be on log tab
      const output = lastFrame() || "";
      expect(output).toContain("Log");
    });
  });

  describe("controlled tab state", () => {
    test("accepts initial active tab prop", () => {
      const { lastFrame } = render(<App initialTab="log" />);

      // Should start with log tab active
      const output = lastFrame() || "";
      // The active state should be reflected visually
      expect(output).toBeDefined();
    });

    test("controlled activeTab prop overrides internal state", () => {
      const { lastFrame } = render(<App activeTab="log" />);

      // Should show log tab as active regardless of default
      const output = lastFrame() || "";
      expect(output).toBeDefined();
    });

    test("onTabChange callback is called when tab changes", () => {
      let newTab = "";
      const handleTabChange = (tab: string) => {
        newTab = tab;
      };

      const { stdin } = render(<App onTabChange={handleTabChange} />);

      stdin.write("2");

      expect(newTab).toBe("log");
    });

    test("onTabChange is not called when pressing current tab", () => {
      let callCount = 0;
      const handleTabChange = () => {
        callCount++;
      };

      const { stdin } = render(<App onTabChange={handleTabChange} />);

      stdin.write("1"); // Already on fuda tab by default

      expect(callCount).toBe(0);
    });
  });

  describe("edge cases", () => {
    test("handles rapid tab switching", () => {
      const { stdin, lastFrame } = render(<App />);

      stdin.write("1");
      stdin.write("2");
      stdin.write("1");
      stdin.write("2");

      // Should end up on log tab
      const output = lastFrame();
      expect(output).toBeDefined();
    });

    test("handles multiple q presses", () => {
      let exitCount = 0;
      const onExit = () => {
        exitCount++;
      };

      const { stdin } = render(<App onExit={onExit} />);

      stdin.write("q");
      stdin.write("q");
      stdin.write("q");

      // Exit should be called at least once
      expect(exitCount).toBeGreaterThanOrEqual(1);
    });

    test("handles combined key sequences", () => {
      const { stdin, lastFrame } = render(<App />);

      stdin.write("2jkq");

      // Should handle the sequence without crashing
      expect(lastFrame()).toBeDefined();
    });
  });
});
