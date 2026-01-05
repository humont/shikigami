import React from "react";
import { Box, Text } from "ink";

export interface CommandHint {
  key: string;
  description: string;
}

export type ViewContext = "list" | "details" | "log";

interface BottomBarProps {
  hints: CommandHint[];
  view?: ViewContext;
}

export function BottomBar({ hints }: BottomBarProps) {
  return (
    <Box flexDirection="row" gap={2}>
      {hints.map((hint, index) => (
        <Box key={`${hint.key}-${index}`}>
          <Text bold color="cyan">
            {hint.key}
          </Text>
          <Text dimColor>: {hint.description}</Text>
        </Box>
      ))}
    </Box>
  );
}
