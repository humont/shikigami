import { run } from "../../tui/index";

interface TuiResult {
  success: boolean;
  instance?: ReturnType<typeof run>;
  error?: string;
}

export async function runTui(): Promise<TuiResult> {
  try {
    const instance = run();
    return { success: true, instance };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to launch TUI",
    };
  }
}
