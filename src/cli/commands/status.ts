import { Database } from "bun:sqlite";
import { existsSync } from "fs";
import { join } from "path";
import { FudaStatus } from "../../types";
import { SHIKIGAMI_DIR, DB_FILENAME } from "../../config/paths";

export interface StatusOptions {
  projectRoot?: string;
}

export interface StatusCounts {
  blocked: number;
  ready: number;
  inProgress: number;
  inReview: number;
  failed: number;
  done: number;
  total: number;
}

export interface StatusResult {
  success: boolean;
  status?: StatusCounts;
  error?: string;
}

function getDb(projectRoot: string = process.cwd()): Database | null {
  const dbPath = join(projectRoot, SHIKIGAMI_DIR, DB_FILENAME);
  if (!existsSync(dbPath)) {
    return null;
  }
  return new Database(dbPath);
}

export async function runStatus(options: StatusOptions = {}): Promise<StatusResult> {
  const db = getDb(options.projectRoot);

  if (!db) {
    return {
      success: false,
      error: "Shiki not initialized. Run 'shiki init' first.",
    };
  }

  try {
    const countByStatus = db
      .query(
        `SELECT status, COUNT(*) as count
         FROM fuda
         WHERE deleted_at IS NULL
         GROUP BY status`
      )
      .all() as { status: string; count: number }[];

    const counts: Record<string, number> = {};
    for (const row of countByStatus) {
      counts[row.status] = row.count;
    }

    const status: StatusCounts = {
      blocked: counts[FudaStatus.BLOCKED] ?? 0,
      ready: counts[FudaStatus.READY] ?? 0,
      inProgress: counts[FudaStatus.IN_PROGRESS] ?? 0,
      inReview: counts[FudaStatus.IN_REVIEW] ?? 0,
      failed: counts[FudaStatus.FAILED] ?? 0,
      done: counts[FudaStatus.DONE] ?? 0,
      total: 0,
    };

    status.total = Object.values(status).reduce((a, b) => a + b, 0);

    db.close();

    return {
      success: true,
      status,
    };
  } catch (error) {
    db.close();
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
