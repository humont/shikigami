import { Database } from "bun:sqlite";
import type { Fuda } from "../types";
import type { LedgerEntry } from "./ledger";

export interface SearchAllResult {
  fuda: Fuda[];
  ledger: LedgerEntry[];
}

/**
 * Search fuda by title and description using FTS5.
 * TODO: Implement FTS5 search
 */
export function searchFuda(_db: Database, _query: string): Fuda[] {
  throw new Error("Not implemented");
}

/**
 * Search ledger entries by content using FTS5.
 * TODO: Implement FTS5 search
 */
export function searchLedger(_db: Database, _query: string): LedgerEntry[] {
  throw new Error("Not implemented");
}

/**
 * Search both fuda and ledger entries using FTS5.
 * TODO: Implement FTS5 search
 */
export function searchAll(_db: Database, _query: string): SearchAllResult {
  throw new Error("Not implemented");
}
