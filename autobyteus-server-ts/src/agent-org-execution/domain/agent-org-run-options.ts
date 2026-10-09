import type { RootExecutionIdentity } from "../../agent-collaboration/execution/domain/root-execution-identity.js";
import type { AgentOrgRunExecutionTreeSnapshot } from "./agent-org-run-execution-tree.js";
import type { AgentOrgCommunicationMessagesFileV1 } from "../persistence/agent-org-communication-messages-v1.js";
import type { RootAgentExecutionRegistry } from "../../agent-collaboration/execution/backends/root-agent-execution-registry.js";
import type { RootTeamExecutionDirectory } from "../../agent-collaboration/execution/backends/root-team-execution-directory.js";
import type { FlatTeamExecutionCallbacks } from "../../agent-team-execution/local/flat-team-execution-callbacks.js";
import type { AgentOrgRunPersistenceCoordinator } from "../services/agent-org-run-persistence-coordinator.js";
import type { RootEventPublisher } from "../../agent-collaboration/execution/services/root-event-publisher.js";
import type { AgentOrgRunEvent } from "./agent-org-run-event.js";
import type { TaskExecutionIdentityCapabilities } from "../../agent-team-execution/task-delegation/task-execution-identity-capabilities.js";
import type { TaskExecutionResourcePort } from "../../agent-collaboration/execution/task/task-execution-resource-port.js";
import type { RootedAgentMemoryLocator } from "../../agent-collaboration/execution/services/rooted-agent-memory-locator.js";
import type { AgentConversationActivityInspector } from "../../agent-memory/services/agent-conversation-activity-inspector.js";
import type { TaskExecutionIdleTimers } from "../../agent-collaboration/execution/task/task-execution-idle-shutdown-schedule.js";
import type { CollaboratorAdmission } from "../../agent-collaboration/collaborators/collaborator-admission.js";
import type { CollaboratorEntry } from "../../run-history/domain/run-execution-tree-shared-records.js";
import type { PreparedCollaboratorHandles } from "../../agent-collaboration/execution/backends/collaborator-handle-preparation.js";

export type AgentOrgRunOptions = Readonly<{
    root: RootExecutionIdentity;
    tree: AgentOrgRunExecutionTreeSnapshot;
    messages: AgentOrgCommunicationMessagesFileV1;
    rootAgents: RootAgentExecutionRegistry;
    teams: RootTeamExecutionDirectory;
    callbacks: FlatTeamExecutionCallbacks;
    persistence: AgentOrgRunPersistenceCoordinator;
    publisher: RootEventPublisher<AgentOrgRunEvent>;
    taskExecutionIdentity: TaskExecutionIdentityCapabilities;
    taskExecutionResources?: TaskExecutionResourcePort;
    memoryLocator?: RootedAgentMemoryLocator;
    activityInspector?: AgentConversationActivityInspector;
    taskExecutionIdleShutdown?: Readonly<{ gracePeriodMs?: () => number; timers?: TaskExecutionIdleTimers }>;
    collaboratorAdmission?: CollaboratorAdmission;
    /** Prepares hosted handles for new collaborator entries (published after the tree write). */
    prepareCollaboratorHandles(entries: readonly CollaboratorEntry[]): Promise<PreparedCollaboratorHandles>;
    onTerminated?(): void;
  }>;
