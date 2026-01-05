import { describe, expect, test, beforeEach, spyOn } from "bun:test";
import { renderHook, act } from "@testing-library/react";
import { useFudaDeps } from "../../../src/tui/hooks/useFudaDeps";
import * as treeModule from "../../../src/cli/commands/deps/tree";
import * as blockedModule from "../../../src/cli/commands/deps/blocked";
import { DependencyType, FudaStatus } from "../../../src/types";
import type { BlockingFuda } from "../../../src/cli/commands/deps/blocked";
import type { FudaDependency } from "../../../src/types";

// Mock dependency tree data
const mockTree: Record<string, FudaDependency[]> = {
  "sk-root": [
    { fudaId: "sk-root", dependsOnId: "sk-child1", type: DependencyType.BLOCKS },
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
    status: FudaStatus.PENDING,
    type: DependencyType.PARENT_CHILD,
  },
];

describe("useFudaDeps hook", () => {
  let runDepsTreeSpy: ReturnType<typeof spyOn>;
  let runDepsBlockedSpy: ReturnType<typeof spyOn>;

  beforeEach(() => {
    runDepsTreeSpy = spyOn(treeModule, "runDepsTree").mockResolvedValue({
      success: true,
      tree: mockTree,
    });
    runDepsBlockedSpy = spyOn(blockedModule, "runDepsBlocked").mockResolvedValue(
      {
        success: true,
        blocking: mockBlocking,
      }
    );
  });

  describe("calling deps functions", () => {
    test("calls runDepsTree with fuda id on mount", async () => {
      const { result } = renderHook(() => useFudaDeps({ id: "sk-test" }));

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(runDepsTreeSpy).toHaveBeenCalledWith(
        expect.objectContaining({ id: "sk-test" })
      );
    });

    test("calls runDepsBlocked with fuda id on mount", async () => {
      const { result } = renderHook(() => useFudaDeps({ id: "sk-test" }));

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(runDepsBlockedSpy).toHaveBeenCalledWith(
        expect.objectContaining({ id: "sk-test" })
      );
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

      const { result } = renderHook(() => useFudaDeps({ id: "sk-test" }));

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
      });

      // Both calls should happen roughly at the same time (within 5ms)
      expect(Math.abs(treeCallTime - blockedCallTime)).toBeLessThan(5);
    });

    test("passes depth option to runDepsTree", async () => {
      const { result } = renderHook(() =>
        useFudaDeps({ id: "sk-test", depth: 3 })
      );

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(runDepsTreeSpy).toHaveBeenCalledWith(
        expect.objectContaining({ id: "sk-test", depth: 3 })
      );
    });
  });

  describe("data transformation", () => {
    test("returns dependency tree from runDepsTree", async () => {
      const { result } = renderHook(() => useFudaDeps({ id: "sk-test" }));

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(result.current.tree).toEqual(mockTree);
    });

    test("returns blocking dependencies from runDepsBlocked", async () => {
      const { result } = renderHook(() => useFudaDeps({ id: "sk-test" }));

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(result.current.blocking).toEqual(mockBlocking);
    });

    test("returns empty tree when no dependencies exist", async () => {
      runDepsTreeSpy.mockResolvedValue({
        success: true,
        tree: {},
      });

      const { result } = renderHook(() => useFudaDeps({ id: "sk-test" }));

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(result.current.tree).toEqual({});
    });

    test("returns empty blocking array when no blockers exist", async () => {
      runDepsBlockedSpy.mockResolvedValue({
        success: true,
        blocking: [],
      });

      const { result } = renderHook(() => useFudaDeps({ id: "sk-test" }));

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(result.current.blocking).toEqual([]);
    });

    test("computes hasBlockers correctly when blockers exist", async () => {
      const { result } = renderHook(() => useFudaDeps({ id: "sk-test" }));

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(result.current.hasBlockers).toBe(true);
    });

    test("computes hasBlockers correctly when no blockers exist", async () => {
      runDepsBlockedSpy.mockResolvedValue({
        success: true,
        blocking: [],
      });

      const { result } = renderHook(() => useFudaDeps({ id: "sk-test" }));

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(result.current.hasBlockers).toBe(false);
    });

    test("computes blockerCount correctly", async () => {
      const { result } = renderHook(() => useFudaDeps({ id: "sk-test" }));

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(result.current.blockerCount).toBe(2);
    });
  });

  describe("loading state", () => {
    test("returns loading true initially", () => {
      const { result } = renderHook(() => useFudaDeps({ id: "sk-test" }));

      expect(result.current.loading).toBe(true);
    });

    test("returns loading false after data loads", async () => {
      const { result } = renderHook(() => useFudaDeps({ id: "sk-test" }));

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(result.current.loading).toBe(false);
    });

    test("sets loading during refresh", async () => {
      const { result } = renderHook(() => useFudaDeps({ id: "sk-test" }));

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(result.current.loading).toBe(false);

      await act(async () => {
        const refreshPromise = result.current.refresh();
        expect(result.current.loading).toBe(true);
        await refreshPromise;
      });

      expect(result.current.loading).toBe(false);
    });
  });

  describe("error handling", () => {
    test("returns error when runDepsTree fails", async () => {
      runDepsTreeSpy.mockResolvedValue({
        success: false,
        error: "Tree error",
      });

      const { result } = renderHook(() => useFudaDeps({ id: "sk-test" }));

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(result.current.error).toBe("Tree error");
    });

    test("returns error when runDepsBlocked fails", async () => {
      runDepsBlockedSpy.mockResolvedValue({
        success: false,
        error: "Blocked error",
      });

      const { result } = renderHook(() => useFudaDeps({ id: "sk-test" }));

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(result.current.error).toBe("Blocked error");
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

      const { result } = renderHook(() => useFudaDeps({ id: "sk-test" }));

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      // Should return at least one of the errors
      expect(["Tree error", "Blocked error"]).toContain(result.current.error);
    });

    test("returns empty data on error", async () => {
      runDepsTreeSpy.mockResolvedValue({
        success: false,
        error: "Error",
      });

      const { result } = renderHook(() => useFudaDeps({ id: "sk-test" }));

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(result.current.tree).toEqual({});
      expect(result.current.blocking).toEqual([]);
    });

    test("clears error after successful refresh", async () => {
      runDepsTreeSpy.mockResolvedValueOnce({
        success: false,
        error: "Initial error",
      });

      const { result } = renderHook(() => useFudaDeps({ id: "sk-test" }));

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(result.current.error).toBe("Initial error");

      runDepsTreeSpy.mockResolvedValueOnce({
        success: true,
        tree: mockTree,
      });

      await act(async () => {
        await result.current.refresh();
      });

      expect(result.current.error).toBeUndefined();
    });
  });

  describe("refresh functionality", () => {
    test("provides refresh function", async () => {
      const { result } = renderHook(() => useFudaDeps({ id: "sk-test" }));

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(typeof result.current.refresh).toBe("function");
    });

    test("refresh calls both deps functions again", async () => {
      const { result } = renderHook(() => useFudaDeps({ id: "sk-test" }));

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(runDepsTreeSpy).toHaveBeenCalledTimes(1);
      expect(runDepsBlockedSpy).toHaveBeenCalledTimes(1);

      await act(async () => {
        await result.current.refresh();
      });

      expect(runDepsTreeSpy).toHaveBeenCalledTimes(2);
      expect(runDepsBlockedSpy).toHaveBeenCalledTimes(2);
    });

    test("refresh updates data with new results", async () => {
      const { result } = renderHook(() => useFudaDeps({ id: "sk-test" }));

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(result.current.blocking).toEqual(mockBlocking);

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

      await act(async () => {
        await result.current.refresh();
      });

      expect(result.current.blocking).toEqual(newBlocking);
    });
  });

  describe("id changes", () => {
    test("refetches when id changes", async () => {
      const { result, rerender } = renderHook(
        (props: { id: string }) => useFudaDeps(props),
        { initialProps: { id: "sk-first" } }
      );

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(runDepsTreeSpy).toHaveBeenCalledTimes(1);
      expect(runDepsTreeSpy).toHaveBeenLastCalledWith(
        expect.objectContaining({ id: "sk-first" })
      );

      rerender({ id: "sk-second" });

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(runDepsTreeSpy).toHaveBeenCalledTimes(2);
      expect(runDepsTreeSpy).toHaveBeenLastCalledWith(
        expect.objectContaining({ id: "sk-second" })
      );
    });
  });

  describe("return value structure", () => {
    test("returns expected shape", async () => {
      const { result } = renderHook(() => useFudaDeps({ id: "sk-test" }));

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(result.current).toHaveProperty("tree");
      expect(result.current).toHaveProperty("blocking");
      expect(result.current).toHaveProperty("hasBlockers");
      expect(result.current).toHaveProperty("blockerCount");
      expect(result.current).toHaveProperty("loading");
      expect(result.current).toHaveProperty("error");
      expect(result.current).toHaveProperty("refresh");
    });

    test("tree is an object", async () => {
      const { result } = renderHook(() => useFudaDeps({ id: "sk-test" }));

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(typeof result.current.tree).toBe("object");
      expect(result.current.tree).not.toBeNull();
    });

    test("blocking is an array", async () => {
      const { result } = renderHook(() => useFudaDeps({ id: "sk-test" }));

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(Array.isArray(result.current.blocking)).toBe(true);
    });

    test("hasBlockers is a boolean", async () => {
      const { result } = renderHook(() => useFudaDeps({ id: "sk-test" }));

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(typeof result.current.hasBlockers).toBe("boolean");
    });

    test("blockerCount is a number", async () => {
      const { result } = renderHook(() => useFudaDeps({ id: "sk-test" }));

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(typeof result.current.blockerCount).toBe("number");
    });
  });
});
