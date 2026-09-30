import type { CollaboratorRootPort } from "../../agent-collaboration/collaborators/collaborator-root-port.js";
import type {
  CollaboratorMention,
  CollaboratorMentionAdmission,
  CollaboratorMentionAdmissionResult,
} from "../../agent-collaboration/collaborators/collaborator-mention-admission.js";
import { getCollaboratorMentionAdmission } from "../../agent-collaboration/collaborators/collaborator-definition-catalog.js";
import type { CollaboratorEntry } from "../../run-history/domain/run-execution-tree-shared-records.js";
import type { AgentOrgRunExecutionTreeSnapshot } from "../domain/agent-org-run-execution-tree.js";
import type { AgentOrgRunEvent } from "../domain/agent-org-run-event.js";
import type { AgentOrgExecutionIndex } from "./agent-org-execution-index.js";
import type { AgentOrgRunPersistenceCoordinator } from "./agent-org-run-persistence-coordinator.js";
import { addAgentOrgCollaborators } from "./agent-org-run-execution-tree-mutator.js";

/** Collaborator facts of one Org tree: the Org, its direct Agents, mounted Teams and their Agents are in the run. */
export const agentOrgCollaboratorPortFor = (
  tree: AgentOrgRunExecutionTreeSnapshot,
  index: AgentOrgExecutionIndex,
): CollaboratorRootPort => {
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
    hasTaskExecutionAt: (address: string) => index.hasTaskExecutionAt(address),
    addressesInUse: () => addresses,
  });
};

/**
 * Org-root collaborator facts and commits. The Org runs `admit` inside its operation gate;
 * this owner commits new entries in one tree write and publishes them.
 */
export class AgentOrgRunCollaborators {
  constructor(private readonly options: Readonly<{
    admission?: CollaboratorMentionAdmission;
    persistence: Pick<AgentOrgRunPersistenceCoordinator, "commitTreeMutation">;
    getTree(): AgentOrgRunExecutionTreeSnapshot;
    getIndex(): AgentOrgExecutionIndex;
    assertAdmitting(): void;
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
      commitEntries: (entries) => this.commit(entries),
    });
  }

  port(): CollaboratorRootPort {
    return agentOrgCollaboratorPortFor(this.options.getTree(), this.options.getIndex());
  }

  private commit(entries: readonly CollaboratorEntry[]): Promise<void> {
    return this.options.persistence.commitTreeMutation({
      prepareAgainstCurrent: () => {
        this.options.assertAdmitting();
        const tree = addAgentOrgCollaborators({ tree: this.options.getTree(), collaborators: entries });
        return {
          nextTree: tree,
          cancelBeforeDurability: () => undefined,
          commitAfterDurability: () => {
            this.options.replaceTree(tree);
            for (const collaborator of entries) this.options.publish({ kind: "collaborator_added", collaborator });
          },
        };
      },
    });
  }
}
