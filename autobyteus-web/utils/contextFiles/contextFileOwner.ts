export type DraftContextFileOwnerDescriptor =
  | { kind: 'agent_draft'; draftRunId: string }
  | { kind: 'team_member_draft'; teamDraftId: string; memberAddress: string }
  | { kind: 'org_member_draft'; orgRunId: string; agentRunId: string }
  /** A task child of a standalone run's collaboration root. */

export type FinalContextFileOwnerDescriptor =
  | { kind: 'agent_final'; runId: string }
  | { kind: 'team_member_final'; teamRunId: string; agentRunId: string }
  | { kind: 'org_member_final'; orgRunId: string; agentRunId: string }

const normalizeRequiredString = (value: string, fieldName: string): string => {
  const normalized = value.trim();
  if (!normalized) {
    throw new Error(`${fieldName} is required.`);
  }
  return normalized;
};

export const buildAgentDraftContextFileOwner = (draftRunId: string): DraftContextFileOwnerDescriptor => ({
  kind: 'agent_draft',
  draftRunId: normalizeRequiredString(draftRunId, 'draftRunId'),
});

export const buildTeamMemberDraftContextFileOwner = (
  teamDraftId: string,
  memberAddress: string,
): DraftContextFileOwnerDescriptor => ({
  kind: 'team_member_draft',
  teamDraftId: normalizeRequiredString(teamDraftId, 'teamDraftId'),
  memberAddress: normalizeRequiredString(memberAddress, 'memberAddress'),
});

export const buildAgentFinalContextFileOwner = (runId: string): FinalContextFileOwnerDescriptor => ({
  kind: 'agent_final',
  runId: normalizeRequiredString(runId, 'runId'),
});

export const buildTeamMemberFinalContextFileOwner = (
  containingTeamRunId: string,
  agentRunId: string,
): FinalContextFileOwnerDescriptor => ({
  kind: 'team_member_final',
  teamRunId: normalizeRequiredString(containingTeamRunId, 'teamRunId'),
  agentRunId: normalizeRequiredString(agentRunId, 'agentRunId'),
});

export const buildOrgMemberDraftContextFileOwner = (
  orgRunId: string,
  agentRunId: string,
): DraftContextFileOwnerDescriptor => ({
  kind: 'org_member_draft',
  orgRunId: normalizeRequiredString(orgRunId, 'orgRunId'),
  agentRunId: normalizeRequiredString(agentRunId, 'agentRunId'),
});

export const buildOrgMemberFinalContextFileOwner = (
  orgRunId: string,
  agentRunId: string,
): FinalContextFileOwnerDescriptor => ({
  kind: 'org_member_final',
  orgRunId: normalizeRequiredString(orgRunId, 'orgRunId'),
  agentRunId: normalizeRequiredString(agentRunId, 'agentRunId'),
});

