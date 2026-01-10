import { Database } from "bun:sqlite";
import { existsSync } from "fs";
import { join } from "path";
import { findFudaByPrefix, getFuda } from "../../db/fuda";
import { getFudaDependenciesFull, getBlockingDependencies } from "../../db/dependencies";
import { getEntries, getEntriesByType, EntryType, type LedgerEntry } from "../../db/ledger";
import { type Fuda, type FudaDependency } from "../../types";
import { SHIKIGAMI_DIR, DB_FILENAME } from "../../config/paths";

export interface ShowOptions {
  id: string;
  projectRoot?: string;
}

export interface PredecessorHandoff {
  id: string;
  content: string;
  spiritId: string | null;
  createdAt: Date;
  sourceFudaId: string;
  sourceFudaTitle: string;
}

export interface ShowResult {
  success: boolean;
  fuda?: Fuda & {
    dependencies: FudaDependency[];
    prdPath: string | null;
    entries: LedgerEntry[];
    predecessorHandoffs: PredecessorHandoff[];
  };
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
    const prdPath = fuda.prdId ? `.shikigami/prds/${fuda.prdId}.md` : null;

    // Fetch all ledger entries for the current fuda
    const entries = getEntries(db, fuda.id);

    // Fetch predecessor handoffs from blocking dependencies
    const blockingDeps = getBlockingDependencies(db, fuda.id);
    const predecessorHandoffs: PredecessorHandoff[] = [];

    for (const dep of blockingDeps) {
      const predecessorFuda = getFuda(db, dep.dependsOnId);
      if (!predecessorFuda) continue;

      const handoffs = getEntriesByType(db, dep.dependsOnId, EntryType.HANDOFF);
      for (const handoff of handoffs) {
        predecessorHandoffs.push({
          id: handoff.id,
          content: handoff.content,
          spiritId: handoff.spiritId,
          createdAt: handoff.createdAt,
          sourceFudaId: dep.dependsOnId,
          sourceFudaTitle: predecessorFuda.title,
        });
      }
    }

    db.close();

    return {
      success: true,
      fuda: { ...fuda, dependencies, prdPath, entries, predecessorHandoffs },
    };
  } catch (error) {
    db.close();
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
