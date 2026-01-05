import { Database } from "bun:sqlite";
import { existsSync } from "fs";
import { join } from "path";
import { getReadyFuda } from "../../db/fuda";
import { updateReadyFuda } from "../../db/dependencies";
import { type Fuda } from "../../types";

const SHIKI_DIR = ".shiki";
const DB_FILENAME = "shiki.db";

export interface ReadyOptions {
  limit?: number;
  projectRoot?: string;
}

export interface ReadyResult {
  success: boolean;
  fudas?: Fuda[];
  error?: string;
}

function getDb(projectRoot: string = process.cwd()): Database | null {
  const dbPath = join(projectRoot, SHIKI_DIR, DB_FILENAME);
  if (!existsSync(dbPath)) {
    return null;
  }
  return new Database(dbPath);
}

export async function runReady(options: ReadyOptions = {}): Promise<ReadyResult> {
  const db = getDb(options.projectRoot);

  if (!db) {
    return {
      success: false,
      error: "Shiki not initialized. Run 'shiki init' first.",
    };
  }

  try {
    // First, update any pending fuda that are now ready
    updateReadyFuda(db);

    // Get ready fuda
    const fudas = getReadyFuda(db, options.limit);

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
