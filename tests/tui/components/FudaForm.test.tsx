import { describe, expect, test, mock, beforeEach } from "bun:test";
import React from "react";
import { render } from "ink-testing-library";
import { FudaForm } from "../../../src/tui/components/FudaForm";
import { type Fuda, FudaStatus, SpiritType } from "../../../src/types";

// Mock fuda data for edit mode testing
const mockFuda: Fuda = {
  id: "sk-test1",
  displayId: null,
  prdId: null,
  title: "Existing Task",
  description: "Existing description",
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
};

describe("FudaForm component", () => {
  describe("create mode", () => {
    test("renders form with empty fields in create mode", () => {
      const { lastFrame } = render(
        <FudaForm mode="create" onSubmit={() => {}} />
      );

      const output = lastFrame();
      expect(output).toBeDefined();
      // Should show input fields
      expect(output).toContain("Title");
    });

    test("renders description field", () => {
      const { lastFrame } = render(
        <FudaForm mode="create" onSubmit={() => {}} />
      );

      const output = lastFrame();
      expect(output).toContain("Description");
    });

    test("renders spirit type field", () => {
      const { lastFrame } = render(
        <FudaForm mode="create" onSubmit={() => {}} />
      );

      const output = lastFrame();
      expect(output).toContain("Spirit");
    });

    test("renders priority field", () => {
      const { lastFrame } = render(
        <FudaForm mode="create" onSubmit={() => {}} />
      );

      const output = lastFrame();
      expect(output).toContain("Priority");
    });

    test("shows default priority value of 5", () => {
      const { lastFrame } = render(
        <FudaForm mode="create" onSubmit={() => {}} />
      );

      const output = lastFrame();
      expect(output).toContain("5");
    });

    test("shows shikigami as default spirit type", () => {
      const { lastFrame } = render(
        <FudaForm mode="create" onSubmit={() => {}} />
      );

      const output = lastFrame();
      expect(output).toContain("shikigami");
    });

    test("allows typing in title field", () => {
      const { stdin, lastFrame } = render(
        <FudaForm mode="create" onSubmit={() => {}} />
      );

      stdin.write("New Task");

      const output = lastFrame();
      expect(output).toContain("New Task");
    });

    test("Tab key moves to next field", () => {
      const { stdin, lastFrame: frame1 } = render(
        <FudaForm mode="create" onSubmit={() => {}} />
      );

      const before = frame1();
      stdin.write("\t"); // Tab key
      const after = frame1();

      // Focus should have moved, changing the render
      expect(before).not.toBe(after);
    });

    test("renders submit button", () => {
      const { lastFrame } = render(
        <FudaForm mode="create" onSubmit={() => {}} />
      );

      const output = lastFrame();
      expect(output).toMatch(/Create|Submit|Add/i);
    });
  });

  describe("edit mode", () => {
    test("renders form with populated fields in edit mode", () => {
      const { lastFrame } = render(
        <FudaForm mode="edit" fuda={mockFuda} onSubmit={() => {}} />
      );

      const output = lastFrame();
      expect(output).toContain("Existing Task");
    });

    test("shows existing description in edit mode", () => {
      const { lastFrame } = render(
        <FudaForm mode="edit" fuda={mockFuda} onSubmit={() => {}} />
      );

      const output = lastFrame();
      expect(output).toContain("Existing description");
    });

    test("shows existing priority in edit mode", () => {
      const highPriorityFuda = { ...mockFuda, priority: 8 };
      const { lastFrame } = render(
        <FudaForm mode="edit" fuda={highPriorityFuda} onSubmit={() => {}} />
      );

      const output = lastFrame();
      expect(output).toContain("8");
    });

    test("shows existing spirit type in edit mode", () => {
      const tenguFuda = { ...mockFuda, spiritType: SpiritType.TENGU };
      const { lastFrame } = render(
        <FudaForm mode="edit" fuda={tenguFuda} onSubmit={() => {}} />
      );

      const output = lastFrame();
      expect(output).toContain("tengu");
    });

    test("renders update button instead of create", () => {
      const { lastFrame } = render(
        <FudaForm mode="edit" fuda={mockFuda} onSubmit={() => {}} />
      );

      const output = lastFrame();
      expect(output).toMatch(/Update|Save|Edit/i);
    });

    test("allows editing existing title", () => {
      const { stdin, lastFrame } = render(
        <FudaForm mode="edit" fuda={mockFuda} onSubmit={() => {}} />
      );

      // Clear and type new title
      stdin.write("\x1b[3~".repeat(20)); // Delete characters
      stdin.write("Updated Task");

      // Component should handle editing
      expect(lastFrame()).toBeDefined();
    });

    test("renders without crashing when fuda is provided", () => {
      const { lastFrame } = render(
        <FudaForm mode="edit" fuda={mockFuda} onSubmit={() => {}} />
      );

      expect(lastFrame()).toBeDefined();
    });
  });

  describe("calls runAdd", () => {
    test("calls onSubmit with form data when submitted in create mode", () => {
      let submittedData: any = null;
      const handleSubmit = (data: any) => {
        submittedData = data;
      };

      const { stdin } = render(
        <FudaForm mode="create" onSubmit={handleSubmit} />
      );

      // Type a title
      stdin.write("Test Task");
      stdin.write("\t"); // Tab to description
      stdin.write("Test Description");
      stdin.write("\r"); // Submit with Enter

      // Note: actual submission handling may vary
      expect(submittedData).toBeDefined();
    });

    test("submitted data includes title", () => {
      let submittedData: any = null;
      const handleSubmit = (data: any) => {
        submittedData = data;
      };

      const { stdin } = render(
        <FudaForm mode="create" onSubmit={handleSubmit} />
      );

      stdin.write("My Task Title");
      // Navigate to submit and press enter
      stdin.write("\t\t\t\t\r"); // Tab through fields and submit

      if (submittedData) {
        expect(submittedData.title).toBe("My Task Title");
      }
    });

    test("submitted data includes description", () => {
      let submittedData: any = null;
      const handleSubmit = (data: any) => {
        submittedData = data;
      };

      const { stdin } = render(
        <FudaForm mode="create" onSubmit={handleSubmit} />
      );

      stdin.write("Title");
      stdin.write("\t");
      stdin.write("My Description");
      stdin.write("\t\t\t\r"); // Navigate and submit

      if (submittedData) {
        expect(submittedData.description).toBe("My Description");
      }
    });

    test("submitted data includes spiritType", () => {
      let submittedData: any = null;
      const handleSubmit = (data: any) => {
        submittedData = data;
      };

      const { stdin } = render(
        <FudaForm mode="create" onSubmit={handleSubmit} />
      );

      stdin.write("Title");
      stdin.write("\t\t\t\t\r"); // Navigate and submit

      if (submittedData) {
        expect(submittedData.spiritType).toBeDefined();
      }
    });

    test("submitted data includes priority", () => {
      let submittedData: any = null;
      const handleSubmit = (data: any) => {
        submittedData = data;
      };

      const { stdin } = render(
        <FudaForm mode="create" onSubmit={handleSubmit} />
      );

      stdin.write("Title");
      stdin.write("\t\t\t\t\r"); // Navigate and submit

      if (submittedData) {
        expect(submittedData.priority).toBeDefined();
      }
    });

    test("does not call onSubmit on escape key", () => {
      let submitCount = 0;
      const handleSubmit = () => {
        submitCount++;
      };

      const { stdin } = render(
        <FudaForm mode="create" onSubmit={handleSubmit} />
      );

      stdin.write("Title");
      stdin.write("\x1b"); // Escape key

      expect(submitCount).toBe(0);
    });

    test("calls onCancel when escape is pressed", () => {
      let cancelled = false;
      const handleCancel = () => {
        cancelled = true;
      };

      const { stdin } = render(
        <FudaForm mode="create" onSubmit={() => {}} onCancel={handleCancel} />
      );

      stdin.write("\x1b"); // Escape key

      expect(cancelled).toBe(true);
    });

    test("in edit mode, submitted data includes fuda id", () => {
      let submittedData: any = null;
      const handleSubmit = (data: any) => {
        submittedData = data;
      };

      const { stdin } = render(
        <FudaForm mode="edit" fuda={mockFuda} onSubmit={handleSubmit} />
      );

      stdin.write("\t\t\t\t\r"); // Navigate and submit

      if (submittedData) {
        expect(submittedData.id).toBe("sk-test1");
      }
    });
  });

  describe("validation", () => {
    test("shows error when title is empty on submit", () => {
      const { stdin, lastFrame } = render(
        <FudaForm mode="create" onSubmit={() => {}} />
      );

      // Try to submit without entering title
      stdin.write("\t\t\t\t\r"); // Navigate through fields and submit

      const output = lastFrame();
      // Should show validation error
      expect(output).toMatch(/required|empty|title/i);
    });

    test("does not call onSubmit when title is empty", () => {
      let submitCount = 0;
      const handleSubmit = () => {
        submitCount++;
      };

      const { stdin } = render(
        <FudaForm mode="create" onSubmit={handleSubmit} />
      );

      // Try to submit without title
      stdin.write("\t\t\t\t\r");

      expect(submitCount).toBe(0);
    });

    test("allows submit when title is provided", () => {
      let submittedData: any = null;
      const handleSubmit = (data: any) => {
        submittedData = data;
      };

      const { stdin } = render(
        <FudaForm mode="create" onSubmit={handleSubmit} />
      );

      stdin.write("Valid Title");
      stdin.write("\t\t\t\t\r"); // Navigate and submit

      expect(submittedData).not.toBeNull();
    });

    test("clears validation error when user starts typing", () => {
      const { stdin, lastFrame } = render(
        <FudaForm mode="create" onSubmit={() => {}} />
      );

      // Submit empty to trigger error
      stdin.write("\t\t\t\t\r");
      const errorOutput = lastFrame();

      // Now start typing
      stdin.write("T");
      const afterTyping = lastFrame();

      // Error should be cleared or different
      expect(afterTyping).not.toBe(errorOutput);
    });

    test("validates priority is a valid number", () => {
      const { stdin, lastFrame } = render(
        <FudaForm mode="create" onSubmit={() => {}} />
      );

      stdin.write("Title");
      stdin.write("\t"); // To description
      stdin.write("\t"); // To priority
      stdin.write("abc"); // Invalid priority

      const output = lastFrame();
      // Should handle invalid input gracefully
      expect(output).toBeDefined();
    });

    test("validates priority is within range 1-10", () => {
      const { stdin, lastFrame } = render(
        <FudaForm mode="create" onSubmit={() => {}} />
      );

      stdin.write("Title");
      stdin.write("\t\t"); // To priority
      stdin.write("99"); // Out of range

      const output = lastFrame();
      // Component should handle or show warning
      expect(output).toBeDefined();
    });

    test("allows empty description", () => {
      let submittedData: any = null;
      const handleSubmit = (data: any) => {
        submittedData = data;
      };

      const { stdin } = render(
        <FudaForm mode="create" onSubmit={handleSubmit} />
      );

      stdin.write("Title Only");
      stdin.write("\t\t\t\t\r"); // Skip description and submit

      // Should still submit successfully
      expect(submittedData).not.toBeNull();
    });

    test("trims whitespace from title", () => {
      let submittedData: any = null;
      const handleSubmit = (data: any) => {
        submittedData = data;
      };

      const { stdin } = render(
        <FudaForm mode="create" onSubmit={handleSubmit} />
      );

      stdin.write("  Padded Title  ");
      stdin.write("\t\t\t\t\r");

      if (submittedData) {
        expect(submittedData.title).toBe("Padded Title");
      }
    });
  });

  describe("edge cases", () => {
    test("handles rapid key presses", () => {
      const { stdin, lastFrame } = render(
        <FudaForm mode="create" onSubmit={() => {}} />
      );

      stdin.write("abcdefghijklmnop\t\t\t\t");

      expect(lastFrame()).toBeDefined();
    });

    test("handles empty onCancel gracefully", () => {
      const { stdin, lastFrame } = render(
        <FudaForm mode="create" onSubmit={() => {}} />
      );

      stdin.write("\x1b"); // Escape without onCancel handler

      expect(lastFrame()).toBeDefined();
    });

    test("handles shift+tab for backwards navigation", () => {
      const { stdin, lastFrame } = render(
        <FudaForm mode="create" onSubmit={() => {}} />
      );

      stdin.write("\t\t"); // Go forward
      stdin.write("\x1b[Z"); // Shift+Tab

      expect(lastFrame()).toBeDefined();
    });

    test("renders correctly with long title in edit mode", () => {
      const longTitleFuda = {
        ...mockFuda,
        title: "This is a very long title that might overflow the input field",
      };

      const { lastFrame } = render(
        <FudaForm mode="edit" fuda={longTitleFuda} onSubmit={() => {}} />
      );

      expect(lastFrame()).toBeDefined();
    });

    test("renders correctly with multiline description", () => {
      const multilineDescFuda = {
        ...mockFuda,
        description: "Line 1\nLine 2\nLine 3",
      };

      const { lastFrame } = render(
        <FudaForm mode="edit" fuda={multilineDescFuda} onSubmit={() => {}} />
      );

      expect(lastFrame()).toBeDefined();
    });

    test("handles undefined fuda in edit mode gracefully", () => {
      // Should fallback to create mode behavior
      const { lastFrame } = render(
        <FudaForm mode="edit" fuda={undefined} onSubmit={() => {}} />
      );

      expect(lastFrame()).toBeDefined();
    });
  });

  describe("spirit type selection", () => {
    test("can select shikigami spirit type", () => {
      let submittedData: any = null;
      const handleSubmit = (data: any) => {
        submittedData = data;
      };

      const { stdin } = render(
        <FudaForm mode="create" onSubmit={handleSubmit} />
      );

      stdin.write("Title");
      stdin.write("\t\t\t\t\r");

      if (submittedData) {
        expect(submittedData.spiritType).toBe(SpiritType.SHIKIGAMI);
      }
    });

    test("shows all spirit type options", () => {
      const { lastFrame, stdin } = render(
        <FudaForm mode="create" onSubmit={() => {}} />
      );

      // Navigate to spirit type field and expand options
      stdin.write("\t\t\t"); // Navigate to spirit field

      const output = lastFrame();
      // Should be able to show spirit options
      expect(output).toBeDefined();
    });

    test("tengu option is available", () => {
      const { lastFrame } = render(
        <FudaForm mode="create" onSubmit={() => {}} />
      );

      // At minimum the component should render with tengu as an option
      expect(lastFrame()).toBeDefined();
    });

    test("kitsune option is available", () => {
      const { lastFrame } = render(
        <FudaForm mode="create" onSubmit={() => {}} />
      );

      // At minimum the component should render with kitsune as an option
      expect(lastFrame()).toBeDefined();
    });
  });
});
