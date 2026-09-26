/** CLI custom-agent `tools` is an allowlist, not a subtractive denylist.
 * This profile is pinned to the installed 1.2.11 CLI contract. Never reuse it
 * for another version without validating the provider's exposed tool names.
 */
const nativeTools1211 = [
  "ask_custom_permission", "ask_permission", "ask_question",
  "browser_click_element", "browser_drag_pixel_to_pixel", "browser_get_dom",
  "browser_get_network_request", "browser_input", "browser_list_network_requests",
  "browser_mouse_down", "browser_mouse_up", "browser_move_mouse", "browser_press_key",
  "browser_refresh_page", "browser_resize_window", "browser_scroll", "browser_scroll_dom",
  "browser_select_option", "capture_browser_console_logs", "capture_browser_screenshot",
  "click_browser_pixel", "command_status", "delete_knowledge", "execute_browser_javascript",
  "find_by_name", "finish", "generate_image", "grep_search", "list_browser_pages",
  "list_dir", "list_permissions", "list_resources", "multi_replace_file_content",
  "notebook_edit", "notebook_execution", "open_browser_url", "read_browser_page",
  "read_resource", "read_url_content", "replace_file_content", "run_command",
  "schedule", "search_web", "sed_file", "send_command_input", "view_file", "wait",
  "wait_5_seconds", "write_to_file",
] as const;

const forbidden = /^(?:browser_subagent|define_subagent|invoke_subagent|manage_inbox|manage_subagents|manage_task|send_message|call_mcp_tool)$/;

export type AgyNativeToolProfile = Readonly<{
  cliVersion: string;
  permittedNativeToolNames: readonly string[];
}>;

export const resolveAgyNativeToolProfile = (cliVersion: string): AgyNativeToolProfile => {
  if (cliVersion !== "1.2.11")
    throw new Error("AGY_NATIVE_TOOL_PROFILE_UNSUPPORTED: this Antigravity CLI version requires native-tool compatibility validation.");
  if (nativeTools1211.some((name) => forbidden.test(name))) throw new Error("AGY_NATIVE_TOOL_PROFILE_INVALID");
  return { cliVersion, permittedNativeToolNames: nativeTools1211 };
};
