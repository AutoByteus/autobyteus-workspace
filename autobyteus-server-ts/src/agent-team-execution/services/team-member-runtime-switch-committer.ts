import { randomUUID } from "node:crypto";
import { applySelectionToConfiguredMember, type RuntimeSelection } from "../../run-history/domain/runtime-selection-rule.js";
import type { ConfiguredAgentExecutionNode, TeamRunExecutionTreeSnapshot } from "../domain/team-run-execution-tree.js";
import type { TeamRunPersistenceCoordinator } from "./team-run-persistence-coordinator.js";

/** The member's launch the switch expects (R-12): it acts only while the member is still on the failed launch. */
export type MemberSwitchExpectation = Readonly<{ memberAddress: string; from: Readonly<{ runtimeKind: string; llmModelIdentifier: string }> }>;

/** R-12, read from the member's own state: still on the failed launch and no switch pending. */
export const memberStillOn = (member: ConfiguredAgentExecutionNode, from: MemberSwitchExpectation["from"]): boolean =>
  !member.pendingRuntimeSwitch && member.launchConfiguration.runtimeKind === from.runtimeKind
  && member.launchConfiguration.llmModelIdentifier === from.llmModelIdentifier;

/** The member is no longer on the failed launch at the commit (R-12); nothing was written. */
export class MemberAlreadySwitchedError extends Error {}

/**
 * Commits a live Team member's automatic runtime switch into the root TeamRun execution tree (autobyteus-646 R-11): only
 * that member's launch and its pending switch (with its cause, R-7), through the shared member function
 * (`applySelectionToConfiguredMember`), not the stopped-Team Save's target resolution or refusals. The same shape as
 * `TeamAgentPlatformBindingCommitter`: owned by `RootTeamRun`, it holds no tree state and publishes a durable change only
 * through `replaceTree`.
 */
export class TeamMemberRuntimeSwitchCommitter {
  constructor(private readonly options: Readonly<{
    persistence: Pick<TeamRunPersistenceCoordinator, "commitExecutionTreeMutation">;
    getTree(): TeamRunExecutionTreeSnapshot;
    assertAdmitting(): void;
    replaceTree(tree: TeamRunExecutionTreeSnapshot): void;
    enterLifecycleFailStop(): void;
  }>) {}

  /**
   * The member's node as committed with `selection` (already validated); throws `MemberAlreadySwitchedError` when the
   * member is no longer on `from`, and an error when the tree did not commit.
   */
  async commit(expectation: MemberSwitchExpectation, selection: RuntimeSelection): Promise<ConfiguredAgentExecutionNode> {
    const memberAddress = expectation.memberAddress;
    this.options.assertAdmitting();
    let committedTree: TeamRunExecutionTreeSnapshot | null = null;
    let liveCommitStarted = false;
    let result: Awaited<ReturnType<TeamRunPersistenceCoordinator["commitExecutionTreeMutation"]>>;
    try {
      result = await this.options.persistence.commitExecutionTreeMutation({
        prepareAgainstCurrent: () => {
          this.options.assertAdmitting();
          const tree = this.options.getTree();
          const current = tree.rootTeam.members.find((node) => node.address === memberAddress);
          if (!current || !memberStillOn(current, expectation.from)) throw new MemberAlreadySwitchedError(memberAddress);
          const switchId = randomUUID();
          const nextTree: TeamRunExecutionTreeSnapshot = { ...tree, rootTeam: { ...tree.rootTeam,
            members: tree.rootTeam.members.map((node) => node === current ? applySelectionToConfiguredMember(node, selection, switchId) : node) } };
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
      if (error instanceof MemberAlreadySwitchedError) throw error;
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
