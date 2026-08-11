import { createTeamExecutionAddress, type TeamExecutionAddress } from "../domain/team-execution-address.js";
import type { ActiveTaskExecutionBinding } from "./active-task-execution-binding.js";
import type { TaskDelegationCallerIdentity } from "./task-delegation-record.js";
import type { TaskDelegationTarget } from "./task-delegation-target.js";

export class TaskDelegationAddressBuilder {
  constructor(private readonly currentTeamExecution: TeamExecutionAddress) {}
  buildCallerAddress(caller: TaskDelegationCallerIdentity) { return createTeamExecutionAddress(caller.executionAddress); }
  buildTargetAddress(target: TaskDelegationTarget) { return createTeamExecutionAddress({ ...this.currentTeamExecution, memberAddress: target.address, taskAgentRunId: null }); }
  buildTaskRunAddress(execution: ActiveTaskExecutionBinding, targetAddress: TeamExecutionAddress) {
    const address = createTeamExecutionAddress(execution.executionAddress);
    if (address.rootTeamRunId !== targetAddress.rootTeamRunId || address.memberAddress !== targetAddress.memberAddress) {
      throw new Error("Task execution binding does not match the delegated target address.");
    }
    return address;
  }
  buildTaskTeamIngressAddress(taskRunAddress: TeamExecutionAddress, coordinatorAddress: string) {
    return createTeamExecutionAddress({ ...taskRunAddress, memberAddress: coordinatorAddress, taskAgentRunId: null });
  }
  buildSubmissionSenderAddress(address: TeamExecutionAddress) { return createTeamExecutionAddress(address); }
  buildSubmissionReceiverAddress(address: TeamExecutionAddress) { return createTeamExecutionAddress(address); }
  buildReviewSenderAddress(address: TeamExecutionAddress) { return createTeamExecutionAddress(address); }
  buildReviewReceiverAddress(address: TeamExecutionAddress) { return createTeamExecutionAddress(address); }
}
