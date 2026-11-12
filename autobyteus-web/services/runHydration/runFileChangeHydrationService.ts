import {
  GetAgentOrgMemberFileChanges,
  GetRunFileChanges,
  GetTeamMemberFileChanges,
} from '~/graphql/queries/runHistoryQueries';
import { useRunFileChangesStore, type RunFileChangeArtifact } from '~/stores/runFileChangesStore';
import type { AgentRunReadSubject } from '~/types/agent/agentRunReadSubject';
import { getApolloClient } from '~/utils/apolloClient';

type FileChangesQuery = Readonly<{ document: unknown; field: string; variables: Record<string, string> }>;

/** The owner's file-change list query: each names its owner, so the server reads only that owner's tree. */
const fileChangesQueryOf = (subject: Exclude<AgentRunReadSubject, { kind: 'standaloneMember' }>): FileChangesQuery => {
  switch (subject.kind) {
    case 'run':
      return { document: GetRunFileChanges, field: 'getRunFileChanges', variables: { runId: subject.runId } };
    case 'teamMember':
      return {
        document: GetTeamMemberFileChanges,
        field: 'getTeamMemberFileChanges',
        variables: { teamRunId: subject.teamRunId, agentRunId: subject.agentRunId },
      };
    case 'agentOrgMember':
      return {
        document: GetAgentOrgMemberFileChanges,
        field: 'getAgentOrgMemberFileChanges',
        variables: { orgRunId: subject.orgRunId, memberAddress: subject.memberAddress, agentRunId: subject.agentRunId },
      };
  }
};

/**
 * Reads one agent run's recorded artifacts from the server, through its owner; a run on a peer node has none here.
 * Throws on GraphQL errors; a missing payload is no artifacts.
 */
export const fetchRunFileChanges = async (subject: AgentRunReadSubject): Promise<RunFileChangeArtifact[]> => {
  // A run on a peer node keeps its files there (autobyteus-278): this node has none of them.
  if (subject.kind === 'standaloneMember') return [];
  const { document, field, variables } = fileChangesQueryOf(subject);
  const response = await getApolloClient().query<Record<string, RunFileChangeArtifact[] | null>>({
    query: document as never,
    variables,
    fetchPolicy: 'network-only',
    context: { queryDeduplication: false },
  });
  const errors = response.errors || [];
  if (errors.length > 0) {
    throw new Error(errors.map((e: { message: string }) => e.message).join(', '));
  }
  return response.data?.[field] || [];
};

export const hydrateRunFileChanges = (
  runId: string,
  entries: RunFileChangeArtifact[],
): void => {
  useRunFileChangesStore().replaceRunProjection(runId, entries);
};

export const mergeHydratedRunFileChanges = (
  runId: string,
  entries: RunFileChangeArtifact[],
): void => {
  useRunFileChangesStore().mergeRunProjection(runId, entries);
};
