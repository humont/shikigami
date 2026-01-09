import { existsSync, mkdirSync, writeFileSync } from "fs";
import { join } from "path";

export interface PrdInitOptions {
  name: string;
  projectRoot?: string;
}

export interface PrdInitResult {
  success: boolean;
  prdId?: string;
  path?: string;
  error?: string;
}

/**
 * Validates the PRD name.
 * Accepts lowercase alphanumeric characters, hyphens, and underscores.
 */
function isValidPrdName(name: string): boolean {
  if (!name || name.length === 0) {
    return false;
  }
  // Only allow alphanumeric, hyphens, and underscores
  return /^[a-zA-Z0-9_-]+$/.test(name);
}

/**
 * Converts a hyphen/underscore separated name to Title Case.
 * e.g., "user-authentication" -> "User Authentication"
 */
function toTitleCase(name: string): string {
  return name
    .split(/[-_]/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

/**
 * Generates the PRD template content.
 */
function generateTemplate(title: string): string {
  return `# ${title}

## Overview

[Describe the feature or project here]

## Fuda

- [ ] [First task]
`;
}

/**
 * Initialize a new PRD file with a basic template.
 */
export async function runPrdInit(
  options: PrdInitOptions
): Promise<PrdInitResult> {
  const projectRoot = options.projectRoot || process.cwd();
  const shikiDir = join(projectRoot, ".shikigami");

  // Check if shiki is initialized
  if (!existsSync(shikiDir)) {
    return {
      success: false,
      error: "Shiki not initialized. Run 'shiki init' first.",
    };
  }

  // Validate name
  if (!isValidPrdName(options.name)) {
    return {
      success: false,
      error:
        "PRD name is invalid. Use only alphanumeric characters, hyphens, and underscores.",
    };
  }

  // Generate date prefix (YYYY-MM-DD)
  const today = new Date().toISOString().split("T")[0];
  const prdId = `${today}_${options.name}`;
  const filename = `${prdId}.md`;

  // Ensure prds directory exists
  const prdsDir = join(shikiDir, "prds");
  if (!existsSync(prdsDir)) {
    mkdirSync(prdsDir, { recursive: true });
  }

  // Check if file already exists
  const filePath = join(prdsDir, filename);
  if (existsSync(filePath)) {
    return {
      success: false,
      error: `PRD already exists: ${filename}`,
    };
  }

  // Generate template content
  const title = toTitleCase(options.name);
  const content = generateTemplate(title);

  // Write the file
  writeFileSync(filePath, content, "utf-8");

  return {
    success: true,
    prdId,
    path: filePath,
  };
}
