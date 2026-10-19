export type E2eConfiguredAgentExecution = {
  memberAddress: string;
  memberName: string;
  agentRunId: string;
  workspaceRootPath: string | null;
  platformAgentRunId: string | null;
  runtimeKind: string | null;
  llmModelIdentifier: string | null;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);

/**
 * Lists configured agent executions from the current public Team execution
 * tree. Deliberately does not decode retired compatibility projections.
 */
export const flattenE2eConfiguredAgentExecutions = (
  executionTree: Record<string, unknown>,
): E2eConfiguredAgentExecution[] => {
  // The public tree carries no schema version (REQ-018); its shape identifies it.
  const rootTeam = isRecord(executionTree.root_team)
    ? executionTree.root_team
    : null;
  if (!rootTeam) {
    return [];
  }

  const flattened: E2eConfiguredAgentExecution[] = [];
  // Teams are flat: every configured member is an Agent.
  for (const member of Array.isArray(rootTeam.members) ? rootTeam.members : []) {
    if (
      !isRecord(member) ||
      typeof member.address !== "string" ||
      member.kind !== "configured_agent" ||
      typeof member.agent_run_id !== "string"
    ) {
      continue;
    }
    const segments = member.address.split("/").filter(Boolean);
    const launchConfiguration = isRecord(member.launch_configuration)
      ? member.launch_configuration
      : null;
    flattened.push({
      memberAddress: member.address,
      memberName: segments.at(-1) ?? member.address,
      agentRunId: member.agent_run_id,
      platformAgentRunId:
        typeof member.platform_agent_run_id === "string"
          ? member.platform_agent_run_id
          : null,
      workspaceRootPath:
        typeof launchConfiguration?.workspace_root_path === "string"
          ? launchConfiguration.workspace_root_path
          : null,
      runtimeKind:
        typeof launchConfiguration?.runtime_kind === "string"
          ? launchConfiguration.runtime_kind
          : null,
      llmModelIdentifier:
        typeof launchConfiguration?.llm_model_identifier === "string"
          ? launchConfiguration.llm_model_identifier
          : null,
    });
  }
  return flattened;
};
