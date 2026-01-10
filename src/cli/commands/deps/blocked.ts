import { Database } from "bun:sqlite";
import { existsSync } from "fs";
import { join } from "path";
import { findFudaByPrefix, getFuda } from "../../../db/fuda";
import { getBlockingDependencies } from "../../../db/dependencies";
import { type Fuda, FudaStatus } from "../../../types";
import { SHIKIGAMI_DIR, DB_FILENAME } from "../../../config/paths";

export interface DepsBlockedOptions {
  id: string;
  projectRoot?: string;
}

export interface BlockingFuda {
  id: string;
  title: string;
  status: string;
  type: string;
}

export interface DepsBlockedResult {
  success: boolean;
  blocking?: BlockingFuda[];
  error?: string;
}

function getDb(projectRoot: string = process.cwd()): Database | null {
  const dbPath = join(projectRoot, SHIKIGAMI_DIR, DB_FILENAME);
  if (!existsSync(dbPath)) {
    return null;
  }
  return new Database(dbPath);
}

export async function runDepsBlocked(options: DepsBlockedOptions): Promise<DepsBlockedResult> {
  const db = getDb(options.projectRoot);

  if (!db) {
    return {
      success: false,
      error: "Shiki not initialized. Run 'shiki init' first.",
    };
  }

  try {
    const fuda = findFudaByPrefix(db, options.id);

    if (!fuda) {
      db.close();
      return {
        success: false,
        error: `Fuda not found: ${options.id}`,
      };
    }

    const blockingDeps = getBlockingDependencies(db, fuda.id);
    const blocking: BlockingFuda[] = [];

    for (const dep of blockingDeps) {
      const depFuda = getFuda(db, dep.dependsOnId);
      if (depFuda && depFuda.status !== FudaStatus.DONE) {
        blocking.push({
          id: depFuda.id,
          title: depFuda.title,
          status: depFuda.status,
          type: dep.type,
        });
      }
    }

    db.close();

    return {
      success: true,
      blocking,
    };
  } catch (error) {
    db.close();
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
