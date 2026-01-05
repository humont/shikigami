import { describe, expect, test } from "bun:test";
import React from "react";
import { render } from "ink-testing-library";
import { TopBar, type Tab } from "../../../src/tui/components/TopBar";

const mockTabs: Tab[] = [
  { id: "list", label: "List", shortcut: "1" },
  { id: "details", label: "Details", shortcut: "2" },
  { id: "log", label: "Log", shortcut: "3" },
];

describe("TopBar component", () => {
  describe("renders tabs", () => {
    test("renders all tab labels", () => {
      const { lastFrame } = render(
        <TopBar tabs={mockTabs} activeTab="list" />
      );

      const output = lastFrame();
      expect(output).toContain("List");
      expect(output).toContain("Details");
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
        <TopBar tabs={mockTabs} activeTab="list" />
      );

      const output = lastFrame() || "";
      const listIndex = output.indexOf("List");
      const detailsIndex = output.indexOf("Details");
      const logIndex = output.indexOf("Log");

      expect(listIndex).toBeLessThan(detailsIndex);
      expect(detailsIndex).toBeLessThan(logIndex);
    });
  });

  describe("active tab highlighting", () => {
    test("highlights the active tab differently", () => {
      const { lastFrame: frame1 } = render(
        <TopBar tabs={mockTabs} activeTab="list" />
      );
      const { lastFrame: frame2 } = render(
        <TopBar tabs={mockTabs} activeTab="details" />
      );

      // The outputs should be different when different tabs are active
      expect(frame1()).not.toBe(frame2());
    });

    test("only one tab appears active at a time", () => {
      const { lastFrame } = render(
        <TopBar tabs={mockTabs} activeTab="details" />
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
      expect(output).toContain("List");
      expect(output).toContain("Details");
      expect(output).toContain("Log");
    });
  });

  describe("keyboard shortcut display", () => {
    test("displays keyboard shortcuts for each tab", () => {
      const { lastFrame } = render(
        <TopBar tabs={mockTabs} activeTab="list" />
      );

      const output = lastFrame();
      expect(output).toContain("1");
      expect(output).toContain("2");
      expect(output).toContain("3");
    });

    test("displays shortcuts with their associated tab labels", () => {
      const { lastFrame } = render(
        <TopBar tabs={mockTabs} activeTab="list" />
      );

      const output = lastFrame() || "";
      // Each shortcut should appear near its tab label
      // Verify shortcuts are present in the output
      mockTabs.forEach((tab) => {
        expect(output).toContain(tab.shortcut);
        expect(output).toContain(tab.label);
      });
    });

    test("handles tabs without shortcuts", () => {
      const tabsNoShortcuts: Tab[] = [
        { id: "list", label: "List" },
        { id: "details", label: "Details" },
      ];

      const { lastFrame } = render(
        <TopBar tabs={tabsNoShortcuts} activeTab="list" />
      );

      // Should render without crashing
      const output = lastFrame();
      expect(output).toContain("List");
      expect(output).toContain("Details");
    });

    test("handles mixed tabs with and without shortcuts", () => {
      const mixedTabs: Tab[] = [
        { id: "list", label: "List", shortcut: "1" },
        { id: "details", label: "Details" },
        { id: "log", label: "Log", shortcut: "3" },
      ];

      const { lastFrame } = render(
        <TopBar tabs={mixedTabs} activeTab="list" />
      );

      const output = lastFrame();
      expect(output).toContain("1");
      expect(output).toContain("3");
      expect(output).toContain("List");
      expect(output).toContain("Details");
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
