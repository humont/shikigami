import { Database } from "bun:sqlite";
import { existsSync } from "fs";
import { join } from "path";
import { type Fuda, type FudaStatus } from "../../types";
import { getAllFuda, getFudaByStatus, getActiveFuda } from "../../db/fuda";
import { SHIKIGAMI_DIR, DB_FILENAME } from "../../config/paths";

export interface ListOptions {
  status?: FudaStatus;
  limit?: number;
  all?: boolean;
  projectRoot?: string;
}

export interface ListResult {
  success: boolean;
  fudas?: Fuda[];
  error?: string;
}

function getDb(projectRoot: string = process.cwd()): Database | null {
  const dbPath = join(projectRoot, SHIKIGAMI_DIR, DB_FILENAME);
  if (!existsSync(dbPath)) {
    return null;
  }
  return new Database(dbPath);
}

export async function runList(options: ListOptions = {}): Promise<ListResult> {
  const db = getDb(options.projectRoot);

  if (!db) {
    return {
      success: false,
      error: "Shiki not initialized. Run 'shiki init' first.",
    };
  }

  try {
    let fudas: Fuda[];

    if (options.status) {
      // Explicit status filter takes precedence
      fudas = getFudaByStatus(db, options.status);
    } else if (options.all) {
      // Show all fuda including done/failed
      fudas = getAllFuda(db, options.limit);
    } else {
      // Default: show only active fuda (exclude done/failed)
      fudas = getActiveFuda(db, options.limit);
    }

    // Apply limit if filtering by status
    if (options.status && options.limit) {
      fudas = fudas.slice(0, options.limit);
    }

    db.close();

    return {
      success: true,
      fudas,
    };
  } catch (error) {
    db.close();
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
