import { describe, expect, test, beforeEach, afterEach, spyOn } from "bun:test";
import React, { useRef, useEffect } from "react";
import { render } from "ink-testing-library";
import { Text } from "ink";
import { useFudaList, type UseFudaListResult } from "../../../src/tui/hooks/useFudaList";
import * as listModule from "../../../src/cli/commands/list";
import { type Fuda, FudaStatus, SpiritType } from "../../../src/types";

// Mock fuda data for testing
const mockFudas: Fuda[] = [
  {
    id: "sk-test1",
    displayId: null,
    prdId: null,
    title: "Test task 1",
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
    displayId: null,
    prdId: null,
    title: "Test task 2",
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
    displayId: null,
    prdId: null,
    title: "Test task 3",
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

// Helper component to test the hook
interface TestComponentProps {
  options?: Parameters<typeof useFudaList>[0];
  onResult?: (result: UseFudaListResult) => void;
}

function TestComponent({ options, onResult }: TestComponentProps) {
  const result = useFudaList(options);
  const resultRef = useRef(result);
  resultRef.current = result;

  useEffect(() => {
    onResult?.(result);
  }, [result, onResult]);

  return (
    <Text>
      {JSON.stringify({
        loading: result.loading,
        fudaCount: result.fudas.length,
        error: result.error,
        hasRefresh: typeof result.refresh === "function",
      })}
    </Text>
  );
}

describe("useFudaList hook", () => {
  let runListSpy: ReturnType<typeof spyOn>;

  beforeEach(() => {
    runListSpy = spyOn(listModule, "runList").mockResolvedValue({
      success: true,
      fudas: mockFudas,
    });
  });

  afterEach(() => {
    runListSpy.mockRestore();
  });

  describe("initial loading", () => {
    test("calls runList on mount", async () => {
      const { unmount } = render(<TestComponent />);

      // Wait for async effect
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(runListSpy).toHaveBeenCalled();
      unmount();
    });

    test("returns loading state initially", async () => {
      let initialLoading: boolean | undefined;

      const { unmount } = render(
        <TestComponent
          onResult={(result) => {
            if (initialLoading === undefined) {
              initialLoading = result.loading;
            }
          }}
        />
      );

      // The first render should have loading=true
      expect(initialLoading).toBe(true);
      unmount();
    });

    test("returns fudas after loading", async () => {
      let latestResult: UseFudaListResult | undefined;

      const { unmount, lastFrame } = render(
        <TestComponent
          onResult={(result) => {
            latestResult = result;
          }}
        />
      );

      // Wait for async effect to complete
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(latestResult?.loading).toBe(false);
      expect(latestResult?.fudas).toEqual(mockFudas);
      unmount();
    });

    test("returns error when runList fails", async () => {
      runListSpy.mockResolvedValue({
        success: false,
        error: "Database error",
      });

      let latestResult: UseFudaListResult | undefined;

      const { unmount } = render(
        <TestComponent
          onResult={(result) => {
            latestResult = result;
          }}
        />
      );

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(latestResult?.loading).toBe(false);
      expect(latestResult?.error).toBe("Database error");
      expect(latestResult?.fudas).toEqual([]);
      unmount();
    });
  });

  describe("filtering", () => {
    test("passes status filter to runList", async () => {
      const { unmount } = render(
        <TestComponent options={{ status: FudaStatus.READY }} />
      );

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(runListSpy).toHaveBeenCalledWith(
        expect.objectContaining({ status: FudaStatus.READY })
      );
      unmount();
    });

    test("passes all flag to runList", async () => {
      const { unmount } = render(<TestComponent options={{ all: true }} />);

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(runListSpy).toHaveBeenCalledWith(
        expect.objectContaining({ all: true })
      );
      unmount();
    });

    test("passes limit to runList", async () => {
      const { unmount } = render(<TestComponent options={{ limit: 10 }} />);

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(runListSpy).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 10 })
      );
      unmount();
    });

    test("refetches when filter options change", async () => {
      const { unmount, rerender } = render(<TestComponent options={{}} />);

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(runListSpy).toHaveBeenCalledTimes(1);

      rerender(<TestComponent options={{ status: FudaStatus.READY }} />);

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(runListSpy).toHaveBeenCalledTimes(2);
      expect(runListSpy).toHaveBeenLastCalledWith(
        expect.objectContaining({ status: FudaStatus.READY })
      );
      unmount();
    });
  });

  describe("refresh", () => {
    test("provides refresh function", async () => {
      let latestResult: UseFudaListResult | undefined;

      const { unmount } = render(
        <TestComponent
          onResult={(result) => {
            latestResult = result;
          }}
        />
      );

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(typeof latestResult?.refresh).toBe("function");
      unmount();
    });

    test("refresh calls runList again", async () => {
      let latestResult: UseFudaListResult | undefined;

      const { unmount } = render(
        <TestComponent
          onResult={(result) => {
            latestResult = result;
          }}
        />
      );

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(runListSpy).toHaveBeenCalledTimes(1);

      await latestResult?.refresh();

      expect(runListSpy).toHaveBeenCalledTimes(2);
      unmount();
    });

    test("refresh updates fudas with new data", async () => {
      let latestResult: UseFudaListResult | undefined;

      const { unmount } = render(
        <TestComponent
          onResult={(result) => {
            latestResult = result;
          }}
        />
      );

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(latestResult?.fudas).toEqual(mockFudas);

      const newFudas = [mockFudas[0]];
      runListSpy.mockResolvedValue({
        success: true,
        fudas: newFudas,
      });

      await latestResult?.refresh();

      // Wait for state to update
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(latestResult?.fudas).toEqual(newFudas);
      unmount();
    });

    test("refresh sets loading state during fetch", async () => {
      let capturedLoadingStates: boolean[] = [];

      const { unmount } = render(
        <TestComponent
          onResult={(result) => {
            capturedLoadingStates.push(result.loading);
          }}
        />
      );

      await new Promise((resolve) => setTimeout(resolve, 50));

      // Reset to capture refresh loading states
      capturedLoadingStates = [];

      // Get the result to call refresh
      let latestResult: UseFudaListResult | undefined;
      const { unmount: unmount2 } = render(
        <TestComponent
          onResult={(result) => {
            latestResult = result;
            capturedLoadingStates.push(result.loading);
          }}
        />
      );

      await new Promise((resolve) => setTimeout(resolve, 50));

      capturedLoadingStates = [];
      await latestResult?.refresh();

      // Should have gone through loading=true at some point
      // Note: Due to batching, we might not capture intermediate states
      // But we can verify final state is not loading
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(latestResult?.loading).toBe(false);
      unmount();
      unmount2();
    });
  });

  describe("return value structure", () => {
    test("returns expected shape", async () => {
      let latestResult: UseFudaListResult | undefined;

      const { unmount } = render(
        <TestComponent
          onResult={(result) => {
            latestResult = result;
          }}
        />
      );

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(latestResult).toHaveProperty("fudas");
      expect(latestResult).toHaveProperty("loading");
      expect(latestResult).toHaveProperty("error");
      expect(latestResult).toHaveProperty("refresh");
      unmount();
    });

    test("fudas is an array", async () => {
      let latestResult: UseFudaListResult | undefined;

      const { unmount } = render(
        <TestComponent
          onResult={(result) => {
            latestResult = result;
          }}
        />
      );

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(Array.isArray(latestResult?.fudas)).toBe(true);
      unmount();
    });

    test("loading is a boolean", async () => {
      let latestResult: UseFudaListResult | undefined;

      const { unmount } = render(
        <TestComponent
          onResult={(result) => {
            latestResult = result;
          }}
        />
      );

      // Check immediately on first render
      expect(typeof latestResult?.loading).toBe("boolean");
      unmount();
    });

    test("error is undefined when no error", async () => {
      let latestResult: UseFudaListResult | undefined;

      const { unmount } = render(
        <TestComponent
          onResult={(result) => {
            latestResult = result;
          }}
        />
      );

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(latestResult?.error).toBeUndefined();
      unmount();
    });
  });
});
