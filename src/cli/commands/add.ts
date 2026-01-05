import { Database } from "bun:sqlite";
import { existsSync } from "fs";
import { join } from "path";
import { createFuda, findFudaByPrefix } from "../../db/fuda";
import { addFudaDependency } from "../../db/dependencies";
import { type Fuda, type SpiritType, type DependencyType, FudaStatus } from "../../types";

const SHIKI_DIR = ".shiki";
const DB_FILENAME = "shiki.db";

export interface AddOptions {
  title: string;
  description: string;
  spiritType?: string;
  priority?: number;
  dependsOn?: string[];
  depType?: string;
  prdId?: string;
  parentFudaId?: string;
  projectRoot?: string;
}

export interface AddResult {
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

export async function runAdd(options: AddOptions): Promise<AddResult> {
  const db = getDb(options.projectRoot);

  if (!db) {
    return {
      success: false,
      error: "Shiki not initialized. Run 'shiki init' first.",
    };
  }

  try {
    // Resolve parent fuda ID if provided as prefix
    let resolvedParentId: string | undefined;
    if (options.parentFudaId) {
      const parent = findFudaByPrefix(db, options.parentFudaId);
      if (!parent) {
        db.close();
        return {
          success: false,
          error: `Parent fuda not found: ${options.parentFudaId}`,
        };
      }
      resolvedParentId = parent.id;
    }

    // Create the fuda
    const fuda = createFuda(db, {
      title: options.title,
      description: options.description,
      spiritType: options.spiritType as SpiritType,
      priority: options.priority,
      prdId: options.prdId,
      parentFudaId: resolvedParentId,
    });

    // Add dependencies if specified
    if (options.dependsOn && options.dependsOn.length > 0) {
      const depType = (options.depType ?? "blocks") as DependencyType;

      for (const depIdPrefix of options.dependsOn) {
        const dep = findFudaByPrefix(db, depIdPrefix);
        if (!dep) {
          db.close();
          return {
            success: false,
            error: `Dependency not found: ${depIdPrefix}`,
          };
        }
        addFudaDependency(db, fuda.id, dep.id, depType);
      }
    }

    db.close();

    return {
      success: true,
      fuda,
    };
  } catch (error) {
    db.close();
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
