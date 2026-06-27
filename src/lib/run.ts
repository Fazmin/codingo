import { isTauri } from "./utils";

export interface RunResult {
  stdout: string;
  stderr: string;
  exit_code: number;
  duration_ms: number;
  error: string | null;
}

export async function runCode(
  language: "python" | "javascript",
  code: string,
): Promise<RunResult> {
  if (!isTauri()) {
    return {
      stdout: "",
      stderr: "",
      exit_code: -1,
      duration_ms: 0,
      error: "Code execution is only available in the desktop app.",
    };
  }
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<RunResult>("run_code", { language, code });
}

export interface ParsedError {
  message: string;
  line: number | null;
}

/** Best-effort extraction of an error message + line number from stderr. */
export function parseError(
  language: "python" | "javascript",
  stderr: string,
): ParsedError | null {
  if (!stderr.trim()) return null;

  if (language === "python") {
    const lineMatch = stderr.match(/line (\d+)/g);
    const line = lineMatch
      ? Number(lineMatch[lineMatch.length - 1].replace("line ", ""))
      : null;
    const lines = stderr.trim().split("\n");
    const last = lines[lines.length - 1] || stderr.trim();
    return { message: last.trim(), line };
  }

  // node
  const loc = stderr.match(/:(\d+):\d+/);
  const errLine = stderr
    .split("\n")
    .find((l) => /Error|Exception/.test(l));
  return {
    message: (errLine || stderr.split("\n")[0] || stderr).trim(),
    line: loc ? Number(loc[1]) : null,
  };
}
