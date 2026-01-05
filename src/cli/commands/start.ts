import { Database } from "bun:sqlite";
import { existsSync } from "fs";
import { join } from "path";
import { findFudaByPrefix, getFuda, claimFuda } from "../../db/fuda";
import { type Fuda } from "../../types";
import { SHIKIGAMI_DIR, DB_FILENAME } from "../../config/paths";

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

function getDb(projectRoot: string = process.cwd()): Database | null {
  const dbPath = join(projectRoot, SHIKIGAMI_DIR, DB_FILENAME);
  if (!existsSync(dbPath)) {
    return null;
  }
  return new Database(dbPath);
}

export async function runStart(options: StartOptions): Promise<StartResult> {
  const db = getDb(options.projectRoot);

  if (!db) {
    return {
      success: false,
      error: "Shiki not initialized. Run 'shiki init' first.",
    };
  }

  try {
    // Find fuda by prefix
    const fuda = findFudaByPrefix(db, options.id);

    if (!fuda) {
      db.close();
      return {
        success: false,
        error: `Fuda not found: ${options.id}`,
      };
    }

    // Attempt atomic claim
    const result = claimFuda(db, fuda.id, options.assignedSpiritId ?? null);

    if (!result.success) {
      db.close();
      if (result.reason === "already_in_progress") {
        return {
          success: false,
          error: `Fuda '${fuda.id}' is already being worked on. Use 'shiki list --status ready' to find available tasks.`,
        };
      }
      return {
        success: false,
        error: `Cannot start fuda with status '${fuda.status}'. Only 'pending' or 'ready' fuda can be started.`,
      };
    }

    // Get updated fuda
    const updated = getFuda(db, fuda.id);

    db.close();

    return {
      success: true,
      fuda: updated!,
    };
  } catch (error) {
    db.close();
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
