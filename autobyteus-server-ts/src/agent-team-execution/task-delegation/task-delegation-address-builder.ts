import { createTeamExecutionAddress, type TeamExecutionAddress } from "../domain/team-execution-address.js";
import type { TaskExecutionInstance } from "./task-execution-instance.js";
import type { TaskDelegationCallerIdentity } from "./task-delegation-record.js";
import type { TaskDelegationTarget } from "./task-delegation-target.js";

export class TaskDelegationAddressBuilder {
  constructor(private readonly currentTeamExecution: TeamExecutionAddress) {}
  buildCallerAddress(caller: TaskDelegationCallerIdentity) { return createTeamExecutionAddress(caller.executionAddress); }
  buildTargetAddress(target: TaskDelegationTarget) { return createTeamExecutionAddress({ ...this.currentTeamExecution, memberAddress: target.address, taskAgentRunId: null }); }
  buildTaskRunAddress(execution: TaskExecutionInstance, targetAddress: TeamExecutionAddress) {
    return execution.kind === "task_agent"
      ? createTeamExecutionAddress({ ...targetAddress, taskAgentRunId: execution.taskAgentInstance.taskAgentRunId })
      : createTeamExecutionAddress({ ...targetAddress, taskTeamRunIds: [...targetAddress.taskTeamRunIds, execution.taskTeamInstance.taskTeamRunId], taskAgentRunId: null });
  }
  buildTaskTeamIngressAddress(taskRunAddress: TeamExecutionAddress, coordinatorAddress: string) {
    return createTeamExecutionAddress({ ...taskRunAddress, memberAddress: coordinatorAddress, taskAgentRunId: null });
  }
  buildSubmissionSenderAddress(address: TeamExecutionAddress) { return createTeamExecutionAddress(address); }
  buildSubmissionReceiverAddress(address: TeamExecutionAddress) { return createTeamExecutionAddress(address); }
  buildReviewSenderAddress(address: TeamExecutionAddress) { return createTeamExecutionAddress(address); }
  buildReviewReceiverAddress(address: TeamExecutionAddress) { return createTeamExecutionAddress(address); }
}
