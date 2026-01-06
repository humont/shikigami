import React from "react";
import { Box, Text, useInput } from "ink";
import { type Fuda } from "../../types";
import { FudaDetailsContent } from "./FudaDetailsContent";

interface FudaDetailsProps {
  fuda: Fuda;
  onClose: () => void;
}

export function FudaDetails({ fuda, onClose }: FudaDetailsProps) {
  useInput((input, key) => {
    if (key.escape || input === "q" || input.includes("\x1B")) {
      onClose();
    }
  });

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor="cyan"
      paddingX={2}
      paddingY={1}
    >
      <FudaDetailsContent fuda={fuda} />

      <Box marginTop={1}>
        <Text dimColor>Press ESC or q to close</Text>
      </Box>
    </Box>
  );
}
