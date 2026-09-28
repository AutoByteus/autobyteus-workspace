/** CLI custom-agent `tools` is an allowlist, not a subtractive denylist. */
export const AGY_NATIVE_TOOL_NAMES = [
  "view_file", "write_to_file", "replace_file_content", "grep_search",
  "list_dir", "find_by_name", "run_command", "generate_image",
] as const;
