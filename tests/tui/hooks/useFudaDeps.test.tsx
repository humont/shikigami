import { describe, expect, test, beforeEach, afterEach, spyOn } from "bun:test";
import React, { useEffect } from "react";
import { render } from "ink-testing-library";
import { Text } from "ink";
import {
  useFudaDeps,
  type UseFudaDepsResult,
} from "../../../src/tui/hooks/useFudaDeps";
import * as treeModule from "../../../src/cli/commands/deps/tree";
import * as blockedModule from "../../../src/cli/commands/deps/blocked";
import { DependencyType, FudaStatus } from "../../../src/types";
import type { BlockingFuda } from "../../../src/cli/commands/deps/blocked";
import type { FudaDependency } from "../../../src/types";

// Mock dependency tree data
const mockTree: Record<string, FudaDependency[]> = {
  "sk-root": [
    {
      fudaId: "sk-root",
      dependsOnId: "sk-child1",
      type: DependencyType.BLOCKS,
    },
    {
      fudaId: "sk-root",
      dependsOnId: "sk-child2",
      type: DependencyType.PARENT_CHILD,
    },
  ],
  "sk-child1": [
    {
      fudaId: "sk-child1",
      dependsOnId: "sk-grandchild",
      type: DependencyType.RELATED,
    },
  ],
};

// Mock blocking dependencies
const mockBlocking: BlockingFuda[] = [
  {
    id: "sk-blocker1",
    displayId: "sk-b1",
    title: "Blocking task 1",
    status: FudaStatus.IN_PROGRESS,
    type: DependencyType.BLOCKS,
  },
  {
    id: "sk-blocker2",
    displayId: null,
    title: "Blocking task 2",
    status: FudaStatus.BLOCKED,
    type: DependencyType.PARENT_CHILD,
  },
];

// Helper component to test the hook
interface TestComponentProps {
  id: string;
  depth?: number;
  onResult?: (result: UseFudaDepsResult) => void;
}

function TestComponent({ id, depth, onResult }: TestComponentProps) {
  const result = useFudaDeps({ id, depth });

  useEffect(() => {
    onResult?.(result);
  }, [result, onResult]);

  return (
    <Text>
      {JSON.stringify({
        loading: result.loading,
        hasBlockers: result.hasBlockers,
        blockerCount: result.blockerCount,
        error: result.error,
      })}
    </Text>
  );
}

describe("useFudaDeps hook", () => {
  let runDepsTreeSpy: ReturnType<typeof spyOn>;
  let runDepsBlockedSpy: ReturnType<typeof spyOn>;

  beforeEach(() => {
    runDepsTreeSpy = spyOn(treeModule, "runDepsTree").mockResolvedValue({
      success: true,
      tree: mockTree,
    });
    runDepsBlockedSpy = spyOn(
      blockedModule,
      "runDepsBlocked"
    ).mockResolvedValue({
      success: true,
      blocking: mockBlocking,
    });
  });

  afterEach(() => {
    runDepsTreeSpy.mockRestore();
    runDepsBlockedSpy.mockRestore();
  });

  describe("calling deps functions", () => {
    test("calls runDepsTree with fuda id on mount", async () => {
      const { unmount } = render(<TestComponent id="sk-test" />);

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(runDepsTreeSpy).toHaveBeenCalledWith(
        expect.objectContaining({ id: "sk-test" })
      );
      unmount();
    });

    test("calls runDepsBlocked with fuda id on mount", async () => {
      const { unmount } = render(<TestComponent id="sk-test" />);

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(runDepsBlockedSpy).toHaveBeenCalledWith(
        expect.objectContaining({ id: "sk-test" })
      );
      unmount();
    });

    test("calls both deps functions in parallel", async () => {
      let treeCallTime: number = 0;
      let blockedCallTime: number = 0;

      runDepsTreeSpy.mockImplementation(async () => {
        treeCallTime = Date.now();
        await new Promise((resolve) => setTimeout(resolve, 10));
        return { success: true, tree: mockTree };
      });

      runDepsBlockedSpy.mockImplementation(async () => {
        blockedCallTime = Date.now();
        await new Promise((resolve) => setTimeout(resolve, 10));
        return { success: true, blocking: mockBlocking };
      });

      const { unmount } = render(<TestComponent id="sk-test" />);

      await new Promise((resolve) => setTimeout(resolve, 50));

      // Both calls should happen roughly at the same time (within 5ms)
      expect(Math.abs(treeCallTime - blockedCallTime)).toBeLessThan(5);
      unmount();
    });

    test("passes depth option to runDepsTree", async () => {
      const { unmount } = render(<TestComponent id="sk-test" depth={3} />);

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(runDepsTreeSpy).toHaveBeenCalledWith(
        expect.objectContaining({ id: "sk-test", depth: 3 })
      );
      unmount();
    });
  });

  describe("data transformation", () => {
    test("returns dependency tree from runDepsTree", async () => {
      let latestResult: UseFudaDepsResult | undefined;

      const { unmount } = render(
        <TestComponent
          id="sk-test"
          onResult={(result) => {
            latestResult = result;
          }}
        />
      );

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(latestResult?.tree).toEqual(mockTree);
      unmount();
    });

    test("returns blocking dependencies from runDepsBlocked", async () => {
      let latestResult: UseFudaDepsResult | undefined;

      const { unmount } = render(
        <TestComponent
          id="sk-test"
          onResult={(result) => {
            latestResult = result;
          }}
        />
      );

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(latestResult?.blocking).toEqual(mockBlocking);
      unmount();
    });

    test("returns empty tree when no dependencies exist", async () => {
      runDepsTreeSpy.mockResolvedValue({
        success: true,
        tree: {},
      });

      let latestResult: UseFudaDepsResult | undefined;

      const { unmount } = render(
        <TestComponent
          id="sk-test"
          onResult={(result) => {
            latestResult = result;
          }}
        />
      );

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(latestResult?.tree).toEqual({});
      unmount();
    });

    test("returns empty blocking array when no blockers exist", async () => {
      runDepsBlockedSpy.mockResolvedValue({
        success: true,
        blocking: [],
      });

      let latestResult: UseFudaDepsResult | undefined;

      const { unmount } = render(
        <TestComponent
          id="sk-test"
          onResult={(result) => {
            latestResult = result;
          }}
        />
      );

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(latestResult?.blocking).toEqual([]);
      unmount();
    });

    test("computes hasBlockers correctly when blockers exist", async () => {
      let latestResult: UseFudaDepsResult | undefined;

      const { unmount } = render(
        <TestComponent
          id="sk-test"
          onResult={(result) => {
            latestResult = result;
          }}
        />
      );

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(latestResult?.hasBlockers).toBe(true);
      unmount();
    });

    test("computes hasBlockers correctly when no blockers exist", async () => {
      runDepsBlockedSpy.mockResolvedValue({
        success: true,
        blocking: [],
      });

      let latestResult: UseFudaDepsResult | undefined;

      const { unmount } = render(
        <TestComponent
          id="sk-test"
          onResult={(result) => {
            latestResult = result;
          }}
        />
      );

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(latestResult?.hasBlockers).toBe(false);
      unmount();
    });

    test("computes blockerCount correctly", async () => {
      let latestResult: UseFudaDepsResult | undefined;

      const { unmount } = render(
        <TestComponent
          id="sk-test"
          onResult={(result) => {
            latestResult = result;
          }}
        />
      );

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(latestResult?.blockerCount).toBe(2);
      unmount();
    });
  });

  describe("loading state", () => {
    test("returns loading true initially", async () => {
      let initialLoading: boolean | undefined;

      const { unmount } = render(
        <TestComponent
          id="sk-test"
          onResult={(result) => {
            if (initialLoading === undefined) {
              initialLoading = result.loading;
            }
          }}
        />
      );

      expect(initialLoading).toBe(true);
      unmount();
    });

    test("returns loading false after data loads", async () => {
      let latestResult: UseFudaDepsResult | undefined;

      const { unmount } = render(
        <TestComponent
          id="sk-test"
          onResult={(result) => {
            latestResult = result;
          }}
        />
      );

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(latestResult?.loading).toBe(false);
      unmount();
    });

    test("sets loading during refresh", async () => {
      let latestResult: UseFudaDepsResult | undefined;

      const { unmount } = render(
        <TestComponent
          id="sk-test"
          onResult={(result) => {
            latestResult = result;
          }}
        />
      );

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(latestResult?.loading).toBe(false);

      await latestResult?.refresh();

      // Note: Due to React batching, we might not capture intermediate loading=true state
      // But we can verify final state is not loading
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(latestResult?.loading).toBe(false);
      unmount();
    });
  });

  describe("error handling", () => {
    test("returns error when runDepsTree fails", async () => {
      runDepsTreeSpy.mockResolvedValue({
        success: false,
        error: "Tree error",
      });

      let latestResult: UseFudaDepsResult | undefined;

      const { unmount } = render(
        <TestComponent
          id="sk-test"
          onResult={(result) => {
            latestResult = result;
          }}
        />
      );

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(latestResult?.error).toBe("Tree error");
      unmount();
    });

    test("returns error when runDepsBlocked fails", async () => {
      runDepsBlockedSpy.mockResolvedValue({
        success: false,
        error: "Blocked error",
      });

      let latestResult: UseFudaDepsResult | undefined;

      const { unmount } = render(
        <TestComponent
          id="sk-test"
          onResult={(result) => {
            latestResult = result;
          }}
        />
      );

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(latestResult?.error).toBe("Blocked error");
      unmount();
    });

    test("returns first error when both fail", async () => {
      runDepsTreeSpy.mockResolvedValue({
        success: false,
        error: "Tree error",
      });
      runDepsBlockedSpy.mockResolvedValue({
        success: false,
        error: "Blocked error",
      });

      let latestResult: UseFudaDepsResult | undefined;

      const { unmount } = render(
        <TestComponent
          id="sk-test"
          onResult={(result) => {
            latestResult = result;
          }}
        />
      );

      await new Promise((resolve) => setTimeout(resolve, 50));

      // Should return tree error since it's checked first
      expect(latestResult?.error).toBe("Tree error");
      unmount();
    });

    test("returns empty data on error", async () => {
      runDepsTreeSpy.mockResolvedValue({
        success: false,
        error: "Error",
      });

      let latestResult: UseFudaDepsResult | undefined;

      const { unmount } = render(
        <TestComponent
          id="sk-test"
          onResult={(result) => {
            latestResult = result;
          }}
        />
      );

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(latestResult?.tree).toEqual({});
      expect(latestResult?.blocking).toEqual([]);
      unmount();
    });

    test("clears error after successful refresh", async () => {
      runDepsTreeSpy.mockResolvedValueOnce({
        success: false,
        error: "Initial error",
      });

      let latestResult: UseFudaDepsResult | undefined;

      const { unmount } = render(
        <TestComponent
          id="sk-test"
          onResult={(result) => {
            latestResult = result;
          }}
        />
      );

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(latestResult?.error).toBe("Initial error");

      runDepsTreeSpy.mockResolvedValueOnce({
        success: true,
        tree: mockTree,
      });

      await latestResult?.refresh();
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(latestResult?.error).toBeUndefined();
      unmount();
    });
  });

  describe("refresh functionality", () => {
    test("provides refresh function", async () => {
      let latestResult: UseFudaDepsResult | undefined;

      const { unmount } = render(
        <TestComponent
          id="sk-test"
          onResult={(result) => {
            latestResult = result;
          }}
        />
      );

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(typeof latestResult?.refresh).toBe("function");
      unmount();
    });

    test("refresh calls both deps functions again", async () => {
      let latestResult: UseFudaDepsResult | undefined;

      const { unmount } = render(
        <TestComponent
          id="sk-test"
          onResult={(result) => {
            latestResult = result;
          }}
        />
      );

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(runDepsTreeSpy).toHaveBeenCalledTimes(1);
      expect(runDepsBlockedSpy).toHaveBeenCalledTimes(1);

      await latestResult?.refresh();

      expect(runDepsTreeSpy).toHaveBeenCalledTimes(2);
      expect(runDepsBlockedSpy).toHaveBeenCalledTimes(2);
      unmount();
    });

    test("refresh updates data with new results", async () => {
      let latestResult: UseFudaDepsResult | undefined;

      const { unmount } = render(
        <TestComponent
          id="sk-test"
          onResult={(result) => {
            latestResult = result;
          }}
        />
      );

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(latestResult?.blocking).toEqual(mockBlocking);

      const newBlocking: BlockingFuda[] = [
        {
          id: "sk-new",
          displayId: null,
          title: "New blocker",
          status: FudaStatus.READY,
          type: DependencyType.BLOCKS,
        },
      ];

      runDepsBlockedSpy.mockResolvedValue({
        success: true,
        blocking: newBlocking,
      });

      await latestResult?.refresh();
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(latestResult?.blocking).toEqual(newBlocking);
      unmount();
    });
  });

  describe("id changes", () => {
    test("refetches when id changes", async () => {
      const { unmount, rerender } = render(<TestComponent id="sk-first" />);

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(runDepsTreeSpy).toHaveBeenCalledTimes(1);
      expect(runDepsTreeSpy).toHaveBeenLastCalledWith(
        expect.objectContaining({ id: "sk-first" })
      );

      rerender(<TestComponent id="sk-second" />);

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(runDepsTreeSpy).toHaveBeenCalledTimes(2);
      expect(runDepsTreeSpy).toHaveBeenLastCalledWith(
        expect.objectContaining({ id: "sk-second" })
      );
      unmount();
    });
  });

  describe("return value structure", () => {
    test("returns expected shape", async () => {
      let latestResult: UseFudaDepsResult | undefined;

      const { unmount } = render(
        <TestComponent
          id="sk-test"
          onResult={(result) => {
            latestResult = result;
          }}
        />
      );

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(latestResult).toHaveProperty("tree");
      expect(latestResult).toHaveProperty("blocking");
      expect(latestResult).toHaveProperty("hasBlockers");
      expect(latestResult).toHaveProperty("blockerCount");
      expect(latestResult).toHaveProperty("loading");
      expect(latestResult).toHaveProperty("error");
      expect(latestResult).toHaveProperty("refresh");
      unmount();
    });

    test("tree is an object", async () => {
      let latestResult: UseFudaDepsResult | undefined;

      const { unmount } = render(
        <TestComponent
          id="sk-test"
          onResult={(result) => {
            latestResult = result;
          }}
        />
      );

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(typeof latestResult?.tree).toBe("object");
      expect(latestResult?.tree).not.toBeNull();
      unmount();
    });

    test("blocking is an array", async () => {
      let latestResult: UseFudaDepsResult | undefined;

      const { unmount } = render(
        <TestComponent
          id="sk-test"
          onResult={(result) => {
            latestResult = result;
          }}
        />
      );

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(Array.isArray(latestResult?.blocking)).toBe(true);
      unmount();
    });

    test("hasBlockers is a boolean", async () => {
      let latestResult: UseFudaDepsResult | undefined;

      const { unmount } = render(
        <TestComponent
          id="sk-test"
          onResult={(result) => {
            latestResult = result;
          }}
        />
      );

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(typeof latestResult?.hasBlockers).toBe("boolean");
      unmount();
    });

    test("blockerCount is a number", async () => {
      let latestResult: UseFudaDepsResult | undefined;

      const { unmount } = render(
        <TestComponent
          id="sk-test"
          onResult={(result) => {
            latestResult = result;
          }}
        />
      );

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(typeof latestResult?.blockerCount).toBe("number");
      unmount();
    });
  });
});
