import { DelegationTree } from "../../src/agent-collaboration/delegation/delegation-tree.js";
import { bindDelegationTree, unbindDelegationTree } from "../../src/agent-collaboration/delegation/delegation-tree-binding.js";
import { TaskDelegation } from "../../src/agent-collaboration/execution/task/task-delegation.js";
import { bindTaskDelegation, unbindTaskDelegation } from "../../src/agent-collaboration/execution/task/task-delegation-binding.js";
import type { InMemoryTaskExecutionResources } from "../fixtures/task-execution-resource-fixtures.js";
import type { RemoteRunChannel } from "../../src/agent-collaboration/execution/remote/remote-run-channel.js";

const notInThisTest = async (): Promise<never> => { throw new Error("A local run is not started in this test."); };

/**
 * Binds a node's Task side for a test (autobyteus-461): the delegation tree over its Task records and the process
 * `TaskDelegation`, as the composition binds them. Only peer delegation is exercised: starting a local run refuses.
 * Returns the release, for `afterEach`.
 */
export const bindTestTaskSide = (tasks: InMemoryTaskExecutionResources, channel?: () => RemoteRunChannel | null): (() => void) => {
  const tree = new DelegationTree(() => tasks);
  tree.build();
  tasks.setEntriesListener(tree);
  bindDelegationTree(tree);
  const delegation = new TaskDelegation({
    tasks: () => tasks, tree: () => tree,
    starter: { startAgent: notInThisTest, startTeam: notInThisTest } as never,
    deliverWorkPacket: notInThisTest, discard: async () => undefined, recordCollaborating: async () => undefined,
    ...(channel ? { channel } : {}),
  });
  bindTaskDelegation(delegation);
  return () => { unbindTaskDelegation(delegation); unbindDelegationTree(tree); };
};
