import type { CollaborationHandoff } from "../../../agent-collaboration/domain/collaboration-handoff.js";
import type { TeamRun } from "../../domain/team-run.js";
import type { TeamRunAgentTeamNode } from "../../domain/team-run-config.js";
import type { TeamRunContext } from "../../domain/team-run-context.js";
import type { TaskTeamExecutionFactory } from "../task-team-execution-factory.js";
import type { ConfiguredMemberActivationMode, FlatTeamExecutionContext } from "../flat-team-execution-context.js";

export type PreparedCollaboratorTeam = Readonly<{
  run: TeamRun;
  /** Publishes the TeamRun (Offline members); call after the tree write is durable. */
  commit(): void;
  abort(): Promise<void>;
}>;

/**
 * Collaborator Teams of a Team root: one TeamRun each under the root TeamRun, with lazily
 * started members. Modelled on mounted Teams in the Org: the root
 * restores them with the run and terminates them with it.
 */
export class CollaboratorTeamExecutionRegistry {
  private readonly active = new Map<string, TeamRun>();
  private readonly reserved = new Set<string>();
  private materializationOpen = true;

  constructor(private readonly options: {
    teamContext: TeamRunContext<FlatTeamExecutionContext>;
    subTeamRunFactory: TaskTeamExecutionFactory;
  }) {}

  list(): readonly TeamRun[] { return Object.freeze([...this.active.values()]); }
  get(teamRunId: string): TeamRun | null { return this.active.get(teamRunId) ?? null; }
  freezeMaterialization(): void { this.materializationOpen = false; }
  hasOpenExecutionWork(): boolean { return this.list().some((run) => run.hasOpenExecutionWork()); }

  async prepare(input: Readonly<{
    teamNode: TeamRunAgentTeamNode;
    handoffs: readonly CollaborationHandoff[];
    mode: ConfiguredMemberActivationMode;
  }>): Promise<PreparedCollaboratorTeam> {
    if (!this.materializationOpen) throw new Error("Collaborator Team materialization is closed for TeamRun termination.");
    const teamRunId = input.teamNode.teamRunId;
    if (this.active.has(teamRunId) || this.reserved.has(teamRunId)) {
      throw new Error(`Collaborator TeamRun '${teamRunId}' is already active or reserved.`);
    }
    this.reserved.add(teamRunId);
    let run: TeamRun;
    try {
      const source = { handoffs: input.handoffs, parentContext: this.options.teamContext, teamNode: input.teamNode };
      const prepared = await this.options.subTeamRunFactory.beginTaskTeam({ ...source,
        activationMode: input.mode, prepareConfiguredAgents: false }).prepare();
      prepared.commitAfterDurability();
      run = prepared.teamRun;
    } catch (error) {
      this.reserved.delete(teamRunId);
      throw error;
    }
    let state: "prepared" | "committed" | "aborted" = "prepared";
    return Object.freeze({
      run,
      commit: () => {
        if (state !== "prepared" || !this.materializationOpen) throw new Error(`Collaborator TeamRun '${teamRunId}' is not publishable.`);
        this.reserved.delete(teamRunId);
        this.active.set(teamRunId, run);
        state = "committed";
      },
      abort: async () => {
        if (state !== "prepared") return;
        state = "aborted";
        this.reserved.delete(teamRunId);
        await run.terminate();
      },
    });
  }

  dispose(): void {
    this.active.clear();
    this.reserved.clear();
  }
}
