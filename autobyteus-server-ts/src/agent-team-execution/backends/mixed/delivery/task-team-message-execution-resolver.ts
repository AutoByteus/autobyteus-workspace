import {
  getParentAgentTeamAddress,
  isAgentTeamAddressAncestor,
  type AgentTeamAddress,
} from "../../../../agent-collaboration/domain/agent-team-address.js";
import { CollaborationContractError } from "../../../../agent-collaboration/domain/collaboration-contract-error.js";
import type { InterAgentMessageParticipant } from "../../../domain/inter-agent-message-delivery.js";
import type { MemberLogicalAddressContext } from "../../../domain/member-logical-address-context.js";
import type { TeamRun } from "../../../domain/team-run.js";
import type { TeamRunContext } from "../../../domain/team-run-context.js";
import type { TaskTeamInstanceIdentity } from "../../../domain/task-team-instance.js";
import type { TaskAgentDirectory } from "../../../task-delegation/task-agent-directory.js";
import type {
  TaskTeamActiveRunDirectory,
  TaskTeamActiveRunEntry,
} from "../../../task-delegation/task-team-active-run-directory.js";
import type { MixedTeamRunContext } from "../mixed-team-run-context.js";

export type ActiveTaskTeamMessageExecution = Readonly<{
  activeRun: TeamRun;
  taskId: string;
  taskTeamRunIds: readonly string[];
  teamAddress: AgentTeamAddress;
}>;

export class TaskTeamMessageExecutionResolver {
  constructor(private readonly options: {
    rootContext: TeamRunContext<MixedTeamRunContext>;
    taskAgentDirectory: TaskAgentDirectory;
    taskTeamDirectory: TaskTeamActiveRunDirectory;
  }) {}

  resolve(
    sender: InterAgentMessageParticipant,
    caller: MemberLogicalAddressContext,
  ): ActiveTaskTeamMessageExecution | null {
    const chain = sender.executionAddress.taskTeamRunIds;
    if (chain.length === 0) return null;
    const rootTeamRunId = this.options.rootContext.config.rootTeam.teamRunId;
    if (
      sender.executionAddress.rootTeamRunId !== rootTeamRunId ||
      caller.rootTeamRunId !== rootTeamRunId ||
      caller.memberAddress !== sender.executionAddress.memberAddress
    ) this.reject("the sender root or logical member does not match its execution address");

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
    this.assertSender(sender, leaf);
    return Object.freeze({
      activeRun: leaf.activeRun,
      taskId: leaf.taskId,
      taskTeamRunIds: Object.freeze([...chain]),
      teamAddress: leaf.memberAddress,
    });
  }

  containsTarget(
    execution: ActiveTaskTeamMessageExecution,
    target: AgentTeamAddress,
  ): boolean {
    return isAgentTeamAddressAncestor(execution.teamAddress, target);
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
    const rootTeamRunId = this.options.rootContext.config.rootTeam.teamRunId;
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

  private assertSender(
    sender: InterAgentMessageParticipant,
    leaf: TaskTeamActiveRunEntry,
  ): void {
    const memberAddress = sender.executionAddress.memberAddress;
    if (!isAgentTeamAddressAncestor(leaf.memberAddress, memberAddress)) {
      this.reject(`sender '${memberAddress}' is outside task AgentTeam '${leaf.memberAddress}'`);
    }
    const taskAgentRunId = sender.executionAddress.taskAgentRunId;
    if (taskAgentRunId) {
      const taskAgent = this.options.taskAgentDirectory.resolveTaskAgentRunId(taskAgentRunId);
      const owningTeamAddress = getParentAgentTeamAddress(memberAddress);
      const owningTeam = owningTeamAddress
        ? leaf.activeRun.context.index.getTeam(owningTeamAddress)
        : null;
      if (
        !taskAgent ||
        !owningTeam ||
        sender.agentRunId !== taskAgentRunId ||
        sender.taskId !== taskAgent.taskId ||
        taskAgent.teamRunId !== this.options.rootContext.config.rootTeam.teamRunId ||
        taskAgent.memberAddress !== memberAddress ||
        taskAgent.taskAgentInstance.taskAgentRunId !== taskAgentRunId ||
        taskAgent.taskAgentInstance.owningTeamRunId !== owningTeam.teamRunId
      ) this.reject(`task AgentRun '${taskAgentRunId}' does not belong to the active task AgentTeam execution`);
      return;
    }
    const node = leaf.activeRun.context.index.getAgent(memberAddress);
    if (!node || node.agentRunId !== sender.agentRunId || sender.taskId !== leaf.taskId) {
      this.reject(`AgentRun '${sender.agentRunId}' does not belong to the active task AgentTeam execution`);
    }
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

  private reject(detail: string): never {
    throw new CollaborationContractError(
      "COLLABORATION_CONTEXT_REQUIRED",
      `Task AgentTeam message execution is invalid: ${detail}.`,
    );
  }
}
