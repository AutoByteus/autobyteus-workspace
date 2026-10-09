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

/**
 * Collaborator facts of one Agent-root tree for one viewer (the focused or sending agent). The
 * host is always in the run, as the run's own agent at its host address; its definition is the
 * viewer's own only when the viewer is the host, so every other agent in the run can mention,
 * list and message the host while the host never offers itself.
 */
export const standaloneRootCollaboratorPortFor = (
  tree: StandaloneRootTreeSnapshot,
  rootLaunchConfiguration: AgentLaunchConfiguration,
  viewerAgentRunId: string,
): CollaboratorRootPort => {
  const hostDefinition = Object.freeze({ kind: "agent" as const, definitionId: tree.host.agentDefinitionId });
  const ownDefinition = viewerAgentRunId === tree.host.agentRunId ? hostDefinition : null;
  return Object.freeze({
    rootKind: "agent",
    isApplicationBound: false,
    rootLaunchConfiguration: () => rootLaunchConfiguration,
    ownDefinition: () => ownDefinition,
    inRunPlacementsByDefinition: () => buildInRunPlacements({
      runAgent: { ref: hostDefinition, address: tree.host.address },
      configured: [],
      collaborators: tree.collaborators,
    }),
    collaborators: () => tree.collaborators,
    addressesInUse: () => new Set([tree.host.address, ...tree.collaborators.map((entry) => entry.address)]),
  });
};

/**
 * Agent-root collaborators. For `@` it only resolves the mentioned definitions' addresses (nothing
 * is added). For a first message to a catalog address the root runs `bringInAt` inside its
 * operation gate; this owner prepares the hosted handles, commits the new entries in one tree
 * write (the first commit creates the run's collaboration package), then publishes the handles
 * (Offline) and `collaborator_added`. Its catalog questions never write.
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

  /**
   * `@` for the focused agent: each mentioned definition's name, kind, address and presence;
   * adds nothing. Call only inside the root gate.
   */
  resolveMentions(viewerAgentRunId: string, definitions: readonly CollaboratorMention[]): Promise<CollaboratorAdmissionResult> {
    return this.queue.run(() => this.admission.resolveMentions(this.portFor(viewerAgentRunId), definitions));
  }

  /**
   * A first message to a catalog address (DS-002): brings its definition in unless the
   * address joined the run meanwhile; null when it is no catalog address. Call only inside
   * the root gate.
   */
  bringInAt(input: Readonly<{ address: string; senderRunId: string }>): Promise<CollaboratorAdmissionResult | null> {
    return this.queue.run(async () => {
      const definition = await this.admission.catalogDefinitionAt(this.portFor(input.senderRunId), input.address);
      return definition ? this.ensureNow({ senderRunId: input.senderRunId, definitions: [definition] }) : null;
    });
  }

  /** `list_available_agents` for the calling agent. */
  listAvailable(viewerAgentRunId: string): Promise<readonly AvailableCollaborator[]> {
    return this.admission.policy.listEligible(this.portFor(viewerAgentRunId));
  }

  catalogTaskSource(input: Readonly<{ address: string; senderRunId: string }>): Promise<CatalogTaskSource | null> {
    return this.admission.catalogTaskSource(this.portFor(input.senderRunId), input);
  }

  private get admission(): CollaboratorAdmission { return this.options.admission ?? getCollaboratorAdmission(); }

  private ensureNow(input: Readonly<{ senderRunId: string; definitions: readonly CollaboratorMention[] }>): Promise<CollaboratorAdmissionResult> {
    return this.admission.ensure(this.portFor(input.senderRunId), {
      ...input,
      identities: this.options.identities,
      addEntries: (entries) => this.add(entries),
    });
  }

  /** The root's collaborator facts as seen by one agent of the run. */
  portFor(viewerAgentRunId: string): CollaboratorRootPort {
    return standaloneRootCollaboratorPortFor(this.options.getTree(), this.options.rootLaunchConfiguration, viewerAgentRunId);
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
