import { Database } from "bun:sqlite";
import {
  type Fuda,
  type CreateFudaInput,
  type DeleteFudaOptions,
  FudaStatus,
  SpiritType,
} from "../types";
import { generateId } from "../utils/id";
import { generateDisplayId } from "../utils/display-id";
import { logAuditEntry, AuditOperation } from "./audit";

interface FudaRow {
  id: string;
  display_id: string | null;
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

function rowToFuda(row: FudaRow): Fuda {
  return {
    id: row.id,
    displayId: row.display_id,
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

function getExistingIds(db: Database): Set<string> {
  const rows = db.query("SELECT id FROM fuda").all() as { id: string }[];
  return new Set(rows.map((r) => r.id));
}

function getSiblingCount(db: Database, prdId: string, parentFudaId?: string): number {
  if (parentFudaId) {
    const result = db
      .query("SELECT COUNT(*) as count FROM fuda WHERE parent_fuda_id = ? AND deleted_at IS NULL")
      .get(parentFudaId) as { count: number };
    return result.count;
  }
  const result = db
    .query("SELECT COUNT(*) as count FROM fuda WHERE prd_id = ? AND parent_fuda_id IS NULL AND deleted_at IS NULL")
    .get(prdId) as { count: number };
  return result.count;
}

function getParentDisplayId(db: Database, parentFudaId: string): string | undefined {
  const row = db.query("SELECT display_id FROM fuda WHERE id = ?").get(parentFudaId) as { display_id: string | null } | null;
  return row?.display_id ?? undefined;
}

export function createFuda(db: Database, input: CreateFudaInput, actor?: string): Fuda {
  const existingIds = getExistingIds(db);
  const id = generateId(existingIds);

  let displayId: string | null = null;
  if (input.prdId) {
    const siblingCount = getSiblingCount(db, input.prdId, input.parentFudaId);
    const parentDisplayId = input.parentFudaId ? getParentDisplayId(db, input.parentFudaId) : undefined;
    displayId = generateDisplayId({
      prdId: input.prdId,
      parentDisplayId,
      siblingCount,
    });
  }

  const spiritType = input.spiritType ?? SpiritType.SHIKIGAMI;
  const priority = input.priority ?? 0;

  db.run(
    `INSERT INTO fuda (id, display_id, prd_id, title, description, spirit_type, priority, parent_fuda_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, displayId, input.prdId ?? null, input.title, input.description, spiritType, priority, input.parentFudaId ?? null]
  );

  if (actor) {
    logAuditEntry(db, {
      fudaId: id,
      operation: AuditOperation.CREATE,
      actor,
    });
  }

  return getFuda(db, id)!;
}

export function getFuda(db: Database, id: string, includeDeleted = false): Fuda | null {
  const whereClause = includeDeleted ? "" : " AND deleted_at IS NULL";
  const row = db.query(`SELECT * FROM fuda WHERE id = ?${whereClause}`).get(id) as FudaRow | null;
  return row ? rowToFuda(row) : null;
}

export function findFudaByPrefix(db: Database, prefix: string, includeDeleted = false): Fuda | null {
  const whereClause = includeDeleted ? "" : " AND deleted_at IS NULL";

  // Try exact match first
  let row = db.query(`SELECT * FROM fuda WHERE (id = ? OR display_id = ?)${whereClause}`).get(prefix, prefix) as FudaRow | null;
  if (row) {
    return rowToFuda(row);
  }

  // Try prefix match on id (with sk- prefix)
  const idPrefix = prefix.startsWith("sk-") ? prefix : `sk-${prefix}`;
  const rows = db
    .query(`SELECT * FROM fuda WHERE (id LIKE ? OR display_id LIKE ?)${whereClause}`)
    .all(`${idPrefix}%`, `${prefix}%`) as FudaRow[];

  if (rows.length === 1) {
    return rowToFuda(rows[0]);
  }

  // Ambiguous or not found
  return null;
}

export function findFudasByPrefix(db: Database, prefix: string, includeDeleted = false): Fuda[] {
  const whereClause = includeDeleted ? "" : " AND deleted_at IS NULL";
  const idPrefix = prefix.startsWith("sk-") ? prefix : `sk-${prefix}`;

  const rows = db
    .query(`SELECT * FROM fuda WHERE (id LIKE ? OR display_id LIKE ?)${whereClause}`)
    .all(`${idPrefix}%`, `${prefix}%`) as FudaRow[];

  return rows.map(rowToFuda);
}

export function getAllFuda(db: Database, limit?: number): Fuda[] {
  const limitClause = limit ? ` LIMIT ${limit}` : "";
  const rows = db
    .query(`SELECT * FROM fuda WHERE deleted_at IS NULL ORDER BY priority DESC, created_at ASC${limitClause}`)
    .all() as FudaRow[];
  return rows.map(rowToFuda);
}

export function getFudaByStatus(db: Database, status: FudaStatus): Fuda[] {
  const rows = db
    .query("SELECT * FROM fuda WHERE status = ? AND deleted_at IS NULL ORDER BY priority DESC, created_at ASC")
    .all(status) as FudaRow[];
  return rows.map(rowToFuda);
}

export function getReadyFuda(db: Database, limit?: number): Fuda[] {
  const limitClause = limit ? ` LIMIT ${limit}` : "";
  const rows = db
    .query(`SELECT * FROM fuda WHERE status = 'ready' AND deleted_at IS NULL ORDER BY priority DESC, created_at ASC${limitClause}`)
    .all() as FudaRow[];
  return rows.map(rowToFuda);
}

export function getFudaByPrd(db: Database, prdId: string): Fuda[] {
  const rows = db
    .query("SELECT * FROM fuda WHERE prd_id = ? AND deleted_at IS NULL ORDER BY display_id ASC")
    .all(prdId) as FudaRow[];
  return rows.map(rowToFuda);
}

export function updateFudaStatus(db: Database, id: string, status: FudaStatus, actor?: string): void {
  if (actor) {
    const fuda = getFuda(db, id, true);
    if (fuda) {
      logAuditEntry(db, {
        fudaId: id,
        operation: AuditOperation.UPDATE,
        field: "status",
        oldValue: fuda.status,
        newValue: status,
        actor,
      });
    }
  }
  db.run("UPDATE fuda SET status = ?, updated_at = datetime('now') WHERE id = ?", [status, id]);
}

export function updateFudaAssignment(db: Database, id: string, spiritId: string | null, actor?: string): void {
  if (actor) {
    const fuda = getFuda(db, id, true);
    if (fuda) {
      logAuditEntry(db, {
        fudaId: id,
        operation: AuditOperation.UPDATE,
        field: "assigned_spirit_id",
        oldValue: fuda.assignedSpiritId ?? undefined,
        newValue: spiritId ?? undefined,
        actor,
      });
    }
  }
  db.run("UPDATE fuda SET assigned_spirit_id = ?, updated_at = datetime('now') WHERE id = ?", [spiritId, id]);
}

export function updateFudaCommit(db: Database, id: string, commitHash: string, actor?: string): void {
  if (actor) {
    const fuda = getFuda(db, id, true);
    if (fuda) {
      logAuditEntry(db, {
        fudaId: id,
        operation: AuditOperation.UPDATE,
        field: "output_commit_hash",
        oldValue: fuda.outputCommitHash ?? undefined,
        newValue: commitHash,
        actor,
      });
    }
  }
  db.run("UPDATE fuda SET output_commit_hash = ?, updated_at = datetime('now') WHERE id = ?", [commitHash, id]);
}

export function updateFudaFailureContext(db: Database, id: string, context: string, actor?: string): void {
  if (actor) {
    const fuda = getFuda(db, id, true);
    if (fuda) {
      logAuditEntry(db, {
        fudaId: id,
        operation: AuditOperation.UPDATE,
        field: "failure_context",
        oldValue: fuda.failureContext ?? undefined,
        newValue: context,
        actor,
      });
    }
  }
  db.run("UPDATE fuda SET failure_context = ?, updated_at = datetime('now') WHERE id = ?", [context, id]);
}

export function incrementFudaRetry(db: Database, id: string, actor?: string): number {
  const fuda = getFuda(db, id, true);
  const oldCount = fuda?.retryCount ?? 0;

  db.run("UPDATE fuda SET retry_count = retry_count + 1, updated_at = datetime('now') WHERE id = ?", [id]);
  const row = db.query("SELECT retry_count FROM fuda WHERE id = ?").get(id) as { retry_count: number };

  if (actor && fuda) {
    logAuditEntry(db, {
      fudaId: id,
      operation: AuditOperation.UPDATE,
      field: "retry_count",
      oldValue: String(oldCount),
      newValue: String(row.retry_count),
      actor,
    });
  }

  return row.retry_count;
}

export function deleteFuda(db: Database, id: string, options: DeleteFudaOptions & { actor?: string } = {}): boolean {
  const result = db.run(
    "UPDATE fuda SET deleted_at = datetime('now'), deleted_by = ?, delete_reason = ?, updated_at = datetime('now') WHERE id = ? AND deleted_at IS NULL",
    [options.deletedBy ?? null, options.reason ?? null, id]
  );

  if (result.changes > 0 && options.actor) {
    logAuditEntry(db, {
      fudaId: id,
      operation: AuditOperation.DELETE,
      actor: options.actor,
    });
  }

  return result.changes > 0;
}

export function restoreFuda(db: Database, id: string, actor?: string): boolean {
  const result = db.run(
    "UPDATE fuda SET deleted_at = NULL, deleted_by = NULL, delete_reason = NULL, updated_at = datetime('now') WHERE id = ?",
    [id]
  );

  if (result.changes > 0 && actor) {
    logAuditEntry(db, {
      fudaId: id,
      operation: AuditOperation.UPDATE,
      field: "deleted_at",
      oldValue: "(deleted)",
      newValue: "(restored)",
      actor,
    });
  }

  return result.changes > 0;
}

export function hardDeleteFuda(db: Database, id: string, actor?: string): boolean {
  if (actor) {
    logAuditEntry(db, {
      fudaId: id,
      operation: AuditOperation.DELETE,
      field: "hard_delete",
      actor,
    });
  }

  const result = db.run("DELETE FROM fuda WHERE id = ?", [id]);
  return result.changes > 0;
}

export function getDeletedFuda(db: Database): Fuda[] {
  const rows = db
    .query("SELECT * FROM fuda WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC")
    .all() as FudaRow[];
  return rows.map(rowToFuda);
}
