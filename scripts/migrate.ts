import { Database } from "bun:sqlite";
import { existsSync } from "fs";
import { join } from "path";
import { runMigrations, getMigrationStatus } from "../src/db/migrations";
import { allMigrations } from "../src/db/migrations/all";

const dbPath = join(process.cwd(), ".shikigami", "shiki.db");

if (!existsSync(dbPath)) {
  console.error("Database not found. Run 'shiki init' first.");
  process.exit(1);
}

const db = new Database(dbPath);

const before = getMigrationStatus(db);
console.log(`Applied migrations: ${before.length}/${allMigrations.length}`);

runMigrations(db, allMigrations);

const after = getMigrationStatus(db);
const applied = after.length - before.length;

if (applied > 0) {
  console.log(`Applied ${applied} new migration(s)`);
} else {
  console.log("No new migrations to apply");
}

db.close();
