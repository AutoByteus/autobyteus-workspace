import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { SenderType } from "autobyteus-ts/agent/sender-type.js";
import { AgentRunIdentityAllocator } from "../../agent-execution/services/agent-run-identity-allocator.js";
import type { TeamRun } from "../domain/team-run.js";
import type { TeamMemberRunConfig, TeamRunMemberConfig } from "../domain/team-run-config.js";
import type { TaskAgentDirectory } from "./task-agent-directory.js";
import type { TaskDelegationLedger } from "./task-delegation-ledger.js";
import {
  TaskDelegationError,
  type TaskDelegationActivationResult,
  type TaskDelegationDelegatorIdentity,
  type TaskDelegationMemberIdentity,
} from "./task-delegation-record.js";
import { buildTaskAgentInstanceIdentity } from "./task-agent-instance-identity.js";
import { TaskDelegationEventPublisher } from "./task-delegation-event-publisher.js";
import { TaskDelegationWorkPacketRenderer } from "./task-delegation-work-packet-renderer.js";

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
  ) {}

  async activateTask(
    teamRun: TeamRun,
    taskId: string,
  ): Promise<TaskDelegationActivationResult> {
    const runnableRecord = this.ledger.getRecord(taskId);
    if (!runnableRecord) {
      throw new TaskDelegationError(
        "TASK_NOT_FOUND",
        `Delegated task '${taskId}' was not found.`,
      );
    }
    if (runnableRecord.status !== "not_started") {
      throw new TaskDelegationError(
        "TASK_ALREADY_ACTIVE",
        `Delegated task '${taskId}' is already ${runnableRecord.status}.`,
      );
    }

    let taskAgentRunId: string;
    try {
      const targetMemberConfig = this.resolveTargetAgentMemberConfig(
        teamRun,
        runnableRecord.member,
      );
      taskAgentRunId = await this.agentRunIdentityAllocator.allocateForAgentDefinition(
        targetMemberConfig.agentDefinitionId,
      );
    } catch (error) {
      return {
        memberName: runnableRecord.member.memberName,
        accepted: false,
        task_id: runnableRecord.taskId,
        target_agent_run_id: null,
        message: error instanceof Error ? error.message : String(error),
      };
    }

    const taskAgentInstance = buildTaskAgentInstanceIdentity({
      teamRunId: this.ledger.teamRunId,
      taskId: runnableRecord.taskId,
      taskAgentRunId,
      logicalMember: runnableRecord.member,
    });
    const delegatorReply = this.resolveDelegatorReplySelector(runnableRecord.delegator);
    try {
      this.taskAgentDirectory.registerStartingTask({
        taskId: runnableRecord.taskId,
        logicalMember: runnableRecord.member,
        delegator: runnableRecord.delegator,
        taskAgentInstance,
        delegatorReplyRecipientName: delegatorReply.recipientName,
        delegatorReplyTargetAgentRunId: delegatorReply.targetAgentRunId,
      });
    } catch (error) {
      return {
        memberName: runnableRecord.member.memberName,
        accepted: false,
        task_id: runnableRecord.taskId,
        target_agent_run_id: null,
        message: error instanceof Error ? error.message : String(error),
      };
    }

    let record = runnableRecord;
    try {
      record = this.ledger.bindTaskAgent({
        taskId: runnableRecord.taskId,
        taskAgentInstance,
        delegatorReplyRecipientName: delegatorReply.recipientName,
        delegatorReplyTargetAgentRunId: delegatorReply.targetAgentRunId,
      });
      const message = new AgentInputUserMessage(
        this.renderer.render([record]),
        SenderType.SYSTEM,
        null,
        {
          sender_id: "system.task_delegation",
          team_run_id: this.ledger.teamRunId,
          task_id: record.taskId,
          task_ids: [record.taskId],
          target_agent_run_id: taskAgentInstance.taskAgentRunId,
          message_type: "task_delegation_work_packet",
        },
      );
      const result = await teamRun.startTaskAgentInstance({
        identity: taskAgentInstance,
        message,
      });
      if (!result.accepted) {
        this.rollbackStartingTask(record.taskId);
      } else {
        const activeRecord = this.ledger.markActive(record.taskId);
        this.taskAgentDirectory.markActive(record.taskId);
        this.eventPublisher.publishActivated({
          teamRun,
          teamRunId: this.ledger.teamRunId,
          record: activeRecord,
        });
      }
      return {
        memberName: record.member.memberName,
        accepted: result.accepted,
        task_id: record.taskId,
        target_agent_run_id: result.accepted ? taskAgentInstance.taskAgentRunId : null,
        message: result.message ?? null,
      };
    } catch (error) {
      this.rollbackStartingTask(record.taskId);
      return {
        memberName: runnableRecord.member.memberName,
        accepted: false,
        task_id: runnableRecord.taskId,
        target_agent_run_id: null,
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private resolveTargetAgentMemberConfig(
    teamRun: TeamRun,
    member: TaskDelegationMemberIdentity,
  ): TeamMemberRunConfig {
    const config = teamRun.config;
    if (!config) {
      throw new TaskDelegationError(
        "TARGET_MEMBER_CONFIG_NOT_FOUND",
        `Team run '${teamRun.runId}' is missing config needed to allocate task-agent identity for member '${member.memberRouteKey}'.`,
      );
    }
    const target = this.findMemberConfig(config.memberTree, member.memberRouteKey, member.memberRunId);
    if (!target) {
      throw new TaskDelegationError(
        "TARGET_MEMBER_CONFIG_NOT_FOUND",
        `Member '${member.memberRouteKey}' was not found in team run '${teamRun.runId}' config.`,
      );
    }
    if (target.memberKind !== "agent") {
      throw new TaskDelegationError(
        "TARGET_MEMBER_NOT_AGENT",
        `Task delegation target '${member.memberRouteKey}' is not an agent member.`,
      );
    }
    return target;
  }

  private findMemberConfig(
    members: readonly TeamRunMemberConfig[],
    memberRouteKey: string,
    memberRunId: string,
  ): TeamRunMemberConfig | null {
    for (const member of members) {
      if (member.memberRouteKey === memberRouteKey || member.memberRunId === memberRunId) {
        return member;
      }
      if (member.memberKind === "agent_team") {
        const child = this.findMemberConfig(member.memberConfigs, memberRouteKey, memberRunId);
        if (child) {
          return child;
        }
      }
    }
    return null;
  }

  private resolveDelegatorReplySelector(
    delegator: TaskDelegationDelegatorIdentity,
  ): DelegatorReplySelector {
    const parentTaskAgentRunId = delegator.taskAgentRunId?.trim() || null;
    if (parentTaskAgentRunId) {
      return { recipientName: null, targetAgentRunId: parentTaskAgentRunId };
    }
    return { recipientName: delegator.memberName, targetAgentRunId: null };
  }

  private rollbackStartingTask(taskId: string): void {
    this.taskAgentDirectory.unregisterStartingTask(taskId);
    this.ledger.markNotStarted(taskId);
  }
}
