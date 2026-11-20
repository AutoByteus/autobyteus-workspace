import type { CollaborationCounterpartDto } from "@autobyteus/collaboration-stream-contracts";
import type { DelegationIndex } from "../../agent-collaboration/delegation/delegation-index.js";
import type { MessageCounterpart } from "../../agent-collaboration/execution/communication/collaboration-communication-message.js";
import type { RootExecutionIdentity } from "../../agent-collaboration/execution/domain/root-execution-identity.js";
import { runReferenceOf } from "../../agent-collaboration/execution/task/task-execution-resource-port.js";
import type { AgentRunMetadataStore } from "../store/agent-run-metadata-store.js";
import type { DelegatedRunAgent, DelegatedRunAgentsReader } from "./delegated-run-agents-reader.js";

/**
 * Names the other agents of a participant's messages that the root's tree does not name (autobyteus-565 DS-001), so every
 * row on a page has an identity, live and after a reload alike. In this order, without scanning any run folder:
 * 1. an agent of a run delegated from the root that left its tree when its Task closed (`past`, autobyteus-469 D-5);
 * 2. the newest line's `counterpart` record: `remote` (its node, named as this node names its peer) or `run`;
 * 3. a Task entry of a run this node delegated to another node (an older linked line): `remote`;
 * 4. a local agent run's own `run_metadata.json` (one file, by its ID): `run` with its address;
 * 5. otherwise `run` without an address: the view shows its run ID (an older unlinked line, or a deleted run).
 */
export class CounterpartIdentities {
  constructor(private readonly dependencies: Readonly<{
    delegatedRunAgents: Pick<DelegatedRunAgentsReader, "forAgentRunIds">;
    tree: Pick<DelegationIndex, "runOfAgent" | "tasksOf" | "agentsOf">;
    runMetadata: Pick<AgentRunMetadataStore, "readMetadata">;
    /** This node's name for a peer by its node ID; the node ID when it is no longer registered. */
    peerName(nodeId: string): Promise<string>;
  }>) {}

  /** The agents among these that a run delegated from the root holds, at every depth, open or closed (the past participants). */
  pastParticipants(root: RootExecutionIdentity, agentRunIds: Iterable<string>): Promise<readonly DelegatedRunAgent[]> {
    return this.dependencies.delegatedRunAgents.forAgentRunIds(root, agentRunIds);
  }

  /** One identity for each of these agents; `recordOf` gives the newest line's `counterpart` record of one, if any. */
  async of(input: Readonly<{
    agentRunIds: Iterable<string>;
    past: readonly DelegatedRunAgent[];
    recordOf(agentRunId: string): MessageCounterpart | null;
  }>): Promise<CollaborationCounterpartDto[]> {
    const past = new Map(input.past.map((agent) => [agent.agentRunId, agent.address]));
    return Promise.all([...new Set(input.agentRunIds)].map(async (agentRunId): Promise<CollaborationCounterpartDto> => {
      const pastAddress = past.get(agentRunId);
      if (pastAddress) return { kind: "past", agentRunId, address: pastAddress };
      const record = input.recordOf(agentRunId);
      if (record) return record.nodeId ? this.remote(agentRunId, record.address, record.nodeId) : { kind: "run", agentRunId, address: record.address };
      const linked = await this.linkedRemote(agentRunId);
      if (linked) return this.remote(agentRunId, linked.address, linked.nodeId);
      // DESIGN.md rule 7: a run whose file cannot be read is named by its run ID, with a warning naming it.
      const metadata = await this.dependencies.runMetadata.readMetadata(agentRunId).catch((error: unknown) => {
        console.warn(`Agent run '${agentRunId}' is named by its run ID: its run file cannot be read: ${error instanceof Error ? error.message : String(error)}`);
        return null;
      });
      return { kind: "run", agentRunId, address: metadata?.address ?? null };
    }));
  }

  private async remote(agentRunId: string, address: string | null, nodeId: string): Promise<CollaborationCounterpartDto> {
    return { kind: "remote", agentRunId, address, nodeName: await this.dependencies.peerName(nodeId) };
  }

  /** An agent of a run this node delegated to another node: its node from the run's Task entry, its address from the tree. */
  private async linkedRemote(agentRunId: string): Promise<Readonly<{ address: string | null; nodeId: string }> | null> {
    const run = await this.dependencies.tree.runOfAgent(agentRunId);
    const reference = run ? runReferenceOf(run) : null;
    const entry = reference ? this.dependencies.tree.tasksOf(reference).find((candidate) => candidate.nodeId !== undefined) : undefined;
    if (!run || !entry?.nodeId) return null;
    const agent = (await this.dependencies.tree.agentsOf(run)).find((candidate) => candidate.agentRunId === agentRunId);
    return { address: agent?.address ?? null, nodeId: entry.nodeId };
  }
}
