import { Database } from "bun:sqlite";
import { existsSync } from "fs";
import { join } from "path";
import { findFudaByPrefix } from "../../db/fuda";
import { getFudaDependenciesFull } from "../../db/dependencies";
import { type Fuda, type FudaDependency } from "../../types";
import { SHIKIGAMI_DIR, DB_FILENAME } from "../../config/paths";

export interface ShowOptions {
  id: string;
  projectRoot?: string;
}

export interface ShowResult {
  success: boolean;
  fuda?: Fuda & { dependencies: FudaDependency[] };
  error?: string;
}

function getDb(projectRoot: string = process.cwd()): Database | null {
  const dbPath = join(projectRoot, SHIKIGAMI_DIR, DB_FILENAME);
  if (!existsSync(dbPath)) {
    return null;
  }
  return new Database(dbPath);
}

export async function runShow(options: ShowOptions): Promise<ShowResult> {
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

    const dependencies = getFudaDependenciesFull(db, fuda.id);

    db.close();

    return {
      success: true,
      fuda: { ...fuda, dependencies },
    };
  } catch (error) {
    db.close();
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
