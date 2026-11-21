import type { DelegationIndex } from "../../agent-collaboration/delegation/delegation-index.js";
import type { RootExecutionIdentity } from "../../agent-collaboration/execution/domain/root-execution-identity.js";
import type { TeamRunExecutionTreeSnapshot } from "../domain/team-run-execution-tree.js";
import { TEAM_MEMBERSHIP_CHANGED_EVENT, type TeamRunEvent } from "../domain/team-run-event.js";
import type { TeamRun } from "../domain/team-run.js";
import type { TeamRunPersistenceCoordinator } from "../services/team-run-persistence-coordinator.js";
import type { TeamChangeNoticeSource } from "./team-change-notice-source.js";
import type { TeamDefinitionView, TeamMembershipChange } from "./team-membership-change.js";
import { planOrWarn } from "./team-membership-planner.js";

/** What follows a committed change: removed members leave, members are told, the views and run-tree rows follow. */
export type TeamMembershipFollowers = Readonly<{
  /** The run's own TeamRun: its removed members leave (DS-004). */
  teamRun: Pick<TeamRun, "followMembership">;
  notices: Pick<TeamChangeNoticeSource, "recordChange">;
  /** The run-tree rows of this run and the runs above it are read again (DS-007 b). */
  runParts: Pick<DelegationIndex, "runPartsChanged">;
  /** The run's view stream: an open Team view shows the change (DS-007 a). */
  publish(event: TeamRunEvent): void;
}>;

/**
 * DS-001 for one live Team run, built inside `RootTeamRun` like its platform-binding committer: the change is planned
 * against the run's current tree under its persistence lock (a stale plan never overwrites a newer change), written
 * once, then the run swaps its tree, index and membership together (`replaceTree`), its removed members leave, every
 * remaining member's notice is recorded, and the views are told. A write that is durable but cannot be applied live
 * stops the run (the existing fail-stop rule).
 */
export class TeamMembershipCommitter {
  constructor(private readonly options: Readonly<{
    rootIdentity: RootExecutionIdentity;
    persistence: TeamRunPersistenceCoordinator;
    getTree(): TeamRunExecutionTreeSnapshot;
    assertAdmitting(): void;
    replaceTree(tree: TeamRunExecutionTreeSnapshot): void;
    enterLifecycleFailStop(): void;
    followers: TeamMembershipFollowers;
  }>) {}

  /** Follows `view` now; the committed change, or null when nothing changed (no write, no event) or it did not commit. */
  async follow(view: TeamDefinitionView): Promise<TeamMembershipChange | null> {
    this.options.assertAdmitting();
    let planned: TeamMembershipChange | null = null;
    let liveCommitStarted = false;
    let result: Awaited<ReturnType<TeamRunPersistenceCoordinator["commitExecutionTreeMutation"]>>;
    try {
      result = await this.options.persistence.commitExecutionTreeMutation({
        prepareAgainstCurrent: () => {
          this.options.assertAdmitting();
          const tree = this.options.getTree();
          planned = planOrWarn(tree, view);
          const change = planned;
          return {
            nextTree: change?.tree ?? tree,
            requiresWrite: change !== null,
            cancelBeforeDurability: () => { planned = null; },
            commitAfterDurability: () => {
              if (!change) return;
              liveCommitStarted = true;
              this.options.replaceTree(change.tree);
            },
          };
        },
      });
    } catch (error) {
      if (liveCommitStarted) this.options.enterLifecycleFailStop();
      throw error;
    }
    const change: TeamMembershipChange | null = planned;
    if (result.outcome !== "committed" || !change) {
      if (result.outcome !== "committed") {
        console.warn(`TEAM_RUN_DEFINITION_NOT_FOLLOWED: Team run '${this.options.rootIdentity.rootRunId}' was not changed (${result.outcome}).`);
      }
      return null;
    }
    this.applied(change);
    return change;
  }

  /** The effects of a committed change, in order (also after a stored change, once the run is live). */
  applied(change: TeamMembershipChange): void {
    const { followers } = this.options;
    followers.teamRun.followMembership(change.left.map((member) => member.agentRunId),
      () => followers.publish(TEAM_MEMBERSHIP_CHANGED_EVENT));
    followers.notices.recordChange(change);
    followers.runParts.runPartsChanged(this.options.rootIdentity);
    followers.publish(TEAM_MEMBERSHIP_CHANGED_EVENT);
  }
}
