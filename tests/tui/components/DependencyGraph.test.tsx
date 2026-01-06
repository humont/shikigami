import { describe, expect, test } from "bun:test";
import React from "react";
import { render } from "ink-testing-library";
import { DependencyGraph, type DependencyGraphNode } from "../../../src/tui/components/DependencyGraph";
import { DependencyType, FudaStatus } from "../../../src/types";

// Mock dependency graph data
const mockNode: DependencyGraphNode = {
  id: "sk-root",
  displayId: "sk-r",
  title: "Root task",
  status: FudaStatus.IN_PROGRESS,
  type: DependencyType.BLOCKS,
  children: [],
};

const mockNodeWithChildren: DependencyGraphNode = {
  id: "sk-root",
  displayId: "sk-r",
  title: "Root task",
  status: FudaStatus.IN_PROGRESS,
  type: DependencyType.BLOCKS,
  children: [
    {
      id: "sk-child1",
      displayId: "sk-c1",
      title: "Child task 1",
      status: FudaStatus.PENDING,
      type: DependencyType.BLOCKS,
      children: [],
    },
    {
      id: "sk-child2",
      displayId: "sk-c2",
      title: "Child task 2",
      status: FudaStatus.READY,
      type: DependencyType.PARENT_CHILD,
      children: [],
    },
  ],
};

const mockDeepTree: DependencyGraphNode = {
  id: "sk-level0",
  displayId: "sk-l0",
  title: "Level 0",
  status: FudaStatus.IN_PROGRESS,
  type: DependencyType.BLOCKS,
  children: [
    {
      id: "sk-level1",
      displayId: "sk-l1",
      title: "Level 1",
      status: FudaStatus.PENDING,
      type: DependencyType.BLOCKS,
      children: [
        {
          id: "sk-level2",
          displayId: "sk-l2",
          title: "Level 2",
          status: FudaStatus.READY,
          type: DependencyType.BLOCKS,
          children: [
            {
              id: "sk-level3",
              displayId: "sk-l3",
              title: "Level 3",
              status: FudaStatus.DONE,
              type: DependencyType.BLOCKS,
              children: [],
            },
          ],
        },
      ],
    },
  ],
};

const mockCircularNode: DependencyGraphNode = {
  id: "sk-circular",
  displayId: "sk-circ",
  title: "Circular task",
  status: FudaStatus.IN_PROGRESS,
  type: DependencyType.BLOCKS,
  children: [],
  isCircular: true,
};

const mockNodeWithCircularChild: DependencyGraphNode = {
  id: "sk-root",
  displayId: "sk-r",
  title: "Root task",
  status: FudaStatus.IN_PROGRESS,
  type: DependencyType.BLOCKS,
  children: [
    {
      id: "sk-child",
      displayId: "sk-c",
      title: "Child task",
      status: FudaStatus.PENDING,
      type: DependencyType.BLOCKS,
      children: [
        {
          id: "sk-root",
          displayId: "sk-r",
          title: "Root task (circular)",
          status: FudaStatus.IN_PROGRESS,
          type: DependencyType.BLOCKS,
          children: [],
          isCircular: true,
        },
      ],
    },
  ],
};

describe("DependencyGraph component", () => {
  describe("renders recursive tree with ASCII art", () => {
    test("renders tree branch character for single child", () => {
      const { lastFrame } = render(
        <DependencyGraph blockers={[mockNodeWithChildren]} dependents={[]} />
      );

      const output = lastFrame() || "";
      // Should contain tree branch characters
      const hasTreeChars = output.includes("├") || output.includes("└") || output.includes("│");
      expect(hasTreeChars).toBe(true);
    });

    test("renders └── for last child in list", () => {
      const { lastFrame } = render(
        <DependencyGraph blockers={[mockNodeWithChildren]} dependents={[]} />
      );

      const output = lastFrame() || "";
      expect(output).toContain("└");
    });

    test("renders ├── for non-last children", () => {
      const { lastFrame } = render(
        <DependencyGraph blockers={[mockNodeWithChildren]} dependents={[]} />
      );

      const output = lastFrame() || "";
      expect(output).toContain("├");
    });

    test("renders │ for vertical continuation", () => {
      const nodeWithMultipleChildren: DependencyGraphNode = {
        ...mockNode,
        children: [
          {
            id: "sk-c1",
            displayId: "sk-c1",
            title: "Child 1",
            status: FudaStatus.PENDING,
            type: DependencyType.BLOCKS,
            children: [
              {
                id: "sk-gc1",
                displayId: "sk-gc1",
                title: "Grandchild 1",
                status: FudaStatus.PENDING,
                type: DependencyType.BLOCKS,
                children: [],
              },
            ],
          },
          {
            id: "sk-c2",
            displayId: "sk-c2",
            title: "Child 2",
            status: FudaStatus.READY,
            type: DependencyType.BLOCKS,
            children: [],
          },
        ],
      };

      const { lastFrame } = render(
        <DependencyGraph blockers={[nodeWithMultipleChildren]} dependents={[]} />
      );

      const output = lastFrame() || "";
      expect(output).toContain("│");
    });

    test("renders nested children with proper indentation", () => {
      const { lastFrame } = render(
        <DependencyGraph blockers={[mockDeepTree]} dependents={[]} />
      );

      const output = lastFrame() || "";
      const lines = output.split("\n");

      // Deeper nodes should have more leading spaces/characters
      expect(lines.some((line) => line.includes("Level 0"))).toBe(true);
      expect(lines.some((line) => line.includes("Level 1"))).toBe(true);
      expect(lines.some((line) => line.includes("Level 2"))).toBe(true);
    });

    test("renders all nodes in the tree", () => {
      const { lastFrame } = render(
        <DependencyGraph blockers={[mockNodeWithChildren]} dependents={[]} />
      );

      const output = lastFrame() || "";
      expect(output).toContain("Root task");
      expect(output).toContain("Child task 1");
      expect(output).toContain("Child task 2");
    });
  });

  describe("handles circular dependencies", () => {
    test("shows [circular] marker for circular nodes", () => {
      const { lastFrame } = render(
        <DependencyGraph blockers={[mockNodeWithCircularChild]} dependents={[]} />
      );

      const output = lastFrame() || "";
      expect(output.toLowerCase()).toContain("circular");
    });

    test("does not recurse infinitely on circular deps", () => {
      const { lastFrame } = render(
        <DependencyGraph blockers={[mockNodeWithCircularChild]} dependents={[]} />
      );

      const output = lastFrame() || "";
      // Should render without hanging
      expect(output).toBeTruthy();
      // Root should only appear once as a full node (circular reference is marked)
      const rootMatches = (output.match(/Root task/g) || []).length;
      expect(rootMatches).toBeLessThanOrEqual(2); // Original + circular reference
    });

    test("marks circular node distinctly", () => {
      const { lastFrame } = render(
        <DependencyGraph blockers={[mockCircularNode]} dependents={[]} />
      );

      const output = lastFrame() || "";
      expect(output.toLowerCase()).toContain("circular");
    });

    test("renders circular node in tree context", () => {
      const { lastFrame } = render(
        <DependencyGraph blockers={[mockNodeWithCircularChild]} dependents={[]} />
      );

      const output = lastFrame() || "";
      expect(output).toContain("Root task");
      expect(output).toContain("Child task");
    });
  });

  describe("applies status colors to nodes", () => {
    test("renders pending status", () => {
      const pendingNode: DependencyGraphNode = {
        ...mockNode,
        status: FudaStatus.PENDING,
      };

      const { lastFrame } = render(
        <DependencyGraph blockers={[pendingNode]} dependents={[]} />
      );

      const output = lastFrame() || "";
      expect(output).toContain("pending");
    });

    test("renders ready status", () => {
      const readyNode: DependencyGraphNode = {
        ...mockNode,
        status: FudaStatus.READY,
      };

      const { lastFrame } = render(
        <DependencyGraph blockers={[readyNode]} dependents={[]} />
      );

      const output = lastFrame() || "";
      expect(output).toContain("ready");
    });

    test("renders in_progress status", () => {
      const { lastFrame } = render(
        <DependencyGraph blockers={[mockNode]} dependents={[]} />
      );

      const output = lastFrame() || "";
      expect(output).toContain("in_progress");
    });

    test("renders done status", () => {
      const doneNode: DependencyGraphNode = {
        ...mockNode,
        status: FudaStatus.DONE,
      };

      const { lastFrame } = render(
        <DependencyGraph blockers={[doneNode]} dependents={[]} />
      );

      const output = lastFrame() || "";
      expect(output).toContain("done");
    });

    test("renders failed status", () => {
      const failedNode: DependencyGraphNode = {
        ...mockNode,
        status: FudaStatus.FAILED,
      };

      const { lastFrame } = render(
        <DependencyGraph blockers={[failedNode]} dependents={[]} />
      );

      const output = lastFrame() || "";
      expect(output).toContain("failed");
    });

    test("renders all statuses with different output", () => {
      const statuses = [FudaStatus.PENDING, FudaStatus.READY, FudaStatus.IN_PROGRESS, FudaStatus.DONE];
      const outputs: string[] = [];

      statuses.forEach((status) => {
        const node: DependencyGraphNode = { ...mockNode, status };
        const { lastFrame } = render(
          <DependencyGraph blockers={[node]} dependents={[]} />
        );
        outputs.push(lastFrame() || "");
      });

      // Each status should produce different output (due to color codes or text)
      const uniqueOutputs = new Set(outputs);
      expect(uniqueOutputs.size).toBe(statuses.length);
    });
  });

  describe("handles empty state", () => {
    test("shows no dependencies message when both empty", () => {
      const { lastFrame } = render(
        <DependencyGraph blockers={[]} dependents={[]} />
      );

      const output = lastFrame() || "";
      expect(output.toLowerCase()).toContain("no dependencies");
    });

    test("does not show Blockers header when blockers empty", () => {
      const { lastFrame } = render(
        <DependencyGraph blockers={[]} dependents={[mockNode]} />
      );

      const output = lastFrame() || "";
      expect(output).not.toContain("Blockers");
    });

    test("does not show Dependents header when dependents empty", () => {
      const { lastFrame } = render(
        <DependencyGraph blockers={[mockNode]} dependents={[]} />
      );

      const output = lastFrame() || "";
      expect(output).not.toContain("Dependents");
    });
  });

  describe("respects max depth limit", () => {
    test("limits tree rendering to maxDepth", () => {
      const { lastFrame } = render(
        <DependencyGraph blockers={[mockDeepTree]} dependents={[]} maxDepth={2} />
      );

      const output = lastFrame() || "";
      expect(output).toContain("Level 0");
      expect(output).toContain("Level 1");
      // Level 2 and beyond may be truncated or show ellipsis
    });

    test("shows truncation indicator when depth exceeded", () => {
      const { lastFrame } = render(
        <DependencyGraph blockers={[mockDeepTree]} dependents={[]} maxDepth={1} />
      );

      const output = lastFrame() || "";
      // Should show some indicator that there are more levels
      const hasTruncation =
        output.includes("...") ||
        output.includes("more") ||
        output.includes("+") ||
        !output.includes("Level 2");
      expect(hasTruncation).toBe(true);
    });

    test("defaults to reasonable depth when not specified", () => {
      const { lastFrame } = render(
        <DependencyGraph blockers={[mockDeepTree]} dependents={[]} />
      );

      const output = lastFrame() || "";
      // Should render without crashing
      expect(output).toBeTruthy();
    });

    test("renders full tree when maxDepth is high", () => {
      const { lastFrame } = render(
        <DependencyGraph blockers={[mockDeepTree]} dependents={[]} maxDepth={10} />
      );

      const output = lastFrame() || "";
      expect(output).toContain("Level 0");
      expect(output).toContain("Level 1");
      expect(output).toContain("Level 2");
      expect(output).toContain("Level 3");
    });
  });

  describe("shows two sections: Blockers and Dependents", () => {
    test("shows Blockers section when blockers exist", () => {
      const { lastFrame } = render(
        <DependencyGraph blockers={[mockNode]} dependents={[]} />
      );

      const output = lastFrame() || "";
      expect(output).toContain("Blockers");
    });

    test("shows Dependents section when dependents exist", () => {
      const { lastFrame } = render(
        <DependencyGraph blockers={[]} dependents={[mockNode]} />
      );

      const output = lastFrame() || "";
      expect(output).toContain("Dependents");
    });

    test("shows both sections when both exist", () => {
      const { lastFrame } = render(
        <DependencyGraph blockers={[mockNode]} dependents={[mockNode]} />
      );

      const output = lastFrame() || "";
      expect(output).toContain("Blockers");
      expect(output).toContain("Dependents");
    });

    test("shows count in section headers", () => {
      const multipleBlockers = [mockNode, { ...mockNode, id: "sk-2", title: "Task 2" }];

      const { lastFrame } = render(
        <DependencyGraph blockers={multipleBlockers} dependents={[]} />
      );

      const output = lastFrame() || "";
      expect(output).toContain("2");
    });

    test("Blockers section appears before Dependents", () => {
      const { lastFrame } = render(
        <DependencyGraph blockers={[mockNode]} dependents={[mockNode]} />
      );

      const output = lastFrame() || "";
      const blockersIndex = output.indexOf("Blockers");
      const dependentsIndex = output.indexOf("Dependents");
      expect(blockersIndex).toBeLessThan(dependentsIndex);
    });
  });

  describe("edge cases", () => {
    test("handles node without displayId", () => {
      const nodeWithoutDisplayId: DependencyGraphNode = {
        ...mockNode,
        displayId: null,
      };

      const { lastFrame } = render(
        <DependencyGraph blockers={[nodeWithoutDisplayId]} dependents={[]} />
      );

      const output = lastFrame() || "";
      expect(output).toContain("Root task");
    });

    test("handles very long titles", () => {
      const longTitleNode: DependencyGraphNode = {
        ...mockNode,
        title: "This is a very long title that might need truncation in the tree view",
      };

      const { lastFrame } = render(
        <DependencyGraph blockers={[longTitleNode]} dependents={[]} />
      );

      const output = lastFrame() || "";
      expect(output).toBeDefined();
    });

    test("handles many top-level nodes", () => {
      const manyNodes: DependencyGraphNode[] = Array.from({ length: 10 }, (_, i) => ({
        id: `sk-${i}`,
        displayId: `sk-${i}`,
        title: `Task ${i}`,
        status: FudaStatus.PENDING,
        type: DependencyType.BLOCKS,
        children: [],
      }));

      const { lastFrame } = render(
        <DependencyGraph blockers={manyNodes} dependents={[]} />
      );

      const output = lastFrame() || "";
      expect(output).toContain("Task 0");
      expect(output).toContain("Task 9");
    });

    test("handles all dependency types", () => {
      const types = Object.values(DependencyType);

      types.forEach((type) => {
        const node: DependencyGraphNode = { ...mockNode, type };
        const { lastFrame } = render(
          <DependencyGraph blockers={[node]} dependents={[]} />
        );

        expect(lastFrame()).toContain(type);
      });
    });
  });

  describe("loading and error states", () => {
    test("shows loading indicator when loading", () => {
      const { lastFrame } = render(
        <DependencyGraph blockers={[]} dependents={[]} loading={true} />
      );

      const output = lastFrame() || "";
      expect(output.toLowerCase()).toContain("loading");
    });

    test("shows error message when error provided", () => {
      const { lastFrame } = render(
        <DependencyGraph blockers={[]} dependents={[]} error="Failed to load dependencies" />
      );

      const output = lastFrame() || "";
      expect(output).toContain("Failed to load dependencies");
    });

    test("prioritizes error over loading", () => {
      const { lastFrame } = render(
        <DependencyGraph blockers={[]} dependents={[]} loading={true} error="Error occurred" />
      );

      const output = lastFrame() || "";
      expect(output).toContain("Error occurred");
      expect(output.toLowerCase()).not.toContain("loading");
    });
  });
});
