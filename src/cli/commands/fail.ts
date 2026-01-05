import { type Fuda, FudaStatus } from "../../types";
import { runUpdate } from "./update";

export interface FailOptions {
  id: string;
  projectRoot?: string;
}

export interface FailResult {
  success: boolean;
  fuda?: Fuda;
  error?: string;
}

export async function runFail(options: FailOptions): Promise<FailResult> {
  return runUpdate({
    id: options.id,
    status: FudaStatus.FAILED,
    projectRoot: options.projectRoot,
  });
}
