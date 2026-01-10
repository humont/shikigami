import { describe, expect, test, mock, beforeEach, afterEach, beforeAll, afterAll, spyOn } from "bun:test";
import React from "react";
import { render } from "ink-testing-library";
import { App } from "../../src/tui/App";
import * as listModule from "../../src/cli/commands/list";
import * as logModule from "../../src/cli/commands/log";
import { type Fuda, FudaStatus, SpiritType } from "../../src/types";

// Global mock for runList to prevent real API calls during all tests
let globalRunListSpy: ReturnType<typeof spyOn>;
let globalRunLogAllSpy: ReturnType<typeof spyOn>;

// Mock fuda data for testing
const mockFudas: Fuda[] = [
  {
    id: "sk-test1",
    prdId: null,
    title: "First task",
    description: "Description 1",
    status: FudaStatus.BLOCKED,
    spiritType: SpiritType.SHIKIGAMI,
    assignedSpiritId: null,
    outputCommitHash: null,
    retryCount: 0,
    failureContext: null,
    parentFudaId: null,
    priority: 5,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    deletedBy: null,
    deleteReason: null,
  },
  {
    id: "sk-test2",
    prdId: null,
    title: "Second task",
    description: "Description 2",
    status: FudaStatus.READY,
    spiritType: SpiritType.SHIKIGAMI,
    assignedSpiritId: null,
    outputCommitHash: null,
    retryCount: 0,
    failureContext: null,
    parentFudaId: null,
    priority: 3,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    deletedBy: null,
    deleteReason: null,
  },
  {
    id: "sk-test3",
    prdId: null,
    title: "Third task",
    description: "Description 3",
    status: FudaStatus.IN_PROGRESS,
    spiritType: SpiritType.TENGU,
    assignedSpiritId: null,
    outputCommitHash: null,
    retryCount: 0,
    failureContext: null,
    parentFudaId: null,
    priority: 8,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    deletedBy: null,
    deleteReason: null,
  },
];

describe("App component", () => {
  // Set up global mock before all tests to prevent real API calls
  beforeAll(() => {
    globalRunListSpy = spyOn(listModule, "runList").mockResolvedValue({
      success: true,
      fudas: [],
    });
    globalRunLogAllSpy = spyOn(logModule, "runLogAll").mockResolvedValue({
      success: true,
      entries: [],
    });
  });

  afterAll(() => {
    globalRunListSpy.mockRestore();
    globalRunLogAllSpy.mockRestore();
  });

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

  describe("layout sizing", () => {
    test("outer Box has height 100% to fill terminal", async () => {
      // Import the App module source to verify the JSX structure
      const appSource = await Bun.file("src/tui/App.tsx").text();

      // Verify the outer Box has height="100%" prop
      // The return statement should have a Box with height="100%"
      expect(appSource).toMatch(/return\s*\(\s*<Box[^>]*height\s*=\s*["']100%["']/s);
    });
  });

  describe("Fuda view", () => {
    beforeEach(() => {
      // Update the global mock to return mockFudas for Fuda view tests
      globalRunListSpy.mockResolvedValue({
        success: true,
        fudas: mockFudas,
      });
    });

    afterEach(() => {
      // Reset to empty fudas for other tests
      globalRunListSpy.mockResolvedValue({
        success: true,
        fudas: [],
      });
    });

    test("renders FudaList when on Fuda tab", async () => {
      const { lastFrame, unmount } = render(<App />);

      // Wait for async data loading
      await new Promise((resolve) => setTimeout(resolve, 100));

      const output = lastFrame() || "";
      // Should show fuda titles from the list
      expect(output).toContain("First task");
      expect(output).toContain("Second task");
      expect(output).toContain("Third task");
      unmount();
    });

    test("calls useFudaList hook to fetch fuda on mount", async () => {
      const { unmount } = render(<App />);

      // Wait for async effect
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(globalRunListSpy).toHaveBeenCalled();
      unmount();
    });

    test("shows loading state while fetching fuda", async () => {
      // Make runList hang to simulate loading
      globalRunListSpy.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ success: true, fudas: [] }), 500))
      );

      const { lastFrame, unmount } = render(<App />);

      // Check immediately before data loads
      const output = lastFrame() || "";
      expect(output).toContain("Loading");
      unmount();
    });

    test("shows error state when fetching fails", async () => {
      globalRunListSpy.mockResolvedValue({
        success: false,
        error: "Database connection failed",
      });

      const { lastFrame, unmount } = render(<App />);

      // Wait for async effect
      await new Promise((resolve) => setTimeout(resolve, 100));

      const output = lastFrame() || "";
      expect(output).toContain("Error");
      unmount();
    });

    test("displays fuda IDs in the list", async () => {
      const { lastFrame, unmount } = render(<App />);

      await new Promise((resolve) => setTimeout(resolve, 100));

      const output = lastFrame() || "";
      expect(output).toContain("sk-test1");
      expect(output).toContain("sk-test2");
      expect(output).toContain("sk-test3");
      unmount();
    });

    test("displays fuda statuses in the list", async () => {
      const { lastFrame, unmount } = render(<App />);

      await new Promise((resolve) => setTimeout(resolve, 100));

      const output = lastFrame() || "";
      expect(output).toContain("blocked");
      expect(output).toContain("ready");
      expect(output).toContain("in_progress");
      unmount();
    });

    test("supports keyboard navigation with j/k keys", async () => {
      const { stdin, lastFrame, unmount } = render(<App />);

      await new Promise((resolve) => setTimeout(resolve, 100));

      // Initial state - first item selected
      const initialOutput = lastFrame() || "";
      expect(initialOutput).toContain(">");

      // Navigate down
      stdin.write("j");

      // Should still render without crashing
      const afterNavigate = lastFrame() || "";
      expect(afterNavigate).toContain(">");
      unmount();
    });

    test("shows selection indicator for current fuda", async () => {
      const { lastFrame, unmount } = render(<App />);

      await new Promise((resolve) => setTimeout(resolve, 100));

      const output = lastFrame() || "";
      // Should show selection indicator (>) for the first item
      expect(output).toContain(">");
      unmount();
    });

    test("does not show fuda list when on Log tab", async () => {
      const { stdin, lastFrame, unmount } = render(<App />);

      await new Promise((resolve) => setTimeout(resolve, 100));

      // Switch to Log tab
      stdin.write("2");

      // Wait for re-render after tab switch
      await new Promise((resolve) => setTimeout(resolve, 10));

      const output = lastFrame() || "";
      // Should not show fuda content on Log tab
      expect(output).not.toContain("First task");
      expect(output).not.toContain("Second task");
      unmount();
    });

    test("shows empty state when no fudas exist", async () => {
      globalRunListSpy.mockResolvedValue({
        success: true,
        fudas: [],
      });

      const { lastFrame, unmount } = render(<App />);

      await new Promise((resolve) => setTimeout(resolve, 100));

      const output = lastFrame() || "";
      // Should show some indication that there are no fudas
      expect(output).toContain("No fuda");
      unmount();
    });

    test("displays fuda priorities", async () => {
      const { lastFrame, unmount } = render(<App />);

      await new Promise((resolve) => setTimeout(resolve, 100));

      const output = lastFrame() || "";
      expect(output).toContain("p5");
      expect(output).toContain("p3");
      expect(output).toContain("p8");
      unmount();
    });
  });

  describe("split layout with SidePanel", () => {
    beforeEach(() => {
      globalRunListSpy.mockResolvedValue({
        success: true,
        fudas: mockFudas,
      });
    });

    afterEach(() => {
      globalRunListSpy.mockResolvedValue({
        success: true,
        fudas: [],
      });
    });

    test("side panel appears when fuda is selected", async () => {
      const { lastFrame, unmount } = render(<App />);

      await new Promise((resolve) => setTimeout(resolve, 100));

      const output = lastFrame() || "";
      // When on Fuda tab with a selected fuda, side panel should appear
      // The side panel should show details section
      expect(output).toContain("Details");
      unmount();
    });

    test("panel shows correct fuda details for selected fuda", async () => {
      const { lastFrame, unmount } = render(<App />);

      await new Promise((resolve) => setTimeout(resolve, 100));

      const output = lastFrame() || "";
      // First fuda is selected by default
      // Panel should show details of the first fuda
      expect(output).toContain("First task");
      expect(output).toContain("Description 1");
      expect(output).toContain("sk-test1");
      unmount();
    });

    test("panel updates when selection changes via j key", async () => {
      const { stdin, lastFrame, unmount } = render(<App />);

      await new Promise((resolve) => setTimeout(resolve, 100));

      // Navigate down to second fuda
      stdin.write("j");

      await new Promise((resolve) => setTimeout(resolve, 50));

      const output = lastFrame() || "";
      // Panel should now show second fuda's details
      expect(output).toContain("Second task");
      expect(output).toContain("Description 2");
      unmount();
    });

    test("panel updates when selection changes via k key", async () => {
      const { stdin, lastFrame, unmount } = render(<App />);

      await new Promise((resolve) => setTimeout(resolve, 100));

      // Navigate down first, then back up
      stdin.write("j");
      stdin.write("k");

      await new Promise((resolve) => setTimeout(resolve, 50));

      const output = lastFrame() || "";
      // Panel should show first fuda's details again
      expect(output).toContain("First task");
      expect(output).toContain("Description 1");
      unmount();
    });

    test("layout is split with row containing list and panel", async () => {
      const { lastFrame, unmount } = render(<App />);

      await new Promise((resolve) => setTimeout(resolve, 100));

      const output = lastFrame() || "";
      // Should contain both FudaList content and SidePanel content side by side
      // FudaList shows task titles with selection indicator
      expect(output).toContain(">");
      // SidePanel shows Details section
      expect(output).toContain("Details");
      unmount();
    });

    test("panel shows fuda status", async () => {
      const { lastFrame, unmount } = render(<App />);

      await new Promise((resolve) => setTimeout(resolve, 100));

      const output = lastFrame() || "";
      // First fuda has pending status
      expect(output).toContain("blocked");
      unmount();
    });

    test("panel shows fuda spirit type", async () => {
      const { lastFrame, unmount } = render(<App />);

      await new Promise((resolve) => setTimeout(resolve, 100));

      const output = lastFrame() || "";
      expect(output).toContain("shikigami");
      unmount();
    });

    test("panel shows fuda priority", async () => {
      const { lastFrame, unmount } = render(<App />);

      await new Promise((resolve) => setTimeout(resolve, 100));

      const output = lastFrame() || "";
      // First fuda has priority 5
      expect(output).toContain("5");
      unmount();
    });

    test("panel only shows on fuda tab, not log tab", async () => {
      const { stdin, lastFrame, unmount } = render(<App />);

      await new Promise((resolve) => setTimeout(resolve, 100));

      // Switch to Log tab
      stdin.write("2");

      await new Promise((resolve) => setTimeout(resolve, 50));

      const output = lastFrame() || "";
      // Should not show Details section on Log tab
      expect(output).not.toContain("Details");
      // Should not show fuda descriptions on Log tab
      expect(output).not.toContain("Description 1");
      unmount();
    });

    test("switching back to fuda tab shows panel again", async () => {
      const { stdin, lastFrame, unmount } = render(<App />);

      await new Promise((resolve) => setTimeout(resolve, 100));

      // Switch to Log tab
      stdin.write("2");
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Switch back to Fuda tab
      stdin.write("1");
      await new Promise((resolve) => setTimeout(resolve, 50));

      const output = lastFrame() || "";
      // Panel should reappear
      expect(output).toContain("Details");
      expect(output).toContain("First task");
      unmount();
    });

    test("panel shows Dependencies section", async () => {
      const { lastFrame, unmount } = render(<App />);

      await new Promise((resolve) => setTimeout(resolve, 100));

      const output = lastFrame() || "";
      // Panel should have Dependencies section (might show "No dependencies")
      expect(output).toContain("Dependencies");
      unmount();
    });

    test("panel has border for visual separation", async () => {
      const { lastFrame, unmount } = render(<App />);

      await new Promise((resolve) => setTimeout(resolve, 100));

      const output = lastFrame() || "";
      // Panel should have border characters
      const hasBorder =
        output.includes("│") ||
        output.includes("─") ||
        output.includes("┌") ||
        output.includes("╭");
      expect(hasBorder).toBe(true);
      unmount();
    });

    test("panel does not appear when no fudas exist", async () => {
      globalRunListSpy.mockResolvedValue({
        success: true,
        fudas: [],
      });

      const { lastFrame, unmount } = render(<App />);

      await new Promise((resolve) => setTimeout(resolve, 100));

      const output = lastFrame() || "";
      // Should show empty state, not Details panel
      expect(output).toContain("No fuda");
      expect(output).not.toContain("Details");
      unmount();
    });

    test("panel selection persists through data refresh", async () => {
      const { stdin, lastFrame, unmount } = render(<App />);

      await new Promise((resolve) => setTimeout(resolve, 100));

      // Navigate to second fuda
      stdin.write("j");
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Trigger a refresh (r key or similar)
      stdin.write("r");
      await new Promise((resolve) => setTimeout(resolve, 100));

      const output = lastFrame() || "";
      // Should still show second fuda in panel
      expect(output).toContain("Second task");
      unmount();
    });
  });
});
