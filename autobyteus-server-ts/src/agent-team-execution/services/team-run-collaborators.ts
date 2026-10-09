import { buildInRunPlacements, type CollaboratorRootPort } from "../../agent-collaboration/collaborators/collaborator-root-port.js";
import type {
  CatalogTaskSource,
  CollaboratorAdmission,
  CollaboratorAdmissionResult,
  CollaboratorMention,
} from "../../agent-collaboration/collaborators/collaborator-admission.js";
import type { AvailableCollaborator } from "../../agent-collaboration/collaborators/collaborator-candidate-policy.js";
import { getCollaboratorAdmission } from "../../agent-collaboration/collaborators/collaborator-definition-catalog.js";
import { CollaboratorAdmissionQueue } from "../../agent-collaboration/collaborators/collaborator-admission-queue.js";
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
  ownDefinition: () => Object.freeze({ kind: "agent_team", definitionId: tree.rootTeam.teamDefinitionId }),
  inRunPlacementsByDefinition: () => buildInRunPlacements({
    configured: tree.rootTeam.members.map((member) => ({
      ref: { kind: "agent", definitionId: member.agentDefinitionId }, address: member.address,
    })),
    collaborators: tree.rootTeam.collaborators,
  }),
  collaborators: () => tree.rootTeam.collaborators,
  addressesInUse: () => new Set([
    ...tree.rootTeam.members.map((member) => member.address),
    ...tree.rootTeam.collaborators.map((entry) => entry.address),
  ]),
});

/**
 * Team-root collaborators. For `@` it only resolves the mentioned definitions' addresses (nothing
 * is added). For a first message to a catalog address the root runs `bringInAt` inside its
 * materialization gate; this owner prepares the hosted executions, commits the new entries in one
 * tree write, then publishes the executions (Offline) and `COLLABORATOR_ADDED`. It also answers
 * the read-only catalog questions of the root.
 */
export class TeamRunCollaborators {
  private readonly queue = new CollaboratorAdmissionQueue();

  constructor(private readonly options: Readonly<{
    rootTeamRunId: string;
    admission?: CollaboratorAdmission;
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

  /** `@`: each mentioned definition's name, kind and address; adds nothing. Call only inside the root gate. */
  resolveMentions(definitions: readonly CollaboratorMention[]): Promise<CollaboratorAdmissionResult> {
    return this.queue.run(() => this.admission.resolveMentions(this.port(), definitions));
  }

  /**
   * A first message to a catalog address (DS-002): brings its definition in unless the
   * address joined the run meanwhile; null when it is no catalog address. Call only inside
   * the root gate.
   */
  bringInAt(input: Readonly<{ address: string; senderRunId: string }>): Promise<CollaboratorAdmissionResult | null> {
    return this.queue.run(async () => {
      const definition = await this.admission.catalogDefinitionAt(this.port(), input.address);
      return definition ? this.ensureNow({ senderRunId: input.senderRunId, definitions: [definition] }) : null;
    });
  }

  listAvailable(): Promise<readonly AvailableCollaborator[]> { return this.admission.policy.listEligible(this.port()); }
  catalogTaskSource(input: Readonly<{ address: string; senderRunId: string }>): Promise<CatalogTaskSource | null> {
    return this.admission.catalogTaskSource(this.port(), input);
  }

  private get admission(): CollaboratorAdmission { return this.options.admission ?? getCollaboratorAdmission(); }

  private ensureNow(input: Readonly<{ senderRunId: string; definitions: readonly CollaboratorMention[] }>): Promise<CollaboratorAdmissionResult> {
    return this.admission.ensure(this.port(), {
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
