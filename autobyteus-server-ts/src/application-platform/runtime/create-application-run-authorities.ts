import type { AppConfig } from "../../config/app-config.js";
import type { AgentDefinitionService } from "../../agent-definition/services/agent-definition-service.js";
import type { AgentTeamDefinitionService } from "../../agent-team-definition/services/agent-team-definition-service.js";
import { AgentMemoryLocationService } from "../../agent-memory/services/agent-memory-location-service.js";
import { AgentRunMemoryRecorder } from "../../agent-memory/services/agent-run-memory-recorder.js";
import { AutoByteusAgentRunBackendFactory } from "../../agent-execution/backends/autobyteus/autobyteus-agent-run-backend-factory.js";
import { CodexAgentRunBackendFactory } from "../../agent-execution/backends/codex/backend/codex-agent-run-backend-factory.js";
import { CodexThreadBootstrapper } from "../../agent-execution/backends/codex/backend/codex-thread-bootstrapper.js";
import { ClaudeAgentRunBackendFactory } from "../../agent-execution/backends/claude/backend/claude-agent-run-backend-factory.js";
import { ClaudeSessionBootstrapper } from "../../agent-execution/backends/claude/backend/claude-session-bootstrapper.js";
import { ClaudeSessionManager } from "../../agent-execution/backends/claude/session/claude-session-manager.js";
import { AgentRunIdentityAllocator } from "../../agent-execution/services/agent-run-identity-allocator.js";
import { AgentRunManager } from "../../agent-execution/services/agent-run-manager.js";
import { AgentRunService } from "../../agent-execution/services/agent-run-service.js";
import { MixedTeamRunBackendFactory } from "../../agent-team-execution/backends/mixed/mixed-team-run-backend-factory.js";
import { MixedTeamManager } from "../../agent-team-execution/backends/mixed/mixed-team-manager.js";
import { AgentTeamRunManager } from "../../agent-team-execution/services/agent-team-run-manager.js";
import { TeamRunService } from "../../agent-team-execution/services/team-run-service.js";
import type { DeferredApplicationEngineEventHandlerPort } from "./deferred-application-engine-event-handler-port.js";
import { ApplicationPublishedArtifactRelayService } from "../../application-orchestration/services/application-published-artifact-relay-service.js";
import type { ApplicationRunBindingStore } from "../../application-orchestration/stores/application-run-binding-store.js";
import { AgentRunMetadataService } from "../../run-history/services/agent-run-metadata-service.js";
import { PublishedArtifactProjectionService } from "../../run-history/services/published-artifact-projection-service.js";
import { TeamRunHistoryCatalogService } from "../../run-history/services/team-run-history-catalog-service.js";
import { TeamRunMetadataService } from "../../run-history/services/team-run-metadata-service.js";
import { PublishedArtifactPublicationService } from "../../services/published-artifacts/published-artifact-publication-service.js";
import { RunFileChangeService } from "../../services/run-file-changes/run-file-change-service.js";
import { TeamCommunicationService } from "../../services/team-communication/team-communication-service.js";
import { MemberTeamContextBuilder } from "../../agent-team-execution/services/member-team-context-builder.js";
import type {
  ApplicationAgentToolsSessionAuthority,
} from "../../agent-tools/mcp/application-agent-tools-session-authority.js";

export const createApplicationRunAuthorities = (input: {
  appConfig: AppConfig;
  bindingStore: ApplicationRunBindingStore;
  deferredEnginePort: DeferredApplicationEngineEventHandlerPort;
  agentDefinitionService: AgentDefinitionService;
  agentTeamDefinitionService: AgentTeamDefinitionService;
  agentToolsSessionAuthority: ApplicationAgentToolsSessionAuthority;
}) => {
  const memoryDir = input.appConfig.getMemoryDir();
  const memoryLocationService = new AgentMemoryLocationService({ memoryDir });
  const runFileChangeService = new RunFileChangeService({
    memoryDir,
    memoryLocationService,
  });
  const artifactRelay = new ApplicationPublishedArtifactRelayService({
    bindingStore: input.bindingStore,
    engineHostService: input.deferredEnginePort as never,
  });
  const memberTeamContextBuilder = new MemberTeamContextBuilder(
    input.agentTeamDefinitionService,
  );
  const codexThreadBootstrapper = new CodexThreadBootstrapper(
    undefined,
    undefined,
    input.agentDefinitionService,
    undefined,
    undefined,
    undefined,
    undefined,
    input.agentToolsSessionAuthority,
  );
  const claudeSessionManager = new ClaudeSessionManager(
    undefined,
    undefined,
    input.agentToolsSessionAuthority,
  );
  const claudeSessionBootstrapper = new ClaudeSessionBootstrapper(
    undefined,
    undefined,
    input.agentDefinitionService,
  );
  const agentRunManager = new AgentRunManager({
    autoByteusBackendFactory: new AutoByteusAgentRunBackendFactory({
      agentDefinitionService: input.agentDefinitionService,
    }),
    codexBackendFactory: new CodexAgentRunBackendFactory(
      undefined,
      codexThreadBootstrapper,
    ),
    claudeBackendFactory: new ClaudeAgentRunBackendFactory(
      claudeSessionManager,
      claudeSessionBootstrapper,
    ),
    publishedArtifactRelayService: artifactRelay,
    runFileChangeService,
    memoryRecorder: new AgentRunMemoryRecorder(),
    agentToolMcpSessionAuthority: input.agentToolsSessionAuthority,
  });
  const agentTeamRunManager = new AgentTeamRunManager({
    mixedTeamRunBackendFactory: new MixedTeamRunBackendFactory({
      memberTeamContextBuilder,
      createTeamManager: (context, subTeamRunFactory) =>
        new MixedTeamManager(context, {
          subTeamRunFactory,
          agentRunManager,
          agentToolMcpSessionAuthority:
            input.agentToolsSessionAuthority,
          memberTeamContextBuilder,
        }),
    }),
    teamCommunicationService: new TeamCommunicationService({ memoryDir }),
    runFileChangeService,
  });
  const agentRunMetadataService = new AgentRunMetadataService(memoryDir);
  const teamRunMetadataService = new TeamRunMetadataService(memoryDir);
  const agentRunIdentityAllocator = new AgentRunIdentityAllocator({
    agentDefinitionService: input.agentDefinitionService,
    agentRunManager,
    agentRunMetadataService,
    teamRunMetadataService,
    memoryDir,
  });
  const agentRunService = new AgentRunService(memoryDir, {
    agentRunManager,
    metadataService: agentRunMetadataService,
    agentRunIdentityAllocator,
  });
  const teamRunService = new TeamRunService({
    agentTeamRunManager,
    teamDefinitionService: input.agentTeamDefinitionService,
    teamRunMetadataService,
    agentRunIdentityAllocator,
    teamRunHistoryCatalogService: new TeamRunHistoryCatalogService(memoryDir, {
      teamRunManager: agentTeamRunManager,
    }),
    memoryDir,
    memoryLocationService,
  });
  const publicationService = new PublishedArtifactPublicationService({
    agentRunManager,
    publishedArtifactRelayService: artifactRelay,
  });
  const publishedArtifactProjectionService = new PublishedArtifactProjectionService({
    agentRunManager,
    metadataService: agentRunMetadataService,
  });
  return {
    agentRunService,
    teamRunService,
    teamRunMetadataService,
    publicationService,
    publishedArtifactProjectionService,
    memoryLocationService,
  };
};
