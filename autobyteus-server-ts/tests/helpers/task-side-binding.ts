import { NO_RUN_PARTS } from "./run-agents-reader.js";
import { DelegationIndex } from "../../src/agent-collaboration/delegation/delegation-index.js";
import { TaskDelegation } from "../../src/agent-collaboration/execution/task/task-delegation.js";
import type { DelegationRefusal, DelegationSource } from "../../src/agent-collaboration/execution/task/member-task-capability.js";
import type { AssignToExistingDelegatedRunInput, SpawnTaskInput, TaskDelegationContext, TaskDelegationOutcome } from "../../src/agent-collaboration/execution/task/task-delegation-command.js";
import { RemoteDelegation } from "../../src/agent-collaboration/execution/remote/remote-delegation.js";
import type { InMemoryTaskExecutionResources } from "../fixtures/task-execution-resource-fixtures.js";
import type { RemoteRunChannel } from "../../src/agent-collaboration/execution/remote/remote-run-channel.js";
import { NO_PEER_CHANNEL } from "./explicit-host-collaborators.js";

const notInThisTest = async (): Promise<never> => { throw new Error("A local run is not started in this test."); };

type DelegatingRoot = Readonly<{ delegationSource(context: TaskDelegationContext): Promise<DelegationSource | DelegationRefusal> }>;

/**
 * A node's Task side for a test (autobyteus-461 SR-047, SR-049): the delegation tree over its Task records, the
 * `TaskDelegation` and `RemoteDelegation` built with them, passed to what the test builds (never bound). `delegate` and
 * `assign` take the tool path: the sender's root answers for its own run, the delegation goes on outside it. Only peer
 * delegation runs a delegation to the end: starting a local run refuses.
 */
export const testTaskSide = (tasks: InMemoryTaskExecutionResources, channel?: () => RemoteRunChannel | null) => {
  const tree = new DelegationIndex(() => tasks, NO_RUN_PARTS);
  tree.build();
  tasks.setEntriesListener(tree);
  const delegation = new TaskDelegation({
    tasks: () => tasks, tree: () => tree,
    starter: { startAgent: notInThisTest, startTeam: notInThisTest } as never,
    deliverWorkPacket: notInThisTest, discard: async () => undefined, recordCollaborating: async () => undefined,
    reachingAddress: async () => null,
    ownDelegations: { of: async () => null }, delegatorCatalog: { placementAt: async () => null }, conversationOf: async () => ({ entryAddress: "/entry", activity: { kind: "present" as const } }),
    deliverToRun: notInThisTest,
    // A test that gives no channel has no peer nodes (autobyteus-500 FU-011).
    channel: channel ?? NO_PEER_CHANNEL,
  });
  const remote = new RemoteDelegation({ delegation, tree, channel: channel ?? NO_PEER_CHANNEL });
  const sourceOf = (root: DelegatingRoot, context: TaskDelegationContext) => root.delegationSource(context);
  return Object.freeze({
    tree, delegation, remote,
    delegate: async (root: DelegatingRoot, context: TaskDelegationContext, input: SpawnTaskInput): Promise<TaskDelegationOutcome> => {
      const source = await sourceOf(root, context);
      if (!("sender" in source)) return source;
      if (input.node !== undefined) return remote.delegate({ ...input, node: input.node }, source);
      return delegation.toNewRun({ sender: source.sender, senderRun: source.senderRun, spawn: input,
        resolvePlacement: (work, folder) => source.resolvePlacement(input.recipient_address, work, folder) });
    },
    assign: async (root: DelegatingRoot, context: TaskDelegationContext, input: AssignToExistingDelegatedRunInput): Promise<TaskDelegationOutcome> => {
      const source = await sourceOf(root, context);
      if (!("sender" in source)) return source;
      return delegation.toExistingRun({ sender: source.sender, senderRun: source.senderRun, assign: input });
    },
  });
};
