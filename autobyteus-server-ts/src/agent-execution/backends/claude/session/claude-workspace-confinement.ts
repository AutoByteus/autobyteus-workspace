import fs from "node:fs";
import path from "node:path";

/** Claude Code's shell tools: removed from a confined run's session (a bare-name `disallowedTools` entry removes a tool). */
export const CLAUDE_SHELL_TOOL_NAMES = ["Bash", "BashOutput", "KillShell"] as const;

/** Claude Code's file-writing tools and the input field that names the file each writes. */
const CLAUDE_FILE_WRITE_TOOL_PATH_FIELDS: Readonly<Record<string, string>> = Object.freeze({
  Write: "file_path",
  Edit: "file_path",
  MultiEdit: "file_path",
  NotebookEdit: "notebook_path",
});

/** The hook answer the SDK reads: deny this tool use, with why (shown to the agent). */
type PreToolUseDecision = Readonly<{
  hookSpecificOutput: Readonly<{ hookEventName: "PreToolUse"; permissionDecision: "deny"; permissionDecisionReason: string }>;
}>;

/** The options a confined Claude session adds to its SDK query (autobyteus-32 REQ-003, AR-002). */
export type ClaudeWorkspaceConfinement = Readonly<{
  /** Only the user's own settings: the workspace's `.claude/settings*.json` would be writable by the agent itself. */
  settingSources: readonly ["user"];
  disallowedTools: readonly string[];
  hooks: Readonly<{ PreToolUse: readonly Readonly<{ hooks: readonly ((input: unknown) => Promise<PreToolUseDecision | Record<string, never>>)[] }>[] }>;
}>;

/** The real path of `target`, resolving symbolic links of its nearest existing folder (a new file has none of its own). */
const realPathOf = (target: string): string => {
  const missing: string[] = [];
  let current = target;
  for (;;) {
    try {
      return path.join(fs.realpathSync(current), ...missing.reverse());
    } catch {
      const parent = path.dirname(current);
      if (parent === current) return target;
      missing.push(path.basename(current));
      current = parent;
    }
  }
};

/** True when `filePath` (relative to the workspace, or absolute) resolves inside `workspaceRoot`. */
export const isInsideWorkspace = (workspaceRoot: string, filePath: string): boolean => {
  const root = realPathOf(path.resolve(workspaceRoot));
  const resolved = realPathOf(path.resolve(root, filePath));
  return resolved === root || resolved.startsWith(`${root}${path.sep}`);
};

/**
 * A `PreToolUse` hook that denies a file write whose path resolves outside the workspace. Hooks run before allow rules
 * (including a user-level allow rule for Write) and a hook deny applies in every permission mode, so it cannot be
 * bypassed by settings. Every other tool use is left to the normal rules.
 */
export const workspaceWriteHook = (workspaceRoot: string) =>
  async (input: unknown): Promise<PreToolUseDecision | Record<string, never>> => {
    const { tool_name: toolName, tool_input: toolInput } = (input ?? {}) as { tool_name?: unknown; tool_input?: unknown };
    const field = typeof toolName === "string" ? CLAUDE_FILE_WRITE_TOOL_PATH_FIELDS[toolName] : undefined;
    if (!field) return {};
    const target = (toolInput as Record<string, unknown> | null)?.[field];
    if (typeof target === "string" && target.trim() && isInsideWorkspace(workspaceRoot, target)) return {};
    return {
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "deny",
        permissionDecisionReason: `This agent can write files only inside its workspace (${workspaceRoot}).`,
      },
    };
  };

/** The session options of a run confined to `workspaceRoot`. */
export const buildClaudeWorkspaceConfinement = (workspaceRoot: string): ClaudeWorkspaceConfinement => Object.freeze({
  settingSources: ["user"] as const,
  disallowedTools: Object.freeze([...CLAUDE_SHELL_TOOL_NAMES]),
  hooks: Object.freeze({ PreToolUse: Object.freeze([Object.freeze({ hooks: Object.freeze([workspaceWriteHook(workspaceRoot)]) })]) }),
});
