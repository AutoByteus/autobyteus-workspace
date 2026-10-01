import type { CollaboratorRootPort } from "../../agent-collaboration/collaborators/collaborator-root-port.js";
import type {
  CollaboratorMention,
  CollaboratorMentionAdmission,
  CollaboratorMentionAdmissionResult,
} from "../../agent-collaboration/collaborators/collaborator-mention-admission.js";
import { getCollaboratorMentionAdmission } from "../../agent-collaboration/collaborators/collaborator-definition-catalog.js";
import type { CollaboratorIdentityPorts } from "../../agent-collaboration/collaborators/collaborator-identity-allocator.js";
import type { PreparedCollaboratorHandles } from "../../agent-collaboration/execution/backends/collaborator-handle-preparation.js";
import type { TeamRun } from "../domain/team-run.js";
import type { FlatTeamCollaboratorHost } from "../local/flat-team-execution-factory.js";
import type { ConfiguredMemberActivationMode } from "../local/flat-team-execution-context.js";
import { prepareTeamRootCollaborators } from "./team-root-collaborator-hosting.js";
import type { CollaboratorEntry } from "../../run-history/domain/run-execution-tree-shared-records.js";
import type { TeamRunExecutionTreeSnapshot } from "../domain/team-run-execution-tree.js";
import { TeamRunEventSourceType, type TeamRunEvent } from "../domain/team-run-event.js";
import type { TeamRunPersistenceCoordinator } from "./team-run-persistence-coordinator.js";
import { addCollaboratorsToTree } from "./team-run-execution-tree-mutator.js";

/** Collaborator facts of one Team tree: the root Team and its configured Agents are in the run. */
export const teamCollaboratorPortFor = (tree: TeamRunExecutionTreeSnapshot): CollaboratorRootPort => Object.freeze({
  rootKind: "agent_team",
  isApplicationBound: tree.applicationBinding !== null,
  rootLaunchConfiguration: () => tree.rootTeam.defaultLaunchConfiguration,
  configuredDefinitionIds: () => Object.freeze({
    agentDefinitionIds: new Set(tree.rootTeam.members.map((member) => member.agentDefinitionId)),
    teamDefinitionIds: new Set([tree.rootTeam.teamDefinitionId]),
  }),
  collaborators: () => tree.rootTeam.collaborators,
  addressesInUse: () => new Set([
    ...tree.rootTeam.members.map((member) => member.address),
    ...tree.rootTeam.collaborators.map((entry) => entry.address),
  ]),
});

/**
 * Team-root collaborator admission (DS-001). The root runs `admit` inside its materialization
 * gate; this owner prepares the hosted executions, commits the new entries in one tree write,
 * then publishes the executions (Offline) and `COLLABORATOR_ADDED`.
 */
export class TeamRunCollaborators {
  constructor(private readonly options: Readonly<{
    rootTeamRunId: string;
    admission?: CollaboratorMentionAdmission;
    identities: CollaboratorIdentityPorts;
    persistence: Pick<TeamRunPersistenceCoordinator, "commitExecutionTreeMutation">;
    getTree(): TeamRunExecutionTreeSnapshot;
    assertAdmitting(): void;
    /** The root TeamRun's collaborator hosting and its TeamRun resolver registration. */
    host: FlatTeamCollaboratorHost;
    registerTeamRun(run: TeamRun): void;
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
      identities: this.options.identities,
      addEntries: (entries) => this.add(entries),
    });
  }

  port(): CollaboratorRootPort {
    return teamCollaboratorPortFor(this.options.getTree());
  }

  /** Re-hosts the run's collaborators on restore (no runtime starts; the first message does). */
  async restore(mode: ConfiguredMemberActivationMode): Promise<void> {
    (await this.prepareHandles(this.options.getTree().rootTeam.collaborators, mode)).commitAfterDurability();
  }

  private prepareHandles(entries: readonly CollaboratorEntry[], mode: ConfiguredMemberActivationMode): Promise<PreparedCollaboratorHandles> {
    return prepareTeamRootCollaborators({ host: this.options.host, registerTeamRun: this.options.registerTeamRun, entries, mode });
  }

  private async add(entries: readonly CollaboratorEntry[]): Promise<void> {
    const handles = await this.prepareHandles(entries, "fresh");
    try {
      await this.commit(entries, handles);
    } catch (error) {
      await handles.abort();
      throw error;
    }
  }

  private async commit(entries: readonly CollaboratorEntry[], handles: PreparedCollaboratorHandles): Promise<void> {
    const result = await this.options.persistence.commitExecutionTreeMutation({
      prepareAgainstCurrent: () => {
        this.options.assertAdmitting();
        const nextTree = addCollaboratorsToTree({ tree: this.options.getTree(), collaborators: entries });
        return {
          nextTree,
          requiresWrite: true,
          cancelBeforeDurability: () => undefined,
          commitAfterDurability: () => {
            handles.commitAfterDurability();
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
