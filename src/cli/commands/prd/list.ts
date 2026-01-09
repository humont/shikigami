import { existsSync, readdirSync } from "fs";
import { join } from "path";
import { Database } from "bun:sqlite";
import { SHIKIGAMI_DIR, DB_FILENAME } from "../../../config/paths";

export interface StatusBreakdown {
  blocked: number;
  ready: number;
  in_progress: number;
  in_review: number;
  failed: number;
  done: number;
}

export interface PrdInfo {
  id: string;
  path: string;
  fudaCount: number;
  statusBreakdown: StatusBreakdown;
}

export interface OrphanPrdRef {
  prdId: string;
  fudaCount: number;
}

export interface PrdListOptions {
  projectRoot?: string;
}

export interface PrdListResult {
  success: boolean;
  prds?: PrdInfo[];
  orphans?: OrphanPrdRef[];
  error?: string;
}

interface FudaCountRow {
  prd_id: string;
  status: string;
  count: number;
}

function emptyStatusBreakdown(): StatusBreakdown {
  return {
    blocked: 0,
    ready: 0,
    in_progress: 0,
    in_review: 0,
    failed: 0,
    done: 0,
  };
}

export async function runPrdList(
  options: PrdListOptions = {}
): Promise<PrdListResult> {
  const projectRoot = options.projectRoot ?? process.cwd();
  const shikigamiDir = join(projectRoot, SHIKIGAMI_DIR);
  const dbPath = join(shikigamiDir, DB_FILENAME);
  const prdsDir = join(shikigamiDir, "prds");

  // Check if shiki is initialized
  if (!existsSync(dbPath)) {
    return {
      success: false,
      error: "Shiki not initialized. Run 'shiki init' first.",
    };
  }

  const db = new Database(dbPath);

  try {
    // Get all PRD files
    const prdFiles: string[] = [];
    if (existsSync(prdsDir)) {
      const files = readdirSync(prdsDir);
      for (const file of files) {
        if (file.endsWith(".md")) {
          prdFiles.push(file);
        }
      }
    }

    // Extract PRD IDs from filenames (remove .md extension)
    const prdIds = new Set(prdFiles.map((f) => f.replace(/\.md$/, "")));

    // Query fuda counts grouped by prd_id and status
    const fudaCounts = db
      .query(
        `SELECT prd_id, status, COUNT(*) as count
         FROM fuda
         WHERE prd_id IS NOT NULL AND deleted_at IS NULL
         GROUP BY prd_id, status`
      )
      .all() as FudaCountRow[];

    // Build a map of prd_id -> status -> count
    const prdStatusMap = new Map<string, Map<string, number>>();
    for (const row of fudaCounts) {
      if (!prdStatusMap.has(row.prd_id)) {
        prdStatusMap.set(row.prd_id, new Map());
      }
      prdStatusMap.get(row.prd_id)!.set(row.status, row.count);
    }

    // Build PRD info for each file
    const prds: PrdInfo[] = [];
    for (const prdId of prdIds) {
      const statusMap = prdStatusMap.get(prdId) ?? new Map();
      const statusBreakdown = emptyStatusBreakdown();

      let fudaCount = 0;
      for (const [status, count] of statusMap) {
        fudaCount += count;
        if (status in statusBreakdown) {
          statusBreakdown[status as keyof StatusBreakdown] = count;
        }
      }

      prds.push({
        id: prdId,
        path: `${SHIKIGAMI_DIR}/prds/${prdId}.md`,
        fudaCount,
        statusBreakdown,
      });
    }

    // Sort PRDs alphabetically by id
    prds.sort((a, b) => a.id.localeCompare(b.id));

    // Find orphan prd_ids (in fuda but no matching file)
    const orphans: OrphanPrdRef[] = [];
    for (const [prdId, statusMap] of prdStatusMap) {
      if (!prdIds.has(prdId)) {
        let fudaCount = 0;
        for (const count of statusMap.values()) {
          fudaCount += count;
        }
        if (fudaCount > 0) {
          orphans.push({
            prdId,
            fudaCount,
          });
        }
      }
    }

    // Sort orphans alphabetically by prdId
    orphans.sort((a, b) => a.prdId.localeCompare(b.prdId));

    return {
      success: true,
      prds,
      orphans,
    };
  } finally {
    db.close();
  }
}
