import { join } from "path";

export interface RunCliResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

export interface RunCliOptions {
  /** Working directory for the CLI process. Defaults to process.cwd() */
  cwd?: string;
  /** String to pipe to stdin */
  stdin?: string;
}

/**
 * Spawns the CLI as a subprocess and returns the result.
 * Use this for integration tests that need to test the full CLI experience.
 *
 * @param args - CLI arguments (e.g., ["init", "--force"])
 * @param options - Optional cwd and stdin
 * @returns Promise with exitCode, stdout, and stderr
 */
export async function runCli(
  args: string[],
  options?: RunCliOptions
): Promise<RunCliResult> {
  const cliPath = join(process.cwd(), "src/cli/index.ts");

  const proc = Bun.spawn(["bun", "run", cliPath, ...args], {
    cwd: options?.cwd,
    stdin: options?.stdin !== undefined ? "pipe" : undefined,
    stdout: "pipe",
    stderr: "pipe",
  });

  if (options?.stdin !== undefined) {
    proc.stdin.write(options.stdin);
    proc.stdin.end();
  }

  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);

  return { exitCode, stdout, stderr };
}
