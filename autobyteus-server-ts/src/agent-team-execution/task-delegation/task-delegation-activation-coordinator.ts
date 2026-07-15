import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { SenderType } from "autobyteus-ts/agent/sender-type.js";
import { AgentRunIdentityAllocator } from "../../agent-execution/services/agent-run-identity-allocator.js";
import type { TeamRun } from "../domain/team-run.js";
import type { TeamMemberRunConfig, TeamRunMemberConfig } from "../domain/team-run-config.js";
import type { TaskAgentDirectory } from "./task-agent-directory.js";
import { getTaskExecutionKind } from "./task-execution-instance.js";
import type { ActiveTaskDelegationStartingEntry } from "./task-delegation-active-entry.js";
import type { TaskDelegationLedger } from "./task-delegation-ledger.js";
import {
  TaskDelegationError,
  type TaskDelegationActivationResult,
  type TaskDelegationDelegatorIdentity,
} from "./task-delegation-record.js";
import type { TaskDelegationMemberIdentity } from "./task-delegation-target.js";
import { getTaskDelegationTargetName } from "./task-delegation-target.js";
import { buildTaskAgentInstanceIdentity } from "./task-agent-instance-identity.js";
import { TaskDelegationVisibleNotificationRenderer } from "./task-delegation-visible-notification-renderer.js";
import { TaskDelegationWorkPacketRenderer } from "./task-delegation-work-packet-renderer.js";
import { TaskTeamRunIdentityFactory } from "./task-team-run-identity-factory.js";
import { markTaskDelegationSystemTaskNotificationMetadata } from "./task-delegation-system-message-visibility.js";

type DelegatorReplySelector = {
  recipientName: string | null;
  targetAgentRunId: string | null;
};

type AgentRunIdentityAllocatorLike = Pick<AgentRunIdentityAllocator, "allocateForAgentDefinition">;

export class TaskDelegationActivationCoordinator {
  constructor(
    private readonly ledger: TaskDelegationLedger,
    private readonly taskAgentDirectory: TaskAgentDirectory,
    private readonly renderer = new TaskDelegationWorkPacketRenderer(),
    private readonly visibleNotificationRenderer = new TaskDelegationVisibleNotificationRenderer(),
    private readonly agentRunIdentityAllocator: AgentRunIdentityAllocatorLike = AgentRunIdentityAllocator.getInstance(),
    private readonly taskTeamRunIdentityFactory = new TaskTeamRunIdentityFactory(agentRunIdentityAllocator),
  ) {}

  async activateTask(
    teamRun: TeamRun,
    taskId: string,
  ): Promise<TaskDelegationActivationResult> {
    const entry = this.ledger.getStartingEntry(taskId);
    if (!entry) throw new TaskDelegationError("TASK_NOT_FOUND", `Delegated task '${taskId}' was not found or is already active.`);
    return entry.target.kind === "member"
      ? this.activateMemberTask(teamRun, entry.taskId, entry.target.member)
      : this.activateTeamTask(teamRun, entry.taskId, entry.target.team);
  }

  private async activateMemberTask(
    teamRun: TeamRun,
    taskId: string,
    member: TaskDelegationMemberIdentity,
  ): Promise<TaskDelegationActivationResult> {
    let taskAgentRunId: string;
    try {
      const targetMemberConfig = this.resolveTargetAgentMemberConfig(teamRun, member);
      taskAgentRunId = await this.agentRunIdentityAllocator.allocateForAgentDefinition(targetMemberConfig.agentDefinitionId);
    } catch (error) {
      return this.rejected("member", member.memberName, taskId, error);
    }

    const taskAgentInstance = buildTaskAgentInstanceIdentity({
      teamRunId: this.ledger.teamRunId,
      taskId,
      taskAgentRunId,
      logicalMember: member,
    });
    const entryBeforeBind = this.ledger.getStartingEntry(taskId)!;
    const delegatorReply = this.resolveDelegatorReplySelector(entryBeforeBind.reviewOwner);
    try {
      this.taskAgentDirectory.registerStartingTask({
        taskId,
        logicalMember: member,
        delegator: entryBeforeBind.reviewOwner,
        taskAgentInstance,
        delegatorReplyRecipientName: delegatorReply.recipientName,
        delegatorReplyTargetAgentRunId: delegatorReply.targetAgentRunId,
      });
      const entry = this.ledger.bindTaskAgent({
        taskId,
        taskAgentInstance,
        delegatorReplyRecipientName: delegatorReply.recipientName,
        delegatorReplyTargetAgentRunId: delegatorReply.targetAgentRunId,
      });
      const result = await teamRun.startTaskAgentInstance({
        identity: taskAgentInstance,
        message: this.buildWorkPacketMessage(entry, {
          target_agent_run_id: taskAgentInstance.taskAgentRunId,
          message_type: "task_delegation_work_packet",
        }),
      });
      if (!result.accepted) this.rollbackStartingTask(taskId);
      else this.taskAgentDirectory.markActive(taskId);
      const current = this.ledger.getStartingEntry(taskId) ?? entry;
      return this.resultFromEntry(current, result.accepted, result.message ?? null);
    } catch (error) {
      this.rollbackStartingTask(taskId);
      return this.rejected("member", member.memberName, taskId, error);
    }
  }

  private async activateTeamTask(
    teamRun: TeamRun,
    taskId: string,
    team: import("./task-delegation-target.js").TaskDelegationTeamIdentity,
  ): Promise<TaskDelegationActivationResult> {
    const entryBeforeBind = this.ledger.getStartingEntry(taskId)!;
    const delegatorReply = this.resolveDelegatorReplySelector(entryBeforeBind.reviewOwner);
    let materialization: Awaited<ReturnType<TaskTeamRunIdentityFactory["create"]>>;
    try {
      materialization = await this.taskTeamRunIdentityFactory.create({ teamRun, taskId, teamTarget: team });
    } catch (error) {
      return this.rejected("team", team.memberName, taskId, error);
    }
    try {
      const entry = this.ledger.bindTaskTeam({
        taskId,
        taskTeamInstance: materialization.identity,
        delegatorReplyRecipientName: delegatorReply.recipientName,
        delegatorReplyTargetAgentRunId: delegatorReply.targetAgentRunId,
      });
      const result = await teamRun.startTaskTeamInstance({
        identity: materialization.identity,
        teamConfig: materialization.teamConfig,
        message: this.buildWorkPacketMessage(entry, {
          task_team_run_id: materialization.identity.taskTeamRunId,
          task_team_instance_id: materialization.identity.taskTeamInstanceId,
          message_type: "task_team_delegation_work_packet",
        }),
      });
      if (!result.accepted) this.rollbackStartingTask(taskId, true);
      const current = this.ledger.getStartingEntry(taskId) ?? entry;
      return this.resultFromEntry(current, result.accepted, result.message ?? null);
    } catch (error) {
      this.rollbackStartingTask(taskId, true);
      return this.rejected("team", team.memberName, taskId, error);
    }
  }

  private buildWorkPacketMessage(
    entry: ActiveTaskDelegationStartingEntry,
    metadata: Record<string, unknown>,
  ): AgentInputUserMessage {
    return new AgentInputUserMessage(
      this.renderer.render([entry]),
      SenderType.SYSTEM,
      null,
      markTaskDelegationSystemTaskNotificationMetadata({
        sender_id: "system.task_delegation",
        team_run_id: this.ledger.teamRunId,
        task_id: entry.taskId,
        task_ids: [entry.taskId],
        execution_kind: entry.boundExecution?.kind ?? null,
        ...metadata,
      }, {
        displayContent: this.visibleNotificationRenderer.renderActivation(entry),
      }),
    );
  }


  private resultFromEntry(
    entry: ActiveTaskDelegationStartingEntry,
    accepted: boolean,
    message: string | null,
  ): TaskDelegationActivationResult {
    return {
      target: { kind: entry.target.kind, name: getTaskDelegationTargetName(entry.target) },
      accepted,
      task_id: entry.taskId,
      execution_kind: getTaskExecutionKind(entry.boundExecution),
      task_agent_run_id: entry.boundExecution?.kind === "task_agent" ? entry.boundExecution.taskAgentInstance.taskAgentRunId : null,
      task_team_run_id: entry.boundExecution?.kind === "task_team" ? entry.boundExecution.taskTeamInstance.taskTeamRunId : null,
      message,
    };
  }

  private rejected(
    kind: "member" | "team",
    name: string,
    taskId: string,
    error: unknown,
  ): TaskDelegationActivationResult {
    return {
      target: { kind, name },
      accepted: false,
      task_id: taskId,
      execution_kind: null,
      task_agent_run_id: null,
      task_team_run_id: null,
      message: error instanceof Error ? error.message : String(error),
    };
  }

  private resolveTargetAgentMemberConfig(
    teamRun: TeamRun,
    member: TaskDelegationMemberIdentity,
  ): TeamMemberRunConfig {
    const config = teamRun.config;
    if (!config) {
      throw new TaskDelegationError("TARGET_MEMBER_CONFIG_NOT_FOUND", `Team run '${teamRun.runId}' is missing config needed to allocate task-agent identity for member '${member.memberRouteKey}'.`);
    }
    const target = this.findMemberConfig(config.memberTree, member.memberRouteKey, member.memberRunId);
    if (!target) throw new TaskDelegationError("TARGET_MEMBER_CONFIG_NOT_FOUND", `Member '${member.memberRouteKey}' was not found in team run '${teamRun.runId}' config.`);
    if (target.memberKind !== "agent") throw new TaskDelegationError("TARGET_MEMBER_NOT_AGENT", `Task delegation target '${member.memberRouteKey}' is not an agent member.`);
    return target;
  }

  private findMemberConfig(
    members: readonly TeamRunMemberConfig[],
    memberRouteKey: string,
    memberRunId: string,
  ): TeamRunMemberConfig | null {
    for (const member of members) {
      if (member.memberRouteKey === memberRouteKey || member.memberRunId === memberRunId) return member;
      if (member.memberKind === "agent_team") {
        const child = this.findMemberConfig(member.memberConfigs, memberRouteKey, memberRunId);
        if (child) return child;
      }
    }
    return null;
  }

  private resolveDelegatorReplySelector(delegator: TaskDelegationDelegatorIdentity): DelegatorReplySelector {
    const parentTaskAgentRunId = delegator.taskAgentRunId?.trim() || null;
    return parentTaskAgentRunId
      ? { recipientName: null, targetAgentRunId: parentTaskAgentRunId }
      : { recipientName: delegator.memberName, targetAgentRunId: null };
  }

  private rollbackStartingTask(taskId: string, taskTeamTask = false): void {
    if (!taskTeamTask) this.taskAgentDirectory.unregisterStartingTask(taskId);
  }
}
