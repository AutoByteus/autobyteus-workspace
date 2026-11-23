import { isRunTreeChangedEvent } from "../../agent-collaboration/delegation/run-tree-view.js";
import { createAgentRootExecutionIdentity, createCollaborationMemberExecutionIdentity, createTeamRootExecutionIdentity } from "../../agent-collaboration/execution/domain/root-execution-identity.js";
import { CollaborationAgentPresentationEventAdapter } from "../../agent-collaboration/execution/events/collaboration-agent-presentation-event-adapter.js";
import type { ActiveCollaborationRootDirectory } from "../../agent-collaboration/execution/services/active-collaboration-root-directory.js";
import type { AgentRun } from "../../agent-execution/domain/agent-run.js";
import type { RootTeamRun } from "../../agent-team-execution/domain/root-team-run.js";
import type { TeamRunExecutionTreeFile } from "../../agent-team-execution/domain/team-run-execution-tree.js";
import { TeamRunEventSourceType } from "../../agent-team-execution/domain/team-run-event.js";
import { teamMemberPresentationOf } from "../../agent-team-execution/services/team-run-agent-access.js";
import type { AgentRunMetadata } from "../../run-history/store/agent-run-metadata-types.js";
import type { StandaloneAgentRunRoot } from "../../standalone-agent-run-root/domain/standalone-agent-run-root.js";
import type { AgentOrgUnit } from "../domain/agent-org-container-file.js";
import type { LiveUnitView, OrgUnitViews, UnitViewFrame } from "./org-view-composition.js";

export type OrgUnitViewSources = Readonly<{
  /** A Team unit's root while it is managed (never restored here). */
  teamRoot(teamRunId: string): RootTeamRun | null;
  /** An agent unit's root while it is live (never restored here). */
  agentRoot(agentRunId: string): StandaloneAgentRunRoot | null;
  registrations: Pick<ActiveCollaborationRootDirectory, "onRegistrationChanged">;
  storedTeamTree(teamRunId: string): Promise<TeamRunExecutionTreeFile | null>;
  storedAgentMetadata(agentRunId: string): Promise<AgentRunMetadata | null>;
}>;

const unitRun = (unit: AgentOrgUnit) => unit.kind === "agent" ? createAgentRootExecutionIdentity(unit.runId) : createTeamRootExecutionIdentity(unit.runId);
const errorText = (error: unknown): string => error instanceof Error ? error.message : String(error);

/** A live Team unit: its tree, its members' statuses and inputs, and its root's frames (its members' output and messages). */
const teamView = (root: RootTeamRun): LiveUnitView => Object.freeze({
  file: () => Object.freeze({ kind: "agent_team" as const, tree: root.getExecutionTreeSnapshot() }),
  statuses: () => root.getLeafAgentStatusSnapshots().map((snapshot) => Object.freeze({ agentRunId: snapshot.execution.agentRunId,
    status: snapshot.details.status, backgroundTasksRunning: snapshot.details.backgroundTasksRunning,
    trigger: snapshot.details.trigger ?? null, errorMessage: snapshot.details.errorMessage ?? null })),
  inputStates: () => root.getInputStateSnapshots(),
  hasOpenWork: () => root.hasOpenExecutionWork(),
  subscribe: (listener) => root.subscribeToEvents(({ event }) => {
    // The Team's own rows are its tree's (the Org's rows are composed from its units' trees).
    if (isRunTreeChangedEvent(event as never)) return;
    if (event.eventSourceType === TeamRunEventSourceType.MEMBERSHIP) { listener({ kind: "parts_changed" }); return; }
    if (event.eventSourceType === TeamRunEventSourceType.COMMUNICATION) { listener({ kind: "communication", message: event.payload }); return; }
    const presentation = teamMemberPresentationOf(event);
    if (presentation) listener({ kind: "presentation", agentRunId: presentation.agentRunId, message: presentation.message });
  }),
});

/**
 * A live agent unit: its agent's status and input, its root's messages, and its agent's own output, followed from agent
 * run to agent run (an idle shutdown replaces the agent run; the root stays), as the run's own Agent stream presents it.
 */
const agentView = (root: StandaloneAgentRunRoot): LiveUnitView => Object.freeze({
  file: () => null,
  statuses: () => {
    const run = root.activeAgentRun();
    if (!run?.isActive()) return [];
    const snapshot = run.getStatusSnapshot();
    return [Object.freeze({ agentRunId: root.agentRunId, status: snapshot.status, backgroundTasksRunning: snapshot.background_tasks_running })];
  },
  inputStates: () => {
    const run = root.activeAgentRun();
    return run?.isActive() ? [Object.freeze({ agent_run_id: root.agentRunId, state: run.getInputStateSnapshot() })] : [];
  },
  hasOpenWork: () => {
    const run = root.activeAgentRun();
    return Boolean(run?.isActive()) && ["running", "initializing", "error"].includes(String(run!.getStatusSnapshot().status).toLowerCase());
  },
  subscribe: (listener: (frame: UnitViewFrame) => void) => {
    const identity = createCollaborationMemberExecutionIdentity({ root: root.rootIdentity, memberAddress: root.agentAddress, agentRunId: root.agentRunId });
    const adapter = new CollaborationAgentPresentationEventAdapter((agentRunId) => agentRunId === root.agentRunId ? identity : null);
    let watched: AgentRun | null = null;
    let offRun: (() => void) | null = null;
    const attach = (run: AgentRun): void => {
      if (run === watched) return;
      offRun?.();
      watched = run;
      offRun = run.subscribeToEvents((event) => {
        try {
          const adapted = adapter.adapt(identity, { kind: "agent_run", event });
          if (adapted.kind === "publish") listener({ kind: "presentation", agentRunId: root.agentRunId, message: adapted.message });
        } catch (error) {
          console.warn(`Agent run '${root.agentRunId}': an event was not shown in its Org: ${errorText(error)}`);
        }
      });
    };
    const live = root.activeAgentRun();
    if (live) attach(live);
    const offReady = root.onAgentReady(attach);
    const offRoot = root.subscribeToEvents(({ event }) => {
      if (event.kind === "communication") listener({ kind: "communication", message: event.message });
    });
    return () => { offReady(); offRoot(); offRun?.(); offRun = null; };
  },
});

/** The composition root's units for an Org view composition: live roots by their managers, stored files otherwise. */
export const createOrgUnitViews = (sources: OrgUnitViewSources): OrgUnitViews => Object.freeze({
  live: (unit) => {
    if (unit.kind === "agent_team") {
      const root = sources.teamRoot(unit.runId);
      return root?.isActive() ? teamView(root) : null;
    }
    const root = sources.agentRoot(unit.runId);
    return root ? agentView(root) : null;
  },
  stored: async (unit) => {
    try {
      return unit.kind === "agent_team"
        ? Object.freeze({ kind: "agent_team" as const, tree: await sources.storedTeamTree(unit.runId) })
        : Object.freeze({ kind: "agent" as const, metadata: await sources.storedAgentMetadata(unit.runId) });
    } catch (error) {
      console.warn(`Org unit ${unit.address} (run '${unit.runId}') is left out of its Org view: its file cannot be read: ${errorText(error)}`);
      return unit.kind === "agent_team" ? Object.freeze({ kind: "agent_team" as const, tree: null }) : Object.freeze({ kind: "agent" as const, metadata: null });
    }
  },
  onLivenessChanged: (unit, listener) => sources.registrations.onRegistrationChanged(unitRun(unit), () => listener()),
});
