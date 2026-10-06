// Current-built Studio fixture. Only session admission (no inference) is scripted.
// Parent supplies a private HOME/data/database and owns this exact child.
import "reflect-metadata";
import { appConfigProvider } from "../../dist/config/app-config-provider.js";
const config = appConfigProvider.initialize({appDataDir: process.argv[2]});
config.initialize();
const {buildStudioServer} = await import("../../dist/compositions/build-studio-server.js");
const {buildRuntimeAgentToolExposure} = await import("../../dist/agent-execution/shared/runtime-agent-tool-exposure.js");
const {buildAgentRunMessageSenderContext} = await import("../../dist/agent-communication/domain/agent-run-message-sender.js");
const studio = await buildStudioServer({appConfig: config, loggingConfig: {
  pinoLogLevel: "silent", httpAccessLogMode: "off", includeNoisyHttpAccessRoutes: false, scopedLogLevelOverrides: [],
}});
let authority;
let closing = false;
const close = async () => {
  if (closing) return; closing = true;
  authority?.close();
  await studio.fastify.close();
  process.exit(0);
};
process.on("SIGTERM", () => { close().catch(error => { console.error(error); process.exit(1); }); });
process.on("disconnect", () => { close().catch(error => { console.error(error); process.exit(1); }); });
try {
  await studio.applicationRuntime.lifecycle.prepareBeforeListen();
  await studio.agentToolsMcpHost.listen();
  const origin = await studio.fastify.listen({port: 0, host: "127.0.0.1"});
  await studio.applicationRuntime.lifecycle.recoverAfterListen();
  authority = studio.agentToolsMcpHost.sessionAuthorities.begin({scopeIdentity: "project-mutation-node-fixture"}).complete({
    executionCapabilities: {publishedArtifactPublisher: {publishManyForRun: async () => {throw new Error("Unexpected publication");}}, applicationAgentTools: null},
    assertExecutionCapabilitiesReady: () => undefined,
  });
  const selected = authority.runSessions.activateForRun({owner: {runId: "fixture-selected"},
    sender: buildAgentRunMessageSenderContext({senderRunId: "fixture-selected", senderName: "Fixture selected"}),
    runtimeExposure: buildRuntimeAgentToolExposure(["list_projects", "create_or_update_project"]),
  });
  if (selected.kind !== "active") throw new Error("Selected session missing");
  process.send({origin, mcpUrl: selected.descriptor.serverUrl});
} catch (error) {
  console.error(error); authority?.close(); await studio.fastify.close(); process.exit(1);
}
