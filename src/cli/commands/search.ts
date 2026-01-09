import { Database } from "bun:sqlite";
import { existsSync } from "fs";
import { join } from "path";
import { SHIKIGAMI_DIR, DB_FILENAME } from "../../config/paths";
import {
  searchFuda,
  searchLedger,
  searchAll,
} from "../../db/search";
import type { Fuda } from "../../types";
import type { LedgerEntry } from "../../db/ledger";

export interface SearchOptions {
  query: string;
  fudaOnly?: boolean;
  ledgerOnly?: boolean;
  projectRoot?: string;
}

export interface SearchResult {
  success: boolean;
  fuda?: Fuda[];
  ledger?: LedgerEntry[];
  error?: string;
}

function getDb(projectRoot: string = process.cwd()): Database | null {
  const dbPath = join(projectRoot, SHIKIGAMI_DIR, DB_FILENAME);
  if (!existsSync(dbPath)) {
    return null;
  }
  return new Database(dbPath);
}

export async function runSearch(options: SearchOptions): Promise<SearchResult> {
  // Validate mutually exclusive flags
  if (options.fudaOnly && options.ledgerOnly) {
    return {
      success: false,
      error: "--fuda-only and --ledger-only are mutually exclusive",
    };
  }

  const db = getDb(options.projectRoot);

  if (!db) {
    return {
      success: false,
      error: "Shiki not initialized. Run 'shiki init' first.",
    };
  }

  try {
    if (options.fudaOnly) {
      const fuda = searchFuda(db, options.query);
      db.close();
      return {
        success: true,
        fuda,
      };
    }

    if (options.ledgerOnly) {
      const ledger = searchLedger(db, options.query);
      db.close();
      return {
        success: true,
        ledger,
      };
    }

    // Default: search both
    const results = searchAll(db, options.query);
    db.close();

    return {
      success: true,
      fuda: results.fuda,
      ledger: results.ledger,
    };
  } catch (error) {
    db.close();
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
