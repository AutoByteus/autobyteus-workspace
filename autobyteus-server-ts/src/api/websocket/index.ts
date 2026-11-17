import type { FastifyInstance } from "fastify";
import { registerFileExplorerWebsocket } from "./file-explorer.js";
import { registerTerminalWebsocket } from "./terminal.js";
import { registerNodeDesktopWebsocket } from "./node-desktop.js";
import { registerProjectChangesWebsocket } from "./projects.js";
import { registerRunStatusWebsocket } from "./run-status.js";
import { registerPeerRunWebsocket } from "./peer-run.js";
import type { RunStatusService } from "../../agent-collaboration/execution/run-status-service.js";
import { registerUpdateNotificationsWebsocket } from "./update-notifications.js";
import { registerAgentPackageDefinitionsWebsocket } from "./agent-package-definitions.js";
import type { AgentPackageDefinitionChangeHub } from "../../agent-package-definitions/changes/agent-package-definition-change-hub.js";
import { registerAgentWebsocket } from "./agent.js";
import { registerApplicationBackendNotificationWebsocket } from "./application-backend-notifications.js";
import { registerApplicationBackendWebsocket } from "./application-backends.js";
import { registerApplicationAgentCommunicationWebsocket } from "./application-agent-communication.js";
import type { ApplicationPlatformLifecycleReadiness, ApplicationPlatformRealtimeContracts } from "../../application-platform/runtime/application-platform-runtime-contracts.js";
import type { AgentOrgRunService } from "../../agent-org-execution/services/agent-org-run-service.js";
import { AgentOrgStreamHandler } from "../../services/agent-streaming/agent-org-stream-handler.js";
import { AgentCollaborationStreamHandler } from "../../services/agent-streaming/agent-collaboration-stream-handler.js";
import type { StandaloneAgentRunRootManager } from "../../standalone-agent-run-root/services/standalone-agent-run-root-manager.js";
import { AgentTeamSession, AgentTeamStreamHandler } from "../../services/agent-streaming/agent-team-stream-handler.js";
import { AgentSessionManager } from "../../services/agent-streaming/agent-session-manager.js";
import type { AgentStreamHandler } from "../../services/agent-streaming/agent-stream-handler.js";
import type { RemoteRunChannel } from "../../agent-collaboration/execution/remote/remote-run-channel.js";
import type { RunViewSources } from "../../compositions/run-view-composition.js";

export async function registerWebsocketRoutes(
  app: FastifyInstance,
  dependencies: {
    lifecycleReadiness: ApplicationPlatformLifecycleReadiness;
    application: ApplicationPlatformRealtimeContracts;
    agentOrgRunService: Pick<AgentOrgRunService, "getActive" | "restoreForInput" | "restoreRefusal" | "recordRunActivity">;
    teamRunService: ConstructorParameters<typeof AgentTeamStreamHandler>[1];
    standaloneRoots: Pick<StandaloneAgentRunRootManager, "resolveRoot" | "getActive">;
    agentPackageDefinitionChangeHub: AgentPackageDefinitionChangeHub;
    /** autobyteus-461 DS-8, SR-046: what the run view streams need (their child rows, the runs' registration, stored trees). */
    views: RunViewSources;
    /** autobyteus-461 SR-082, SR-083: each run's statuses by run ID, and its rows' change notice. */
    runStatus: RunStatusService;
    /** The studio's channel to peer nodes, for `/ws/peer-run` (autobyteus-500 FU-011). */
    remoteChannel: RemoteRunChannel;
    /** The agent stream's handler, with the composed command coordinator (autobyteus-500 FU-011). */
    agentStreamHandler: AgentStreamHandler;
  },
): Promise<void> {
  await registerFileExplorerWebsocket(app);
  await registerTerminalWebsocket(app);
  await registerNodeDesktopWebsocket(app);
  await registerProjectChangesWebsocket(app);
  await registerRunStatusWebsocket(app, dependencies.runStatus);
  await registerPeerRunWebsocket(app, dependencies.remoteChannel);
  await registerUpdateNotificationsWebsocket(app);
  await registerAgentPackageDefinitionsWebsocket(app, dependencies.agentPackageDefinitionChangeHub);
  const { views } = dependencies;
  await registerAgentWebsocket(
    app,
    dependencies.agentStreamHandler,
    new AgentTeamStreamHandler(new AgentSessionManager(AgentTeamSession), dependencies.teamRunService,
      { streams: views.streams, rows: views.rows, registrations: views.registrations, closedTasks: views.closedTasks,
        restorability: views.restorability, readStoredTree: views.readStoredTeamTree }),
    new AgentOrgStreamHandler(dependencies.agentOrgRunService,
      { streams: views.streams, rows: views.rows, registrations: views.registrations, readStoredTree: views.readStoredOrgTree }),
    new AgentCollaborationStreamHandler(dependencies.standaloneRoots, views.rows),
  );
  await registerApplicationBackendNotificationWebsocket(app, {
    notificationHub: dependencies.application.notifications,
    lifecycle: dependencies.lifecycleReadiness,
  });
  await registerApplicationBackendWebsocket(app, {
    gateway: dependencies.application.backend,
    lifecycle: dependencies.lifecycleReadiness,
  });
  await registerApplicationAgentCommunicationWebsocket(app, {
    agentCommunicationService: dependencies.application.agentCommunication,
    lifecycle: dependencies.lifecycleReadiness,
  });
}
