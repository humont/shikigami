import { describe, expect, test } from "bun:test";
import React from "react";
import { render } from "ink-testing-library";
import {
  BottomBar,
  type CommandHint,
  type ViewContext,
} from "../../../src/tui/components/BottomBar";

const mockHints: CommandHint[] = [
  { key: "q", description: "Quit" },
  { key: "j/k", description: "Navigate" },
  { key: "Enter", description: "Select" },
];

describe("BottomBar component", () => {
  describe("renders command hints", () => {
    test("renders all hint keys", () => {
      const { lastFrame } = render(<BottomBar hints={mockHints} />);

      const output = lastFrame();
      expect(output).toContain("q");
      expect(output).toContain("j/k");
      expect(output).toContain("Enter");
    });

    test("renders all hint descriptions", () => {
      const { lastFrame } = render(<BottomBar hints={mockHints} />);

      const output = lastFrame();
      expect(output).toContain("Quit");
      expect(output).toContain("Navigate");
      expect(output).toContain("Select");
    });

    test("renders with single hint", () => {
      const singleHint: CommandHint[] = [{ key: "Esc", description: "Back" }];
      const { lastFrame } = render(<BottomBar hints={singleHint} />);

      const output = lastFrame();
      expect(output).toContain("Esc");
      expect(output).toContain("Back");
    });

    test("renders hints in provided order", () => {
      const { lastFrame } = render(<BottomBar hints={mockHints} />);

      const output = lastFrame() || "";
      const quitIndex = output.indexOf("Quit");
      const navigateIndex = output.indexOf("Navigate");
      const selectIndex = output.indexOf("Select");

      expect(quitIndex).toBeLessThan(navigateIndex);
      expect(navigateIndex).toBeLessThan(selectIndex);
    });

    test("associates keys with their descriptions", () => {
      const { lastFrame } = render(<BottomBar hints={mockHints} />);

      const output = lastFrame() || "";
      // Each key should appear near its description
      mockHints.forEach((hint) => {
        expect(output).toContain(hint.key);
        expect(output).toContain(hint.description);
      });
    });
  });

  describe("context-aware hints", () => {
    const listViewHints: CommandHint[] = [
      { key: "j/k", description: "Navigate" },
      { key: "Enter", description: "View details" },
      { key: "s", description: "Start fuda" },
    ];

    const detailsViewHints: CommandHint[] = [
      { key: "Esc", description: "Back to list" },
      { key: "e", description: "Edit" },
      { key: "d", description: "Mark done" },
    ];

    test("renders different hints based on view context", () => {
      const { lastFrame: listFrame } = render(
        <BottomBar hints={listViewHints} view="list" />
      );
      const { lastFrame: detailsFrame } = render(
        <BottomBar hints={detailsViewHints} view="details" />
      );

      expect(listFrame()).toContain("Navigate");
      expect(listFrame()).toContain("View details");
      expect(listFrame()).not.toContain("Back to list");

      expect(detailsFrame()).toContain("Back to list");
      expect(detailsFrame()).toContain("Edit");
      expect(detailsFrame()).not.toContain("Navigate");
    });

    test("updates hints when view changes", () => {
      const { lastFrame: frame1 } = render(
        <BottomBar hints={listViewHints} view="list" />
      );
      const { lastFrame: frame2 } = render(
        <BottomBar hints={detailsViewHints} view="details" />
      );

      // The outputs should be different when different views are active
      expect(frame1()).not.toBe(frame2());
    });

    test("handles view prop being undefined", () => {
      const { lastFrame } = render(<BottomBar hints={mockHints} />);

      // Should render without crashing
      const output = lastFrame();
      expect(output).toContain("q");
      expect(output).toContain("Quit");
    });

    test("handles all supported view contexts", () => {
      const views: ViewContext[] = ["list", "details", "log"];

      views.forEach((view) => {
        const { lastFrame } = render(<BottomBar hints={mockHints} view={view} />);
        expect(lastFrame()).toBeDefined();
      });
    });
  });

  describe("edge cases", () => {
    test("handles empty hints array", () => {
      const { lastFrame } = render(<BottomBar hints={[]} />);

      // Should render without crashing
      expect(lastFrame()).toBeDefined();
    });

    test("handles long key combinations", () => {
      const longKeyHints: CommandHint[] = [
        { key: "Ctrl+Shift+P", description: "Command palette" },
      ];

      const { lastFrame } = render(<BottomBar hints={longKeyHints} />);

      const output = lastFrame();
      expect(output).toContain("Ctrl+Shift+P");
      expect(output).toContain("Command palette");
    });

    test("handles long descriptions", () => {
      const longDescHints: CommandHint[] = [
        { key: "h", description: "Show help and available commands" },
      ];

      const { lastFrame } = render(<BottomBar hints={longDescHints} />);

      const output = lastFrame();
      expect(output).toContain("Show help and available commands");
    });

    test("handles many hints", () => {
      const manyHints: CommandHint[] = [
        { key: "1", description: "One" },
        { key: "2", description: "Two" },
        { key: "3", description: "Three" },
        { key: "4", description: "Four" },
        { key: "5", description: "Five" },
        { key: "6", description: "Six" },
      ];

      const { lastFrame } = render(<BottomBar hints={manyHints} />);

      const output = lastFrame();
      manyHints.forEach((hint) => {
        expect(output).toContain(hint.key);
        expect(output).toContain(hint.description);
      });
    });

    test("handles special characters in keys", () => {
      const specialKeyHints: CommandHint[] = [
        { key: "?", description: "Help" },
        { key: "/", description: "Search" },
      ];

      const { lastFrame } = render(<BottomBar hints={specialKeyHints} />);

      const output = lastFrame();
      expect(output).toContain("?");
      expect(output).toContain("/");
    });
  });
});
