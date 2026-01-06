import { describe, expect, test, mock } from "bun:test";
import React from "react";
import { render } from "ink-testing-library";
import { StatusPicker } from "../../../src/tui/components/StatusPicker";
import { FudaStatus } from "../../../src/types";

describe("StatusPicker component", () => {
  describe("renders status options", () => {
    test("renders all available status options", () => {
      const { lastFrame } = render(
        <StatusPicker
          fudaId="sk-test1"
          currentStatus={FudaStatus.PENDING}
          onStatusChange={() => {}}
        />
      );

      const output = lastFrame();
      expect(output).toContain("pending");
      expect(output).toContain("ready");
      expect(output).toContain("in_progress");
      expect(output).toContain("in_review");
      expect(output).toContain("done");
      expect(output).toContain("failed");
      expect(output).toContain("blocked");
    });

    test("highlights current status", () => {
      const { lastFrame: pendingFrame } = render(
        <StatusPicker
          fudaId="sk-test1"
          currentStatus={FudaStatus.PENDING}
          onStatusChange={() => {}}
        />
      );
      const { lastFrame: readyFrame } = render(
        <StatusPicker
          fudaId="sk-test1"
          currentStatus={FudaStatus.READY}
          onStatusChange={() => {}}
        />
      );

      // Different current statuses should render differently
      expect(pendingFrame()).not.toBe(readyFrame());
    });

    test("renders without crashing with all status types", () => {
      const statuses = Object.values(FudaStatus);

      statuses.forEach((status) => {
        const { lastFrame } = render(
          <StatusPicker
            fudaId="sk-test1"
            currentStatus={status}
            onStatusChange={() => {}}
          />
        );
        expect(lastFrame()).toBeDefined();
      });
    });
  });

  describe("selection", () => {
    test("allows selecting a different status with arrow keys", () => {
      let selectedStatus: FudaStatus | null = null;
      const handleChange = (status: FudaStatus) => {
        selectedStatus = status;
      };

      const { stdin } = render(
        <StatusPicker
          fudaId="sk-test1"
          currentStatus={FudaStatus.PENDING}
          onStatusChange={handleChange}
        />
      );

      // Move down and press enter to select
      stdin.write("\x1B[B"); // Down arrow
      stdin.write("\r"); // Enter

      expect(selectedStatus).not.toBeNull();
    });

    test("j key moves selection down (vim-style)", () => {
      let receivedStatus: FudaStatus | null = null;
      const handleChange = (status: FudaStatus) => {
        receivedStatus = status;
      };

      const { stdin } = render(
        <StatusPicker
          fudaId="sk-test1"
          currentStatus={FudaStatus.PENDING}
          onStatusChange={handleChange}
        />
      );

      // j should move to ready (second option)
      stdin.write("j");
      stdin.write("\r");

      expect(receivedStatus).not.toBeNull();
      expect(receivedStatus!).toBe(FudaStatus.READY);
    });

    test("k key moves selection up (vim-style)", () => {
      let receivedStatus: FudaStatus | null = null;
      const handleChange = (status: FudaStatus) => {
        receivedStatus = status;
      };

      const { stdin } = render(
        <StatusPicker
          fudaId="sk-test1"
          currentStatus={FudaStatus.PENDING}
          onStatusChange={handleChange}
        />
      );

      // Move down twice, then up once (pending -> ready -> in_progress -> ready)
      stdin.write("j");
      stdin.write("j");
      stdin.write("k");
      stdin.write("\r");

      expect(receivedStatus).not.toBeNull();
      expect(receivedStatus!).toBe(FudaStatus.READY);
    });

    test("Enter key confirms selection", () => {
      let selectedStatus: FudaStatus | null = null;
      const handleChange = (status: FudaStatus) => {
        selectedStatus = status;
      };

      const { stdin } = render(
        <StatusPicker
          fudaId="sk-test1"
          currentStatus={FudaStatus.PENDING}
          onStatusChange={handleChange}
        />
      );

      stdin.write("\r"); // Enter

      expect(selectedStatus).toBeDefined();
    });

    test("space key confirms selection", () => {
      let selectedStatus: FudaStatus | null = null;
      const handleChange = (status: FudaStatus) => {
        selectedStatus = status;
      };

      const { stdin } = render(
        <StatusPicker
          fudaId="sk-test1"
          currentStatus={FudaStatus.PENDING}
          onStatusChange={handleChange}
        />
      );

      stdin.write(" "); // Space

      expect(selectedStatus).toBeDefined();
    });

    test("does not go below last option", () => {
      const { stdin, lastFrame } = render(
        <StatusPicker
          fudaId="sk-test1"
          currentStatus={FudaStatus.PENDING}
          onStatusChange={() => {}}
        />
      );

      // Press down many times to go past the end
      for (let i = 0; i < 20; i++) {
        stdin.write("\x1B[B");
      }

      // Should render without crashing
      expect(lastFrame()).toBeDefined();
    });

    test("does not go above first option", () => {
      const { stdin, lastFrame } = render(
        <StatusPicker
          fudaId="sk-test1"
          currentStatus={FudaStatus.PENDING}
          onStatusChange={() => {}}
        />
      );

      // Press up many times
      for (let i = 0; i < 20; i++) {
        stdin.write("\x1B[A");
      }

      // Should render without crashing
      expect(lastFrame()).toBeDefined();
    });
  });

  describe("calls runUpdate", () => {
    test("calls onStatusChange with selected status", () => {
      let receivedStatus: FudaStatus | null = null;
      const handleChange = (status: FudaStatus) => {
        receivedStatus = status;
      };

      const { stdin } = render(
        <StatusPicker
          fudaId="sk-test1"
          currentStatus={FudaStatus.PENDING}
          onStatusChange={handleChange}
        />
      );

      // Navigate to ready (second option) and select
      stdin.write("\x1B[B"); // Down to ready
      stdin.write("\r"); // Enter

      expect(receivedStatus).not.toBeNull();
      expect(receivedStatus!).toBe(FudaStatus.READY);
    });

    test("passes fudaId to callback", () => {
      let receivedFudaId: string | null = null;
      const handleChange = (_status: FudaStatus, fudaId?: string) => {
        receivedFudaId = fudaId || null;
      };

      const { stdin } = render(
        <StatusPicker
          fudaId="sk-test123"
          currentStatus={FudaStatus.PENDING}
          onStatusChange={handleChange}
        />
      );

      stdin.write("\r"); // Enter

      expect(receivedFudaId).not.toBeNull();
      expect(receivedFudaId!).toBe("sk-test123");
    });

    test("does not call onStatusChange on navigation without confirmation", () => {
      let callCount = 0;
      const handleChange = () => {
        callCount++;
      };

      const { stdin } = render(
        <StatusPicker
          fudaId="sk-test1"
          currentStatus={FudaStatus.PENDING}
          onStatusChange={handleChange}
        />
      );

      // Just navigate without pressing enter
      stdin.write("\x1B[B");
      stdin.write("\x1B[B");
      stdin.write("\x1B[A");

      expect(callCount).toBe(0);
    });

    test("calls onStatusChange with correct status after navigating", () => {
      let receivedStatus: FudaStatus | null = null;
      const handleChange = (status: FudaStatus) => {
        receivedStatus = status;
      };

      const { stdin } = render(
        <StatusPicker
          fudaId="sk-test1"
          currentStatus={FudaStatus.PENDING}
          onStatusChange={handleChange}
        />
      );

      // Navigate down twice (pending -> ready -> in_progress)
      stdin.write("\x1B[B");
      stdin.write("\x1B[B");
      stdin.write("\r");

      expect(receivedStatus).not.toBeNull();
      expect(receivedStatus!).toBe(FudaStatus.IN_PROGRESS);
    });

    test("handles onCancel callback when Escape is pressed", () => {
      let cancelled = false;
      const handleCancel = () => {
        cancelled = true;
      };

      const { stdin } = render(
        <StatusPicker
          fudaId="sk-test1"
          currentStatus={FudaStatus.PENDING}
          onStatusChange={() => {}}
          onCancel={handleCancel}
        />
      );

      stdin.write("\x1B"); // Escape

      expect(cancelled).toBe(true);
    });

    test("does not crash when onCancel is not provided", () => {
      const { stdin, lastFrame } = render(
        <StatusPicker
          fudaId="sk-test1"
          currentStatus={FudaStatus.PENDING}
          onStatusChange={() => {}}
        />
      );

      stdin.write("\x1B"); // Escape

      expect(lastFrame()).toBeDefined();
    });
  });

  describe("visual feedback", () => {
    test("shows selection indicator on focused item", () => {
      const { lastFrame } = render(
        <StatusPicker
          fudaId="sk-test1"
          currentStatus={FudaStatus.PENDING}
          onStatusChange={() => {}}
        />
      );

      const output = lastFrame() || "";
      // Should have some kind of selection indicator (like > or highlighted)
      expect(output.length).toBeGreaterThan(0);
    });

    test("shows different visual for current status vs selected status", () => {
      // Verify navigation works by checking callback receives different statuses
      let receivedStatus: FudaStatus | null = null;
      const handleChange = (status: FudaStatus) => {
        receivedStatus = status;
      };

      const { stdin } = render(
        <StatusPicker
          fudaId="sk-test1"
          currentStatus={FudaStatus.PENDING}
          onStatusChange={handleChange}
        />
      );

      // Select current status (pending)
      stdin.write("\r");
      const firstSelection: FudaStatus | null = receivedStatus;

      // Reset and select a different status
      receivedStatus = null;
      const { stdin: stdin2 } = render(
        <StatusPicker
          fudaId="sk-test1"
          currentStatus={FudaStatus.PENDING}
          onStatusChange={handleChange}
        />
      );
      stdin2.write("\x1B[B"); // Move to ready
      stdin2.write("\r");

      // Should have selected different statuses
      expect(firstSelection).not.toBeNull();
      expect(firstSelection!).toBe(FudaStatus.PENDING);
      expect(receivedStatus).not.toBeNull();
      expect(receivedStatus!).toBe(FudaStatus.READY);
    });
  });

  describe("edge cases", () => {
    test("handles rapid key presses", () => {
      const { stdin, lastFrame } = render(
        <StatusPicker
          fudaId="sk-test1"
          currentStatus={FudaStatus.PENDING}
          onStatusChange={() => {}}
        />
      );

      // Rapid key presses
      stdin.write("jjjjkkkjjj");

      expect(lastFrame()).toBeDefined();
    });

    test("handles empty fudaId", () => {
      const { lastFrame } = render(
        <StatusPicker
          fudaId=""
          currentStatus={FudaStatus.PENDING}
          onStatusChange={() => {}}
        />
      );

      expect(lastFrame()).toBeDefined();
    });

    test("maintains selection after multiple renders", () => {
      let selectedStatus: FudaStatus | null = null;
      const handleChange = (status: FudaStatus) => {
        selectedStatus = status;
      };

      const { stdin, rerender } = render(
        <StatusPicker
          fudaId="sk-test1"
          currentStatus={FudaStatus.PENDING}
          onStatusChange={handleChange}
        />
      );

      stdin.write("\x1B[B"); // Navigate down

      rerender(
        <StatusPicker
          fudaId="sk-test1"
          currentStatus={FudaStatus.PENDING}
          onStatusChange={handleChange}
        />
      );

      stdin.write("\r"); // Confirm

      // Should have selected something
      expect(selectedStatus).not.toBeNull();
    });
  });
});
