import type { CollaborationMemberExecutionIdentity } from '../execution/domain/root-execution-identity.js';
import type { TaskDelegationContext, DelegateTaskResult } from '../execution/task/task-delegation-command.js';
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
    ensureTaskHelper(context: TaskDelegationContext, address: string, placement: T): Promise<DelegateTaskResult>;
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
      const result = await input.lifecycle.ensureTaskHelper({ identity: input.sender }, address, placement);
      if (result.target_agent_run_id === null) throw new Error(result.message);
      return messagePlacement(placement.kind, address, input.getAgent(result.target_agent_run_id));
    },
  };
}
