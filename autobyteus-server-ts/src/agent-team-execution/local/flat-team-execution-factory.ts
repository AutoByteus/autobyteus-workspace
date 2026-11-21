import type { AgentOperationResult } from "../../agent-execution/domain/agent-operation-result.js";
import type { ConfiguredAgentExecutionFactory } from "../../agent-collaboration/execution/backends/configured-agent-execution-factory.js";
import type { AgentRunManager } from "../../agent-execution/services/agent-run-manager.js";
import type { AgentConversationActivityInspector } from "../../agent-memory/services/agent-conversation-activity-inspector.js";
import type { WorkspaceManager } from "../../workspaces/workspace-manager.js";
import type { AgentRunMemoryLocator } from "../../agent-collaboration/execution/services/agent-run-memory-locator.js";
import { createRootExecutionPhysicalScope, sameRootExecutionIdentity, type RootExecutionPhysicalScope } from "../../agent-collaboration/execution/domain/root-execution-identity.js";
import { TeamRun } from "../domain/team-run.js";
import type { TeamRunApplicationBinding } from "../domain/team-run-config.js";
import type { TeamRunMembership } from "../domain/team-run-membership.js";
import { TeamRunContext } from "../domain/team-run-context.js";
import { TeamBackendKind } from "../domain/team-backend-kind.js";
import { FlatTeamRunBackend } from "../local/flat-team-run-backend.js";
import { FlatTeamExecutionManager } from "../local/flat-team-execution-manager.js";
import { FlatTeamExecutionContext, type ConfiguredMemberActivationMode } from "../local/flat-team-execution-context.js";
import type { FlatTeamExecutionCallbacks } from "./flat-team-execution-callbacks.js";

export type PreparedFlatTeamExecution = Readonly<{
  teamRun: TeamRun;
  commitAfterDurability(): void;
  abort(): Promise<void>;
}>;

/** Materializes one Agent-only Team below an explicit root/scope; owns no root package or registration. */
export class FlatTeamExecutionFactory {
  constructor(private readonly dependencies: Readonly<{
    /** Creates each member agent with the host's stored-model check (G-5). */
    executionFactory: ConfiguredAgentExecutionFactory;
    agentRunManager?: AgentRunManager;
    memoryLocator?: AgentRunMemoryLocator;
    activityInspector?: AgentConversationActivityInspector;
    workspaceManager?: Pick<WorkspaceManager, "ensureWorkspaceByRootPath">;
  }>) {}

  beginMaterialization(input: Readonly<{
    physicalScope: RootExecutionPhysicalScope;
    /** The team's members, coordinator and rules: a team run's live view, or a mounted team's fixed one. */
    membership: TeamRunMembership;
    applicationBinding?: TeamRunApplicationBinding | null;
    activationMode: ConfiguredMemberActivationMode;
    callbacks: FlatTeamExecutionCallbacks;
  }>): FlatTeamPreparationOperation {
    const physicalScope = createRootExecutionPhysicalScope(input.physicalScope);
    if (!sameRootExecutionIdentity(physicalScope.root, input.physicalScope.root)) {
      throw new Error("Flat Team physical scope root is invalid.");
    }
    const buildContext = (scope: RootExecutionPhysicalScope, membership: TeamRunMembership, mode: ConfiguredMemberActivationMode, applicationBinding: TeamRunApplicationBinding | null) => new TeamRunContext({
      physicalScope: scope,
      teamRunId: membership.teamNode.teamRunId,
      teamBackendKind: TeamBackendKind.MIXED,
      membership,
      applicationBinding,
      runtimeContext: new FlatTeamExecutionContext({ configuredMemberActivationMode: mode }),
    });
    const createManager = (context: TeamRunContext<FlatTeamExecutionContext>, publishAgentEvent = input.callbacks.publishAgentEvent) => new FlatTeamExecutionManager(context, {
      callbacks: { ...input.callbacks, publishAgentEvent },
      ...this.dependencies,
    });
    const context = buildContext(
      physicalScope,
      input.membership,
      input.activationMode,
      input.applicationBinding ?? null,
    );
    const manager = createManager(context);
    const teamRun = new TeamRun(context, new FlatTeamRunBackend(context, manager));
    return beginFlatTeamPreparation({ teamRun, manager });
  }
}

export type FlatTeamPreparationOperation = Readonly<{
  prepare(): Promise<PreparedFlatTeamExecution>;
  cancel(): void;
  release(): Promise<AgentOperationResult>;
}>;

/**
 * Exact Team aggregate is constructed and retained; preparation is scope-only. No member is
 * activated here: each member's handle activates on its first input and commits its own binding.
 */
export function beginFlatTeamPreparation(input: {
  teamRun: TeamRun; manager: FlatTeamExecutionManager;
}): FlatTeamPreparationOperation {
  const teamRunId = input.teamRun.teamRunId;
  let teamRun: TeamRun | null = input.teamRun, manager: FlatTeamExecutionManager | null = input.manager;
    let cancelled = false;
    let settled = false;
    let published = false;
    let released = false;
    let attempt: Promise<PreparedFlatTeamExecution> | null = null;
    let releasing: Promise<AgentOperationResult> | null = null;
    const control: FlatTeamPreparationOperation = Object.freeze({
      cancel: () => { cancelled = true; if (!released) published ? teamRun!.cancelRuntimeActivation() : manager!.cancelPrivateActivation(); },
      release: () => {
        control.cancel();
        if (released) return Promise.resolve({ accepted: true as const });
        if (releasing) return releasing;
        const release = (async () => {
          const result = published ? await teamRun!.releaseOwnedRuntime() : await manager!.releasePrivateActivation();
          if (!result.accepted || (attempt && !settled)) return { accepted: false, code: "RUNTIME_RELEASE_PENDING" };
          released = true;
          teamRun = null; manager = null; attempt = null; input = null as never;
          return { accepted: true };
        })();
        releasing = release;
        void release.finally(() => { if (releasing === release) releasing = null; }).catch(() => undefined);
        return release;
      },
      prepare: () => {
        if (attempt) return attempt;
        if (cancelled) return Promise.reject(new Error("Flat Team preparation cancelled."));
        attempt = (async () => {
          if (cancelled) throw new Error("Flat Team preparation cancelled.");
          let committed = false;
          return Object.freeze({
            teamRun: teamRun!,
            commitAfterDurability: () => {
              if (cancelled || committed) throw new Error(`Flat Team '${teamRunId}' is not publishable.`);
              // From here on, release goes through the published TeamRun (members activated by first input).
              published = true;
              committed = true;
            },
            abort: async () => {
              const result = await control.release();
              if (!result.accepted) throw new Error(result.message ?? "Flat Team release remains pending.");
            },
          });
        })().finally(() => {
          settled = true;
          if (cancelled) void control.release().catch((error) => console.warn("FLAT_TEAM_RELEASE_FAILED", error));
        });
        return attempt;
      },
    });
    return control;
}
