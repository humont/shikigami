import { Database } from "bun:sqlite";
import { existsSync } from "fs";
import { join } from "path";
import {
  findFudaByPrefix,
  getFuda,
  updateFudaStatus,
  updateFudaCommit,
} from "../../db/fuda";
import { getFudaDependents, updateReadyFuda } from "../../db/dependencies";
import { addEntry, EntryType, type LedgerEntry } from "../../db/ledger";
import { type Fuda, FudaStatus } from "../../types";
import { SHIKIGAMI_DIR, DB_FILENAME } from "../../config/paths";

export interface FinishOptions {
  id: string;
  commitHash: string;
  notes?: string;
  projectRoot?: string;
}

export interface FinishResult {
  success: boolean;
  fuda?: Fuda;
  unblockedFuda?: Fuda[];
  ledgerEntry?: LedgerEntry;
  error?: string;
}

function getDb(projectRoot: string = process.cwd()): Database | null {
  const dbPath = join(projectRoot, SHIKIGAMI_DIR, DB_FILENAME);
  if (!existsSync(dbPath)) {
    return null;
  }
  return new Database(dbPath);
}

export async function runFinish(options: FinishOptions): Promise<FinishResult> {
  const db = getDb(options.projectRoot);

  if (!db) {
    return {
      success: false,
      error: "Shiki not initialized. Run 'shiki init' first.",
    };
  }

  try {
    // Find fuda by prefix
    const fuda = findFudaByPrefix(db, options.id);

    if (!fuda) {
      db.close();
      return {
        success: false,
        error: `Fuda not found: ${options.id}`,
      };
    }

    // Validate commit hash
    if (!options.commitHash || options.commitHash.trim() === "") {
      db.close();
      return {
        success: false,
        error: "Commit hash is required",
      };
    }

    // Store the commit hash
    updateFudaCommit(db, fuda.id, options.commitHash);

    // Create handoff ledger entry if notes provided
    let ledgerEntry: LedgerEntry | undefined;
    if (options.notes) {
      ledgerEntry = addEntry(db, {
        fudaId: fuda.id,
        entryType: EntryType.HANDOFF,
        content: options.notes,
      });
    }

    // Get dependents that are currently pending (potential candidates for unblocking)
    const dependentIds = getFudaDependents(db, fuda.id);
    const pendingDependentIds = dependentIds.filter((id) => {
      const dependent = getFuda(db, id);
      return dependent?.status === FudaStatus.BLOCKED;
    });

    // Update status to done
    updateFudaStatus(db, fuda.id, FudaStatus.DONE);

    // Update dependent tasks' readiness
    updateReadyFuda(db);

    // Check which pending dependents are now ready
    const unblockedFuda: Fuda[] = [];
    for (const id of pendingDependentIds) {
      const dependent = getFuda(db, id);
      if (dependent?.status === FudaStatus.READY) {
        unblockedFuda.push(dependent);
      }
    }

    // Get updated fuda
    const updated = getFuda(db, fuda.id);

    db.close();

    return {
      success: true,
      fuda: updated!,
      unblockedFuda,
      ledgerEntry,
    };
  } catch (error) {
    db.close();
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
