/** Metadata initialization only, never a model turn or a fallback publisher. */
export async function validateClaudePrivateSkills(query: unknown, expectedNames: readonly string[]): Promise<void> {
  const control = query as { supportedCommands?: () => Promise<Array<{ name: string }>> } | null;
  if (typeof control?.supportedCommands !== "function") throw new Error("CLAUDE_PRIVATE_SKILLS_UNSUPPORTED: Native command discovery is unavailable.");
  const commands = await control.supportedCommands();
  const missing = expectedNames.filter(name => !commands.some(command => command.name === name));
  if (missing.length) throw new Error(`CLAUDE_PRIVATE_SKILLS_UNAVAILABLE: ${missing.join(", ")}. No shared-project or copied fallback.`);
}
