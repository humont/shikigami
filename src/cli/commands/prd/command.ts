import { Command } from "commander";
import { runPrdInit } from "./init";
import { runPrdList, type StatusBreakdown } from "./list";
import { runPrdShow, type PrdFudaSummary } from "./show";
import { output, outputError } from "../../../utils/output";

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

export function createPrdCommand(getJson: () => boolean): Command {
  const prd = new Command("prd").description("Manage PRD (Product Requirements Documents)");

  // prd init <name>
  prd
    .command("init <name>")
    .description("Create a new PRD file with today's date prefix")
    .action(async (name) => {
      const isJson = getJson();
      const result = await runPrdInit({ name });

      if (result.success) {
        if (isJson) {
          output(result, true);
        } else {
          console.log(`Created: ${result.path}`);
        }
      } else {
        outputError(result.error!, isJson);
        process.exit(1);
      }
    });

  // prd list
  prd
    .command("list")
    .description("List PRDs with fuda counts and status")
    .action(async () => {
      const isJson = getJson();
      const result = await runPrdList();

      if (result.success) {
        if (isJson) {
          output(result, true);
        } else {
          if (result.prds!.length === 0 && result.orphans!.length === 0) {
            console.log("No PRDs found.");
          } else {
            if (result.prds!.length > 0) {
              console.log("\nPRDs:");
              result.prds!.forEach((p) => {
                const summary = formatStatusSummary(p.statusBreakdown);
                console.log(`  ${colors.dim}${p.id}${colors.reset}  ${p.fudaCount} fuda ${summary}`);
              });
            }
            if (result.orphans!.length > 0) {
              console.log("\nOrphan references (no .md file):");
              result.orphans!.forEach((o) => {
                console.log(`  ${colors.yellow}${o.prdId}${colors.reset}  ${o.fudaCount} fuda`);
              });
            }
            console.log("");
          }
        }
      } else {
        outputError(result.error!, isJson);
        process.exit(1);
      }
    });

  // prd show <id>
  prd
    .command("show <id>")
    .description("Show PRD content and related fuda")
    .action(async (id) => {
      const isJson = getJson();
      const result = await runPrdShow({ id });

      if (result.success) {
        if (isJson) {
          output(result, true);
        } else {
          if (!result.fileExists) {
            console.log(`${colors.yellow}Warning: PRD file does not exist: ${result.path}${colors.reset}`);
            console.log("");
          }

          if (result.content) {
            console.log(result.content);
            console.log("");
          }

          if (result.fuda && result.fuda.length > 0) {
            console.log("Related Fuda:");
            result.fuda.forEach((f) => formatFudaSummary(f));
          } else {
            console.log("No fuda reference this PRD.");
          }
        }
      } else {
        outputError(result.error!, isJson);
        process.exit(1);
      }
    });

  return prd;
}

function formatStatusSummary(breakdown: StatusBreakdown): string {
  const parts: string[] = [];
  if (breakdown.done > 0) parts.push(`${breakdown.done} done`);
  if (breakdown.in_progress > 0) parts.push(`${breakdown.in_progress} in progress`);
  if (breakdown.in_review > 0) parts.push(`${breakdown.in_review} in review`);
  if (breakdown.ready > 0) parts.push(`${breakdown.ready} ready`);
  if (breakdown.blocked > 0) parts.push(`${breakdown.blocked} blocked`);
  if (breakdown.failed > 0) parts.push(`${breakdown.failed} failed`);

  if (parts.length === 0) return "";
  return `(${parts.join(", ")})`;
}

function formatFudaSummary(fuda: PrdFudaSummary): void {
  const statusColor = statusColors[fuda.status] || colors.reset;
  const statusPadded = `[${fuda.status}]`.padEnd(13);
  console.log(`  ${colors.dim}${fuda.id}${colors.reset}  ${statusColor}${statusPadded}${colors.reset}  "${fuda.title}"`);
}
