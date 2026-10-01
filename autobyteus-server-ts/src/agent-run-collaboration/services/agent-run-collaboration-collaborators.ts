import type { CollaboratorRootPort } from "../../agent-collaboration/collaborators/collaborator-root-port.js";
import type {
  CollaboratorMention,
  CollaboratorMentionAdmission,
  CollaboratorMentionAdmissionResult,
} from "../../agent-collaboration/collaborators/collaborator-mention-admission.js";
import { getCollaboratorMentionAdmission } from "../../agent-collaboration/collaborators/collaborator-definition-catalog.js";
import type { CollaboratorIdentityPorts } from "../../agent-collaboration/collaborators/collaborator-identity-allocator.js";
import type { PreparedCollaboratorHandles } from "../../agent-collaboration/execution/backends/collaborator-handle-preparation.js";
import type { AgentLaunchConfiguration } from "../../agent-team-execution/domain/team-run-config.js";
import type { CollaboratorEntry } from "../../run-history/domain/run-execution-tree-shared-records.js";
import type { AgentRunCollaborationTreeSnapshot } from "../domain/agent-run-collaboration-tree.js";
import type { AgentRunCollaborationRootEvent } from "../domain/agent-run-collaboration-root-event.js";
import type { AgentRunCollaborationPersistenceCoordinator } from "./agent-run-collaboration-persistence-coordinator.js";
import { addAgentRunCollaborators } from "./agent-run-collaboration-tree-mutator.js";

/** Collaborator facts of one Agent-root tree: the host Agent's own definition is in the run. */
export const agentRunCollaboratorPortFor = (
  tree: AgentRunCollaborationTreeSnapshot,
  rootLaunchConfiguration: AgentLaunchConfiguration,
): CollaboratorRootPort => Object.freeze({
  rootKind: "agent",
  isApplicationBound: false,
  rootLaunchConfiguration: () => rootLaunchConfiguration,
  configuredDefinitionIds: () => Object.freeze({
    agentDefinitionIds: new Set([tree.host.agentDefinitionId]),
    teamDefinitionIds: new Set<string>(),
  }),
  collaborators: () => tree.collaborators,
  addressesInUse: () => new Set([tree.host.address, ...tree.collaborators.map((entry) => entry.address)]),
});

/**
 * Agent-root collaborator admission (DS-001). The root runs `admit` inside its operation gate;
 * this owner prepares the hosted handles, commits the new entries in one tree write (the first
 * commit creates the run's collaboration package), then publishes the handles (Offline) and
 * `collaborator_added`.
 */
export class AgentRunCollaborationCollaborators {
  constructor(private readonly options: Readonly<{
    admission?: CollaboratorMentionAdmission;
    /** The host run's own settings; collaborators snapshot them (REQ-004). */
    rootLaunchConfiguration: AgentLaunchConfiguration;
    identities: CollaboratorIdentityPorts;
    persistence: Pick<AgentRunCollaborationPersistenceCoordinator, "commitTreeMutation">;
    getTree(): AgentRunCollaborationTreeSnapshot;
    assertAdmitting(): void;
    prepareHandles(entries: readonly CollaboratorEntry[]): Promise<PreparedCollaboratorHandles>;
    replaceTree(tree: AgentRunCollaborationTreeSnapshot): void;
    publish(event: AgentRunCollaborationRootEvent): void;
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
    return agentRunCollaboratorPortFor(this.options.getTree(), this.options.rootLaunchConfiguration);
  }

  private async add(entries: readonly CollaboratorEntry[]): Promise<void> {
    const handles = await this.options.prepareHandles(entries);
    try {
      await this.options.persistence.commitTreeMutation({
        prepareAgainstCurrent: () => {
          this.options.assertAdmitting();
          const tree = addAgentRunCollaborators({ tree: this.options.getTree(), collaborators: entries });
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
