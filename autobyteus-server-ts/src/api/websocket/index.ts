import type { FastifyInstance } from "fastify";
import { registerFileExplorerWebsocket } from "./file-explorer.js";
import { registerTerminalWebsocket } from "./terminal.js";
import { registerNodeDesktopWebsocket } from "./node-desktop.js";
import { registerProjectChangesWebsocket } from "./projects.js";
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
import type { RunViewSources } from "../../compositions/run-view-composition.js";

export async function registerWebsocketRoutes(
  app: FastifyInstance,
  dependencies: {
    lifecycleReadiness: ApplicationPlatformLifecycleReadiness;
    application: ApplicationPlatformRealtimeContracts;
    agentOrgRunService: Pick<AgentOrgRunService, "getActive" | "restore" | "recordRunActivity">;
    teamRunService: ConstructorParameters<typeof AgentTeamStreamHandler>[1];
    standaloneRoots: Pick<StandaloneAgentRunRootManager, "resolveRoot" | "getActive">;
    agentPackageDefinitionChangeHub: AgentPackageDefinitionChangeHub;
    /** autobyteus-461 DS-8, SR-046: what the run view streams need (their child rows, the runs' registration, stored trees). */
    views: RunViewSources;
  },
): Promise<void> {
  await registerFileExplorerWebsocket(app);
  await registerTerminalWebsocket(app);
  await registerNodeDesktopWebsocket(app);
  await registerProjectChangesWebsocket(app);
  await registerUpdateNotificationsWebsocket(app);
  await registerAgentPackageDefinitionsWebsocket(app, dependencies.agentPackageDefinitionChangeHub);
  const { views } = dependencies;
  await registerAgentWebsocket(
    app,
    undefined,
    new AgentTeamStreamHandler(new AgentSessionManager(AgentTeamSession), dependencies.teamRunService,
      { streams: views.streams, children: views.children, followers: views.followers, registrations: views.registrations,
        readStoredTree: views.readStoredTeamTree }, views.commands),
    new AgentOrgStreamHandler(dependencies.agentOrgRunService,
      { streams: views.streams, children: views.children, followers: views.followers, registrations: views.registrations,
        readStoredTree: views.readStoredOrgTree }, views.commands),
    new AgentCollaborationStreamHandler(dependencies.standaloneRoots, views, views.commands),
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
