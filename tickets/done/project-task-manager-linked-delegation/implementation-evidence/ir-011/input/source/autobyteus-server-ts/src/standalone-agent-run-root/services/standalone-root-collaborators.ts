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
import type { AgentLaunchConfiguration } from "../../agent-team-execution/domain/team-run-config.js";
import type { CollaboratorEntry } from "../../run-history/domain/run-execution-tree-shared-records.js";
import type { StandaloneRootTreeSnapshot } from "../domain/standalone-root-tree.js";
import type { StandaloneRootEvent } from "../domain/standalone-root-event.js";
import type { StandaloneRootPersistenceCoordinator } from "./standalone-root-persistence-coordinator.js";
import { addStandaloneRootCollaborators } from "./standalone-root-tree-mutator.js";

/** Collaborator facts of one Agent-root tree: the host Agent's own definition is the root's own. */
export const standaloneRootCollaboratorPortFor = (
  tree: StandaloneRootTreeSnapshot,
  rootLaunchConfiguration: AgentLaunchConfiguration,
): CollaboratorRootPort => Object.freeze({
  rootKind: "agent",
  isApplicationBound: false,
  rootLaunchConfiguration: () => rootLaunchConfiguration,
  rootDefinition: () => Object.freeze({ kind: "agent", definitionId: tree.host.agentDefinitionId }),
  inRunPlacementsByDefinition: () => buildInRunPlacements({ configured: [], collaborators: tree.collaborators }),
  collaborators: () => tree.collaborators,
  addressesInUse: () => new Set([tree.host.address, ...tree.collaborators.map((entry) => entry.address)]),
});

/**
 * Agent-root collaborators. The root runs `ensure` inside its operation gate (for `@` and for a
 * first message to a catalog address); this owner prepares the hosted handles, commits the new
 * entries in one tree write (the first commit creates the run's collaboration package), then
 * publishes the handles (Offline) and `collaborator_added`. Its catalog questions never write.
 */
export class StandaloneRootCollaborators {
  private readonly queue = new CollaboratorAdmissionQueue();

  constructor(private readonly options: Readonly<{
    admission?: CollaboratorAdmission;
    /** The host run's own settings; collaborators snapshot them (REQ-004). */
    rootLaunchConfiguration: AgentLaunchConfiguration;
    identities: CollaboratorIdentityPorts;
    persistence: Pick<StandaloneRootPersistenceCoordinator, "commitTreeMutation">;
    getTree(): StandaloneRootTreeSnapshot;
    assertAdmitting(): void;
    prepareHandles(entries: readonly CollaboratorEntry[]): Promise<PreparedCollaboratorHandles>;
    replaceTree(tree: StandaloneRootTreeSnapshot): void;
    publish(event: StandaloneRootEvent): void;
  }>) {}

  /** `@`: ensures the mentioned definitions. Call only inside the root gate. */
  ensure(input: Readonly<{ senderRunId: string; definitions: readonly CollaboratorMention[] }>): Promise<CollaboratorAdmissionResult> {
    return this.queue.run(() => this.ensureNow(input));
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
    return standaloneRootCollaboratorPortFor(this.options.getTree(), this.options.rootLaunchConfiguration);
  }

  private async add(entries: readonly CollaboratorEntry[]): Promise<void> {
    const handles = await this.options.prepareHandles(entries);
    try {
      await this.options.persistence.commitTreeMutation({
        prepareAgainstCurrent: () => {
          this.options.assertAdmitting();
          const tree = addStandaloneRootCollaborators({ tree: this.options.getTree(), collaborators: entries });
          return {
            nextTree: tree,
            cancelBeforeDurability: () => undefined,
            commitAfterDurability: () => {
              handles.commitAfterDurability();
              this.options.replaceTree(tree);
              for (const collaborator of entries) this.options.publish({ kind: "collaborator_added", collaborator });
            },
          };
        },
      });
    } catch (error) {
      await handles.abort();
      throw error;
    }
  }
}
