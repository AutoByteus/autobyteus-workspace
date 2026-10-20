import type { AgentDefinitionService } from "../agent-definition/services/agent-definition-service.js";
import type { AgentRunService } from "../agent-execution/services/agent-run-service.js";
import type { AgentOrgRunService } from "../agent-org-execution/services/agent-org-run-service.js";
import type { TeamRunService } from "../agent-team-execution/services/team-run-service.js";
import {
  bindProcessRemoteRunChannel,
  releaseProcessRemoteRunChannel,
} from "../agent-collaboration/execution/remote/remote-run-channel.js";
import type { RunModelSelectionValidator } from "../llm-management/services/run-model-selection-service.js";
import { RemoteDelegationReceiver } from "../remote-collaboration/inbound/remote-delegation-receiver.js";
import { RemoteMessageReceiver } from "../remote-collaboration/inbound/remote-message-receiver.js";
import {
  bindProcessRemoteCollaboration,
  composeRemoteCollaboration,
  releaseProcessRemoteCollaboration,
} from "../remote-collaboration/remote-collaboration-services.js";
import { getServerInstanceIdentityService } from "../remote-access/services/server-instance-identity-service.js";
import { getRuntimeAvailabilityService } from "../runtime-management/runtime-availability-service.js";
import { getServerSettingsService } from "../services/server-settings-service.js";
import { getStandaloneAgentRunRootManager } from "../standalone-agent-run-root/services/standalone-agent-run-root-manager.js";

/**
 * Binds this node's remote collaboration (CM-10 … CM-12) around the process's run services: the settings,
 * the peer client as the roots' `RemoteRunChannel`, and the peer gateway behind `/rest/remote/*`. Inbound
 * messages reach roots only through their managers' public resolve / restore APIs. Returns its release.
 */
export const composeStudioRemoteCollaboration = (input: Readonly<{
  appDataDir: string;
  definitions: Pick<AgentDefinitionService, "getAgentDefinitionById">;
  modelSelectionValidator: Pick<RunModelSelectionValidator, "validate">;
  agentRuns: Pick<AgentRunService, "prepareAgentRun">;
  teamRuns: Pick<TeamRunService, "resolveManagedTeamRun">;
  orgRuns: Pick<AgentOrgRunService, "getActive" | "restore">;
}>): (() => void) => {
  const services = composeRemoteCollaboration({
    config: { getAppDataDir: () => input.appDataDir },
    settings: getServerSettingsService(),
    ownNodeId: () => getServerInstanceIdentityService().getServerInstanceId(),
    definitions: input.definitions,
    availability: getRuntimeAvailabilityService(),
    validator: input.modelSelectionValidator,
    handlers: (settings) => ({
      delegatedRuns: new RemoteDelegationReceiver({ published: settings.published, launchCheck: settings.launchCheck, agentRuns: input.agentRuns }),
      messages: new RemoteMessageReceiver({
        standalone: (hostRunId) => getStandaloneAgentRunRootManager().resolveRoot(hostRunId),
        team: (teamRunId) => input.teamRuns.resolveManagedTeamRun(teamRunId),
        org: async (orgRunId) => input.orgRuns.getActive(orgRunId) ?? input.orgRuns.restore(orgRunId),
      }),
    }),
  });
  bindProcessRemoteCollaboration(services);
  try { bindProcessRemoteRunChannel(services.client); }
  catch (error) { releaseProcessRemoteCollaboration(services); throw error; }
  return () => {
    releaseProcessRemoteRunChannel(services.client);
    releaseProcessRemoteCollaboration(services);
  };
};
