import type { CollaboratorRootPort } from "../../agent-collaboration/collaborators/collaborator-root-port.js";
import type {
  CollaboratorMention,
  CollaboratorMentionAdmission,
  CollaboratorMentionAdmissionResult,
} from "../../agent-collaboration/collaborators/collaborator-mention-admission.js";
import type { CollaboratorIdentityPorts } from "../../agent-collaboration/collaborators/collaborator-identity-allocator.js";
import { getCollaboratorMentionAdmission } from "../../agent-collaboration/collaborators/collaborator-definition-catalog.js";
import type { PreparedCollaboratorHandles } from "../../agent-collaboration/execution/backends/collaborator-handle-preparation.js";
import type { CollaboratorEntry } from "../../run-history/domain/run-execution-tree-shared-records.js";
import type { AgentOrgRunExecutionTreeSnapshot } from "../domain/agent-org-run-execution-tree.js";
import type { AgentOrgRunEvent } from "../domain/agent-org-run-event.js";
import type { AgentOrgRunPersistenceCoordinator } from "./agent-org-run-persistence-coordinator.js";
import { addAgentOrgCollaborators } from "./agent-org-run-execution-tree-mutator.js";

/** Collaborator facts of one Org tree: the Org, its direct Agents, mounted Teams and their Agents are in the run. */
export const agentOrgCollaboratorPortFor = (tree: AgentOrgRunExecutionTreeSnapshot): CollaboratorRootPort => {
  const agentDefinitionIds = new Set<string>();
  const teamDefinitionIds = new Set<string>([tree.rootOrg.orgDefinitionId]);
  const addresses = new Set<string>(tree.rootOrg.collaborators.map((entry) => entry.address));
  for (const member of tree.rootOrg.members) {
    addresses.add(member.address);
    if ("agentRunId" in member) {
      agentDefinitionIds.add(member.agentDefinitionId);
      continue;
    }
    teamDefinitionIds.add(member.teamDefinitionId);
    member.members.forEach((agent) => agentDefinitionIds.add(agent.agentDefinitionId));
  }
  return Object.freeze({
    rootKind: "agent_org",
    isApplicationBound: tree.applicationBinding !== null,
    rootLaunchConfiguration: () => tree.rootOrg.defaultLaunchConfiguration,
    configuredDefinitionIds: () => Object.freeze({ agentDefinitionIds, teamDefinitionIds }),
    collaborators: () => tree.rootOrg.collaborators,
    addressesInUse: () => addresses,
  });
};

/**
 * Org-root collaborator admission (DS-001). The Org runs `admit` inside its operation gate;
 * this owner prepares the hosted handles, commits the new entries in one tree write, then
 * publishes the handles (Offline) and `collaborator_added`.
 */
export class AgentOrgRunCollaborators {
  constructor(private readonly options: Readonly<{
    admission?: CollaboratorMentionAdmission;
    identities: CollaboratorIdentityPorts;
    persistence: Pick<AgentOrgRunPersistenceCoordinator, "commitTreeMutation">;
    getTree(): AgentOrgRunExecutionTreeSnapshot;
    assertAdmitting(): void;
    prepareHandles(entries: readonly CollaboratorEntry[]): Promise<PreparedCollaboratorHandles>;
    replaceTree(tree: AgentOrgRunExecutionTreeSnapshot): void;
    publish(event: AgentOrgRunEvent): void;
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
