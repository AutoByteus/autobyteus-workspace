/**
 * Test-only builders for the released tree shapes that carry `collaborators` (Agent root tree,
 * Team tree V3, Org tree V2): the current trees plus the since-removed `collaborators` list.
 * Released entries are written here as raw JSON on purpose; no current type describes them.
 */
export type Json = Record<string, unknown>;

export const launch = (model = "model-a"): Json => ({
  runtimeKind: "autobyteus", llmModelIdentifier: model, llmConfig: { effort: "high" }, autoExecuteTools: true, workspaceRootPath: "/work",
});
export const T1 = "2026-10-01T00:00:00.000Z";
export const T2 = "2026-10-02T00:00:00.000Z";
export const T3 = "2026-10-03T00:00:00.000Z";

/** A released collaborator Agent entry added by `viaRunId`. */
export const agentCollaborator = (input: { address: string; runId: string; definitionId: string; viaRunId: string; addedAt?: string; extra?: Json }): Json => ({
  kind: "agent", address: input.address, agentDefinitionId: input.definitionId, agentRunId: input.runId, platformAgentRunId: null,
  launchConfiguration: launch(), launchSource: { origin: "inherited", fallbacks: [] }, addedAt: input.addedAt ?? T1, addedViaAgentRunId: input.viaRunId,
  ...input.extra,
});

/** A released collaborator Team entry (a coordinator and one teammate) with optional stored copies. */
export const teamCollaborator = (input: { address: string; teamRunId: string; definitionId: string; viaRunId: string; addedAt?: string; taskExecutions?: Json[]; extra?: Json }): Json => ({
  kind: "agent_team", address: input.address, teamDefinitionId: input.definitionId, teamRunId: input.teamRunId,
  coordinatorAddress: `${input.address}/lead`,
  members: [
    { address: `${input.address}/lead`, agentDefinitionId: "lead-definition", agentRunId: `${input.teamRunId}-lead`, platformAgentRunId: null },
    { address: `${input.address}/designer`, agentDefinitionId: "designer-definition", agentRunId: `${input.teamRunId}-designer`, platformAgentRunId: null,
      launchConfiguration: launch("model-b"), launchSource: { origin: "agent_default", fallbacks: [] },
      userLaunchSelection: { llmModelIdentifier: "chosen", llmConfig: null, selectedAt: T3 } },
  ],
  handoffs: [{ from: `${input.address}/lead`, to: `${input.address}/designer`, rules: ["UI work"] }],
  defaultLaunchConfiguration: launch(), defaultLaunchSource: { origin: "inherited", fallbacks: [] },
  taskExecutions: input.taskExecutions ?? [], addedAt: input.addedAt ?? T2, addedViaAgentRunId: input.viaRunId,
  userTeamLaunchSelection: { llmModelIdentifier: "team-chosen", llmConfig: { thinking: "low" }, selectedAt: T3 },
  ...input.extra,
});

/** A copy recorded before copies carried a source (the sourceless shape at a collaborator address). */
export const sourcelessCopy = (address: string, agentRunId: string, delegatorAgentRunId: string): Json => ({
  address, agentRunId, platformAgentRunId: null, delegatorAgentRunId, startedAt: T3,
});
