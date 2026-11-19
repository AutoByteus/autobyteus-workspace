/**
 * An agent's work beside its conversation (autobyteus-279): its background tasks (the node's background task view: a live
 * agent's current tasks; a stopped agent's view is unavailable, `inactive`) and the messages it exchanged in its root.
 */
import { BackgroundTaskViewReason } from '~/generated/graphql';
import { backgroundTasksOf } from '../world/backgroundTasks';
import { participantMessagesOf } from '../world/participantMessages';
import type { DemoGraphqlHandlers } from './operations';

export const collaborationHandlers = {
  AgentBackgroundTaskView: ({ agentRunId }, world) => {
    const agent = world.agent(agentRunId);
    if (!agent || agent.status === 'offline') {
      return { __typename: 'Query', agentBackgroundTaskView: { __typename: 'AgentBackgroundTaskUnavailable', agentRunId, reason: BackgroundTaskViewReason.Inactive } };
    }
    return {
      __typename: 'Query',
      agentBackgroundTaskView: {
        __typename: 'AgentBackgroundTaskEventStream', agentRunId,
        currentTasks: backgroundTasksOf(world, agent).map((task) => ({ __typename: 'AgentBackgroundTask' as const, ...task })),
      },
    };
  },
  CollaborationParticipantMessages: ({ rootKind, rootRunId, agentRunId }, world) => ({
    collaborationParticipantMessages: participantMessagesOf(world, rootKind, rootRunId, agentRunId),
  }),
} satisfies Partial<DemoGraphqlHandlers>;
