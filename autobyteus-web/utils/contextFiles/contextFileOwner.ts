export type DraftContextFileOwnerDescriptor =
  | { kind: 'agent_draft'; draftRunId: string }
  | { kind: 'team_member_draft'; draftTeamRunId: string; memberRouteKey: string };

export type FinalContextFileOwnerDescriptor =
  | { kind: 'agent_final'; runId: string }
  | { kind: 'team_member_final'; teamRunId: string; memberRouteKey: string };

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
  memberRouteKey: string,
): DraftContextFileOwnerDescriptor => ({
  kind: 'team_member_draft',
  draftTeamRunId: normalizeRequiredString(draftTeamRunId, 'draftTeamRunId'),
  memberRouteKey: normalizeRequiredString(memberRouteKey, 'memberRouteKey'),
});

export const buildAgentFinalContextFileOwner = (runId: string): FinalContextFileOwnerDescriptor => ({
  kind: 'agent_final',
  runId: normalizeRequiredString(runId, 'runId'),
});

export const buildTeamMemberFinalContextFileOwner = (
  teamRunId: string,
  memberRouteKey: string,
): FinalContextFileOwnerDescriptor => ({
  kind: 'team_member_final',
  teamRunId: normalizeRequiredString(teamRunId, 'teamRunId'),
  memberRouteKey: normalizeRequiredString(memberRouteKey, 'memberRouteKey'),
});

export const buildDraftContextFileEndpoint = (
  owner: DraftContextFileOwnerDescriptor,
  storedFilename: string,
): string => {
  const encodedStoredFilename = encodeURIComponent(normalizeRequiredString(storedFilename, 'storedFilename'));
  if (owner.kind === 'agent_draft') {
    return `/drafts/agent-runs/${encodeURIComponent(owner.draftRunId)}/context-files/${encodedStoredFilename}`;
  }
  return `/drafts/team-runs/${encodeURIComponent(owner.draftTeamRunId)}/members/${encodeURIComponent(owner.memberRouteKey)}/context-files/${encodedStoredFilename}`;
};
