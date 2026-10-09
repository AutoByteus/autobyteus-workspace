import { buildInRunPlacements, type CollaboratorRootPort } from "../../agent-collaboration/collaborators/collaborator-root-port.js";
import type {
  CatalogTaskSource,
  CollaboratorAdmission,
  CollaboratorAdmissionResult,
  CollaboratorMention,
} from "../../agent-collaboration/collaborators/collaborator-admission.js";
import type { AvailableCollaborator } from "../../agent-collaboration/collaborators/collaborator-candidate-policy.js";
import type { AgentTeamAddress } from "../../agent-collaboration/domain/agent-team-address.js";
import type { CatalogDefinitionRef } from "../../agent-collaboration/collaborators/catalog-address-map.js";
import type { CollaboratorIdentityPorts } from "../../agent-collaboration/collaborators/collaborator-identity-allocator.js";
import { getCollaboratorAdmission } from "../../agent-collaboration/collaborators/collaborator-definition-catalog.js";
import { CollaboratorAdmissionQueue } from "../../agent-collaboration/collaborators/collaborator-admission-queue.js";
import type { PreparedCollaboratorHandles } from "../../agent-collaboration/execution/backends/collaborator-handle-preparation.js";
import type { CollaboratorEntry } from "../../run-history/domain/run-execution-tree-shared-records.js";
import type { AgentOrgRunExecutionTreeSnapshot } from "../domain/agent-org-run-execution-tree.js";
import type { AgentOrgRunEvent } from "../domain/agent-org-run-event.js";
import type { AgentOrgRunPersistenceCoordinator } from "./agent-org-run-persistence-coordinator.js";
import { addAgentOrgCollaborators } from "./agent-org-run-execution-tree-mutator.js";

/** Collaborator facts of one Org tree: the Org, its direct Agents, mounted Teams and their Agents are in the run. */
export const agentOrgCollaboratorPortFor = (tree: AgentOrgRunExecutionTreeSnapshot): CollaboratorRootPort => {
  const configured: { ref: CatalogDefinitionRef; address: AgentTeamAddress }[] = [];
  const addresses = new Set<string>(tree.rootOrg.collaborators.map((entry) => entry.address));
  for (const member of tree.rootOrg.members) {
    addresses.add(member.address);
    if ("agentRunId" in member) {
      configured.push({ ref: { kind: "agent", definitionId: member.agentDefinitionId }, address: member.address });
      continue;
    }
    configured.push({ ref: { kind: "agent_team", definitionId: member.teamDefinitionId }, address: member.address });
    member.members.forEach((agent) =>
      configured.push({ ref: { kind: "agent", definitionId: agent.agentDefinitionId }, address: agent.address }));
  }
  return Object.freeze({
    rootKind: "agent_org",
    isApplicationBound: tree.applicationBinding !== null,
    rootLaunchConfiguration: () => tree.rootOrg.defaultLaunchConfiguration,
    // An Org is never a catalog candidate, so it has no own definition to exclude.
    ownDefinition: () => null,
    inRunPlacementsByDefinition: () => buildInRunPlacements({ configured, collaborators: tree.rootOrg.collaborators }),
    collaborators: () => tree.rootOrg.collaborators,
    addressesInUse: () => addresses,
  });
};

/**
 * Org-root collaborators. For `@` it only resolves the mentioned definitions' addresses (nothing
 * is added). For a first message to a catalog address the Org runs `bringInAt` inside its
 * operation gate; this owner prepares the hosted handles, commits the new entries in one tree
 * write, then publishes the handles (Offline) and `collaborator_added`. It also answers the
 * read-only catalog questions of the root.
 */
export class AgentOrgRunCollaborators {
  private readonly queue = new CollaboratorAdmissionQueue();

  constructor(private readonly options: Readonly<{
    admission?: CollaboratorAdmission;
    identities: CollaboratorIdentityPorts;
    persistence: Pick<AgentOrgRunPersistenceCoordinator, "commitTreeMutation">;
    getTree(): AgentOrgRunExecutionTreeSnapshot;
    assertAdmitting(): void;
    prepareHandles(entries: readonly CollaboratorEntry[]): Promise<PreparedCollaboratorHandles>;
    replaceTree(tree: AgentOrgRunExecutionTreeSnapshot): void;
    publish(event: AgentOrgRunEvent): void;
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
    return agentOrgCollaboratorPortFor(this.options.getTree());
  }

  private async add(entries: readonly CollaboratorEntry[]): Promise<void> {
    const handles = await this.options.prepareHandles(entries);
    try {
      await this.options.persistence.commitTreeMutation({
        prepareAgainstCurrent: () => {
          this.options.assertAdmitting();
          const tree = addAgentOrgCollaborators({ tree: this.options.getTree(), collaborators: entries });
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
