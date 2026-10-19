import type {
  EventMonitorActiveTracePageFieldsFragment,
  GetAgentOrgMemberEventMonitorActiveTracePageQuery,
  GetAgentRunCollaborationMemberEventMonitorActiveTracePageQuery,
  GetRunEventMonitorActiveTracePageQuery,
  GetTeamMemberEventMonitorActiveTracePageQuery,
} from '~/generated/graphql';
import {
  GetRunEventMonitorActiveTracePage,
  GetTeamMemberEventMonitorActiveTracePage,
  GetAgentOrgMemberEventMonitorActiveTracePage,
  GetAgentRunCollaborationMemberEventMonitorActiveTracePage,
} from '~/graphql/queries/runHistoryQueries';
import { getApolloClient } from '~/utils/apolloClient';
import type { AgentRunReadSubject } from '~/types/agent/agentRunReadSubject';

export type EventMonitorActiveTracePageDto = EventMonitorActiveTracePageFieldsFragment;
export type EventMonitorActiveTracePageEventDto = EventMonitorActiveTracePageDto['events'][number];
export type EventMonitorActiveTracePageVisualDto = EventMonitorActiveTracePageEventDto['visuals'][number];

const query = async <T>(document: unknown, variables: Record<string, unknown>): Promise<T> => {
  const response = await getApolloClient().query<T>({ query: document as never, variables, fetchPolicy: 'network-only' });
  if (response.errors?.length) throw new Error(response.errors.map((error: { message: string }) => error.message).join(', '));
  return response.data;
};

export const fetchEventMonitorActiveTracePage = async (
  subject: AgentRunReadSubject,
  beforeCursor: string | null,
): Promise<EventMonitorActiveTracePageDto> => {
  switch (subject.kind) {
    case 'run':
      return (await query<GetRunEventMonitorActiveTracePageQuery>(GetRunEventMonitorActiveTracePage, {
        runId: subject.runId, beforeCursor,
      })).getRunEventMonitorActiveTracePage;
    case 'teamMember':
      return (await query<GetTeamMemberEventMonitorActiveTracePageQuery>(GetTeamMemberEventMonitorActiveTracePage, {
        teamRunId: subject.teamRunId, memberAddress: subject.memberAddress, agentRunId: subject.agentRunId, beforeCursor,
      })).getTeamMemberEventMonitorActiveTracePage;
    case 'agentOrgMember':
      return (await query<GetAgentOrgMemberEventMonitorActiveTracePageQuery>(GetAgentOrgMemberEventMonitorActiveTracePage, {
        orgRunId: subject.orgRunId, memberAddress: subject.memberAddress, agentRunId: subject.agentRunId, beforeCursor,
      })).getAgentOrgMemberEventMonitorActiveTracePage;
    case 'standaloneMember':
      return (await query<GetAgentRunCollaborationMemberEventMonitorActiveTracePageQuery>(
        GetAgentRunCollaborationMemberEventMonitorActiveTracePage,
        { hostRunId: subject.hostRunId, memberAddress: subject.memberAddress, agentRunId: subject.agentRunId, beforeCursor },
      )).agentRunCollaborationMemberEventMonitorActiveTracePage;
  }
};
