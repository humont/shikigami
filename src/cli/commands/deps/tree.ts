import { Database } from "bun:sqlite";
import { existsSync } from "fs";
import { join } from "path";
import { findFudaByPrefix } from "../../../db/fuda";
import { getDependencyTree } from "../../../db/dependencies";
import { type FudaDependency } from "../../../types";
import { SHIKIGAMI_DIR, DB_FILENAME } from "../../../config/paths";

export interface DepsTreeOptions {
  id: string;
  depth?: number;
  projectRoot?: string;
}

export interface DepsTreeResult {
  success: boolean;
  tree?: Record<string, FudaDependency[]>;
  error?: string;
}

function getDb(projectRoot: string = process.cwd()): Database | null {
  const dbPath = join(projectRoot, SHIKIGAMI_DIR, DB_FILENAME);
  if (!existsSync(dbPath)) {
    return null;
  }
  return new Database(dbPath);
}

export async function runDepsTree(options: DepsTreeOptions): Promise<DepsTreeResult> {
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

    const treeMap = getDependencyTree(db, fuda.id, options.depth ?? 10);
    const tree: Record<string, FudaDependency[]> = {};

    for (const [key, value] of treeMap) {
      tree[key] = value;
    }

    db.close();

    return {
      success: true,
      tree,
    };
  } catch (error) {
    db.close();
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
