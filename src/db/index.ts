import { Database } from "bun:sqlite";
import { runMigrations } from "./migrations";
import { allMigrations } from "./migrations/all";
import { existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { SHIKIGAMI_DIR, DB_FILENAME } from "../config/paths";

let dbInstance: Database | null = null;

export function getDbPath(projectRoot: string = process.cwd()): string {
  return join(projectRoot, SHIKIGAMI_DIR, DB_FILENAME);
}

export function getShikigamiDir(projectRoot: string = process.cwd()): string {
  return join(projectRoot, SHIKIGAMI_DIR);
}

export function ensureShikigamiDir(projectRoot: string = process.cwd()): void {
  const shikigamiDir = getShikigamiDir(projectRoot);
  if (!existsSync(shikigamiDir)) {
    mkdirSync(shikigamiDir, { recursive: true });
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
  ensureShikigamiDir(dirname(dirname(dbPath)));
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
