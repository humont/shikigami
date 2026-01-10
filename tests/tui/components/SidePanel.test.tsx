import { describe, expect, test } from "bun:test";
import React from "react";
import { render } from "ink-testing-library";
import { SidePanel } from "../../../src/tui/components/SidePanel";
import { type Fuda, FudaStatus, SpiritType, DependencyType } from "../../../src/types";
import { type DependencyNode } from "../../../src/tui/components/DependencyTree";

// Mock fuda data for testing
const mockFuda: Fuda = {
  id: "sk-test1",
  prdId: "PRD-456",
  title: "Test fuda title",
  description: "This is a detailed description of the fuda",
  status: FudaStatus.IN_PROGRESS,
  spiritType: SpiritType.SHIKIGAMI,
  assignedSpiritId: "spirit-abc",
  outputCommitHash: "abc1234",
  retryCount: 2,
  failureContext: "Previous error message",
  parentFudaId: "sk-parent",
  priority: 7,
  createdAt: new Date("2026-01-01T10:00:00Z"),
  updatedAt: new Date("2026-01-05T15:30:00Z"),
  deletedAt: null,
  deletedBy: null,
  deleteReason: null,
};

const mockBlockers: DependencyNode[] = [
  {
    id: "sk-blocker1",
    title: "Blocking task 1",
    status: FudaStatus.IN_PROGRESS,
    type: DependencyType.BLOCKS,
  },
];

const mockDependents: DependencyNode[] = [
  {
    id: "sk-dep1",
    title: "Dependent task 1",
    status: FudaStatus.BLOCKED,
    type: DependencyType.BLOCKS,
  },
];

describe("SidePanel component", () => {
  describe("renders when fuda is provided", () => {
    test("renders panel when fuda is provided", () => {
      const { lastFrame } = render(
        <SidePanel fuda={mockFuda} blockers={[]} dependents={[]} />
      );

      const output = lastFrame();
      expect(output).toBeTruthy();
      expect(output?.length).toBeGreaterThan(0);
    });

    test("displays fuda title", () => {
      const { lastFrame } = render(
        <SidePanel fuda={mockFuda} blockers={[]} dependents={[]} />
      );

      const output = lastFrame();
      expect(output).toContain("Test fuda title");
    });

    test("displays fuda ID", () => {
      const { lastFrame } = render(
        <SidePanel fuda={mockFuda} blockers={[]} dependents={[]} />
      );

      const output = lastFrame();
      expect(output).toContain("sk-test1");
    });

    test("displays fuda status", () => {
      const { lastFrame } = render(
        <SidePanel fuda={mockFuda} blockers={[]} dependents={[]} />
      );

      const output = lastFrame();
      expect(output).toContain("in_progress");
    });

    test("displays fuda priority", () => {
      const { lastFrame } = render(
        <SidePanel fuda={mockFuda} blockers={[]} dependents={[]} />
      );

      const output = lastFrame();
      expect(output).toContain("7");
    });

    test("displays fuda spirit type", () => {
      const { lastFrame } = render(
        <SidePanel fuda={mockFuda} blockers={[]} dependents={[]} />
      );

      const output = lastFrame();
      expect(output).toContain("shikigami");
    });
  });

  describe("shows FudaDetailsContent section", () => {
    test("shows Details section header", () => {
      const { lastFrame } = render(
        <SidePanel fuda={mockFuda} blockers={[]} dependents={[]} />
      );

      const output = lastFrame();
      expect(output).toContain("Details");
    });

    test("displays fuda description", () => {
      const { lastFrame } = render(
        <SidePanel fuda={mockFuda} blockers={[]} dependents={[]} />
      );

      const output = lastFrame();
      expect(output).toContain("This is a detailed description of the fuda");
    });

    test("displays prdId when available", () => {
      const { lastFrame } = render(
        <SidePanel fuda={mockFuda} blockers={[]} dependents={[]} />
      );

      const output = lastFrame();
      expect(output).toContain("PRD-456");
    });

    test("displays assignedSpiritId when available", () => {
      const { lastFrame } = render(
        <SidePanel fuda={mockFuda} blockers={[]} dependents={[]} />
      );

      const output = lastFrame();
      expect(output).toContain("spirit-abc");
    });

    test("handles fuda with null optional fields", () => {
      const minimalFuda: Fuda = {
        ...mockFuda,
        prdId: null,
        assignedSpiritId: null,
        outputCommitHash: null,
        failureContext: null,
        parentFudaId: null,
      };

      const { lastFrame } = render(
        <SidePanel fuda={minimalFuda} blockers={[]} dependents={[]} />
      );

      const output = lastFrame();
      expect(output).toContain("sk-test1");
      expect(output).toContain("Test fuda title");
    });

    test("handles fuda with empty description", () => {
      const emptyDescFuda = {
        ...mockFuda,
        description: "",
      };

      const { lastFrame } = render(
        <SidePanel fuda={emptyDescFuda} blockers={[]} dependents={[]} />
      );

      const output = lastFrame();
      expect(output).toBeDefined();
    });
  });

  describe("shows DependencyGraph section", () => {
    test("shows Dependencies section header", () => {
      const { lastFrame } = render(
        <SidePanel fuda={mockFuda} blockers={mockBlockers} dependents={mockDependents} />
      );

      const output = lastFrame();
      expect(output).toContain("Dependencies");
    });

    test("displays blockers when provided", () => {
      const { lastFrame } = render(
        <SidePanel fuda={mockFuda} blockers={mockBlockers} dependents={[]} />
      );

      const output = lastFrame();
      expect(output).toContain("Blockers");
      expect(output).toContain("Blocking task 1");
    });

    test("displays dependents when provided", () => {
      const { lastFrame } = render(
        <SidePanel fuda={mockFuda} blockers={[]} dependents={mockDependents} />
      );

      const output = lastFrame();
      expect(output).toContain("Dependents");
      expect(output).toContain("Dependent task 1");
    });

    test("shows no dependencies message when none exist", () => {
      const { lastFrame } = render(
        <SidePanel fuda={mockFuda} blockers={[]} dependents={[]} />
      );

      const output = lastFrame();
      expect(output).toContain("No dependencies");
    });

    test("displays both blockers and dependents", () => {
      const { lastFrame } = render(
        <SidePanel fuda={mockFuda} blockers={mockBlockers} dependents={mockDependents} />
      );

      const output = lastFrame();
      expect(output).toContain("Blockers");
      expect(output).toContain("Dependents");
    });

    test("shows dependency IDs", () => {
      const { lastFrame } = render(
        <SidePanel fuda={mockFuda} blockers={mockBlockers} dependents={mockDependents} />
      );

      const output = lastFrame();
      expect(output).toContain("sk-blocker1");
      expect(output).toContain("sk-dep1");
    });
  });

  describe("has correct border and layout", () => {
    test("renders with border", () => {
      const { lastFrame } = render(
        <SidePanel fuda={mockFuda} blockers={[]} dependents={[]} />
      );

      const output = lastFrame() || "";
      // Check for box-drawing characters or border indicators
      const hasBorder =
        output.includes("│") ||
        output.includes("─") ||
        output.includes("┌") ||
        output.includes("╭") ||
        output.includes("┐") ||
        output.includes("╮");
      expect(hasBorder).toBe(true);
    });

    test("renders content in organized sections", () => {
      const { lastFrame } = render(
        <SidePanel fuda={mockFuda} blockers={mockBlockers} dependents={mockDependents} />
      );

      const output = lastFrame() || "";
      // Should have multiple lines indicating structured content
      expect(output.split("\n").length).toBeGreaterThan(5);
    });

    test("has vertical layout with sections stacked", () => {
      const { lastFrame } = render(
        <SidePanel fuda={mockFuda} blockers={mockBlockers} dependents={mockDependents} />
      );

      const output = lastFrame() || "";
      const lines = output.split("\n");

      // Find positions of key elements
      let detailsLine = -1;
      let dependenciesLine = -1;

      lines.forEach((line, index) => {
        if (line.includes("Details")) detailsLine = index;
        if (line.includes("Dependencies")) dependenciesLine = index;
      });

      // Dependencies section should appear after Details section
      if (detailsLine !== -1 && dependenciesLine !== -1) {
        expect(dependenciesLine).toBeGreaterThan(detailsLine);
      }
    });

    test("renders title prominently", () => {
      const { lastFrame } = render(
        <SidePanel fuda={mockFuda} blockers={[]} dependents={[]} />
      );

      const output = lastFrame();
      expect(output).toContain("Test fuda title");
    });
  });

  describe("handles loading/error states", () => {
    test("shows loading indicator when loading is true", () => {
      const { lastFrame } = render(
        <SidePanel fuda={mockFuda} blockers={[]} dependents={[]} loading={true} />
      );

      const output = lastFrame();
      expect(output).toContain("Loading");
    });

    test("does not show loading when loading is false", () => {
      const { lastFrame } = render(
        <SidePanel fuda={mockFuda} blockers={[]} dependents={[]} loading={false} />
      );

      const output = lastFrame();
      expect(output).not.toContain("Loading");
    });

    test("defaults to not loading when prop not provided", () => {
      const { lastFrame } = render(
        <SidePanel fuda={mockFuda} blockers={[]} dependents={[]} />
      );

      const output = lastFrame();
      expect(output).not.toContain("Loading");
    });

    test("shows error message when error is provided", () => {
      const { lastFrame } = render(
        <SidePanel fuda={mockFuda} blockers={[]} dependents={[]} error="Failed to load data" />
      );

      const output = lastFrame();
      expect(output).toContain("Failed to load data");
    });

    test("does not show error when error is not provided", () => {
      const { lastFrame } = render(
        <SidePanel fuda={mockFuda} blockers={[]} dependents={[]} />
      );

      const output = lastFrame();
      expect(output).not.toContain("Error");
    });

    test("prioritizes error over loading state", () => {
      const { lastFrame } = render(
        <SidePanel fuda={mockFuda} blockers={[]} dependents={[]} loading={true} error="Error occurred" />
      );

      const output = lastFrame();
      expect(output).toContain("Error occurred");
      expect(output).not.toContain("Loading");
    });

    test("shows fuda content even with dependencies loading", () => {
      const { lastFrame } = render(
        <SidePanel fuda={mockFuda} blockers={[]} dependents={[]} loading={true} />
      );

      const output = lastFrame();
      // Fuda details should still be visible
      expect(output).toContain("Test fuda title");
    });
  });

  describe("edge cases", () => {
    test("handles fuda with very long title", () => {
      const longTitleFuda = {
        ...mockFuda,
        title: "This is a very long title that might need special handling in the side panel layout",
      };

      const { lastFrame } = render(
        <SidePanel fuda={longTitleFuda} blockers={[]} dependents={[]} />
      );

      expect(lastFrame()).toBeDefined();
    });

    test("handles fuda with very long description", () => {
      const longDescFuda = {
        ...mockFuda,
        description: "This is a very long description that spans multiple lines and contains a lot of detail about what this fuda is supposed to accomplish. It might need to be wrapped or truncated depending on the panel width. The panel should handle this gracefully.",
      };

      const { lastFrame } = render(
        <SidePanel fuda={longDescFuda} blockers={[]} dependents={[]} />
      );

      expect(lastFrame()).toBeDefined();
    });

    test("handles many blockers", () => {
      const manyBlockers: DependencyNode[] = Array.from({ length: 10 }, (_, i) => ({
        id: `sk-blocker-${i}`,
        title: `Blocker ${i}`,
        status: FudaStatus.BLOCKED,
        type: DependencyType.BLOCKS,
      }));

      const { lastFrame } = render(
        <SidePanel fuda={mockFuda} blockers={manyBlockers} dependents={[]} />
      );

      const output = lastFrame();
      expect(output).toContain("10");
    });

    test("handles all fuda statuses", () => {
      const statuses = Object.values(FudaStatus);

      statuses.forEach((status) => {
        const fudaWithStatus = { ...mockFuda, status };
        const { lastFrame } = render(
          <SidePanel fuda={fudaWithStatus} blockers={[]} dependents={[]} />
        );

        expect(lastFrame()).toContain(status);
      });
    });

    test("handles all spirit types", () => {
      const spiritTypes = Object.values(SpiritType);

      spiritTypes.forEach((spiritType) => {
        const fudaWithSpirit = { ...mockFuda, spiritType };
        const { lastFrame } = render(
          <SidePanel fuda={fudaWithSpirit} blockers={[]} dependents={[]} />
        );

        expect(lastFrame()).toContain(spiritType);
      });
    });

    test("handles zero priority", () => {
      const zeroPriorityFuda = {
        ...mockFuda,
        priority: 0,
      };

      const { lastFrame } = render(
        <SidePanel fuda={zeroPriorityFuda} blockers={[]} dependents={[]} />
      );

      const output = lastFrame();
      expect(output).toContain("0");
    });

    test("handles max priority", () => {
      const maxPriorityFuda = {
        ...mockFuda,
        priority: 10,
      };

      const { lastFrame } = render(
        <SidePanel fuda={maxPriorityFuda} blockers={[]} dependents={[]} />
      );

      const output = lastFrame();
      expect(output).toContain("10");
    });
  });
});
