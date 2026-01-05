import { existsSync, mkdirSync, unlinkSync, writeFileSync } from "fs";
import { join } from "path";
import { Database } from "bun:sqlite";
import { runMigrations } from "../../db/migrations";
import { allMigrations } from "../../db/migrations/all";
import { AGENT_INSTRUCTIONS_CONTENT } from "../../content/agent-instructions";

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

    // Create AGENT_INSTRUCTIONS.md
    const instructionsPath = join(shikiDir, "AGENT_INSTRUCTIONS.md");
    writeFileSync(instructionsPath, AGENT_INSTRUCTIONS_CONTENT);

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
