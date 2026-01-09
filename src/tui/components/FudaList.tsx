import React, { useState, useEffect } from "react";
import { Box, Text, useInput, useStdout } from "ink";
import { type Fuda, FudaStatus } from "../../types";

interface FudaListProps {
  fudas: Fuda[];
  selectedIndex: number;
  onSelect?: (index: number) => void;
  maxHeight?: number; // Optional override for visible height
}

function getStatusColor(status: FudaStatus): string {
  switch (status) {
    case FudaStatus.BLOCKED:
      return "gray";
    case FudaStatus.READY:
      return "cyan";
    case FudaStatus.IN_PROGRESS:
      return "yellow";
    case FudaStatus.IN_REVIEW:
      return "magenta";
    case FudaStatus.DONE:
      return "green";
    case FudaStatus.FAILED:
      return "red";
    default:
      return "white";
  }
}

export function FudaList({ fudas, selectedIndex, onSelect, maxHeight }: FudaListProps) {
  const { stdout } = useStdout();
  const [scrollOffset, setScrollOffset] = useState(0);

  // Calculate visible height (subtract 3 for TopBar, BottomBar, and padding)
  const terminalHeight = stdout?.rows ?? 24;
  const visibleHeight = maxHeight ?? Math.max(1, terminalHeight - 3);

  // Adjust scroll offset to keep selected item in view
  useEffect(() => {
    if (selectedIndex < scrollOffset) {
      // Selected item is above the visible area
      setScrollOffset(selectedIndex);
    } else if (selectedIndex >= scrollOffset + visibleHeight) {
      // Selected item is below the visible area
      setScrollOffset(selectedIndex - visibleHeight + 1);
    }
  }, [selectedIndex, scrollOffset, visibleHeight]);

  useInput((input, key) => {
    if (!onSelect || fudas.length === 0) return;

    if (key.downArrow || input === "j") {
      const newIndex = Math.min(selectedIndex + 1, fudas.length - 1);
      onSelect(newIndex);
    } else if (key.upArrow || input === "k") {
      const newIndex = Math.max(selectedIndex - 1, 0);
      onSelect(newIndex);
    }
  });

  // Get the visible window of fudas
  const visibleFudas = fudas.slice(scrollOffset, scrollOffset + visibleHeight);

  return (
    <Box flexDirection="column">
      {visibleFudas.map((fuda, visibleIndex) => {
        const actualIndex = scrollOffset + visibleIndex;
        const isSelected = actualIndex === selectedIndex;
        const displayId = fuda.displayId || fuda.id;

        return (
          <Box key={fuda.id} gap={1}>
            <Text>{isSelected ? ">" : " "}</Text>
            <Text dimColor>{displayId}</Text>
            <Text color={getStatusColor(fuda.status)}>{fuda.status.padEnd(11)}</Text>
            <Text dimColor>p{fuda.priority}</Text>
            <Text bold={isSelected}>{fuda.title}</Text>
          </Box>
        );
      })}
    </Box>
  );
}
