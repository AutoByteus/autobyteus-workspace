import type { RunMessagesFeed } from "../../agent-collaboration/delegation/run-messages-feed.js";
import type { RemoteRunChannelAccess } from "../../agent-collaboration/execution/remote/remote-run-channel.js";
import type { DelegationIndex } from "../../agent-collaboration/delegation/delegation-index.js";
import type { RootExecutionIdentity } from "../../agent-collaboration/execution/domain/root-execution-identity.js";
import type { AgentOrgRunExecutionTreeSnapshot } from "./agent-org-run-execution-tree.js";
import type { AgentOrgCommunicationMessagesFile } from "../persistence/agent-org-communication-messages.js";
import type { RootAgentExecutionRegistry } from "../../agent-collaboration/execution/backends/root-agent-execution-registry.js";
import type { RootTeamExecutionDirectory } from "../../agent-collaboration/execution/backends/root-team-execution-directory.js";
import type { FlatTeamExecutionCallbacks } from "../../agent-team-execution/local/flat-team-execution-callbacks.js";
import type { AgentOrgRunPersistenceCoordinator } from "../services/agent-org-run-persistence-coordinator.js";
import type { RunViewStream } from "../../agent-collaboration/delegation/run-view-stream.js";
import type { AgentOrgRunEvent } from "./agent-org-run-event.js";
import type { RunTaskRecords } from "../../agent-collaboration/execution/task/task-execution-resource-port.js";
import type { AgentRunMemoryLocator } from "../../agent-collaboration/execution/services/agent-run-memory-locator.js";
import type { AgentConversationActivityInspector } from "../../agent-memory/services/agent-conversation-activity-inspector.js";
import type { TaskExecutionIdleTimers } from "../../agent-collaboration/execution/task/task-execution-idle-shutdown-schedule.js";
import type { CollaboratorAdmission } from "../../agent-collaboration/collaborators/collaborator-admission.js";

export type AgentOrgRunOptions = Readonly<{
    root: RootExecutionIdentity;
    tree: AgentOrgRunExecutionTreeSnapshot;
    messages: AgentOrgCommunicationMessagesFile;
    rootAgents: RootAgentExecutionRegistry;
    teams: RootTeamExecutionDirectory;
    callbacks: FlatTeamExecutionCallbacks;
    persistence: AgentOrgRunPersistenceCoordinator;
    publisher: RunViewStream<AgentOrgRunEvent>;
    /** The node's message feed (SR-072): its committed messages into the views of its runs and the runs above them. */
    messageFeed: Pick<RunMessagesFeed, "publish">;
    taskRecords: RunTaskRecords;
    /** The relationships between runs (the Task entries): its peer children (SR-047). */
    delegationIndex: Pick<DelegationIndex, "peerChildrenOf">;
    /** The host's channel to peer nodes (autobyteus-500 FU-011). */
    remoteChannel: RemoteRunChannelAccess;
    memoryLocator?: AgentRunMemoryLocator;
    activityInspector?: AgentConversationActivityInspector;
    taskExecutionIdleShutdown?: Readonly<{ gracePeriodMs?: () => number; timers?: TaskExecutionIdleTimers }>;
    collaboratorAdmission?: CollaboratorAdmission;
    onTerminated?(): void;
  }>;
