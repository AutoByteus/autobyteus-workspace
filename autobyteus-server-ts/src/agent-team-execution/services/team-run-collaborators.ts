import type { CollaboratorRootPort } from "../../agent-collaboration/collaborators/collaborator-root-port.js";
import type {
  CollaboratorMention,
  CollaboratorMentionAdmission,
  CollaboratorMentionAdmissionResult,
} from "../../agent-collaboration/collaborators/collaborator-mention-admission.js";
import { getCollaboratorMentionAdmission } from "../../agent-collaboration/collaborators/collaborator-definition-catalog.js";
import type { CollaboratorEntry } from "../../run-history/domain/run-execution-tree-shared-records.js";
import type { TeamRunExecutionTreeSnapshot } from "../domain/team-run-execution-tree.js";
import { TeamRunEventSourceType, type TeamRunEvent } from "../domain/team-run-event.js";
import type { TeamExecutionIndex } from "./team-execution-index.js";
import type { TeamRunPersistenceCoordinator } from "./team-run-persistence-coordinator.js";
import { addCollaboratorsToTree } from "./team-run-execution-tree-mutator.js";

/** Collaborator facts of one Team tree: the root Team and its configured Agents are in the run. */
export const teamCollaboratorPortFor = (
  tree: TeamRunExecutionTreeSnapshot,
  index: TeamExecutionIndex,
): CollaboratorRootPort => Object.freeze({
  rootKind: "agent_team",
  isApplicationBound: tree.applicationBinding !== null,
  rootLaunchConfiguration: () => tree.rootTeam.defaultLaunchConfiguration,
  configuredDefinitionIds: () => Object.freeze({
    agentDefinitionIds: new Set(tree.rootTeam.members.map((member) => member.agentDefinitionId)),
    teamDefinitionIds: new Set([tree.rootTeam.teamDefinitionId]),
  }),
  collaborators: () => tree.rootTeam.collaborators,
  hasTaskExecutionAt: (address: string) => index.hasTaskExecutionAt(address),
  addressesInUse: () => new Set([
    ...tree.rootTeam.members.map((member) => member.address),
    ...tree.rootTeam.collaborators.map((entry) => entry.address),
  ]),
});

/**
 * Team-root collaborator facts and commits. The root runs `admit` inside its materialization
 * gate; this owner commits new entries in one tree write and publishes them.
 */
export class TeamRunCollaborators {
  constructor(private readonly options: Readonly<{
    rootTeamRunId: string;
    admission?: CollaboratorMentionAdmission;
    persistence: Pick<TeamRunPersistenceCoordinator, "commitExecutionTreeMutation">;
    getTree(): TeamRunExecutionTreeSnapshot;
    getIndex(): TeamExecutionIndex;
    assertAdmitting(): void;
    replaceTree(tree: TeamRunExecutionTreeSnapshot): void;
    publish(event: TeamRunEvent): void;
  }>) {}

  admit(input: Readonly<{
    focusedAgentRunId: string;
    content: string;
    mentions: readonly CollaboratorMention[];
  }>): Promise<CollaboratorMentionAdmissionResult> {
    return (this.options.admission ?? getCollaboratorMentionAdmission()).admit(this.port(), {
      ...input,
      commitEntries: (entries) => this.commit(entries),
    });
  }

  port(): CollaboratorRootPort {
    return teamCollaboratorPortFor(this.options.getTree(), this.options.getIndex());
  }

  private async commit(entries: readonly CollaboratorEntry[]): Promise<void> {
    const result = await this.options.persistence.commitExecutionTreeMutation({
      prepareAgainstCurrent: () => {
        this.options.assertAdmitting();
        const nextTree = addCollaboratorsToTree({ tree: this.options.getTree(), collaborators: entries });
        return {
          nextTree,
          requiresWrite: true,
          cancelBeforeDurability: () => undefined,
          commitAfterDurability: () => {
            this.options.replaceTree(nextTree);
            for (const collaborator of entries) {
              this.options.publish({
                eventSourceType: TeamRunEventSourceType.COLLABORATOR,
                payload: { eventType: "COLLABORATOR_ADDED", collaborator },
              });
            }
          },
        };
      },
    });
    if (result.outcome === "committed") return;
    if (result.outcome === "finalization_indeterminate") {
      throw new Error(`Collaborators for root '${this.options.rootTeamRunId}' may not have been saved (${result.stage}).`);
    }
    throw new Error(`Collaborators for root '${this.options.rootTeamRunId}' were not saved: ${result.cause.message}`);
  }
}
