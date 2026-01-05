import { describe, expect, test } from "bun:test";
import React from "react";
import { render } from "ink-testing-library";
import { FudaDetails } from "../../../src/tui/components/FudaDetails";
import { type Fuda, FudaStatus, SpiritType } from "../../../src/types";

// Mock fuda data for testing
const mockFuda: Fuda = {
  id: "sk-test1",
  displayId: "TASK-123",
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

describe("FudaDetails component", () => {
  describe("renders all fuda fields", () => {
    test("renders fuda ID", () => {
      const { lastFrame } = render(
        <FudaDetails fuda={mockFuda} onClose={() => {}} />
      );

      const output = lastFrame();
      expect(output).toContain("sk-test1");
    });

    test("renders displayId when available", () => {
      const { lastFrame } = render(
        <FudaDetails fuda={mockFuda} onClose={() => {}} />
      );

      const output = lastFrame();
      expect(output).toContain("TASK-123");
    });

    test("renders title", () => {
      const { lastFrame } = render(
        <FudaDetails fuda={mockFuda} onClose={() => {}} />
      );

      const output = lastFrame();
      expect(output).toContain("Test fuda title");
    });

    test("renders description", () => {
      const { lastFrame } = render(
        <FudaDetails fuda={mockFuda} onClose={() => {}} />
      );

      const output = lastFrame();
      expect(output).toContain("This is a detailed description of the fuda");
    });

    test("renders status", () => {
      const { lastFrame } = render(
        <FudaDetails fuda={mockFuda} onClose={() => {}} />
      );

      const output = lastFrame();
      expect(output).toContain("in_progress");
    });

    test("renders spirit type", () => {
      const { lastFrame } = render(
        <FudaDetails fuda={mockFuda} onClose={() => {}} />
      );

      const output = lastFrame();
      expect(output).toContain("shikigami");
    });

    test("renders priority", () => {
      const { lastFrame } = render(
        <FudaDetails fuda={mockFuda} onClose={() => {}} />
      );

      const output = lastFrame();
      expect(output).toContain("7");
    });

    test("renders prdId when available", () => {
      const { lastFrame } = render(
        <FudaDetails fuda={mockFuda} onClose={() => {}} />
      );

      const output = lastFrame();
      expect(output).toContain("PRD-456");
    });

    test("renders assignedSpiritId when available", () => {
      const { lastFrame } = render(
        <FudaDetails fuda={mockFuda} onClose={() => {}} />
      );

      const output = lastFrame();
      expect(output).toContain("spirit-abc");
    });

    test("renders retryCount", () => {
      const { lastFrame } = render(
        <FudaDetails fuda={mockFuda} onClose={() => {}} />
      );

      const output = lastFrame();
      expect(output).toContain("2");
    });

    test("renders failureContext when available", () => {
      const { lastFrame } = render(
        <FudaDetails fuda={mockFuda} onClose={() => {}} />
      );

      const output = lastFrame();
      expect(output).toContain("Previous error message");
    });

    test("renders parentFudaId when available", () => {
      const { lastFrame } = render(
        <FudaDetails fuda={mockFuda} onClose={() => {}} />
      );

      const output = lastFrame();
      expect(output).toContain("sk-parent");
    });

    test("renders outputCommitHash when available", () => {
      const { lastFrame } = render(
        <FudaDetails fuda={mockFuda} onClose={() => {}} />
      );

      const output = lastFrame();
      expect(output).toContain("abc1234");
    });

    test("handles fuda with null optional fields", () => {
      const minimalFuda: Fuda = {
        ...mockFuda,
        displayId: null,
        prdId: null,
        assignedSpiritId: null,
        outputCommitHash: null,
        failureContext: null,
        parentFudaId: null,
      };

      const { lastFrame } = render(
        <FudaDetails fuda={minimalFuda} onClose={() => {}} />
      );

      const output = lastFrame();
      expect(output).toContain("sk-test1");
      expect(output).toContain("Test fuda title");
    });

    test("renders all status types correctly", () => {
      const statuses = Object.values(FudaStatus);

      statuses.forEach((status) => {
        const fudaWithStatus = { ...mockFuda, status };
        const { lastFrame } = render(
          <FudaDetails fuda={fudaWithStatus} onClose={() => {}} />
        );

        expect(lastFrame()).toContain(status);
      });
    });

    test("renders all spirit types correctly", () => {
      const spiritTypes = Object.values(SpiritType);

      spiritTypes.forEach((spiritType) => {
        const fudaWithSpirit = { ...mockFuda, spiritType };
        const { lastFrame } = render(
          <FudaDetails fuda={fudaWithSpirit} onClose={() => {}} />
        );

        expect(lastFrame()).toContain(spiritType);
      });
    });
  });

  describe("modal overlay", () => {
    test("renders as a modal with border", () => {
      const { lastFrame } = render(
        <FudaDetails fuda={mockFuda} onClose={() => {}} />
      );

      const output = lastFrame() || "";
      // Modal typically has box-drawing characters or borders
      // Check that it renders a structured output
      expect(output.length).toBeGreaterThan(0);
    });

    test("displays a header or title section", () => {
      const { lastFrame } = render(
        <FudaDetails fuda={mockFuda} onClose={() => {}} />
      );

      const output = lastFrame();
      // The title should be prominently displayed
      expect(output).toContain("Test fuda title");
    });

    test("shows close hint in modal", () => {
      const { lastFrame } = render(
        <FudaDetails fuda={mockFuda} onClose={() => {}} />
      );

      const output = lastFrame() || "";
      // Should show hint for closing (like "Press Escape to close" or "ESC")
      const hasEscapeHint =
        output.toLowerCase().includes("esc") ||
        output.toLowerCase().includes("escape") ||
        output.toLowerCase().includes("close");
      expect(hasEscapeHint).toBe(true);
    });

    test("renders content in organized sections", () => {
      const { lastFrame } = render(
        <FudaDetails fuda={mockFuda} onClose={() => {}} />
      );

      const output = lastFrame() || "";
      // Should have some structure/organization
      expect(output.split("\n").length).toBeGreaterThan(3);
    });
  });

  describe("Escape to close", () => {
    test("calls onClose when Escape is pressed", () => {
      let closed = false;
      const handleClose = () => {
        closed = true;
      };

      const { stdin } = render(
        <FudaDetails fuda={mockFuda} onClose={handleClose} />
      );

      stdin.write("\x1B"); // Escape key

      expect(closed).toBe(true);
    });

    test("does not close on other key presses", () => {
      let closeCount = 0;
      const handleClose = () => {
        closeCount++;
      };

      const { stdin } = render(
        <FudaDetails fuda={mockFuda} onClose={handleClose} />
      );

      // Press various keys that should not close the modal
      stdin.write("a");
      stdin.write("b");
      stdin.write("\x1B[A"); // Up arrow
      stdin.write("\x1B[B"); // Down arrow
      stdin.write("j");
      stdin.write("k");

      expect(closeCount).toBe(0);
    });

    test("handles q key to close", () => {
      let closed = false;
      const handleClose = () => {
        closed = true;
      };

      const { stdin } = render(
        <FudaDetails fuda={mockFuda} onClose={handleClose} />
      );

      stdin.write("q");

      expect(closed).toBe(true);
    });

    test("renders without crashing after close callback", () => {
      let closed = false;
      const handleClose = () => {
        closed = true;
      };

      const { stdin, lastFrame } = render(
        <FudaDetails fuda={mockFuda} onClose={handleClose} />
      );

      stdin.write("\x1B");

      expect(closed).toBe(true);
      expect(lastFrame()).toBeDefined();
    });
  });

  describe("edge cases", () => {
    test("handles fuda with very long description", () => {
      const longDescFuda = {
        ...mockFuda,
        description:
          "This is a very long description that spans multiple lines and contains a lot of detail about what this fuda is supposed to accomplish. It might need to be wrapped or truncated depending on the terminal width.",
      };

      const { lastFrame } = render(
        <FudaDetails fuda={longDescFuda} onClose={() => {}} />
      );

      expect(lastFrame()).toBeDefined();
    });

    test("handles fuda with very long title", () => {
      const longTitleFuda = {
        ...mockFuda,
        title:
          "This is a very long title that might need special handling in the modal header",
      };

      const { lastFrame } = render(
        <FudaDetails fuda={longTitleFuda} onClose={() => {}} />
      );

      expect(lastFrame()).toBeDefined();
    });

    test("handles fuda with empty description", () => {
      const emptyDescFuda = {
        ...mockFuda,
        description: "",
      };

      const { lastFrame } = render(
        <FudaDetails fuda={emptyDescFuda} onClose={() => {}} />
      );

      expect(lastFrame()).toBeDefined();
    });

    test("handles fuda with high retry count", () => {
      const highRetryFuda = {
        ...mockFuda,
        retryCount: 99,
      };

      const { lastFrame } = render(
        <FudaDetails fuda={highRetryFuda} onClose={() => {}} />
      );

      const output = lastFrame();
      expect(output).toContain("99");
    });

    test("handles fuda with zero priority", () => {
      const zeroPriorityFuda = {
        ...mockFuda,
        priority: 0,
      };

      const { lastFrame } = render(
        <FudaDetails fuda={zeroPriorityFuda} onClose={() => {}} />
      );

      const output = lastFrame();
      expect(output).toContain("0");
    });

    test("handles fuda with max priority", () => {
      const maxPriorityFuda = {
        ...mockFuda,
        priority: 10,
      };

      const { lastFrame } = render(
        <FudaDetails fuda={maxPriorityFuda} onClose={() => {}} />
      );

      const output = lastFrame();
      expect(output).toContain("10");
    });

    test("handles rapid escape key presses", () => {
      let closeCount = 0;
      const handleClose = () => {
        closeCount++;
      };

      const { stdin } = render(
        <FudaDetails fuda={mockFuda} onClose={handleClose} />
      );

      stdin.write("\x1B\x1B\x1B");

      // Should call close at least once
      expect(closeCount).toBeGreaterThanOrEqual(1);
    });
  });
});
