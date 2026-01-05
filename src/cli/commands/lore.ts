import { LORE_ENTRIES, findLoreEntry, type LoreEntry } from "../../content/lore";

export interface LoreOptions {
  term?: string;
}

export interface LoreResult {
  success: boolean;
  entries?: LoreEntry[];
  entry?: LoreEntry;
  error?: string;
}

export async function runLore(options: LoreOptions): Promise<LoreResult> {
  if (options.term) {
    const entry = findLoreEntry(options.term);
    if (!entry) {
      return {
        success: false,
        error: `Unknown term: "${options.term}". Run 'shiki lore' to see all available terms.`,
      };
    }
    return {
      success: true,
      entry,
    };
  }

  return {
    success: true,
    entries: LORE_ENTRIES,
  };
}

export function formatLoreList(entries: LoreEntry[]): string {
  const byCategory = entries.reduce(
    (acc, entry) => {
      if (!acc[entry.category]) acc[entry.category] = [];
      acc[entry.category].push(entry);
      return acc;
    },
    {} as Record<string, LoreEntry[]>
  );

  const categoryTitles: Record<string, string> = {
    spirits: "Spirits of the Realm",
    artifacts: "Sacred Artifacts",
  };

  const categoryOrder = ["spirits", "artifacts"];

  const lines: string[] = [
    "The Lore of Shikigami",
    "".padEnd(40, "─"),
    "",
  ];

  for (const category of categoryOrder) {
    const categoryEntries = byCategory[category];
    if (!categoryEntries) continue;

    lines.push(`${categoryTitles[category]}`);
    lines.push("");

    for (const entry of categoryEntries) {
      const aliases = entry.aliases ? ` (${entry.aliases.join(", ")})` : "";
      lines.push(`  ${entry.term}${aliases}`);
      lines.push(`    ${entry.brief}`);
    }

    lines.push("");
  }

  lines.push("─".repeat(40));
  lines.push("Run 'shiki lore <term>' to read the full tale.");

  return lines.join("\n");
}

export function formatLoreEntry(entry: LoreEntry): string {
  const lines: string[] = [
    `${entry.term.toUpperCase()}`,
    "".padEnd(entry.term.length, "═"),
    "",
    `"${entry.brief}"`,
    "",
    entry.lore,
    "",
    "─".repeat(40),
    `Category: ${entry.category}`,
  ];

  if (entry.aliases?.length) {
    lines.push(`Also known as: ${entry.aliases.join(", ")}`);
  }

  return lines.join("\n");
}
