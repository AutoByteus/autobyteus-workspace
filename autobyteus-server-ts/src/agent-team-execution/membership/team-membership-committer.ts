import type { DelegationIndex } from "../../agent-collaboration/delegation/delegation-index.js";
import type { RootExecutionIdentity } from "../../agent-collaboration/execution/domain/root-execution-identity.js";
import type { TeamRunExecutionTreeSnapshot } from "../domain/team-run-execution-tree.js";
import { TEAM_MEMBERSHIP_CHANGED_EVENT, type TeamRunEvent } from "../domain/team-run-event.js";
import type { TeamRun } from "../domain/team-run.js";
import type { TeamRunPersistenceCoordinator } from "../services/team-run-persistence-coordinator.js";
import type { TeamChangeNoticeSource } from "./team-change-notice-source.js";
import { changesTheTeam, leavingReleaseChange, type TeamDefinitionView, type TeamMembershipChange } from "./team-membership-change.js";
import { planOrWarn } from "./team-membership-planner.js";

/** What follows a committed change: leaving members stop, members are told, the views and run-tree rows follow. */
export type TeamMembershipFollowers = Readonly<{
  /** The run's own TeamRun: its live executions, its leaving members' stop and their stopped handles (DS-004). */
  teamRun: Pick<TeamRun, "followMembership" | "liveExecutionIds" | "removeStoppedHandle">;
  notices: Pick<TeamChangeNoticeSource, "recordChange">;
  /** The run-tree rows of this run and the runs above it are read again (DS-007). */
  runParts: Pick<DelegationIndex, "runPartsChanged">;
  /** The run's view stream: an open Team view shows the change (DS-007). */
  publish(event: TeamRunEvent): void;
}>;

type Committed = Readonly<{ outcome: "committed" | "not_committed" | "finalization_indeterminate"; change: TeamMembershipChange | null }>;

/**
 * DS-001 and the release step of DS-004 for one live Team run, built inside `RootTeamRun` like its platform-binding
 * committer. Every change is planned against the run's current tree and its live executions under its persistence
 * lock (a stale plan never overwrites a newer change), written once, then the run swaps its tree, index and membership
 * together (`replaceTree`). A durable write that cannot be applied live stops the run (the existing fail-stop rule).
 */
export class TeamMembershipCommitter {
  constructor(private readonly options: Readonly<{
    rootIdentity: RootExecutionIdentity;
    persistence: TeamRunPersistenceCoordinator;
    getTree(): TeamRunExecutionTreeSnapshot;
    assertAdmitting(): void;
    isAdmitting(): boolean;
    replaceTree(tree: TeamRunExecutionTreeSnapshot): void;
    enterLifecycleFailStop(): void;
    followers: TeamMembershipFollowers;
  }>) {}

  /** Follows `view` now; the committed change, or null when nothing changed (no write, no event) or it did not commit. */
  async follow(view: TeamDefinitionView): Promise<TeamMembershipChange | null> {
    this.options.assertAdmitting();
    const result = await this.commit((tree, live) => planOrWarn(tree, view, live));
    if (result.outcome !== "committed") {
      console.warn(`TEAM_RUN_DEFINITION_NOT_FOLLOWED: Team run '${this.options.rootIdentity.rootRunId}' was not changed (${result.outcome}).`);
      return null;
    }
    if (result.change) this.applied(result.change);
    return result.change;
  }

  /**
   * The effects of a committed change, in order (also after a stored change, once the run is live): leaving members
   * stop; a removed or released member's stopped handle goes; the members are told; the run-tree rows and the view
   * follow.
   */
  applied(change: TeamMembershipChange): void {
    const { followers } = this.options;
    followers.teamRun.followMembership(change.leaving, (agentRunId) => { void this.memberStopped(agentRunId); });
    for (const member of change.left) if (!change.leaving.includes(member.agentRunId)) followers.teamRun.removeStoppedHandle(member.agentRunId);
    for (const agentRunId of change.released) followers.teamRun.removeStoppedHandle(agentRunId);
    if (changesTheTeam(change)) followers.notices.recordChange(change);
    followers.runParts.runPartsChanged(this.options.rootIdentity);
    followers.publish(TEAM_MEMBERSHIP_CHANGED_EVENT);
  }

  /**
   * DS-004 (SR-010): a leaving member stopped. The release write clears every marker whose execution is no longer live
   * (planned under the lock); then the tree and membership swap (its context goes), its stopped handle goes, and the
   * rows and the view follow. Its handle goes even when it is no longer leaving (N-12: it rejoined meanwhile; its next
   * message starts it again). A definite write failure keeps the marker, with a warning; the next plan clears it. A team
   * run that is ending writes nothing: its markers read as former outside a live run, and its restore clears them.
   */
  async memberStopped(agentRunId: string): Promise<void> {
    if (!this.options.isAdmitting()) return;
    const run = `Team run '${this.options.rootIdentity.rootRunId}'`;
    const stoppedIds = new Set([agentRunId]);
    try {
      const result = await this.commit((tree, live) => leavingReleaseChange(tree, live));
      for (const released of result.change?.released ?? []) stoppedIds.add(released);
      if (result.outcome !== "committed") {
        console.warn(`TEAM_MEMBER_RELEASE_NOT_SAVED: ${run}: member '${agentRunId}' stays marked leaving until the next change (${result.outcome}).`);
      }
    } catch (error) {
      console.warn(`TEAM_MEMBER_RELEASE_NOT_SAVED: ${run}: member '${agentRunId}' stays marked leaving until the next change (${error instanceof Error ? error.message : String(error)}).`);
    }
    const { followers } = this.options;
    for (const stopped of stoppedIds) followers.teamRun.removeStoppedHandle(stopped);
    followers.runParts.runPartsChanged(this.options.rootIdentity);
    followers.publish(TEAM_MEMBERSHIP_CHANGED_EVENT);
  }

  /** One locked plan → write → swap; `plan` gets the live executions read under the lock (a synchronous read, N-14). */
  private async commit(
    plan: (tree: TeamRunExecutionTreeSnapshot, liveExecutionIds: ReadonlySet<string>) => TeamMembershipChange | null,
  ): Promise<Committed> {
    let planned: TeamMembershipChange | null = null;
    let liveCommitStarted = false;
    try {
      const result = await this.options.persistence.commitExecutionTreeMutation({
        prepareAgainstCurrent: () => {
          this.options.assertAdmitting();
          const tree = this.options.getTree();
          planned = plan(tree, this.options.followers.teamRun.liveExecutionIds());
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
      return Object.freeze({ outcome: result.outcome, change: result.outcome === "committed" ? planned : null });
    } catch (error) {
      if (liveCommitStarted) this.options.enterLifecycleFailStop();
      throw error;
    }
  }
}
