import React from "react";
import { Box, Text } from "ink";
import { type Fuda, FudaStatus } from "../../types";

interface FudaDetailsContentProps {
  fuda: Fuda;
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

function Field({
  label,
  value,
}: {
  label: string;
  value: string | number | null | undefined;
}) {
  if (value === null || value === undefined) return null;
  return (
    <Box>
      <Text dimColor>{label}: </Text>
      <Text>{String(value)}</Text>
    </Box>
  );
}

export function FudaDetailsContent({ fuda }: FudaDetailsContentProps) {
  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text bold color="cyan">
          {fuda.title}
        </Text>
      </Box>

      <Box flexDirection="column" gap={0}>
        <Field label="ID" value={fuda.id} />
        {fuda.displayId && <Field label="Display ID" value={fuda.displayId} />}
        {fuda.prdId && <Field label="PRD ID" value={fuda.prdId} />}
        <Box>
          <Text dimColor>Status: </Text>
          <Text color={getStatusColor(fuda.status)}>{fuda.status}</Text>
        </Box>
        <Field label="Spirit Type" value={fuda.spiritType} />
        <Field label="Priority" value={fuda.priority} />
        {fuda.assignedSpiritId && (
          <Field label="Assigned Spirit" value={fuda.assignedSpiritId} />
        )}
        {fuda.parentFudaId && (
          <Field label="Parent Fuda" value={fuda.parentFudaId} />
        )}
        <Field label="Retry Count" value={fuda.retryCount} />
        {fuda.outputCommitHash && (
          <Field label="Output Commit" value={fuda.outputCommitHash} />
        )}
        {fuda.failureContext && (
          <Field label="Failure Context" value={fuda.failureContext} />
        )}
      </Box>

      {fuda.description && (
        <Box marginTop={1} flexDirection="column">
          <Text dimColor>Description:</Text>
          <Text>{fuda.description}</Text>
        </Box>
      )}
    </Box>
  );
}
