import type { AgentOperationResult } from "../../../agent-execution/domain/agent-operation-result.js";
import type { RemoteTaskExecution } from "../../../run-history/domain/run-execution-tree-shared-records.js";
import type {
  PreparedTaskExecutionActivation,
  TaskExecutionActivationCommitResult,
  TaskExecutionActivationOperation,
} from "../task/root-task-execution-adapter.js";

/**
 * The remote variant of a task activation (DS-001, SR-014). The peer already created the run, without work,
 * when the root planned the activation (that is where the run's ID comes from), and the Task link is written
 * between planning and this operation, by the unchanged lifecycle. Then:
 * - `prepare` does nothing remote;
 * - `commit` writes the root's remote link, an Agent or a Team link (the root's one atomic tree write);
 * - `acceptSeed` sends the work packet, so the remote run can never reply before this node knows the link.
 * There is no local authority to cancel or release: a refused or abandoned prepared run expires on the peer.
 */
export const beginRemoteTaskActivation = (input: Readonly<{
  link: RemoteTaskExecution;
  /** The run the work packet starts: the Agent run, or the Team run's coordinator. */
  ingressAgentRunId: string;
  commitLink(link: RemoteTaskExecution): Promise<TaskExecutionActivationCommitResult>;
  sendWorkPacket(): Promise<AgentOperationResult>;
}>): TaskExecutionActivationOperation => {
  let cancelled = false;
  const assertAccepting = () => { if (cancelled) throw new Error("Task activation is closed."); };
  return Object.freeze({
    cancel: () => { cancelled = true; },
    release: async () => { cancelled = true; return { accepted: true }; },
    prepare: async (): Promise<PreparedTaskExecutionActivation> => {
      assertAccepting();
      let committed = false;
      return Object.freeze({
        targetAgentRunId: input.ingressAgentRunId,
        commit: async () => {
          assertAccepting();
          const result = await input.commitLink(input.link);
          committed = result.committed;
          return result;
        },
        acceptSeed: async (assertOpen: () => void) => {
          assertAccepting();
          if (!committed) throw new Error("Task seed has no durable activation.");
          assertOpen();
          return input.sendWorkPacket();
        },
      });
    },
  });
};
