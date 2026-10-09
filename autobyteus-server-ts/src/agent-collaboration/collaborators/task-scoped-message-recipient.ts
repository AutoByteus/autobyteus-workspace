import type { CollaborationMemberExecutionIdentity } from '../execution/domain/root-execution-identity.js';
import type { TaskDelegationContext } from '../execution/task/task-delegation-command.js';
import type { TaskExecutionTarget } from '../execution/task/root-task-execution-adapter.js';
import type { AgentTeamAddress } from '../domain/agent-team-address.js';
import { messagePlacement, type CollaborationMessagePlacement, type resolveMessageRecipient } from './message-recipient-resolution.js';
import type { DelegationPlacement } from './catalog-delegation.js';

type TaskScope = NonNullable<Parameters<typeof resolveMessageRecipient>[0]['taskScope']>;
/** Adapt the root's owned-copy boundary to addressing; catalog admission stays out of this branch. */
export function taskScopedMessageRecipient<T extends DelegationPlacement>(input: {
  sender: CollaborationMemberExecutionIdentity;
  lifecycle: {
    taskOwnerOf(agentRunId: string): Readonly<{ taskId: string }> | null;
    helperPlacement(taskId: string, address: string): CollaborationMessagePlacement | null;
    ensureTaskHelper(context: TaskDelegationContext, address: string, placement: T): Promise<TaskExecutionTarget>;
  };
  resolvePlacement(address: AgentTeamAddress): Promise<T>;
  getAgent(id: string): Readonly<{ agentRunId: string; address: AgentTeamAddress }>;
}): TaskScope {
  return {
    taskOwnerOf: id => input.lifecycle.taskOwnerOf(id),
    helper: (taskId, address) => {
      const helper = input.lifecycle.helperPlacement(taskId, address);
      return helper ? messagePlacement(helper.kind, address, input.getAgent(helper.receiver.agentRunId)) : null;
    },
    bringIn: async address => {
      const placement = await input.resolvePlacement(address);
      const helper = await input.lifecycle.ensureTaskHelper({ identity: input.sender }, address, placement);
      return messagePlacement(placement.kind, address, input.getAgent(helper.ingressAgentRunId));
    },
  };
}
