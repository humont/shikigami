import { Database } from "bun:sqlite";
import { existsSync } from "fs";
import { join } from "path";
import { findFudaByPrefix, getFuda, updateFudaStatus, updateFudaAssignment } from "../../db/fuda";
import { type Fuda, FudaStatus } from "../../types";
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

    // Set status to in_progress
    updateFudaStatus(db, fuda.id, FudaStatus.IN_PROGRESS);

    // Update assignment if provided
    if (options.assignedSpiritId !== undefined) {
      const spiritId = options.assignedSpiritId === "" ? null : options.assignedSpiritId;
      updateFudaAssignment(db, fuda.id, spiritId);
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
