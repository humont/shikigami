import { Database } from "bun:sqlite";

export const AuditOperation = {
  CREATE: "create",
  UPDATE: "update",
  DELETE: "delete",
} as const;

export type AuditOperation = (typeof AuditOperation)[keyof typeof AuditOperation];

export interface AuditEntry {
  id: string;
  fudaId: string;
  operation: AuditOperation;
  field: string | null;
  oldValue: string | null;
  newValue: string | null;
  actor: string;
  timestamp: Date;
}

export interface LogAuditEntryInput {
  fudaId: string;
  operation: AuditOperation;
  field?: string;
  oldValue?: string;
  newValue?: string;
  actor: string;
}

export interface GetAuditLogOptions {
  limit?: number;
}

interface AuditRow {
  id: number;
  fuda_id: string;
  operation: string;
  field: string | null;
  old_value: string | null;
  new_value: string | null;
  actor: string;
  timestamp: string;
}

function rowToAuditEntry(row: AuditRow): AuditEntry {
  return {
    id: String(row.id),
    fudaId: row.fuda_id,
    operation: row.operation as AuditOperation,
    field: row.field,
    oldValue: row.old_value,
    newValue: row.new_value,
    actor: row.actor,
    timestamp: new Date(row.timestamp),
  };
}

export function logAuditEntry(db: Database, input: LogAuditEntryInput): void {
  db.run(
    `INSERT INTO audit_log (fuda_id, operation, field, old_value, new_value, actor)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      input.fudaId,
      input.operation,
      input.field ?? null,
      input.oldValue ?? null,
      input.newValue ?? null,
      input.actor,
    ]
  );
}

export function getAuditLog(
  db: Database,
  fudaId: string,
  options: GetAuditLogOptions = {}
): AuditEntry[] {
  const limitClause = options.limit ? ` LIMIT ${options.limit}` : "";
  const rows = db
    .query(`SELECT * FROM audit_log WHERE fuda_id = ? ORDER BY timestamp DESC, id DESC${limitClause}`)
    .all(fudaId) as AuditRow[];
  return rows.map(rowToAuditEntry);
}
