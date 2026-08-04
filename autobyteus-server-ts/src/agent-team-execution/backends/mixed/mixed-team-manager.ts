import type { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { getAgentTeamAddressBasename, type AgentTeamAddress } from "../../../agent-collaboration/domain/agent-team-address.js";
import { CollaborationContractError, isCollaborationContractError } from "../../../agent-collaboration/domain/collaboration-contract-error.js";
import type { AgentRunManager } from "../../../agent-execution/services/agent-run-manager.js";
import type { AgentOperationResult } from "../../../agent-execution/domain/agent-operation-result.js";
import { buildAgentStatusPayload } from "../../../agent-execution/domain/agent-status-payload.js";
import { buildTeamLeafAgentStatusSnapshot, type TeamLeafAgentStatusSnapshot } from "../../domain/team-leaf-agent-status-snapshot.js";
import type { TeamRunContext } from "../../domain/team-run-context.js";
import type { StartTaskAgentInstanceRequest } from "../../domain/task-agent-instance.js";
import type { StartTaskTeamInstanceRequest } from "../../domain/task-team-instance.js";
import type { InterAgentMessageDeliveryIntent, InterAgentMessageParticipant } from "../../domain/inter-agent-message-delivery.js";
import { buildDeliveryEndpointForParticipant } from "../../domain/inter-agent-message-delivery.js";
import type { MemberLogicalAddressContext } from "../../domain/member-logical-address-context.js";
import { createTeamExecutionAddress } from "../../domain/team-execution-address.js";
import type { TeamRunEvent, TeamRunEventListener, TeamRunEventUnsubscribe } from "../../domain/team-run-event.js";
import type { TeamManager } from "../team-manager.js";
import { MixedTeamRunContext } from "./mixed-team-run-context.js";
import { MixedSubTeamRunFactory } from "./mixed-sub-team-run-factory.js";
import { MixedPersistentMemberRegistry } from "./members/mixed-persistent-member-registry.js";
import { MixedTaskAgentInstanceRegistry } from "./members/mixed-task-agent-instance-registry.js";
import { MixedTaskTeamInstanceRegistry } from "./members/mixed-task-team-instance-registry.js";
import { MixedTeamMemberConfigResolver } from "./members/mixed-team-member-config-resolver.js";
import { TeamMemberDeliveryCoordinator } from "./delivery/team-member-delivery-coordinator.js";
import { disposeTaskAgentDirectory, getTaskAgentDirectory } from "../../task-delegation/task-agent-directory.js";
import { disposeTaskTeamActiveRunDirectoryForParentTeamRun, getTaskTeamActiveRunDirectory } from "../../task-delegation/task-team-active-run-directory.js";
import { TeamRecipientResolver } from "../../services/team-recipient-resolver.js";
import type { ResolvedTeamRecipient } from "../../services/resolved-team-recipient.js";
import { buildRunNotFoundResult, isAgentOperationResult } from "./mixed-team-manager-results.js";

export class MixedTeamManager implements TeamManager {
  private teamContext: TeamRunContext<MixedTeamRunContext> | null;
  private lifecycleState: "active" | "terminating" | "terminated" = "active";
  private terminationPromise: Promise<AgentOperationResult> | null = null;
  private readonly persistentMembers: MixedPersistentMemberRegistry;
  private readonly taskAgentInstances: MixedTaskAgentInstanceRegistry;
  private readonly taskTeamInstances: MixedTaskTeamInstanceRegistry;
  private readonly deliveryCoordinator: TeamMemberDeliveryCoordinator;
  private readonly recipientResolver = new TeamRecipientResolver();
  private readonly eventListeners = new Set<TeamRunEventListener>();

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
    this.persistentMembers = new MixedPersistentMemberRegistry({ teamContext: context, configResolver, subTeamRunFactory, agentRunManager: options.agentRunManager, ...callbacks });
    this.taskAgentInstances = new MixedTaskAgentInstanceRegistry({ teamContext: context, configResolver, agentRunManager: options.agentRunManager, ...callbacks });
    this.taskTeamInstances = new MixedTaskTeamInstanceRegistry({ teamContext: context, subTeamRunFactory, taskTeamActiveRunDirectory: getTaskTeamActiveRunDirectory(), ...callbacks });
    getTaskAgentDirectory(context.config.rootTeam.teamRunId);
    this.deliveryCoordinator = new TeamMemberDeliveryCoordinator({ teamContext: context, memberRegistry: this.persistentMembers, publish: callbacks.publish });
  }

  hasActiveMembers(): boolean { return this.lifecycleState === "active" && Boolean(this.teamContext); }

  getLeafAgentStatusSnapshots(): TeamLeafAgentStatusSnapshot[] {
    const context = this.teamContext;
    if (!context) return [];
    const handles = new Map(this.persistentMembers.listHandles().map((handle) => [handle.context.address, handle]));
    return [
      ...context.runtimeContext.memberContexts.flatMap((member) => {
        const handle = handles.get(member.address);
        if (handle) return handle.getLeafAgentStatusSnapshots();
        if (member.kind !== "agent") return [];
        const executionAddress = createTeamExecutionAddress({ rootTeamRunId: context.config.rootTeam.teamRunId, taskTeamRunIds: context.taskTeamRunIds, memberAddress: member.address });
        return [buildTeamLeafAgentStatusSnapshot({
          teamRunId: context.config.rootTeam.teamRunId,
          executionAddress,
          payload: buildAgentStatusPayload({ status: "offline", agentId: member.agentRunId, agentName: getAgentTeamAddressBasename(member.address), executionAddress }) as { status: "offline"; agent_id: string; agent_name: string },
        })];
      }),
      ...this.taskAgentInstances.listHandles().flatMap((handle) => handle.getLeafAgentStatusSnapshots()),
      ...this.taskTeamInstances.listHandles().flatMap((handle) => handle.getLeafAgentStatusSnapshots()),
    ];
  }

  hasOpenExecutionWork(): boolean {
    return [...this.persistentMembers.listHandles(), ...this.taskAgentInstances.listHandles(), ...this.taskTeamInstances.listHandles()]
      .some((handle) => handle.hasOpenExecutionWork());
  }

  async postMessage(message: AgentInputUserMessage, target: AgentTeamAddress, targetAgentRunId: string | null = null): Promise<AgentOperationResult> {
    if (!this.getContext()) return buildRunNotFoundResult("unknown");
    const resolved = this.persistentMembers.resolveContext(target);
    if (isAgentOperationResult(resolved)) return resolved;
    const taskRun = targetAgentRunId?.trim();
    if (taskRun) return this.taskAgentInstances.postMessage(target, taskRun, message);
    if (resolved.kind === "agent" && resolved.address !== target) return { accepted: false, code: "TARGET_MEMBER_NOT_FOUND", message: `Agent '${target}' was not found.` };
    return this.persistentMembers.getOrCreate(resolved).postMessageToAddress(message, target, targetAgentRunId);
  }

  async deliverInterAgentMessage(intent: InterAgentMessageDeliveryIntent): Promise<AgentOperationResult> {
    const context = this.getContext();
    if (!context) return buildRunNotFoundResult("unknown");
    if (intent.rootTeamRunId !== context.config.rootTeam.teamRunId) {
      const boundary = context.runtimeContext.parentBoundary;
      return boundary ? boundary.deliverInterAgentMessage(intent) : {
        accepted: false, code: "TARGET_MEMBER_NOT_FOUND", message: `TeamRun '${intent.rootTeamRunId}' is not reachable.`,
      };
    }
    try {
      const recipient = this.resolveRecipient(intent.recipientAddress, intent.callerAddressing);
      const targetAddress = recipient.kind === "agent" ? recipient.address : recipient.coordinatorAddress;
      if (targetAddress === intent.callerAddressing.memberAddress) throw new CollaborationContractError(
        "COLLABORATION_SELF_TARGET_REJECTED", `Collaboration target '${recipient.address}' resolves to the calling Agent.`,
      );
      return this.deliveryCoordinator.deliver(intent, this.materializeMessageRecipient(targetAddress));
    } catch (error) {
      if (!isCollaborationContractError(error)) throw error;
      return { accepted: false, code: error.code, message: error.message };
    }
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
    if (taskTeamRunId?.trim()) return this.taskTeamInstances.approveToolInvocation(taskTeamRunId.trim(), target, invocationId, approved, reason, targetAgentRunId);
    const resolved = this.persistentMembers.resolveContext(target);
    if (isAgentOperationResult(resolved)) return resolved;
    if (targetAgentRunId?.trim()) return this.taskAgentInstances.approveToolInvocation(target, targetAgentRunId.trim(), invocationId, approved, reason);
    return this.persistentMembers.getOrCreate(resolved).approveToolInvocation(target, invocationId, approved, reason, targetAgentRunId);
  }

  async interruptMember(target: AgentTeamAddress, targetAgentRunId: string | null = null): Promise<AgentOperationResult> {
    if (!this.getContext()) return buildRunNotFoundResult("unknown");
    const resolved = this.persistentMembers.resolveContext(target);
    if (isAgentOperationResult(resolved)) return resolved;
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

  startTaskAgentInstance(request: StartTaskAgentInstanceRequest) { return this.taskAgentInstances.start(request); }
  async settleTaskAgentInstance(target: AgentTeamAddress, taskAgentRunId: string) {
    const result = await this.taskAgentInstances.settle(target, taskAgentRunId);
    if (result.accepted && this.teamContext) getTaskAgentDirectory(this.teamContext.config.rootTeam.teamRunId).markSettledByTaskAgentRunId(taskAgentRunId);
    return result;
  }
  startTaskTeamInstance(request: StartTaskTeamInstanceRequest) { return this.taskTeamInstances.start(request); }
  postMessageToTaskTeamInstance(target: AgentTeamAddress, taskTeamRunId: string, message: AgentInputUserMessage) { return this.taskTeamInstances.postMessage(target, taskTeamRunId, message); }
  settleTaskTeamInstance(target: AgentTeamAddress, taskTeamRunId: string) { return this.taskTeamInstances.settle(target, taskTeamRunId); }

  async terminate(): Promise<AgentOperationResult> {
    if (this.lifecycleState === "terminated") return { accepted: true };
    if (this.terminationPromise) return this.terminationPromise;
    this.lifecycleState = "terminating";
    return this.terminationPromise = this.runTermination();
  }

  publishEvent(event: TeamRunEvent): void { this.publish(event); }
  subscribeToEvents(listener: TeamRunEventListener): TeamRunEventUnsubscribe { this.eventListeners.add(listener); return () => this.eventListeners.delete(listener); }

  private getContext() { return this.lifecycleState === "active" ? this.teamContext : null; }

  private materializeMessageRecipient(address: AgentTeamAddress) {
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
    return { memberContext, endpoint: buildDeliveryEndpointForParticipant(participant), targetAgentRunId: node.agentRunId };
  }

  private async runTermination(): Promise<AgentOperationResult> {
    const context = this.teamContext;
    try {
      for (const registry of [this.taskAgentInstances, this.taskTeamInstances]) {
        const result = await registry.terminateAll();
        if (!result.accepted) { this.lifecycleState = "active"; this.terminationPromise = null; return result; }
      }
      for (const handle of this.persistentMembers.listHandles()) {
        const result = await handle.terminate();
        if (!result.accepted) { this.lifecycleState = "active"; this.terminationPromise = null; return result; }
      }
      this.persistentMembers.dispose(); this.taskAgentInstances.dispose(); this.taskTeamInstances.dispose();
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

  private publish(event: TeamRunEvent): void { for (const listener of this.eventListeners) listener(event); }
}
