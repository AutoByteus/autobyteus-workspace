import { plainReadPath } from "../plain-read.js";
import type { RecordedCall } from "./runtime-translation.js";

/**
 * Antigravity reads `<home>/.gemini/antigravity-cli/mcp/<server>/<tool>.json` (and the server's `instructions.md`) before each lazy
 * MCP tool: it is the runtime's own plumbing, not the agent's work (autobyteus-560). The path is matched after backslashes are
 * normalized; a repository's own `mcp/<x>/<y>.json` (outside `.gemini/antigravity*`), a nested file or any other file does not match.
 */
const SCHEMA_PATH = /(?:^|\/)\.gemini\/antigravity[^/]*\/mcp\/[^/]+\/(?:[^/]+\.json|instructions\.md)$/;

const text = (value: unknown): string | null => typeof value === "string" && value.trim() ? value : null;

/** The one path a read-only call names: `read_file {Path}`, `view_file {AbsolutePath}`, or a plain shell read; else null. */
const readPath = (call: RecordedCall): string | null => {
  switch (call.name) {
    case "read_file": return text(call.args.Path);
    case "view_file": return text(call.args.AbsolutePath);
    case "run_command": {
      const command = text(call.args.CommandLine);
      return command === null ? null : plainReadPath(command);
    }
    case "Bash": {
      const command = text(call.args.command);
      return command === null ? null : plainReadPath(command);
    }
    default: return null;
  }
};

/** True when the recorded call reads exactly one Antigravity MCP schema file. */
export const isAntigravityMcpSchemaRead = (call: RecordedCall): boolean => {
  const path = readPath(call);
  return path !== null && SCHEMA_PATH.test(path.replace(/\\/g, "/"));
};
