import type { RemoteDelegation } from "../../agent-collaboration/execution/remote/remote-delegation.js";
import type { TaskDelegation } from "../../agent-collaboration/execution/task/task-delegation.js";
import type { DelegateTaskResult } from "../../agent-team-execution/task-delegation/task-delegation-result-contract.js";
import type { TaskDelegationToolContext } from "./task-delegation-tool-contract.js";
import type { DelegateTaskToolInput } from "./task-delegation-tool-input-parsers.js";
import { toDelegateTaskResult } from "./task-delegation-tool-serialization.js";

/**
 * `delegate_task` (autobyteus-461 SR-049): the sender's root answers for its own run (`delegationSource`, in its gate);
 * the delegation itself goes on here, through `TaskDelegation` (a new run, or an existing run by its ID) or, with
 * `node`, `RemoteDelegation`. Created by the composition root with them (SR-047 step 8).
 */
export class TaskDelegationToolService {
  constructor(private readonly delegations: Readonly<{
    delegation: Pick<TaskDelegation, "toNewRun" | "toExistingRun">;
    remote: Pick<RemoteDelegation, "delegate">;
  }>) {}

  async delegateTask(context: TaskDelegationToolContext, input: DelegateTaskToolInput): Promise<DelegateTaskResult> {
    const source = await context.commands.delegationSource(context.identity);
    if (!("sender" in source)) return toDelegateTaskResult(source);
    if (input.subject === "existing_delegated_run") {
      return toDelegateTaskResult(await this.delegations.delegation.toExistingRun({ sender: source.sender, senderRun: source.senderRun, assign: input.input }));
    }
    const spawn = input.input;
    if (spawn.node !== undefined) return toDelegateTaskResult(await this.delegations.remote.delegate({ ...spawn, node: spawn.node }, source));
    return toDelegateTaskResult(await this.delegations.delegation.toNewRun({ sender: source.sender, senderRun: source.senderRun,
      spawn, resolvePlacement: (work, folder) => source.resolvePlacement(spawn.recipient_address, work, folder) }));
  }
}

let processService: TaskDelegationToolService | null = null;

/** The composition root sets the process tool service it created (step 8); the returned function releases it. */
export const setProcessTaskDelegationToolService = (service: TaskDelegationToolService): (() => void) => {
  processService = service;
  return () => { if (processService === service) processService = null; };
};

/** The process tool service, created by the composition root; its callers are the older lookups of FU-011. */
export const getTaskDelegationToolService = (): TaskDelegationToolService => {
  if (!processService) throw new Error("The delegate_task tool service is created by the composition root.");
  return processService;
};
