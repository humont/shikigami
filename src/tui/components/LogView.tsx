import React, { useState, useEffect } from "react";
import { Box, Text, useInput, useStdout } from "ink";
import { type AuditEntry, AuditOperation } from "../../db/audit";

interface LogViewProps {
  entries: AuditEntry[];
  selectedIndex: number;
  onSelect?: (index: number) => void;
  maxHeight?: number;
}

function getOperationColor(operation: AuditOperation): string {
  switch (operation) {
    case AuditOperation.CREATE:
      return "green";
    case AuditOperation.UPDATE:
      return "yellow";
    case AuditOperation.DELETE:
      return "red";
    default:
      return "white";
  }
}

function formatFieldChange(entry: AuditEntry): string {
  if (!entry.field) {
    return "";
  }
  if (entry.oldValue && entry.newValue) {
    return `${entry.field}: ${entry.oldValue} → ${entry.newValue}`;
  }
  if (entry.newValue) {
    return `${entry.field}: ${entry.newValue}`;
  }
  return entry.field;
}

export function LogView({ entries, selectedIndex, onSelect, maxHeight }: LogViewProps) {
  const { stdout } = useStdout();
  const [scrollOffset, setScrollOffset] = useState(0);

  // Calculate visible height (subtract 3 for TopBar, BottomBar, and padding)
  const terminalHeight = stdout?.rows ?? 24;
  const visibleHeight = maxHeight ?? Math.max(1, terminalHeight - 3);

  // Adjust scroll offset to keep selected item in view
  useEffect(() => {
    if (selectedIndex < scrollOffset) {
      setScrollOffset(selectedIndex);
    } else if (selectedIndex >= scrollOffset + visibleHeight) {
      setScrollOffset(selectedIndex - visibleHeight + 1);
    }
  }, [selectedIndex, scrollOffset, visibleHeight]);

  useInput((input, key) => {
    if (!onSelect || entries.length === 0) return;

    if (key.downArrow || input === "j") {
      const newIndex = Math.min(selectedIndex + 1, entries.length - 1);
      onSelect(newIndex);
    } else if (key.upArrow || input === "k") {
      const newIndex = Math.max(selectedIndex - 1, 0);
      onSelect(newIndex);
    }
  });

  if (entries.length === 0) {
    return (
      <Box flexDirection="column">
        <Text dimColor>No audit entries</Text>
      </Box>
    );
  }

  // Get the visible window of entries
  const visibleEntries = entries.slice(scrollOffset, scrollOffset + visibleHeight);

  return (
    <Box flexDirection="column">
      {visibleEntries.map((entry, visibleIndex) => {
        const actualIndex = scrollOffset + visibleIndex;
        const isSelected = actualIndex === selectedIndex;
        const fieldChange = formatFieldChange(entry);

        return (
          <Box key={entry.id} gap={1}>
            <Text>{isSelected ? ">" : " "}</Text>
            <Text dimColor>{entry.fudaId}</Text>
            <Text color={getOperationColor(entry.operation as AuditOperation)}>
              {entry.operation.padEnd(6)}
            </Text>
            <Text dimColor>{entry.actor}</Text>
            {fieldChange && <Text bold={isSelected}>{fieldChange}</Text>}
          </Box>
        );
      })}
    </Box>
  );
}
