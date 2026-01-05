import { type Fuda, FudaStatus } from "../../types";
import { runUpdate } from "./update";

export interface StartOptions {
  id: string;
  projectRoot?: string;
  assignedSpiritId?: string;
}

export interface StartResult {
  success: boolean;
  fuda?: Fuda;
  error?: string;
}

export async function runStart(options: StartOptions): Promise<StartResult> {
  return runUpdate({
    id: options.id,
    status: FudaStatus.IN_PROGRESS,
    projectRoot: options.projectRoot,
    assignedSpiritId: options.assignedSpiritId,
  });
}
