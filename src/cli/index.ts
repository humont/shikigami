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
import { runLog } from "./commands/log";
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
  .action(async (options) => {
    const isJson = program.opts().json;
    const result = await runInit({ force: options.force });

    if (result.success) {
      output(isJson ? result : `Shiki initialized at ${result.dbPath}`, isJson);
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
  .action(async (id, options) => {
    const isJson = program.opts().json;
    const result = await runUpdate({
      id,
      status: options.status,
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
  .description("List all fuda")
  .option("-s, --status <status>", "Filter by status")
  .option("-l, --limit <number>", "Limit results")
  .action(async (options) => {
    const isJson = program.opts().json;
    const result = await runList({
      status: options.status,
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
  .command("log <id>")
  .description("View audit history for a fuda")
  .option("-l, --limit <number>", "Limit results")
  .action(async (id, options) => {
    const isJson = program.opts().json;
    const result = await runLog({
      id,
      limit: options.limit ? parseInt(options.limit, 10) : undefined,
    });

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
  return `  ${id} [p${fuda.priority}] ${fuda.title}`;
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

program.parse();
