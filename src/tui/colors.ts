import type { FudaStatus } from "../types";

export const StatusColors: Record<FudaStatus, string> = {
  blocked: "gray",
  ready: "cyan",
  in_progress: "yellow",
  in_review: "magenta",
  failed: "red",
  done: "green",
};

export function getStatusColor(status: FudaStatus): string {
  return StatusColors[status];
}
