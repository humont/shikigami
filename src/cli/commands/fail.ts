import { Database } from "bun:sqlite";
import { existsSync } from "fs";
import { join } from "path";
import { findFudaByPrefix, getFuda, updateFudaStatus } from "../../db/fuda";
import { type Fuda, FudaStatus } from "../../types";
import { SHIKIGAMI_DIR, DB_FILENAME } from "../../config/paths";

export interface FailOptions {
  id: string;
  projectRoot?: string;
}

export interface FailResult {
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

export async function runFail(options: FailOptions): Promise<FailResult> {
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

    // Set status to failed
    updateFudaStatus(db, fuda.id, FudaStatus.FAILED);

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
