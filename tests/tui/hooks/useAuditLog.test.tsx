import { describe, expect, test, beforeEach, afterEach, spyOn } from "bun:test";
import React, { useRef, useEffect } from "react";
import { render } from "ink-testing-library";
import { Text } from "ink";
import {
  useAuditLog,
  type UseAuditLogResult,
} from "../../../src/tui/hooks/useAuditLog";
import * as logModule from "../../../src/cli/commands/log";
import { AuditOperation, type AuditEntry } from "../../../src/db/audit";

// Mock audit entry data for testing
const mockAuditEntries: AuditEntry[] = [
  {
    id: "1",
    fudaId: "sk-test1",
    operation: AuditOperation.UPDATE,
    field: "status",
    oldValue: "blocked",
    newValue: "in_progress",
    actor: "agent-123",
    timestamp: new Date("2026-01-06T10:00:00Z"),
  },
  {
    id: "2",
    fudaId: "sk-test1",
    operation: AuditOperation.CREATE,
    field: null,
    oldValue: null,
    newValue: null,
    actor: "cli",
    timestamp: new Date("2026-01-06T09:00:00Z"),
  },
  {
    id: "3",
    fudaId: "sk-test2",
    operation: AuditOperation.UPDATE,
    field: "title",
    oldValue: "Old title",
    newValue: "New title",
    actor: "user",
    timestamp: new Date("2026-01-06T08:00:00Z"),
  },
];

// Helper component to test the hook
interface TestComponentProps {
  options?: Parameters<typeof useAuditLog>[0];
  onResult?: (result: UseAuditLogResult) => void;
}

function TestComponent({ options, onResult }: TestComponentProps) {
  const result = useAuditLog(options);
  const resultRef = useRef(result);
  resultRef.current = result;

  useEffect(() => {
    onResult?.(result);
  }, [result, onResult]);

  return (
    <Text>
      {JSON.stringify({
        loading: result.loading,
        entryCount: result.entries.length,
        error: result.error,
        hasRefresh: typeof result.refresh === "function",
      })}
    </Text>
  );
}

describe("useAuditLog hook", () => {
  let runLogAllSpy: ReturnType<typeof spyOn>;
  let runLogSpy: ReturnType<typeof spyOn>;

  beforeEach(() => {
    runLogAllSpy = spyOn(logModule, "runLogAll").mockResolvedValue({
      success: true,
      entries: mockAuditEntries,
    });
    runLogSpy = spyOn(logModule, "runLog").mockResolvedValue({
      success: true,
      entries: mockAuditEntries.filter((e) => e.fudaId === "sk-test1"),
    });
  });

  afterEach(() => {
    runLogAllSpy.mockRestore();
    runLogSpy.mockRestore();
  });

  describe("fetching audit entries from database", () => {
    test("calls runLogAll on mount when no fudaId provided", async () => {
      const { unmount } = render(<TestComponent />);

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(runLogAllSpy).toHaveBeenCalled();
      unmount();
    });

    test("calls runLog with fudaId when provided", async () => {
      const { unmount } = render(
        <TestComponent options={{ fudaId: "sk-test1" }} />
      );

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(runLogSpy).toHaveBeenCalledWith(
        expect.objectContaining({ id: "sk-test1" })
      );
      unmount();
    });

    test("returns audit entries after loading", async () => {
      let latestResult: UseAuditLogResult | undefined;

      const { unmount } = render(
        <TestComponent
          onResult={(result) => {
            latestResult = result;
          }}
        />
      );

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(latestResult?.loading).toBe(false);
      expect(latestResult?.entries).toEqual(mockAuditEntries);
      unmount();
    });

    test("returns entries for specific fuda when fudaId provided", async () => {
      let latestResult: UseAuditLogResult | undefined;

      const { unmount } = render(
        <TestComponent
          options={{ fudaId: "sk-test1" }}
          onResult={(result) => {
            latestResult = result;
          }}
        />
      );

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(latestResult?.loading).toBe(false);
      expect(latestResult?.entries).toHaveLength(2);
      expect(
        latestResult?.entries.every(
          (e: AuditEntry) => e.fudaId === "sk-test1"
        )
      ).toBe(true);
      unmount();
    });
  });

  describe("handling empty audit log", () => {
    test("returns empty array when no audit entries exist", async () => {
      runLogAllSpy.mockResolvedValue({
        success: true,
        entries: [],
      });

      let latestResult: UseAuditLogResult | undefined;

      const { unmount } = render(
        <TestComponent
          onResult={(result) => {
            latestResult = result;
          }}
        />
      );

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(latestResult?.loading).toBe(false);
      expect(latestResult?.entries).toEqual([]);
      expect(latestResult?.error).toBeUndefined();
      unmount();
    });

    test("returns empty array when fuda has no audit entries", async () => {
      runLogSpy.mockResolvedValue({
        success: true,
        entries: [],
      });

      let latestResult: UseAuditLogResult | undefined;

      const { unmount } = render(
        <TestComponent
          options={{ fudaId: "sk-empty" }}
          onResult={(result) => {
            latestResult = result;
          }}
        />
      );

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(latestResult?.loading).toBe(false);
      expect(latestResult?.entries).toEqual([]);
      unmount();
    });
  });

  describe("respecting limit option", () => {
    test("passes limit to runLogAll", async () => {
      const { unmount } = render(<TestComponent options={{ limit: 5 }} />);

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(runLogAllSpy).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 5 })
      );
      unmount();
    });

    test("passes limit to runLog when fudaId provided", async () => {
      const { unmount } = render(
        <TestComponent options={{ fudaId: "sk-test1", limit: 10 }} />
      );

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(runLogSpy).toHaveBeenCalledWith(
        expect.objectContaining({ id: "sk-test1", limit: 10 })
      );
      unmount();
    });

    test("returns limited entries when limit is set", async () => {
      const limitedEntries = mockAuditEntries.slice(0, 2);
      runLogAllSpy.mockResolvedValue({
        success: true,
        entries: limitedEntries,
      });

      let latestResult: UseAuditLogResult | undefined;

      const { unmount } = render(
        <TestComponent
          options={{ limit: 2 }}
          onResult={(result) => {
            latestResult = result;
          }}
        />
      );

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(latestResult?.entries).toHaveLength(2);
      unmount();
    });
  });

  describe("loading state", () => {
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

      expect(initialLoading).toBe(true);
      unmount();
    });

    test("loading becomes false after fetch completes", async () => {
      let latestResult: UseAuditLogResult | undefined;

      const { unmount } = render(
        <TestComponent
          onResult={(result) => {
            latestResult = result;
          }}
        />
      );

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(latestResult?.loading).toBe(false);
      unmount();
    });
  });

  describe("error handling", () => {
    test("returns error when runLogAll fails", async () => {
      runLogAllSpy.mockResolvedValue({
        success: false,
        error: "Database error",
      });

      let latestResult: UseAuditLogResult | undefined;

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
      expect(latestResult?.entries).toEqual([]);
      unmount();
    });

    test("returns error when runLog fails", async () => {
      runLogSpy.mockResolvedValue({
        success: false,
        error: "Fuda not found",
      });

      let latestResult: UseAuditLogResult | undefined;

      const { unmount } = render(
        <TestComponent
          options={{ fudaId: "sk-nonexistent" }}
          onResult={(result) => {
            latestResult = result;
          }}
        />
      );

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(latestResult?.loading).toBe(false);
      expect(latestResult?.error).toBe("Fuda not found");
      unmount();
    });
  });

  describe("refresh functionality", () => {
    test("provides refresh function", async () => {
      let latestResult: UseAuditLogResult | undefined;

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

    test("refresh calls fetch again", async () => {
      let latestResult: UseAuditLogResult | undefined;

      const { unmount } = render(
        <TestComponent
          onResult={(result) => {
            latestResult = result;
          }}
        />
      );

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(runLogAllSpy).toHaveBeenCalledTimes(1);

      await latestResult?.refresh();

      expect(runLogAllSpy).toHaveBeenCalledTimes(2);
      unmount();
    });

    test("refresh updates entries with new data", async () => {
      let latestResult: UseAuditLogResult | undefined;

      const { unmount } = render(
        <TestComponent
          onResult={(result) => {
            latestResult = result;
          }}
        />
      );

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(latestResult?.entries).toEqual(mockAuditEntries);

      const newEntries = [mockAuditEntries[0]];
      runLogAllSpy.mockResolvedValue({
        success: true,
        entries: newEntries,
      });

      await latestResult?.refresh();
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(latestResult?.entries).toEqual(newEntries);
      unmount();
    });
  });

  describe("return value structure", () => {
    test("returns expected shape", async () => {
      let latestResult: UseAuditLogResult | undefined;

      const { unmount } = render(
        <TestComponent
          onResult={(result) => {
            latestResult = result;
          }}
        />
      );

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(latestResult).toHaveProperty("entries");
      expect(latestResult).toHaveProperty("loading");
      expect(latestResult).toHaveProperty("error");
      expect(latestResult).toHaveProperty("refresh");
      unmount();
    });

    test("entries is an array", async () => {
      let latestResult: UseAuditLogResult | undefined;

      const { unmount } = render(
        <TestComponent
          onResult={(result) => {
            latestResult = result;
          }}
        />
      );

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(Array.isArray(latestResult?.entries)).toBe(true);
      unmount();
    });

    test("loading is a boolean", async () => {
      let latestResult: UseAuditLogResult | undefined;

      const { unmount } = render(
        <TestComponent
          onResult={(result) => {
            latestResult = result;
          }}
        />
      );

      expect(typeof latestResult?.loading).toBe("boolean");
      unmount();
    });

    test("error is undefined when no error", async () => {
      let latestResult: UseAuditLogResult | undefined;

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

  describe("refetching on option changes", () => {
    test("refetches when fudaId changes", async () => {
      const { unmount, rerender } = render(<TestComponent options={{}} />);

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(runLogAllSpy).toHaveBeenCalledTimes(1);

      rerender(<TestComponent options={{ fudaId: "sk-test1" }} />);

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(runLogSpy).toHaveBeenCalled();
      unmount();
    });

    test("refetches when limit changes", async () => {
      const { unmount, rerender } = render(
        <TestComponent options={{ limit: 5 }} />
      );

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(runLogAllSpy).toHaveBeenCalledTimes(1);

      rerender(<TestComponent options={{ limit: 10 }} />);

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(runLogAllSpy).toHaveBeenCalledTimes(2);
      expect(runLogAllSpy).toHaveBeenLastCalledWith(
        expect.objectContaining({ limit: 10 })
      );
      unmount();
    });
  });
});
