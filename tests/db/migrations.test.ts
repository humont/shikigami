import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { Database } from "bun:sqlite";
import { runMigrations, getMigrationStatus } from "../../src/db/migrations";

describe("migrations", () => {
  let db: Database;

  beforeEach(() => {
    db = new Database(":memory:");
  });

  afterEach(() => {
    db.close();
  });

  test("creates migrations table on first run", () => {
    runMigrations(db, []);

    const tables = db
      .query("SELECT name FROM sqlite_master WHERE type='table' AND name='migrations'")
      .all();
    expect(tables).toHaveLength(1);
  });

  test("runs migrations in order", () => {
    const migrations = [
      {
        name: "001_create_foo",
        sql: "CREATE TABLE foo (id TEXT PRIMARY KEY);",
      },
      {
        name: "002_create_bar",
        sql: "CREATE TABLE bar (id TEXT PRIMARY KEY);",
      },
    ];

    runMigrations(db, migrations);

    const tables = db
      .query("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
      .all() as { name: string }[];
    const tableNames = tables.map((t) => t.name);

    expect(tableNames).toContain("foo");
    expect(tableNames).toContain("bar");
    expect(tableNames).toContain("migrations");
  });

  test("skips already-applied migrations", () => {
    const migrations = [
      {
        name: "001_create_foo",
        sql: "CREATE TABLE foo (id TEXT PRIMARY KEY);",
      },
    ];

    runMigrations(db, migrations);
    // Running again should not error
    runMigrations(db, migrations);

    const applied = db.query("SELECT * FROM migrations").all();
    expect(applied).toHaveLength(1);
  });

  test("applies only new migrations", () => {
    const firstMigration = [
      {
        name: "001_create_foo",
        sql: "CREATE TABLE foo (id TEXT PRIMARY KEY);",
      },
    ];

    runMigrations(db, firstMigration);

    const allMigrations = [
      ...firstMigration,
      {
        name: "002_create_bar",
        sql: "CREATE TABLE bar (id TEXT PRIMARY KEY);",
      },
    ];

    runMigrations(db, allMigrations);

    const applied = db.query("SELECT * FROM migrations ORDER BY name").all();
    expect(applied).toHaveLength(2);
  });

  test("rolls back on failure", () => {
    const migrations = [
      {
        name: "001_create_foo",
        sql: "CREATE TABLE foo (id TEXT PRIMARY KEY);",
      },
      {
        name: "002_invalid",
        sql: "THIS IS NOT VALID SQL;",
      },
    ];

    expect(() => runMigrations(db, migrations)).toThrow();

    // First migration should not be applied due to rollback
    const applied = db.query("SELECT * FROM migrations").all();
    expect(applied).toHaveLength(0);
  });

  test("getMigrationStatus returns applied migrations", () => {
    const migrations = [
      {
        name: "001_create_foo",
        sql: "CREATE TABLE foo (id TEXT PRIMARY KEY);",
      },
    ];

    runMigrations(db, migrations);
    const status = getMigrationStatus(db);

    expect(status).toHaveLength(1);
    expect(status[0].name).toBe("001_create_foo");
    expect(status[0].appliedAt).toBeDefined();
  });

  describe("0006_remove_display_id migration", () => {
    // Helper to get column names from a table
    const getColumnNames = (database: Database, tableName: string): string[] => {
      const columns = database.query(`PRAGMA table_info(${tableName})`).all() as { name: string }[];
      return columns.map((c) => c.name);
    };

    test("removes display_id column from fuda table", async () => {
      // Import the actual migrations
      const { migration: init } = await import("../../src/db/migrations/0001_init");
      const { migration: auditLog } = await import("../../src/db/migrations/0002_audit_log");
      const { migration: fudaLedger } = await import("../../src/db/migrations/0003_fuda_ledger");
      const { migration: fts5Search } = await import("../../src/db/migrations/0004_fts5_search");
      const { migration: renamePendingToBlocked } = await import(
        "../../src/db/migrations/0005_rename_pending_to_blocked"
      );
      const { migration: removeDisplayId } = await import(
        "../../src/db/migrations/0006_remove_display_id"
      );

      // Run all migrations up to and including the display_id removal
      const migrations = [init, auditLog, fudaLedger, fts5Search, renamePendingToBlocked, removeDisplayId];
      runMigrations(db, migrations);

      // Verify display_id column no longer exists
      const columns = getColumnNames(db, "fuda");
      expect(columns).not.toContain("display_id");
    });

    test("preserves other columns after migration", async () => {
      const { migration: init } = await import("../../src/db/migrations/0001_init");
      const { migration: auditLog } = await import("../../src/db/migrations/0002_audit_log");
      const { migration: fudaLedger } = await import("../../src/db/migrations/0003_fuda_ledger");
      const { migration: fts5Search } = await import("../../src/db/migrations/0004_fts5_search");
      const { migration: renamePendingToBlocked } = await import(
        "../../src/db/migrations/0005_rename_pending_to_blocked"
      );
      const { migration: removeDisplayId } = await import(
        "../../src/db/migrations/0006_remove_display_id"
      );

      const migrations = [init, auditLog, fudaLedger, fts5Search, renamePendingToBlocked, removeDisplayId];
      runMigrations(db, migrations);

      // Verify essential columns still exist
      const columns = getColumnNames(db, "fuda");
      expect(columns).toContain("id");
      expect(columns).toContain("title");
      expect(columns).toContain("description");
      expect(columns).toContain("status");
      expect(columns).toContain("spirit_type");
      expect(columns).toContain("prd_id");
      expect(columns).toContain("priority");
      expect(columns).toContain("created_at");
      expect(columns).toContain("updated_at");
    });

    test("preserves existing fuda data after migration", async () => {
      const { migration: init } = await import("../../src/db/migrations/0001_init");
      const { migration: auditLog } = await import("../../src/db/migrations/0002_audit_log");
      const { migration: fudaLedger } = await import("../../src/db/migrations/0003_fuda_ledger");
      const { migration: fts5Search } = await import("../../src/db/migrations/0004_fts5_search");
      const { migration: renamePendingToBlocked } = await import(
        "../../src/db/migrations/0005_rename_pending_to_blocked"
      );
      const { migration: removeDisplayId } = await import(
        "../../src/db/migrations/0006_remove_display_id"
      );

      // Run migrations up to before the display_id removal
      const migrationsBefore = [init, auditLog, fudaLedger, fts5Search, renamePendingToBlocked];
      runMigrations(db, migrationsBefore);

      // Insert test data with display_id
      db.run(`
        INSERT INTO fuda (id, display_id, title, description, status, spirit_type, priority)
        VALUES ('test-id-1', 'proj.1', 'Test Title', 'Test Description', 'ready', 'code', 0)
      `);

      // Run the display_id removal migration
      runMigrations(db, [...migrationsBefore, removeDisplayId]);

      // Verify data is preserved
      const fuda = db.query("SELECT * FROM fuda WHERE id = 'test-id-1'").get() as {
        id: string;
        title: string;
        description: string;
        status: string;
      };

      expect(fuda).toBeDefined();
      expect(fuda.id).toBe("test-id-1");
      expect(fuda.title).toBe("Test Title");
      expect(fuda.description).toBe("Test Description");
      expect(fuda.status).toBe("ready");
    });

    test("fuda_fts table does not contain display_id", async () => {
      const { migration: init } = await import("../../src/db/migrations/0001_init");
      const { migration: auditLog } = await import("../../src/db/migrations/0002_audit_log");
      const { migration: fudaLedger } = await import("../../src/db/migrations/0003_fuda_ledger");
      const { migration: fts5Search } = await import("../../src/db/migrations/0004_fts5_search");
      const { migration: renamePendingToBlocked } = await import(
        "../../src/db/migrations/0005_rename_pending_to_blocked"
      );
      const { migration: removeDisplayId } = await import(
        "../../src/db/migrations/0006_remove_display_id"
      );

      const migrations = [init, auditLog, fudaLedger, fts5Search, renamePendingToBlocked, removeDisplayId];
      runMigrations(db, migrations);

      // Verify display_id is not in the FTS table columns
      // FTS5 tables don't show in PRAGMA table_info, so we check the table schema
      const schema = db
        .query("SELECT sql FROM sqlite_master WHERE type='table' AND name='fuda_fts'")
        .get() as { sql: string } | null;

      expect(schema).toBeDefined();
      expect(schema!.sql).not.toContain("display_id");
    });
  });
});
