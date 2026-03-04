import type {
  TeamMemberRuntimeReference,
  TeamRunMemberBinding,
} from "../../run-history/domain/team-models.js";
import type { RuntimeKind } from "../../runtime-management/runtime-kind.js";
import type { TeamRuntimeBindingRegistry } from "./team-runtime-binding-registry.js";
import type { ClaudeAgentSdkRuntimeService } from "../../runtime-execution/claude-agent-sdk/claude-agent-sdk-runtime-service.js";

const isRuntimeReferenceChanged = (
  current: TeamMemberRuntimeReference | null | undefined,
  next: TeamMemberRuntimeReference | null | undefined,
): boolean =>
  current?.sessionId !== next?.sessionId ||
  current?.threadId !== next?.threadId ||
  JSON.stringify(current?.metadata ?? null) !== JSON.stringify(next?.metadata ?? null);

export class TeamMemberRuntimeBindingStateService {
  private readonly teamRuntimeBindingRegistry: TeamRuntimeBindingRegistry;
  private readonly claudeRuntimeService: Pick<ClaudeAgentSdkRuntimeService, "getRunRuntimeReference">;

  constructor(options: {
    teamRuntimeBindingRegistry: TeamRuntimeBindingRegistry;
    claudeRuntimeService: Pick<ClaudeAgentSdkRuntimeService, "getRunRuntimeReference">;
  }) {
    this.teamRuntimeBindingRegistry = options.teamRuntimeBindingRegistry;
    this.claudeRuntimeService = options.claudeRuntimeService;
  }

  getActiveMemberBindings(teamRunId: string): TeamRunMemberBinding[] {
    return this.refreshTeamBindingsFromRuntimeState(teamRunId).map((binding) =>
      this.cloneMemberBinding(binding),
    );
  }

  applyRuntimeReferenceUpdate(input: {
    teamRunId: string;
    memberRunId: string;
    runtimeKind: RuntimeKind;
    runtimeReference: {
      sessionId?: string | null;
      threadId?: string | null;
      metadata?: Record<string, unknown> | null;
    } | null;
    existingMetadata: Record<string, unknown> | null;
  }): void {
    const { runtimeReference } = input;
    if (!runtimeReference) {
      return;
    }

    const refreshedRuntimeReference: TeamMemberRuntimeReference = {
      runtimeKind: input.runtimeKind,
      sessionId: runtimeReference.sessionId ?? runtimeReference.threadId ?? input.memberRunId,
      threadId: runtimeReference.threadId ?? runtimeReference.sessionId ?? null,
      metadata: {
        ...(input.existingMetadata ?? {}),
        ...(runtimeReference.metadata ?? {}),
      },
    };

    const state = this.teamRuntimeBindingRegistry.getTeamBindingState(input.teamRunId);
    if (!state) {
      return;
    }

    const updatedBindings = state.memberBindings.map((binding) =>
      binding.memberRunId === input.memberRunId
        ? {
            ...binding,
            runtimeReference: refreshedRuntimeReference,
          }
        : binding,
    );

    this.teamRuntimeBindingRegistry.upsertTeamBindings(input.teamRunId, state.mode, updatedBindings);
  }

  refreshTeamBindingsFromRuntimeState(teamRunId: string): TeamRunMemberBinding[] {
    const state = this.teamRuntimeBindingRegistry.getTeamBindingState(teamRunId);
    if (!state || state.memberBindings.length === 0) {
      return [];
    }

    let changed = false;
    const refreshed = state.memberBindings.map((binding) => {
      const nextRuntimeReference = this.resolveLatestRuntimeReference(binding);
      if (isRuntimeReferenceChanged(binding.runtimeReference, nextRuntimeReference)) {
        changed = true;
      }
      return {
        ...binding,
        runtimeReference: nextRuntimeReference,
      };
    });

    if (changed) {
      this.teamRuntimeBindingRegistry.upsertTeamBindings(teamRunId, state.mode, refreshed);
    }

    return refreshed;
  }

  cloneMemberBinding(binding: TeamRunMemberBinding): TeamRunMemberBinding {
    return {
      ...binding,
      runtimeReference: binding.runtimeReference
        ? {
            ...binding.runtimeReference,
            metadata: binding.runtimeReference.metadata
              ? { ...binding.runtimeReference.metadata }
              : null,
          }
        : null,
      llmConfig: binding.llmConfig ? { ...binding.llmConfig } : null,
    };
  }

  private resolveLatestRuntimeReference(
    binding: TeamRunMemberBinding,
  ): TeamMemberRuntimeReference | null {
    if (binding.runtimeKind !== "claude_agent_sdk") {
      return binding.runtimeReference ?? null;
    }

    const latest = this.claudeRuntimeService.getRunRuntimeReference(binding.memberRunId);
    if (!latest) {
      return binding.runtimeReference ?? null;
    }

    return {
      runtimeKind: binding.runtimeKind,
      sessionId: latest.sessionId ?? binding.memberRunId,
      threadId: latest.sessionId ?? null,
      metadata: {
        ...(binding.runtimeReference?.metadata ?? {}),
        ...(latest.metadata ?? {}),
      },
    };
  }
}
