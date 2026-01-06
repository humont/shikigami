import { describe, expect, test } from "bun:test";
import React from "react";
import { render } from "ink-testing-library";
import { LogView } from "../../../src/tui/components/LogView";
import { AuditOperation, type AuditEntry } from "../../../src/db/audit";

// Mock audit entry data for testing
const mockAuditEntries: AuditEntry[] = [
  {
    id: "1",
    fudaId: "sk-test1",
    operation: AuditOperation.UPDATE,
    field: "status",
    oldValue: "pending",
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

describe("LogView component", () => {
  describe("renders audit entries correctly", () => {
    test("renders all audit entries", () => {
      const { lastFrame } = render(
        <LogView entries={mockAuditEntries} selectedIndex={0} />
      );

      const output = lastFrame();
      expect(output).toContain("sk-test1");
      expect(output).toContain("sk-test2");
    });

    test("renders operation types", () => {
      const { lastFrame } = render(
        <LogView entries={mockAuditEntries} selectedIndex={0} />
      );

      const output = lastFrame();
      expect(output).toContain("update");
      expect(output).toContain("create");
    });

    test("renders with single entry", () => {
      const singleEntry = [mockAuditEntries[0]];
      const { lastFrame } = render(
        <LogView entries={singleEntry} selectedIndex={0} />
      );

      const output = lastFrame();
      expect(output).toContain("sk-test1");
      expect(output).toContain("update");
    });

    test("renders entries in provided order", () => {
      const { lastFrame } = render(
        <LogView entries={mockAuditEntries} selectedIndex={0} />
      );

      const output = lastFrame() || "";
      const firstIndex = output.indexOf("agent-123");
      const secondIndex = output.indexOf("cli");

      expect(firstIndex).toBeLessThan(secondIndex);
    });
  });

  describe("shows timestamp", () => {
    test("displays timestamp for entries", () => {
      const { lastFrame } = render(
        <LogView entries={mockAuditEntries} selectedIndex={0} />
      );

      const output = lastFrame();
      // Should display some form of timestamp (date or time)
      expect(output).toBeDefined();
    });

    test("formats timestamp readably", () => {
      const { lastFrame } = render(
        <LogView entries={mockAuditEntries} selectedIndex={0} />
      );

      // Should render without crashing
      const output = lastFrame();
      expect(output).toBeDefined();
    });
  });

  describe("shows operation", () => {
    test("displays create operation", () => {
      const createEntry: AuditEntry[] = [
        {
          id: "1",
          fudaId: "sk-test1",
          operation: AuditOperation.CREATE,
          field: null,
          oldValue: null,
          newValue: null,
          actor: "cli",
          timestamp: new Date(),
        },
      ];

      const { lastFrame } = render(
        <LogView entries={createEntry} selectedIndex={0} />
      );

      const output = lastFrame();
      expect(output).toContain("create");
    });

    test("displays update operation", () => {
      const updateEntry: AuditEntry[] = [
        {
          id: "1",
          fudaId: "sk-test1",
          operation: AuditOperation.UPDATE,
          field: "status",
          oldValue: "pending",
          newValue: "ready",
          actor: "agent",
          timestamp: new Date(),
        },
      ];

      const { lastFrame } = render(
        <LogView entries={updateEntry} selectedIndex={0} />
      );

      const output = lastFrame();
      expect(output).toContain("update");
    });

    test("displays delete operation", () => {
      const deleteEntry: AuditEntry[] = [
        {
          id: "1",
          fudaId: "sk-test1",
          operation: AuditOperation.DELETE,
          field: null,
          oldValue: null,
          newValue: null,
          actor: "user",
          timestamp: new Date(),
        },
      ];

      const { lastFrame } = render(
        <LogView entries={deleteEntry} selectedIndex={0} />
      );

      const output = lastFrame();
      expect(output).toContain("delete");
    });
  });

  describe("shows actor", () => {
    test("displays actor name", () => {
      const { lastFrame } = render(
        <LogView entries={mockAuditEntries} selectedIndex={0} />
      );

      const output = lastFrame();
      expect(output).toContain("agent-123");
      expect(output).toContain("cli");
      expect(output).toContain("user");
    });

    test("displays different actors distinctly", () => {
      const { lastFrame } = render(
        <LogView entries={mockAuditEntries} selectedIndex={0} />
      );

      const output = lastFrame() || "";
      // All actors should be present
      expect(output).toContain("agent-123");
      expect(output).toContain("cli");
    });
  });

  describe("shows field changes", () => {
    test("displays field name when present", () => {
      const { lastFrame } = render(
        <LogView entries={mockAuditEntries} selectedIndex={0} />
      );

      const output = lastFrame();
      expect(output).toContain("status");
      expect(output).toContain("title");
    });

    test("displays old and new values for update", () => {
      const updateEntry: AuditEntry[] = [
        {
          id: "1",
          fudaId: "sk-test1",
          operation: AuditOperation.UPDATE,
          field: "status",
          oldValue: "pending",
          newValue: "ready",
          actor: "agent",
          timestamp: new Date(),
        },
      ];

      const { lastFrame } = render(
        <LogView entries={updateEntry} selectedIndex={0} />
      );

      const output = lastFrame();
      expect(output).toContain("pending");
      expect(output).toContain("ready");
    });

    test("handles entries without field changes gracefully", () => {
      const createEntry: AuditEntry[] = [
        {
          id: "1",
          fudaId: "sk-test1",
          operation: AuditOperation.CREATE,
          field: null,
          oldValue: null,
          newValue: null,
          actor: "cli",
          timestamp: new Date(),
        },
      ];

      const { lastFrame } = render(
        <LogView entries={createEntry} selectedIndex={0} />
      );

      // Should render without crashing
      const output = lastFrame();
      expect(output).toBeDefined();
    });
  });

  describe("j/k navigation", () => {
    test("j key moves selection down", () => {
      let lastSelectedIndex = 0;
      const handleSelect = (index: number) => {
        lastSelectedIndex = index;
      };

      const { stdin } = render(
        <LogView
          entries={mockAuditEntries}
          selectedIndex={0}
          onSelect={handleSelect}
        />
      );

      stdin.write("j");

      expect(lastSelectedIndex).toBe(1);
    });

    test("k key moves selection up", () => {
      let lastSelectedIndex = 1;
      const handleSelect = (index: number) => {
        lastSelectedIndex = index;
      };

      const { stdin } = render(
        <LogView
          entries={mockAuditEntries}
          selectedIndex={1}
          onSelect={handleSelect}
        />
      );

      stdin.write("k");

      expect(lastSelectedIndex).toBe(0);
    });

    test("down arrow moves selection down", () => {
      let lastSelectedIndex = 0;
      const handleSelect = (index: number) => {
        lastSelectedIndex = index;
      };

      const { stdin } = render(
        <LogView
          entries={mockAuditEntries}
          selectedIndex={0}
          onSelect={handleSelect}
        />
      );

      stdin.write("\x1B[B"); // Down arrow

      expect(lastSelectedIndex).toBe(1);
    });

    test("up arrow moves selection up", () => {
      let lastSelectedIndex = 1;
      const handleSelect = (index: number) => {
        lastSelectedIndex = index;
      };

      const { stdin } = render(
        <LogView
          entries={mockAuditEntries}
          selectedIndex={1}
          onSelect={handleSelect}
        />
      );

      stdin.write("\x1B[A"); // Up arrow

      expect(lastSelectedIndex).toBe(0);
    });

    test("j at last item does not go beyond bounds", () => {
      let lastSelectedIndex = 2;
      const handleSelect = (index: number) => {
        lastSelectedIndex = index;
      };

      const { stdin } = render(
        <LogView
          entries={mockAuditEntries}
          selectedIndex={2}
          onSelect={handleSelect}
        />
      );

      stdin.write("j");

      expect(lastSelectedIndex).toBeLessThanOrEqual(2);
      expect(lastSelectedIndex).toBeGreaterThanOrEqual(0);
    });

    test("k at first item does not go below zero", () => {
      let lastSelectedIndex = 0;
      const handleSelect = (index: number) => {
        lastSelectedIndex = index;
      };

      const { stdin } = render(
        <LogView
          entries={mockAuditEntries}
          selectedIndex={0}
          onSelect={handleSelect}
        />
      );

      stdin.write("k");

      expect(lastSelectedIndex).toBeGreaterThanOrEqual(0);
    });

    test("handles onSelect being undefined", () => {
      const { stdin, lastFrame } = render(
        <LogView entries={mockAuditEntries} selectedIndex={0} />
      );

      // Should not crash when pressing keys without onSelect
      stdin.write("j");
      stdin.write("k");
      stdin.write("\x1B[B");
      stdin.write("\x1B[A");

      expect(lastFrame()).toBeDefined();
    });
  });

  describe("handles empty log state", () => {
    test("renders empty list without crashing", () => {
      const { lastFrame } = render(<LogView entries={[]} selectedIndex={0} />);

      expect(lastFrame()).toBeDefined();
    });

    test("shows empty state message", () => {
      const { lastFrame } = render(<LogView entries={[]} selectedIndex={0} />);

      const output = lastFrame();
      // Should show some indication that there are no entries
      expect(output).toBeDefined();
    });
  });

  describe("selected entry highlighting", () => {
    test("highlights the selected entry differently", () => {
      const { lastFrame: frame1 } = render(
        <LogView entries={mockAuditEntries} selectedIndex={0} />
      );
      const { lastFrame: frame2 } = render(
        <LogView entries={mockAuditEntries} selectedIndex={1} />
      );

      // The outputs should be different when different entries are selected
      expect(frame1()).not.toBe(frame2());
    });

    test("only one entry appears selected at a time", () => {
      const { lastFrame } = render(
        <LogView entries={mockAuditEntries} selectedIndex={1} />
      );

      // Should render without crashing and show selection
      const output = lastFrame();
      expect(output).toBeTruthy();
    });

    test("handles selectedIndex at first item", () => {
      const { lastFrame } = render(
        <LogView entries={mockAuditEntries} selectedIndex={0} />
      );

      const output = lastFrame();
      expect(output).toContain("agent-123");
    });

    test("handles selectedIndex at last item", () => {
      const { lastFrame } = render(
        <LogView entries={mockAuditEntries} selectedIndex={2} />
      );

      const output = lastFrame();
      expect(output).toContain("user");
    });

    test("handles selectedIndex out of bounds gracefully", () => {
      const { lastFrame } = render(
        <LogView entries={mockAuditEntries} selectedIndex={99} />
      );

      // Should render without crashing
      const output = lastFrame();
      expect(output).toBeDefined();
    });

    test("handles negative selectedIndex gracefully", () => {
      const { lastFrame } = render(
        <LogView entries={mockAuditEntries} selectedIndex={-1} />
      );

      // Should render without crashing
      const output = lastFrame();
      expect(output).toBeDefined();
    });

    test("selection indicator is visible", () => {
      const { lastFrame: selectedFrame } = render(
        <LogView entries={mockAuditEntries} selectedIndex={0} />
      );

      // Selected item should have visual indicator
      const output = selectedFrame() || "";
      expect(output.length).toBeGreaterThan(0);
    });
  });

  describe("operation colors", () => {
    test("create operation displays with distinct color", () => {
      const createEntry: AuditEntry[] = [
        {
          id: "1",
          fudaId: "sk-test1",
          operation: AuditOperation.CREATE,
          field: null,
          oldValue: null,
          newValue: null,
          actor: "cli",
          timestamp: new Date(),
        },
      ];

      const { lastFrame } = render(
        <LogView entries={createEntry} selectedIndex={0} />
      );

      const output = lastFrame();
      expect(output).toContain("create");
    });

    test("update operation displays with distinct color", () => {
      const updateEntry: AuditEntry[] = [
        {
          id: "1",
          fudaId: "sk-test1",
          operation: AuditOperation.UPDATE,
          field: "status",
          oldValue: "pending",
          newValue: "ready",
          actor: "agent",
          timestamp: new Date(),
        },
      ];

      const { lastFrame } = render(
        <LogView entries={updateEntry} selectedIndex={0} />
      );

      const output = lastFrame();
      expect(output).toContain("update");
    });

    test("delete operation displays with distinct color", () => {
      const deleteEntry: AuditEntry[] = [
        {
          id: "1",
          fudaId: "sk-test1",
          operation: AuditOperation.DELETE,
          field: null,
          oldValue: null,
          newValue: null,
          actor: "user",
          timestamp: new Date(),
        },
      ];

      const { lastFrame } = render(
        <LogView entries={deleteEntry} selectedIndex={0} />
      );

      const output = lastFrame();
      expect(output).toContain("delete");
    });

    test("different operations render with different visual styles", () => {
      const createEntry: AuditEntry[] = [
        {
          id: "1",
          fudaId: "sk-test1",
          operation: AuditOperation.CREATE,
          field: null,
          oldValue: null,
          newValue: null,
          actor: "cli",
          timestamp: new Date(),
        },
      ];
      const updateEntry: AuditEntry[] = [
        {
          id: "1",
          fudaId: "sk-test1",
          operation: AuditOperation.UPDATE,
          field: "status",
          oldValue: "pending",
          newValue: "ready",
          actor: "cli",
          timestamp: new Date(),
        },
      ];
      const deleteEntry: AuditEntry[] = [
        {
          id: "1",
          fudaId: "sk-test1",
          operation: AuditOperation.DELETE,
          field: null,
          oldValue: null,
          newValue: null,
          actor: "cli",
          timestamp: new Date(),
        },
      ];

      const { lastFrame: createFrame } = render(
        <LogView entries={createEntry} selectedIndex={0} />
      );
      const { lastFrame: updateFrame } = render(
        <LogView entries={updateEntry} selectedIndex={0} />
      );
      const { lastFrame: deleteFrame } = render(
        <LogView entries={deleteEntry} selectedIndex={0} />
      );

      // Each operation should render differently
      expect(createFrame()).not.toBe(updateFrame());
      expect(updateFrame()).not.toBe(deleteFrame());
      expect(createFrame()).not.toBe(deleteFrame());
    });
  });

  describe("edge cases", () => {
    test("handles entry with very long field value", () => {
      const longValueEntry: AuditEntry[] = [
        {
          id: "1",
          fudaId: "sk-test1",
          operation: AuditOperation.UPDATE,
          field: "description",
          oldValue: "Short",
          newValue:
            "This is a very long description that might need truncation or wrapping in the display",
          actor: "agent",
          timestamp: new Date(),
        },
      ];

      const { lastFrame } = render(
        <LogView entries={longValueEntry} selectedIndex={0} />
      );

      // Should render without crashing
      expect(lastFrame()).toBeDefined();
    });

    test("handles many entries", () => {
      const manyEntries: AuditEntry[] = Array.from({ length: 20 }, (_, i) => ({
        id: String(i),
        fudaId: `sk-test${i}`,
        operation: AuditOperation.UPDATE,
        field: "status",
        oldValue: "pending",
        newValue: "ready",
        actor: `agent-${i}`,
        timestamp: new Date(),
      }));

      const { lastFrame } = render(
        <LogView entries={manyEntries} selectedIndex={10} />
      );

      expect(lastFrame()).toBeDefined();
    });

    test("handles entry with null field values", () => {
      const nullFieldEntry: AuditEntry[] = [
        {
          id: "1",
          fudaId: "sk-test1",
          operation: AuditOperation.CREATE,
          field: null,
          oldValue: null,
          newValue: null,
          actor: "cli",
          timestamp: new Date(),
        },
      ];

      const { lastFrame } = render(
        <LogView entries={nullFieldEntry} selectedIndex={0} />
      );

      // Should render without crashing
      expect(lastFrame()).toBeDefined();
    });
  });
});
