import type { ConfiguredAgentExecutionNode, TeamRunExecutionTreeSnapshot } from "../domain/team-run-execution-tree.js";
import { applyTeamRunSelectionPatches, type TeamRunSelectionTarget } from "./team-run-selection-mutator.js";
import type { TeamRunPersistenceCoordinator } from "./team-run-persistence-coordinator.js";

/**
 * Commits a live Team member's automatic runtime switch into the root TeamRun execution tree (autobyteus-646 R-1 step 2):
 * the member's new launch and its pending switch (with its cause, R-7), from targets already validated against the tree.
 * The same shape as `TeamAgentPlatformBindingCommitter`: owned by `RootTeamRun`, it holds no tree state and publishes a
 * durable change only through `replaceTree`.
 */
export class TeamMemberRuntimeSwitchCommitter {
  constructor(private readonly options: Readonly<{
    persistence: Pick<TeamRunPersistenceCoordinator, "commitExecutionTreeMutation">;
    getTree(): TeamRunExecutionTreeSnapshot;
    assertAdmitting(): void;
    replaceTree(tree: TeamRunExecutionTreeSnapshot): void;
    enterLifecycleFailStop(): void;
  }>) {}

  /** The member's node as committed; throws when the tree did not commit. */
  async commit(targets: readonly TeamRunSelectionTarget[], memberAddress: string): Promise<ConfiguredAgentExecutionNode> {
    this.options.assertAdmitting();
    let committedTree: TeamRunExecutionTreeSnapshot | null = null;
    let liveCommitStarted = false;
    let result: Awaited<ReturnType<TeamRunPersistenceCoordinator["commitExecutionTreeMutation"]>>;
    try {
      result = await this.options.persistence.commitExecutionTreeMutation({
        prepareAgainstCurrent: () => {
          this.options.assertAdmitting();
          const nextTree = applyTeamRunSelectionPatches(this.options.getTree(), targets);
          return {
            nextTree,
            requiresWrite: true,
            cancelBeforeDurability: () => undefined,
            commitAfterDurability: () => {
              liveCommitStarted = true;
              this.options.replaceTree(nextTree);
              committedTree = nextTree;
            },
          };
        },
      });
    } catch (error) {
      if (liveCommitStarted) this.options.enterLifecycleFailStop();
      throw new Error(`The member's runtime switch did not commit: ${error instanceof Error ? error.message : String(error)}`);
    }
    if (result.outcome !== "committed" || !committedTree) {
      throw new Error(`The member's runtime switch did not commit (${result.outcome}).`);
    }
    const member = (committedTree as TeamRunExecutionTreeSnapshot).rootTeam.members.find((node) => node.address === memberAddress);
    if (!member) throw new Error(`Configured Team scope '${memberAddress}' was not found after the commit.`);
    return member;
  }
}
