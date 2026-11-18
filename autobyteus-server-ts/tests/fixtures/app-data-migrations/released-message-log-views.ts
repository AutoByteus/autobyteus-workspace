import type { CollaborationCommunicationMessage } from "../../../src/app-data-migrations/frozen/server/agent-collaboration/execution/communication/collaboration-communication-message.js";
import type { TaskExecution } from "../../../src/app-data-migrations/frozen/server/run-history/domain/run-execution-tree-shared-records.js";
import { agentRunIdsOfTree, type CoordinatingTreeShape } from "../../../src/app-data-migrations/frozen/server/run-history/store/task-execution-tree-split.js";

/**
 * Test-only: the message view rule of the released app (autobyteus-469, before autobyteus-461), for the tests of the
 * released migrations that compare a coordinating run's view before and after them. The app no longer has a
 * coordinating run (autobyteus-461), so these rules live here, next to the frozen shapes they read.
 */
export type ReleasedTaskAgentLogOwner =
  | Readonly<{ kind: "task_agent"; agentRunId: string }>
  | Readonly<{ kind: "task_agent_team"; teamRunId: string }>;

/** The own logs of a coordinating run's task agents. */
export const taskAgentLogOwners = (lists: Iterable<readonly TaskExecution[]>): ReleasedTaskAgentLogOwner[] =>
  [...lists].flatMap((tasks) => tasks.map((task): ReleasedTaskAgentLogOwner => "agentRunId" in task
    ? { kind: "task_agent", agentRunId: task.agentRunId }
    : { kind: "task_agent_team", teamRunId: task.teamRunId }));

/** A message whose two agents are in the tree, or one of whose agents is one of the run's own agents. */
export const messageViewOfTree = <TTree>(shape: CoordinatingTreeShape<TTree>, tree: TTree) => {
  const own = new Set(shape.ownAgentRunIdsOfRaw(tree as unknown as Record<string, unknown>));
  const agents = agentRunIdsOfTree(shape, tree);
  return (message: Pick<CollaborationCommunicationMessage, "senderAgentRunId" | "receiverAgentRunId">): boolean =>
    (agents.has(message.senderAgentRunId) && agents.has(message.receiverAgentRunId))
    || own.has(message.senderAgentRunId) || own.has(message.receiverAgentRunId);
};

/** A run's own log and its task agents' logs, each message once (by `messageId`), in the view, in `createdAt` order. */
export const composeMessageLogs = (
  logs: readonly (readonly CollaborationCommunicationMessage[])[],
  inView: (message: CollaborationCommunicationMessage) => boolean,
): CollaborationCommunicationMessage[] => {
  const byId = new Map<string, CollaborationCommunicationMessage>();
  for (const log of logs) for (const message of log) if (!byId.has(message.messageId) && inView(message)) byId.set(message.messageId, message);
  return [...byId.values()].map((message, order) => ({ message, order }))
    .sort((left, right) => left.message.createdAt.localeCompare(right.message.createdAt) || left.order - right.order)
    .map(({ message }) => message);
};
