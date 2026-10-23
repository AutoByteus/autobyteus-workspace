import type { TaskExecutionResourcePort } from "../../agent-collaboration/execution/task/task-execution-resource-port.js";
import type { TokenUsageCapability } from "../../token-usage/providers/token-usage-capability.js";
import type { CollaborationMemberExecutionIdentity } from "../../agent-collaboration/execution/domain/root-execution-identity.js";
import type { AgentRunMemoryLocator } from "../../agent-collaboration/execution/services/agent-run-memory-locator.js";
import type { AgentConversationActivityInspector } from "../../agent-memory/services/agent-conversation-activity-inspector.js";
import type { TaskExecutionIdleTimers } from "../../agent-collaboration/execution/task/task-execution-idle-shutdown-schedule.js";
import type { TeamRunExecutionTreeSnapshot } from "../domain/team-run-execution-tree.js";
import type { TeamRunEvent } from "../domain/team-run-event.js";
import type { TeamRun } from "../domain/team-run.js";
import type { TeamExecutionIndex } from "../services/team-execution-index.js";
import type {
  ExecutionTreeCommitResult,
  PreparedTaskActivationMutation,
} from "../services/team-run-persistence-contract.js";
import type { TeamRunResolver } from "../services/team-run-resolver.js";
import type { TaskExecutionIdentityCapabilities } from "./task-execution-identity-capabilities.js";
import type { RemoteRunLinks } from "../../agent-collaboration/execution/remote/remote-run-links.js";
import type { RemoteDelegation } from "../../agent-collaboration/execution/remote/remote-delegation.js";

/** Host capabilities required by the Team task-execution adapter and lifecycle. */
export type TeamTaskExecutionServiceOptions = Readonly<{
  rootTeamRunId: string;
  taskExecutionResources?: TaskExecutionResourcePort;
  getTree(): TeamRunExecutionTreeSnapshot;
  getIndex(): TeamExecutionIndex;
  /** The root's remote endpoints: the remote runs' Task ownership, the closure fence and AR-003. */
  remoteLinks: RemoteRunLinks;
  /** Remote placements: planning and activation (DS-001). */
  remoteDelegation: RemoteDelegation;
  isRootOpen(): boolean;
  authorize(identity: CollaborationMemberExecutionIdentity): void;
  requireTeamRun(teamRunId: string): Promise<TeamRun>;
  teamRunResolver: TeamRunResolver;
  commitTaskActivation(command: PreparedTaskActivationMutation): Promise<ExecutionTreeCommitResult>;
  enterLifecycleFailStop(): void;
  replaceTree(tree: TeamRunExecutionTreeSnapshot): void;
  publish(event: TeamRunEvent): void;
  taskExecutionIdentity: TaskExecutionIdentityCapabilities;
  memoryLocator?: AgentRunMemoryLocator;
  activityInspector?: AgentConversationActivityInspector;
  tokenUsageReadiness?: Pick<TokenUsageCapability, "assertCurrentSchemaReady">;
  idleShutdown?: Readonly<{ gracePeriodMs?: () => number; timers?: TaskExecutionIdleTimers }>;
  /** Told after every live-lease release (DS-004). */
  onLiveLeaseReleased?: () => void;
}>;
