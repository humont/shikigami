import type { FudaStatus } from "../types";

export const StatusColors: Record<FudaStatus, string> = {
  pending: "gray",
  ready: "cyan",
  in_progress: "yellow",
  in_review: "magenta",
  blocked: "red",
  failed: "red",
  done: "green",
};

export function getStatusColor(status: FudaStatus): string {
  return StatusColors[status];
}
