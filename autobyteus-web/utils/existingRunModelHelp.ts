/** Presentation copy only; the server owns replacement eligibility. */
export const existingRunModelHelpKey = (runtimeKind: string | null | undefined): string => {
  if (runtimeKind === 'autobyteus') return 'workspace.runModelConfig.nativeModelHelp'
  if (runtimeKind === 'claude_agent_sdk' || runtimeKind === 'codex_app_server' || runtimeKind === 'antigravity_cli')
    return 'workspace.runModelConfig.externalModelHelp'
  return 'workspace.runModelConfig.unknownModelHelp'
}
