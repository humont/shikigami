import React from "react";
import { Box, Text } from "ink";
import { type Fuda } from "../../types";
import { FudaDetailsContent } from "./FudaDetailsContent";
import { DependencyGraph, type DependencyGraphNode } from "./DependencyGraph";
import { type DependencyNode } from "./DependencyTree";

export interface SidePanelProps {
  fuda: Fuda;
  blockers: DependencyNode[];
  dependents: DependencyNode[];
  width?: number;
  loading?: boolean;
  error?: string;
}

function toGraphNode(node: DependencyNode): DependencyGraphNode {
  return {
    ...node,
    children: [],
  };
}

export function SidePanel({
  fuda,
  blockers,
  dependents,
  width = 80,
  loading = false,
  error,
}: SidePanelProps) {
  const graphBlockers = blockers.map(toGraphNode);
  const graphDependents = dependents.map(toGraphNode);

  return (
    <Box
      flexDirection="column"
      borderStyle="single"
      borderColor="gray"
      width={width}
    >
      <Box paddingX={1} flexDirection="column">
        <Text bold color="cyan">
          Details
        </Text>
        <FudaDetailsContent fuda={fuda} />
      </Box>

      <Box marginTop={1} borderStyle="single" borderTop borderBottom={false} borderLeft={false} borderRight={false} borderColor="gray" />

      <Box paddingX={1} flexGrow={1} flexDirection="column">
        <Text bold color="cyan">
          Dependencies
        </Text>
        <DependencyGraph
          blockers={graphBlockers}
          dependents={graphDependents}
          loading={loading}
          error={error}
        />
      </Box>
    </Box>
  );
}
