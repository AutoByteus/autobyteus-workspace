/**
 * A participant's messages in its root (autobyteus-279, REQ-004: Messages), as the node's `collaborationParticipantMessages`
 * answers them: the messages one agent of a Team, an Org or an agent run's tree sent or received, from the ported content
 * (`content/messages.ts`). A message's reference files are absolute paths in the demo folder, as the node stores them.
 * Validated by the collaboration contract.
 */
import {
  collaborationParticipantMessagesDtoSchema,
  type CollaborationParticipantMessageDto,
  type CollaborationParticipantMessagesDto,
} from '@autobyteus/collaboration-stream-contracts';
import { demoParticipantMessages } from './content/messages';
import { DEMO_WORKSPACE_ROOT, type DemoAgent, type DemoRun, type DemoWorld } from './DemoWorld';

const ROOT_KINDS: Record<string, DemoRun['kind']> = { agent: 'agent', agent_team: 'team', agent_org: 'org' };

/** The agents a root's messages are among: its own, and the coordinators of the runs they delegated. */
const participantsOf = (root: DemoRun): DemoAgent[] => [...root.agents, ...root.agents.flatMap((agent) => agent.delegated.map((run) => run.coordinator))];

const rootOf = (world: DemoWorld, rootKind: string, rootRunId: string): DemoRun => {
  const root = world.run(rootRunId);
  if (!root || root.kind !== ROOT_KINDS[rootKind]) throw new Error(`Run '${rootRunId}' was not found.`);
  return root;
};

export const participantMessagesOf = (world: DemoWorld, rootKind: string, rootRunId: string, agentRunId: string): CollaborationParticipantMessagesDto => {
  const root = rootOf(world, rootKind, rootRunId);
  const participants = participantsOf(root);
  const agent = participants.find((candidate) => candidate.agentRunId === agentRunId);
  if (!agent) throw new Error(`Agent run '${agentRunId}' is not a participant of '${rootRunId}'.`);
  const nameOf = (candidate: DemoAgent) => candidate.memberName ?? candidate.agentName;
  const at = Date.parse(agent.lastActivityAt) - 10 * 60_000;
  const team = root.kind === 'agent' ? null : { name: root.name, summary: root.summary };
  const messages = demoParticipantMessages({ id: agent.agentRunId, key: agent.key, name: nameOf(agent) },
    participants.map((candidate) => ({ id: candidate.agentRunId, name: nameOf(candidate) })), at, team);
  const absolute = (file: string) => `${DEMO_WORKSPACE_ROOT}/${file}`;
  return collaborationParticipantMessagesDtoSchema.parse({
    messages: (messages?.messages ?? []).map((message) => ({ ...message, referenceFiles: (message.referenceFiles as string[]).map(absolute) })),
    pastParticipants: messages?.pastParticipants ?? [],
  });
};

/** One message of a root by its id (a reference's content names it), from any of its participants' lists; null if none. */
export const participantMessageOf = (world: DemoWorld, rootKind: string, rootRunId: string, messageId: string): CollaborationParticipantMessageDto | null => {
  const root = world.run(rootRunId);
  if (!root || root.kind !== ROOT_KINDS[rootKind]) return null;
  for (const agent of participantsOf(root)) {
    const message = participantMessagesOf(world, rootKind, rootRunId, agent.agentRunId).messages.find((candidate) => candidate.messageId === messageId);
    if (message) return message;
  }
  return null;
};
