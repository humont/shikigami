import { existsSync } from "fs";
import { join } from "path";

export interface PrdInfo {
  id: string;
  path: string;
  fudaCount: number;
  statusBreakdown: {
    blocked: number;
    ready: number;
    in_progress: number;
    in_review: number;
    failed: number;
    done: number;
  };
}

export interface OrphanPrdRef {
  prdId: string;
  fudaCount: number;
}

export interface PrdListOptions {
  projectRoot?: string;
}

export interface PrdListResult {
  success: boolean;
  prds?: PrdInfo[];
  orphans?: OrphanPrdRef[];
  error?: string;
}

export async function runPrdList(
  options: PrdListOptions = {}
): Promise<PrdListResult> {
  const projectRoot = options.projectRoot || process.cwd();
  const shikiDir = join(projectRoot, ".shikigami");

  // Check if shiki is initialized
  if (!existsSync(join(shikiDir, "shiki.db"))) {
    return {
      success: false,
      error: "Shiki not initialized. Run 'shiki init' first.",
    };
  }

  // TODO: Implement PRD list functionality
  return {
    success: false,
    error: "Not implemented",
  };
}
