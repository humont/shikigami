import { Database } from "bun:sqlite";

export interface Migration {
  name: string;
  sql: string;
}

export interface MigrationRecord {
  name: string;
  appliedAt: string;
}

function ensureMigrationsTable(db: Database): void {
  db.run(`
    CREATE TABLE IF NOT EXISTS migrations (
      name TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
}

function getAppliedMigrations(db: Database): Set<string> {
  const rows = db.query("SELECT name FROM migrations").all() as { name: string }[];
  return new Set(rows.map((r) => r.name));
}

export function runMigrations(db: Database, migrations: Migration[]): void {
  ensureMigrationsTable(db);

  const applied = getAppliedMigrations(db);
  const pending = migrations.filter((m) => !applied.has(m.name));

  if (pending.length === 0) {
    return;
  }

  // Run all pending migrations in a transaction
  db.run("BEGIN TRANSACTION");

  try {
    for (const migration of pending) {
      db.run(migration.sql);
      db.run("INSERT INTO migrations (name) VALUES (?)", [migration.name]);
    }
    db.run("COMMIT");
  } catch (error) {
    db.run("ROLLBACK");
    throw error;
  }
}

export function getMigrationStatus(db: Database): MigrationRecord[] {
  ensureMigrationsTable(db);
  return db.query("SELECT name, applied_at as appliedAt FROM migrations ORDER BY name").all() as MigrationRecord[];
}
