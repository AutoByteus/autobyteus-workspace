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
    lifetimeForAgent(id: string): { lifetimeId: string } | undefined;
    helperPlacement(id: string, address: string): CollaborationMessagePlacement | null;
    ensureLifetimeHelper(context: TaskDelegationContext, address: string, placement: T): Promise<DelegateTaskResult>;
  };
  resolvePlacement(address: AgentTeamAddress): Promise<T>;
  getAgent(id: string): Readonly<{ agentRunId: string; address: AgentTeamAddress }>;
}): TaskScope {
  return {
    lifetimeForAgent: id => input.lifecycle.lifetimeForAgent(id),
    helper: (id, address) => {
      const helper = input.lifecycle.helperPlacement(id, address);
      return helper ? messagePlacement(helper.kind, address, input.getAgent(helper.receiver.agentRunId)) : null;
    },
    bringIn: async address => {
      const placement = await input.resolvePlacement(address);
      const result = await input.lifecycle.ensureLifetimeHelper({ identity: input.sender }, address, placement);
      if (result.target_agent_run_id === null) throw new Error(result.message);
      return messagePlacement(placement.kind, address, input.getAgent(result.target_agent_run_id));
    },
  };
}
