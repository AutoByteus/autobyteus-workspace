import type { CollaboratorRootPort } from "../../agent-collaboration/collaborators/collaborator-root-port.js";
import type {
  CollaboratorMention,
  CollaboratorMentionAdmission,
  CollaboratorMentionAdmissionResult,
} from "../../agent-collaboration/collaborators/collaborator-mention-admission.js";
import { getCollaboratorMentionAdmission } from "../../agent-collaboration/collaborators/collaborator-definition-catalog.js";
import type { AgentLaunchConfiguration } from "../../agent-team-execution/domain/team-run-config.js";
import type { CollaboratorEntry } from "../../run-history/domain/run-execution-tree-shared-records.js";
import type { AgentRunCollaborationTreeSnapshot } from "../domain/agent-run-collaboration-tree.js";
import type { AgentRunCollaborationRootEvent } from "../domain/agent-run-collaboration-root-event.js";
import type { AgentRunCollaborationExecutionIndex } from "./agent-run-collaboration-execution-index.js";
import type { AgentRunCollaborationPersistenceCoordinator } from "./agent-run-collaboration-persistence-coordinator.js";
import { addAgentRunCollaborators } from "./agent-run-collaboration-tree-mutator.js";

/** Collaborator facts of one Agent-root tree: the host Agent's own definition is in the run. */
export const agentRunCollaboratorPortFor = (
  tree: AgentRunCollaborationTreeSnapshot,
  index: AgentRunCollaborationExecutionIndex,
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
  hasTaskExecutionAt: (address: string) => index.hasTaskExecutionAt(address),
  addressesInUse: () => new Set([tree.host.address, ...tree.collaborators.map((entry) => entry.address)]),
});

/**
 * Agent-root collaborator facts and commits. The root runs `admit` inside its operation gate;
 * the first commit creates the run's collaboration package.
 */
export class AgentRunCollaborationCollaborators {
  constructor(private readonly options: Readonly<{
    admission?: CollaboratorMentionAdmission;
    /** The host run's own settings; collaborators snapshot them (REQ-004). */
    rootLaunchConfiguration: AgentLaunchConfiguration;
    persistence: Pick<AgentRunCollaborationPersistenceCoordinator, "commitTreeMutation">;
    getTree(): AgentRunCollaborationTreeSnapshot;
    getIndex(): AgentRunCollaborationExecutionIndex;
    assertAdmitting(): void;
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
      commitEntries: (entries) => this.commit(entries),
    });
  }

  port(): CollaboratorRootPort {
    return agentRunCollaboratorPortFor(this.options.getTree(), this.options.getIndex(), this.options.rootLaunchConfiguration);
  }

  private commit(entries: readonly CollaboratorEntry[]): Promise<void> {
    return this.options.persistence.commitTreeMutation({
      prepareAgainstCurrent: () => {
        this.options.assertAdmitting();
        const tree = addAgentRunCollaborators({ tree: this.options.getTree(), collaborators: entries });
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
