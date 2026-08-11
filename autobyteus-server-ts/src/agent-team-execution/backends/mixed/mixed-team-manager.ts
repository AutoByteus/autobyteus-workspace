import type { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { getAgentTeamAddressBasename, isAgentTeamAddressAncestor, type AgentTeamAddress } from "../../../agent-collaboration/domain/agent-team-address.js";
import { CollaborationContractError, isCollaborationContractError } from "../../../agent-collaboration/domain/collaboration-contract-error.js";
import type { AgentRunManager } from "../../../agent-execution/services/agent-run-manager.js";
import type { AgentOperationResult } from "../../../agent-execution/domain/agent-operation-result.js";
import { createTeamAgentExecutionBinding } from "../../domain/team-agent-execution-binding.js";
import { createTeamAgentStatusDetails, createTeamAgentStatusSnapshot, type TeamAgentStatusSnapshot } from "../../domain/team-agent-status.js";
import type { TeamRunContext } from "../../domain/team-run-context.js";
import type { StartTaskAgentExecutionRequest } from "../../domain/task-agent-execution.js";
import type { StartTaskTeamExecutionRequest } from "../../domain/task-team-execution.js";
import type { InterAgentMessageDeliveryIntent, InterAgentMessageParticipant, ResolvedInterAgentMessageDeliveryRequest } from "../../domain/inter-agent-message-delivery.js";
import { buildDeliveryEndpointForParticipant } from "../../domain/inter-agent-message-delivery.js";
import type { MemberLogicalAddressContext } from "../../domain/member-logical-address-context.js";
import { createTeamExecutionAddress, type TeamExecutionAddress } from "../../domain/team-execution-address.js";
import type { TeamMemberExecutionCommand } from "../../domain/team-member-execution-command.js";
import { resolveRuntimeAgentContext } from "../../domain/team-run-context.js";
import type { TeamRunEvent, TeamRunEventListener, TeamRunEventUnsubscribe } from "../../domain/team-run-event.js";
import type { TeamManager } from "../team-manager.js";
import { MixedTeamRunContext } from "./mixed-team-run-context.js";
import { MixedSubTeamRunFactory } from "./mixed-sub-team-run-factory.js";
import { MixedPersistentMemberRegistry } from "./members/mixed-persistent-member-registry.js";
import { MixedTaskAgentExecutionRegistry } from "./members/mixed-task-agent-execution-registry.js";
import { MixedTaskTeamExecutionRegistry } from "./members/mixed-task-team-execution-registry.js";
import { MixedTeamMemberConfigResolver } from "./members/mixed-team-member-config-resolver.js";
import { TeamMemberDeliveryCoordinator, type LogicalMessageDeliveryRecipient, type ResolvedMessageDeliveryRoute } from "./delivery/team-member-delivery-coordinator.js";
import { TaskTeamActiveExecutionResolver, type ActiveTaskTeamExecution } from "./delivery/task-team-active-execution-resolver.js";
import { disposeTaskAgentDirectory, getTaskAgentDirectory } from "../../task-delegation/task-agent-directory.js";
import { disposeTaskTeamActiveRunDirectoryForParentTeamRun, getTaskTeamActiveRunDirectory } from "../../task-delegation/task-team-active-run-directory.js";
import { TeamRecipientResolver } from "../../services/team-recipient-resolver.js";
import { TaskActivationEventBarrier, type TaskActivationEventLease } from "../../services/task-activation-event-barrier.js";
import type { ResolvedTeamRecipient } from "../../services/resolved-team-recipient.js";
import { buildRunNotFoundResult, isAgentOperationResult } from "./mixed-team-manager-results.js";

export class MixedTeamManager implements TeamManager {
  private teamContext: TeamRunContext<MixedTeamRunContext> | null;
  private lifecycleState: "active" | "terminating" | "terminated" = "active";
  private terminationPromise: Promise<AgentOperationResult> | null = null;
  private readonly persistentMembers: MixedPersistentMemberRegistry;
  private readonly taskAgentExecutions: MixedTaskAgentExecutionRegistry;
  private readonly taskTeamExecutions: MixedTaskTeamExecutionRegistry;
  private readonly deliveryCoordinator: TeamMemberDeliveryCoordinator;
  private readonly taskTeamActiveExecutionResolver: TaskTeamActiveExecutionResolver;
  private readonly recipientResolver = new TeamRecipientResolver();
  private readonly eventListeners = new Set<TeamRunEventListener>();
  private readonly taskActivationEventBarrier = new TaskActivationEventBarrier();

  constructor(context: TeamRunContext<MixedTeamRunContext>, options: { subTeamRunFactory?: MixedSubTeamRunFactory; agentRunManager?: AgentRunManager } = {}) {
    this.teamContext = context;
    const subTeamRunFactory = options.subTeamRunFactory ?? new MixedSubTeamRunFactory({
      buildContext: ({ teamRunId }) => { throw new Error(`Mixed subteam factory was not configured for '${teamRunId}'.`); },
      createTeamManager: () => { throw new Error("Mixed subteam manager factory was not configured."); },
    });
    const configResolver = new MixedTeamMemberConfigResolver(context);
    const callbacks = {
      publish: (event: TeamRunEvent) => this.publish(event),
      deliverInterAgentMessage: (request: InterAgentMessageDeliveryIntent) => this.deliverInterAgentMessage(request),
    };
    const taskAgentDirectory = getTaskAgentDirectory(context.config.rootTeam.teamRunId);
    const taskTeamDirectory = getTaskTeamActiveRunDirectory();
    this.persistentMembers = new MixedPersistentMemberRegistry({ teamContext: context, configResolver, subTeamRunFactory, agentRunManager: options.agentRunManager, ...callbacks });
    this.taskAgentExecutions = new MixedTaskAgentExecutionRegistry({ teamContext: context, configResolver, agentRunManager: options.agentRunManager, ...callbacks });
    this.taskTeamExecutions = new MixedTaskTeamExecutionRegistry({ teamContext: context, subTeamRunFactory, taskTeamActiveRunDirectory: taskTeamDirectory, ...callbacks });
    this.deliveryCoordinator = new TeamMemberDeliveryCoordinator({
      teamContext: context,
      memberRegistry: this.persistentMembers,
      publish: callbacks.publish,
    });
    this.taskTeamActiveExecutionResolver = new TaskTeamActiveExecutionResolver({
      rootContext: context,
      taskAgentDirectory,
      taskTeamDirectory,
    });
  }

  hasActiveMembers(): boolean { return this.lifecycleState === "active" && Boolean(this.teamContext); }

  getLeafAgentStatusSnapshots(): TeamAgentStatusSnapshot[] {
    const context = this.teamContext;
    if (!context) return [];
    const handles = new Map(this.persistentMembers.listHandles().map((handle) => [handle.context.address, handle]));
    const offlineSnapshot = (address: AgentTeamAddress, agentRunId: string): TeamAgentStatusSnapshot => {
      const executionAddress = createTeamExecutionAddress({
        rootTeamRunId: context.config.rootTeam.teamRunId,
        taskTeamRunIds: context.taskTeamRunIds,
        memberAddress: address,
      });
      return createTeamAgentStatusSnapshot({
        execution: createTeamAgentExecutionBinding({ executionAddress, agentRunId }),
        details: createTeamAgentStatusDetails({ status: "offline" }),
      });
    };
    const offlineTeamSnapshots = (teamAddress: AgentTeamAddress): TeamAgentStatusSnapshot[] =>
      context.index.listNodes().flatMap((node) =>
        node.kind === "agent" && isAgentTeamAddressAncestor(teamAddress, node.address)
          ? [offlineSnapshot(node.address, node.agentRunId)]
          : [],
      );
    return [
      ...context.runtimeContext.memberContexts.flatMap((member) => {
        const handle = handles.get(member.address);
        if (handle) return handle.getLeafAgentStatusSnapshots();
        return member.kind === "agent"
          ? [offlineSnapshot(member.address, member.agentRunId)]
          : offlineTeamSnapshots(member.address);
      }),
      ...this.taskAgentExecutions.listHandles().flatMap((handle) => handle.getLeafAgentStatusSnapshots()),
      ...this.taskTeamExecutions.listHandles().flatMap((handle) => handle.getLeafAgentStatusSnapshots()),
    ];
  }

  hasOpenExecutionWork(): boolean {
    return [...this.persistentMembers.listHandles(), ...this.taskAgentExecutions.listHandles(), ...this.taskTeamExecutions.listHandles()]
      .some((handle) => handle.hasOpenExecutionWork());
  }

  async postMessage(message: AgentInputUserMessage, target: AgentTeamAddress, targetAgentRunId: string | null = null): Promise<AgentOperationResult> {
    if (!this.getContext()) return buildRunNotFoundResult("unknown");
    const resolved = this.persistentMembers.resolveContext(target);
    if (isAgentOperationResult(resolved)) return resolved;
    if (resolved.kind === "agent_team") {
      return this.persistentMembers.getOrCreate(resolved)
        .postMessageToAddress(message, target, targetAgentRunId);
    }
    const taskRun = targetAgentRunId?.trim();
    if (taskRun) return this.taskAgentExecutions.postMessage(target, taskRun, message);
    if (resolved.address !== target) return { accepted: false, code: "TARGET_MEMBER_NOT_FOUND", message: `Agent '${target}' was not found.` };
    return this.persistentMembers.getOrCreate(resolved).postMessageToAddress(message, target, targetAgentRunId);
  }

  async executeMemberCommand(
    executionAddress: TeamExecutionAddress,
    command: TeamMemberExecutionCommand,
  ): Promise<AgentOperationResult> {
    const context = this.getContext();
    if (!context) return buildRunNotFoundResult("unknown");
    try {
      const taskTeamExecution = this.taskTeamActiveExecutionResolver
        .resolveCommandTarget(executionAddress);
      if (!this.sameTaskTeamRunChain(
        executionAddress.taskTeamRunIds,
        context.taskTeamRunIds,
      )) {
        const ownsRootSelection = context.teamAddress === "/" &&
          context.teamRunId === context.config.rootTeam.teamRunId;
        if (!ownsRootSelection || context.taskTeamRunIds.length > 0 || !taskTeamExecution) {
          return this.invalidExecutionResult(
            `Execution chain does not select active TeamRun '${context.teamRunId}'.`,
          );
        }
        return taskTeamExecution.activeRun.executeMemberCommand(
          executionAddress,
          command,
        );
      }
      return this.executeLocalMemberCommand(executionAddress, command);
    } catch (error) {
      if (!isCollaborationContractError(error)) throw error;
      return this.invalidExecutionResult(error.message);
    }
  }

  async deliverInterAgentMessage(intent: InterAgentMessageDeliveryIntent): Promise<AgentOperationResult> {
    const context = this.getContext();
    if (!context) return buildRunNotFoundResult("unknown");
    const boundary = context.runtimeContext.parentBoundary;
    if (boundary) return boundary.deliverInterAgentMessage(intent);
    if (intent.rootTeamRunId !== context.config.rootTeam.teamRunId) {
      return {
        accepted: false, code: "TARGET_MEMBER_NOT_FOUND", message: `TeamRun '${intent.rootTeamRunId}' is not reachable.`,
      };
    }
    try {
      const recipient = this.resolveRecipient(intent.recipientAddress, intent.callerAddressing);
      const targetAddress = recipient.kind === "agent" ? recipient.address : recipient.coordinatorAddress;
      if (targetAddress === intent.callerAddressing.memberAddress) throw new CollaborationContractError(
        "COLLABORATION_SELF_TARGET_REJECTED", `Collaboration target '${recipient.address}' resolves to the calling Agent.`,
      );
      const taskTeamExecution = this.taskTeamActiveExecutionResolver.resolveMessageSender(
        intent.sender.participant,
        intent.callerAddressing,
      );
      if (taskTeamExecution &&
        this.taskTeamActiveExecutionResolver.containsTarget(taskTeamExecution, targetAddress)) {
        return this.deliveryCoordinator.deliverViaResolvedRoute(
          intent,
          this.materializeTaskTeamMessageRecipient(taskTeamExecution, targetAddress),
        );
      }
      return this.deliveryCoordinator.deliver(
        intent,
        this.materializePersistentMessageRecipient(targetAddress),
      );
    } catch (error) {
      if (!isCollaborationContractError(error)) throw error;
      return { accepted: false, code: error.code, message: error.message };
    }
  }

  async deliverResolvedInterAgentMessage(
    request: ResolvedInterAgentMessageDeliveryRequest,
    beforePublishMemberInput: (() => void) | null = null,
  ): Promise<AgentOperationResult> {
    const context = this.getContext();
    if (!context) return buildRunNotFoundResult("unknown");
    if (
      request.rootTeamRunId !== context.config.rootTeam.teamRunId ||
      request.receiverAddress.rootTeamRunId !== context.config.rootTeam.teamRunId
    ) {
      return {
        accepted: false,
        code: "COLLABORATION_TARGET_NOT_FOUND",
        message: `TeamRun '${request.receiverAddress.rootTeamRunId}' is not reachable.`,
      };
    }
    if (!this.sameTaskTeamRunChain(
      request.receiverAddress.taskTeamRunIds,
      context.taskTeamRunIds,
    )) return {
      accepted: false,
      code: "COLLABORATION_CONTEXT_REQUIRED",
      message: `Recipient task AgentTeam chain does not match active TeamRun '${context.teamRunId}'.`,
    };
    const target = request.receiverAddress.memberAddress;
    const resolved = this.persistentMembers.resolveContext(target);
    if (isAgentOperationResult(resolved)) return {
      accepted: false,
      code: "COLLABORATION_TARGET_NOT_FOUND",
      message: `Collaboration target '${target}' is not reachable.`,
    };
    if (resolved.kind === "agent" && resolved.address !== target) return {
      accepted: false,
      code: "COLLABORATION_TARGET_NOT_FOUND",
      message: `Collaboration target '${target}' is not a persistent Agent member.`,
    };
    if (resolved.kind === "agent" && request.resolvedTargetKind === "task_agent_run") {
      return this.taskAgentExecutions.deliverInterAgentMessageToTaskAgent(
        target,
        request.targetAgentRunId,
        request,
        beforePublishMemberInput,
      );
    }
    return this.persistentMembers.getOrCreate(resolved)
      .deliverInterMemberMessage(request, beforePublishMemberInput);
  }

  resolveRecipient(recipientAddress: string, caller: MemberLogicalAddressContext): ResolvedTeamRecipient {
    const context = this.getContext();
    if (!context || caller.rootTeamRunId !== context.config.rootTeam.teamRunId) throw new CollaborationContractError(
      "COLLABORATION_CONTEXT_REQUIRED", "Recipient resolution requires the active collaboration-root TeamRun.",
    );
    return this.recipientResolver.resolve(context.index, recipientAddress, caller);
  }

  async approveToolInvocation(target: AgentTeamAddress, invocationId: string, approved: boolean, reason: string | null = null, targetAgentRunId: string | null = null, taskTeamRunId: string | null = null): Promise<AgentOperationResult> {
    if (!this.getContext()) return buildRunNotFoundResult("unknown");
    if (taskTeamRunId?.trim()) return this.taskTeamExecutions.approveToolInvocation(taskTeamRunId.trim(), target, invocationId, approved, reason, targetAgentRunId);
    const resolved = this.persistentMembers.resolveContext(target);
    if (isAgentOperationResult(resolved)) return resolved;
    if (resolved.kind === "agent_team") {
      return this.persistentMembers.getOrCreate(resolved)
        .approveToolInvocation(target, invocationId, approved, reason, targetAgentRunId);
    }
    if (targetAgentRunId?.trim()) return this.taskAgentExecutions.approveToolInvocation(target, targetAgentRunId.trim(), invocationId, approved, reason);
    return this.persistentMembers.getOrCreate(resolved).approveToolInvocation(target, invocationId, approved, reason, targetAgentRunId);
  }

  async interruptMember(target: AgentTeamAddress, targetAgentRunId: string | null = null): Promise<AgentOperationResult> {
    if (!this.getContext()) return buildRunNotFoundResult("unknown");
    const resolved = this.persistentMembers.resolveContext(target);
    if (isAgentOperationResult(resolved)) return resolved;
    if (resolved.kind === "agent_team") {
      return this.persistentMembers.getOrCreate(resolved).interrupt(target, targetAgentRunId);
    }
    if (targetAgentRunId?.trim()) {
      return this.taskAgentExecutions.interrupt(target, targetAgentRunId.trim());
    }
    return this.persistentMembers.getOrCreate(resolved).interrupt(target, targetAgentRunId);
  }

  async settleMember(target: AgentTeamAddress, targetAgentRunId: string | null = null): Promise<AgentOperationResult> {
    const context = this.getContext();
    if (!context) return buildRunNotFoundResult("unknown");
    const resolved = this.persistentMembers.resolveContext(target);
    if (isAgentOperationResult(resolved)) return resolved;
    const handle = this.persistentMembers.getOrCreate(resolved);
    const result = await handle.terminate();
    if (result.accepted) this.persistentMembers.remove(resolved.address);
    return result;
  }

  startTaskAgentExecution(request: StartTaskAgentExecutionRequest) { return this.taskAgentExecutions.start(request); }
  releaseTaskAgentExecutionWork(target: AgentTeamAddress, taskAgentRunId: string): void {
    const resolved = this.taskAgentExecutions.resolveTaskAgentLogicalContext(taskAgentRunId);
    if (!resolved || resolved.address !== target) throw new Error(`Prepared task AgentRun '${taskAgentRunId}' is not at '${target}'.`);
    this.taskAgentExecutions.releaseWork(taskAgentRunId);
  }
  async settleTaskAgentExecution(target: AgentTeamAddress, taskAgentRunId: string) {
    const result = await this.taskAgentExecutions.settle(target, taskAgentRunId);
    if (result.accepted && this.teamContext) getTaskAgentDirectory(this.teamContext.config.rootTeam.teamRunId).markSettledByTaskAgentRunId(taskAgentRunId);
    return result;
  }
  startTaskTeamExecution(request: StartTaskTeamExecutionRequest) { return this.taskTeamExecutions.start(request); }
  markTaskTeamExecutionActive(taskTeamRunId: string): void { this.taskTeamExecutions.markActive(taskTeamRunId); }
  releaseTaskTeamExecutionWork(target: AgentTeamAddress, taskTeamRunId: string): void {
    this.taskTeamExecutions.releaseWork(target, taskTeamRunId);
  }
  postMessageToTaskTeamExecution(target: AgentTeamAddress, taskTeamRunId: string, message: AgentInputUserMessage) { return this.taskTeamExecutions.postMessage(target, taskTeamRunId, message); }
  settleTaskTeamExecution(target: AgentTeamAddress, taskTeamRunId: string) { return this.taskTeamExecutions.settle(target, taskTeamRunId); }

  async terminate(): Promise<AgentOperationResult> {
    if (this.lifecycleState === "terminated") return { accepted: true };
    if (this.terminationPromise) return this.terminationPromise;
    this.lifecycleState = "terminating";
    return this.terminationPromise = this.runTermination();
  }

  publishEvent(event: TeamRunEvent): void { this.publish(event); }
  openTaskActivationEventLease(executionAddress: TeamExecutionAddress): TaskActivationEventLease {
    return this.taskActivationEventBarrier.open(executionAddress);
  }
  assertTaskActivationEventLeaseWithinBudget(lease: TaskActivationEventLease): void {
    this.taskActivationEventBarrier.assertWithinBudget(lease);
  }
  commitTaskActivationEventLease(lease: TaskActivationEventLease, activationEvent: TeamRunEvent): void {
    this.taskActivationEventBarrier.commit(lease, activationEvent, (event) => this.emit(event));
  }
  abortTaskActivationEventLease(lease: TaskActivationEventLease): void {
    this.taskActivationEventBarrier.abort(lease);
  }
  subscribeToEvents(listener: TeamRunEventListener): TeamRunEventUnsubscribe { this.eventListeners.add(listener); return () => this.eventListeners.delete(listener); }

  private getContext() { return this.lifecycleState === "active" ? this.teamContext : null; }

  private materializePersistentMessageRecipient(address: AgentTeamAddress): LogicalMessageDeliveryRecipient {
    const context = this.getContext();
    if (!context) throw new CollaborationContractError("COLLABORATION_CONTEXT_REQUIRED", "The collaboration-root TeamRun is not active.");
    const node = context.index.getAgent(address);
    if (!node) throw new CollaborationContractError("COLLABORATION_TARGET_NOT_FOUND", `Collaboration target '${address}' has no executable Agent runtime.`);
    const memberContext = this.persistentMembers.resolveContext(address);
    if (isAgentOperationResult(memberContext)) throw new CollaborationContractError("COLLABORATION_TARGET_NOT_FOUND", `Collaboration target '${address}' is not reachable.`);
    const runtimeContext = memberContext.kind === "agent" && memberContext.address === address ? memberContext : null;
    const participant: InterAgentMessageParticipant = Object.freeze({
      kind: "agent",
      executionAddress: createTeamExecutionAddress({ rootTeamRunId: context.config.rootTeam.teamRunId, taskTeamRunIds: context.taskTeamRunIds, memberAddress: address }),
      agentRunId: node.agentRunId,
      displayName: getAgentTeamAddressBasename(address) ?? node.agentRunId,
      runtimeKind: node.runtimeKind,
      platformAgentRunId: runtimeContext?.platformAgentRunId ?? node.platformAgentRunId,
    });
    return Object.freeze({
      memberContext,
      endpoint: buildDeliveryEndpointForParticipant(participant),
      targetAgentRunId: node.agentRunId,
    });
  }

  private materializeTaskTeamMessageRecipient(
    execution: ActiveTaskTeamExecution,
    address: AgentTeamAddress,
  ): ResolvedMessageDeliveryRoute {
    if (!execution.activeRun.isActive()) throw new CollaborationContractError(
      "COLLABORATION_CONTEXT_REQUIRED",
      `Task AgentTeam '${execution.teamAddress}' is not active.`,
    );
    const node = execution.activeRun.context.index.getAgent(address);
    if (!node) throw new CollaborationContractError(
      "COLLABORATION_TARGET_NOT_FOUND",
      `Task AgentTeam target '${address}' has no executable Agent runtime.`,
    );
    const runtimeContext = resolveRuntimeAgentContext(execution.activeRun.context, node.agentRunId);
    const participant: InterAgentMessageParticipant = Object.freeze({
      kind: "agent",
      executionAddress: createTeamExecutionAddress({
        rootTeamRunId: execution.activeRun.config.rootTeam.teamRunId,
        taskTeamRunIds: execution.taskTeamRunIds,
        memberAddress: address,
      }),
      agentRunId: node.agentRunId,
      displayName: getAgentTeamAddressBasename(address) ?? node.agentRunId,
      runtimeKind: node.runtimeKind,
      platformAgentRunId: runtimeContext?.getPlatformAgentRunId() ?? node.platformAgentRunId,
      taskId: execution.taskId,
    });
    return Object.freeze({
      endpoint: buildDeliveryEndpointForParticipant(participant),
      targetAgentRunId: node.agentRunId,
      deliver: (
        request: ResolvedInterAgentMessageDeliveryRequest,
        beforePublishMemberInput: (() => void) | null,
      ) => execution.activeRun.deliverResolvedInterAgentMessage(
        request,
        beforePublishMemberInput,
      ),
    });
  }

  private sameTaskTeamRunChain(actual: readonly string[], expected: readonly string[]): boolean {
    return actual.length === expected.length &&
      actual.every((taskTeamRunId, index) => taskTeamRunId === expected[index]);
  }

  private async executeLocalMemberCommand(
    executionAddress: TeamExecutionAddress,
    command: TeamMemberExecutionCommand,
  ): Promise<AgentOperationResult> {
    const target = executionAddress.memberAddress;
    const resolved = this.persistentMembers.resolveContext(target);
    if (isAgentOperationResult(resolved)) return resolved;
    if (resolved.kind === "agent_team") {
      return this.executeHandleCommand(
        this.persistentMembers.getOrCreate(resolved),
        executionAddress,
        command,
      );
    }
    if (resolved.address !== target) {
      return this.invalidExecutionResult(`Agent '${target}' is not owned by the selected TeamRun.`);
    }
    const taskAgentRunId = executionAddress.taskAgentRunId;
    if (taskAgentRunId) {
      if (command.kind === "post_message") {
        return this.taskAgentExecutions.postMessage(target, taskAgentRunId, command.message);
      }
      if (command.kind === "approve_tool") {
        return this.taskAgentExecutions.approveToolInvocation(
          target,
          taskAgentRunId,
          command.invocationId,
          command.approved,
          command.reason,
        );
      }
      return this.taskAgentExecutions.interrupt(target, taskAgentRunId);
    }
    return this.executeHandleCommand(
      this.persistentMembers.getOrCreate(resolved),
      executionAddress,
      command,
    );
  }

  private executeHandleCommand(
    handle: ReturnType<MixedPersistentMemberRegistry["getOrCreate"]>,
    executionAddress: TeamExecutionAddress,
    command: TeamMemberExecutionCommand,
  ): Promise<AgentOperationResult> {
    if (command.kind === "post_message") {
      return handle.postMessageToAddress(
        command.message,
        executionAddress.memberAddress,
        executionAddress.taskAgentRunId,
      );
    }
    if (command.kind === "approve_tool") {
      return handle.approveToolInvocation(
        executionAddress.memberAddress,
        command.invocationId,
        command.approved,
        command.reason,
        executionAddress.taskAgentRunId,
      );
    }
    return handle.interrupt(
      executionAddress.memberAddress,
      executionAddress.taskAgentRunId,
    );
  }

  private invalidExecutionResult(message: string): AgentOperationResult {
    return {
      accepted: false,
      code: "TEAM_EXECUTION_ADDRESS_INVALID",
      message,
    };
  }

  private async runTermination(): Promise<AgentOperationResult> {
    const context = this.teamContext;
    try {
      for (const registry of [this.taskAgentExecutions, this.taskTeamExecutions]) {
        const result = await registry.terminateAll();
        if (!result.accepted) { this.lifecycleState = "active"; this.terminationPromise = null; return result; }
      }
      for (const handle of this.persistentMembers.listHandles()) {
        const result = await handle.terminate();
        if (!result.accepted) { this.lifecycleState = "active"; this.terminationPromise = null; return result; }
      }
      this.persistentMembers.dispose(); this.taskAgentExecutions.dispose(); this.taskTeamExecutions.dispose();
      if (context) {
        disposeTaskAgentDirectory(context.config.rootTeam.teamRunId);
        disposeTaskTeamActiveRunDirectoryForParentTeamRun(context.teamRunId);
      }
      this.teamContext = null; this.eventListeners.clear(); this.lifecycleState = "terminated"; this.terminationPromise = null;
      return { accepted: true };
    } catch (error) {
      this.lifecycleState = "active"; this.terminationPromise = null;
      return { accepted: false, code: "RUNTIME_COMMAND_FAILED", message: `Failed to terminate TeamRun: ${String(error)}` };
    }
  }

  private publish(event: TeamRunEvent): void {
    this.taskActivationEventBarrier.publish(event, (published) => this.emit(published));
  }

  private emit(event: TeamRunEvent): void {
    for (const listener of this.eventListeners) listener(event);
  }
}
