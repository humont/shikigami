#!/usr/bin/env bun
import { Command } from "commander";
import { runInitWithConfirmation } from "./commands/init";
import { runAdd } from "./commands/add";
import { runShow } from "./commands/show";
import { runRemove } from "./commands/remove";
import { runReady } from "./commands/ready";
import { runStatus } from "./commands/status";
import { createDepsCommand } from "./commands/deps";
import { createPrdCommand } from "./commands/prd/command";
import { runImport } from "./commands/import";
import { runList } from "./commands/list";
import { runUpdate } from "./commands/update";
import { runStart } from "./commands/start";
import { runFinish } from "./commands/finish";
import { runFail } from "./commands/fail";
import { runLog, runLogAll } from "./commands/log";
import { runLedger, runLedgerAdd } from "./commands/ledger";
import { runSearch } from "./commands/search";
import { runAgentGuide } from "./commands/agent-guide";
import { runUpgrade } from "./commands/upgrade";
import { runLore, runInteractiveLore, formatLoreList, formatLoreEntry } from "./commands/lore";
import { runTui } from "./commands/tui";
import { output, outputError } from "../utils/output";

// ANSI color codes
const colors = {
  reset: "\x1b[0m",
  dim: "\x1b[2m",
  bold: "\x1b[1m",
  gray: "\x1b[90m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  magenta: "\x1b[35m",
};

const statusColors: Record<string, string> = {
  blocked: colors.gray,
  ready: colors.cyan,
  in_progress: colors.yellow,
  in_review: colors.magenta,
  failed: colors.red,
  done: colors.green,
};

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
  .option("-y, --yes", "Auto-accept prompts (required for --force in non-interactive mode)")
  .option("--no-agent-docs", "Skip adding shikigami docs to AGENTS.md/CLAUDE.md")
  .action(async (options) => {
    const isJson = program.opts().json;

    // Create confirmation function using readline for interactive prompt
    const confirmFn = async (message: string): Promise<string> => {
      const readline = await import("readline");
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      return new Promise((resolve, reject) => {
        // Handle Ctrl+C
        rl.on("SIGINT", () => {
          rl.close();
          const error = new Error("User force closed the prompt");
          error.name = "ExitPromptError";
          reject(error);
        });

        process.stdout.write(message);
        rl.question("", (answer) => {
          rl.close();
          resolve(answer.trim());
        });
      });
    };

    const result = await runInitWithConfirmation({
      force: options.force,
      yes: options.yes,
      noAgentDocs: options.agentDocs === false,
      json: isJson,
      confirmFn,
    });

    if (result.cancelled) {
      // User pressed Ctrl+C, exit silently
      process.exit(1);
    }

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
  .option("-s, --spirit-type <type>", "Spirit type (prd, task, test, code, review; legacy: shikigami, tengu, kitsune)", "shikigami")
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
  .requiredOption("-s, --status <status>", "New status (blocked, ready, in_progress, in_review, failed, done)")
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

// Start command
program
  .command("start <id>")
  .description("Start working on a fuda (set status to in_progress)")
  .option("--assigned-spirit-id <spiritId>", "Assign a spirit to this fuda")
  .action(async (id, options) => {
    const isJson = program.opts().json;
    const result = await runStart({
      id,
      assignedSpiritId: options.assignedSpiritId,
    });

    if (result.success) {
      if (isJson) {
        output({ fuda: result.fuda, context: result.context }, true);
      } else {
        console.log(`Started working on fuda ${result.fuda!.id}`);
        if (result.context) {
          if (result.context.handoffs.length > 0) {
            console.log("\nHandoffs:");
            result.context.handoffs.forEach((h) => {
              console.log(`  ${colors.dim}${new Date(h.createdAt).toISOString()}${colors.reset} ${h.content}`);
            });
          }
          if (result.context.learnings.length > 0) {
            console.log("\nLearnings:");
            result.context.learnings.forEach((l) => {
              console.log(`  ${colors.dim}${new Date(l.createdAt).toISOString()}${colors.reset} ${l.content}`);
            });
          }
        }
      }
    } else {
      outputError(result.error!, isJson);
      process.exit(1);
    }
  });

// Finish command
program
  .command("finish <id>")
  .description("Mark a fuda as done (requires commit hash)")
  .requiredOption(
    "-c, --commit-hash <hash>",
    "Git commit hash for the completed work"
  )
  .option("-n, --notes <notes>", "Handoff notes for the next agent")
  .action(async (id, options) => {
    const isJson = program.opts().json;
    const result = await runFinish({
      id,
      commitHash: options.commitHash,
      notes: options.notes,
    });

    if (result.success) {
      if (isJson) {
        output(result, true);
      } else {
        console.log(`Finished fuda ${result.fuda!.id}`);
        if (result.ledgerEntry) {
          console.log(`Added handoff note to ledger`);
        }
        if (result.unblockedFuda && result.unblockedFuda.length > 0) {
          console.log("\nThe following tasks are now ready to work on:");
          for (const fuda of result.unblockedFuda) {
            console.log(`  ${fuda.id}  ${fuda.title}`);
          }
        }
      }
    } else {
      outputError(result.error!, isJson);
      process.exit(1);
    }
  });

// Fail command
program
  .command("fail <id>")
  .description("Mark a fuda as failed")
  .option("-r, --reason <reason>", "Reason for failure")
  .action(async (id, options) => {
    const isJson = program.opts().json;
    const result = await runFail({
      id,
      reason: options.reason,
    });

    if (result.success) {
      if (isJson) {
        output(result, true);
      } else {
        console.log(`Failed fuda ${result.fuda!.id}`);
        if (result.ledgerEntry) {
          console.log(`Added failure reason to ledger`);
        }
      }
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
          console.log("");
          let lastPriority: number | null = null;
          result.fudas!.forEach((f) => {
            // Add blank line between priority groups
            if (lastPriority !== null && f.priority !== lastPriority) {
              console.log("");
            }
            console.log(formatFudaSummary(f));
            lastPriority = f.priority;
          });
          console.log("");
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

// PRD subcommand
program.addCommand(createPrdCommand(() => program.opts().json));

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

// Ledger command
const ledgerCommand = new Command("ledger")
  .description("View and manage ledger entries for a fuda")
  .argument("<id>", "Fuda ID or prefix")
  .option("-t, --type <type>", "Filter by entry type (handoff, learning)")
  .action(async (id, options) => {
    const isJson = program.opts().json;
    const result = await runLedger({
      id,
      type: options.type,
    });

    if (result.success) {
      if (isJson) {
        output(result.entries, true);
      } else {
        if (result.entries!.length === 0) {
          console.log("No ledger entries found.");
        } else {
          console.log("Ledger entries:\n");
          result.entries!.forEach((e) => console.log(formatLedgerEntry(e)));
        }
      }
    } else {
      outputError(result.error!, isJson);
      process.exit(1);
    }
  });

ledgerCommand
  .command("add <fuda-id> <content>")
  .description("Add a ledger entry to a fuda")
  .option("-t, --type <type>", "Entry type (handoff, learning)", "learning")
  .action(async (fudaId, content, options) => {
    const isJson = program.opts().json;
    const result = await runLedgerAdd({
      id: fudaId,
      content,
      type: options.type,
    });

    if (result.success) {
      if (isJson) {
        output(result.entry, true);
      } else {
        console.log(`Added ${result.entry!.entryType} entry to fuda ${result.entry!.fudaId}`);
      }
    } else {
      outputError(result.error!, isJson);
      process.exit(1);
    }
  });

program.addCommand(ledgerCommand);

// Search command
program
  .command("search <query>")
  .description("Search fuda and ledger entries")
  .option("--fuda-only", "Search only fuda")
  .option("--ledger-only", "Search only ledger entries")
  .action(async (query, options) => {
    const isJson = program.opts().json;
    const result = await runSearch({
      query,
      fudaOnly: options.fudaOnly,
      ledgerOnly: options.ledgerOnly,
    });

    if (result.success) {
      if (isJson) {
        output(result, true);
      } else {
        const hasFuda = result.fuda && result.fuda.length > 0;
        const hasLedger = result.ledger && result.ledger.length > 0;

        if (!hasFuda && !hasLedger) {
          console.log("No results found.");
        } else {
          if (result.fuda && result.fuda.length > 0) {
            console.log("\nFuda:");
            result.fuda.forEach((f) => console.log(formatFudaSummary(f)));
          }
          if (result.ledger && result.ledger.length > 0) {
            console.log("\nLedger entries:");
            result.ledger.forEach((e) => console.log(formatSearchLedgerEntry(e)));
          }
          console.log("");
        }
      }
    } else {
      outputError(result.error!, isJson);
      process.exit(1);
    }
  });

function formatSearchLedgerEntry(entry: any): string {
  const timestamp = new Date(entry.createdAt).toISOString().split("T")[0];
  const typeLabel = entry.entryType === "handoff" ? "[handoff]" : "[learning]";
  const preview = entry.content.length > 60 ? entry.content.slice(0, 60) + "..." : entry.content;
  return `  ${colors.dim}${entry.id}${colors.reset}  ${colors.dim}${timestamp}${colors.reset}  ${colors.cyan}${typeLabel}${colors.reset}  ${colors.dim}fuda:${entry.fudaId.slice(0, 10)}${colors.reset}  ${preview}`;
}

function formatLedgerEntry(entry: any): string {
  const timestamp = new Date(entry.createdAt).toISOString();
  const typeLabel = entry.entryType === "handoff" ? "[handoff]" : "[learning]";
  return `  ${colors.dim}${timestamp}${colors.reset} ${colors.cyan}${typeLabel}${colors.reset} ${entry.content}`;
}

// Helper formatters
function formatFudaDetails(fuda: any): string {
  const lines = [
    `ID: ${fuda.id}`,
    `Title: ${fuda.title}`,
    `Description: ${fuda.description}`,
    `Status: ${fuda.status}`,
    `Spirit Type: ${fuda.spiritType}`,
    `Priority: ${fuda.priority}`,
    fuda.prdId ? `PRD: ${fuda.prdId}` : null,
    fuda.parentFudaId ? `Parent: ${fuda.parentFudaId}` : null,
    fuda.assignedSpiritId ? `Assigned: ${fuda.assignedSpiritId}` : null,
    fuda.outputCommitHash ? `Commit: ${fuda.outputCommitHash}` : null,
    `Created: ${fuda.createdAt}`,
    `Updated: ${fuda.updatedAt}`,
  ].filter(Boolean);

  // Add predecessor handoffs section
  if (fuda.predecessorHandoffs && fuda.predecessorHandoffs.length > 0) {
    lines.push("");
    lines.push("Predecessor Handoffs:");
    for (const handoff of fuda.predecessorHandoffs) {
      lines.push(`  From: ${handoff.sourceFudaTitle} (${handoff.sourceFudaId})`);
      lines.push(`    ${handoff.content}`);
    }
  }

  // Add ledger entries section
  if (fuda.entries && fuda.entries.length > 0) {
    lines.push("");
    lines.push("Ledger Entries:");
    for (const entry of fuda.entries) {
      const typeLabel = entry.entryType === "handoff" ? "Handoff" : "Learning";
      lines.push(`  [${typeLabel}] ${entry.content}`);
    }
  }

  return lines.join("\n");
}

function formatFudaSummary(fuda: any): string {
  const id = fuda.id;
  const statusColor = statusColors[fuda.status] || colors.reset;
  // Pad status to 11 chars (length of "in_progress")
  const statusPadded = fuda.status.padEnd(11);
  const statusLabel = `${statusColor}${statusPadded}${colors.reset}`;
  const priorityLabel = `${colors.dim}p${fuda.priority}${colors.reset}`;
  const prdLabel = fuda.prdId ? `  ${colors.dim}[${fuda.prdId}]${colors.reset}` : "";
  return `  ${colors.dim}${id}${colors.reset}  ${statusLabel}  ${priorityLabel}  ${fuda.title}${prdLabel}`;
}

function formatStatus(status: any): string {
  const lines = [
    "Fuda Status:",
    `  Blocked: ${status.blocked}`,
    `  Ready: ${status.ready}`,
    `  In Progress: ${status.inProgress}`,
    `  In Review: ${status.inReview}`,
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

// TUI command
program
  .command("tui")
  .description("Launch the interactive TUI")
  .action(async () => {
    const result = await runTui();

    if (!result.success) {
      outputError(result.error!, program.opts().json);
      process.exit(1);
    }
  });

program.parse();
