import React from "react";
import { Box, Text } from "ink";
import { type DependencyType, type FudaStatus, FudaStatus as Status } from "../../types";

export interface DependencyNode {
  id: string;
  displayId: string | null;
  title: string;
  status: FudaStatus;
  type: DependencyType;
}

export interface DependencyTreeProps {
  blockers: DependencyNode[];
  dependents: DependencyNode[];
  selectedIndex?: number;
  onSelectDep?: (id: string) => void;
  loading?: boolean;
  error?: string;
}

function getStatusColor(status: FudaStatus): string {
  switch (status) {
    case Status.BLOCKED:
      return "gray";
    case Status.READY:
      return "cyan";
    case Status.IN_PROGRESS:
      return "yellow";
    case Status.IN_REVIEW:
      return "magenta";
    case Status.DONE:
      return "green";
    case Status.FAILED:
      return "red";
    default:
      return "white";
  }
}

export function DependencyTree({
  blockers,
  dependents,
  selectedIndex = -1,
  loading = false,
  error,
}: DependencyTreeProps) {
  if (error) {
    return (
      <Box>
        <Text color="red">{error}</Text>
      </Box>
    );
  }

  if (loading) {
    return (
      <Box>
        <Text>Loading...</Text>
      </Box>
    );
  }

  if (blockers.length === 0 && dependents.length === 0) {
    return (
      <Box>
        <Text dimColor>No dependencies</Text>
      </Box>
    );
  }

  const allNodes = [...blockers, ...dependents];
  let currentIndex = 0;

  return (
    <Box flexDirection="column">
      {blockers.length > 0 && (
        <Box flexDirection="column">
          <Text bold>
            Blockers ({blockers.length})
          </Text>
          {blockers.map((node) => {
            const isSelected = currentIndex === selectedIndex;
            const nodeIndex = currentIndex;
            currentIndex++;
            const displayId = node.displayId || node.id.slice(0, 8);

            return (
              <Box key={node.id} gap={1} marginLeft={1}>
                <Text>{isSelected ? ">" : "├"}</Text>
                <Text dimColor>{displayId}</Text>
                <Text color={getStatusColor(node.status)}>{node.status}</Text>
                <Text dimColor>[{node.type}]</Text>
                <Text bold={isSelected}>{node.title}</Text>
              </Box>
            );
          })}
        </Box>
      )}
      {dependents.length > 0 && (
        <Box flexDirection="column" marginTop={blockers.length > 0 ? 1 : 0}>
          <Text bold>
            Dependents ({dependents.length})
          </Text>
          {dependents.map((node) => {
            const isSelected = currentIndex === selectedIndex;
            currentIndex++;
            const displayId = node.displayId || node.id.slice(0, 8);

            return (
              <Box key={node.id} gap={1} marginLeft={1}>
                <Text>{isSelected ? ">" : "├"}</Text>
                <Text dimColor>{displayId}</Text>
                <Text color={getStatusColor(node.status)}>{node.status}</Text>
                <Text dimColor>[{node.type}]</Text>
                <Text bold={isSelected}>{node.title}</Text>
              </Box>
            );
          })}
        </Box>
      )}
    </Box>
  );
}
