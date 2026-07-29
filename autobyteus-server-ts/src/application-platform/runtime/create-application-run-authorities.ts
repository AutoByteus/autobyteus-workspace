import type { AppConfig } from "../../config/app-config.js";
import type { AgentDefinitionService } from "../../agent-definition/services/agent-definition-service.js";
import type { AgentTeamDefinitionService } from "../../agent-team-definition/services/agent-team-definition-service.js";
import { AgentMemoryLocationService } from "../../agent-memory/services/agent-memory-location-service.js";
import { AgentRunMemoryRecorder } from "../../agent-memory/services/agent-run-memory-recorder.js";
import { AutoByteusAgentRunBackendFactory } from "../../agent-execution/backends/autobyteus/autobyteus-agent-run-backend-factory.js";
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

export const createApplicationRunAuthorities = (input: {
  appConfig: AppConfig;
  bindingStore: ApplicationRunBindingStore;
  deferredEnginePort: DeferredApplicationEngineEventHandlerPort;
  agentDefinitionService: AgentDefinitionService;
  agentTeamDefinitionService: AgentTeamDefinitionService;
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
  const agentRunManager = new AgentRunManager({
    autoByteusBackendFactory: new AutoByteusAgentRunBackendFactory({
      agentDefinitionService: input.agentDefinitionService,
    }),
    publishedArtifactRelayService: artifactRelay,
    runFileChangeService,
    memoryRecorder: new AgentRunMemoryRecorder(),
  });
  const agentRunService = new AgentRunService(memoryDir, { agentRunManager });
  const agentTeamRunManager = new AgentTeamRunManager({
    mixedTeamRunBackendFactory: new MixedTeamRunBackendFactory({
      createTeamManager: (context, subTeamRunFactory) =>
        new MixedTeamManager(context, {
          subTeamRunFactory,
          agentRunManager,
        }),
    }),
    teamCommunicationService: new TeamCommunicationService({ memoryDir }),
    runFileChangeService,
  });
  const teamRunMetadataService = new TeamRunMetadataService(memoryDir);
  const teamRunService = new TeamRunService({
    agentTeamRunManager,
    teamDefinitionService: input.agentTeamDefinitionService,
    teamRunMetadataService,
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
    metadataService: new AgentRunMetadataService(memoryDir),
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
