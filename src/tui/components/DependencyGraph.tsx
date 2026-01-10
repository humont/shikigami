import React from "react";
import { Box, Text } from "ink";
import { type DependencyType, type FudaStatus } from "../../types";
import { getStatusColor } from "../colors";

export interface DependencyGraphNode {
  id: string;
  title: string;
  status: FudaStatus;
  type: DependencyType;
  children: DependencyGraphNode[];
  isCircular?: boolean;
}

export interface DependencyGraphProps {
  blockers: DependencyGraphNode[];
  dependents: DependencyGraphNode[];
  maxDepth?: number;
  loading?: boolean;
  error?: string;
}

const MAX_TITLE_LENGTH = 50;

function truncateTitle(title: string, maxLength: number = MAX_TITLE_LENGTH): string {
  if (title.length <= maxLength) return title;
  return title.slice(0, maxLength - 3) + "...";
}

interface TreeNodeProps {
  node: DependencyGraphNode;
  prefix: string;
  isLast: boolean;
  depth: number;
  maxDepth: number;
}

function TreeNode({ node, prefix, isLast, depth, maxDepth }: TreeNodeProps) {
  const connector = isLast ? "└── " : "├── ";
  const childPrefix = prefix + (isLast ? "    " : "│   ");
  const nodeId = node.id;

  if (node.isCircular) {
    return (
      <Box>
        <Text>
          {prefix}
          {connector}
        </Text>
        <Text dimColor>{nodeId}</Text>
        <Text> </Text>
        <Text color={getStatusColor(node.status)}>{node.status}</Text>
        <Text> </Text>
        <Text dimColor>[{node.type}]</Text>
        <Text> </Text>
        <Text>{truncateTitle(node.title)}</Text>
        <Text> </Text>
        <Text color="yellow">[circular]</Text>
      </Box>
    );
  }

  const hasChildren = node.children.length > 0;
  const atMaxDepth = depth >= maxDepth;
  const showTruncation = hasChildren && atMaxDepth;

  return (
    <Box flexDirection="column">
      <Box>
        <Text>
          {prefix}
          {connector}
        </Text>
        <Text dimColor>{nodeId}</Text>
        <Text> </Text>
        <Text color={getStatusColor(node.status)}>{node.status}</Text>
        <Text> </Text>
        <Text dimColor>[{node.type}]</Text>
        <Text> </Text>
        <Text>{truncateTitle(node.title)}</Text>
        {showTruncation && <Text dimColor> ...</Text>}
      </Box>
      {!atMaxDepth &&
        node.children.map((child, index) => (
          <TreeNode
            key={child.id + "-" + index}
            node={child}
            prefix={childPrefix}
            isLast={index === node.children.length - 1}
            depth={depth + 1}
            maxDepth={maxDepth}
          />
        ))}
    </Box>
  );
}

function countNodes(nodes: DependencyGraphNode[]): number {
  return nodes.reduce((acc, node) => {
    return acc + 1 + (node.children ? countNodes(node.children) : 0);
  }, 0);
}

export function DependencyGraph({
  blockers,
  dependents,
  maxDepth = 5,
  loading = false,
  error,
}: DependencyGraphProps) {
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

  return (
    <Box flexDirection="column">
      {blockers.length > 0 && (
        <Box flexDirection="column">
          <Text bold>Blockers ({blockers.length})</Text>
          {blockers.map((node, index) => (
            <TreeNode
              key={node.id + "-blocker-" + index}
              node={node}
              prefix=""
              isLast={index === blockers.length - 1}
              depth={0}
              maxDepth={maxDepth}
            />
          ))}
        </Box>
      )}
      {dependents.length > 0 && (
        <Box flexDirection="column" marginTop={blockers.length > 0 ? 1 : 0}>
          <Text bold>Dependents ({dependents.length})</Text>
          {dependents.map((node, index) => (
            <TreeNode
              key={node.id + "-dependent-" + index}
              node={node}
              prefix=""
              isLast={index === dependents.length - 1}
              depth={0}
              maxDepth={maxDepth}
            />
          ))}
        </Box>
      )}
    </Box>
  );
}
