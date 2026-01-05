#!/usr/bin/env bun
import { Command } from "commander";
import { runInit } from "./commands/init";
import { runAdd } from "./commands/add";
import { runShow } from "./commands/show";
import { runRemove } from "./commands/remove";
import { runReady } from "./commands/ready";
import { runStatus } from "./commands/status";
import { createDepsCommand } from "./commands/deps";
import { runImport } from "./commands/import";
import { runList } from "./commands/list";
import { runUpdate } from "./commands/update";
import { runLog, runLogAll } from "./commands/log";
import { runAgentGuide } from "./commands/agent-guide";
import { runUpgrade } from "./commands/upgrade";
import { runLore, runInteractiveLore, formatLoreList, formatLoreEntry } from "./commands/lore";
import { output, outputError } from "../utils/output";

const program = new Command();

program
  .name("shiki")
  .description("Fuda task management system for AI spirits")
  .version("0.1.0");

// Global options
program.option("--json", "Output in JSON format");

// Init command
program
  .command("init")
  .description("Initialize shiki in the current project")
  .option("-f, --force", "Overwrite existing database")
  .option("-y, --yes", "Auto-accept adding shikigami docs to AGENTS.md/CLAUDE.md")
  .option("--no-agent-docs", "Skip adding shikigami docs to AGENTS.md/CLAUDE.md")
  .action(async (options) => {
    const isJson = program.opts().json;
    const result = await runInit({
      force: options.force,
      yes: options.yes,
      noAgentDocs: options.agentDocs === false,
    });

    if (result.success) {
      if (isJson) {
        output(result, isJson);
      } else {
        let message = `Shiki initialized at ${result.dbPath}`;
        if (result.agentDocsCreated?.length) {
          message += `\nCreated: ${result.agentDocsCreated.join(", ")}`;
        }
        if (result.agentDocsModified?.length) {
          message += `\nModified: ${result.agentDocsModified.join(", ")}`;
        }
        if (result.agentDocsSkipped?.length) {
          message += `\nSkipped (already has shikigami): ${result.agentDocsSkipped.join(", ")}`;
        }
        output(message, isJson);
      }
    } else {
      outputError(result.error!, isJson);
      process.exit(1);
    }
  });

// Add command
program
  .command("add")
  .description("Create a new fuda")
  .requiredOption("-t, --title <title>", "Fuda title")
  .requiredOption("-d, --description <description>", "Fuda description")
  .option("-s, --spirit-type <type>", "Spirit type (shikigami, tengu, kitsune)", "shikigami")
  .option("-p, --priority <number>", "Priority (higher = more important)", "0")
  .option("--depends-on <ids>", "Comma-separated IDs of dependencies")
  .option("--dep-type <type>", "Dependency type (blocks, parent-child, related, discovered-from)", "blocks")
  .option("--prd <id>", "Parent PRD ID")
  .option("--parent <id>", "Parent fuda ID")
  .action(async (options) => {
    const isJson = program.opts().json;
    const result = await runAdd({
      title: options.title,
      description: options.description,
      spiritType: options.spiritType,
      priority: parseInt(options.priority, 10),
      dependsOn: options.dependsOn?.split(",").map((s: string) => s.trim()),
      depType: options.depType,
      prdId: options.prd,
      parentFudaId: options.parent,
    });

    if (result.success) {
      output(isJson ? result.fuda : `Created fuda ${result.fuda!.id}`, isJson);
    } else {
      outputError(result.error!, isJson);
      process.exit(1);
    }
  });

// Show command
program
  .command("show <id>")
  .description("Show fuda details")
  .action(async (id) => {
    const isJson = program.opts().json;
    const result = await runShow({ id });

    if (result.success) {
      output(isJson ? result.fuda : formatFudaDetails(result.fuda!), isJson);
    } else {
      outputError(result.error!, isJson);
      process.exit(1);
    }
  });

// Remove command
program
  .command("remove <id>")
  .description("Remove a fuda (soft delete)")
  .option("-f, --force", "Skip confirmation")
  .option("--reason <reason>", "Reason for deletion")
  .action(async (id, options) => {
    const isJson = program.opts().json;
    const result = await runRemove({
      id,
      reason: options.reason,
    });

    if (result.success) {
      output(isJson ? { success: true, id } : `Removed fuda ${id}`, isJson);
    } else {
      outputError(result.error!, isJson);
      process.exit(1);
    }
  });

// Update command
program
  .command("update <id>")
  .description("Update a fuda's status")
  .requiredOption("-s, --status <status>", "New status (pending, ready, in_progress, in_review, blocked, failed, done)")
  .option("--assigned-spirit-id <spiritId>", "Assign a spirit to this fuda (empty string to clear)")
  .action(async (id, options) => {
    const isJson = program.opts().json;
    const result = await runUpdate({
      id,
      status: options.status,
      assignedSpiritId: options.assignedSpiritId,
    });

    if (result.success) {
      output(isJson ? result.fuda : `Updated fuda ${result.fuda!.id} to status '${result.fuda!.status}'`, isJson);
    } else {
      outputError(result.error!, isJson);
      process.exit(1);
    }
  });

// Ready command
program
  .command("ready")
  .description("List fuda ready to work on")
  .option("-l, --limit <number>", "Limit results")
  .option("-a, --all", "Show all ready fuda (no limit)")
  .action(async (options) => {
    const isJson = program.opts().json;
    const limit = options.all ? undefined : options.limit ? parseInt(options.limit, 10) : 10;
    const result = await runReady({ limit });

    if (result.success) {
      if (isJson) {
        output(result.fudas, true);
      } else {
        if (result.fudas!.length === 0) {
          console.log("No fuda ready to work on.");
        } else {
          console.log("Ready fuda:\n");
          result.fudas!.forEach((f) => console.log(formatFudaSummary(f)));
        }
      }
    } else {
      outputError(result.error!, isJson);
      process.exit(1);
    }
  });

// List command
program
  .command("list")
  .description("List fuda (excludes done/failed by default)")
  .option("-s, --status <status>", "Filter by status")
  .option("-a, --all", "Include done and failed fuda")
  .option("-l, --limit <number>", "Limit results")
  .action(async (options) => {
    const isJson = program.opts().json;
    const result = await runList({
      status: options.status,
      all: options.all,
      limit: options.limit ? parseInt(options.limit, 10) : undefined,
    });

    if (result.success) {
      if (isJson) {
        output(result.fudas, true);
      } else {
        if (result.fudas!.length === 0) {
          console.log("No fuda found.");
        } else {
          console.log("Fuda:\n");
          result.fudas!.forEach((f) => console.log(formatFudaSummary(f)));
        }
      }
    } else {
      outputError(result.error!, isJson);
      process.exit(1);
    }
  });

// Status command
program
  .command("status")
  .description("Show current system status")
  .action(async () => {
    const isJson = program.opts().json;
    const result = await runStatus();

    if (result.success) {
      output(isJson ? result.status : formatStatus(result.status!), isJson);
    } else {
      outputError(result.error!, isJson);
      process.exit(1);
    }
  });

// Deps subcommand
program.addCommand(createDepsCommand(() => program.opts().json));

// Import command
program
  .command("import [file]")
  .description("Import fuda from JSON file or stdin")
  .option("--dry-run", "Preview without making changes")
  .option("--stdin", "Read JSON from stdin instead of file")
  .action(async (file, options) => {
    const isJson = program.opts().json;

    let stdinContent: string | undefined;
    if (options.stdin) {
      // Read from stdin
      const chunks: Buffer[] = [];
      for await (const chunk of process.stdin) {
        chunks.push(chunk);
      }
      stdinContent = Buffer.concat(chunks).toString("utf-8");
    }

    const result = await runImport({
      file,
      stdin: stdinContent,
      dryRun: options.dryRun,
    });

    if (result.success) {
      output(isJson ? result : `Imported ${result.count} fuda`, isJson);
    } else {
      outputError(result.error!, isJson);
      process.exit(1);
    }
  });

// Log command
program
  .command("log [id]")
  .description("View audit history (all entries or for a specific fuda)")
  .option("-l, --limit <number>", "Limit results")
  .action(async (id, options) => {
    const isJson = program.opts().json;
    const limit = options.limit ? parseInt(options.limit, 10) : undefined;

    const result = id
      ? await runLog({ id, limit })
      : await runLogAll({ limit });

    if (result.success) {
      if (isJson) {
        output(result.entries, true);
      } else {
        if (result.entries!.length === 0) {
          console.log("No audit entries found.");
        } else {
          console.log("Audit history:\n");
          result.entries!.forEach((e) => console.log(formatAuditEntry(e)));
        }
      }
    } else {
      outputError(result.error!, isJson);
      process.exit(1);
    }
  });

// Helper formatters
function formatFudaDetails(fuda: any): string {
  const lines = [
    `ID: ${fuda.id}`,
    fuda.displayId ? `Display ID: ${fuda.displayId}` : null,
    `Title: ${fuda.title}`,
    `Description: ${fuda.description}`,
    `Status: ${fuda.status}`,
    `Spirit Type: ${fuda.spiritType}`,
    `Priority: ${fuda.priority}`,
    fuda.prdId ? `PRD: ${fuda.prdId}` : null,
    fuda.parentFudaId ? `Parent: ${fuda.parentFudaId}` : null,
    fuda.assignedSpiritId ? `Assigned: ${fuda.assignedSpiritId}` : null,
    `Created: ${fuda.createdAt}`,
    `Updated: ${fuda.updatedAt}`,
  ].filter(Boolean);

  return lines.join("\n");
}

function formatFudaSummary(fuda: any): string {
  const id = fuda.displayId ? `${fuda.id} (${fuda.displayId})` : fuda.id;
  return `  ${id} [${fuda.status}|p${fuda.priority}] ${fuda.title}`;
}

function formatStatus(status: any): string {
  const lines = [
    "Fuda Status:",
    `  Pending: ${status.pending}`,
    `  Ready: ${status.ready}`,
    `  In Progress: ${status.inProgress}`,
    `  In Review: ${status.inReview}`,
    `  Blocked: ${status.blocked}`,
    `  Failed: ${status.failed}`,
    `  Done: ${status.done}`,
    `  Total: ${status.total}`,
  ];
  return lines.join("\n");
}

function formatAuditEntry(entry: any): string {
  const timestamp = new Date(entry.timestamp).toISOString();
  let details = `[${timestamp}] ${entry.operation} by ${entry.actor}`;
  if (entry.field) {
    details += ` - ${entry.field}: ${entry.oldValue ?? "(none)"} -> ${entry.newValue ?? "(none)"}`;
  }
  return `  ${details}`;
}

// Agent guide command
program
  .command("agent-guide")
  .description("Output workflow instructions for AI agents")
  .action(async () => {
    const isJson = program.opts().json;
    const result = await runAgentGuide({ json: isJson });

    if (result.success) {
      if (isJson) {
        output(result.structured, true);
      } else {
        console.log(result.content);
      }
    } else {
      outputError(result.error!, isJson);
      process.exit(1);
    }
  });

// Upgrade command
program
  .command("upgrade")
  .description("Upgrade shiki to the latest version")
  .option("-c, --check", "Check for updates without installing")
  .option("-f, --force", "Force upgrade even if already on latest")
  .action(async (options) => {
    const isJson = program.opts().json;
    const result = await runUpgrade({
      check: options.check,
      force: options.force,
    });

    if (result.success) {
      if (isJson) {
        output(result, true);
      } else {
        console.log(result.message);
        if (result.currentVersion && result.latestVersion) {
          console.log(`  Current: ${result.currentVersion}`);
          console.log(`  Latest:  ${result.latestVersion}`);
        }
      }
    } else {
      outputError(result.error!, isJson);
      process.exit(1);
    }
  });

// Lore command
program
  .command("lore [term]")
  .description("Explore the mythology behind Shikigami's naming")
  .option("-i, --interactive", "Browse terms interactively")
  .action(async (term, options) => {
    const isJson = program.opts().json;

    if (options.interactive && !isJson) {
      // Interactive mode - show list and prompt for selection
      const { LORE_ENTRIES } = await import("../content/lore");
      const { select } = await import("@inquirer/prompts");

      const choices = LORE_ENTRIES.map((entry) => ({
        name: `${entry.term} - ${entry.brief}`,
        value: entry.term,
      }));

      const result = await runInteractiveLore(() =>
        select({
          message: "Choose a term to learn its lore:",
          choices,
        })
      );

      if (result.cancelled) {
        // User pressed Ctrl+C, exit silently
        return;
      }

      if (result.error) {
        outputError(result.error, false);
        process.exit(1);
      }

      if (result.entry) {
        console.log("\n" + formatLoreEntry(result.entry));
      }
      return;
    }

    const result = await runLore({ term });

    if (result.success) {
      if (isJson) {
        output(result.entry || result.entries, true);
      } else if (result.entry) {
        console.log(formatLoreEntry(result.entry));
      } else {
        console.log(formatLoreList(result.entries!));
      }
    } else {
      outputError(result.error!, isJson);
      process.exit(1);
    }
  });

program.parse();
