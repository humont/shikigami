import { describe, expect, test } from "bun:test";
import React from "react";
import { render } from "ink-testing-library";
import { FudaDetailsContent } from "../../../src/tui/components/FudaDetailsContent";
import { type Fuda, FudaStatus, SpiritType } from "../../../src/types";

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

describe("FudaDetailsContent component", () => {
  describe("renders all fuda fields", () => {
    test("renders fuda ID", () => {
      const { lastFrame } = render(<FudaDetailsContent fuda={mockFuda} />);

      const output = lastFrame();
      expect(output).toContain("sk-test1");
    });

    test("renders title in bold cyan", () => {
      const { lastFrame } = render(<FudaDetailsContent fuda={mockFuda} />);

      const output = lastFrame();
      expect(output).toContain("Test fuda title");
    });

    test("renders description", () => {
      const { lastFrame } = render(<FudaDetailsContent fuda={mockFuda} />);

      const output = lastFrame();
      expect(output).toContain("This is a detailed description of the fuda");
    });

    test("renders status with color", () => {
      const { lastFrame } = render(<FudaDetailsContent fuda={mockFuda} />);

      const output = lastFrame();
      expect(output).toContain("in_progress");
    });

    test("renders spirit type", () => {
      const { lastFrame } = render(<FudaDetailsContent fuda={mockFuda} />);

      const output = lastFrame();
      expect(output).toContain("shikigami");
    });

    test("renders priority", () => {
      const { lastFrame } = render(<FudaDetailsContent fuda={mockFuda} />);

      const output = lastFrame();
      expect(output).toContain("7");
    });

    test("renders prdId when available", () => {
      const { lastFrame } = render(<FudaDetailsContent fuda={mockFuda} />);

      const output = lastFrame();
      expect(output).toContain("PRD-456");
    });

    test("renders assignedSpiritId when available", () => {
      const { lastFrame } = render(<FudaDetailsContent fuda={mockFuda} />);

      const output = lastFrame();
      expect(output).toContain("spirit-abc");
    });

    test("renders retryCount", () => {
      const { lastFrame } = render(<FudaDetailsContent fuda={mockFuda} />);

      const output = lastFrame();
      expect(output).toContain("2");
    });

    test("renders failureContext when available", () => {
      const { lastFrame } = render(<FudaDetailsContent fuda={mockFuda} />);

      const output = lastFrame();
      expect(output).toContain("Previous error message");
    });

    test("renders parentFudaId when available", () => {
      const { lastFrame } = render(<FudaDetailsContent fuda={mockFuda} />);

      const output = lastFrame();
      expect(output).toContain("sk-parent");
    });

    test("renders outputCommitHash when available", () => {
      const { lastFrame } = render(<FudaDetailsContent fuda={mockFuda} />);

      const output = lastFrame();
      expect(output).toContain("abc1234");
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

      const { lastFrame } = render(<FudaDetailsContent fuda={minimalFuda} />);

      const output = lastFrame();
      expect(output).toContain("sk-test1");
      expect(output).toContain("Test fuda title");
    });

    test("renders all status types correctly", () => {
      const statuses = Object.values(FudaStatus);

      statuses.forEach((status) => {
        const fudaWithStatus = { ...mockFuda, status };
        const { lastFrame } = render(
          <FudaDetailsContent fuda={fudaWithStatus} />
        );

        expect(lastFrame()).toContain(status);
      });
    });

    test("renders all spirit types correctly", () => {
      const spiritTypes = Object.values(SpiritType);

      spiritTypes.forEach((spiritType) => {
        const fudaWithSpirit = { ...mockFuda, spiritType };
        const { lastFrame } = render(
          <FudaDetailsContent fuda={fudaWithSpirit} />
        );

        expect(lastFrame()).toContain(spiritType);
      });
    });
  });

  describe("content-only rendering (no modal wrapper)", () => {
    test("does not render close hint text", () => {
      const { lastFrame } = render(<FudaDetailsContent fuda={mockFuda} />);

      const output = lastFrame() || "";
      // Should NOT contain the modal close hint
      expect(output).not.toContain("Press ESC or q to close");
    });

    test("does not have input handling (can be embedded)", () => {
      // FudaDetailsContent should not capture keyboard input
      // It's just content that can be embedded in other components
      const { lastFrame, stdin } = render(
        <FudaDetailsContent fuda={mockFuda} />
      );

      // Component should render without crashing when keys are pressed
      stdin.write("q");
      stdin.write("\x1B");

      // Component should still be rendered
      expect(lastFrame()).toBeDefined();
      expect(lastFrame()).toContain("Test fuda title");
    });
  });

  describe("edge cases", () => {
    test("handles fuda with very long description", () => {
      const longDescFuda = {
        ...mockFuda,
        description:
          "This is a very long description that spans multiple lines and contains a lot of detail about what this fuda is supposed to accomplish. It might need to be wrapped or truncated depending on the terminal width.",
      };

      const { lastFrame } = render(<FudaDetailsContent fuda={longDescFuda} />);

      expect(lastFrame()).toBeDefined();
    });

    test("handles fuda with very long title", () => {
      const longTitleFuda = {
        ...mockFuda,
        title:
          "This is a very long title that might need special handling in the display",
      };

      const { lastFrame } = render(<FudaDetailsContent fuda={longTitleFuda} />);

      expect(lastFrame()).toBeDefined();
    });

    test("handles fuda with empty description", () => {
      const emptyDescFuda = {
        ...mockFuda,
        description: "",
      };

      const { lastFrame } = render(<FudaDetailsContent fuda={emptyDescFuda} />);

      expect(lastFrame()).toBeDefined();
    });

    test("handles fuda with high retry count", () => {
      const highRetryFuda = {
        ...mockFuda,
        retryCount: 99,
      };

      const { lastFrame } = render(<FudaDetailsContent fuda={highRetryFuda} />);

      const output = lastFrame();
      expect(output).toContain("99");
    });

    test("handles fuda with zero priority", () => {
      const zeroPriorityFuda = {
        ...mockFuda,
        priority: 0,
      };

      const { lastFrame } = render(
        <FudaDetailsContent fuda={zeroPriorityFuda} />
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
        <FudaDetailsContent fuda={maxPriorityFuda} />
      );

      const output = lastFrame();
      expect(output).toContain("10");
    });
  });
});
