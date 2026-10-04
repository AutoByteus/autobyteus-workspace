import "reflect-metadata";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import type { FastifyInstance } from "fastify";
import WebSocket from "ws";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { appConfigProvider } from "../../../src/config/app-config-provider.js";
import { startStudioE2eRuntimeServer } from "../helpers/studio-runtime-test-server.js";
import { sendE2eSendMessageCommand } from "../helpers/websocket-command-helpers.js";
import { flattenE2eConfiguredAgentExecutions } from "../helpers/team-run-metadata-helpers.js";
import { isE2eTeamCommunicationMessage } from "../helpers/team-communication-message-helpers.js";

// Live Grok Build parity checks through the real Studio server and the host's own `grok` CLI
// (paid inference on the user's Grok plan). Gated: RUN_GROK_E2E=1 and a working Grok command
// (`GROK_BUILD_COMMAND` or `grok`). Reasoning effort defaults to `low` to keep the cost small.
const grokCommand = process.env.GROK_BUILD_COMMAND?.trim() || "grok";
const grokReady = spawnSync(grokCommand, ["--version"], { stdio: "ignore" }).status === 0;
const liveGrok = process.env.RUN_GROK_E2E === "1" && grokReady;
const describeLiveGrok = liveGrok ? describe : describe.skip;
const REASONING_EFFORT = process.env.GROK_E2E_REASONING_EFFORT?.trim() || "low";
const STEP_TIMEOUT_MS = Number(process.env.GROK_E2E_STEP_TIMEOUT_MS || 180_000);
const INTERRUPT_BUDGET_MS = 2_000;

type WsMessage = { type: string; payload: Record<string, unknown> };

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describeLiveGrok("Grok Build live runtime e2e (real grok CLI)", () => {
  let dataDir = "";
  let app: FastifyInstance | null = null;
  let url: URL;
  let modelIdentifier = "";
  const cleanup: Array<() => Promise<unknown>> = [];
  const sockets: WebSocket[] = [];

  const graphql = async <T>(query: string, variables?: Record<string, unknown>): Promise<T> => {
    const response = await fetch(new URL("/graphql", url), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ query, variables }),
    });
    const body = await response.json() as { data?: T; errors?: Array<{ message: string }> };
    if (!response.ok || !body.data || body.errors?.length) throw new Error(JSON.stringify(body.errors ?? body));
    return body.data;
  };

  beforeAll(async () => {
    dataDir = await fs.mkdtemp(path.join(os.tmpdir(), "grok-live-e2e-"));
    await fs.writeFile(path.join(dataDir, ".env"), "AUTOBYTEUS_SERVER_HOST=http://localhost:8000\nAPP_ENV=test\n");
    appConfigProvider.config.setCustomAppDataDir(dataDir);
    const started = await startStudioE2eRuntimeServer();
    app = started.fastify;
    url = started.mainUrl;
    const availability = await graphql<{ runtimeAvailability: { runtimeKind: string; enabled: boolean; reason: string | null } }>(
      "{ runtimeAvailability(runtimeKind: \"grok_build\") { runtimeKind enabled reason } }");
    expect(availability.runtimeAvailability)
      .toEqual({ runtimeKind: "grok_build", enabled: true, reason: null });
    const catalog = await graphql<{ providerModelCatalogSnapshots: Array<{ llmModels: Array<{ modelIdentifier: string }> }> }>(
      "query($r: String) { providerModelCatalogSnapshots(runtimeKind: $r) { llmModels { modelIdentifier } } }",
      { r: "grok_build" });
    const models = catalog.providerModelCatalogSnapshots.flatMap((snapshot) => snapshot.llmModels.map((m) => m.modelIdentifier));
    const preferred = process.env.GROK_E2E_MODEL?.trim() || "grok-4.7";
    modelIdentifier = models.includes(preferred) ? preferred : models[0]!;
    expect(modelIdentifier).toBeTruthy();
  }, 120_000);

  afterAll(async () => {
    for (const socket of sockets) if (socket.readyState === WebSocket.OPEN) socket.close();
    for (const step of cleanup.reverse()) await step().catch(() => undefined);
    if (app) await app.close();
    if (dataDir) await fs.rm(dataDir, { recursive: true, force: true });
  });

  const openSocket = async (route: string): Promise<{ socket: WebSocket; messages: WsMessage[] }> => {
    const socket = new WebSocket(`ws://${url.hostname}:${url.port}${route}`);
    sockets.push(socket);
    const messages: WsMessage[] = [];
    socket.on("message", (raw: unknown) => {
      try {
        const parsed = JSON.parse(String(raw)) as { type?: unknown; payload?: unknown };
        if (typeof parsed.type !== "string") return;
        messages.push({ type: parsed.type, payload: parsed.payload && typeof parsed.payload === "object"
          && !Array.isArray(parsed.payload) ? parsed.payload as Record<string, unknown> : {} });
      } catch { /* Ignore malformed diagnostic rows only. */ }
    });
    await new Promise<void>((resolve, reject) => { socket.once("open", () => resolve()); socket.once("error", reject); });
    return { socket, messages };
  };

  const waitFor = async (messages: WsMessage[], from: number, predicate: (message: WsMessage) => boolean,
    label: string, timeoutMs = STEP_TIMEOUT_MS): Promise<WsMessage> => {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const found = messages.slice(from).find(predicate);
      if (found) return found;
      await wait(100);
    }
    const tail = messages.slice(from).slice(-25).map((m) => `${m.type}:${JSON.stringify(m.payload).slice(0, 160)}`);
    throw new Error(`Timed out waiting for ${label}. tail=${tail.join(" | ")}`);
  };

  const textSince = (messages: WsMessage[], from: number, runId?: string): string => messages.slice(from)
    .filter((m) => m.type === "SEGMENT_CONTENT" && (!runId || m.payload.agent_run_id === runId))
    .map((m) => String(m.payload.delta ?? "")).join("");

  const createDefinition = async (name: string, instructions: string, toolNames: string[]): Promise<string> => {
    const created = await graphql<{ createAgentDefinition: { id: string } }>(
      "mutation($input: CreateAgentDefinitionInput!) { createAgentDefinition(input: $input) { id } }",
      { input: { name: `${name}-${randomUUID()}`, role: "assistant", description: "Grok Build live e2e agent",
        instructions, category: "runtime-e2e", toolNames } });
    const id = created.createAgentDefinition.id;
    cleanup.push(() => graphql("mutation($id: String!) { deleteAgentDefinition(id: $id) { success } }", { id }));
    return id;
  };

  const resumeConfig = (runId: string) => graphql<{ getAgentRunResumeConfig: {
    isActive: boolean; metadataConfig: { runtimeKind: string; runtimeReference: { runtimeKind: string; sessionId: string | null } };
  } }>(`query($runId: String!) { getAgentRunResumeConfig(runId: $runId) {
    isActive metadataConfig { runtimeKind runtimeReference { runtimeKind sessionId } }
  } }`, { runId }).then((result) => result.getAgentRunResumeConfig);

  it("runs a standalone Grok agent through tools, approvals, interrupt, stop and exact restore (AC-003/004/006/008/009)", async () => {
    const marker = `GROKMARK-${randomUUID().slice(0, 8)}`;
    const workspace = await fs.mkdtemp(path.join(dataDir, "standalone-ws-"));
    await fs.writeFile(path.join(workspace, "grok-e2e-listing.txt"), "listing fixture\n");
    // Grok auto-allows commands its own policy treats as routine (observed: `echo`, `touch` in the
    // workspace) and asks only for riskier ones, so the approval steps use a recursive delete.
    const approveTarget = path.join(workspace, `APPROVE-${marker}`);
    const denyTarget = path.join(workspace, `DENY-${marker}`);
    await fs.mkdir(approveTarget);
    await fs.mkdir(denyTarget);
    // `send_message_to` exposes the Agent Tools MCP server, so restore loads the session with it attached.
    const definitionId = await createDefinition("grok-live-standalone",
      "You are a concise test agent. Follow the user's numbered steps exactly and keep replies short.", ["send_message_to"]);
    const created = await graphql<{ createAgentRun: { success: boolean; message: string; runId: string | null } }>(
      "mutation($input: CreateAgentRunInput!) { createAgentRun(input: $input) { success message runId } }",
      { input: { agentDefinitionId: definitionId, workspaceRootPath: workspace, llmModelIdentifier: modelIdentifier,
        llmConfig: { reasoning_effort: REASONING_EFFORT }, autoExecuteTools: false,
        runtimeKind: "grok_build" } });
    expect(created.createAgentRun.success, created.createAgentRun.message).toBe(true);
    const runId = created.createAgentRun.runId!;
    cleanup.push(() => graphql("mutation($agentRunId: String!) { terminateAgentRun(agentRunId: $agentRunId) { success } }",
      { agentRunId: runId }));
    const binding = await resumeConfig(runId);
    expect(binding.metadataConfig.runtimeReference.runtimeKind).toBe("grok_build");
    const sessionId = binding.metadataConfig.runtimeReference.sessionId;
    expect(sessionId).toBeTruthy();
    expect(sessionId).not.toBe(runId);

    let { socket, messages } = await openSocket(`/ws/agent/${runId}`);

    // Step A — list_dir, then an approved run_bash (AC-003, AC-004 approve, AC-009).
    const firstMessage = `Remember this marker: ${marker}. Step 1: use your list_dir tool on the current directory. `
      + `Step 2: run exactly this shell command: \`rm -rf ${approveTarget}\`. Step 3: reply with exactly DONE-A.`;
    let from = messages.length;
    sendE2eSendMessageCommand(socket, { agent_run_id: runId, content: firstMessage });
    const approvals: WsMessage[] = [];
    const deadlineA = Date.now() + STEP_TIMEOUT_MS;
    while (!messages.slice(from).some((m) => m.type === "TURN_COMPLETED")) {
      if (Date.now() > deadlineA) throw new Error("Step A did not complete");
      for (const request of messages.slice(from).filter((m) => m.type === "TOOL_APPROVAL_REQUESTED" && !approvals.includes(m))) {
        approvals.push(request);
        socket.send(JSON.stringify({ type: "APPROVE_TOOL", payload: { invocation_id: request.payload.invocation_id } }));
      }
      await wait(100);
    }
    const stepA = messages.slice(from);
    const bashApproval = approvals.find((m) => m.payload.tool_name === "run_bash"
      && JSON.stringify(m.payload.arguments).includes(`APPROVE-${marker}`));
    expect(bashApproval, JSON.stringify(approvals.map((m) => m.payload))).toBeDefined();
    const bashId = bashApproval!.payload.invocation_id;
    expect(stepA.some((m) => m.type === "TOOL_APPROVED" && m.payload.invocation_id === bashId)).toBe(true);
    expect(stepA.some((m) => m.type === "TOOL_EXECUTION_SUCCEEDED" && m.payload.invocation_id === bashId)).toBe(true);
    await expect(fs.stat(approveTarget)).rejects.toThrow();
    const listStart = stepA.find((m) => m.type === "TOOL_EXECUTION_STARTED" && m.payload.tool_name === "list_dir");
    expect(listStart).toBeDefined();
    expect(stepA.some((m) => m.type === "TOOL_EXECUTION_SUCCEEDED" && m.payload.invocation_id === listStart!.payload.invocation_id))
      .toBe(true);
    expect(stepA.some((m) => m.type === "TOOL_EXECUTION_STARTED" && ["task", "workflow", "ask_user_question"]
      .includes(String(m.payload.tool_name)))).toBe(false);
    expect(textSince(messages, from)).toContain("DONE-A");
    expect(stepA.some((m) => m.type === "ERROR")).toBe(false);
    const usageA = stepA.filter((m) => m.type === "TOKEN_USAGE_UPDATED");
    expect(usageA.length).toBeGreaterThanOrEqual(2);
    expect(usageA.map((m) => m.payload.call_sequence)).toEqual(usageA.map((_, index) => index + 1));
    for (const usage of usageA) {
      expect(usage.payload).toMatchObject({ runtime_kind: "grok_build", ingestion_kind: "grok_acp_call",
        usage_scope: "per_call", model_identifier: modelIdentifier });
    }

    // Step B — denied run_bash; the agent continues and the turn completes (AC-004 deny).
    from = messages.length;
    sendE2eSendMessageCommand(socket, { agent_run_id: runId,
      content: `Run exactly this shell command: \`rm -rf ${denyTarget}\`. If it is denied, do not retry; reply with exactly DENIED-B.` });
    const denied: unknown[] = [];
    const deadlineB = Date.now() + STEP_TIMEOUT_MS;
    const turnEnded = (m: WsMessage) => m.type === "TURN_COMPLETED" || m.type === "TURN_INTERRUPTED";
    while (!messages.slice(from).some(turnEnded)) {
      if (Date.now() > deadlineB) throw new Error("Step B did not complete");
      for (const request of messages.slice(from).filter((m) => m.type === "TOOL_APPROVAL_REQUESTED"
        && !denied.includes(m.payload.invocation_id))) {
        denied.push(request.payload.invocation_id);
        socket.send(JSON.stringify({ type: "DENY_TOOL", payload: { invocation_id: request.payload.invocation_id,
          reason: "Denied by the live e2e." } }));
      }
      await wait(100);
    }
    const stepB = messages.slice(from);
    expect(denied.length).toBeGreaterThanOrEqual(1);
    const deniedBash = stepB.find((m) => m.type === "TOOL_APPROVAL_REQUESTED" && m.payload.tool_name === "run_bash");
    expect(deniedBash).toBeDefined();
    expect(stepB.some((m) => m.type === "TOOL_DENIED" && m.payload.invocation_id === deniedBash!.payload.invocation_id)).toBe(true);
    expect(stepB.some((m) => m.type === "TOOL_EXECUTION_SUCCEEDED" && denied.includes(m.payload.invocation_id))).toBe(false);
    await expect(fs.stat(denyTarget)).resolves.toBeTruthy();
    // AC-004: Grok ends its turn after reject-once (`cancelled`); the turn is shown completed,
    // not interrupted, and the run takes the next message (step C).
    const stepBTerminal = stepB.find(turnEnded)!;
    console.info("GROK_LIVE_DENY_TERMINAL", stepBTerminal.type, JSON.stringify(stepBTerminal.payload).slice(0, 300));
    expect(stepBTerminal.type, "turn terminal after a denied run_bash").toBe("TURN_COMPLETED");
    expect(stepB.some((m) => m.type === "TURN_INTERRUPTED")).toBe(false);

    // Step C — interrupt an active long turn within 2 s; the run stays usable (AC-008, QR-003).
    from = messages.length;
    sendE2eSendMessageCommand(socket, { agent_run_id: runId,
      content: "Without using any tools, write the numbers from 1 to 400 as English words, one per line." });
    await waitFor(messages, from, (m) => m.type === "SEGMENT_CONTENT", "first streamed content of the long turn");
    const interruptedAt = Date.now();
    socket.send(JSON.stringify({ type: "INTERRUPT_GENERATION", payload: { command_id: `interrupt-${randomUUID()}` } }));
    await waitFor(messages, from, (m) => m.type === "TURN_INTERRUPTED", "TURN_INTERRUPTED", 30_000);
    const interruptLatencyMs = Date.now() - interruptedAt;
    console.info("GROK_LIVE_INTERRUPT_LATENCY_MS", interruptLatencyMs);
    expect(interruptLatencyMs).toBeLessThan(INTERRUPT_BUDGET_MS);
    expect(messages.slice(from).some((m) => m.type === "TURN_COMPLETED")).toBe(false);

    // Step D — the same run answers the next message with prior context.
    from = messages.length;
    sendE2eSendMessageCommand(socket, { agent_run_id: runId,
      content: "Reply with only the marker I asked you to remember in my first message." });
    await waitFor(messages, from, (m) => m.type === "TURN_COMPLETED", "post-interrupt TURN_COMPLETED");
    expect(textSince(messages, from)).toContain(marker);

    // Step E — stop, then exact restore of the same Grok session with Agent Tools MCP (AC-006).
    socket.close();
    await wait(300);
    const stopped = await graphql<{ terminateAgentRun: { success: boolean } }>(
      "mutation($agentRunId: String!) { terminateAgentRun(agentRunId: $agentRunId) { success } }", { agentRunId: runId });
    expect(stopped.terminateAgentRun.success).toBe(true);
    expect((await resumeConfig(runId)).isActive).toBe(false);
    const restored = await graphql<{ restoreAgentRun: { success: boolean; message: string; runId: string | null } }>(
      "mutation($agentRunId: String!) { restoreAgentRun(agentRunId: $agentRunId) { success message runId } }", { agentRunId: runId });
    expect(restored.restoreAgentRun, restored.restoreAgentRun.message).toMatchObject({ success: true, runId });
    const afterRestore = await resumeConfig(runId);
    expect(afterRestore.isActive).toBe(true);
    expect(afterRestore.metadataConfig.runtimeReference.sessionId).toBe(sessionId);

    ({ socket, messages } = await openSocket(`/ws/agent/${runId}`));
    await wait(3_000);
    // Grok replays the session on `session/load`; none of it may reach the live stream.
    expect(messages.filter((m) => ["SEGMENT_START", "SEGMENT_CONTENT", "TOOL_EXECUTION_STARTED", "TOKEN_USAGE_UPDATED"]
      .includes(m.type))).toEqual([]);
    const projection = await graphql<{ getRunProjection: { conversation: unknown[] } }>(
      "query($runId: String!) { getRunProjection(runId: $runId) { conversation } }", { runId });
    const history = JSON.stringify(projection.getRunProjection.conversation);
    expect(history.split(`Remember this marker: ${marker}`).length - 1).toBe(1);
    expect(history).toContain("list_dir");
    expect(history).toContain("DONE-A");

    from = messages.length;
    sendE2eSendMessageCommand(socket, { agent_run_id: runId,
      content: "We continue after a restart. Reply with only the marker from my very first message." });
    await waitFor(messages, from, (m) => m.type === "TURN_COMPLETED", "post-restore TURN_COMPLETED");
    expect(textSince(messages, from)).toContain(marker);
    expect(messages.slice(from).some((m) => m.type === "ERROR")).toBe(false);

    let summary: { usageReportCount: number; latestRuntimeKind: string | null; apiCostStatus: string } | null = null;
    for (let attempt = 0; attempt < 40; attempt++) {
      summary = (await graphql<{ getAgentRunTokenUsageSummary: { usageReportCount: number; latestRuntimeKind: string | null;
        apiCostStatus: string } }>(`query($runId: String!) { getAgentRunTokenUsageSummary(runId: $runId) {
        usageReportCount latestRuntimeKind apiCostStatus } }`, { runId })).getAgentRunTokenUsageSummary;
      if (summary.usageReportCount >= usageA.length + 3) break;
      await wait(250);
    }
    expect(summary).toMatchObject({ latestRuntimeKind: "grok_build", apiCostStatus: "estimated" });
    console.info("GROK_LIVE_STANDALONE", JSON.stringify({ runId, sessionId, usageRows: summary?.usageReportCount,
      stepAUsageCalls: usageA.length, interruptLatencyMs }));
  }, 900_000);

  it("delivers a Grok member's canonical get_handoff_rules/send_message_to to a Claude member and restores the mixed team (AC-005)", async () => {
    const claudeCatalog = await graphql<{ providerModelCatalogSnapshots: Array<{ llmModels: Array<{ modelIdentifier: string }> }> }>(
      "query($r: String) { providerModelCatalogSnapshots(runtimeKind: $r) { llmModels { modelIdentifier } } }",
      { r: "claude_agent_sdk" }).catch(() => ({ providerModelCatalogSnapshots: [] }));
    const claudeModels = claudeCatalog.providerModelCatalogSnapshots.flatMap((s) => s.llmModels.map((m) => m.modelIdentifier));
    const claudeModel = [process.env.CLAUDE_E2E_MODEL?.trim(), "haiku", "sonnet", "default"]
      .find((candidate) => candidate && claudeModels.includes(candidate)) ?? claudeModels[0];
    const pongRuntime = claudeModel ? "claude_agent_sdk" : "grok_build";
    const pongModel = claudeModel ?? modelIdentifier;
    const token = `PING-${randomUUID().slice(0, 8)}`;
    const workspace = await fs.mkdtemp(path.join(dataDir, "team-ws-"));
    const instructions = "You are in a two-member test team (ping, pong). Keep replies very short. "
      + "When you receive a teammate message, do not call any tool; reply with exactly ACK.";
    const pingId = await createDefinition("grok-live-ping", instructions, ["get_handoff_rules", "send_message_to"]);
    const pongId = await createDefinition("grok-live-pong", instructions, ["send_message_to"]);
    const team = await graphql<{ createAgentTeamDefinition: { id: string } }>(
      "mutation($input: CreateAgentTeamDefinitionInput!) { createAgentTeamDefinition(input: $input) { id } }",
      { input: { name: `grok-live-team-${randomUUID()}`, description: "Grok live mixed team", instructions: "Ping relays to pong.",
        coordinatorMemberName: "ping", nodes: [
          { memberName: "ping", ref: pingId, refScope: "SHARED" },
          { memberName: "pong", ref: pongId, refScope: "SHARED" },
        ] } });
    const teamDefinitionId = team.createAgentTeamDefinition.id;
    cleanup.push(() => graphql("mutation($id: String!) { deleteAgentTeamDefinition(id: $id) { success } }", { id: teamDefinitionId }));
    const grokConfig = { llmModelIdentifier: modelIdentifier, llmConfig: { reasoning_effort: REASONING_EFFORT },
      autoExecuteTools: true, runtimeKind: "grok_build", workspaceRootPath: workspace };
    const run = await graphql<{ createAgentTeamRun: { success: boolean; message: string; teamRunId: string | null } }>(
      "mutation($input: CreateAgentTeamRunInput!) { createAgentTeamRun(input: $input) { success message teamRunId } }",
      { input: { teamDefinitionId, teamConfigs: [{ teamAddress: "/", ...grokConfig }], memberConfigs: [
        { memberAddress: "/ping", agentDefinitionId: pingId, ...grokConfig },
        { memberAddress: "/pong", agentDefinitionId: pongId, llmModelIdentifier: pongModel, llmConfig: null,
          autoExecuteTools: true, runtimeKind: pongRuntime, workspaceRootPath: workspace },
      ] } });
    expect(run.createAgentTeamRun.success, run.createAgentTeamRun.message).toBe(true);
    const teamRunId = run.createAgentTeamRun.teamRunId!;
    cleanup.push(() => graphql("mutation($teamRunId: String!) { terminateAgentTeamRun(teamRunId: $teamRunId) { success } }",
      { teamRunId }));
    const resumeQuery = "query($teamRunId: String!) { getTeamRunResumeConfig(teamRunId: $teamRunId) { executionTree } }";
    const members = flattenE2eConfiguredAgentExecutions(
      (await graphql<{ getTeamRunResumeConfig: { executionTree: Record<string, unknown> } }>(resumeQuery, { teamRunId }))
        .getTeamRunResumeConfig.executionTree);
    const runIdOf = new Map(members.map((member) => [member.memberName, member.agentRunId]));
    const pingRunId = runIdOf.get("ping")!;
    const pongRunId = runIdOf.get("pong")!;

    const { socket, messages } = await openSocket(`/ws/agent-team/${teamRunId}`);
    const content = `PING-TO-PONG ${token}`;
    let from = messages.length;
    sendE2eSendMessageCommand(socket, { agent_run_id: pingRunId, content: "Step 1: call the AutoByteus tool get_handoff_rules. "
      + "Step 2: call the AutoByteus tool send_message_to exactly once with arguments "
      + `${JSON.stringify({ recipient_address: "/pong", content, message_type: "roundtrip_ping" })}. `
      + "Both are tools of the MCP server autobyteus_agent_tools: find them with search_tool and call them with use_tool. "
      + "Step 3: reply with exactly SENT." });
    await waitFor(messages, from, (m) => isE2eTeamCommunicationMessage(m, { senderAgentRunId: pingRunId,
      recipientAgentRunId: pongRunId, content }), "TEAM_COMMUNICATION_MESSAGE ping→pong");
    await waitFor(messages, from, (m) => m.type === "TURN_COMPLETED" && m.payload.agent_run_id === pongRunId, "pong TURN_COMPLETED");
    await waitFor(messages, from, (m) => m.type === "TURN_COMPLETED" && m.payload.agent_run_id === pingRunId, "ping TURN_COMPLETED");
    const pingTools = messages.slice(from).filter((m) => m.type === "TOOL_EXECUTION_STARTED" && m.payload.agent_run_id === pingRunId);
    const toolNames = pingTools.map((m) => String(m.payload.tool_name));
    console.info("GROK_LIVE_TEAM_PING_TOOLS", JSON.stringify(toolNames));
    expect(toolNames).toContain("get_handoff_rules");
    expect(toolNames.filter((name) => name === "send_message_to")).toHaveLength(1);
    expect(toolNames.some((name) => name === "use_tool" || name.startsWith("autobyteus_agent_tools__"))).toBe(false);
    const sendStart = pingTools.find((m) => m.payload.tool_name === "send_message_to")!;
    expect(sendStart.payload.arguments).toMatchObject({ recipient_address: "/pong", content });
    expect(messages.slice(from).some((m) => m.type === "TOOL_EXECUTION_SUCCEEDED"
      && m.payload.invocation_id === sendStart.payload.invocation_id && m.payload.tool_name === "send_message_to")).toBe(true);

    // Restore the quiescent mixed team and continue on the Grok member (restore with Agent Tools MCP).
    for (let attempt = 0; attempt < 120; attempt++) {
      const checkpoint = await graphql<{ getTeamRunResumeConfig: { executionTree: Record<string, unknown> } }>(resumeQuery, { teamRunId });
      if (flattenE2eConfiguredAgentExecutions(checkpoint.getTeamRunResumeConfig.executionTree)
        .every((member) => !!member.platformAgentRunId)) break;
      await wait(500);
    }
    await wait(2_000);
    const before = flattenE2eConfiguredAgentExecutions((await graphql<{ getTeamRunResumeConfig: {
      executionTree: Record<string, unknown> } }>(resumeQuery, { teamRunId })).getTeamRunResumeConfig.executionTree);
    const stopped = await graphql<{ terminateAgentTeamRun: { success: boolean; message: string } }>(
      "mutation($teamRunId: String!) { terminateAgentTeamRun(teamRunId: $teamRunId) { success message } }", { teamRunId });
    expect(stopped.terminateAgentTeamRun.success, stopped.terminateAgentTeamRun.message).toBe(true);
    const restored = await graphql<{ restoreAgentTeamRun: { success: boolean; message: string; teamRunId: string | null } }>(
      "mutation($teamRunId: String!) { restoreAgentTeamRun(teamRunId: $teamRunId) { success message teamRunId } }", { teamRunId });
    expect(restored.restoreAgentTeamRun, restored.restoreAgentTeamRun.message).toMatchObject({ success: true, teamRunId });
    const after = flattenE2eConfiguredAgentExecutions((await graphql<{ getTeamRunResumeConfig: {
      executionTree: Record<string, unknown> } }>(resumeQuery, { teamRunId })).getTeamRunResumeConfig.executionTree);
    expect(after).toEqual(before);
    expect(after.find((member) => member.memberName === "ping")?.runtimeKind).toBe("grok_build");

    const restoredSocket = await openSocket(`/ws/agent-team/${teamRunId}`);
    await wait(1_000);
    from = restoredSocket.messages.length;
    sendE2eSendMessageCommand(restoredSocket.socket, { agent_run_id: pingRunId,
      content: `After the restart, reply with exactly ACK-RESTORED ${token}.` });
    await waitFor(restoredSocket.messages, from, (m) => m.type === "TURN_COMPLETED" && m.payload.agent_run_id === pingRunId,
      "ping post-restore TURN_COMPLETED");
    expect(textSince(restoredSocket.messages, from, pingRunId)).toContain(`ACK-RESTORED ${token}`);
    console.info("GROK_LIVE_TEAM", JSON.stringify({ teamRunId, pongRuntime, pongModel }));
  }, 900_000);

  it("launches a Grok Org, relays from a direct member to a nested team member and restores it (AC-005 org)", async () => {
    const token = `ORG-${randomUUID().slice(0, 8)}`;
    const workspace = await fs.mkdtemp(path.join(dataDir, "org-ws-"));
    const instructions = "Keep replies very short. On a teammate message, do not use tools; reply with exactly ACK.";
    const directorId = await createDefinition("grok-live-director", instructions, ["send_message_to"]);
    const workerId = await createDefinition("grok-live-worker", instructions, ["send_message_to"]);
    const team = await graphql<{ createAgentTeamDefinition: { id: string } }>(
      "mutation($input: CreateAgentTeamDefinitionInput!) { createAgentTeamDefinition(input: $input) { id } }",
      { input: { name: `grok-org-team-${randomUUID()}`, description: "Nested Grok team", instructions,
        coordinatorMemberName: "worker", nodes: [{ memberName: "worker", ref: workerId, refScope: "SHARED" }] } });
    cleanup.push(() => graphql("mutation($id: String!) { deleteAgentTeamDefinition(id: $id) { success } }",
      { id: team.createAgentTeamDefinition.id }));
    const org = await graphql<{ createAgentOrgDefinition: { id: string } }>(
      "mutation($input: CreateAgentOrgDefinitionInput!) { createAgentOrgDefinition(input: $input) { id } }",
      { input: { name: `grok-org-${randomUUID()}`, description: "Grok Org boundary", instructions, members: [
        { memberName: "director", ref: directorId, refType: "AGENT", refScope: "SHARED" },
        { memberName: "team", ref: team.createAgentTeamDefinition.id, refType: "AGENT_TEAM", refScope: "SHARED" },
      ], handoffs: [] } });
    cleanup.push(() => graphql("mutation($id: String!) { deleteAgentOrgDefinition(id: $id) }", { id: org.createAgentOrgDefinition.id }));
    const created = await graphql<{ createAgentOrgRun: { success: boolean; message: string; agentOrgRunId: string | null } }>(
      "mutation($input: CreateAgentOrgRunInput!) { createAgentOrgRun(input: $input) { success message agentOrgRunId } }",
      { input: { agentOrgDefinitionId: org.createAgentOrgDefinition.id, rootConfiguration: { runtimeKind: "grok_build",
        llmModelIdentifier: modelIdentifier, llmConfig: { reasoning_effort: REASONING_EFFORT }, autoExecuteTools: true,
        workspaceRootPath: workspace }, agentOverrides: [], teamOverrides: [] } });
    expect(created.createAgentOrgRun.success, created.createAgentOrgRun.message).toBe(true);
    const orgRunId = created.createAgentOrgRun.agentOrgRunId!;
    cleanup.push(() => graphql("mutation($agentOrgRunId: String!) { terminateAgentOrgRun(agentOrgRunId: $agentOrgRunId) { success } }",
      { agentOrgRunId: orgRunId }));
    const tree = (await graphql<{ getAgentOrgRunConfig: { executionTree: { rootOrg: { members: Array<Record<string, any>> } } } }>(
      "query($orgRunId: String!) { getAgentOrgRunConfig(orgRunId: $orgRunId) { executionTree } }", { orgRunId }))
      .getAgentOrgRunConfig.executionTree;
    const director = tree.rootOrg.members.find((member) => member.address === "/director")!;
    const worker = (tree.rootOrg.members.find((member) => member.address === "/team")?.members as Array<Record<string, any>>)
      .find((member) => member.address === "/team/worker")!;
    expect(director.launchConfiguration).toMatchObject({ runtimeKind: "grok_build" });
    expect(worker.launchConfiguration).toMatchObject({ runtimeKind: "grok_build" });

    const { socket, messages } = await openSocket(`/ws/agent-org/${orgRunId}`);
    await waitFor(messages, 0, (m) => m.type === "ROOT_LIFECYCLE" && m.payload.is_active === true, "org ROOT_LIFECYCLE", 15_000);
    await wait(200);
    const relayContent = `ORG-RELAY ${token}`;
    const commandId = randomUUID();
    const eventOf = (m: WsMessage) => m.payload.event as Record<string, any> | undefined;
    socket.send(JSON.stringify({ type: "SEND_MESSAGE", payload: { root_subject_kind: "agent_org", root_run_id: orgRunId,
      target_agent_run_id: director.agentRunId, command_id: commandId, message_id: randomUUID(), dedupe_key: randomUUID(),
      context_file_paths: [], image_urls: [],
      content: "Call the AutoByteus tool send_message_to (MCP server autobyteus_agent_tools; find it with search_tool and call "
        + `it with use_tool) exactly once with arguments ${JSON.stringify({ recipient_address: "/team/worker",
          content: relayContent, message_type: "org_roundtrip" })}. Then reply with exactly SENT.` } }));
    await waitFor(messages, 0, (m) => m.type === "ROOT_EXECUTION_EVENT" && eventOf(m)?.kind === "communication"
      && eventOf(m)?.message?.senderAgentRunId === director.agentRunId
      && eventOf(m)?.message?.receiverAgentRunId === worker.agentRunId && eventOf(m)?.message?.content === relayContent,
    "org communication director→worker");
    await waitFor(messages, 0, (m) => m.type === "ROOT_EXECUTION_EVENT" && eventOf(m)?.kind === "agent_presentation"
      && eventOf(m)?.member_address === "/team/worker" && eventOf(m)?.message?.type === "TURN_COMPLETED", "worker TURN_COMPLETED");
    const directorTools = messages.filter((m) => m.type === "ROOT_EXECUTION_EVENT" && eventOf(m)?.kind === "agent_presentation"
      && eventOf(m)?.member_address === "/director" && eventOf(m)?.message?.type === "TOOL_EXECUTION_STARTED")
      .map((m) => String(eventOf(m)?.message?.payload?.tool_name));
    console.info("GROK_LIVE_ORG_DIRECTOR_TOOLS", JSON.stringify(directorTools));
    expect(directorTools.filter((name) => name === "send_message_to")).toHaveLength(1);
    expect(directorTools.some((name) => name === "use_tool" || name.startsWith("autobyteus_agent_tools__"))).toBe(false);

    for (let attempt = 0; attempt < 120; attempt++) {
      const checkpoint = await graphql<{ getAgentOrgExecutionCheckpoint: { hasOpenExecutionWork: boolean } }>(
        "query($orgRunId: String!) { getAgentOrgExecutionCheckpoint(orgRunId: $orgRunId) { hasOpenExecutionWork } }", { orgRunId });
      if (!checkpoint.getAgentOrgExecutionCheckpoint.hasOpenExecutionWork) break;
      await wait(500);
    }
    socket.close();
    const stopped = await graphql<{ terminateAgentOrgRun: { success: boolean; message: string } }>(
      "mutation($agentOrgRunId: String!) { terminateAgentOrgRun(agentOrgRunId: $agentOrgRunId) { success message } }",
      { agentOrgRunId: orgRunId });
    expect(stopped.terminateAgentOrgRun.success, stopped.terminateAgentOrgRun.message).toBe(true);
    const restored = await graphql<{ restoreAgentOrgRun: { success: boolean; message: string; agentOrgRunId: string | null } }>(
      "mutation($agentOrgRunId: String!) { restoreAgentOrgRun(agentOrgRunId: $agentOrgRunId) { success message agentOrgRunId } }",
      { agentOrgRunId: orgRunId });
    expect(restored.restoreAgentOrgRun, restored.restoreAgentOrgRun.message).toMatchObject({ success: true, agentOrgRunId: orgRunId });
    const projection = await graphql<{ getAgentOrgMemberRunProjection: { conversation: unknown[] } }>(
      `query($orgRunId: String!, $memberAddress: String!, $agentRunId: String!) {
        getAgentOrgMemberRunProjection(orgRunId: $orgRunId, memberAddress: $memberAddress, agentRunId: $agentRunId) { conversation }
      }`, { orgRunId, memberAddress: "/team/worker", agentRunId: worker.agentRunId });
    expect(JSON.stringify(projection.getAgentOrgMemberRunProjection.conversation)).toContain(relayContent);
    console.info("GROK_LIVE_ORG", JSON.stringify({ orgRunId }));
  }, 900_000);
});
