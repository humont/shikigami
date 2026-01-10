import { Database } from "bun:sqlite";
import { type Fuda, FudaStatus, SpiritType } from "../types";
import { type LedgerEntry, EntryType } from "./ledger";

export interface SearchAllResult {
  fuda: Fuda[];
  ledger: LedgerEntry[];
}

interface FudaRow {
  id: string;
  prd_id: string | null;
  title: string;
  description: string;
  status: string;
  spirit_type: string;
  assigned_spirit_id: string | null;
  output_commit_hash: string | null;
  retry_count: number;
  failure_context: string | null;
  parent_fuda_id: string | null;
  priority: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  deleted_by: string | null;
  delete_reason: string | null;
}

interface LedgerRow {
  id: string;
  fuda_id: string;
  entry_type: string;
  content: string;
  spirit_id: string | null;
  created_at: string;
}

function rowToFuda(row: FudaRow): Fuda {
  return {
    id: row.id,
    prdId: row.prd_id,
    title: row.title,
    description: row.description,
    status: row.status as FudaStatus,
    spiritType: row.spirit_type as SpiritType,
    assignedSpiritId: row.assigned_spirit_id,
    outputCommitHash: row.output_commit_hash,
    retryCount: row.retry_count,
    failureContext: row.failure_context,
    parentFudaId: row.parent_fuda_id,
    priority: row.priority,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    deletedAt: row.deleted_at ? new Date(row.deleted_at) : null,
    deletedBy: row.deleted_by,
    deleteReason: row.delete_reason,
  };
}

function rowToLedgerEntry(row: LedgerRow): LedgerEntry {
  return {
    id: row.id,
    fudaId: row.fuda_id,
    entryType: row.entry_type as EntryType,
    content: row.content,
    spiritId: row.spirit_id,
    createdAt: new Date(row.created_at),
  };
}

/**
 * Search fuda by title and description using FTS5.
 */
export function searchFuda(db: Database, query: string): Fuda[] {
  // Get matching IDs from FTS index
  const ftsRows = db
    .query(`SELECT id FROM fuda_fts WHERE fuda_fts MATCH ?`)
    .all(query) as { id: string }[];

  if (ftsRows.length === 0) {
    return [];
  }

  const ids = ftsRows.map((r) => r.id);
  const placeholders = ids.map(() => "?").join(", ");

  // Fetch full fuda records (already filtered by deleted_at via FTS sync)
  const rows = db
    .query(`SELECT * FROM fuda WHERE id IN (${placeholders}) AND deleted_at IS NULL`)
    .all(...ids) as FudaRow[];

  return rows.map(rowToFuda);
}

/**
 * Search ledger entries by content using FTS5.
 */
export function searchLedger(db: Database, query: string): LedgerEntry[] {
  // Get matching IDs from FTS index
  const ftsRows = db
    .query(`SELECT id FROM fuda_ledger_fts WHERE fuda_ledger_fts MATCH ?`)
    .all(query) as { id: string }[];

  if (ftsRows.length === 0) {
    return [];
  }

  const ids = ftsRows.map((r) => r.id);
  const placeholders = ids.map(() => "?").join(", ");

  // Fetch full ledger records
  const rows = db
    .query(`SELECT * FROM fuda_ledger WHERE id IN (${placeholders})`)
    .all(...ids) as LedgerRow[];

  return rows.map(rowToLedgerEntry);
}

/**
 * Search both fuda and ledger entries using FTS5.
 */
export function searchAll(db: Database, query: string): SearchAllResult {
  return {
    fuda: searchFuda(db, query),
    ledger: searchLedger(db, query),
  };
}
