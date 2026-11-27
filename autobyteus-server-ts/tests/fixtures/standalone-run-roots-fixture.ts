import { testViewStreams } from "../helpers/view-streams.js";
import { noDelegations, openTaskRecords } from "../helpers/no-delegations.js";
import { createCollaboratorAdmission } from "../../src/agent-collaboration/collaborators/collaborator-definition-catalog.js";
import { ActiveCollaborationRootDirectory } from "../../src/agent-collaboration/execution/services/active-collaboration-root-directory.js";
import type { AgentRunManager } from "../../src/agent-execution/services/agent-run-manager.js";
import type { StandaloneAgentRunLifecycleService } from "../../src/agent-execution/services/standalone-agent-run-lifecycle-service.js";
import { AgentRunMetadataService } from "../../src/run-history/services/agent-run-metadata-service.js";
import { StandaloneAgentRunRootManager } from "../../src/standalone-agent-run-root/services/standalone-agent-run-root-manager.js";
import { NO_FILES_RECEIVED, NO_PEER_CHANNEL } from "../helpers/explicit-host-collaborators.js";

/**
 * The standalone run roots of a test process, composed as the general process run supervisor
 * does: every eligible standalone run is owned by its `StandaloneAgentRunRoot`, whose host is
 * activated through the test's own lifecycle. The catalog is empty (no collaborators to bring in).
 */
export const createStandaloneRunRootsFixture = (input: Readonly<{
  memoryDir: string;
  lifecycleService: StandaloneAgentRunLifecycleService;
  agentRunManager: Pick<AgentRunManager, "getActiveRun">;
  metadataService?: Pick<AgentRunMetadataService, "readMetadata">;
}>): StandaloneAgentRunRootManager => {
  const metadataService = input.metadataService ?? new AgentRunMetadataService(input.memoryDir);
  return new StandaloneAgentRunRootManager({
    memoryDir: input.memoryDir,
    activeRootDirectory: new ActiveCollaborationRootDirectory(),
    definitions: { getAgentDefinitionById: async () => null },
    orgInstruction: async () => null,
    agentServices: {
      getActiveRun: (agentRunId) => input.agentRunManager.getActiveRun(agentRunId),
      activateRunAgent: (agentRunId, activation) => input.lifecycleService.activateRunAgent(agentRunId, activation),
      terminateRunAgent: (agentRunId) => input.lifecycleService.terminateRunAgent(agentRunId),
      checkAutomaticRuntimeSwitch: (switchInput) => input.lifecycleService.checkAutomaticRuntimeSwitch(switchInput),
      switchRuntimeAutomatically: (switchInput) => input.lifecycleService.switchRuntimeAutomatically(switchInput),
      readMetadata: (agentRunId) => metadataService.readMetadata(agentRunId),
    },
    rootDependencies: { remoteChannel: NO_PEER_CHANNEL, receivedFiles: NO_FILES_RECEIVED, delegationIndex: noDelegations(), viewStreams: testViewStreams(), taskRecords: openTaskRecords(),
      collaboratorAdmission: createCollaboratorAdmission({
        listAgentDefinitions: async () => [], listTeamDefinitions: async () => [],
        isAgentHidden: () => false,
        getAgentDefinition: async () => null, getTeamDefinition: async () => null,
      }, { validate: async () => { throw new Error("unused"); }, validateMany: async () => [] } as never),
    },
  });
};
