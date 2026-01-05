import { Database } from "bun:sqlite";
import { existsSync } from "fs";
import { join } from "path";
import { findFudaByPrefix } from "../../db/fuda";
import { getAuditLog, getAllAuditLog, type AuditEntry } from "../../db/audit";
import { SHIKIGAMI_DIR, DB_FILENAME } from "../../config/paths";

export interface LogOptions {
  id: string;
  projectRoot?: string;
  limit?: number;
}

export interface LogAllOptions {
  projectRoot?: string;
  limit?: number;
}

export interface LogResult {
  success: boolean;
  entries?: AuditEntry[];
  error?: string;
}

function getDb(projectRoot: string = process.cwd()): Database | null {
  const dbPath = join(projectRoot, SHIKIGAMI_DIR, DB_FILENAME);
  if (!existsSync(dbPath)) {
    return null;
  }
  return new Database(dbPath);
}

export async function runLog(options: LogOptions): Promise<LogResult> {
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

    const entries = getAuditLog(db, fuda.id, { limit: options.limit });

    db.close();

    return {
      success: true,
      entries,
    };
  } catch (error) {
    db.close();
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function runLogAll(options: LogAllOptions): Promise<LogResult> {
  const db = getDb(options.projectRoot);

  if (!db) {
    return {
      success: false,
      error: "Shiki not initialized. Run 'shiki init' first.",
    };
  }

  try {
    const entries = getAllAuditLog(db, { limit: options.limit });

    db.close();

    return {
      success: true,
      entries,
    };
  } catch (error) {
    db.close();
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
