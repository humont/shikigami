import { describe, expect, test } from "bun:test";
import { getStatusColor, StatusColors } from "../../src/tui/colors";
import { FudaStatus } from "../../src/types";

describe("TUI colors utility", () => {
  describe("getStatusColor", () => {
    test("returns color for 'pending' status", () => {
      const color = getStatusColor(FudaStatus.PENDING);
      expect(color).toBeDefined();
      expect(typeof color).toBe("string");
    });

    test("returns color for 'ready' status", () => {
      const color = getStatusColor(FudaStatus.READY);
      expect(color).toBeDefined();
      expect(typeof color).toBe("string");
    });

    test("returns color for 'in_progress' status", () => {
      const color = getStatusColor(FudaStatus.IN_PROGRESS);
      expect(color).toBeDefined();
      expect(typeof color).toBe("string");
    });

    test("returns color for 'in_review' status", () => {
      const color = getStatusColor(FudaStatus.IN_REVIEW);
      expect(color).toBeDefined();
      expect(typeof color).toBe("string");
    });

    test("returns color for 'blocked' status", () => {
      const color = getStatusColor(FudaStatus.BLOCKED);
      expect(color).toBeDefined();
      expect(typeof color).toBe("string");
    });

    test("returns color for 'failed' status", () => {
      const color = getStatusColor(FudaStatus.FAILED);
      expect(color).toBeDefined();
      expect(typeof color).toBe("string");
    });

    test("returns color for 'done' status", () => {
      const color = getStatusColor(FudaStatus.DONE);
      expect(color).toBeDefined();
      expect(typeof color).toBe("string");
    });

    test("returns different colors for different statuses", () => {
      const colors = Object.values(FudaStatus).map(getStatusColor);
      const uniqueColors = new Set(colors);
      // At minimum, success/failure/progress states should be distinct
      expect(uniqueColors.size).toBeGreaterThanOrEqual(3);
    });
  });

  describe("StatusColors mapping", () => {
    test("has a color defined for every FudaStatus value", () => {
      for (const status of Object.values(FudaStatus)) {
        expect(StatusColors[status]).toBeDefined();
        expect(typeof StatusColors[status]).toBe("string");
      }
    });

    test("all colors are valid ink color values", () => {
      // Valid ink colors: hex (#RRGGBB), named colors, or RGB values
      const validColorPattern = /^(#[0-9A-Fa-f]{6}|[a-z]+)$/;

      for (const status of Object.values(FudaStatus)) {
        const color = StatusColors[status];
        expect(color).toMatch(validColorPattern);
      }
    });
  });

  describe("color output format", () => {
    test("pending status uses a neutral/gray color", () => {
      const color = getStatusColor(FudaStatus.PENDING);
      // Gray tones for pending/waiting states
      expect(color).toMatch(/^(gray|grey|#[89ABCabc][0-9A-Fa-f]{5})$/);
    });

    test("ready status uses a positive/inviting color", () => {
      const color = getStatusColor(FudaStatus.READY);
      // Cyan/blue for ready-to-pick-up state
      expect(color).toMatch(/^(cyan|blue|#[0-9A-Fa-f]{6})$/);
    });

    test("in_progress status uses an active/working color", () => {
      const color = getStatusColor(FudaStatus.IN_PROGRESS);
      // Yellow/orange for active work
      expect(color).toMatch(/^(yellow|orange|#[0-9A-Fa-f]{6})$/);
    });

    test("failed status uses a warning/error color", () => {
      const color = getStatusColor(FudaStatus.FAILED);
      // Red for failures
      expect(color).toMatch(/^(red|#[Ff][0-9A-Fa-f]{5})$/);
    });

    test("done status uses a success color", () => {
      const color = getStatusColor(FudaStatus.DONE);
      // Green for completed
      expect(color).toMatch(/^(green|#[0-9A-Fa-f]{6})$/);
    });
  });
});
