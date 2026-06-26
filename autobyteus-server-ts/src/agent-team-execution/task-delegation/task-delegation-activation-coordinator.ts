import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { SenderType } from "autobyteus-ts/agent/sender-type.js";
import { AgentRunIdentityAllocator } from "../../agent-execution/services/agent-run-identity-allocator.js";
import type { TeamRun } from "../domain/team-run.js";
import type { TeamMemberRunConfig, TeamRunMemberConfig } from "../domain/team-run-config.js";
import type { TaskAgentDirectory } from "./task-agent-directory.js";
import { getTaskExecutionKind } from "./task-execution-instance.js";
import type { TaskDelegationLedger } from "./task-delegation-ledger.js";
import {
  TaskDelegationError,
  type TaskDelegationActivationResult,
  type TaskDelegationDelegatorIdentity,
} from "./task-delegation-record.js";
import type { TaskDelegationMemberIdentity } from "./task-delegation-target.js";
import { getTaskDelegationTargetName } from "./task-delegation-target.js";
import { buildTaskAgentInstanceIdentity } from "./task-agent-instance-identity.js";
import { TaskDelegationEventPublisher } from "./task-delegation-event-publisher.js";
import { TaskDelegationWorkPacketRenderer } from "./task-delegation-work-packet-renderer.js";
import { TaskTeamRunIdentityFactory } from "./task-team-run-identity-factory.js";

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
    private readonly eventPublisher = new TaskDelegationEventPublisher(),
    private readonly agentRunIdentityAllocator: AgentRunIdentityAllocatorLike = AgentRunIdentityAllocator.getInstance(),
    private readonly taskTeamRunIdentityFactory = new TaskTeamRunIdentityFactory(agentRunIdentityAllocator),
  ) {}

  async activateTask(
    teamRun: TeamRun,
    taskId: string,
  ): Promise<TaskDelegationActivationResult> {
    const record = this.ledger.getRecord(taskId);
    if (!record) throw new TaskDelegationError("TASK_NOT_FOUND", `Delegated task '${taskId}' was not found.`);
    if (record.status !== "not_started") {
      throw new TaskDelegationError("TASK_ALREADY_ACTIVE", `Delegated task '${taskId}' is already ${record.status}.`);
    }
    return record.target.kind === "member"
      ? this.activateMemberTask(teamRun, record.taskId, record.target.member)
      : this.activateTeamTask(teamRun, record.taskId, record.target.team);
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
    const recordBeforeBind = this.ledger.getRecord(taskId)!;
    const delegatorReply = this.resolveDelegatorReplySelector(recordBeforeBind.delegator);
    try {
      this.taskAgentDirectory.registerStartingTask({
        taskId,
        logicalMember: member,
        delegator: recordBeforeBind.delegator,
        taskAgentInstance,
        delegatorReplyRecipientName: delegatorReply.recipientName,
        delegatorReplyTargetAgentRunId: delegatorReply.targetAgentRunId,
      });
      const record = this.ledger.bindTaskAgent({
        taskId,
        taskAgentInstance,
        delegatorReplyRecipientName: delegatorReply.recipientName,
        delegatorReplyTargetAgentRunId: delegatorReply.targetAgentRunId,
      });
      const result = await teamRun.startTaskAgentInstance({
        identity: taskAgentInstance,
        message: this.buildWorkPacketMessage(record, {
          target_agent_run_id: taskAgentInstance.taskAgentRunId,
          message_type: "task_delegation_work_packet",
        }),
      });
      if (!result.accepted) this.rollbackStartingTask(taskId);
      else this.markActiveAndPublish(teamRun, taskId);
      const current = this.ledger.getRecord(taskId) ?? record;
      return this.resultFromRecord(current, result.accepted, result.message ?? null);
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
    const recordBeforeBind = this.ledger.getRecord(taskId)!;
    const delegatorReply = this.resolveDelegatorReplySelector(recordBeforeBind.delegator);
    let materialization: Awaited<ReturnType<TaskTeamRunIdentityFactory["create"]>>;
    try {
      materialization = await this.taskTeamRunIdentityFactory.create({ teamRun, taskId, teamTarget: team });
    } catch (error) {
      return this.rejected("team", team.memberName, taskId, error);
    }
    try {
      const record = this.ledger.bindTaskTeam({
        taskId,
        taskTeamInstance: materialization.identity,
        delegatorReplyRecipientName: delegatorReply.recipientName,
        delegatorReplyTargetAgentRunId: delegatorReply.targetAgentRunId,
      });
      const result = await teamRun.startTaskTeamInstance({
        identity: materialization.identity,
        teamConfig: materialization.teamConfig,
        message: this.buildWorkPacketMessage(record, {
          task_team_run_id: materialization.identity.taskTeamRunId,
          task_team_instance_id: materialization.identity.taskTeamInstanceId,
          message_type: "task_team_delegation_work_packet",
        }),
      });
      if (!result.accepted) this.rollbackStartingTask(taskId, true);
      else this.markActiveAndPublish(teamRun, taskId);
      const current = this.ledger.getRecord(taskId) ?? record;
      return this.resultFromRecord(current, result.accepted, result.message ?? null);
    } catch (error) {
      this.rollbackStartingTask(taskId, true);
      return this.rejected("team", team.memberName, taskId, error);
    }
  }

  private buildWorkPacketMessage(
    record: NonNullable<ReturnType<TaskDelegationLedger["getRecord"]>>,
    metadata: Record<string, unknown>,
  ): AgentInputUserMessage {
    return new AgentInputUserMessage(
      this.renderer.render([record]),
      SenderType.SYSTEM,
      null,
      {
        sender_id: "system.task_delegation",
        team_run_id: this.ledger.teamRunId,
        task_id: record.taskId,
        task_ids: [record.taskId],
        execution_kind: record.execution?.kind ?? null,
        ...metadata,
      },
    );
  }

  private markActiveAndPublish(teamRun: TeamRun, taskId: string): void {
    const activeRecord = this.ledger.markActive(taskId);
    if (activeRecord.execution?.kind === "task_agent") this.taskAgentDirectory.markActive(taskId);
    this.eventPublisher.publishActivated({ teamRun, teamRunId: this.ledger.teamRunId, record: activeRecord });
  }

  private resultFromRecord(
    record: NonNullable<ReturnType<TaskDelegationLedger["getRecord"]>>,
    accepted: boolean,
    message: string | null,
  ): TaskDelegationActivationResult {
    return {
      target: { kind: record.target.kind, name: getTaskDelegationTargetName(record.target) },
      accepted,
      task_id: record.taskId,
      execution_kind: getTaskExecutionKind(record.execution),
      task_agent_run_id: record.execution?.kind === "task_agent" ? record.execution.taskAgentInstance.taskAgentRunId : null,
      task_team_run_id: record.execution?.kind === "task_team" ? record.execution.taskTeamInstance.taskTeamRunId : null,
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
    this.ledger.markNotStarted(taskId);
  }
}
