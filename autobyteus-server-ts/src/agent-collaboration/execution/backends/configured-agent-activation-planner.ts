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
import type { RuntimeSwitchMemory } from "../../../agent-execution/domain/runtime-switch-memory-port.js";
import { buildRuntimeSwitchBetween, buildSessionRenewal, type RuntimeSwitch } from "../../../agent-execution/domain/runtime-switch.js";
import { getDefaultRuntimeSwitchMemory } from "../../../agent-memory/services/runtime-switch-recorder.js";
import type { PendingRuntimeSwitch } from "../../../run-history/store/agent-run-metadata-types.js";
import { ConfiguredAgentSwitchAttempt } from "./configured-agent-switch-attempt.js";
import {
  createCollaborationAgentBindingReplacement,
  createCollaborationAgentPlatformBinding,
  createCollaborationAgentRuntimeSwitchCommit,
  type CollaborationAgentPlatformBindingChange,
  type CollaborationAgentPlatformBinding,
} from "../domain/collaboration-agent-platform-binding.js";
import type { CollaborationMemberExecutionIdentity } from "../domain/root-execution-identity.js";

/** `reason` is the inspector's plain-words reason, e.g. "line 120 of raw_traces_active.jsonl is damaged". */
const unreadableConversationState = (reason: Error): CollaborationAgentActivationError =>
  new CollaborationAgentActivationError(
    "COLLABORATION_AGENT_CONTINUATION_STATE_UNREADABLE",
    `The local conversation state cannot be inspected safely: ${reason.message}.`,
    { cause: reason },
  );

export class ConfiguredAgentActivationPlanner {
  constructor(private readonly input: {
    identity: CollaborationMemberExecutionIdentity;
    manager?: AgentRunManager;
    activityInspector?: AgentConversationActivityInspector;
    runtimeSwitchMemory?: RuntimeSwitchMemory;
  }) {}

  /**
   * `mode` belongs to this attempt: a handle re-activating after its run died plans as `restore`. A member with a pending
   * agent runtime switch (decided by the explicit field, never by a missing session ID) plans the switch.
   */
  begin(
    config: AgentRunConfig,
    currentPlatformAgentRunId: string | null,
    mode: ConfiguredAgentActivationMode,
    pendingRuntimeSwitch?: PendingRuntimeSwitch,
  ): ConfiguredAgentActivationOperation {
    if (pendingRuntimeSwitch) return this.beginSwitch(config, pendingRuntimeSwitch);
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
          replacement: createCollaborationAgentBindingReplacement({
            binding: binding ?? this.missingReplacementBinding(),
            expectedPreviousPlatformAgentRunId: plan.expectedPreviousPlatformAgentRunId,
          }),
        })
      : binding
        ? Object.freeze({ kind: "adopt_or_retain" as const, binding })
        : null;
    return Object.freeze({ candidate, bindingChange });
      },
      switching: null,
      restoring: plan.kind === "restore_external" ? plan.platformAgentRunId : null,
    });
  }

  /**
   * The member's next input makes its agent runtime switch real (autobyteus-348, the sequence of autobyteus-316): with a
   * conversation to carry over, take the ticket before the candidate prepares (it may write records of its own) and let the
   * handle record the marker and archive once the candidate is valid; without one, a plain start. Either way a fresh session
   * is started and the commit names the switch. Unreadable history fails closed before anything starts.
   */
  private beginSwitch(config: AgentRunConfig, pending: PendingRuntimeSwitch): ConfiguredAgentActivationOperation {
    const activity = this.inspectConversationActivity(config);
    if (activity.kind === "indeterminate") throw unreadableConversationState(activity.error);
    const runtimeSwitch = activity.kind === "present"
      ? buildRuntimeSwitchBetween({
          runId: this.input.identity.agentRunId,
          to: { runtimeKind: config.runtimeKind, llmModelIdentifier: config.llmModelIdentifier },
          pending,
        })
      : null;
    return this.beginFreshSession(config, runtimeSwitch, (binding) => createCollaborationAgentRuntimeSwitchCommit({
      execution: this.input.identity,
      switchId: pending.switchId,
      platformAgentRunId: binding?.platformAgentRunId ?? null,
    }));
  }

  /**
   * The member's saved runtime session was lost (autobyteus-599, DS-002): the restore of `lostPlatformAgentRunId` failed with
   * the runtime's own "not found" and its operation was released. The same steps as a switch, with the same runtime and model
   * on both sides: a fresh session behind the lost-session marker, committed as a compare-and-set of the lost ID. The plan that
   * restored it had a conversation (`restore_external`), so there is always a marker to record.
   */
  beginSessionRenewal(config: AgentRunConfig, lostPlatformAgentRunId: string): ConfiguredAgentActivationOperation {
    const renewal = buildSessionRenewal({
      runId: this.input.identity.agentRunId,
      side: { runtimeKind: config.runtimeKind, llmModelIdentifier: config.llmModelIdentifier },
      lostPlatformAgentRunId,
    });
    return this.beginFreshSession(config, renewal, (binding) => Object.freeze({
      kind: "replace_lost_session" as const,
      replacement: createCollaborationAgentBindingReplacement({
        binding: binding ?? this.missingReplacementBinding(),
        expectedPreviousPlatformAgentRunId: lostPlatformAgentRunId,
      }),
    }));
  }

  /** The steps a switch and a renewal share: the ticket before the candidate prepares, then a fresh session. */
  private beginFreshSession(
    config: AgentRunConfig,
    runtimeSwitch: RuntimeSwitch | null,
    bindingChange: (binding: CollaborationAgentPlatformBinding | null) => CollaborationAgentPlatformBindingChange,
  ): ConfiguredAgentActivationOperation {
    const memory = this.input.runtimeSwitchMemory ?? getDefaultRuntimeSwitchMemory();
    const memoryDir = config.memoryDir!; // known: a switch with a conversation and a restored session both inspected it
    const switching = runtimeSwitch
      ? new ConfiguredAgentSwitchAttempt(memory, memoryDir, memory.begin(memoryDir, runtimeSwitch))
      : null;
    const operation = this.manager.beginActivation({ kind: "new", runId: this.input.identity.agentRunId, config });
    return Object.freeze({
      operation,
      prepare: async () => {
        const candidate = await operation.prepare();
        return Object.freeze({ candidate, bindingChange: bindingChange(this.createExternalBinding(candidate)) });
      },
      switching,
      restoring: null,
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
        throw unreadableConversationState(activity.error);
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
    throw unreadableConversationState(activity.error);
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
      throw unreadableConversationState(activity.error);
    }
  }

  private inspectConversationActivity(config: AgentRunConfig) {
    if (!config.memoryDir) {
      return { kind: "indeterminate" as const, error: new Error("its memory folder is unknown") };
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
  /** Present when the plan is a switch with a conversation to carry over; the handle records it and discards a failed attempt. */
  switching: ConfiguredAgentSwitchAttempt | null;
  /** The saved session this operation restores (`restore_external`); its loss starts a session renewal (autobyteus-599). */
  restoring: string | null;
}>;
