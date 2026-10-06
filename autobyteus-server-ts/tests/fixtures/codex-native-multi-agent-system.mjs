// Owned current-built Studio, public HTTP/WS run lifecycle, real Codex/model and scoped MCP.
// Parent supplies private HOME/CODEX_HOME/data/database, migrates SQLite and owns this child.
import "reflect-metadata";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import WebSocket from "ws";
import { appConfigProvider } from "../../dist/config/app-config-provider.js";
const root = process.argv[2], model = process.argv[3];
const config = appConfigProvider.initialize({ appDataDir: root }); config.initialize();
// Execute configured-server prerequisites on the private database, not a forced readiness stub.
const { initializePrisma, shutdownPrisma } = await import("repository_prisma");
const { assertTokenUsageCurrentSchema } = await import("../../dist/startup/token-usage-current-schema-readiness.js");
const { TokenUsageAnalyticsProjectionWriter } = await import("../../dist/token-usage/services/token-usage-analytics-projection-writer.js");
const { configureTokenUsageMigrationReadiness, TOKEN_USAGE_RUN_RECORDS_V1_MIGRATION_ID } = await import("../../dist/token-usage/providers/token-usage-migration-readiness.js");
const { getSecretVaultRuntime } = await import("../../dist/secret-management/secret-vault-runtime.js");
const { getAppDataMigrationRunner } = await import("../../dist/app-data-migrations/app-data-migration-runner.js");
const { RootRunPackageReadinessIndex } = await import("../../dist/run-history/services/root-run-package-readiness-index.js");
let studio;
try {
  await initializePrisma({ datasourceUrl: config.getOperationalDatabaseUrl() });
  await assertTokenUsageCurrentSchema(); await new TokenUsageAnalyticsProjectionWriter().initializeCoverage();
  configureTokenUsageMigrationReadiness({ kind: "CURRENT_SCHEMA_DEGRADED", migrationStatus: "NOT_RUN", logPath: null });
  await getSecretVaultRuntime().initialize(config.getOperationalDatabaseLocation());
  const statuses = await getAppDataMigrationRunner().runPending();
  const token = statuses.find(status => status.migrationId === TOKEN_USAGE_RUN_RECORDS_V1_MIGRATION_ID);
  assert(["SUCCEEDED", "SUCCEEDED_WITH_WARNINGS"].includes(token?.status), JSON.stringify(token));
  configureTokenUsageMigrationReadiness({ kind: "READY" });
  await new RootRunPackageReadinessIndex(config.getMemoryDir()).rebuild();
} catch (error) {
  await getSecretVaultRuntime().close(); await shutdownPrisma();
  process.send?.({ receipt: { result: "Fail", error: String(error), phase: "configured startup prerequisites" } });
  process.exit(1);
}
const { buildStudioServer } = await import("../../dist/compositions/build-studio-server.js");
const { getCodexThreadManager } = await import("../../dist/agent-execution/backends/codex/thread/codex-thread-manager.js");
const { getCodexAppServerClientManager } = await import("../../dist/runtime-management/codex/client/codex-app-server-client-manager.js");
const { parseArgs } = await import("../../dist/runtime-management/codex/client/codex-app-server-launch-config.js");
studio = await buildStudioServer({ appConfig: config, loggingConfig: {
  pinoLogLevel: "silent", httpAccessLogMode: "off", includeNoisyHttpAccessRoutes: false, scopedLogLevelOverrides: [],
}});
let origin, teamId, socket, firstClient, secondClient;
const receipt = { model, inventories: [], phases: [], cleanup: {} };
let teardown;
const closeOwned = () => teardown ??= (async () => {
  const errors = [];
  try { await studio.fastify.close(); receipt.cleanup.studioClosed = !studio.fastify.server.listening; } catch (error) { errors.push(String(error)); }
  try { await getCodexAppServerClientManager().close(); receipt.cleanup.clientsClosed = true; } catch (error) { errors.push(String(error)); }
  if (origin) { try { await fetch(origin, { signal: AbortSignal.timeout(1000) }); errors.push("Studio listener still responds"); } catch { receipt.cleanup.publicListenerReleased = true; } }
  receipt.cleanup.errors = errors;
})();
const interrupted = () => { socket?.terminate(); receipt.result = "Fail"; receipt.error = "Owned system interrupted";
  closeOwned().finally(() => { if (process.connected) process.send({ receipt }, () => process.exit(1)); else process.exit(1); }); };
process.on("SIGTERM", interrupted); process.on("disconnect", interrupted);
const checkpoint = phase => { receipt.phases.push(phase); process.send?.({ checkpoint: phase }); };
const until = async (fn, label, timeout = 60000) => {
  const end = Date.now() + timeout;
  while (Date.now() < end) { const v = await fn(); if (v) return v; await new Promise(r => setTimeout(r, 100)); }
  throw new Error(`Timeout: ${label}`);
};
const gql = async (query, variables = {}) => {
  const response = await fetch(`${origin}/graphql`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query, variables }), signal: AbortSignal.timeout(60000) });
  const result = await response.json(); assert.equal(response.status, 200); assert.equal(result.errors, undefined, JSON.stringify(result)); return result.data;
};
const publicTree = async () => (await gql("query($id:String!){getTeamRunResumeConfig(teamRunId:$id){executionTree}}", { id: teamId })).getTeamRunResumeConfig.executionTree;
const managerBinding = tree => tree.root_team.members.find(member => member.address === "/manager");
const openSocket = async () => {
  const frames = [];
  socket = new WebSocket(`${origin.replace('http:', 'ws:')}/ws/agent-team/${teamId}`);
  socket.on("message", data => frames.push(JSON.parse(String(data))));
  await new Promise((resolve, reject) => { socket.once("open", resolve); socket.once("error", reject); });
  await until(() => frames.some(frame => frame.type === "TEAM_EXECUTION_VIEW_SNAPSHOT"), "public Team stream ready");
  return frames;
};
const inventoryPrompt = `What tools do you currently have available in THIS conversation?
Inspect the actual tool definitions, not your general knowledge. List all namespace-qualified callable tools in tools.
Separately list every built-in multi-agent/collaboration tool in collaboration_tools; use [] if none.
Include externally supplied AutoByteus tools in tools, NOT in collaboration_tools.
Do not execute any tool, spawn/delegate agents, read files, send a report or change anything.
Return only JSON with keys tools (string array), collaboration_tools (string array), note (string).`;
const inventory = async (runId, phase) => {
  const frames = await openSocket();
  const commandId = randomUUID();
  socket.send(JSON.stringify({ type: "SEND_MESSAGE", payload: { agent_run_id: runId, content: inventoryPrompt,
    message_id: commandId, dedupe_key: `agent_run_input:e2e:${commandId}`, context_file_paths: [], image_urls: [] } }));
  const thread = await until(() => getCodexThreadManager().getThread(runId), "production Codex thread after user command");
  const launch = thread.client.getLaunchContext();
  assert.deepEqual(launch.args, parseArgs()); assert.equal(thread.model, model);
  const notifications = [];
  const unbind = thread.client.onNotification(message => {
    if (message.params.threadId === thread.threadId) notifications.push(message);
  });
  try {
    await until(() => thread.lastTerminalTurnId, "bounded actual-model completion", 180000);
    const read = await thread.client.request("thread/read", { threadId: thread.threadId, includeTurns: true });
    const turn = read.thread.turns.at(-1); assert.equal(turn.status, "completed", JSON.stringify(turn.error));
    const answers = turn.items.filter(item => item.type === "agentMessage").map(item => item.text).join("\n");
    const answer = JSON.parse(answers.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, ""));
    assert.deepEqual(answer.collaboration_tools, []);
    assert(!answer.tools.some(name => name.startsWith("collaboration.")));
    assert(answer.tools.includes("functions.exec")); assert(answer.tools.includes("clock.sleep"));
    const toolsExecuted = turn.items.filter(item => !["userMessage", "agentMessage", "reasoning", "plan"].includes(item.type));
    assert.deepEqual(toolsExecuted, [], "inventory must not execute tools");
    const item = { phase, runId, threadId: thread.threadId, model: thread.model, argv: launch.args,
      turnStatus: turn.status, answer, toolsExecuted, usage: notifications.filter(n => n.method === "thread/tokenUsage/updated").map(n => n.params.tokenUsage),
      websocketErrorFrames: frames.filter(f => f.type === "ERROR") };
    assert.deepEqual(item.websocketErrorFrames, []); receipt.inventories.push(item); checkpoint(`${phase}: completed inventory`);
    return thread;
  } finally { unbind(); socket.terminate(); socket = null; }
};
const mcpChecks = async thread => {
  const settings = thread.config.appServerConfig;
  assert.deepEqual(Object.keys(settings), ["mcp_servers"]);
  const serverConfig = settings.mcp_servers.autobyteus_agent_tools;
  const expected = ["get_handoff_rules", "send_message_to", "delegate_task", "create_or_update_task", "list_projects"];
  for (const tool of expected) assert(serverConfig.enabled_tools.includes(tool), tool);
  const status = await until(async () => {
    const r = await thread.client.request("mcpServerStatus/list", { threadId: thread.threadId, detail: "full" });
    return r.data?.find(s => s.name === "autobyteus_agent_tools" && expected.every(t => Object.hasOwn(s.tools ?? {}, t)));
  }, "same-thread scoped MCP exposure");
  const call = (tool, args) => thread.client.request("mcpServer/tool/call", { threadId: thread.threadId, server: "autobyteus_agent_tools", tool, arguments: args });
  const handoff = await call("get_handoff_rules", {});
  assert.notEqual(handoff.isError, true); assert.deepEqual(handoff.structuredContent, { handoffs: [{ when: "Only report when explicitly requested", recipient_address: "/worker" }] });
  const projects = await call("list_projects", {}); assert.notEqual(projects.isError, true); assert.deepEqual(projects.structuredContent, { projects: [] });
  const rejectedTarget = await call("send_message_to", { target_agent_run_id: "native-policy-probe-missing-run", content: "No target must be started." });
  assert.equal(rejectedTarget.isError, true); assert.equal(rejectedTarget.structuredContent.accepted, false);
  assert.equal(rejectedTarget.structuredContent.code, "TARGET_AGENT_RUN_NOT_ACTIVE");
  await assert.rejects(call("create_or_update_project", { name: "Must not be created" }), /tool 'create_or_update_project' is disabled/);
  return { enabledTools: [...serverConfig.enabled_tools], toolNames: Object.keys(status.tools),
    handoff: handoff.structuredContent, projects: projects.structuredContent, rejectedTarget: rejectedTarget.structuredContent,
    ungrantedToolRejected: true };
};
const stopTeam = async () => {
  const result = (await gql("mutation($id:String!){terminateAgentTeamRun(teamRunId:$id){success message}}", { id: teamId })).terminateAgentTeamRun;
  assert.equal(result.success, true, result.message);
};
try {
  await studio.applicationRuntime.lifecycle.prepareBeforeListen(); await studio.agentToolsMcpHost.listen();
  origin = await studio.fastify.listen({ port: 0, host: "127.0.0.1" });
  await studio.applicationRuntime.lifecycle.recoverAfterListen();
  assert.equal((await fetch(`${origin}/rest/health`)).status, 200); checkpoint("owned built Studio ready");
  const workspace = path.join(root, "workspace"); await fs.mkdir(workspace); await fs.writeFile(path.join(workspace, "sentinel.txt"), "owned unchanged workspace\n");
  const definition = async name => (await gql("mutation($i:CreateAgentDefinitionInput!){createAgentDefinition(input:$i){id}}", { i: {
    name, role: "assistant", description: "Native policy validation only", instructions: "Follow the user. Do not send reports or execute tools during inventory requests.", toolNames: ["list_projects"],
  } })).createAgentDefinition.id;
  const manager = await definition("Native policy Manager"), worker = await definition("Native policy Worker");
  const team = (await gql("mutation($i:CreateAgentTeamDefinitionInput!){createAgentTeamDefinition(input:$i){id}}", { i: {
    name: "Native policy Team", description: "Owned API/E2E fixture", instructions: "Follow user requests only.", coordinatorMemberName: "manager",
    nodes: [{ memberName: "manager", ref: manager, refScope: "SHARED" }, { memberName: "worker", ref: worker, refScope: "SHARED" }],
    handoffs: [{ from: "/manager", to: "/worker", rules: ["Only report when explicitly requested"] }],
  } })).createAgentTeamDefinition.id;
  const launchConfig = { workspaceRootPath: workspace, llmModelIdentifier: model, llmConfig: { reasoning_effort: "low" }, autoExecuteTools: false, runtimeKind: "codex_app_server" };
  const created = (await gql("mutation($i:CreateAgentTeamRunInput!){createAgentTeamRun(input:$i){success message teamRunId}}", { i: {
    teamDefinitionId: team, teamConfigs: [{ teamAddress: "/", ...launchConfig }],
    memberConfigs: [{ memberAddress: "/manager", agentDefinitionId: manager, ...launchConfig }, { memberAddress: "/worker", agentDefinitionId: worker, ...launchConfig }],
  } })).createAgentTeamRun;
  assert.equal(created.success, true, created.message); teamId = created.teamRunId; receipt.teamId = teamId;
  const binding = managerBinding(await publicTree()); assert(binding.agent_run_id);
  const first = await inventory(binding.agent_run_id, "fresh"); firstClient = first.client;
  receipt.freshMcp = await mcpChecks(first);
  const afterFresh = managerBinding(await publicTree()); assert.equal(afterFresh.platform_agent_run_id, first.threadId);
  receipt.persistedBinding = afterFresh;
  let closedFirst = false; firstClient.onClose(error => { closedFirst = error === null; });
  await stopTeam(); assert(closedFirst); assert.equal(getCodexThreadManager().getThread(binding.agent_run_id), null);
  await assert.rejects(firstClient.request("config/read", {}), /not started/); checkpoint("ordinary Stop physically closed first Codex generation");
  const restored = (await gql("mutation($id:String!){restoreAgentTeamRun(teamRunId:$id){success message teamRunId}}", { id: teamId })).restoreAgentTeamRun;
  assert.equal(restored.success, true, restored.message); assert.equal(restored.teamRunId, teamId);
  const resumedBinding = managerBinding(await publicTree()); assert.equal(resumedBinding.agent_run_id, binding.agent_run_id);
  const second = await inventory(binding.agent_run_id, "restored"); secondClient = second.client;
  assert.notEqual(secondClient, firstClient); assert.equal(second.threadId, first.threadId);
  receipt.restoredMcp = await mcpChecks(second); receipt.exactThreadIdentityPreserved = true;
  let closedSecond = false; secondClient.onClose(error => { closedSecond = error === null; });
  await stopTeam(); assert(closedSecond); await assert.rejects(secondClient.request("config/read", {}), /not started/);
  receipt.twoPhysicalClientCloses = closedFirst && closedSecond;
  assert.equal(await fs.readFile(path.join(workspace, "sentinel.txt"), "utf8"), "owned unchanged workspace\n");
  assert.deepEqual(managerBinding(await publicTree()).platform_agent_run_id, first.threadId);
  receipt.result = "Pass"; checkpoint("same saved identity, new client, restored MCP callable and final Stop complete");
} catch (error) { receipt.result = "Fail"; receipt.error = String(error); receipt.stack = error.stack; }
finally {
  socket?.terminate();
  await closeOwned();
  const errors = receipt.cleanup.errors;
  process.send?.({ receipt });
  process.exitCode = receipt.result === "Pass" && errors.length === 0 ? 0 : 1;
  // SDK background handles may otherwise keep this owned probe alive after graceful teardown.
  setTimeout(() => process.exit(process.exitCode), 100).unref();
}
