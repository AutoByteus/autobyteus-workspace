import { getCollaboratorAdmission } from "../agent-collaboration/collaborators/collaborator-definition-catalog.js";
import type { AgentRunService } from "../agent-execution/services/agent-run-service.js";
import type { AgentOrgRunService } from "../agent-org-execution/services/agent-org-run-service.js";
import type { TeamRunService } from "../agent-team-execution/services/team-run-service.js";
import {
  bindProcessRemoteRunChannel,
  releaseProcessRemoteRunChannel,
} from "../agent-collaboration/execution/remote/remote-run-channel.js";
import { RemoteDelegationReceiver } from "../remote-collaboration/inbound/remote-delegation-receiver.js";
import { RemoteMessageReceiver } from "../remote-collaboration/inbound/remote-message-receiver.js";
import { RemoteTeamRunStarter } from "../remote-collaboration/inbound/remote-team-run-starter.js";
import { RemoteCatalogLister } from "../remote-collaboration/inbound/remote-catalog-lister.js";
import {
  bindProcessRemoteDiscoveryChannel,
  releaseProcessRemoteDiscoveryChannel,
} from "../agent-collaboration/execution/remote/remote-discovery-channel.js";
import {
  bindProcessRemoteCollaboration,
  composeRemoteCollaboration,
  releaseProcessRemoteCollaboration,
} from "../remote-collaboration/remote-collaboration-services.js";
import { getServerInstanceIdentityService } from "../remote-access/services/server-instance-identity-service.js";
import { getServerSettingsService } from "../services/server-settings-service.js";
import { getStandaloneAgentRunRootManager } from "../standalone-agent-run-root/services/standalone-agent-run-root-manager.js";

/**
 * Binds this node's remote collaboration (CM-10 … CM-12) around the process's run services: the settings,
 * the peer client as the roots' `RemoteRunChannel`, and the peer gateway behind `/rest/remote/*`. Inbound
 * messages reach roots only through their managers' public resolve / restore APIs. Returns its release.
 */
export const composeStudioRemoteCollaboration = (input: Readonly<{
  appDataDir: string;
  tempWorkspaceDir: string;
  agentRuns: Pick<AgentRunService, "prepareAgentRun">;
  teamRuns: Pick<TeamRunService, "resolveManagedTeamRun" | "storedRemoteLinkCheck" | "createTeamRun" | "terminateTeamRun">;
  orgRuns: Pick<AgentOrgRunService, "getActive" | "restore" | "storedRemoteLinkCheck">;
}>): (() => void) => {
  const services = composeRemoteCollaboration({
    config: { getAppDataDir: () => input.appDataDir },
    settings: getServerSettingsService(),
    ownNodeId: () => getServerInstanceIdentityService().getServerInstanceId(),
    tempWorkspaceDir: input.tempWorkspaceDir,
    handlers: (services) => ({
      delegatedRuns: new RemoteDelegationReceiver({ admission: getCollaboratorAdmission, catalogPort: services.catalogPort, agentRuns: input.agentRuns,
        teams: new RemoteTeamRunStarter({ teamRuns: input.teamRuns }) }),
      messages: new RemoteMessageReceiver({
        storedLinkCheck: (root, query) => {
          switch (root.kind) {
            case "agent": return getStandaloneAgentRunRootManager().storedRemoteLinkCheck(root.runId, query);
            case "agent_team": return input.teamRuns.storedRemoteLinkCheck(root.runId, query);
            case "agent_org": return input.orgRuns.storedRemoteLinkCheck(root.runId, query);
          }
        },
        standalone: (hostRunId) => getStandaloneAgentRunRootManager().resolveRoot(hostRunId),
        team: (teamRunId) => input.teamRuns.resolveManagedTeamRun(teamRunId),
        org: async (orgRunId) => input.orgRuns.getActive(orgRunId) ?? input.orgRuns.restore(orgRunId),
      }),
      availableAgents: new RemoteCatalogLister({ policy: () => getCollaboratorAdmission().policy, catalogPort: services.catalogPort }),
    }),
  });
  bindProcessRemoteCollaboration(services);
  const release = () => {
    releaseProcessRemoteDiscoveryChannel(services.discovery);
    releaseProcessRemoteRunChannel(services.client);
    releaseProcessRemoteCollaboration(services);
  };
  try {
    bindProcessRemoteRunChannel(services.client);
    bindProcessRemoteDiscoveryChannel(services.discovery);
  } catch (error) { release(); throw error; }
  return release;
};
