import { AgentRunConfig } from "../../../agent-execution/domain/agent-run-config.js";
import { AgentRunContext } from "../../../agent-execution/domain/agent-run-context.js";
import type { AgentRunActivationOperation } from "../../../agent-execution/services/agent-run-activation-operation.js";
import type { AgentRunActivationCandidate } from "../../../agent-execution/services/agent-run-activation-candidate.js";
import { AgentRunManager } from "../../../agent-execution/services/agent-run-manager.js";
import { AgentRunActivationError, isAgentRunActivationQuarantineError } from "../../../agent-execution/errors.js";
import { isExternalProviderRuntimeKind } from "../../../runtime-management/runtime-kind-enum.js";
import {
  getAgentConversationActivityInspector,
  type AgentConversationActivityInspector,
} from "../../../agent-memory/services/agent-conversation-activity-inspector.js";
import {
  CollaborationAgentActivationError,
  type ConfiguredAgentActivationMode,
} from "../domain/configured-agent-execution.js";
import {
  createCollaborationAgentNoConversationBindingReplacement,
  createCollaborationAgentPlatformBinding,
  type CollaborationAgentPlatformBindingChange,
  type CollaborationAgentPlatformBinding,
} from "../domain/collaboration-agent-platform-binding.js";
import type { CollaborationMemberExecutionIdentity } from "../domain/root-execution-identity.js";

export class ConfiguredAgentActivationPlanner {
  constructor(private readonly input: {
    identity: CollaborationMemberExecutionIdentity;
    manager?: AgentRunManager;
    activityInspector?: AgentConversationActivityInspector;
  }) {}

  /** `mode` belongs to this attempt: a handle re-activating after its run died plans as `restore`. */
  begin(
    config: AgentRunConfig,
    currentPlatformAgentRunId: string | null,
    mode: ConfiguredAgentActivationMode,
  ): ConfiguredAgentActivationOperation {
    const plan = this.resolvePlan(config, currentPlatformAgentRunId, mode);
    const operation = this.beginCandidate(plan, config);
    return Object.freeze({
      operation,
      prepare: async () => {
    const candidate = await operation.prepare();
    const binding = this.createExternalBinding(candidate);
    const bindingChange = plan.kind === "replace_external_without_conversation"
      ? Object.freeze({
          kind: "replace_without_conversation" as const,
          replacement: createCollaborationAgentNoConversationBindingReplacement({
            binding: binding ?? this.missingReplacementBinding(),
            expectedPreviousPlatformAgentRunId: plan.expectedPreviousPlatformAgentRunId,
          }),
        })
      : binding
        ? Object.freeze({ kind: "adopt_or_retain" as const, binding })
        : null;
    return Object.freeze({ candidate, bindingChange });
      },
    });
  }

  isRetrySafe(error: unknown): boolean {
    return !(error instanceof CollaborationAgentActivationError && error.indeterminate)
      && !isAgentRunActivationQuarantineError(error);
  }

  private resolvePlan(
    config: AgentRunConfig,
    currentPlatformAgentRunId: string | null,
    mode: ConfiguredAgentActivationMode,
  ): ActivationPlan {
    const external = isExternalProviderRuntimeKind(config.runtimeKind);
    if (mode === "fresh") {
      if (external) this.assertNoPriorConversationActivity(config);
      return Object.freeze({ kind: "new" });
    }
    if (external) {
      const activity = this.inspectConversationActivity(config);
      if (activity.kind === "none") {
        const previous = currentPlatformAgentRunId?.trim() || null;
        return previous
          ? Object.freeze({ kind: "replace_external_without_conversation", expectedPreviousPlatformAgentRunId: previous })
          : Object.freeze({ kind: "new" });
      }
      if (activity.kind === "indeterminate") {
        throw new CollaborationAgentActivationError(
          "COLLABORATION_AGENT_CONTINUATION_STATE_UNREADABLE",
          "The local conversation state cannot be inspected safely.",
          { cause: activity.error },
        );
      }
      const platformAgentRunId = currentPlatformAgentRunId?.trim() || null;
      if (platformAgentRunId) return Object.freeze({ kind: "restore_external", platformAgentRunId });
      throw new CollaborationAgentActivationError(
        "COLLABORATION_AGENT_CONTINUATION_BINDING_MISSING",
        "This conversation has local history but no provider binding and cannot be continued safely.",
      );
    }
    const activity = this.inspectConversationActivity(config);
    if (activity.kind === "present") return Object.freeze({ kind: "restore_native" });
    if (activity.kind === "none") return Object.freeze({ kind: "new" });
    throw new CollaborationAgentActivationError(
      "COLLABORATION_AGENT_CONTINUATION_STATE_UNREADABLE",
      "The local conversation state cannot be inspected safely.",
      { cause: activity.error },
    );
  }

  private beginCandidate(plan: ActivationPlan, config: AgentRunConfig): AgentRunActivationOperation {
    if (plan.kind === "new" || plan.kind === "replace_external_without_conversation") {
      return this.manager.beginActivation({ kind: "new", runId: this.input.identity.agentRunId, config });
    }
    if (plan.kind === "restore_external") return this.manager.beginActivation({
      kind: "platform_restore", runId: this.input.identity.agentRunId, config, platformAgentRunId: plan.platformAgentRunId,
    });
    return this.manager.beginActivation({ kind: "restore", context: new AgentRunContext({
      runId: this.input.identity.agentRunId, config, runtimeContext: null,
    }) });
  }

  private assertNoPriorConversationActivity(config: AgentRunConfig): void {
    const activity = this.inspectConversationActivity(config);
    if (activity.kind === "present") {
      throw new CollaborationAgentActivationError(
        "COLLABORATION_AGENT_CONTINUATION_BINDING_MISSING",
        "This conversation has local history but no provider binding and cannot be continued safely.",
      );
    }
    if (activity.kind === "indeterminate") {
      throw new CollaborationAgentActivationError(
        "COLLABORATION_AGENT_CONTINUATION_STATE_UNREADABLE",
        "The local conversation state cannot be inspected safely.",
        { cause: activity.error },
      );
    }
  }

  private inspectConversationActivity(config: AgentRunConfig) {
    if (!config.memoryDir) {
      return { kind: "indeterminate" as const, error: new Error("AgentRun memory location is unavailable.") };
    }
    return (this.input.activityInspector ?? getAgentConversationActivityInspector()).inspect({
      agentRunId: this.input.identity.agentRunId,
      memoryDir: config.memoryDir,
    });
  }

  private createExternalBinding(candidate: AgentRunActivationCandidate): CollaborationAgentPlatformBinding | null {
    if (!isExternalProviderRuntimeKind(candidate.runtimeKind)) return null;
    if (!candidate.platformAgentRunId || candidate.platformAgentRunId === candidate.runId) {
      throw new AgentRunActivationError(
        "PLATFORM_AGENT_RUN_BINDING_INVALID",
        "The external runtime did not provide a valid provider conversation identity.",
      );
    }
    return createCollaborationAgentPlatformBinding({
      execution: this.input.identity,
      platformAgentRunId: candidate.platformAgentRunId,
    });
  }

  private missingReplacementBinding(): never {
    throw new AgentRunActivationError(
      "PLATFORM_AGENT_RUN_BINDING_INVALID",
      "The replacement external runtime did not provide a valid provider conversation identity.",
    );
  }

  private get manager(): AgentRunManager { return this.input.manager ?? AgentRunManager.getInstance(); }
}

type ActivationPlan =
  | Readonly<{ kind: "new" }>
  | Readonly<{ kind: "replace_external_without_conversation"; expectedPreviousPlatformAgentRunId: string }>
  | Readonly<{ kind: "restore_native" }>
  | Readonly<{ kind: "restore_external"; platformAgentRunId: string }>;

export type ConfiguredAgentActivationOperation = Readonly<{
  operation: AgentRunActivationOperation;
  prepare(): Promise<Readonly<{
    candidate: AgentRunActivationCandidate;
    bindingChange: CollaborationAgentPlatformBindingChange | null;
  }>>;
}>;
