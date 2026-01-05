import { Database } from "bun:sqlite";
import { existsSync } from "fs";
import { join } from "path";
import { findFudaByPrefix, deleteFuda } from "../../db/fuda";

const SHIKI_DIR = ".shiki";
const DB_FILENAME = "shiki.db";

export interface RemoveOptions {
  id: string;
  reason?: string;
  deletedBy?: string;
  projectRoot?: string;
}

export interface RemoveResult {
  success: boolean;
  error?: string;
}

function getDb(projectRoot: string = process.cwd()): Database | null {
  const dbPath = join(projectRoot, SHIKI_DIR, DB_FILENAME);
  if (!existsSync(dbPath)) {
    return null;
  }
  return new Database(dbPath);
}

export async function runRemove(options: RemoveOptions): Promise<RemoveResult> {
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

    const deleted = deleteFuda(db, fuda.id, {
      reason: options.reason,
      deletedBy: options.deletedBy,
    });

    db.close();

    if (!deleted) {
      return {
        success: false,
        error: `Failed to delete fuda: ${options.id}`,
      };
    }

    return {
      success: true,
    };
  } catch (error) {
    db.close();
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
