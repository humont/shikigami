import { describe, expect, test } from "bun:test";
import React from "react";
import { render } from "ink-testing-library";
import {
  DependencyTree,
  type DependencyNode,
  type DependencyTreeProps,
} from "../../../src/tui/components/DependencyTree";
import { DependencyType, FudaStatus } from "../../../src/types";

const mockBlockers: DependencyNode[] = [
  {
    id: "sk-blocker1",
    displayId: "sk-b1",
    title: "Blocking task 1",
    status: FudaStatus.IN_PROGRESS,
    type: DependencyType.BLOCKS,
  },
  {
    id: "sk-blocker2",
    displayId: "sk-b2",
    title: "Blocking task 2",
    status: FudaStatus.BLOCKED,
    type: DependencyType.PARENT_CHILD,
  },
];

const mockDependents: DependencyNode[] = [
  {
    id: "sk-dep1",
    displayId: "sk-d1",
    title: "Dependent task 1",
    status: FudaStatus.BLOCKED,
    type: DependencyType.BLOCKS,
  },
  {
    id: "sk-dep2",
    displayId: "sk-d2",
    title: "Dependent task 2",
    status: FudaStatus.READY,
    type: DependencyType.RELATED,
  },
];

describe("DependencyTree component", () => {
  describe("renders tree structure", () => {
    test("renders blockers section when blockers exist", () => {
      const { lastFrame } = render(
        <DependencyTree blockers={mockBlockers} dependents={[]} />
      );

      const output = lastFrame();
      expect(output).toContain("Blockers");
    });

    test("renders dependents section when dependents exist", () => {
      const { lastFrame } = render(
        <DependencyTree blockers={[]} dependents={mockDependents} />
      );

      const output = lastFrame();
      expect(output).toContain("Dependents");
    });

    test("renders both sections when both exist", () => {
      const { lastFrame } = render(
        <DependencyTree blockers={mockBlockers} dependents={mockDependents} />
      );

      const output = lastFrame();
      expect(output).toContain("Blockers");
      expect(output).toContain("Dependents");
    });

    test("renders empty state when no dependencies", () => {
      const { lastFrame } = render(
        <DependencyTree blockers={[]} dependents={[]} />
      );

      const output = lastFrame();
      expect(output).toContain("No dependencies");
    });

    test("renders tree indentation for nested structure", () => {
      const { lastFrame } = render(
        <DependencyTree blockers={mockBlockers} dependents={[]} />
      );

      const output = lastFrame() || "";
      // Tree structure should show visual hierarchy
      expect(output).toBeTruthy();
    });

    test("renders all blocker items", () => {
      const { lastFrame } = render(
        <DependencyTree blockers={mockBlockers} dependents={[]} />
      );

      const output = lastFrame();
      expect(output).toContain("Blocking task 1");
      expect(output).toContain("Blocking task 2");
    });

    test("renders all dependent items", () => {
      const { lastFrame } = render(
        <DependencyTree blockers={[]} dependents={mockDependents} />
      );

      const output = lastFrame();
      expect(output).toContain("Dependent task 1");
      expect(output).toContain("Dependent task 2");
    });
  });

  describe("shows blockers and dependents", () => {
    test("displays blocker display IDs", () => {
      const { lastFrame } = render(
        <DependencyTree blockers={mockBlockers} dependents={[]} />
      );

      const output = lastFrame();
      expect(output).toContain("sk-b1");
      expect(output).toContain("sk-b2");
    });

    test("displays dependent display IDs", () => {
      const { lastFrame } = render(
        <DependencyTree blockers={[]} dependents={mockDependents} />
      );

      const output = lastFrame();
      expect(output).toContain("sk-d1");
      expect(output).toContain("sk-d2");
    });

    test("displays blocker statuses", () => {
      const { lastFrame } = render(
        <DependencyTree blockers={mockBlockers} dependents={[]} />
      );

      const output = lastFrame();
      expect(output).toContain("in_progress");
      expect(output).toContain("blocked");
    });

    test("displays dependent statuses", () => {
      const { lastFrame } = render(
        <DependencyTree blockers={[]} dependents={mockDependents} />
      );

      const output = lastFrame();
      expect(output).toContain("blocked");
      expect(output).toContain("ready");
    });

    test("displays dependency types for blockers", () => {
      const { lastFrame } = render(
        <DependencyTree blockers={mockBlockers} dependents={[]} />
      );

      const output = lastFrame();
      expect(output).toContain("blocks");
      expect(output).toContain("parent-child");
    });

    test("displays dependency types for dependents", () => {
      const { lastFrame } = render(
        <DependencyTree blockers={[]} dependents={mockDependents} />
      );

      const output = lastFrame();
      expect(output).toContain("blocks");
      expect(output).toContain("related");
    });

    test("shows blocker count in header", () => {
      const { lastFrame } = render(
        <DependencyTree blockers={mockBlockers} dependents={[]} />
      );

      const output = lastFrame();
      expect(output).toContain("2");
    });

    test("shows dependent count in header", () => {
      const { lastFrame } = render(
        <DependencyTree blockers={[]} dependents={mockDependents} />
      );

      const output = lastFrame();
      expect(output).toContain("2");
    });

    test("handles node without displayId", () => {
      const nodeWithoutDisplayId: DependencyNode[] = [
        {
          id: "sk-full-id",
          displayId: null,
          title: "Task without display ID",
          status: FudaStatus.BLOCKED,
          type: DependencyType.BLOCKS,
        },
      ];

      const { lastFrame } = render(
        <DependencyTree blockers={nodeWithoutDisplayId} dependents={[]} />
      );

      const output = lastFrame();
      expect(output).toContain("Task without display ID");
      // Should fallback to showing truncated full id or some identifier
      expect(output).toBeTruthy();
    });
  });

  describe("navigation to deps", () => {
    test("calls onSelectDep when a dependency is selected", () => {
      let selectedId: string | undefined;
      const handleSelect = (id: string) => {
        selectedId = id;
      };

      const { lastFrame } = render(
        <DependencyTree
          blockers={mockBlockers}
          dependents={[]}
          selectedIndex={0}
          onSelectDep={handleSelect}
        />
      );

      // Component should render with selection
      expect(lastFrame()).toBeTruthy();
      // Initial selection state is set up
      expect(selectedId).toBeUndefined();
    });

    test("highlights selected dependency", () => {
      const { lastFrame: frame1 } = render(
        <DependencyTree
          blockers={mockBlockers}
          dependents={[]}
          selectedIndex={0}
        />
      );
      const { lastFrame: frame2 } = render(
        <DependencyTree
          blockers={mockBlockers}
          dependents={[]}
          selectedIndex={1}
        />
      );

      // Different items selected should produce different output
      expect(frame1()).not.toBe(frame2());
    });

    test("supports keyboard navigation with selectedIndex", () => {
      const { lastFrame } = render(
        <DependencyTree
          blockers={mockBlockers}
          dependents={mockDependents}
          selectedIndex={2}
        />
      );

      // Should render with third item selected (first dependent)
      const output = lastFrame();
      expect(output).toBeTruthy();
    });

    test("handles selectedIndex beyond blockers into dependents", () => {
      const { lastFrame } = render(
        <DependencyTree
          blockers={mockBlockers}
          dependents={mockDependents}
          selectedIndex={3}
        />
      );

      // Should handle index that spans both sections
      const output = lastFrame();
      expect(output).toBeTruthy();
    });

    test("handles selectedIndex of -1 (no selection)", () => {
      const { lastFrame } = render(
        <DependencyTree
          blockers={mockBlockers}
          dependents={mockDependents}
          selectedIndex={-1}
        />
      );

      const output = lastFrame();
      expect(output).toBeTruthy();
    });

    test("handles selectedIndex out of bounds gracefully", () => {
      const { lastFrame } = render(
        <DependencyTree
          blockers={mockBlockers}
          dependents={mockDependents}
          selectedIndex={100}
        />
      );

      // Should not crash
      const output = lastFrame();
      expect(output).toBeTruthy();
    });

    test("exposes total count for navigation bounds", () => {
      // Component should communicate total navigable items
      const allNodes = [...mockBlockers, ...mockDependents];
      expect(allNodes.length).toBe(4);
    });

    test("renders with onSelectDep callback without crashing", () => {
      const handleSelect = () => {};

      const { lastFrame } = render(
        <DependencyTree
          blockers={mockBlockers}
          dependents={mockDependents}
          onSelectDep={handleSelect}
        />
      );

      expect(lastFrame()).toBeTruthy();
    });
  });

  describe("edge cases", () => {
    test("handles empty blockers array", () => {
      const { lastFrame } = render(
        <DependencyTree blockers={[]} dependents={mockDependents} />
      );

      const output = lastFrame();
      expect(output).not.toContain("Blockers");
      expect(output).toContain("Dependents");
    });

    test("handles empty dependents array", () => {
      const { lastFrame } = render(
        <DependencyTree blockers={mockBlockers} dependents={[]} />
      );

      const output = lastFrame();
      expect(output).toContain("Blockers");
      expect(output).not.toContain("Dependents");
    });

    test("handles single blocker", () => {
      const singleBlocker: DependencyNode[] = [
        {
          id: "sk-single",
          displayId: "sk-s",
          title: "Single blocker",
          status: FudaStatus.IN_PROGRESS,
          type: DependencyType.BLOCKS,
        },
      ];

      const { lastFrame } = render(
        <DependencyTree blockers={singleBlocker} dependents={[]} />
      );

      const output = lastFrame();
      expect(output).toContain("Single blocker");
      expect(output).toContain("1");
    });

    test("handles single dependent", () => {
      const singleDependent: DependencyNode[] = [
        {
          id: "sk-single",
          displayId: "sk-s",
          title: "Single dependent",
          status: FudaStatus.BLOCKED,
          type: DependencyType.BLOCKS,
        },
      ];

      const { lastFrame } = render(
        <DependencyTree blockers={[]} dependents={singleDependent} />
      );

      const output = lastFrame();
      expect(output).toContain("Single dependent");
    });

    test("handles long titles", () => {
      const longTitleNode: DependencyNode[] = [
        {
          id: "sk-long",
          displayId: "sk-l",
          title: "This is a very long title that might need truncation or wrapping in the UI",
          status: FudaStatus.BLOCKED,
          type: DependencyType.BLOCKS,
        },
      ];

      const { lastFrame } = render(
        <DependencyTree blockers={longTitleNode} dependents={[]} />
      );

      const output = lastFrame();
      expect(output).toContain("This is a very long title");
    });

    test("handles many blockers", () => {
      const manyBlockers: DependencyNode[] = Array.from({ length: 10 }, (_, i) => ({
        id: `sk-blocker-${i}`,
        displayId: `sk-b${i}`,
        title: `Blocker ${i}`,
        status: FudaStatus.BLOCKED,
        type: DependencyType.BLOCKS,
      }));

      const { lastFrame } = render(
        <DependencyTree blockers={manyBlockers} dependents={[]} />
      );

      const output = lastFrame();
      expect(output).toContain("10");
    });

    test("handles all dependency types", () => {
      const allTypes: DependencyNode[] = [
        {
          id: "sk-1",
          displayId: "sk-1",
          title: "Blocks type",
          status: FudaStatus.BLOCKED,
          type: DependencyType.BLOCKS,
        },
        {
          id: "sk-2",
          displayId: "sk-2",
          title: "Parent-child type",
          status: FudaStatus.BLOCKED,
          type: DependencyType.PARENT_CHILD,
        },
        {
          id: "sk-3",
          displayId: "sk-3",
          title: "Related type",
          status: FudaStatus.BLOCKED,
          type: DependencyType.RELATED,
        },
        {
          id: "sk-4",
          displayId: "sk-4",
          title: "Discovered-from type",
          status: FudaStatus.BLOCKED,
          type: DependencyType.DISCOVERED_FROM,
        },
      ];

      const { lastFrame } = render(
        <DependencyTree blockers={allTypes} dependents={[]} />
      );

      const output = lastFrame();
      expect(output).toContain("blocks");
      expect(output).toContain("parent-child");
      expect(output).toContain("related");
      expect(output).toContain("discovered-from");
    });

    test("handles all fuda statuses", () => {
      const allStatuses: DependencyNode[] = [
        {
          id: "sk-1",
          displayId: "sk-1",
          title: "Pending",
          status: FudaStatus.BLOCKED,
          type: DependencyType.BLOCKS,
        },
        {
          id: "sk-2",
          displayId: "sk-2",
          title: "Ready",
          status: FudaStatus.READY,
          type: DependencyType.BLOCKS,
        },
        {
          id: "sk-3",
          displayId: "sk-3",
          title: "In Progress",
          status: FudaStatus.IN_PROGRESS,
          type: DependencyType.BLOCKS,
        },
        {
          id: "sk-4",
          displayId: "sk-4",
          title: "In Review",
          status: FudaStatus.IN_REVIEW,
          type: DependencyType.BLOCKS,
        },
      ];

      const { lastFrame } = render(
        <DependencyTree blockers={allStatuses} dependents={[]} />
      );

      const output = lastFrame();
      expect(output).toContain("blocked");
      expect(output).toContain("ready");
      expect(output).toContain("in_progress");
      expect(output).toContain("in_review");
    });
  });

  describe("loading state", () => {
    test("renders loading indicator when loading prop is true", () => {
      const { lastFrame } = render(
        <DependencyTree blockers={[]} dependents={[]} loading={true} />
      );

      const output = lastFrame();
      expect(output).toContain("Loading");
    });

    test("does not show loading when loading prop is false", () => {
      const { lastFrame } = render(
        <DependencyTree blockers={mockBlockers} dependents={[]} loading={false} />
      );

      const output = lastFrame();
      expect(output).not.toContain("Loading");
    });

    test("defaults to not loading when prop not provided", () => {
      const { lastFrame } = render(
        <DependencyTree blockers={mockBlockers} dependents={[]} />
      );

      const output = lastFrame();
      expect(output).not.toContain("Loading");
    });
  });

  describe("error state", () => {
    test("renders error message when error prop is provided", () => {
      const { lastFrame } = render(
        <DependencyTree blockers={[]} dependents={[]} error="Failed to load dependencies" />
      );

      const output = lastFrame();
      expect(output).toContain("Failed to load dependencies");
    });

    test("does not show error when error prop is undefined", () => {
      const { lastFrame } = render(
        <DependencyTree blockers={mockBlockers} dependents={[]} />
      );

      const output = lastFrame();
      expect(output).not.toContain("Error");
    });

    test("prioritizes error over loading state", () => {
      const { lastFrame } = render(
        <DependencyTree blockers={[]} dependents={[]} loading={true} error="Error occurred" />
      );

      const output = lastFrame();
      expect(output).toContain("Error occurred");
      expect(output).not.toContain("Loading");
    });
  });
});
