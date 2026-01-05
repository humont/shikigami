import { existsSync, mkdirSync, unlinkSync, writeFileSync, readFileSync } from "fs";
import { join } from "path";
import { Database } from "bun:sqlite";
import { runMigrations } from "../../db/migrations";
import { allMigrations } from "../../db/migrations/all";
import { AGENT_INSTRUCTIONS_CONTENT } from "../../content/agent-instructions";
import { SHIKIGAMI_DIR, DB_FILENAME } from "../../config/paths";

export interface InitOptions {
  projectRoot?: string;
  force?: boolean;
  yes?: boolean;
  noAgentDocs?: boolean;
}

export interface InitResult {
  success: boolean;
  dbPath?: string;
  error?: string;
  agentDocsModified?: string[];
  agentDocsCreated?: string[];
  agentDocsSkipped?: string[];
}

const SHIKIGAMI_SECTION = `

## Shikigami Task Management

This project uses Shikigami for AI agent task orchestration.
See .shikigami/AGENT_INSTRUCTIONS.md for the agent workflow guide.

Key commands:
- \`shiki ready --json\` - Get tasks ready to work on
- \`shiki agent-guide\` - View full agent workflow documentation
`;

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

    // Handle agent docs (AGENTS.md, CLAUDE.md)
    const agentDocsModified: string[] = [];
    const agentDocsCreated: string[] = [];
    const agentDocsSkipped: string[] = [];

    if (options.yes && !options.noAgentDocs) {
      const agentsPath = join(projectRoot, "AGENTS.md");
      const claudePath = join(projectRoot, "CLAUDE.md");

      // Process AGENTS.md (create if doesn't exist)
      if (existsSync(agentsPath)) {
        const content = readFileSync(agentsPath, "utf-8");
        if (content.toLowerCase().includes("shikigami")) {
          agentDocsSkipped.push("AGENTS.md");
        } else {
          writeFileSync(agentsPath, content + SHIKIGAMI_SECTION);
          agentDocsModified.push("AGENTS.md");
        }
      } else {
        writeFileSync(agentsPath, "# Agents" + SHIKIGAMI_SECTION);
        agentDocsCreated.push("AGENTS.md");
      }

      // Process CLAUDE.md (only if exists)
      if (existsSync(claudePath)) {
        const content = readFileSync(claudePath, "utf-8");
        if (content.toLowerCase().includes("shikigami")) {
          agentDocsSkipped.push("CLAUDE.md");
        } else {
          writeFileSync(claudePath, content + SHIKIGAMI_SECTION);
          agentDocsModified.push("CLAUDE.md");
        }
      }
    }

    return {
      success: true,
      dbPath,
      ...(agentDocsModified.length > 0 && { agentDocsModified }),
      ...(agentDocsCreated.length > 0 && { agentDocsCreated }),
      ...(agentDocsSkipped.length > 0 && { agentDocsSkipped }),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
