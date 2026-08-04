import { GetTeamRunResumeConfig } from '~/graphql/queries/runHistoryQueries';
import type { GetTeamRunResumeConfigQueryData, TeamRunMetadataPayload } from '~/stores/runHistoryTypes';
import { flattenTeamRunAgentMetadata, parseTeamRunMetadata } from '~/stores/runHistoryMetadata';
import type { AgentTeamContext } from '~/types/agent/AgentTeamContext';
import { getApolloClient } from '~/utils/apolloClient';

export const applyBackendMemberRunIdsToTeamContext = (
  teamContext: AgentTeamContext,
  metadata: TeamRunMetadataPayload,
): void => {
  const agentRunIdByAddress = new Map(
    flattenTeamRunAgentMetadata(metadata.rootTeam.children).map((member) => [member.address, member.agentRunId]),
  );
  if (!agentRunIdByAddress.size) throw new Error(`Team '${metadata.rootTeam.teamRunId}' metadata has no Agent run identities.`);
  teamContext.memberNodesByAddress.forEach((node, address) => {
    if (node.kind === 'agent') node.agentRunId = agentRunIdByAddress.get(address) ?? node.agentRunId;
  });
  teamContext.agentExecutionsByKey.forEach((agentContext, executionKey) => {
    let address = '';
    try { address = JSON.parse(executionKey).memberAddress || ''; } catch { return; }
    const agentRunId = agentRunIdByAddress.get(address);
    if (agentRunId) agentContext.state.runId = agentRunId;
  });
};

export const reconcileTeamContextAgentRunIdsFromBackend = async (params: {
  teamContext: AgentTeamContext;
  teamRunId: string;
}): Promise<TeamRunMetadataPayload> => {
  const { data, errors } = await getApolloClient().query<GetTeamRunResumeConfigQueryData>({
    query: GetTeamRunResumeConfig,
    variables: { teamRunId: params.teamRunId },
    fetchPolicy: 'network-only',
  });
  if (errors?.length) throw new Error(errors.map((error: { message: string }) => error.message).join(', '));
  if (!data?.getTeamRunResumeConfig) throw new Error(`Team resume config payload missing for '${params.teamRunId}'.`);
  const metadata = parseTeamRunMetadata(data.getTeamRunResumeConfig.metadata);
  applyBackendMemberRunIdsToTeamContext(params.teamContext, metadata);
  return metadata;
};
