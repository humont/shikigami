import { existsSync, readdirSync } from "fs";
import { join } from "path";
import { Database } from "bun:sqlite";
import { SHIKIGAMI_DIR, DB_FILENAME } from "../../../config/paths";

export interface OrphanPrdRef {
  prdId: string;
  fudaCount: number;
}

export interface PrdCheckOptions {
  projectRoot?: string;
}

export interface PrdCheckResult {
  success: boolean;
  exitCode: number;
  orphans?: OrphanPrdRef[];
  message?: string;
  error?: string;
}

interface FudaCountRow {
  prd_id: string;
  count: number;
}

export async function runPrdCheck(
  options: PrdCheckOptions = {}
): Promise<PrdCheckResult> {
  const projectRoot = options.projectRoot ?? process.cwd();
  const shikigamiDir = join(projectRoot, SHIKIGAMI_DIR);
  const dbPath = join(shikigamiDir, DB_FILENAME);
  const prdsDir = join(shikigamiDir, "prds");

  // Check if shiki is initialized
  if (!existsSync(dbPath)) {
    return {
      success: false,
      exitCode: 1,
      error: "Shiki not initialized. Run 'shiki init' first.",
    };
  }

  const db = new Database(dbPath);

  try {
    // Get all PRD files
    const prdIds = new Set<string>();
    if (existsSync(prdsDir)) {
      const files = readdirSync(prdsDir);
      for (const file of files) {
        if (file.endsWith(".md")) {
          prdIds.add(file.replace(/\.md$/, ""));
        }
      }
    }

    // Query fuda counts grouped by prd_id (only non-null, non-deleted)
    const fudaCounts = db
      .query(
        `SELECT prd_id, COUNT(*) as count
         FROM fuda
         WHERE prd_id IS NOT NULL AND deleted_at IS NULL
         GROUP BY prd_id`
      )
      .all() as FudaCountRow[];

    // Find orphan prd_ids (in fuda but no matching file)
    const orphans: OrphanPrdRef[] = [];
    for (const row of fudaCounts) {
      if (!prdIds.has(row.prd_id)) {
        orphans.push({
          prdId: row.prd_id,
          fudaCount: row.count,
        });
      }
    }

    // Sort orphans alphabetically by prdId
    orphans.sort((a, b) => a.prdId.localeCompare(b.prdId));

    if (orphans.length === 0) {
      return {
        success: true,
        exitCode: 0,
        orphans: [],
        message: "All PRD references are valid.",
      };
    }

    const totalOrphans = orphans.length;
    return {
      success: false,
      exitCode: 1,
      orphans,
      message: `Found ${totalOrphans} orphan PRD reference${totalOrphans === 1 ? "" : "s"} (fuda referencing non-existent PRD files).`,
    };
  } finally {
    db.close();
  }
}
