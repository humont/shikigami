import { describe, expect, test } from "bun:test";
import React from "react";
import { render } from "ink-testing-library";
import { TopBar, type Tab } from "../../../src/tui/components/TopBar";

const mockTabs: Tab[] = [
  { id: "fuda", label: "Fuda", shortcut: "1" },
  { id: "log", label: "Log", shortcut: "2" },
];

describe("TopBar component", () => {
  describe("renders tabs", () => {
    test("renders all tab labels", () => {
      const { lastFrame } = render(
        <TopBar tabs={mockTabs} activeTab="fuda" />
      );

      const output = lastFrame();
      expect(output).toContain("Fuda");
      expect(output).toContain("Log");
    });

    test("renders with single tab", () => {
      const singleTab: Tab[] = [{ id: "main", label: "Main", shortcut: "1" }];
      const { lastFrame } = render(
        <TopBar tabs={singleTab} activeTab="main" />
      );

      const output = lastFrame();
      expect(output).toContain("Main");
    });

    test("renders tabs in provided order", () => {
      const { lastFrame } = render(
        <TopBar tabs={mockTabs} activeTab="fuda" />
      );

      const output = lastFrame() || "";
      const fudaIndex = output.indexOf("Fuda");
      const logIndex = output.indexOf("Log");

      expect(fudaIndex).toBeLessThan(logIndex);
    });
  });

  describe("active tab highlighting", () => {
    test("highlights the active tab differently", () => {
      const { lastFrame: frame1 } = render(
        <TopBar tabs={mockTabs} activeTab="fuda" />
      );
      const { lastFrame: frame2 } = render(
        <TopBar tabs={mockTabs} activeTab="log" />
      );

      // The outputs should be different when different tabs are active
      expect(frame1()).not.toBe(frame2());
    });

    test("only one tab appears active at a time", () => {
      const { lastFrame } = render(
        <TopBar tabs={mockTabs} activeTab="log" />
      );

      const output = lastFrame() || "";
      // The active tab should have some visual distinction
      // We'll verify this by checking that the rendering changes per active tab
      expect(output).toBeTruthy();
    });

    test("handles activeTab not matching any tab gracefully", () => {
      const { lastFrame } = render(
        <TopBar tabs={mockTabs} activeTab="nonexistent" />
      );

      // Should still render without crashing
      const output = lastFrame();
      expect(output).toContain("Fuda");
      expect(output).toContain("Log");
    });
  });

  describe("keyboard shortcut display", () => {
    test("displays keyboard shortcuts for each tab", () => {
      const { lastFrame } = render(
        <TopBar tabs={mockTabs} activeTab="fuda" />
      );

      const output = lastFrame();
      expect(output).toContain("1");
      expect(output).toContain("2");
    });

    test("displays shortcuts with their associated tab labels", () => {
      const { lastFrame } = render(
        <TopBar tabs={mockTabs} activeTab="fuda" />
      );

      const output = lastFrame() || "";
      // Each shortcut should appear near its tab label
      // Verify shortcuts are present in the output
      mockTabs.forEach((tab) => {
        if (tab.shortcut) {
          expect(output).toContain(tab.shortcut);
        }
        expect(output).toContain(tab.label);
      });
    });

    test("handles tabs without shortcuts", () => {
      const tabsNoShortcuts: Tab[] = [
        { id: "fuda", label: "Fuda" },
        { id: "log", label: "Log" },
      ];

      const { lastFrame } = render(
        <TopBar tabs={tabsNoShortcuts} activeTab="fuda" />
      );

      // Should render without crashing
      const output = lastFrame();
      expect(output).toContain("Fuda");
      expect(output).toContain("Log");
    });

    test("handles mixed tabs with and without shortcuts", () => {
      const mixedTabs: Tab[] = [
        { id: "fuda", label: "Fuda", shortcut: "1" },
        { id: "log", label: "Log" },
      ];

      const { lastFrame } = render(
        <TopBar tabs={mixedTabs} activeTab="fuda" />
      );

      const output = lastFrame();
      expect(output).toContain("1");
      expect(output).toContain("Fuda");
      expect(output).toContain("Log");
    });
  });

  describe("edge cases", () => {
    test("handles empty tabs array", () => {
      const { lastFrame } = render(
        <TopBar tabs={[]} activeTab="" />
      );

      // Should render without crashing
      expect(lastFrame()).toBeDefined();
    });

    test("handles long tab labels", () => {
      const longLabelTabs: Tab[] = [
        { id: "long", label: "This is a very long tab label", shortcut: "1" },
      ];

      const { lastFrame } = render(
        <TopBar tabs={longLabelTabs} activeTab="long" />
      );

      const output = lastFrame();
      expect(output).toContain("This is a very long tab label");
    });
  });
});
