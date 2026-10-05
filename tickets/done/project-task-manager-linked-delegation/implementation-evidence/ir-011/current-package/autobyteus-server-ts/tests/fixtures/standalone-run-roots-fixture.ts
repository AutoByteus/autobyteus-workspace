import { createCollaboratorAdmission } from "../../src/agent-collaboration/collaborators/collaborator-definition-catalog.js";
import { ActiveCollaborationRootDirectory } from "../../src/agent-collaboration/execution/services/active-collaboration-root-directory.js";
import { RootedAgentMemoryLocator } from "../../src/agent-collaboration/execution/services/rooted-agent-memory-locator.js";
import type { AgentRunManager } from "../../src/agent-execution/services/agent-run-manager.js";
import type { StandaloneAgentRunLifecycleService } from "../../src/agent-execution/services/standalone-agent-run-lifecycle-service.js";
import { FlatTeamExecutionFactory } from "../../src/agent-team-execution/local/flat-team-execution-factory.js";
import { createTaskExecutionIdentityCapabilities } from "../../src/agent-team-execution/task-delegation/task-execution-identity-capabilities.js";
import { AgentRunMetadataService } from "../../src/run-history/services/agent-run-metadata-service.js";
import { StandaloneAgentRunRootManager } from "../../src/standalone-agent-run-root/services/standalone-agent-run-root-manager.js";

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
  const memoryLocator = new RootedAgentMemoryLocator({ memoryDir: input.memoryDir });
  return new StandaloneAgentRunRootManager({
    memoryDir: input.memoryDir,
    activeRootDirectory: new ActiveCollaborationRootDirectory(),
    definitions: { getAgentDefinitionById: async () => null },
    host: {
      getActiveRun: (hostRunId) => input.agentRunManager.getActiveRun(hostRunId),
      activateHost: (hostRunId, activation) => input.lifecycleService.activateHost(hostRunId, activation),
      terminateHost: (hostRunId) => input.lifecycleService.terminateHost(hostRunId),
      readMetadata: (hostRunId) => metadataService.readMetadata(hostRunId),
      recordCollaborationPackageCreated: async () => undefined,
    },
    rootDependencies: {
      flatTeamExecutionFactory: new FlatTeamExecutionFactory({ memoryLocator }),
      taskExecutionIdentity: createTaskExecutionIdentityCapabilities({
        allocateForAgentDefinition: async () => { throw new Error("No copies in this fixture."); },
      }),
      teamDefinitions: { getDefinitionById: async () => null },
      memoryLocator,
      collaboratorAdmission: createCollaboratorAdmission({
        listAgentDefinitions: async () => [], listTeamDefinitions: async () => [],
        getAgentDefinition: async () => null, getTeamDefinition: async () => null,
      }, { validate: async () => { throw new Error("unused"); }, validateMany: async () => [] } as never),
    },
  });
};
