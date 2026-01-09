import { Database } from "bun:sqlite";
import { generateId } from "../utils/id";

export enum EntryType {
  HANDOFF = "handoff",
  LEARNING = "learning",
}

export interface LedgerEntry {
  id: string;
  fudaId: string;
  entryType: EntryType;
  content: string;
  spiritId: string | null;
  createdAt: Date;
}

export interface AddEntryInput {
  fudaId: string;
  entryType: EntryType;
  content: string;
  spiritId?: string;
}

interface LedgerRow {
  id: string;
  fuda_id: string;
  entry_type: string;
  content: string;
  spirit_id: string | null;
  created_at: string;
}

function rowToEntry(row: LedgerRow): LedgerEntry {
  return {
    id: row.id,
    fudaId: row.fuda_id,
    entryType: row.entry_type as EntryType,
    content: row.content,
    spiritId: row.spirit_id,
    createdAt: new Date(row.created_at),
  };
}

function getExistingIds(db: Database): Set<string> {
  const rows = db.query("SELECT id FROM fuda_ledger").all() as { id: string }[];
  return new Set(rows.map((r) => r.id));
}

function fudaExists(db: Database, fudaId: string): boolean {
  const row = db.query("SELECT id FROM fuda WHERE id = ?").get(fudaId);
  return row !== null;
}

function isValidEntryType(entryType: string): entryType is EntryType {
  return Object.values(EntryType).includes(entryType as EntryType);
}

export function addEntry(db: Database, input: AddEntryInput): LedgerEntry {
  // Validate fuda exists
  if (!fudaExists(db, input.fudaId)) {
    throw new Error(`Fuda not found: ${input.fudaId}`);
  }

  // Validate entry type
  if (!isValidEntryType(input.entryType)) {
    throw new Error(`Invalid entry type: ${input.entryType}`);
  }

  const existingIds = getExistingIds(db);
  const id = generateId(existingIds);

  db.run(
    `INSERT INTO fuda_ledger (id, fuda_id, entry_type, content, spirit_id)
     VALUES (?, ?, ?, ?, ?)`,
    [id, input.fudaId, input.entryType, input.content, input.spiritId ?? null]
  );

  const row = db.query("SELECT * FROM fuda_ledger WHERE id = ?").get(id) as LedgerRow;
  return rowToEntry(row);
}

export function getEntries(db: Database, fudaId: string): LedgerEntry[] {
  const rows = db
    .query("SELECT * FROM fuda_ledger WHERE fuda_id = ? ORDER BY created_at ASC")
    .all(fudaId) as LedgerRow[];
  return rows.map(rowToEntry);
}

export function getEntriesByType(
  db: Database,
  fudaId: string,
  entryType: EntryType
): LedgerEntry[] {
  const rows = db
    .query(
      "SELECT * FROM fuda_ledger WHERE fuda_id = ? AND entry_type = ? ORDER BY created_at ASC"
    )
    .all(fudaId, entryType) as LedgerRow[];
  return rows.map(rowToEntry);
}
