import { getCollaboratorAdmission } from "../agent-collaboration/collaborators/collaborator-definition-catalog.js";
import type { AgentRunService } from "../agent-execution/services/agent-run-service.js";
import type { AgentOrgRunService } from "../agent-org-execution/services/agent-org-run-service.js";
import type { TeamRunService } from "../agent-team-execution/services/team-run-service.js";
import {
  bindProcessRemoteRunChannel,
  releaseProcessRemoteRunChannel,
} from "../agent-collaboration/execution/remote/remote-run-channel.js";
import { RemoteDelegationReceiver } from "../remote-collaboration/inbound/remote-delegation-receiver.js";
import { RemoteMessageReceiver, type RemoteRootDirectory } from "../remote-collaboration/inbound/remote-message-receiver.js";
import { RemoteRunViewProvider } from "../remote-collaboration/inbound/remote-run-view-provider.js";
import { getAgentRunViewProjectionService } from "../run-history/services/agent-run-view-projection-service.js";
import { getTeamMemberRunViewProjectionService } from "../run-history/services/team-member-run-view-projection-service.js";
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
import { getNodeIdentityService } from "../remote-access/services/node-identity-service.js";
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
  agentRuns: Pick<AgentRunService, "prepareAgentRun" | "recordRunTitle" | "readRunTitle">;
  teamRuns: Pick<TeamRunService, "resolveManagedTeamRun" | "storedRemoteLinkCheck" | "createTeamRun" | "terminateTeamRun" | "recordRunTitle"
    | "readRunTitle" | "pairedAgents">;
  orgRuns: Pick<AgentOrgRunService, "getActive" | "restore" | "storedRemoteLinkCheck">;
}>): (() => void) => {
  const roots: RemoteRootDirectory = {
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
    pairedAgents: (kind) => kind === "agent" ? getStandaloneAgentRunRootManager().pairedAgents : input.teamRuns.pairedAgents,
  };
  const services = composeRemoteCollaboration({
    config: { getAppDataDir: () => input.appDataDir },
    settings: getServerSettingsService(),
    ownNodeId: () => getNodeIdentityService().getNodeId(),
    tempWorkspaceDir: input.tempWorkspaceDir,
    handlers: (services) => ({
      delegatedRuns: new RemoteDelegationReceiver({ admission: getCollaboratorAdmission, catalogPort: services.catalogPort, agentRuns: input.agentRuns,
        teams: new RemoteTeamRunStarter({ teamRuns: input.teamRuns }) }),
      messages: new RemoteMessageReceiver(roots, {
        // autobyteus-269: an accepted work packet's content is the run's title (a peer never starts an Org).
        recordFirstMessage: (root, content) => root.kind === "agent" ? input.agentRuns.recordRunTitle(root.runId, content)
          : root.kind === "agent_team" ? input.teamRuns.recordRunTitle(root.runId, content)
            : Promise.resolve(),
      }),
      availableAgents: new RemoteCatalogLister({ policy: () => getCollaboratorAdmission().policy, catalogPort: services.catalogPort }),
      // autobyteus-278: what the peer's owner reads and drives here, for runs its delegation started.
      runViews: new RemoteRunViewProvider(roots, {
        runTitle: (run) => run.kind === "agent" ? input.agentRuns.readRunTitle(run.runId) : input.teamRuns.readRunTitle(run.runId),
        agentProjection: async (run, agentRunId) => {
          const projection = run.kind === "agent"
            ? await getAgentRunViewProjectionService().getProjection(agentRunId)
            : await getTeamMemberRunViewProjectionService().getProjection(run.runId, agentRunId);
          return Object.freeze({
            agentRunId: run.kind === "agent" ? (projection as { runId: string }).runId : (projection as { agentRunId: string }).agentRunId,
            conversation: projection.conversation, activities: projection.activities, summary: projection.summary ?? null,
            lastActivityAt: projection.lastActivityAt ?? null, hasEarlierActiveTraceEvents: projection.hasEarlierActiveTraceEvents,
          });
        },
      }),
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
