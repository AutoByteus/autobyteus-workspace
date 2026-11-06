import "reflect-metadata";
import fs from "node:fs/promises";
import { readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import type { FastifyInstance } from "fastify";
import WebSocket from "ws";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { appConfigProvider } from "../../../src/config/app-config-provider.js";
import { getAgentTeamRunManager } from "../../../src/agent-team-execution/services/agent-team-run-manager.js";
import { startStudioE2eRuntimeServer } from "../helpers/studio-runtime-test-server.js";
import { sendE2eSendMessageCommand } from "../helpers/websocket-command-helpers.js";
import { flattenE2eConfiguredAgentExecutions } from "../helpers/team-run-metadata-helpers.js";
import { isE2eTeamCommunicationMessage } from "../helpers/team-communication-message-helpers.js";
import { closeLiveServerVault, initializeLiveServerVault, requireLiveCapability } from "../../../../test-support/test-vault/live-server-vault.js";

/**
 * DeepSeek Harness in Teams, Orgs and a runtime switch, live: the real `dsh` (0.2.2-rc.1, `--profile acp`) against the
 * REAL DeepSeek API through the product's provider relay, on the real Studio server (paid inference, flash, low effort).
 *
 * Gate: RUN_DEEPSEEK_HARNESS_E2E=1, a working dsh command (`DEEPSEEK_HARNESS_COMMAND` or `dsh`, Node.js 24.9+), and the
 * DeepSeek key `provider.deepseek.api-key` in the test vault (`AUTOBYTEUS_TEST_VAULT`, TESTING.md#test-vault). The runtime
 * switch's other runtime is the scripted Antigravity CLI (`tests/fixtures/agy-failure-cli.mjs`, set by the suite).
 *
 * Command:
 *   env -i PATH="$PATH" HOME="$(cd "$(mktemp -d)" && pwd -P)" TMPDIR="$TMPDIR" AUTOBYTEUS_TEST_VAULT=~/.autobyteus-test/vault \
 *     RUN_DEEPSEEK_HARNESS_E2E=1 DEEPSEEK_HARNESS_COMMAND=<dsh> \
 *     pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/deepseek-harness-collaboration-live.e2e.test.ts --no-watch
 *
 * Cases: a Team of two dsh members, one messaging the other with `send_message_to`, stopped and restored with the
 * conversation kept (REQ-001, AC-004, AC-008); an Org with a direct dsh member and a nested Team's dsh member, the direct
 * one relaying to the nested one (REQ-001); one run switched from dsh to the scripted Antigravity CLI and back to dsh,
 * the dsh agent continuing from the Work Journal (AC-014, REQ-014).
 */

// The Antigravity capability reads its command when its module loads: point it at the scripted CLI before any import.
const previous = vi.hoisted(() => {
  const saved = { agy: process.env.ANTIGRAVITY_CLI_COMMAND, agyCase: process.env.AGY_FAKE_CASE };
  process.env.ANTIGRAVITY_CLI_COMMAND = `${process.cwd()}/tests/fixtures/agy-failure-cli.mjs`;
  process.env.AGY_FAKE_CASE = "auto_compaction";
  return saved;
});

const dshCommand = process.env.DEEPSEEK_HARNESS_COMMAND?.trim() || "dsh";
const dshReady = spawnSync(dshCommand, ["--version"], { stdio: "ignore" }).status === 0;
const live = process.env.RUN_DEEPSEEK_HARNESS_E2E === "1" && dshReady;
const MODEL = process.env.DEEPSEEK_HARNESS_E2E_MODEL?.trim() || "deepseek-v4-flash";
const EFFORT = process.env.DEEPSEEK_HARNESS_E2E_REASONING_EFFORT?.trim() || "low";
const STEP_TIMEOUT_MS = Number(process.env.DEEPSEEK_HARNESS_E2E_STEP_TIMEOUT_MS || 240_000);
const KEY_SECRET_ID = "provider.deepseek.api-key";
const SCRIPTED_AGY = path.resolve(process.cwd(), "tests/fixtures/agy-failure-cli.mjs");

type Frame = { type: string; payload: Record<string, unknown> };
type RawRecord = Record<string, any>;
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const log = (label: string, value: unknown) => process.stdout.write(`DSH_COLLAB ${label} ${JSON.stringify(value)}\n`);
const readRaw = (file: string): RawRecord[] => {
  try { return readFileSync(file, "utf8").split("\n").filter(Boolean).map((line) => JSON.parse(line) as RawRecord); } catch { return []; }
};

describe.runIf(live)("DeepSeek Harness in Teams, Orgs and a runtime switch (real dsh, real DeepSeek API, product relay)", () => {
  let dataDir = "";
  let app: FastifyInstance | null = null;
  let url: URL;
  const sockets: WebSocket[] = [];
  const cleanup: Array<() => Promise<unknown>> = [];
  const dshLlm = { llmModelIdentifier: MODEL, llmConfig: { reasoning_effort: EFFORT } };

  const graphql = async <T>(query: string, variables?: Record<string, unknown>): Promise<T> => {
    const response = await fetch(new URL("/graphql", url), {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query, variables }),
    });
    const body = await response.json() as { data?: T; errors?: Array<{ message: string }> };
    if (!response.ok || !body.data || body.errors?.length) throw new Error(JSON.stringify(body.errors ?? body));
    return body.data;
  };
  const createAgent = async (name: string, instructions: string, toolNames: string[]) => {
    const id = (await graphql<{ createAgentDefinition: { id: string } }>(
      "mutation($input: CreateAgentDefinitionInput!) { createAgentDefinition(input: $input) { id } }",
      { input: { name: `${name}-${randomUUID()}`, role: "assistant", description: "DeepSeek Harness collaboration live e2e agent",
        instructions, category: "runtime-e2e", toolNames, skillNames: [] } })).createAgentDefinition.id;
    cleanup.push(() => graphql("mutation($id: String!) { deleteAgentDefinition(id: $id) { success } }", { id }));
    return id;
  };
  const socketTo = async (route: string) => {
    const socket = new WebSocket(`ws://${url.hostname}:${url.port}${route}`);
    sockets.push(socket);
    const frames: Frame[] = [];
    socket.on("message", (raw: unknown) => {
      try {
        const parsed = JSON.parse(String(raw)) as { type?: unknown; payload?: unknown };
        if (typeof parsed.type === "string") frames.push({ type: parsed.type, payload: (parsed.payload ?? {}) as Record<string, unknown> });
      } catch { /* diagnostic rows only */ }
    });
    await new Promise<void>((resolve, reject) => { socket.once("open", () => resolve()); socket.once("error", reject); });
    return { socket, frames };
  };
  const until = async (frames: Frame[], from: number, predicate: (frame: Frame) => boolean, label: string, ms = STEP_TIMEOUT_MS) => {
    const deadline = Date.now() + ms;
    while (Date.now() < deadline) {
      const found = frames.slice(from).find(predicate);
      if (found) return found;
      await wait(250);
    }
    throw new Error(`Timed out waiting for ${label}. tail=${frames.slice(from).slice(-15).map((f) => `${f.type}:${JSON.stringify(f.payload).slice(0, 200)}`).join(" | ")}`);
  };

  beforeAll(async () => {
    expect(process.env.ANTIGRAVITY_CLI_COMMAND).toBe(SCRIPTED_AGY);
    dataDir = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), "dsh-collab-live-e2e-")));
    await fs.writeFile(path.join(dataDir, ".env"), "AUTOBYTEUS_SERVER_HOST=http://localhost:8000\nAPP_ENV=test\n");
    appConfigProvider.config.setCustomAppDataDir(dataDir);
    await initializeLiveServerVault();
    const started = await startStudioE2eRuntimeServer();
    app = started.fastify;
    url = started.mainUrl;
  }, 120_000);

  afterAll(async () => {
    for (const socket of sockets) if (socket.readyState === WebSocket.OPEN) socket.close();
    for (const step of cleanup.reverse()) await step().catch(() => undefined);
    if (app) await app.close();
    await closeLiveServerVault();
    if (previous.agy === undefined) delete process.env.ANTIGRAVITY_CLI_COMMAND; else process.env.ANTIGRAVITY_CLI_COMMAND = previous.agy;
    if (previous.agyCase === undefined) delete process.env.AGY_FAKE_CASE; else process.env.AGY_FAKE_CASE = previous.agyCase;
    if (dataDir) await fs.rm(dataDir, { recursive: true, force: true });
  }, 180_000);

  it("runs a Team of two dsh members that message each other, then stops and restores it with the conversation kept (REQ-001, AC-004, AC-008)", async (ctx) => {
    await requireLiveCapability(ctx, KEY_SECRET_ID);
    const unique = randomUUID().slice(0, 8);
    const workspace = path.join(dataDir, `team-${unique}`);
    await fs.mkdir(workspace, { recursive: true });
    const instructions = "You are a member of a two-agent test team with members ping and pong. Follow the user's steps "
      + "exactly. To message a teammate, call your send_message_to tool once with the arguments you are given. When you "
      + "receive a message from a teammate, do not call any tool; reply with exactly ACK. Keep replies short.";
    const ping = await createAgent("dsh-ping", instructions, ["send_message_to"]);
    const pong = await createAgent("dsh-pong", instructions, ["send_message_to"]);
    const teamDefinitionId = (await graphql<{ createAgentTeamDefinition: { id: string } }>(
      "mutation($input: CreateAgentTeamDefinitionInput!) { createAgentTeamDefinition(input: $input) { id } }",
      { input: { name: `dsh-team-${unique}`, description: "DeepSeek Harness live team", instructions: "Relay test.",
        coordinatorMemberName: "ping", nodes: [
          { memberName: "ping", ref: ping, refScope: "SHARED" }, { memberName: "pong", ref: pong, refScope: "SHARED" }] } }))
      .createAgentTeamDefinition.id;
    cleanup.push(() => graphql("mutation($id: String!) { deleteAgentTeamDefinition(id: $id) { success } }", { id: teamDefinitionId }));
    const member = (address: string, agentDefinitionId: string) => ({ memberAddress: address, agentDefinitionId, ...dshLlm,
      autoExecuteTools: true, runtimeKind: "deepseek_harness", workspaceRootPath: workspace });
    const created = await graphql<{ createAgentTeamRun: { success: boolean; message: string; teamRunId: string | null } }>(
      "mutation($input: CreateAgentTeamRunInput!) { createAgentTeamRun(input: $input) { success message teamRunId } }",
      { input: { teamDefinitionId,
        teamConfigs: [{ teamAddress: "/", ...dshLlm, autoExecuteTools: true, runtimeKind: "deepseek_harness", workspaceRootPath: workspace }],
        memberConfigs: [member("/ping", ping), member("/pong", pong)] } });
    expect(created.createAgentTeamRun.success, created.createAgentTeamRun.message).toBe(true);
    const teamRunId = created.createAgentTeamRun.teamRunId!;
    cleanup.push(() => graphql("mutation($teamRunId: String!) { terminateAgentTeamRun(teamRunId: $teamRunId) { success } }", { teamRunId }));
    const resume = async () => flattenE2eConfiguredAgentExecutions((await graphql<{ getTeamRunResumeConfig: { executionTree: Record<string, unknown> } }>(
      "query($teamRunId: String!) { getTeamRunResumeConfig(teamRunId: $teamRunId) { executionTree } }", { teamRunId })).getTeamRunResumeConfig.executionTree);
    const members = new Map((await resume()).map((entry) => [entry.memberName, entry.agentRunId]));
    expect(members.get("ping")).toBeTruthy();
    expect(members.get("pong")).toBeTruthy();

    let { socket, frames } = await socketTo(`/ws/agent-team/${teamRunId}`);
    const send = (memberName: string, content: string) =>
      sendE2eSendMessageCommand(socket, { agent_run_id: members.get(memberName)!, content, context_file_paths: [], image_urls: [] });
    const completed = (memberName: string) => (frame: Frame) =>
      frame.type === "TURN_COMPLETED" && frame.payload.agent_run_id === members.get(memberName);
    for (const name of ["ping", "pong"]) {
      const from = frames.length;
      send(name, "Reply with exactly READY and nothing else.");
      await until(frames, from, completed(name), `${name} READY`);
    }
    const token = `PING-TO-PONG-${unique}`;
    const from = frames.length;
    send("ping", `Call your send_message_to tool exactly once now with these arguments: ${JSON.stringify({
      recipient_address: "/pong", content: token, message_type: "roundtrip_ping" })}. Then reply SENT.`);
    const started = await until(frames, from, (frame) => frame.type === "TOOL_EXECUTION_STARTED"
      && frame.payload.agent_run_id === members.get("ping") && frame.payload.tool_name === "send_message_to", "ping send_message_to");
    await until(frames, from, (frame) => isE2eTeamCommunicationMessage(frame,
      { senderAgentRunId: members.get("ping")!, recipientAgentRunId: members.get("pong")!, content: token }), "pong receipt");
    await until(frames, from, (frame) => frame.type === "TOOL_EXECUTION_SUCCEEDED" && frame.payload.invocation_id === started.payload.invocation_id,
      "send_message_to succeeded");
    await until(frames, from, completed("pong"), "pong answered the message");
    log("TEAM_RELAY", { teamRunId, tool: started.payload.tool_name });

    // Stop a quiescent Team, restore it: both dsh members resume their own sessions.
    for (let attempt = 0; attempt < 240; attempt += 1) {
      if (!getAgentTeamRunManager().getActiveTeamRun(teamRunId)?.getExecutionCheckpoint().hasOpenExecutionWork) break;
      await wait(500);
    }
    const sessionsBefore = (await resume()).map((entry) => [entry.memberName, entry.platformAgentRunId]);
    socket.close();
    expect((await graphql<{ terminateAgentTeamRun: { success: boolean; message: string } }>(
      "mutation($teamRunId: String!) { terminateAgentTeamRun(teamRunId: $teamRunId) { success message } }", { teamRunId }))
      .terminateAgentTeamRun.success).toBe(true);
    const restored = await graphql<{ restoreAgentTeamRun: { success: boolean; message: string } }>(
      "mutation($teamRunId: String!) { restoreAgentTeamRun(teamRunId: $teamRunId) { success message } }", { teamRunId });
    expect(restored.restoreAgentTeamRun.success, restored.restoreAgentTeamRun.message).toBe(true);
    ({ socket, frames } = await socketTo(`/ws/agent-team/${teamRunId}`));
    const afterRestore = frames.length;
    send("pong", "We continue after a restart. Reply with only the exact content of the message ping sent you.");
    await until(frames, afterRestore, completed("pong"), "pong after restore");
    // Team streams send text as single SEGMENT_CONTENT frames or as SEGMENT_CONTENT_BATCH frames whose items carry the run id.
    const reply = frames.slice(afterRestore)
      .flatMap((frame) => frame.type === "SEGMENT_CONTENT" ? [frame.payload]
        : frame.type === "SEGMENT_CONTENT_BATCH" ? (frame.payload.items as Array<Record<string, unknown>> | undefined) ?? [] : [])
      .filter((item) => item.agent_run_id === members.get("pong") && (item.segment_type ?? "text") === "text")
      .map((item) => String(item.delta ?? "")).join("");
    log("TEAM_RESTORE", { sessionsBefore, sessionsAfter: (await resume()).map((entry) => [entry.memberName, entry.platformAgentRunId]), reply: reply.slice(-200) });
    expect(reply).toContain(token);
    expect((await resume()).every((entry) => entry.runtimeKind === "deepseek_harness")).toBe(true);
    socket.close();
  }, 1_200_000);

  it("runs an Org with a direct dsh member and a nested Team's dsh member, the direct member relaying to the nested one (REQ-001)", async (ctx) => {
    await requireLiveCapability(ctx, KEY_SECRET_ID);
    const unique = randomUUID().slice(0, 8);
    const workspace = path.join(dataDir, `org-${unique}`);
    await fs.mkdir(workspace, { recursive: true });
    const instructions = "On a direct user request for a marker, reply with that exact marker and do not use tools. On a request "
      + "to relay to another Org member, call your send_message_to tool once with exactly the supplied arguments. On a message "
      + "from another member, do not use tools; reply with exactly ACK.";
    const director = await createAgent("dsh-org-director", instructions, ["send_message_to"]);
    const worker = await createAgent("dsh-org-worker", instructions, ["send_message_to"]);
    const teamDefinitionId = (await graphql<{ createAgentTeamDefinition: { id: string } }>(
      "mutation($input: CreateAgentTeamDefinitionInput!) { createAgentTeamDefinition(input: $input) { id } }",
      { input: { name: `dsh-org-team-${unique}`, description: "Nested dsh team", instructions,
        coordinatorMemberName: "worker", nodes: [{ memberName: "worker", ref: worker, refScope: "SHARED" }] } })).createAgentTeamDefinition.id;
    cleanup.push(() => graphql("mutation($id: String!) { deleteAgentTeamDefinition(id: $id) { success } }", { id: teamDefinitionId }));
    const orgDefinitionId = (await graphql<{ createAgentOrgDefinition: { id: string } }>(
      "mutation($input: CreateAgentOrgDefinitionInput!) { createAgentOrgDefinition(input: $input) { id } }",
      { input: { name: `dsh-org-${unique}`, description: "DeepSeek Harness live Org", instructions, handoffs: [], members: [
        { memberName: "director", ref: director, refType: "AGENT", refScope: "SHARED" },
        { memberName: "team", ref: teamDefinitionId, refType: "AGENT_TEAM", refScope: "SHARED" }] } })).createAgentOrgDefinition.id;
    cleanup.push(() => graphql("mutation($id: String!) { deleteAgentOrgDefinition(id: $id) }", { id: orgDefinitionId }));
    const created = await graphql<{ createAgentOrgRun: { success: boolean; message: string; agentOrgRunId: string | null } }>(
      "mutation($input: CreateAgentOrgRunInput!) { createAgentOrgRun(input: $input) { success message agentOrgRunId } }",
      { input: { agentOrgDefinitionId: orgDefinitionId, agentOverrides: [], teamOverrides: [],
        rootConfiguration: { runtimeKind: "deepseek_harness", ...dshLlm, autoExecuteTools: true, workspaceRootPath: workspace } } });
    expect(created.createAgentOrgRun.success, created.createAgentOrgRun.message).toBe(true);
    const orgRunId = created.createAgentOrgRun.agentOrgRunId!;
    cleanup.push(() => graphql("mutation($agentOrgRunId: String!) { terminateAgentOrgRun(agentOrgRunId: $agentOrgRunId) { success } }", { agentOrgRunId: orgRunId }));
    const tree = (await graphql<{ getAgentOrgRunConfig: { executionTree: { rootOrg: { members: RawRecord[] } } } }>(
      "query($orgRunId: String!) { getAgentOrgRunConfig(orgRunId: $orgRunId) { executionTree } }", { orgRunId })).getAgentOrgRunConfig.executionTree;
    const direct = tree.rootOrg.members.find((entry) => entry.address === "/director")!;
    const nested = (tree.rootOrg.members.find((entry) => entry.address === "/team")!.members as RawRecord[]).find((entry) => entry.address === "/team/worker")!;
    expect(direct.launchConfiguration).toMatchObject({ runtimeKind: "deepseek_harness" });
    expect(nested.launchConfiguration).toMatchObject({ runtimeKind: "deepseek_harness" });

    const { socket, frames } = await socketTo(`/ws/agent-org/${orgRunId}`);
    await until(frames, 0, (frame) => frame.type === "ROOT_LIFECYCLE" && frame.payload.is_active === true, "Org active", 30_000);
    const event = (frame: Frame) => frame.type === "ROOT_EXECUTION_EVENT" ? frame.payload.event as RawRecord : null;
    const turnCompleted = (address: string, runId: string) => (frame: Frame) => {
      const entry = event(frame);
      return entry?.kind === "agent_presentation" && entry.member_address === address && entry.agent_run_id === runId
        && entry.message?.type === "TURN_COMPLETED";
    };
    const sendOrg = (runId: string, content: string) => socket.send(JSON.stringify({ type: "SEND_MESSAGE", payload: {
      root_subject_kind: "agent_org", root_run_id: orgRunId, target_agent_run_id: runId, command_id: randomUUID(), content,
      context_file_paths: [], image_urls: [], message_id: randomUUID(), dedupe_key: randomUUID() } }));
    for (const [address, runId] of [["/director", direct.agentRunId], ["/team/worker", nested.agentRunId]] as const) {
      const from = frames.length;
      sendOrg(runId, `Reply with exactly ORG-${address.replaceAll("/", "-")}-${unique}.`);
      await until(frames, from, turnCompleted(address, runId), `${address} turn`);
    }
    const relayContent = `ORG-RELAY-${unique}`;
    const from = frames.length;
    sendOrg(direct.agentRunId, `Relay now: call your send_message_to tool exactly once with arguments ${JSON.stringify({
      recipient_address: "/team/worker", content: relayContent, message_type: "org_roundtrip" })}.`);
    await until(frames, from, (frame) => {
      const entry = event(frame);
      return entry?.kind === "communication" && entry.message?.senderAgentRunId === direct.agentRunId
        && entry.message?.receiverAgentRunId === nested.agentRunId && entry.message?.content === relayContent;
    }, "Org communication to the nested member");
    await until(frames, from, turnCompleted("/team/worker", nested.agentRunId), "nested member answered");
    const projection = (await graphql<{ getAgentOrgMemberRunProjection: { conversation: unknown[] } }>(
      `query($orgRunId: String!, $memberAddress: String!, $agentRunId: String!) {
        getAgentOrgMemberRunProjection(orgRunId: $orgRunId, memberAddress: $memberAddress, agentRunId: $agentRunId) { conversation } }`,
      { orgRunId, memberAddress: "/team/worker", agentRunId: nested.agentRunId })).getAgentOrgMemberRunProjection;
    log("ORG", { orgRunId, workerHasRelay: JSON.stringify(projection.conversation).includes(relayContent) });
    expect(JSON.stringify(projection.conversation)).toContain(relayContent);
    socket.close();
  }, 1_200_000);

  it("switches one run from dsh to the scripted Antigravity CLI and back to dsh, which continues from the Work Journal (AC-014, REQ-014)", async (ctx) => {
    await requireLiveCapability(ctx, KEY_SECRET_ID);
    const unique = randomUUID().slice(0, 8);
    const workspace = path.join(dataDir, `switch-${unique}`);
    await fs.mkdir(workspace, { recursive: true });
    const fileName = `created-by-dsh-${unique}.txt`;
    const definitionId = await createAgent("dsh-switch", "Do exactly what the user asks with your tools. Keep replies short.", []);
    const created = await graphql<{ createAgentRun: { success: boolean; message: string; runId: string | null } }>(
      "mutation($input: CreateAgentRunInput!) { createAgentRun(input: $input) { success message runId } }",
      { input: { agentDefinitionId: definitionId, workspaceRootPath: workspace, ...dshLlm, autoExecuteTools: true, runtimeKind: "deepseek_harness" } });
    expect(created.createAgentRun.success, created.createAgentRun.message).toBe(true);
    const runId = created.createAgentRun.runId!;
    cleanup.push(() => graphql("mutation($agentRunId: String!) { terminateAgentRun(agentRunId: $agentRunId) { success } }", { agentRunId: runId }));

    const findMemoryDir = async (root: string): Promise<string | null> => {
      const entries = await fs.readdir(root, { withFileTypes: true }).catch(() => []);
      if (path.basename(root) === runId && entries.some((entry) => entry.name === "raw_traces_active.jsonl")) return root;
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        const found = await findMemoryDir(path.join(root, entry.name));
        if (found) return found;
      }
      return null;
    };
    const send = async (content: string, label: string) => {
      const { socket, frames } = await socketTo(`/ws/agent/${runId}`);
      await until(frames, 0, (frame) => frame.type === "CONNECTED", "CONNECTED", 120_000);
      const from = frames.length;
      sendE2eSendMessageCommand(socket, { agent_run_id: runId, content });
      const end = await until(frames, from, (frame) => frame.type === "TURN_COMPLETED" || frame.type === "TURN_INTERRUPTED" || frame.type === "ERROR", `${label} end`);
      const text = frames.slice(from).filter((frame) => frame.type === "SEGMENT_CONTENT").map((frame) => String(frame.payload.delta ?? "")).join("");
      log("SWITCH_TURN", { label, end: end.type, text: text.slice(-200) });
      expect(end.type, JSON.stringify(end.payload).slice(0, 400)).toBe("TURN_COMPLETED");
      socket.close();
      return { frames: frames.slice(from), text };
    };
    const switchTo = async (runtimeKind: string, llmModelIdentifier: string, llmConfig: Record<string, unknown> | null) => {
      expect((await graphql<{ terminateAgentRun: { success: boolean } }>(
        "mutation($agentRunId: String!) { terminateAgentRun(agentRunId: $agentRunId) { success } }", { agentRunId: runId })).terminateAgentRun.success).toBe(true);
      const saved = (await graphql<{ updateStoppedAgentRunSelection: RawRecord }>(
        `mutation($input: UpdateStoppedAgentRunSelectionInput!) { updateStoppedAgentRunSelection(input: $input) {
          success outcome message canonicalSelection { runtimeKind llmModelIdentifier } } }`,
        { input: { agentRunId: runId, runtimeKind, llmModelIdentifier, llmConfig } })).updateStoppedAgentRunSelection;
      expect(saved, JSON.stringify(saved)).toMatchObject({ success: true, outcome: "UPDATED", canonicalSelection: { runtimeKind, llmModelIdentifier } });
    };

    // 1. dsh does the work.
    await send(`Use your bash tool to run exactly \`printf 'alpha' > ${fileName}\` in the current directory, then reply DONE.`, "dsh task");
    expect(await fs.readFile(path.join(workspace, fileName), "utf8")).toBe("alpha");
    const memoryDir = (await findMemoryDir(path.join(dataDir, "memory")))!;
    expect(memoryDir).toBeTruthy();
    const dshRecordIds = readRaw(path.join(memoryDir, "raw_traces_active.jsonl")).map((record) => record.id);

    // 2. Switch to the scripted Antigravity CLI: dsh's records are archived as dsh's; the hand-over marker starts the new file.
    const agyModel = (await graphql<{ providerModelCatalogSnapshots: Array<{ llmModels: Array<{ modelIdentifier: string }> }> }>(
      "query($r: String) { providerModelCatalogSnapshots(runtimeKind: $r) { llmModels { modelIdentifier } } }", { r: "antigravity_cli" }))
      .providerModelCatalogSnapshots.flatMap((snapshot) => snapshot.llmModels.map((model) => model.modelIdentifier))[0]!;
    expect(agyModel).toBeTruthy();
    await switchTo("antigravity_cli", agyModel, null);
    await send("Reply with exactly: AGY-AFTER", "antigravity follow-up");
    const manifest = () => JSON.parse(readFileSync(path.join(memoryDir, "raw_traces_manifest.json"), "utf8")) as { segments: RawRecord[] };
    expect(manifest().segments.map((segment) => [segment.boundary_type, segment.runtime_kind])).toEqual([["runtime_switch", "deepseek_harness"]]);
    expect(readRaw(path.join(memoryDir, "raw_traces_000001.jsonl")).map((record) => record.id), "segment 1 = the dsh agent's records").toEqual(dshRecordIds);
    expect(readRaw(path.join(memoryDir, "raw_traces_active.jsonl"))[0]).toMatchObject({ trace_type: "system_task_notification",
      sender_id: "system.runtime_handover", content: expect.stringMatching(/^Agent runtime changed from DeepSeek Harness \(.+\) to Antigravity CLI \(.+\)\.$/) });

    // 3. Back to dsh: the dsh agent opens the Work Journal and finds what the first dsh agent did.
    await switchTo("deepseek_harness", MODEL, { reasoning_effort: EFFORT });
    const back = await send("You are continuing this run. Open the work journal you were told about with a shell command and find the "
      + "name of the file the first agent created. Reply with that file name, then the word DONE.", "dsh continues");
    expect(back.text).toContain(fileName);
    expect(back.frames.some((frame) => frame.type === "TOOL_EXECUTION_STARTED" && JSON.stringify(frame.payload.arguments ?? {}).includes("work_journal")),
      "dsh opened a journal file").toBe(true);
    expect(manifest().segments.map((segment) => segment.runtime_kind)).toEqual(["deepseek_harness", "antigravity_cli"]);
    const journals = JSON.parse(readFileSync(path.join(memoryDir, "work_journal", "work_journal_manifest.json"), "utf8")) as { files: Array<{ runtime_kind: string | null }> };
    log("SWITCH", { segments: manifest().segments.map((segment) => [segment.file_name, segment.runtime_kind]), journals: journals.files.map((file) => file.runtime_kind) });
    expect(journals.files.map((file) => file.runtime_kind)).toEqual(["deepseek_harness", "antigravity_cli", "deepseek_harness"]);
    expect(readFileSync(path.join(memoryDir, "work_journal", "work_journal_000001.md"), "utf8")).toContain("Command: printf");
  }, 1_200_000);
});
