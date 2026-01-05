import React from "react";
import { Box, Text, useInput } from "ink";
import { type Fuda, FudaStatus } from "../../types";

interface FudaListProps {
  fudas: Fuda[];
  selectedIndex: number;
  onSelect?: (index: number) => void;
}

function getStatusColor(status: FudaStatus): string {
  switch (status) {
    case FudaStatus.PENDING:
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
    case FudaStatus.BLOCKED:
      return "red";
    default:
      return "white";
  }
}

export function FudaList({ fudas, selectedIndex, onSelect }: FudaListProps) {
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

  return (
    <Box flexDirection="column">
      {fudas.map((fuda, index) => {
        const isSelected = index === selectedIndex;
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
