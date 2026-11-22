import type { RunViewStreams } from "../../agent-collaboration/delegation/run-view-stream.js";
import type { ActiveCollaborationRootDirectory } from "../../agent-collaboration/execution/services/active-collaboration-root-directory.js";
import type { AgentRunService } from "../../agent-execution/services/agent-run-service.js";
import type { TeamRunService } from "../../agent-team-execution/services/team-run-service.js";
import { AgentMemoryLayout } from "../../agent-memory/store/agent-memory-layout.js";
import type { TeamRunHistoryService } from "../../run-history/services/team-run-history-service.js";
import { AgentRunMetadataStore } from "../../run-history/store/agent-run-metadata-store.js";
import { TeamRunExecutionTreeStore } from "../../run-history/store/team-run-execution-tree-store.js";
import type { StandaloneAgentRunRootManager } from "../../standalone-agent-run-root/services/standalone-agent-run-root-manager.js";
import { AgentOrgContainerManager } from "./agent-org-container-manager.js";
import { AgentOrgContainers } from "./agent-org-containers.js";
import { createAgentOrgUnitRuns } from "./agent-org-unit-runs.js";
import type { OrgContainerDirectory } from "./org-container-directory.js";
import { createOrgUnitViews } from "./org-unit-views.js";

/**
 * The composition root's Org containers (org-teams-follow-definition): the container lifecycle over the units' own run
 * services, the unit views and roots, and the container directory. The run services are created after the Org run
 * manager, so they are read when first needed.
 */
export const composeAgentOrgContainers = (input: Readonly<{
  memoryDir: string;
  streams: Pick<RunViewStreams, "streamOf">;
  directory: OrgContainerDirectory;
  registrations: Pick<ActiveCollaborationRootDirectory, "onRegistrationChanged">;
  teamRuns: () => TeamRunService;
  agentRuns: () => AgentRunService;
  standaloneRoots: () => StandaloneAgentRunRootManager;
  teamHistory: () => Pick<TeamRunHistoryService, "deleteStoredTeamRun">;
}>): AgentOrgContainers => {
  const layout = new AgentMemoryLayout(input.memoryDir);
  const teamTrees = new TeamRunExecutionTreeStore();
  const metadata = new AgentRunMetadataStore(input.memoryDir);
  const units = createAgentOrgUnitRuns({
    teamRuns: {
      createTeamRun: (command) => input.teamRuns().createTeamRun(command),
      terminateTeamRun: (teamRunId) => input.teamRuns().terminateTeamRun(teamRunId),
      getManagedTeamRun: (teamRunId) => input.teamRuns().getManagedTeamRun(teamRunId),
    },
    agentRuns: {
      prepareAgentRun: (command) => input.agentRuns().prepareAgentRun(command),
      terminateAgentRun: (agentRunId) => input.agentRuns().terminateAgentRun(agentRunId),
      cancelPreparedAgentRun: (agentRunId) => input.agentRuns().cancelPreparedAgentRun(agentRunId),
    },
    teamHistory: { deleteStoredTeamRun: (teamRunId) => input.teamHistory().deleteStoredTeamRun(teamRunId) },
  });
  return new AgentOrgContainers({
    manager: new AgentOrgContainerManager({ memoryDir: input.memoryDir, units }),
    streams: input.streams,
    directory: input.directory,
    unitViews: createOrgUnitViews({
      teamRoot: (teamRunId) => input.teamRuns().getManagedTeamRun(teamRunId),
      agentRoot: (agentRunId) => input.standaloneRoots().getActive(agentRunId),
      registrations: input.registrations,
      storedTeamTree: (teamRunId) => teamTrees.read(layout.getTeamDirPath({ rootTeamRunId: teamRunId, ancestorTeamRunIds: [] }), teamRunId),
      storedAgentMetadata: (agentRunId) => metadata.readMetadata(agentRunId),
    }),
    roots: {
      team: (teamRunId, restore) => restore ? input.teamRuns().resolveManagedTeamRun(teamRunId) : Promise.resolve(input.teamRuns().getManagedTeamRun(teamRunId)),
      agent: (agentRunId, restore) => restore ? input.standaloneRoots().resolveRoot(agentRunId) : Promise.resolve(input.standaloneRoots().getActive(agentRunId)),
    },
  });
};
