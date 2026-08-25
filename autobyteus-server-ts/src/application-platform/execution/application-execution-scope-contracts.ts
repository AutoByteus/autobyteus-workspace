import type { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import type { AgentTeamAddress } from "../../agent-collaboration/domain/agent-team-address.js";
import type { AgentDefinitionService } from "../../agent-definition/services/agent-definition-service.js";
import type { AgentRunTerminationResult, CreateAgentRunInput } from "../../agent-execution/services/agent-run-service.js";
import type { TeamMemberAgentMemoryLocation } from "../../agent-memory/domain/agent-memory-location.js";
import type { AgentTeamDefinitionService } from "../../agent-team-definition/services/agent-team-definition-service.js";
import type {
  CreateTeamRunFromRootConfigInput,
  CreateTeamRunInput,
} from "../../agent-team-execution/services/team-run-service.js";
import type { ApplicationAgentToolsSessionFactory } from "../../agent-tools/mcp/agent-tools-mcp-runtime.js";
import type { ApplicationAgentStreamSourceEvent } from "../../application-agent-streaming/domain/application-agent-streaming-models.js";
import type { AuthorizedApplicationAgentTargetDescriptor } from "../../application-orchestration/services/application-agent-target-authorization-service.js";
import type {
  ApplicationPublishedArtifactBindingReader,
  ApplicationPublishedArtifactDeliverySink,
} from "../../application-orchestration/services/application-published-artifact-relay-service.js";
import type { ObservedRunLifecycleEvent } from "../../runtime-management/domain/observed-run-lifecycle-event.js";
import type { PublishedArtifactPublisher } from "../../services/published-artifacts/published-artifact-publisher.js";
import type { PublishedArtifactSummary } from "../../services/published-artifacts/published-artifact-types.js";
import type { WorkspaceManager } from "../../workspaces/workspace-manager.js";

export type ApplicationExecutionScopeIdentity = `application:${string}`;

export type ApplicationExecutionScopeBuildInput = Readonly<{
  scopeIdentity: ApplicationExecutionScopeIdentity;
  memoryDir: string;
  agentDefinitionService: AgentDefinitionService;
  agentTeamDefinitionService: AgentTeamDefinitionService;
  agentToolsSessionFactory: ApplicationAgentToolsSessionFactory;
  workspaceManager: WorkspaceManager;
  bindingReader: ApplicationPublishedArtifactBindingReader;
  artifactDeliverySink: ApplicationPublishedArtifactDeliverySink;
}>;

export type ApplicationAgentLaunchResult = Readonly<{
  runId: string;
}>;

export type ApplicationTeamLaunchMember = Readonly<{
  memberAddress: AgentTeamAddress;
  agentRunId: string;
}>;

export type ApplicationTeamLaunchResult = Readonly<{
  teamRunId: string;
  members: readonly ApplicationTeamLaunchMember[];
}>;

export type ApplicationExecutionInputDisposition =
  | Readonly<{ kind: "ACCEPTED" }>
  | Readonly<{ kind: "REJECTED"; message: string | null }>
  | Readonly<{ kind: "NOT_AVAILABLE" }>;

export interface ApplicationAgentExecution {
  createAgentRun(input: CreateAgentRunInput): Promise<ApplicationAgentLaunchResult>;
  postAgentInput(
    runId: string,
    message: AgentInputUserMessage,
  ): Promise<ApplicationExecutionInputDisposition>;
  terminateAgentRun(runId: string): Promise<AgentRunTerminationResult>;
  observeAgentRunLifecycle(
    runId: string,
    listener: (event: ObservedRunLifecycleEvent) => void,
  ): Promise<(() => void) | null>;
}

export type { CreateTeamRunFromRootConfigInput };

export interface ApplicationTeamExecution {
  createTeamRun(input: CreateTeamRunInput): Promise<ApplicationTeamLaunchResult>;
  createTeamRunFromRootConfig(
    input: CreateTeamRunFromRootConfigInput,
  ): Promise<ApplicationTeamLaunchResult>;
  postTeamInput(
    teamRunId: string,
    message: AgentInputUserMessage,
    targetAgentRunId: string | null,
  ): Promise<ApplicationExecutionInputDisposition>;
  terminateTeamRun(teamRunId: string): Promise<boolean>;
  observeTeamRunLifecycle(
    teamRunId: string,
    listener: (event: ObservedRunLifecycleEvent) => void,
  ): Promise<(() => void) | null>;
}

export interface ApplicationExecutionStreaming {
  attach(
    descriptor: AuthorizedApplicationAgentTargetDescriptor,
    listener: (event: ApplicationAgentStreamSourceEvent) => void,
  ): () => void;
}

export interface ApplicationPublishedArtifactAccess {
  getRunPublishedArtifacts(runId: string): Promise<PublishedArtifactSummary[]>;
  getPublishedArtifactsFromMemoryDir(memoryDir: string): Promise<PublishedArtifactSummary[]>;
  getPublishedArtifactRevisionText(input: {
    runId: string;
    revisionId: string;
  }): Promise<string | null>;
  getPublishedArtifactRevisionTextFromMemoryDir(input: {
    memoryDir: string;
    revisionId: string;
  }): Promise<string | null>;
}

export interface ApplicationExecutionMemoryLookup {
  resolveTeamMemberLocation(input: {
    teamRunId: string;
    memberAddress?: string | null;
    agentRunId?: string | null;
  }): Promise<TeamMemberAgentMemoryLocation | null>;
}

export interface ApplicationExecutionToolReadiness {
  readonly publishedArtifactPublisher: PublishedArtifactPublisher;
  assertReady(): void;
}

export interface ApplicationExecutionLifecycle {
  quiesce(): void;
  close(): Promise<void>;
}
