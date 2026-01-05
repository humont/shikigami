import { Database } from "bun:sqlite";
import { existsSync } from "fs";
import { join } from "path";
import { findFudaByPrefix } from "../../db/fuda";
import { getAuditLog, type AuditEntry } from "../../db/audit";

const SHIKI_DIR = ".shiki";
const DB_FILENAME = "shiki.db";

export interface LogOptions {
  id: string;
  projectRoot?: string;
  limit?: number;
}

export interface LogResult {
  success: boolean;
  entries?: AuditEntry[];
  error?: string;
}

function getDb(projectRoot: string = process.cwd()): Database | null {
  const dbPath = join(projectRoot, SHIKI_DIR, DB_FILENAME);
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
