/**
 * autobyteus-358: a root's views carry no message log; the Team tab reads one participant's messages with
 * `collaborationParticipantMessages`. These helpers read them the same way for E2E checks.
 */

export type CollaborationRootKind = "agent" | "agent_team" | "agent_org";
export type ParticipantMessage = Readonly<{
  messageId: string; senderAgentRunId: string; receiverAgentRunId: string; content: string;
  messageType: string; referenceFiles: readonly string[]; createdAt: string;
}>;
type Graphql = (query: string, variables: Record<string, unknown>) => Promise<any>;

export const PARTICIPANT_MESSAGES_QUERY =
  "query($rootKind:String!,$rootRunId:String!,$agentRunId:String!){collaborationParticipantMessages(rootKind:$rootKind,rootRunId:$rootRunId,agentRunId:$agentRunId)}";

/** One participant's messages of one root, as its Team tab loads them. */
export const readParticipantMessages = async (graphql: Graphql, input: Readonly<{
  rootKind: CollaborationRootKind; rootRunId: string; agentRunId: string;
}>): Promise<ParticipantMessage[]> =>
  (await graphql(PARTICIPANT_MESSAGES_QUERY, input)).collaborationParticipantMessages.messages as ParticipantMessage[];

/** Every agent run ID in a view's execution tree (camel or snake case); a view's tree holds no remote run. */
export const agentRunIdsOfViewTree = (tree: unknown): string[] => {
  const ids = new Set<string>();
  const visit = (value: unknown): void => {
    if (Array.isArray(value)) { value.forEach(visit); return; }
    if (!value || typeof value !== "object") return;
    for (const [key, entry] of Object.entries(value)) {
      if ((key === "agentRunId" || key === "agent_run_id") && typeof entry === "string") ids.add(entry);
      else if (key !== "remoteTaskExecutions" && key !== "remote_task_executions") visit(entry);
    }
  };
  visit(tree);
  return [...ids];
};

/** The root's messages between its agents: every participant's list, one entry per message, in stored time order. */
export const readRootMessages = async (graphql: Graphql, input: Readonly<{
  rootKind: CollaborationRootKind; rootRunId: string; agentRunIds: readonly string[];
}>): Promise<ParticipantMessage[]> => {
  const byId = new Map<string, ParticipantMessage>();
  for (const agentRunId of input.agentRunIds) {
    // A view's tree also holds the runs it delegated to, at every depth (autobyteus-461 rule 1). They are not participants of
    // this root (rule 2: each is read by its own identity), so the root refuses them; their messages with this root's agents
    // are in those agents' lists.
    const messages = await readParticipantMessages(graphql, { rootKind: input.rootKind, rootRunId: input.rootRunId, agentRunId })
      .catch((error: unknown) => { if (/is not a participant of/.test(String((error as Error)?.message ?? error))) return []; throw error; });
    for (const message of messages) byId.set(message.messageId, message);
  }
  return [...byId.values()].sort((left, right) => left.createdAt.localeCompare(right.createdAt) || left.messageId.localeCompare(right.messageId));
};
