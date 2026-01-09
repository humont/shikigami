import { Database } from "bun:sqlite";
import { existsSync } from "fs";
import { join } from "path";
import { findFudaByPrefix } from "../../db/fuda";
import {
  getEntries,
  getEntriesByType,
  addEntry,
  EntryType,
  type LedgerEntry,
} from "../../db/ledger";
import { SHIKIGAMI_DIR, DB_FILENAME } from "../../config/paths";

export interface LedgerOptions {
  id: string;
  projectRoot?: string;
  type?: string;
}

export interface LedgerAddOptions {
  id: string;
  content: string;
  projectRoot?: string;
  type?: string;
}

export interface LedgerResult {
  success: boolean;
  entries?: LedgerEntry[];
  error?: string;
}

export interface LedgerAddResult {
  success: boolean;
  entry?: LedgerEntry;
  error?: string;
}

function getDb(projectRoot: string = process.cwd()): Database | null {
  const dbPath = join(projectRoot, SHIKIGAMI_DIR, DB_FILENAME);
  if (!existsSync(dbPath)) {
    return null;
  }
  return new Database(dbPath);
}

function isValidEntryType(type: string): type is EntryType {
  return Object.values(EntryType).includes(type as EntryType);
}

export async function runLedger(options: LedgerOptions): Promise<LedgerResult> {
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

    // Validate type if provided
    if (options.type && !isValidEntryType(options.type)) {
      db.close();
      return {
        success: false,
        error: `Invalid type: ${options.type}. Must be 'handoff' or 'learning'.`,
      };
    }

    const entries = options.type
      ? getEntriesByType(db, fuda.id, options.type as EntryType)
      : getEntries(db, fuda.id);

    db.close();

    return {
      success: true,
      entries,
    };
  } catch (error) {
    db.close();
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function runLedgerAdd(
  options: LedgerAddOptions
): Promise<LedgerAddResult> {
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

    // Default to learning if no type specified
    const entryType = options.type || "learning";

    // Validate type
    if (!isValidEntryType(entryType)) {
      db.close();
      return {
        success: false,
        error: `Invalid type: ${entryType}. Must be 'handoff' or 'learning'.`,
      };
    }

    const entry = addEntry(db, {
      fudaId: fuda.id,
      entryType: entryType as EntryType,
      content: options.content,
    });

    db.close();

    return {
      success: true,
      entry,
    };
  } catch (error) {
    db.close();
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
