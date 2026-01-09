import { Database } from "bun:sqlite";
import { type FudaDependency, DependencyType, FudaStatus, isBlockingDependency } from "../types";

interface DependencyRow {
  fuda_id: string;
  depends_on_id: string;
  dependency_type: string;
}

function rowToDependency(row: DependencyRow): FudaDependency {
  return {
    fudaId: row.fuda_id,
    dependsOnId: row.depends_on_id,
    type: row.dependency_type as DependencyType,
  };
}

export function addFudaDependency(
  db: Database,
  fudaId: string,
  dependsOnId: string,
  type: DependencyType = DependencyType.BLOCKS
): void {
  db.run(
    "INSERT OR REPLACE INTO fuda_dependencies (fuda_id, depends_on_id, dependency_type) VALUES (?, ?, ?)",
    [fudaId, dependsOnId, type]
  );
}

export function removeFudaDependency(db: Database, fudaId: string, dependsOnId: string): void {
  db.run("DELETE FROM fuda_dependencies WHERE fuda_id = ? AND depends_on_id = ?", [fudaId, dependsOnId]);
}

export function getFudaDependencies(db: Database, fudaId: string): string[] {
  const rows = db
    .query("SELECT depends_on_id FROM fuda_dependencies WHERE fuda_id = ?")
    .all(fudaId) as { depends_on_id: string }[];
  return rows.map((r) => r.depends_on_id);
}

export function getFudaDependenciesFull(db: Database, fudaId: string): FudaDependency[] {
  const rows = db
    .query("SELECT * FROM fuda_dependencies WHERE fuda_id = ?")
    .all(fudaId) as DependencyRow[];
  return rows.map(rowToDependency);
}

export function getBlockingDependencies(db: Database, fudaId: string): FudaDependency[] {
  const rows = db
    .query(
      `SELECT * FROM fuda_dependencies
       WHERE fuda_id = ? AND dependency_type IN ('blocks', 'parent-child')`
    )
    .all(fudaId) as DependencyRow[];
  return rows.map(rowToDependency);
}

export function getFudaDependents(db: Database, fudaId: string): string[] {
  const rows = db
    .query("SELECT fuda_id FROM fuda_dependencies WHERE depends_on_id = ?")
    .all(fudaId) as { fuda_id: string }[];
  return rows.map((r) => r.fuda_id);
}

export function areAllDependenciesDone(db: Database, fudaId: string): boolean {
  // Get all blocking dependencies that are NOT done
  const notDone = db
    .query(
      `SELECT fd.depends_on_id
       FROM fuda_dependencies fd
       JOIN fuda f ON fd.depends_on_id = f.id
       WHERE fd.fuda_id = ?
         AND fd.dependency_type IN ('blocks', 'parent-child')
         AND f.status != 'done'
         AND f.deleted_at IS NULL`
    )
    .all(fudaId) as { depends_on_id: string }[];

  return notDone.length === 0;
}

export function updateReadyFuda(db: Database): number {
  // Find all pending fuda where all blocking dependencies are done
  // A fuda is ready if:
  // 1. It's currently pending
  // 2. It's not deleted
  // 3. It has no blocking dependencies OR all blocking dependencies are done

  const whereClause = `
    status = 'pending'
    AND deleted_at IS NULL
    AND id NOT IN (
      SELECT DISTINCT fd.fuda_id
      FROM fuda_dependencies fd
      JOIN fuda dep ON fd.depends_on_id = dep.id
      WHERE fd.dependency_type IN ('blocks', 'parent-child')
        AND dep.status != 'done'
        AND dep.deleted_at IS NULL
    )
  `;

  // Count first because FTS5 triggers inflate db.run().changes
  const countResult = db.query(`SELECT COUNT(*) as count FROM fuda WHERE ${whereClause}`).get() as { count: number };

  db.run(`UPDATE fuda SET status = 'ready', updated_at = datetime('now') WHERE ${whereClause}`);

  return countResult.count;
}

export function getDependencyTree(
  db: Database,
  fudaId: string,
  maxDepth: number = 10
): Map<string, FudaDependency[]> {
  const tree = new Map<string, FudaDependency[]>();
  const visited = new Set<string>();
  const queue: { id: string; depth: number }[] = [{ id: fudaId, depth: 0 }];

  while (queue.length > 0) {
    const { id, depth } = queue.shift()!;

    if (visited.has(id) || depth > maxDepth) {
      continue;
    }

    visited.add(id);
    const deps = getFudaDependenciesFull(db, id);
    tree.set(id, deps);

    for (const dep of deps) {
      if (!visited.has(dep.dependsOnId)) {
        queue.push({ id: dep.dependsOnId, depth: depth + 1 });
      }
    }
  }

  return tree;
}
