import React, { useState, useRef } from "react";
import { Box, Text, useInput } from "ink";
import { FudaStatus } from "../../types";

const STATUS_OPTIONS: FudaStatus[] = [
  FudaStatus.PENDING,
  FudaStatus.READY,
  FudaStatus.IN_PROGRESS,
  FudaStatus.IN_REVIEW,
  FudaStatus.DONE,
  FudaStatus.FAILED,
  FudaStatus.BLOCKED,
];

const STATUS_COLORS: Record<FudaStatus, string> = {
  [FudaStatus.PENDING]: "gray",
  [FudaStatus.READY]: "cyan",
  [FudaStatus.IN_PROGRESS]: "yellow",
  [FudaStatus.IN_REVIEW]: "magenta",
  [FudaStatus.DONE]: "green",
  [FudaStatus.FAILED]: "red",
  [FudaStatus.BLOCKED]: "red",
};

interface StatusPickerProps {
  fudaId: string;
  currentStatus: FudaStatus;
  onStatusChange: (status: FudaStatus, fudaId?: string) => void;
  onCancel?: () => void;
}

export function StatusPicker({
  fudaId,
  currentStatus,
  onStatusChange,
  onCancel,
}: StatusPickerProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  // Use ref to track index synchronously for input handler
  const indexRef = useRef(0);

  useInput((input, key) => {
    if (key.downArrow || input === "j") {
      const newIndex = Math.min(indexRef.current + 1, STATUS_OPTIONS.length - 1);
      indexRef.current = newIndex;
      setSelectedIndex(newIndex);
    } else if (key.upArrow || input === "k") {
      const newIndex = Math.max(indexRef.current - 1, 0);
      indexRef.current = newIndex;
      setSelectedIndex(newIndex);
    } else if (key.return || input === " ") {
      const selectedStatus = STATUS_OPTIONS[indexRef.current];
      onStatusChange(selectedStatus, fudaId);
    } else if (key.escape) {
      onCancel?.();
    }
  });

  return (
    <Box flexDirection="column">
      {STATUS_OPTIONS.map((status, index) => {
        const isSelected = index === selectedIndex;
        const isCurrent = status === currentStatus;
        const color = STATUS_COLORS[status];

        return (
          <Box key={status}>
            <Text>{isSelected ? "> " : "  "}</Text>
            <Text color={color} bold={isSelected} inverse={isCurrent}>
              {status}
            </Text>
            {isCurrent && <Text dimColor> (current)</Text>}
          </Box>
        );
      })}
    </Box>
  );
}
