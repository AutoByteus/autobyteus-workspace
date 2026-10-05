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

/**
 * Whose active trace a page reads. A standalone run's host is a top-level run (`run`); its
 * collaborators and collaborator-Team members live in its package (`standaloneMember`).
 */
export type EventMonitorActiveTraceBrowseSubject =
  | { kind: 'run'; runId: string }
  | { kind: 'teamMember'; teamRunId: string; memberAddress: string; agentRunId: string }
  | { kind: 'agentOrgMember'; orgRunId: string; memberAddress: string; agentRunId: string }
  | { kind: 'standaloneMember'; hostRunId: string; memberAddress: string; agentRunId: string };
export type EventMonitorActiveTracePageDto = EventMonitorActiveTracePageFieldsFragment;
export type EventMonitorActiveTracePageEventDto = EventMonitorActiveTracePageDto['events'][number];
export type EventMonitorActiveTracePageVisualDto = EventMonitorActiveTracePageEventDto['visuals'][number];

const query = async <T>(document: unknown, variables: Record<string, unknown>): Promise<T> => {
  const response = await getApolloClient().query<T>({ query: document as never, variables, fetchPolicy: 'network-only' });
  if (response.errors?.length) throw new Error(response.errors.map((error: { message: string }) => error.message).join(', '));
  return response.data;
};

export const fetchEventMonitorActiveTracePage = async (
  subject: EventMonitorActiveTraceBrowseSubject,
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
