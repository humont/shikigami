import { existsSync, readFileSync, readdirSync } from "fs";
import { join } from "path";
import { Database } from "bun:sqlite";
import { SHIKIGAMI_DIR, DB_FILENAME } from "../../../config/paths";
import { FudaStatus } from "../../../types";

export interface PrdShowOptions {
  id: string;
  projectRoot?: string;
}

export interface PrdFudaSummary {
  id: string;
  title: string;
  status: FudaStatus;
}

export interface PrdShowResult {
  success: boolean;
  prdId?: string;
  path?: string;
  content?: string;
  fileExists?: boolean;
  fuda?: PrdFudaSummary[];
  error?: string;
}

interface FudaRow {
  id: string;
  title: string;
  status: string;
}

function findPrdByPrefix(prdsDir: string, prefix: string): string[] {
  if (!existsSync(prdsDir)) {
    return [];
  }

  const files = readdirSync(prdsDir);
  const matches: string[] = [];

  for (const file of files) {
    if (file.endsWith(".md")) {
      const prdId = file.replace(/\.md$/, "");
      if (prdId === prefix || prdId.startsWith(prefix)) {
        matches.push(prdId);
      }
    }
  }

  return matches;
}

function findPrdByFuda(db: Database, prdId: string): boolean {
  const result = db
    .query(
      `SELECT COUNT(*) as count FROM fuda
       WHERE prd_id = ? AND deleted_at IS NULL`
    )
    .get(prdId) as { count: number };
  return result.count > 0;
}

export async function runPrdShow(
  options: PrdShowOptions
): Promise<PrdShowResult> {
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
    // Try to find PRD by prefix from files
    const matchingPrds = findPrdByPrefix(prdsDir, options.id);

    let prdId: string;
    let fileExists: boolean;

    if (matchingPrds.length === 1) {
      // Exact or unique prefix match from files
      prdId = matchingPrds[0];
      fileExists = true;
    } else if (matchingPrds.length > 1) {
      // Multiple matches - ambiguous
      return {
        success: false,
        error: `Prefix '${options.id}' matches multiple PRDs: ${matchingPrds.join(", ")}`,
      };
    } else {
      // No file match - check if there are fuda referencing this prd_id
      const hasFuda = findPrdByFuda(db, options.id);
      if (hasFuda) {
        prdId = options.id;
        fileExists = false;
      } else {
        return {
          success: false,
          error: `PRD not found: ${options.id}`,
        };
      }
    }

    const path = `${SHIKIGAMI_DIR}/prds/${prdId}.md`;

    // Read file content if it exists
    let content: string | undefined;
    if (fileExists) {
      const fullPath = join(projectRoot, path);
      content = readFileSync(fullPath, "utf-8");
    }

    // Get fuda that reference this PRD
    const fudaRows = db
      .query(
        `SELECT id, title, status FROM fuda
         WHERE prd_id = ? AND deleted_at IS NULL
         ORDER BY created_at ASC`
      )
      .all(prdId) as FudaRow[];

    const fuda: PrdFudaSummary[] = fudaRows.map((row) => ({
      id: row.id,
      title: row.title,
      status: row.status as FudaStatus,
    }));

    return {
      success: true,
      prdId,
      path,
      content,
      fileExists,
      fuda,
    };
  } finally {
    db.close();
  }
}
