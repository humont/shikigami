import { existsSync, mkdirSync, unlinkSync, writeFileSync } from "fs";
import { join } from "path";
import { Database } from "bun:sqlite";
import { runMigrations } from "../../db/migrations";
import { allMigrations } from "../../db/migrations/all";
import { AGENT_INSTRUCTIONS_CONTENT } from "../../content/agent-instructions";
import { SHIKIGAMI_DIR, DB_FILENAME } from "../../config/paths";

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
  const shikigamiDir = join(projectRoot, SHIKIGAMI_DIR);
  const dbPath = join(shikigamiDir, DB_FILENAME);

  // Check if already initialized
  if (existsSync(dbPath) && !options.force) {
    return {
      success: false,
      error: "Shikigami already initialized. Use --force to reinitialize.",
    };
  }

  try {
    // Create .shikigami directory
    if (!existsSync(shikigamiDir)) {
      mkdirSync(shikigamiDir, { recursive: true });
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
    const instructionsPath = join(shikigamiDir, "AGENT_INSTRUCTIONS.md");
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
