import type { AgentDefinitionChangeSignal } from "../../agent-definition/services/agent-definition-change-signal.js";
import type { RootTeamRun } from "../domain/root-team-run.js";
import type { TeamMembershipPlanner } from "./team-membership-planner.js";

const message = (error: unknown): string => error instanceof Error ? error.message : String(error);

/**
 * One live Team run follows its definition now (DS-001): its view is read outside any lock, then the run commits the
 * change. A failure is logged naming the run and leaves it as it is (REQ-007, DESIGN.md rule 7).
 */
export const followLiveTeamRun = async (
  planner: Pick<TeamMembershipPlanner, "viewFor">,
  root: Pick<RootTeamRun, "teamRunId" | "isActive" | "getExecutionTreeSnapshot" | "followDefinition">,
): Promise<void> => {
  try {
    const view = await planner.viewFor(root.getExecutionTreeSnapshot());
    if (view && root.isActive()) await root.followDefinition(view);
  } catch (error) {
    console.warn(`TEAM_RUN_DEFINITION_NOT_FOLLOWED: Team run '${root.teamRunId}' keeps its members (${message(error)}).`);
  }
};

/**
 * D-TRIGGER: on every definition change (a package reload, an app save, a personal setting), every live Team run of
 * this process follows its definition, one after another, each contained (a run that fails is logged and the others
 * continue, N-4). A run whose definition did not change plans nothing, so repeated announcements are harmless. Changes
 * during a pass ask for exactly one more pass.
 */
export class TeamDefinitionChangeListener {
  private pass: Promise<void> | null = null;
  private passRequested = false;
  private closed = false;

  constructor(private readonly dependencies: Readonly<{
    liveRuns(): readonly RootTeamRun[];
    planner: Pick<TeamMembershipPlanner, "viewFor">;
  }>) {}

  /** Follows the signal until the returned function is called. */
  listen(signal: Pick<AgentDefinitionChangeSignal, "subscribe">): () => void {
    const unsubscribe = signal.subscribe(() => { void this.definitionsChanged(); });
    return () => { this.closed = true; unsubscribe(); };
  }

  definitionsChanged(): Promise<void> {
    if (this.closed) return Promise.resolve();
    if (this.pass) {
      this.passRequested = true;
      return this.pass;
    }
    const pass = (async () => {
      do {
        this.passRequested = false;
        for (const root of this.dependencies.liveRuns()) {
          if (this.closed) return;
          await followLiveTeamRun(this.dependencies.planner, root);
        }
      } while (this.passRequested && !this.closed);
    })().finally(() => { this.pass = null; });
    this.pass = pass;
    return pass;
  }
}
