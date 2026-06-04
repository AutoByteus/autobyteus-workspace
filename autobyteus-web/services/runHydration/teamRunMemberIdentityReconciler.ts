import { GetTeamRunResumeConfig } from '~/graphql/queries/runHistoryQueries';
import type { GetTeamRunResumeConfigQueryData, TeamRunMetadataMember, TeamRunMetadataPayload } from '~/stores/runHistoryTypes';
import { parseTeamRunMetadata } from '~/stores/runHistoryMetadata';
import type { AgentTeamContext, TeamMemberNode } from '~/types/agent/AgentTeamContext';
import { getApolloClient } from '~/utils/apolloClient';

interface BackendMemberIdentity {
  memberRouteKey: string;
  memberRunId: string;
}

export const collectBackendMemberIdentities = (
  metadata: TeamRunMetadataPayload,
): BackendMemberIdentity[] => {
  const identities: BackendMemberIdentity[] = [];
  const visit = (members: readonly TeamRunMetadataMember[]): void => {
    for (const member of members) {
      const memberRouteKey = member.memberRouteKey.trim();
      const memberRunId = member.memberRunId?.trim() || '';
      if (memberRouteKey && memberRunId) {
        identities.push({ memberRouteKey, memberRunId });
      }
      if (member.memberKind === 'agent_team') {
        visit(member.memberTree);
      }
    }
  };
  visit(metadata.memberTree);
  return identities;
};

const applyMemberRunIdToTree = (
  memberTree: readonly TeamMemberNode[],
  memberRunIdByRouteKey: Map<string, string>,
): void => {
  for (const node of memberTree) {
    const memberRunId = memberRunIdByRouteKey.get(node.memberRouteKey);
    if (memberRunId) {
      node.memberRunId = memberRunId;
    }
    if (node.memberKind === 'agent_team') {
      applyMemberRunIdToTree(node.children, memberRunIdByRouteKey);
    }
  }
};

export const applyBackendMemberRunIdsToTeamContext = (
  teamContext: AgentTeamContext,
  metadata: TeamRunMetadataPayload,
): void => {
  const memberRunIdByRouteKey = new Map(
    collectBackendMemberIdentities(metadata).map((identity) => [
      identity.memberRouteKey,
      identity.memberRunId,
    ]),
  );

  if (memberRunIdByRouteKey.size === 0) {
    throw new Error(`Team '${metadata.teamRunId}' metadata does not contain member run IDs.`);
  }

  applyMemberRunIdToTree(teamContext.memberTree, memberRunIdByRouteKey);
  teamContext.memberNodesByRouteKey.forEach((node, memberRouteKey) => {
    const memberRunId = memberRunIdByRouteKey.get(memberRouteKey);
    if (memberRunId) {
      node.memberRunId = memberRunId;
    }
  });
  teamContext.leafAgentContextsByRouteKey.forEach((memberContext, memberRouteKey) => {
    const memberRunId = memberRunIdByRouteKey.get(memberRouteKey);
    if (memberRunId) {
      memberContext.state.runId = memberRunId;
    }
  });
};

export const reconcileTeamContextMemberRunIdsFromBackend = async (params: {
  teamContext: AgentTeamContext;
  teamRunId: string;
}): Promise<TeamRunMetadataPayload> => {
  const client = getApolloClient();
  const { data, errors } = await client.query<GetTeamRunResumeConfigQueryData>({
    query: GetTeamRunResumeConfig,
    variables: { teamRunId: params.teamRunId },
    fetchPolicy: 'network-only',
  });

  if (errors && errors.length > 0) {
    throw new Error(errors.map((error: { message: string }) => error.message).join(', '));
  }

  const resumeConfigPayload = data?.getTeamRunResumeConfig;
  if (!resumeConfigPayload) {
    throw new Error(`Team resume config payload missing for '${params.teamRunId}'.`);
  }

  const metadata = parseTeamRunMetadata(resumeConfigPayload.metadata);
  applyBackendMemberRunIdsToTeamContext(params.teamContext, metadata);
  return metadata;
};
