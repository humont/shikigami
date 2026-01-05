import { Database } from "bun:sqlite";
import { existsSync } from "fs";
import { join } from "path";
import { findFudaByPrefix } from "../../../db/fuda";
import { addFudaDependency } from "../../../db/dependencies";
import { type DependencyType } from "../../../types";

const SHIKI_DIR = ".shiki";
const DB_FILENAME = "shiki.db";

export interface DepsAddOptions {
  fudaId: string;
  dependsOnId: string;
  type?: string;
  projectRoot?: string;
}

export interface DepsAddResult {
  success: boolean;
  fudaId?: string;
  dependsOnId?: string;
  error?: string;
}

function getDb(projectRoot: string = process.cwd()): Database | null {
  const dbPath = join(projectRoot, SHIKI_DIR, DB_FILENAME);
  if (!existsSync(dbPath)) {
    return null;
  }
  return new Database(dbPath);
}

export async function runDepsAdd(options: DepsAddOptions): Promise<DepsAddResult> {
  const db = getDb(options.projectRoot);

  if (!db) {
    return {
      success: false,
      error: "Shiki not initialized. Run 'shiki init' first.",
    };
  }

  try {
    const fuda = findFudaByPrefix(db, options.fudaId);
    if (!fuda) {
      db.close();
      return {
        success: false,
        error: `Fuda not found: ${options.fudaId}`,
      };
    }

    const dependsOn = findFudaByPrefix(db, options.dependsOnId);
    if (!dependsOn) {
      db.close();
      return {
        success: false,
        error: `Dependency fuda not found: ${options.dependsOnId}`,
      };
    }

    const type = (options.type ?? "blocks") as DependencyType;
    addFudaDependency(db, fuda.id, dependsOn.id, type);

    db.close();

    return {
      success: true,
      fudaId: fuda.id,
      dependsOnId: dependsOn.id,
    };
  } catch (error) {
    db.close();
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
