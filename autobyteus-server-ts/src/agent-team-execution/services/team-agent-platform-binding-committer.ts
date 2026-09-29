import type { CollaborationAgentPlatformBindingChange } from "../../agent-collaboration/execution/domain/collaboration-agent-platform-binding.js";
import type { TeamRunExecutionTreeSnapshot } from "../domain/team-run-execution-tree.js";
import { TeamAgentPlatformBindingError, createTeamAgentPlatformBinding } from "../domain/team-agent-platform-binding.js";
import { adoptAgentPlatformBindingInTree, replaceAgentPlatformBindingWithoutConversationInTree } from "./team-run-execution-tree-mutator.js";
import type { TeamRunPersistenceCoordinator } from "./team-run-persistence-coordinator.js";

/**
 * Commits one provider platform-binding change into the root TeamRun execution tree.
 * Owned by `RootTeamRun`, which remains the only public authority; this collaborator
 * holds no tree state and publishes a durable change only through `replaceTree`.
 */
export class TeamAgentPlatformBindingCommitter {
  constructor(private readonly options: Readonly<{
    persistence: TeamRunPersistenceCoordinator;
    getTree(): TeamRunExecutionTreeSnapshot;
    assertAdmitting(): void;
    replaceTree(tree: TeamRunExecutionTreeSnapshot): void;
    enterLifecycleFailStop(): void;
  }>) {}

  async commit(change: CollaborationAgentPlatformBindingChange): Promise<void> {
    this.options.assertAdmitting();
    let liveCommitStarted = false;
    let result: Awaited<ReturnType<TeamRunPersistenceCoordinator["commitExecutionTreeMutation"]>>;
    try {
      result = await this.options.persistence.commitExecutionTreeMutation({
        prepareAgainstCurrent: () => {
          this.options.assertAdmitting();
          const tree = this.options.getTree();
          const binding = createTeamAgentPlatformBinding(
            change.kind === "adopt_or_retain" ? change.binding : change.replacement.binding,
          );
          const mutation = change.kind === "adopt_or_retain"
            ? adoptAgentPlatformBindingInTree({ tree, binding })
            : { outcome: "adopted", tree: replaceAgentPlatformBindingWithoutConversationInTree({
                tree, replacement: { ...change.replacement, binding },
              }) };
          return {
            nextTree: mutation.tree,
            requiresWrite: mutation.outcome === "adopted",
            cancelBeforeDurability: () => undefined,
            commitAfterDurability: () => {
              liveCommitStarted = true;
              this.options.replaceTree(mutation.tree);
            },
          };
        },
      });
    } catch (error) {
      if (liveCommitStarted) {
        this.options.enterLifecycleFailStop();
        throw new TeamAgentPlatformBindingError(
          "TEAM_AGENT_PLATFORM_BINDING_COMMIT_FAILED",
          "The team provider binding committed durably but live finalization failed.",
          { cause: error, indeterminate: true },
        );
      }
      if (error instanceof TeamAgentPlatformBindingError) throw error;
      throw new TeamAgentPlatformBindingError(
        "TEAM_AGENT_PLATFORM_BINDING_COMMIT_FAILED",
        "The team provider binding did not commit.",
        { cause: error },
      );
    }
    if (result.outcome === "committed") return;
    if (result.outcome === "finalization_indeterminate") {
      throw new TeamAgentPlatformBindingError(
        "TEAM_AGENT_PLATFORM_BINDING_COMMIT_FAILED",
        "The team provider binding commit is indeterminate.",
        { indeterminate: true },
      );
    }
    throw new TeamAgentPlatformBindingError(
      "TEAM_AGENT_PLATFORM_BINDING_COMMIT_FAILED",
      "The team provider binding did not commit.",
      { cause: result.cause },
    );
  }
}
