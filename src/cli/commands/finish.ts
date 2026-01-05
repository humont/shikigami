import { type Fuda, FudaStatus } from "../../types";
import { runUpdate } from "./update";

export interface FinishOptions {
  id: string;
  projectRoot?: string;
}

export interface FinishResult {
  success: boolean;
  fuda?: Fuda;
  error?: string;
}

export async function runFinish(options: FinishOptions): Promise<FinishResult> {
  return runUpdate({
    id: options.id,
    status: FudaStatus.DONE,
    projectRoot: options.projectRoot,
  });
}
