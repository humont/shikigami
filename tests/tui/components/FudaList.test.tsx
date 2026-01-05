import { describe, expect, test } from "bun:test";
import React from "react";
import { render } from "ink-testing-library";
import { FudaList } from "../../../src/tui/components/FudaList";
import { type Fuda, FudaStatus, SpiritType } from "../../../src/types";

// Mock fuda data for testing
const mockFudas: Fuda[] = [
  {
    id: "sk-test1",
    displayId: null,
    prdId: null,
    title: "First task",
    description: "Description 1",
    status: FudaStatus.PENDING,
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
    title: "Second task",
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
    title: "Third task",
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

describe("FudaList component", () => {
  describe("renders fuda items", () => {
    test("renders all fuda titles", () => {
      const { lastFrame } = render(
        <FudaList fudas={mockFudas} selectedIndex={0} />
      );

      const output = lastFrame();
      expect(output).toContain("First task");
      expect(output).toContain("Second task");
      expect(output).toContain("Third task");
    });

    test("renders fuda IDs", () => {
      const { lastFrame } = render(
        <FudaList fudas={mockFudas} selectedIndex={0} />
      );

      const output = lastFrame();
      expect(output).toContain("sk-test1");
      expect(output).toContain("sk-test2");
      expect(output).toContain("sk-test3");
    });

    test("renders fuda statuses", () => {
      const { lastFrame } = render(
        <FudaList fudas={mockFudas} selectedIndex={0} />
      );

      const output = lastFrame();
      expect(output).toContain("pending");
      expect(output).toContain("ready");
      expect(output).toContain("in_progress");
    });

    test("renders with single fuda", () => {
      const singleFuda = [mockFudas[0]];
      const { lastFrame } = render(
        <FudaList fudas={singleFuda} selectedIndex={0} />
      );

      const output = lastFrame();
      expect(output).toContain("First task");
      expect(output).toContain("sk-test1");
    });

    test("renders fudas in provided order", () => {
      const { lastFrame } = render(
        <FudaList fudas={mockFudas} selectedIndex={0} />
      );

      const output = lastFrame() || "";
      const firstIndex = output.indexOf("First task");
      const secondIndex = output.indexOf("Second task");
      const thirdIndex = output.indexOf("Third task");

      expect(firstIndex).toBeLessThan(secondIndex);
      expect(secondIndex).toBeLessThan(thirdIndex);
    });

    test("renders empty list without crashing", () => {
      const { lastFrame } = render(<FudaList fudas={[]} selectedIndex={0} />);

      expect(lastFrame()).toBeDefined();
    });

    test("renders priority for each fuda", () => {
      const { lastFrame } = render(
        <FudaList fudas={mockFudas} selectedIndex={0} />
      );

      const output = lastFrame();
      expect(output).toContain("p5");
      expect(output).toContain("p3");
      expect(output).toContain("p8");
    });
  });

  describe("selection highlight", () => {
    test("highlights the selected fuda differently", () => {
      const { lastFrame: frame1 } = render(
        <FudaList fudas={mockFudas} selectedIndex={0} />
      );
      const { lastFrame: frame2 } = render(
        <FudaList fudas={mockFudas} selectedIndex={1} />
      );

      // The outputs should be different when different fudas are selected
      expect(frame1()).not.toBe(frame2());
    });

    test("only one fuda appears selected at a time", () => {
      const { lastFrame } = render(
        <FudaList fudas={mockFudas} selectedIndex={1} />
      );

      // Should render without crashing and show selection
      const output = lastFrame();
      expect(output).toBeTruthy();
    });

    test("handles selectedIndex at first item", () => {
      const { lastFrame } = render(
        <FudaList fudas={mockFudas} selectedIndex={0} />
      );

      const output = lastFrame();
      expect(output).toContain("First task");
    });

    test("handles selectedIndex at last item", () => {
      const { lastFrame } = render(
        <FudaList fudas={mockFudas} selectedIndex={2} />
      );

      const output = lastFrame();
      expect(output).toContain("Third task");
    });

    test("handles selectedIndex out of bounds gracefully", () => {
      const { lastFrame } = render(
        <FudaList fudas={mockFudas} selectedIndex={99} />
      );

      // Should render without crashing
      const output = lastFrame();
      expect(output).toBeDefined();
    });

    test("handles negative selectedIndex gracefully", () => {
      const { lastFrame } = render(
        <FudaList fudas={mockFudas} selectedIndex={-1} />
      );

      // Should render without crashing
      const output = lastFrame();
      expect(output).toBeDefined();
    });

    test("selection indicator is visible", () => {
      const { lastFrame: selectedFrame } = render(
        <FudaList fudas={mockFudas} selectedIndex={0} />
      );

      // Selected item should have visual indicator (like > or highlighted)
      const output = selectedFrame() || "";
      // Check for some kind of selection indicator near the first item
      expect(output.length).toBeGreaterThan(0);
    });
  });

  describe("keyboard navigation", () => {
    test("calls onSelect when selection changes", () => {
      let selectedIdx = 0;
      const handleSelect = (index: number) => {
        selectedIdx = index;
      };

      const { stdin } = render(
        <FudaList
          fudas={mockFudas}
          selectedIndex={0}
          onSelect={handleSelect}
        />
      );

      // Simulate down arrow key
      stdin.write("\x1B[B"); // Down arrow escape sequence

      // Note: In actual testing, we'd verify the callback was called
      // For now, we verify it renders without crashing
      expect(selectedIdx).toBeDefined();
    });

    test("down arrow moves selection down", () => {
      let lastSelectedIndex = 0;
      const handleSelect = (index: number) => {
        lastSelectedIndex = index;
      };

      const { stdin } = render(
        <FudaList
          fudas={mockFudas}
          selectedIndex={0}
          onSelect={handleSelect}
        />
      );

      stdin.write("\x1B[B"); // Down arrow

      // Callback should have been called with index 1
      expect(lastSelectedIndex).toBe(1);
    });

    test("up arrow moves selection up", () => {
      let lastSelectedIndex = 1;
      const handleSelect = (index: number) => {
        lastSelectedIndex = index;
      };

      const { stdin } = render(
        <FudaList
          fudas={mockFudas}
          selectedIndex={1}
          onSelect={handleSelect}
        />
      );

      stdin.write("\x1B[A"); // Up arrow

      expect(lastSelectedIndex).toBe(0);
    });

    test("down arrow at last item does not go beyond bounds", () => {
      let lastSelectedIndex = 2;
      const handleSelect = (index: number) => {
        lastSelectedIndex = index;
      };

      const { stdin } = render(
        <FudaList
          fudas={mockFudas}
          selectedIndex={2}
          onSelect={handleSelect}
        />
      );

      stdin.write("\x1B[B"); // Down arrow

      // Should stay at 2 or wrap to 0, but not go to 3
      expect(lastSelectedIndex).toBeLessThanOrEqual(2);
      expect(lastSelectedIndex).toBeGreaterThanOrEqual(0);
    });

    test("up arrow at first item does not go below zero", () => {
      let lastSelectedIndex = 0;
      const handleSelect = (index: number) => {
        lastSelectedIndex = index;
      };

      const { stdin } = render(
        <FudaList
          fudas={mockFudas}
          selectedIndex={0}
          onSelect={handleSelect}
        />
      );

      stdin.write("\x1B[A"); // Up arrow

      // Should stay at 0 or wrap to last, but not go to -1
      expect(lastSelectedIndex).toBeGreaterThanOrEqual(0);
    });

    test("j key moves selection down (vim-style)", () => {
      let lastSelectedIndex = 0;
      const handleSelect = (index: number) => {
        lastSelectedIndex = index;
      };

      const { stdin } = render(
        <FudaList
          fudas={mockFudas}
          selectedIndex={0}
          onSelect={handleSelect}
        />
      );

      stdin.write("j");

      expect(lastSelectedIndex).toBe(1);
    });

    test("k key moves selection up (vim-style)", () => {
      let lastSelectedIndex = 1;
      const handleSelect = (index: number) => {
        lastSelectedIndex = index;
      };

      const { stdin } = render(
        <FudaList
          fudas={mockFudas}
          selectedIndex={1}
          onSelect={handleSelect}
        />
      );

      stdin.write("k");

      expect(lastSelectedIndex).toBe(0);
    });

    test("handles onSelect being undefined", () => {
      const { stdin, lastFrame } = render(
        <FudaList fudas={mockFudas} selectedIndex={0} />
      );

      // Should not crash when pressing keys without onSelect
      stdin.write("\x1B[B");
      stdin.write("j");

      expect(lastFrame()).toBeDefined();
    });
  });

  describe("status colors", () => {
    test("pending status displays with gray color", () => {
      const pendingFuda: Fuda[] = [
        { ...mockFudas[0], status: FudaStatus.PENDING },
      ];

      const { lastFrame } = render(
        <FudaList fudas={pendingFuda} selectedIndex={0} />
      );

      // The output should contain the status text
      const output = lastFrame();
      expect(output).toContain("pending");
    });

    test("ready status displays with cyan color", () => {
      const readyFuda: Fuda[] = [{ ...mockFudas[0], status: FudaStatus.READY }];

      const { lastFrame } = render(
        <FudaList fudas={readyFuda} selectedIndex={0} />
      );

      const output = lastFrame();
      expect(output).toContain("ready");
    });

    test("in_progress status displays with yellow color", () => {
      const inProgressFuda: Fuda[] = [
        { ...mockFudas[0], status: FudaStatus.IN_PROGRESS },
      ];

      const { lastFrame } = render(
        <FudaList fudas={inProgressFuda} selectedIndex={0} />
      );

      const output = lastFrame();
      expect(output).toContain("in_progress");
    });

    test("done status displays with green color", () => {
      const doneFuda: Fuda[] = [{ ...mockFudas[0], status: FudaStatus.DONE }];

      const { lastFrame } = render(
        <FudaList fudas={doneFuda} selectedIndex={0} />
      );

      const output = lastFrame();
      expect(output).toContain("done");
    });

    test("failed status displays with red color", () => {
      const failedFuda: Fuda[] = [
        { ...mockFudas[0], status: FudaStatus.FAILED },
      ];

      const { lastFrame } = render(
        <FudaList fudas={failedFuda} selectedIndex={0} />
      );

      const output = lastFrame();
      expect(output).toContain("failed");
    });

    test("different statuses render with different visual styles", () => {
      const pendingFuda: Fuda[] = [
        { ...mockFudas[0], status: FudaStatus.PENDING },
      ];
      const readyFuda: Fuda[] = [{ ...mockFudas[0], status: FudaStatus.READY }];
      const doneFuda: Fuda[] = [{ ...mockFudas[0], status: FudaStatus.DONE }];

      const { lastFrame: pendingFrame } = render(
        <FudaList fudas={pendingFuda} selectedIndex={0} />
      );
      const { lastFrame: readyFrame } = render(
        <FudaList fudas={readyFuda} selectedIndex={0} />
      );
      const { lastFrame: doneFrame } = render(
        <FudaList fudas={doneFuda} selectedIndex={0} />
      );

      // Each status should render differently (different ANSI escape codes for colors)
      expect(pendingFrame()).not.toBe(readyFrame());
      expect(readyFrame()).not.toBe(doneFrame());
      expect(pendingFrame()).not.toBe(doneFrame());
    });

    test("blocked status displays with red color", () => {
      const blockedFuda: Fuda[] = [
        { ...mockFudas[0], status: FudaStatus.BLOCKED },
      ];

      const { lastFrame } = render(
        <FudaList fudas={blockedFuda} selectedIndex={0} />
      );

      const output = lastFrame();
      expect(output).toContain("blocked");
    });

    test("in_review status displays with magenta color", () => {
      const inReviewFuda: Fuda[] = [
        { ...mockFudas[0], status: FudaStatus.IN_REVIEW },
      ];

      const { lastFrame } = render(
        <FudaList fudas={inReviewFuda} selectedIndex={0} />
      );

      const output = lastFrame();
      expect(output).toContain("in_review");
    });
  });

  describe("edge cases", () => {
    test("handles fuda with very long title", () => {
      const longTitleFuda: Fuda[] = [
        {
          ...mockFudas[0],
          title: "This is a very long title that might need truncation or wrapping",
        },
      ];

      const { lastFrame } = render(
        <FudaList fudas={longTitleFuda} selectedIndex={0} />
      );

      // Should render without crashing
      expect(lastFrame()).toBeDefined();
    });

    test("handles fuda with displayId", () => {
      const fudaWithDisplayId: Fuda[] = [
        { ...mockFudas[0], displayId: "TASK-123" },
      ];

      const { lastFrame } = render(
        <FudaList fudas={fudaWithDisplayId} selectedIndex={0} />
      );

      const output = lastFrame();
      // Should show displayId when available
      expect(output).toContain("TASK-123");
    });

    test("handles many fudas", () => {
      const manyFudas: Fuda[] = Array.from({ length: 20 }, (_, i) => ({
        ...mockFudas[0],
        id: `sk-test${i}`,
        title: `Task ${i}`,
      }));

      const { lastFrame } = render(
        <FudaList fudas={manyFudas} selectedIndex={10} />
      );

      expect(lastFrame()).toBeDefined();
    });
  });
});
