import { getCollaboratorAdmission } from "../agent-collaboration/collaborators/collaborator-definition-catalog.js";
import { PeerStartedRunDecisions } from "../remote-collaboration/inbound/peer-started-run-decisions.js";
import { LiveAgentOrgContainer } from "../agent-org-execution/container/live-agent-org-container.js";
import type { AgentRunService } from "../agent-execution/services/agent-run-service.js";
import type { AgentOrgRunService } from "../agent-org-execution/services/agent-org-run-service.js";
import type { TeamRunService } from "../agent-team-execution/services/team-run-service.js";
import { RemoteDelegationReceiver } from "../remote-collaboration/inbound/remote-delegation-receiver.js";
import { RemoteMessageReceiver, type RemoteRootDirectory } from "../remote-collaboration/inbound/remote-message-receiver.js";
import { RemoteRunViewProvider } from "../remote-collaboration/inbound/remote-run-view-provider.js";
import { DelegatedRunStateHandler } from "../remote-collaboration/inbound/delegated-run-state-handler.js";
import type { ClosedDelegations } from "../remote-collaboration/inbound/closed-delegations.js";
import { getAgentRunViewProjectionService } from "../run-history/services/agent-run-view-projection-service.js";
import { getTeamMemberRunViewProjectionService } from "../run-history/services/team-member-run-view-projection-service.js";
import { DelegatedRunStarter } from "../agent-collaboration/execution/delegation/delegated-run-starter.js";
import { RemoteTeamRunStarter } from "../remote-collaboration/inbound/remote-team-run-starter.js";
import { RemoteCatalogLister } from "../remote-collaboration/inbound/remote-catalog-lister.js";
import {
  bindProcessRemoteCollaboration,
  composeRemoteCollaboration,
  releaseProcessRemoteCollaboration,
  type RemoteCollaborationServices,
} from "../remote-collaboration/remote-collaboration-services.js";
import { getNodeIdentityService } from "../remote-access/services/node-identity-service.js";
import { getServerSettingsService } from "../services/server-settings-service.js";
import { getStandaloneAgentRunRootManager } from "../standalone-agent-run-root/services/standalone-agent-run-root-manager.js";
import { createRootExecutionIdentity, type RootSubjectKind } from "../agent-collaboration/execution/domain/root-execution-identity.js";
import type { CollaborationRootResolver } from "./collaboration-root-resolver.js";
import { PeerStartedRunLaunches } from "../remote-collaboration/inbound/peer-started-run-launches.js";
import type { RemoteRunChannelAccess } from "../agent-collaboration/execution/remote/remote-run-channel.js";
import type { PeerDiscoveryAccess } from "../agent-collaboration/execution/remote/peer-discovery-channel.js";
import type { RunningAgentsComposition } from "./running-agents-composition.js";

/**
 * autobyteus-500 FU-011: the studio composes remote collaboration after the run services it serves, so the tools and
 * roots composed before it read its peer client and discovery on use, through this binding. A call happens only once the
 * server serves; one before `bind` is a startup error.
 */
export const createLateRemoteCollaborationBinding = () => {
  let composed: RemoteCollaborationServices | null = null;
  const read = (): RemoteCollaborationServices => {
    if (!composed) throw new Error("Remote collaboration is used before the studio composed it.");
    return composed;
  };
  const channel: RemoteRunChannelAccess = () => read().client;
  const discovery: PeerDiscoveryAccess = () => read().discovery;
  return Object.freeze({ channel, discovery, bind: (services: RemoteCollaborationServices) => { composed = services; } });
};
export type LateRemoteCollaborationBinding = ReturnType<typeof createLateRemoteCollaborationBinding>;

/**
 * Composes this node's remote collaboration (CM-10 … CM-12) around the process's run services: the settings,
 * the peer client (the roots' `RemoteRunChannel`), the discovery, and the peer gateway behind `/rest/remote/*`. Inbound
 * messages reach roots only through their managers' public resolve / restore APIs. Returns the services (the node
 * access gate takes the peer verifier and the peer revocations from them) and its release.
 */
export const composeStudioRemoteCollaboration = (input: Readonly<{
  appDataDir: string;
  memoryDir: string;
  tempWorkspaceDir: string;
  agentRuns: Pick<AgentRunService, "prepareAgentRun" | "recordRunTitle" | "readRunTitle" | "stopForTaskClosure">;
  teamRuns: Pick<TeamRunService, "storedRemoteLinkCheck" | "createTeamRun" | "terminateTeamRun" | "recordRunTitle"
    | "readRunTitle" | "runAgents" | "stopForTaskClosure">;
  orgRuns: Pick<AgentOrgRunService, "storedRemoteLinkCheck">;
  /** The node's one root resolution (autobyteus-285 D5); the receivers keep their own "not found" handling. */
  rootResolver: CollaborationRootResolver;
  /** autobyteus-492: this node's running agents (messages by run ID) and their listing (a peer's `running-agents`). */
  running: RunningAgentsComposition;
  /** autobyteus-591: the peer-started runs their delegating node closed, loaded (the state handler and S-5 write it). */
  closedDelegations: ClosedDelegations;
}>): Readonly<{ services: RemoteCollaborationServices; release: () => void }> => {
  const resolve = (rootSubjectKind: RootSubjectKind, rootRunId: string) =>
    input.rootResolver.resolveOrRestore(createRootExecutionIdentity({ rootSubjectKind, rootRunId }));
  const roots: RemoteRootDirectory = {
    storedLinkCheck: (root, query) => {
      switch (root.kind) {
        case "agent": return getStandaloneAgentRunRootManager().storedRemoteLinkCheck(root.runId, query);
        case "agent_team": return input.teamRuns.storedRemoteLinkCheck(root.runId, query);
        case "agent_org": return input.orgRuns.storedRemoteLinkCheck(root.runId, query);
      }
    },
    standalone: async (agentRunId) => { const found = await resolve("agent", agentRunId); return found?.kind === "agent" ? found.root : null; },
    team: async (teamRunId) => { const found = await resolve("agent_team", teamRunId); return found?.kind === "agent_team" ? found.root : null; },
    // An Org container hosts no agent: a peer's run delegated from an Org member is linked to the member's unit run.
    org: async (orgRunId) => { const found = await resolve("agent_org", orgRunId); return found?.kind === "agent_org" && !(found.root instanceof LiveAgentOrgContainer) ? found.root : null; },
    runAgents: (kind) => kind === "agent" ? getStandaloneAgentRunRootManager().runAgents : input.teamRuns.runAgents,
    liveRoot: (root) => input.rootResolver.resolveActive(root)?.root ?? null,
  };
  // autobyteus-32: decisions of delegated runs started for a peer, held until the peer's work packet arrives.
  const peerStartedRunDecisions = new PeerStartedRunDecisions();
  const services = composeRemoteCollaboration({
    config: { getAppDataDir: () => input.appDataDir },
    settings: getServerSettingsService(),
    ownNodeId: () => getNodeIdentityService().getNodeId(),
    tempWorkspaceDir: input.tempWorkspaceDir,
    handlers: (services) => ({
      delegatedRuns: ((starter) => new RemoteDelegationReceiver({ admission: getCollaboratorAdmission, catalogPort: services.catalogPort, starter,
        teams: new RemoteTeamRunStarter({ starter }), decisions: peerStartedRunDecisions }))(new DelegatedRunStarter({ agentRuns: input.agentRuns, teamRuns: input.teamRuns })),
      messages: new RemoteMessageReceiver(roots, {
        // autobyteus-269: an accepted work packet's content is the run's title (a peer never starts an Org).
        recordFirstMessage: (root, content) => root.kind === "agent" ? input.agentRuns.recordRunTitle(root.runId, content)
          : root.kind === "agent_team" ? input.teamRuns.recordRunTitle(root.runId, content)
            : Promise.resolve(),
      }, peerStartedRunDecisions, input.running.runningAgents, input.closedDelegations),
      // autobyteus-591 DN-2: a delegating node's state of a run it started here (closed: recorded and stopped).
      delegatedRunStates: new DelegatedRunStateHandler({ roots, closed: input.closedDelegations,
        agentRuns: input.agentRuns, teamRuns: input.teamRuns }),
      availableAgents: new RemoteCatalogLister({ policy: () => getCollaboratorAdmission().policy, catalogPort: services.catalogPort }),
      // autobyteus-492: this node's running runs a person started, for a peer (no caller here).
      runningAgents: { list: async () => Object.freeze({ accepted: true as const, agents: await input.running.listing.list({ caller: null }) }) },
      // autobyteus-278: what the peer's owner reads and drives here, for runs its delegation started.
      runViews: new RemoteRunViewProvider(roots, {
        runTitle: (run) => run.kind === "agent" ? input.agentRuns.readRunTitle(run.runId) : input.teamRuns.readRunTitle(run.runId),
        runLaunches: ((launches) => (run) => launches.of(run))(new PeerStartedRunLaunches(input.memoryDir)),
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
  // The process binding serves only the GraphQL resolvers (framework edge, FU-500-02); the roots, the discovery tools
  // and the routes get the services from the composition (autobyteus-500 FU-011).
  const release = () => releaseProcessRemoteCollaboration(services);
  return Object.freeze({ services, release });
};
