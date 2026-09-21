export type DraftContextFileOwnerDescriptor =
  | { kind: 'agent_draft'; draftRunId: string }
  | { kind: 'team_member_draft'; teamDraftId: string; memberAddress: string }
  | { kind: 'org_member_draft'; orgRunId: string; agentRunId: string };

export type FinalContextFileOwnerDescriptor =
  | { kind: 'agent_final'; runId: string }
  | { kind: 'team_member_final'; teamRunId: string; memberAddress: string }
  | { kind: 'org_member_final'; orgRunId: string; agentRunId: string };

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
  memberAddress: string,
): FinalContextFileOwnerDescriptor => ({
  kind: 'team_member_final',
  teamRunId: normalizeRequiredString(containingTeamRunId, 'teamRunId'),
  memberAddress: normalizeRequiredString(memberAddress, 'memberAddress'),
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

export const buildDraftContextFileEndpoint = (
  owner: DraftContextFileOwnerDescriptor,
  storedFilename: string,
): string => {
  const encodedStoredFilename = encodeURIComponent(normalizeRequiredString(storedFilename, 'storedFilename'));
  if (owner.kind === 'agent_draft') {
    return `/drafts/agent-runs/${encodeURIComponent(owner.draftRunId)}/context-files/${encodedStoredFilename}`;
  }
  if (owner.kind === 'org_member_draft') {
    return `/drafts/agent-org-runs/${encodeURIComponent(owner.orgRunId)}/agent-runs/${encodeURIComponent(owner.agentRunId)}/context-files/${encodedStoredFilename}`;
  }
  return `/drafts/team-runs/${encodeURIComponent(owner.teamDraftId)}/members/${encodeURIComponent(owner.memberAddress)}/context-files/${encodedStoredFilename}`;
};
