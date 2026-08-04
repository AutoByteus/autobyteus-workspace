import type {
  EventMonitorActiveTracePageFieldsFragment,
  GetRunEventMonitorActiveTracePageQuery,
  GetTeamMemberEventMonitorActiveTracePageQuery,
} from '~/generated/graphql';
import {
  GetRunEventMonitorActiveTracePage,
  GetTeamMemberEventMonitorActiveTracePage,
} from '~/graphql/queries/runHistoryQueries';
import { getApolloClient } from '~/utils/apolloClient';

export type EventMonitorActiveTraceBrowseSubject =
  | { kind: 'run'; runId: string }
  | { kind: 'teamMember'; teamRunId: string; memberAddress: string; agentRunId: string };
export type EventMonitorActiveTracePageDto = EventMonitorActiveTracePageFieldsFragment;
export type EventMonitorActiveTracePageEventDto = EventMonitorActiveTracePageDto['events'][number];
export type EventMonitorActiveTracePageVisualDto = EventMonitorActiveTracePageEventDto['visuals'][number];

export const fetchEventMonitorActiveTracePage = async (
  subject: EventMonitorActiveTraceBrowseSubject,
  beforeCursor: string | null,
): Promise<EventMonitorActiveTracePageDto> => {
  const client = getApolloClient();
  if (subject.kind === 'run') {
    const response = await client.query<GetRunEventMonitorActiveTracePageQuery>({
      query: GetRunEventMonitorActiveTracePage,
      variables: { runId: subject.runId, beforeCursor },
      fetchPolicy: 'network-only',
    });
    if (response.errors?.length) throw new Error(response.errors.map((error: { message: string }) => error.message).join(', '));
    return response.data.getRunEventMonitorActiveTracePage;
  }
  const response = await client.query<GetTeamMemberEventMonitorActiveTracePageQuery>({
    query: GetTeamMemberEventMonitorActiveTracePage,
    variables: {
      teamRunId: subject.teamRunId,
      memberAddress: subject.memberAddress,
      beforeCursor,
    },
    fetchPolicy: 'network-only',
  });
  if (response.errors?.length) throw new Error(response.errors.map((error: { message: string }) => error.message).join(', '));
  return response.data.getTeamMemberEventMonitorActiveTracePage;
};
