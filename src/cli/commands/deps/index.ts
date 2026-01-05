import { Command } from "commander";
import { runDepsTree } from "./tree";
import { runDepsBlocked } from "./blocked";
import { runDepsAdd } from "./add";
import { runDepsRemove } from "./remove";
import { output, outputError } from "../../../utils/output";

export function createDepsCommand(getJson: () => boolean): Command {
  const deps = new Command("deps").description("Manage fuda dependencies");

  // deps tree <id>
  deps
    .command("tree <id>")
    .description("Show dependency tree for a fuda")
    .option("-d, --depth <number>", "Maximum depth to display", "5")
    .action(async (id, options) => {
      const isJson = getJson();
      const result = await runDepsTree({
        id,
        depth: parseInt(options.depth, 10),
      });

      if (result.success) {
        if (isJson) {
          output(result.tree, true);
        } else {
          console.log(formatTree(result.tree!, id));
        }
      } else {
        outputError(result.error!, isJson);
        process.exit(1);
      }
    });

  // deps blocked <id>
  deps
    .command("blocked <id>")
    .description("Show what's blocking a fuda")
    .action(async (id) => {
      const isJson = getJson();
      const result = await runDepsBlocked({ id });

      if (result.success) {
        if (isJson) {
          output(result.blocking, true);
        } else {
          if (result.blocking!.length === 0) {
            console.log("No blockers found.");
          } else {
            console.log("Blocked by:");
            result.blocking!.forEach((b) => {
              console.log(`  ${b.id} [${b.status}] ${b.title}`);
            });
          }
        }
      } else {
        outputError(result.error!, isJson);
        process.exit(1);
      }
    });

  // deps add <fuda-id> <depends-on-id>
  deps
    .command("add <fuda-id> <depends-on-id>")
    .description("Add a dependency")
    .option("-t, --type <type>", "Dependency type", "blocks")
    .action(async (fudaId, dependsOnId, options) => {
      const isJson = getJson();
      const result = await runDepsAdd({
        fudaId,
        dependsOnId,
        type: options.type,
      });

      if (result.success) {
        output(
          isJson
            ? { success: true, fudaId: result.fudaId, dependsOnId: result.dependsOnId }
            : `Added dependency: ${result.fudaId} -> ${result.dependsOnId}`,
          isJson
        );
      } else {
        outputError(result.error!, isJson);
        process.exit(1);
      }
    });

  // deps remove <fuda-id> <depends-on-id>
  deps
    .command("remove <fuda-id> <depends-on-id>")
    .description("Remove a dependency")
    .action(async (fudaId, dependsOnId) => {
      const isJson = getJson();
      const result = await runDepsRemove({ fudaId, dependsOnId });

      if (result.success) {
        output(
          isJson
            ? { success: true }
            : `Removed dependency: ${fudaId} -> ${dependsOnId}`,
          isJson
        );
      } else {
        outputError(result.error!, isJson);
        process.exit(1);
      }
    });

  return deps;
}

function formatTree(tree: Record<string, any[]>, rootId: string, indent = 0): string {
  const lines: string[] = [];
  const deps = tree[rootId] ?? [];

  if (indent === 0) {
    lines.push(rootId);
  }

  for (const dep of deps) {
    const prefix = "  ".repeat(indent + 1) + "└─ ";
    lines.push(`${prefix}${dep.dependsOnId} [${dep.type}]`);

    if (tree[dep.dependsOnId]) {
      lines.push(formatTree(tree, dep.dependsOnId, indent + 1));
    }
  }

  return lines.join("\n");
}
