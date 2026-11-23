/**
 * CLI custom-agent `tools` is an allowlist, not a subtractive denylist.
 * These are the CLI's own registry names (the `tools` of its start message, checked live on agy 1.5.15). The CLI shows the model
 * `read_file`, `write_file` and `edit_file` for `view_file`, `write_to_file` and `replace_file_content`; a list that names both a
 * name and its alias does not start ("tool name conflict"), so the aliases are never listed (autobyteus-588).
 * Never lists collaboration, subagent, messaging, browser or MCP tools: those come from the run's own authorities.
 */
export const AGY_NATIVE_TOOL_NAMES = [
  "view_file", "write_to_file", "replace_file_content", "grep_search",
  "list_dir", "find_by_name", "run_command", "generate_image",
] as const;

/**
 * Names of the allowlist the CLI's start message does not list in its `tools` registry: a rename in a newer CLI. Empty when the message
 * carries no `tools` array (nothing to compare), so it never reports what it cannot know.
 */
export const agyNativeToolsMissingFromRegistry = (registry: unknown): string[] =>
  Array.isArray(registry) ? AGY_NATIVE_TOOL_NAMES.filter((name) => !registry.includes(name)) : [];
