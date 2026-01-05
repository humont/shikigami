import { Database } from "bun:sqlite";
import { existsSync } from "fs";
import { join } from "path";
import { findFudaByPrefix, getFuda, updateFudaStatus, updateFudaAssignment } from "../../db/fuda";
import { type Fuda, FudaStatus } from "../../types";

const SHIKI_DIR = ".shiki";
const DB_FILENAME = "shiki.db";

const VALID_STATUSES = Object.values(FudaStatus);

export interface UpdateOptions {
  id: string;
  status: FudaStatus;
  projectRoot?: string;
  assignedSpiritId?: string;
}

export interface UpdateResult {
  success: boolean;
  fuda?: Fuda;
  error?: string;
}

function getDb(projectRoot: string = process.cwd()): Database | null {
  const dbPath = join(projectRoot, SHIKI_DIR, DB_FILENAME);
  if (!existsSync(dbPath)) {
    return null;
  }
  return new Database(dbPath);
}

function isValidStatus(status: string): status is FudaStatus {
  return VALID_STATUSES.includes(status as FudaStatus);
}

export async function runUpdate(options: UpdateOptions): Promise<UpdateResult> {
  const db = getDb(options.projectRoot);

  if (!db) {
    return {
      success: false,
      error: "Shiki not initialized. Run 'shiki init' first.",
    };
  }

  try {
    // Validate status
    if (!isValidStatus(options.status)) {
      db.close();
      return {
        success: false,
        error: `Invalid status: '${options.status}'. Valid statuses are: ${VALID_STATUSES.join(", ")}`,
      };
    }

    // Find fuda by prefix
    const fuda = findFudaByPrefix(db, options.id);

    if (!fuda) {
      db.close();
      return {
        success: false,
        error: `Fuda not found: ${options.id}`,
      };
    }

    // Update status
    updateFudaStatus(db, fuda.id, options.status);

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
