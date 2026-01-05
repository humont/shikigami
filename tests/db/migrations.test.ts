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
});
