import type { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import type { AgentOperationResult } from "../../../agent-execution/domain/agent-operation-result.js";
import type { AgentRunInputOptions, AgentRunInputReservationResult } from "../../../agent-execution/input/agent-run-input-contract.js";
import type { AgentRunManager } from "../../../agent-execution/services/agent-run-manager.js";
import type { AgentConversationActivityInspector } from "../../../agent-memory/services/agent-conversation-activity-inspector.js";
import type { WorkspaceManager } from "../../../workspaces/workspace-manager.js";
import type { ConfiguredAgentExecutionFactory } from "./configured-agent-execution-factory.js";
import type { ConfiguredAgentExecutionHandle } from "./configured-agent-execution-handle.js";
import type { AgentRunMemoryLocator } from "../services/agent-run-memory-locator.js";
import { createCollaborationMemberExecutionIdentity, createRootExecutionPhysicalScope, type RootExecutionIdentity } from "../domain/root-execution-identity.js";
import { runPartPlacement } from "../../../agent-memory/domain/agent-run-memory-placement.js";
import type { FlatTeamExecutionCallbacks } from "../../../agent-team-execution/local/flat-team-execution-callbacks.js";
import { type CollaborationAgentStatusSnapshot } from "../domain/collaboration-agent-execution-event.js";
import type { TeamMemberExecutionCommand } from "../../../agent-team-execution/domain/team-member-execution-command.js";
import type { TeamRunAgentNode } from "../../../agent-team-execution/domain/team-run-config.js";
import type { ConfiguredAgentActivationMode } from "../domain/configured-agent-execution.js";

export type PreparedRootConfiguredAgent = Readonly<{
  handle: ConfiguredAgentExecutionHandle;
  commitAfterDurability(): void;
  abort(): Promise<void>;
}>;

/** An organization run's own direct Agents (autobyteus-461: a run its agents delegated to is its own run). */
export class RootAgentExecutionRegistry {
  private readonly active = new Map<string, ConfiguredAgentExecutionHandle>();
  private readonly prepared = new Map<string, ConfiguredAgentExecutionHandle>();
  private materializationOpen = true;

  constructor(private readonly options: Readonly<{
    root: RootExecutionIdentity;
    callbacks: FlatTeamExecutionCallbacks;
    agentRunManager?: AgentRunManager;
    memoryLocator?: AgentRunMemoryLocator;
    activityInspector?: AgentConversationActivityInspector;
    workspaceManager?: Pick<WorkspaceManager, "ensureWorkspaceByRootPath">;
    executionFactory: ConfiguredAgentExecutionFactory;
  }>) {}

  listHandles(): readonly ConfiguredAgentExecutionHandle[] { return Object.freeze([...this.active.values()]); }
  freezeForRootTermination(): readonly ConfiguredAgentExecutionHandle[] {
    this.materializationOpen = false;
    return Object.freeze([...new Set([...this.active.values(), ...this.prepared.values()])]);
  }
  get(agentRunId: string): ConfiguredAgentExecutionHandle | null { return this.active.get(agentRunId) ?? null; }
  hasOpenExecutionWork(): boolean { return [...this.active.values()].some((handle) => handle.hasOpenExecutionWork()); }
  getInputStateSnapshots() { return [...this.active.values()].flatMap((handle) => handle.getInputStateSnapshots()); }
  getStatusSnapshots(): readonly CollaborationAgentStatusSnapshot[] { return [...this.active.values()].map((handle) => handle.getStatusSnapshot()); }
  isActive(agentRunId: string): boolean { return this.active.get(agentRunId)?.isActive() ?? false; }
  freezeMaterialization(): void { this.materializationOpen = false; }

  async prepareConfigured(sourceNode: TeamRunAgentNode, mode: ConfiguredAgentActivationMode): Promise<PreparedRootConfiguredAgent> {
    const handle = await this.createHandle(sourceNode, mode);
    this.reserve(sourceNode.agentRunId, handle);
    try {
      let state: "prepared" | "committed" | "aborted" = "prepared";
      return Object.freeze({
        handle,
        commitAfterDurability: () => {
          if (state !== "prepared" || this.prepared.get(sourceNode.agentRunId) !== handle) {
            throw new Error(`AgentRun '${sourceNode.agentRunId}' is not prepared for root publication.`);
          }
          this.prepared.delete(sourceNode.agentRunId);
          this.active.set(sourceNode.agentRunId, handle);
          state = "committed";
        },
        abort: async () => {
          if (state !== "prepared") return;
          state = "aborted";
          this.prepared.delete(sourceNode.agentRunId);
          handle.dispose();
        },
      });
    } catch (error) {
      this.prepared.delete(sourceNode.agentRunId);
      handle.dispose();
      throw error;
    }
  }

  reserveInput(agentRunId: string, message: AgentInputUserMessage, options: AgentRunInputOptions = {}): Promise<AgentRunInputReservationResult> {
    const handle = this.active.get(agentRunId);
    return handle
      ? handle.reserveInput(message, options)
      : Promise.resolve({ reserved: false, code: "AGENT_RUN_NOT_ACCEPTING_INPUT", message: `The agent '${agentRunId}' is not running, so the message was not sent.` });
  }
  async executeCommand(agentRunId: string, command: TeamMemberExecutionCommand): Promise<AgentOperationResult> {
    const handle = this.active.get(agentRunId);
    if (!handle) return { accepted: false, code: "RUN_NOT_FOUND", message: `The agent '${agentRunId}' is not running, so the message was not sent.` };
    switch (command.kind) {
      case "post_message": return handle.postMessage(command.message, command.postOptions);
      case "approve_tool": return handle.approveToolInvocation(command.invocationId, command.approved, command.reason);
      case "interrupt": return handle.interrupt();
    }
  }
  private async createHandle(
    sourceNode: TeamRunAgentNode,
    mode: ConfiguredAgentActivationMode,
  ): Promise<ConfiguredAgentExecutionHandle> {
    const callbacks = this.options.callbacks;
    const identity = createCollaborationMemberExecutionIdentity({
      root: this.options.root,
      memberAddress: sourceNode.address,
      agentRunId: sourceNode.agentRunId,
    });
    const physicalScope = this.rootScope();
    const execution = Object.freeze({
      agentDefinitionId: sourceNode.agentDefinitionId,
      llmModelIdentifier: sourceNode.llmModelIdentifier,
      llmConfig: sourceNode.llmConfig,
      autoExecuteTools: sourceNode.autoExecuteTools,
      runtimeKind: sourceNode.runtimeKind,
      workspaceRootPath: sourceNode.workspaceRootPath,
      platformAgentRunId: sourceNode.platformAgentRunId,
      ...(sourceNode.pendingRuntimeSwitch ? { pendingRuntimeSwitch: sourceNode.pendingRuntimeSwitch } : {}),
    });
    const memberExecutionContext = await callbacks.buildMemberExecutionContext({ identity, physicalScope, execution, sourceNode });
    return this.options.executionFactory.create({
      identity,
      physicalScope,
      memoryPlacement: runPartPlacement(physicalScope),
      execution,
      activationMode: mode,
      memberExecutionContext,
      assertInputAllowed: () => callbacks.assertExecutionInputAllowed(identity),
      applicationExecutionContext: callbacks.applicationExecutionContext?.(identity) ?? null,
      callbacks: {
        publishAgentEvent: callbacks.publishAgentEvent,
        commitPlatformBindingChange: callbacks.commitPlatformBindingChange,
      },
      agentRunManager: this.options.agentRunManager,
      memoryLocator: this.options.memoryLocator,
      activityInspector: this.options.activityInspector,
      workspaceManager: this.options.workspaceManager,
    });
  }
  private rootScope() {
    return createRootExecutionPhysicalScope({ root: this.options.root, ancestorTeamRunIds: [] });
  }
  private reserve(agentRunId: string, handle: ConfiguredAgentExecutionHandle): void {
    if (!this.materializationOpen || this.active.has(agentRunId) || this.prepared.has(agentRunId)) {
      throw new Error(`AgentRun '${agentRunId}' is already active, prepared, or root materialization is closed.`);
    }
    this.prepared.set(agentRunId, handle);
  }
}
