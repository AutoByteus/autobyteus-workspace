/** CLI custom-agent `tools` is an allowlist, not a subtractive denylist.
 * This profile is pinned to the installed 1.2.11 CLI contract. Never reuse it
 * for another version without validating the provider's exposed tool names.
 */
const nativeTools1211 = [
  "view_file", "write_to_file", "replace_file_content", "grep_search",
  "list_dir", "find_by_name", "run_command", "generate_image",
] as const;


export type AgyNativeToolProfile = Readonly<{
  cliVersion: string;
  permittedNativeToolNames: readonly string[];
}>;

export const resolveAgyNativeToolProfile = (cliVersion: string): AgyNativeToolProfile => {
  if (cliVersion !== "1.2.11")
    throw new Error("AGY_NATIVE_TOOL_PROFILE_UNSUPPORTED: this Antigravity CLI version requires native-tool compatibility validation.");
  return { cliVersion, permittedNativeToolNames: nativeTools1211 };
};
