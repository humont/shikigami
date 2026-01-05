import { Database } from "bun:sqlite";
import { runMigrations } from "./migrations";
import { allMigrations } from "./migrations/all";
import { existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";

const SHIKI_DIR = ".shiki";
const DB_FILENAME = "shiki.db";

let dbInstance: Database | null = null;

export function getDbPath(projectRoot: string = process.cwd()): string {
  return join(projectRoot, SHIKI_DIR, DB_FILENAME);
}

export function getShikiDir(projectRoot: string = process.cwd()): string {
  return join(projectRoot, SHIKI_DIR);
}

export function ensureShikiDir(projectRoot: string = process.cwd()): void {
  const shikiDir = getShikiDir(projectRoot);
  if (!existsSync(shikiDir)) {
    mkdirSync(shikiDir, { recursive: true });
  }
}

export function getDb(dbPath?: string): Database {
  if (dbInstance) {
    return dbInstance;
  }

  const path = dbPath ?? getDbPath();
  dbInstance = new Database(path);
  return dbInstance;
}

export function createDb(dbPath: string): Database {
  ensureShikiDir(dirname(dirname(dbPath)));
  return new Database(dbPath);
}

export function closeDb(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}

export function initializeDb(db: Database): void {
  runMigrations(db, allMigrations);
}

export { Database, allMigrations };
