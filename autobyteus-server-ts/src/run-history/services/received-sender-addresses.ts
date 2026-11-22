import type { DelegationIndex } from "../../agent-collaboration/delegation/delegation-index.js";
import { createCollaborationMemberExecutionIdentity, type RootExecutionIdentity } from "../../agent-collaboration/execution/domain/root-execution-identity.js";
import type { EventMonitorActiveTracePage } from "../projection/event-monitor-active-trace-page-types.js";
import type { RunProjectionConversationEntry } from "../projection/run-projection-types.js";

/**
 * The sender addresses a member's page shows, as the receiver got them in each message's header (contract §2.5;
 * autobyteus-461 SR-060): an agent of the receiving run at its own address (steps 1 and 3, the run's own index); an
 * agent of another run at its own-space address only where the receiving run's reach resolves it to that agent
 * (`collaborationTreeOf(run).reachingAddressOf`), else none (the page shows its run ID). The page and the header never disagree.
 */
export const receivedSenderAddresses = async (input: Readonly<{
  receiverRun: RootExecutionIdentity;
  ownAddressOf(agentRunId: string): string | null;
  tree: Pick<DelegationIndex, "agentOf" | "collaborationTreeOf">;
  senderAgentRunIds: Iterable<string>;
}>): Promise<(agentRunId: string) => string | null> => {
  const map = input.tree.collaborationTreeOf(input.receiverRun);
  const resolved = new Map<string, string | null>();
  for (const agentRunId of new Set(input.senderAgentRunIds)) {
    const own = input.ownAddressOf(agentRunId);
    if (own) { resolved.set(agentRunId, own); continue; }
    // A sender of another unit of the receiver's Org container: its Org address (org-teams-follow-definition).
    const unit = await map.containerSenderAddressOf(agentRunId);
    if (unit) { resolved.set(agentRunId, unit); continue; }
    const sender = await input.tree.agentOf(agentRunId);
    resolved.set(agentRunId, sender?.address
      ? await map.reachingAddressOf(createCollaborationMemberExecutionIdentity({ root: sender.run, memberAddress: sender.address, agentRunId }))
      : null);
  }
  return (agentRunId) => resolved.get(agentRunId) ?? null;
};

/** The senders of a conversation's messages from other agents. */
export const conversationSenders = (conversation: readonly RunProjectionConversationEntry[]): string[] =>
  conversation.flatMap((entry) => entry.kind === "inter_agent_message" && entry.senderAgentRunId ? [entry.senderAgentRunId] : []);

/** The senders of a trace page's messages from other agents. */
export const tracePageSenders = (page: EventMonitorActiveTracePage): string[] =>
  page.events.flatMap((event) => event.visuals.flatMap((visual) => visual.kind === "inter_agent" ? [visual.senderAgentRunId] : []));
