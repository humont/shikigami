import { Database } from "bun:sqlite";
import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { createFuda } from "../../db/fuda";
import { addFudaDependency } from "../../db/dependencies";
import { type SpiritType, type DependencyType } from "../../types";

const SHIKI_DIR = ".shiki";
const DB_FILENAME = "shiki.db";

export interface ImportOptions {
  file: string;
  dryRun?: boolean;
  projectRoot?: string;
}

export interface ImportResult {
  success: boolean;
  count?: number;
  imported?: string[];
  error?: string;
}

interface FudaImport {
  title: string;
  description: string;
  spiritType?: string;
  priority?: number;
  prdId?: string;
  parentFudaId?: string;
  dependencies?: Array<{
    id: string;
    type?: string;
  }>;
}

function getDb(projectRoot: string = process.cwd()): Database | null {
  const dbPath = join(projectRoot, SHIKI_DIR, DB_FILENAME);
  if (!existsSync(dbPath)) {
    return null;
  }
  return new Database(dbPath);
}

export async function runImport(options: ImportOptions): Promise<ImportResult> {
  const db = getDb(options.projectRoot);

  if (!db) {
    return {
      success: false,
      error: "Shiki not initialized. Run 'shiki init' first.",
    };
  }

  try {
    // Read and parse file
    if (!existsSync(options.file)) {
      db.close();
      return {
        success: false,
        error: `File not found: ${options.file}`,
      };
    }

    const content = readFileSync(options.file, "utf-8");
    let data: FudaImport[];

    try {
      const parsed = JSON.parse(content);
      data = Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      db.close();
      return {
        success: false,
        error: "Invalid JSON format",
      };
    }

    // Validate structure
    for (const item of data) {
      if (!item.title || !item.description) {
        db.close();
        return {
          success: false,
          error: "Each fuda must have title and description",
        };
      }
    }

    if (options.dryRun) {
      db.close();
      return {
        success: true,
        count: data.length,
        imported: data.map((f) => f.title),
      };
    }

    // Import fuda
    const imported: string[] = [];
    const idMap = new Map<string, string>(); // temp ID -> real ID

    // First pass: create all fuda
    for (let i = 0; i < data.length; i++) {
      const item = data[i];
      const fuda = createFuda(db, {
        title: item.title,
        description: item.description,
        spiritType: item.spiritType as SpiritType,
        priority: item.priority,
        prdId: item.prdId,
        parentFudaId: item.parentFudaId,
      });
      imported.push(fuda.id);
      idMap.set(`$${i}`, fuda.id); // Allow referencing by index
    }

    // Second pass: create dependencies
    for (let i = 0; i < data.length; i++) {
      const item = data[i];
      if (item.dependencies) {
        const fudaId = idMap.get(`$${i}`)!;
        for (const dep of item.dependencies) {
          const depId = dep.id.startsWith("$") ? idMap.get(dep.id) : dep.id;
          if (depId) {
            addFudaDependency(db, fudaId, depId, (dep.type ?? "blocks") as DependencyType);
          }
        }
      }
    }

    db.close();

    return {
      success: true,
      count: imported.length,
      imported,
    };
  } catch (error) {
    db.close();
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
