import type { AgentOperationResult } from "../../agent-execution/domain/agent-operation-result.js";
import type { AgentRunManager } from "../../agent-execution/services/agent-run-manager.js";
import type { AgentConversationActivityInspector } from "../../agent-memory/services/agent-conversation-activity-inspector.js";
import type { WorkspaceManager } from "../../workspaces/workspace-manager.js";
import type { RootedAgentMemoryLocator } from "../../agent-collaboration/execution/services/rooted-agent-memory-locator.js";
import { createRootExecutionPhysicalScope, sameRootExecutionIdentity, type RootExecutionPhysicalScope } from "../../agent-collaboration/execution/domain/root-execution-identity.js";
import { TeamRun } from "../domain/team-run.js";
import type { TeamRunAgentTeamNode, TeamRunApplicationBinding } from "../domain/team-run-config.js";
import { TeamRunContext } from "../domain/team-run-context.js";
import { TeamBackendKind } from "../domain/team-backend-kind.js";
import { FlatTeamRunBackend } from "../local/flat-team-run-backend.js";
import { FlatTeamExecutionManager } from "../local/flat-team-execution-manager.js";
import { TaskTeamExecutionFactory } from "../local/task-team-execution-factory.js";
import { FlatAgentExecutionContext, FlatTeamExecutionContext, type ConfiguredMemberActivationMode } from "../local/flat-team-execution-context.js";
import type { CollaborationHandoff } from "../../agent-collaboration/domain/collaboration-handoff.js";
import type { FlatTeamExecutionCallbacks } from "./flat-team-execution-callbacks.js";

/** The collaborator hosting of one TeamRun's manager (used by a Team root for its root TeamRun). */
export type FlatTeamCollaboratorHost = Pick<
  FlatTeamExecutionManager,
  "prepareCollaboratorAgent" | "prepareCollaboratorTeam" | "requireCollaboratorTeam"
>;

export type PreparedFlatTeamExecution = Readonly<{
  teamRun: TeamRun;
  collaboratorHost: FlatTeamCollaboratorHost;
  commitAfterDurability(): void;
  abort(): Promise<void>;
}>;

/** Materializes one Agent-only Team below an explicit root/scope; owns no root package or registration. */
export class FlatTeamExecutionFactory {
  constructor(private readonly dependencies: Readonly<{
    agentRunManager?: AgentRunManager;
    memoryLocator?: RootedAgentMemoryLocator;
    activityInspector?: AgentConversationActivityInspector;
    workspaceManager?: Pick<WorkspaceManager, "ensureWorkspaceByRootPath">;
  }> = {}) {}

  beginMaterialization(input: Readonly<{
    physicalScope: RootExecutionPhysicalScope;
    teamNode: TeamRunAgentTeamNode;
    handoffs: readonly CollaborationHandoff[];
    applicationBinding?: TeamRunApplicationBinding | null;
    activationMode: ConfiguredMemberActivationMode;
    callbacks: FlatTeamExecutionCallbacks;
  }>): FlatTeamPreparationOperation {
    const physicalScope = createRootExecutionPhysicalScope(input.physicalScope);
    if (!sameRootExecutionIdentity(physicalScope.root, input.physicalScope.root)) {
      throw new Error("Flat Team physical scope root is invalid.");
    }
    if (input.teamNode.children.some((member) => member.kind !== "agent")) {
      throw new Error(`Flat Team '${input.teamNode.address}' cannot contain a configured Team.`);
    }
    let subTeamFactory!: TaskTeamExecutionFactory;
    const buildContext = (scope: RootExecutionPhysicalScope, teamNode: TeamRunAgentTeamNode, mode: ConfiguredMemberActivationMode, handoffs: readonly CollaborationHandoff[], applicationBinding: TeamRunApplicationBinding | null) => new TeamRunContext({
      physicalScope: scope,
      teamRunId: teamNode.teamRunId,
      teamBackendKind: TeamBackendKind.MIXED,
      teamNode,
      handoffs,
      applicationBinding,
      runtimeContext: new FlatTeamExecutionContext({
        memberContexts: teamNode.children.map((node) => {
          if (node.kind !== "agent") throw new Error(`Flat Team '${teamNode.address}' cannot contain a configured Team.`);
          return new FlatAgentExecutionContext({
            address: node.address,
            agentRunId: node.agentRunId,
            runtimeKind: node.runtimeKind,
            platformAgentRunId: node.platformAgentRunId,
          });
        }),
        configuredMemberActivationMode: mode,
      }),
    });
    const createManager = (context: TeamRunContext<FlatTeamExecutionContext>, publishAgentEvent = input.callbacks.publishAgentEvent) => new FlatTeamExecutionManager(context, {
      subTeamRunFactory: subTeamFactory,
      callbacks: { ...input.callbacks, publishAgentEvent },
      ...this.dependencies,
    });
    subTeamFactory = new TaskTeamExecutionFactory({
      buildContext: (child) => buildContext(
        child.physicalScope,
        child.teamNode,
        child.configuredMemberActivationMode,
        child.handoffs,
        child.applicationBinding ?? null,
      ),
      publishAgentEvent: input.callbacks.publishAgentEvent,
      createTeamManager: createManager,
    });
    const context = buildContext(
      physicalScope,
      input.teamNode,
      input.activationMode,
      input.handoffs,
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
            teamRun: teamRun!, collaboratorHost: manager!,
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
