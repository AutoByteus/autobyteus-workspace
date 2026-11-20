/**
 * An agent's work beside its conversation (autobyteus-279): its background tasks (the node's background task view: a live
 * agent's current tasks; a stopped agent's view is unavailable, `inactive`), the messages it exchanged in its root, and
 * the `@` menu's options (the node's candidate policy: every agent and Team definition except the viewer's own).
 */
import { BackgroundTaskViewReason, type GetCollaboratorMentionCandidatesQuery } from '~/generated/graphql';
import { backgroundTasksOf } from '../world/backgroundTasks';
import { descriptionOf } from '../world/content/definitions';
import type { DemoDefinition, DemoWorld } from '../world/DemoWorld';
import { participantMessagesOf } from '../world/participantMessages';
import type { DemoGraphqlHandlers } from './operations';

type Candidate = GetCollaboratorMentionCandidatesQuery['collaboratorMentionCandidates']['candidates'][number];

const ROOT_KINDS: Record<string, 'agent' | 'team' | 'org'> = { agent: 'agent', agent_team: 'team', agent_org: 'org' };

/** The definition the `@` menu leaves out: an agent root's focused agent's, a Team's own (an Org has none to leave out). */
const ownDefinitionOf = (world: DemoWorld, rootKind: string, rootRunId: string, focusedAgentRunId?: string | null): DemoDefinition | null => {
  const root = world.run(rootRunId);
  if (!root || root.kind !== ROOT_KINDS[rootKind]) throw new Error(`Run '${rootRunId}' was not found.`);
  if (root.kind === 'agent') {
    if (!focusedAgentRunId) throw new Error('An agent root needs its focused agent.');
    return world.definition(world.agent(focusedAgentRunId)?.definitionId ?? '');
  }
  return root.kind === 'team' ? world.definition(root.definitionId) : null;
};

const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name);

export const collaborationHandlers = {
  GetCollaboratorMentionCandidates: ({ rootSubjectKind, rootRunId, focusedAgentRunId }, world) => {
    const own = ownDefinitionOf(world, rootSubjectKind, rootRunId, focusedAgentRunId);
    const candidates: Candidate[] = [
      ...world.definitions('agent').filter((definition) => definition !== own).sort(byName).map((definition) => ({
        __typename: 'CollaboratorMentionCandidateObject' as const, kind: 'agent', definitionId: definition.id, name: definition.name,
        description: descriptionOf(definition.name), memberCount: null, coordinatorName: null,
      })),
      ...world.definitions('team').filter((definition) => definition !== own).sort(byName).map((definition) => ({
        __typename: 'CollaboratorMentionCandidateObject' as const, kind: 'agent_team', definitionId: definition.id, name: definition.name,
        description: descriptionOf(definition.name), memberCount: definition.members.length, coordinatorName: definition.members[0] ?? null,
      })),
    ];
    return { __typename: 'Query', collaboratorMentionCandidates: { __typename: 'CollaboratorMentionCandidatesPayload', availability: 'AVAILABLE', candidates } };
  },
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
