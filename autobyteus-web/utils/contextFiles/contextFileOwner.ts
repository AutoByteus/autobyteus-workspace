export type DraftContextFileOwnerDescriptor =
  | { kind: 'agent_draft'; draftRunId: string }
  | { kind: 'team_member_draft'; draftTeamRunId: string; memberAddress: string };

export type FinalContextFileOwnerDescriptor =
  | { kind: 'agent_final'; runId: string }
  | { kind: 'team_member_final'; teamRunId: string; memberAddress: string };

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
  draftTeamRunId: string,
  memberAddress: string,
): DraftContextFileOwnerDescriptor => ({
  kind: 'team_member_draft',
  draftTeamRunId: normalizeRequiredString(draftTeamRunId, 'draftTeamRunId'),
  memberAddress: normalizeRequiredString(memberAddress, 'memberAddress'),
});

export const buildAgentFinalContextFileOwner = (runId: string): FinalContextFileOwnerDescriptor => ({
  kind: 'agent_final',
  runId: normalizeRequiredString(runId, 'runId'),
});

export const buildTeamMemberFinalContextFileOwner = (
  teamRunId: string,
  memberAddress: string,
): FinalContextFileOwnerDescriptor => ({
  kind: 'team_member_final',
  teamRunId: normalizeRequiredString(teamRunId, 'teamRunId'),
  memberAddress: normalizeRequiredString(memberAddress, 'memberAddress'),
});

export const buildDraftContextFileEndpoint = (
  owner: DraftContextFileOwnerDescriptor,
  storedFilename: string,
): string => {
  const encodedStoredFilename = encodeURIComponent(normalizeRequiredString(storedFilename, 'storedFilename'));
  if (owner.kind === 'agent_draft') {
    return `/drafts/agent-runs/${encodeURIComponent(owner.draftRunId)}/context-files/${encodedStoredFilename}`;
  }
  return `/drafts/team-runs/${encodeURIComponent(owner.draftTeamRunId)}/members/${encodeURIComponent(owner.memberAddress)}/context-files/${encodedStoredFilename}`;
};
