import {
  getParentAgentTeamAddress,
  isAgentTeamAddressAncestor,
  type AgentTeamAddress,
} from "../../../../agent-collaboration/domain/agent-team-address.js";
import { CollaborationContractError } from "../../../../agent-collaboration/domain/collaboration-contract-error.js";
import type { InterAgentMessageParticipant } from "../../../domain/inter-agent-message-delivery.js";
import type { MemberLogicalAddressContext } from "../../../domain/member-logical-address-context.js";
import type { TeamExecutionAddress } from "../../../domain/team-execution-address.js";
import type { TeamRun } from "../../../domain/team-run.js";
import type { TeamRunContext } from "../../../domain/team-run-context.js";
import type { TaskTeamInstanceIdentity } from "../../../domain/task-team-instance.js";
import type {
  TaskAgentDirectory,
  TaskAgentDirectoryEntry,
} from "../../../task-delegation/task-agent-directory.js";
import type {
  TaskTeamActiveRunDirectory,
  TaskTeamActiveRunEntry,
} from "../../../task-delegation/task-team-active-run-directory.js";
import type { MixedTeamRunContext } from "../mixed-team-run-context.js";

export type ActiveTaskTeamExecution = Readonly<{
  activeRun: TeamRun;
  taskId: string;
  taskTeamRunIds: readonly string[];
  teamAddress: AgentTeamAddress;
}>;

export class TaskTeamActiveExecutionResolver {
  constructor(private readonly options: {
    rootContext: TeamRunContext<MixedTeamRunContext>;
    taskAgentDirectory: TaskAgentDirectory;
    taskTeamDirectory: TaskTeamActiveRunDirectory;
  }) {}

  resolveMessageSender(
    sender: InterAgentMessageParticipant,
    caller: MemberLogicalAddressContext,
  ): ActiveTaskTeamExecution | null {
    const address = sender.executionAddress;
    const rootTeamRunId = this.rootTeamRunId();
    if (
      address.rootTeamRunId !== rootTeamRunId ||
      caller.rootTeamRunId !== rootTeamRunId ||
      caller.memberAddress !== address.memberAddress
    ) this.reject("the sender root or logical member does not match its execution address");
    const execution = this.resolveChain(address.taskTeamRunIds);
    if (!execution) return null;
    this.assertMessageSender(sender, execution);
    return execution;
  }

  resolveCommandTarget(
    address: TeamExecutionAddress,
  ): ActiveTaskTeamExecution | null {
    const rootTeamRunId = this.rootTeamRunId();
    if (address.rootTeamRunId !== rootTeamRunId) {
      this.reject(`execution root '${address.rootTeamRunId}' does not match '${rootTeamRunId}'`);
    }
    const execution = this.resolveChain(address.taskTeamRunIds);
    if (execution && !this.containsTarget(execution, address.memberAddress)) {
      this.reject(`target '${address.memberAddress}' is outside task AgentTeam '${execution.teamAddress}'`);
    }
    const index = execution?.activeRun.context.index ?? this.options.rootContext.index;
    const node = index.getAgent(address.memberAddress);
    if (!node) this.reject(`target '${address.memberAddress}' is not an executable Agent`);
    if (address.taskAgentRunId) {
      this.assertCommandTaskAgent(address, execution);
    }
    return execution;
  }

  containsTarget(
    execution: ActiveTaskTeamExecution,
    target: AgentTeamAddress,
  ): boolean {
    return isAgentTeamAddressAncestor(execution.teamAddress, target);
  }

  private resolveChain(
    chain: readonly string[],
  ): ActiveTaskTeamExecution | null {
    if (chain.length === 0) return null;
    const entries: TaskTeamActiveRunEntry[] = [];
    for (let index = 0; index < chain.length; index += 1) {
      const taskTeamRunId = chain[index];
      const entry = this.options.taskTeamDirectory
        .resolveActiveEntryByTaskTeamRunId(taskTeamRunId);
      if (!entry) this.reject(`task TeamRun '${taskTeamRunId}' is missing or inactive`);
      this.assertEntry(entry, chain.slice(0, index + 1), entries.at(-1) ?? null);
      entries.push(entry);
    }
    const leaf = entries.at(-1)!;
    return Object.freeze({
      activeRun: leaf.activeRun,
      taskId: leaf.taskId,
      taskTeamRunIds: Object.freeze([...chain]),
      teamAddress: leaf.memberAddress,
    });
  }

  private assertEntry(
    entry: TaskTeamActiveRunEntry,
    expectedChain: readonly string[],
    parent: TaskTeamActiveRunEntry | null,
  ): void {
    const taskTeamRunId = expectedChain.at(-1)!;
    const run = entry.activeRun;
    const runtime = run.getRuntimeContext() as MixedTeamRunContext | null;
    const teamNode = run.context.index.getTeam(entry.memberAddress);
    const parentAddress = getParentAgentTeamAddress(entry.memberAddress);
    const expectedParentAddress = parent?.memberAddress ?? parentAddress;
    const persistentParent = parentAddress
      ? this.options.rootContext.index.getTeam(parentAddress)
      : null;
    const expectedParentTeamRunId = parent?.taskTeamRunId ?? persistentParent?.teamRunId ?? null;
    const rootTeamRunId = this.rootTeamRunId();
    if (
      taskTeamRunId !== taskTeamRunId.trim() ||
      entry.taskTeamRunId !== taskTeamRunId ||
      entry.identity.taskTeamRunId !== taskTeamRunId ||
      entry.parentTeamRunId !== expectedParentTeamRunId ||
      entry.identity.parentTeamRunId !== expectedParentTeamRunId ||
      entry.taskId !== entry.identity.taskId ||
      run.teamRunId !== taskTeamRunId ||
      run.context.teamRunId !== taskTeamRunId ||
      run.context.teamAddress !== entry.memberAddress ||
      run.context.config.rootTeam.teamRunId !== rootTeamRunId ||
      parentAddress !== expectedParentAddress ||
      !teamNode ||
      teamNode.teamRunId !== taskTeamRunId ||
      !runtime ||
      !this.sameChain(run.context.taskTeamRunIds, expectedChain) ||
      !this.sameChain(runtime.teamExecutionAddress.taskTeamRunIds, expectedChain) ||
      runtime.teamExecutionAddress.rootTeamRunId !== rootTeamRunId ||
      runtime.teamExecutionAddress.memberAddress !== entry.memberAddress ||
      runtime.teamExecutionAddress.taskAgentRunId !== null ||
      !this.sameIdentity(runtime.taskTeamInstance, entry.identity)
    ) this.reject(`task TeamRun '${taskTeamRunId}' has a foreign, reordered, truncated, wrong-parent, or wrong-Team binding`);
  }

  private assertMessageSender(
    sender: InterAgentMessageParticipant,
    execution: ActiveTaskTeamExecution,
  ): void {
    const memberAddress = sender.executionAddress.memberAddress;
    if (!this.containsTarget(execution, memberAddress)) {
      this.reject(`sender '${memberAddress}' is outside task AgentTeam '${execution.teamAddress}'`);
    }
    const taskAgentRunId = sender.executionAddress.taskAgentRunId;
    if (taskAgentRunId) {
      const taskAgent = this.assertTaskAgentBinding(sender.executionAddress, execution);
      if (sender.agentRunId !== taskAgentRunId || sender.taskId !== taskAgent.taskId) {
        this.reject(`sender AgentRun '${sender.agentRunId}' does not match task AgentRun '${taskAgentRunId}'`);
      }
      return;
    }
    const node = execution.activeRun.context.index.getAgent(memberAddress);
    if (!node || node.agentRunId !== sender.agentRunId || sender.taskId !== execution.taskId) {
      this.reject(`AgentRun '${sender.agentRunId}' does not belong to the active task AgentTeam execution`);
    }
  }

  private assertCommandTaskAgent(
    address: TeamExecutionAddress,
    execution: ActiveTaskTeamExecution | null,
  ): void {
    this.assertTaskAgentBinding(address, execution);
  }

  private assertTaskAgentBinding(
    address: TeamExecutionAddress,
    execution: ActiveTaskTeamExecution | null,
  ): TaskAgentDirectoryEntry {
    const taskAgentRunId = address.taskAgentRunId!;
    const taskAgent = this.options.taskAgentDirectory.resolveTaskAgentRunId(taskAgentRunId);
    const index = execution?.activeRun.context.index ?? this.options.rootContext.index;
    const owningTeamAddress = getParentAgentTeamAddress(address.memberAddress);
    const owningTeam = owningTeamAddress ? index.getTeam(owningTeamAddress) : null;
    if (
      !taskAgent ||
      !owningTeam ||
      taskAgent.teamRunId !== this.rootTeamRunId() ||
      taskAgent.taskId !== taskAgent.taskAgentInstance.taskId ||
      taskAgent.memberAddress !== address.memberAddress ||
      taskAgent.taskAgentInstance.taskAgentRunId !== taskAgentRunId ||
      taskAgent.taskAgentInstance.owningTeamRunId !== owningTeam.teamRunId ||
      taskAgent.delegator.executionAddress.rootTeamRunId !== this.rootTeamRunId() ||
      !this.sameChain(
        taskAgent.delegator.executionAddress.taskTeamRunIds,
        address.taskTeamRunIds,
      )
    ) this.reject(`task AgentRun '${taskAgentRunId}' does not belong to the exact Team execution`);
    return taskAgent;
  }

  private sameChain(actual: readonly string[], expected: readonly string[]): boolean {
    return actual.length === expected.length &&
      actual.every((taskTeamRunId, index) => taskTeamRunId === expected[index]);
  }

  private sameIdentity(
    actual: TaskTeamInstanceIdentity | null,
    expected: TaskTeamInstanceIdentity,
  ): boolean {
    return Boolean(actual) &&
      actual!.taskTeamInstanceId === expected.taskTeamInstanceId &&
      actual!.taskTeamRunId === expected.taskTeamRunId &&
      actual!.parentTeamRunId === expected.parentTeamRunId &&
      actual!.taskId === expected.taskId &&
      actual!.createdAt === expected.createdAt;
  }

  private rootTeamRunId(): string {
    return this.options.rootContext.config.rootTeam.teamRunId;
  }

  private reject(detail: string): never {
    throw new CollaborationContractError(
      "COLLABORATION_CONTEXT_REQUIRED",
      `Team execution is invalid: ${detail}.`,
    );
  }
}
