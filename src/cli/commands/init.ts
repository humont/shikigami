import { existsSync, mkdirSync, unlinkSync } from "fs";
import { join } from "path";
import { Database } from "bun:sqlite";
import { runMigrations } from "../../db/migrations";
import { allMigrations } from "../../db/migrations/all";

const SHIKI_DIR = ".shiki";
const DB_FILENAME = "shiki.db";

export interface InitOptions {
  projectRoot?: string;
  force?: boolean;
}

export interface InitResult {
  success: boolean;
  dbPath?: string;
  error?: string;
}

export async function runInit(options: InitOptions = {}): Promise<InitResult> {
  const projectRoot = options.projectRoot ?? process.cwd();
  const shikiDir = join(projectRoot, SHIKI_DIR);
  const dbPath = join(shikiDir, DB_FILENAME);

  // Check if already initialized
  if (existsSync(dbPath) && !options.force) {
    return {
      success: false,
      error: "Shiki already initialized. Use --force to reinitialize.",
    };
  }

  try {
    // Create .shiki directory
    if (!existsSync(shikiDir)) {
      mkdirSync(shikiDir, { recursive: true });
    }

    // Remove existing database if force
    if (options.force && existsSync(dbPath)) {
      unlinkSync(dbPath);
    }

    // Create database and run migrations
    const db = new Database(dbPath);
    runMigrations(db, allMigrations);
    db.close();

    return {
      success: true,
      dbPath,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
