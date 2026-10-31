/**
 * Saved settings that hold a key the selected model no longer declares (real saved runs hold `thinking_display`)
 * can still be edited and launched: the server's model-settings check leaves undeclared keys out of the saved or
 * launched config instead of refusing it (ticket claude-anthropic-effort-control, SR-004/SR-005: AC-012, AC-013).
 *
 * Real studio server in process (HTTP GraphQL + agent WebSocket); no provider credits. A synthetic test vault holds a
 * synthetic Anthropic key, and `globalThis.fetch` answers Anthropic `POST /v1/messages` itself: a canned "OK" reply,
 * except for the one scripted `delegate_task` call of AC-013 (b). Every other request goes to the real fetch.
 *
 * Cases:
 *   AC-012 (a) stopped agent run and stopped team run whose stored config holds the stale key: a settings save that
 *              resends it (as the run settings card does, spreading the stored config) is `UPDATED`, and the saved config
 *              holds the new effort and no stale key.
 *   AC-012 (b) stopped AgentOrg run with the stale key in every stored config: a workspace-only edit of a team is
 *              `UPDATED` and leaves the untouched scopes' stored configs as they were; a model-settings edit of a placement
 *              is `UPDATED` and saved without the key.
 *   AC-013 (a) an AgentOrg launch whose launch configuration holds the stale key creates a tree without it.
 *   AC-013 (b) a catalog Agent whose definition default launch config holds the stale key is delegated by a running root:
 *              its default is used (not skipped as invalid) and the copy's recorded launch has no stale key.
 *
 * Run with a clean environment (TESTING.md), from the repository root:
 *   env -i PATH="$PATH" HOME=<temp> TMPDIR="$TMPDIR" corepack pnpm -C autobyteus-server-ts exec vitest run \
 *     tests/e2e/runtime/autobyteus-anthropic-stored-config-edit-launch.e2e.test.ts --no-watch
 */
import "reflect-metadata";
import { randomUUID } from "node:crypto";
import { mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { FastifyInstance } from "fastify";
import WebSocket from "ws";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { TEST_VAULT_SETTING_NAME } from "autobyteus-ts/secrets/test-vault-setting.js";
import { appConfigProvider } from "../../../src/config/app-config-provider.js";
import { closeLiveServerVault, initializeLiveServerVault } from "../../../../test-support/test-vault/live-server-vault.js";
import { createSyntheticTestVault } from "../../../../test-support/test-vault/synthetic-test-vault.js";
import { captureTestVaultSelection, capturedTestVaultSetting } from "../../../../test-support/test-vault/test-vault-selection.js";
import { startStudioE2eRuntimeServer } from "../helpers/studio-runtime-test-server.js";
import { sendE2eSendMessageCommand } from "../helpers/websocket-command-helpers.js";
import { flattenE2eConfiguredAgentExecutions } from "../helpers/team-run-metadata-helpers.js";

type Json = Record<string, unknown>;
type WsMessage = { type: string; payload: Json };

const STALE_KEY = "thinking_display";
const OPUS = "claude-opus-5-5";
const SONNET = "claude-sonnet-5-5";
const STEP_TIMEOUT_MS = 60_000;
const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
const isRecord = (value: unknown): value is Json => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const UPDATE_FIELDS = "success outcome message fieldErrors { path message }";

/** A streamed Messages reply: either one text block or one tool_use block. */
const cannedStream = (model: string, block: Json): string => {
  const isTool = block.type === "tool_use";
  const events: Array<[string, Json]> = [
    ["message_start", { type: "message_start", message: { id: `msg_${randomUUID()}`, type: "message", role: "assistant", model,
      content: [], stop_reason: null, stop_sequence: null, usage: { input_tokens: 10, output_tokens: 0 } } }],
    ["content_block_start", { type: "content_block_start", index: 0, content_block: isTool ? { ...block, input: {} } : { type: "text", text: "" } }],
    ["content_block_delta", { type: "content_block_delta", index: 0, delta: isTool
      ? { type: "input_json_delta", partial_json: JSON.stringify(block.input) } : { type: "text_delta", text: String(block.text) } }],
    ["content_block_stop", { type: "content_block_stop", index: 0 }],
    ["message_delta", { type: "message_delta", delta: { stop_reason: isTool ? "tool_use" : "end_turn", stop_sequence: null }, usage: { output_tokens: 1 } }],
    ["message_stop", { type: "message_stop" }],
  ];
  return events.map(([event, data]) => `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`).join("");
};

describe("AutoByteus Anthropic saved settings with a key the model no longer declares: edit and launch (AC-012, AC-013)", () => {
  const originalFetch = globalThis.fetch;
  const previousTestVaultSetting = capturedTestVaultSetting();
  const anthropicBodies: Json[] = [];
  /** When set, the next Anthropic request that offers this tool is answered with one call to it. */
  let scriptedToolCall: { toolNamePart: string; input: Json } | null = null;
  let app: FastifyInstance | null = null;
  let mainUrl: URL;
  let dataDir = "";
  let workspaceRootPath = "";
  let otherWorkspacePath = "";
  let agentDefinitionId = "";

  const gql = async <T>(query: string, variables: Json = {}): Promise<T> => {
    const response = await originalFetch(new URL("/graphql", mainUrl), {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query, variables }),
    });
    const body = (await response.json()) as { data?: T; errors?: Array<{ message: string }> };
    if (body.errors?.length) throw new Error(`GraphQL: ${body.errors.map((error) => error.message).join("; ")}`);
    return body.data as T;
  };

  const storedConfigFiles = async (runId: string): Promise<string[]> => {
    const found: string[] = [];
    const walk = async (dir: string): Promise<void> => {
      for (const entry of await readdir(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) await walk(full);
        else if (entry.name.endsWith(".json")) {
          const text = await readFile(full, "utf-8");
          if (text.includes(runId) && text.includes("\"llmConfig\"")) found.push(full);
        }
      }
    };
    await walk(dataDir);
    return found;
  };
  /** Adds the stale key to every stored llmConfig object of the run, like configs saved by earlier versions. */
  const addStaleKeyToStoredConfig = async (runId: string): Promise<number> => {
    let changed = 0;
    const visit = (value: unknown): unknown => {
      if (Array.isArray(value)) return value.map(visit);
      if (!isRecord(value)) return value;
      return Object.fromEntries(Object.entries(value).map(([key, entry]) => {
        if (key === "llmConfig" && isRecord(entry)) { changed += 1; return [key, { ...entry, [STALE_KEY]: "omitted" }]; }
        return [key, visit(entry)];
      }));
    };
    for (const file of await storedConfigFiles(runId)) {
      await writeFile(file, JSON.stringify(visit(JSON.parse(await readFile(file, "utf-8"))), null, 2), "utf-8");
    }
    return changed;
  };

  const createTeamDefinition = async (memberNames: string[]): Promise<string> => (await gql<{ createAgentTeamDefinition: { id: string } }>(
    "mutation($input: CreateAgentTeamDefinitionInput!) { createAgentTeamDefinition(input: $input) { id } }",
    { input: { name: `stored-config-edit-team-${randomUUID().slice(0, 8)}`, description: "Stored-config edit check.",
      instructions: "Reply briefly.", coordinatorMemberName: memberNames[0],
      nodes: memberNames.map((memberName) => ({ memberName, ref: agentDefinitionId, refScope: "SHARED" })) } })).createAgentTeamDefinition.id;

  const createOrgRun = async (rootLlmConfig: Json, workerLlmConfig: Json) => {
    const teamDefinitionId = await createTeamDefinition(["worker"]);
    const org = await gql<{ createAgentOrgDefinition: { id: string } }>(
      "mutation($input: CreateAgentOrgDefinitionInput!) { createAgentOrgDefinition(input: $input) { id } }",
      { input: { name: `stored-config-edit-org-${randomUUID().slice(0, 8)}`, description: "Stored-config edit check.",
        instructions: "Reply briefly.", handoffs: [], members: [
          { memberName: "director", ref: agentDefinitionId, refType: "AGENT", refScope: "SHARED" },
          { memberName: "team", ref: teamDefinitionId, refType: "AGENT_TEAM", refScope: "SHARED" },
        ] } });
    return gql<{ createAgentOrgRun: { success: boolean; message: string; agentOrgRunId: string | null } }>(
      "mutation($input: CreateAgentOrgRunInput!) { createAgentOrgRun(input: $input) { success message agentOrgRunId } }",
      { input: { agentOrgDefinitionId: org.createAgentOrgDefinition.id,
        rootConfiguration: { runtimeKind: "autobyteus", llmModelIdentifier: OPUS, llmConfig: rootLlmConfig, autoExecuteTools: true, workspaceRootPath },
        agentOverrides: [{ address: "/team/worker", configuration: { llmModelIdentifier: SONNET, llmConfig: workerLlmConfig } }],
        teamOverrides: [] } });
  };
  const orgTree = async (orgRunId: string) => (await gql<{ getAgentOrgRunConfig: { executionTree: { rootOrg: Json & { members: Json[] } } } }>(
    "query($orgRunId: String!) { getAgentOrgRunConfig(orgRunId: $orgRunId) { executionTree } }", { orgRunId })).getAgentOrgRunConfig.executionTree;
  const orgScope = (tree: { rootOrg: Json & { members: Json[] } }, address: string): Json => {
    if (address === "/") return tree.rootOrg.defaultLaunchConfiguration as Json;
    const member = tree.rootOrg.members.find((entry) => entry.address === address);
    if (member) return (member.launchConfiguration ?? member.defaultLaunchConfiguration) as Json;
    const agent = tree.rootOrg.members.flatMap((entry) => (entry.members as Json[] | undefined) ?? []).find((entry) => entry.address === address)!;
    return agent.launchConfiguration as Json;
  };

  beforeAll(async () => {
    globalThis.fetch = (async (input: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]) => {
      const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
      if (url.hostname !== "api.anthropic.com" || url.pathname !== "/v1/messages") return originalFetch(input, init);
      const raw = init?.body ?? (input instanceof Request ? await input.clone().text() : null);
      const body = JSON.parse(typeof raw === "string" ? raw : new TextDecoder().decode(raw as ArrayBuffer)) as Json;
      anthropicBodies.push(body);
      const tool = scriptedToolCall && Array.isArray(body.tools)
        ? (body.tools as Json[]).find((entry) => String(entry.name).includes(scriptedToolCall!.toolNamePart)) : undefined;
      const block = tool
        ? { type: "tool_use", id: `toolu_${randomUUID().replace(/-/g, "")}`, name: tool.name, input: scriptedToolCall!.input }
        : { type: "text", text: "OK" };
      if (tool) scriptedToolCall = null;
      return new Response(cannedStream(String(body.model), block), { status: 200, headers: { "content-type": "text/event-stream" } });
    }) as typeof fetch;

    dataDir = await mkdtemp(path.join(os.tmpdir(), "anthropic-stored-config-edit-e2e-appdata-"));
    await writeFile(path.join(dataDir, ".env"), "AUTOBYTEUS_SERVER_HOST=http://localhost:8000\nAPP_ENV=test\n", "utf-8");
    appConfigProvider.config.setCustomAppDataDir(dataDir);
    const vault = createSyntheticTestVault(path.join(dataDir, "synthetic-test-vault"),
      { "provider.anthropic.api-key": "synthetic-anthropic-key-for-stored-config-edit-e2e" });
    captureTestVaultSelection({ [TEST_VAULT_SETTING_NAME]: vault.directory });
    await initializeLiveServerVault();
    const started = await startStudioE2eRuntimeServer();
    app = started.fastify;
    mainUrl = started.mainUrl;
    workspaceRootPath = await mkdtemp(path.join(os.tmpdir(), "anthropic-stored-config-edit-e2e-ws-"));
    otherWorkspacePath = await mkdtemp(path.join(os.tmpdir(), "anthropic-stored-config-edit-e2e-ws2-"));

    await gql("mutation($p: String!, $r: String) { ensureProviderModelCatalog(providerId: $p, runtimeKind: $r) { llmModels { modelIdentifier } } }",
      { p: "ANTHROPIC", r: "autobyteus" });
    agentDefinitionId = (await gql<{ createAgentDefinition: { id: string } }>(
      "mutation($input: CreateAgentDefinitionInput!) { createAgentDefinition(input: $input) { id } }",
      { input: { name: `stored-config-edit-${randomUUID().slice(0, 8)}`, role: "assistant", description: "Stored-config edit check.",
        instructions: "Reply briefly.", category: "runtime-e2e", toolNames: [], skillNames: [] } })).createAgentDefinition.id;
  }, 180_000);

  afterAll(async () => {
    await app?.close();
    app = null;
    await closeLiveServerVault();
    captureTestVaultSelection({ [TEST_VAULT_SETTING_NAME]: previousTestVaultSetting ?? "" });
    globalThis.fetch = originalFetch;
    for (const dir of [workspaceRootPath, otherWorkspacePath, dataDir]) if (dir) await rm(dir, { recursive: true, force: true });
  }, 120_000);

  it("AC-012 (a): a stopped agent run's settings save resending the stale key is UPDATED and saved without it", async () => {
    const created = await gql<{ createAgentRun: { success: boolean; message: string; runId: string | null } }>(
      "mutation($input: CreateAgentRunInput!) { createAgentRun(input: $input) { success message runId } }",
      { input: { agentDefinitionId, workspaceRootPath, llmModelIdentifier: OPUS, autoExecuteTools: true, runtimeKind: "autobyteus",
        llmConfig: { reasoning_effort: "max" } } });
    expect(created.createAgentRun.success, created.createAgentRun.message).toBe(true);
    const runId = created.createAgentRun.runId!;
    await gql("mutation($id: String!) { terminateAgentRun(agentRunId: $id) { success } }", { id: runId });
    expect(await addStaleKeyToStoredConfig(runId)).toBeGreaterThan(0);

    const resume = async () => (await gql<{ getAgentRunResumeConfig: { metadataConfig: { llmConfig: Json | null } } }>(
      "query($id: String!) { getAgentRunResumeConfig(runId: $id) { metadataConfig { llmConfig } } }", { id: runId })).getAgentRunResumeConfig;
    expect((await resume()).metadataConfig.llmConfig).toEqual({ reasoning_effort: "max", [STALE_KEY]: "omitted" });
    const saved = await gql<{ updateStoppedAgentRunSelection: Json }>(
      `mutation($input: UpdateStoppedAgentRunSelectionInput!) { updateStoppedAgentRunSelection(input: $input) { ${UPDATE_FIELDS} } }`,
      { input: { agentRunId: runId, llmModelIdentifier: OPUS, llmConfig: { reasoning_effort: "high", [STALE_KEY]: "omitted" } } });
    expect(saved.updateStoppedAgentRunSelection).toMatchObject({ success: true, outcome: "UPDATED", fieldErrors: [] });
    expect((await resume()).metadataConfig.llmConfig).toEqual({ reasoning_effort: "high" });
  }, 120_000);

  it("AC-012 (a): a stopped team run's settings save resending the stale key is UPDATED and saved without it", async () => {
    const teamDefinitionId = await createTeamDefinition(["lead", "helper"]);
    const created = await gql<{ createAgentTeamRun: { success: boolean; message: string; teamRunId: string | null } }>(
      "mutation($input: CreateAgentTeamRunInput!) { createAgentTeamRun(input: $input) { success message teamRunId } }",
      { input: { teamDefinitionId,
        teamConfigs: [{ teamAddress: "/", llmModelIdentifier: OPUS, llmConfig: { reasoning_effort: "max" }, autoExecuteTools: true,
          runtimeKind: "autobyteus", workspaceRootPath }],
        memberConfigs: ["lead", "helper"].map((name) => ({ memberAddress: `/${name}`, agentDefinitionId, llmModelIdentifier: OPUS,
          llmConfig: { reasoning_effort: "max" }, autoExecuteTools: true, runtimeKind: "autobyteus", workspaceRootPath })) } });
    expect(created.createAgentTeamRun.success, created.createAgentTeamRun.message).toBe(true);
    const teamRunId = created.createAgentTeamRun.teamRunId!;
    await gql("mutation($id: String!) { terminateAgentTeamRun(teamRunId: $id) { success } }", { id: teamRunId });
    expect(await addStaleKeyToStoredConfig(teamRunId)).toBeGreaterThanOrEqual(3);

    const saved = await gql<{ updateStoppedTeamRunModelConfigs: Json }>(
      `mutation($input: UpdateStoppedTeamRunModelConfigsInput!) { updateStoppedTeamRunModelConfigs(input: $input) { ${UPDATE_FIELDS} } }`,
      { input: { teamRunId, patches: [{ scopeKind: "CONFIGURED_AGENT", scopeAddress: "/lead", llmModelIdentifier: OPUS,
        llmConfig: { reasoning_effort: "low", [STALE_KEY]: "omitted" } }] } });
    expect(saved.updateStoppedTeamRunModelConfigs).toMatchObject({ success: true, outcome: "UPDATED", fieldErrors: [] });
    const tree = (await gql<{ getTeamRunResumeConfig: { executionTree: Json } }>(
      "query($teamRunId: String!) { getTeamRunResumeConfig(teamRunId: $teamRunId) { executionTree } }", { teamRunId })).getTeamRunResumeConfig.executionTree;
    expect(flattenE2eConfiguredAgentExecutions(tree).map((member) => member.memberAddress).sort()).toEqual(["/helper", "/lead"]);
    // The public tree is snake_case: root_team.members[].launch_configuration.llm_config.
    const lead = ((tree.root_team as Json).members as Json[]).find((member) => member.address === "/lead")!;
    expect((lead.launch_configuration as Json).llm_config).toEqual({ reasoning_effort: "low" });
  }, 120_000);

  it("AC-012 (b): AgentOrg workspace-only edit leaves untouched stored configs as they were; a model edit saves without the key", async () => {
    const created = await createOrgRun({ reasoning_effort: "max" }, { thinking_enabled: true, reasoning_effort: "high" });
    expect(created.createAgentOrgRun.success, created.createAgentOrgRun.message).toBe(true);
    const orgRunId = created.createAgentOrgRun.agentOrgRunId!;
    await gql("mutation($id: String!) { terminateAgentOrgRun(agentOrgRunId: $id) { success } }", { id: orgRunId });
    expect(await addStaleKeyToStoredConfig(orgRunId)).toBeGreaterThanOrEqual(3);

    const workspaceEdit = await gql<{ updateStoppedAgentOrgRunConfig: Json }>(
      `mutation($input: UpdateStoppedAgentOrgRunConfigInput!) { updateStoppedAgentOrgRunConfig(input: $input) { ${UPDATE_FIELDS} } }`,
      { input: { orgRunId, modelPatches: [], teamWorkspacePatches: [{ teamAddress: "/team", workspaceRootPath: otherWorkspacePath }] } });
    expect(workspaceEdit.updateStoppedAgentOrgRunConfig).toMatchObject({ success: true, outcome: "UPDATED", fieldErrors: [] });
    let tree = await orgTree(orgRunId);
    // The worker's stored settings are untouched (stale key kept on disk, inert); only its workspace moved.
    expect(orgScope(tree, "/team/worker")).toMatchObject({ workspaceRootPath: otherWorkspacePath,
      llmConfig: { thinking_enabled: true, reasoning_effort: "high", [STALE_KEY]: "omitted" } });

    const modelEdit = await gql<{ updateStoppedAgentOrgRunConfig: Json }>(
      `mutation($input: UpdateStoppedAgentOrgRunConfigInput!) { updateStoppedAgentOrgRunConfig(input: $input) { ${UPDATE_FIELDS} } }`,
      { input: { orgRunId, teamWorkspacePatches: [], modelPatches: [{ scopeKind: "CONFIGURED_AGENT", scopeAddress: "/director",
        llmModelIdentifier: OPUS, llmConfig: { reasoning_effort: "medium", [STALE_KEY]: "omitted" } }] } });
    expect(modelEdit.updateStoppedAgentOrgRunConfig).toMatchObject({ success: true, outcome: "UPDATED", fieldErrors: [] });
    tree = await orgTree(orgRunId);
    expect(orgScope(tree, "/director").llmConfig).toEqual({ reasoning_effort: "medium" });
  }, 120_000);

  it("AC-013 (a): an AgentOrg launch whose launch configuration holds the stale key creates a tree without it", async () => {
    const created = await createOrgRun({ reasoning_effort: "max", [STALE_KEY]: "omitted" },
      { thinking_enabled: true, reasoning_effort: "high", [STALE_KEY]: "summarized" });
    expect(created.createAgentOrgRun.success, created.createAgentOrgRun.message).toBe(true);
    const orgRunId = created.createAgentOrgRun.agentOrgRunId!;
    const tree = await orgTree(orgRunId);
    expect(orgScope(tree, "/").llmConfig).toEqual({ reasoning_effort: "max" });
    expect(orgScope(tree, "/director").llmConfig).toEqual({ reasoning_effort: "max" });
    expect(orgScope(tree, "/team").llmConfig).toEqual({ reasoning_effort: "max" });
    expect(orgScope(tree, "/team/worker").llmConfig).toEqual({ thinking_enabled: true, reasoning_effort: "high" });
    expect(JSON.stringify(tree)).not.toContain(STALE_KEY);
    await gql("mutation($id: String!) { terminateAgentOrgRun(agentOrgRunId: $id) { success } }", { id: orgRunId }).catch(() => undefined);
  }, 120_000);

  it("AC-013 (b): a delegated catalog Agent whose default launch config holds the stale key runs on that default, without the key", async () => {
    const helperName = `stored-config-helper-${randomUUID().slice(0, 6)}`;
    await gql("mutation($input: CreateAgentDefinitionInput!) { createAgentDefinition(input: $input) { id } }",
      { input: { name: helperName, role: "assistant", description: "Helper with a saved default.", instructions: "Reply briefly.",
        category: "runtime-e2e", toolNames: [], skillNames: [], defaultLaunchConfig: { runtimeKind: "autobyteus",
          llmModelIdentifier: OPUS, llmConfig: { reasoning_effort: "high", [STALE_KEY]: "omitted" } } } });
    const created = await gql<{ createAgentRun: { success: boolean; message: string; runId: string | null } }>(
      "mutation($input: CreateAgentRunInput!) { createAgentRun(input: $input) { success message runId } }",
      { input: { agentDefinitionId, workspaceRootPath, llmModelIdentifier: OPUS, autoExecuteTools: true, runtimeKind: "autobyteus",
        llmConfig: { reasoning_effort: "max" } } });
    expect(created.createAgentRun.success, created.createAgentRun.message).toBe(true);
    const runId = created.createAgentRun.runId!;

    const frames: WsMessage[] = [];
    const ws = new WebSocket(`ws://${mainUrl.hostname}:${mainUrl.port}/ws/agent/${runId}`);
    ws.on("message", (raw) => {
      try {
        const parsed = JSON.parse(raw.toString()) as { type?: unknown; payload?: unknown };
        if (typeof parsed.type === "string") frames.push({ type: parsed.type, payload: isRecord(parsed.payload) ? parsed.payload : {} });
      } catch { /* not a frame */ }
    });
    await new Promise<void>((resolve, reject) => { ws.once("open", () => resolve()); ws.once("error", reject); });
    const deadline = Date.now() + STEP_TIMEOUT_MS;
    while (!frames.some((frame) => frame.type === "CONNECTED") && Date.now() < deadline) await wait(100);

    const callsBefore = anthropicBodies.length;
    scriptedToolCall = { toolNamePart: "delegate_task", input: { recipient_address: `/${helperName.replace(/[^a-z0-9]+/g, "_")}`, description: "Say OK." } };
    sendE2eSendMessageCommand(ws, { content: "Delegate to the helper." });
    // The root's follow-up request carries the delegate_task tool result with the copy's run ID.
    const toolResultText = async (): Promise<string | null> => {
      for (const body of anthropicBodies.slice(callsBefore)) {
        const text = JSON.stringify(body.messages ?? []);
        if (text.includes("tool_result") && text.includes("target_agent_run_id")) return text;
      }
      return null;
    };
    let resultText: string | null = null;
    while (!(resultText = await toolResultText()) && Date.now() < deadline + STEP_TIMEOUT_MS) await wait(200);
    expect(scriptedToolCall, "the root was offered delegate_task and called it").toBeNull();
    expect(resultText, "the root received the delegate_task result").not.toBeNull();
    const copyRunId = /target_agent_run_id\\\\?"\s*:\s*\\\\?"([^"\\]+)/.exec(resultText!)?.[1];
    expect(copyRunId, `copy run id in ${resultText!.slice(0, 600)}`).toBeTruthy();
    expect(resultText, "no launch note: the helper's default was usable").not.toContain("model_settings_invalid");

    // The copy's recorded launch, wherever the root package stores it.
    let recorded: string[] = [];
    while (recorded.length === 0 && Date.now() < deadline + 2 * STEP_TIMEOUT_MS) {
      recorded = await Promise.all((await storedConfigFiles(copyRunId!)).map((file) => readFile(file, "utf-8")));
      if (recorded.length === 0) await wait(200);
    }
    expect(recorded.length, "the copy's launch is recorded").toBeGreaterThan(0);
    expect(recorded.join("\n")).toContain("\"reasoning_effort\": \"high\"");
    expect(recorded.join("\n")).not.toContain(STALE_KEY);

    ws.close();
    await gql("mutation($id: String!) { terminateAgentRun(agentRunId: $id) { success } }", { id: runId }).catch(() => undefined);
  }, 240_000);
});
