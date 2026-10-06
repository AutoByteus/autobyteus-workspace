import "reflect-metadata";
import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import type { FastifyInstance } from "fastify";
import WebSocket from "ws";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { appConfigProvider } from "../../../src/config/app-config-provider.js";
import { startStudioE2eRuntimeServer } from "../helpers/studio-runtime-test-server.js";
import { sendE2eSendMessageCommand } from "../helpers/websocket-command-helpers.js";
import { flattenE2eConfiguredAgentExecutions } from "../helpers/team-run-metadata-helpers.js";

// Several AGY native images in one turn of an active run: every image must stay listable and previewable
// while the run is active, after it is terminated, and after it is restored, without a server restart.
// Real Studio HTTP/GraphQL/WebSocket, recorder, run-file-change owner and persistence; only the AGY CLI is scripted.
//
// Run: RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<abs>/autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs \
//   pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/agy-native-image-multi-artifact-preview.e2e.test.ts --no-watch

// The AGY step-output reader resolves AGY's brain root from HOME when its module loads; own a temporary HOME first.
const { home } = await vi.hoisted(async () => {
  if (process.env["RUN_AGY_FAILURE_E2E"] !== "1") return { home: "" };
  const nodeFs = await import("node:fs");
  const nodeOs = await import("node:os");
  const nodePath = await import("node:path");
  const tempHome = nodeFs.realpathSync(nodeFs.mkdtempSync(nodePath.join(nodeOs.tmpdir(), "agy-multi-image-home-")));
  process.env["HOME"] = tempHome;
  return { home: tempHome };
});

const fakeCommand = process.env["ANTIGRAVITY_CLI_COMMAND"] ?? "";
const enabled = process.env["RUN_AGY_FAILURE_E2E"] === "1" &&
  spawnSync(fakeCommand, ["--version"], { stdio: "ignore" })["status"] === 0;
const suite = enabled ? describe : describe.skip;

type Wire = { type: string; payload: Record<string, unknown> };
type FileChangeRow = { runId: string; path: string; sourceTool: string; status: string };
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const PNG = Buffer.from("89504e470d0a1a0a0000000d4948445200000001000000010806000000" +
  "1f15c4890000000d49444154789c6360000002000154a24f5d0000000049454e44ae426082", "hex");
const MODEL = "gemini-3.8-flash-low";

suite("AGY multi-image turn: every generated image stays previewable (fake AGY transport)", () => {
  let dataDir = "";
  let workspace = "";
  let app: FastifyInstance;
  let url: URL;
  const sockets: WebSocket[] = [];
  const agentRunIds: string[] = [];
  const teamRunIds: string[] = [];
  const agentDefinitionIds: string[] = [];
  const teamDefinitionIds: string[] = [];
  const brainRoot = path.join(home, ".gemini", "antigravity-cli", "brain");

  const graphql = async <T>(query: string, variables?: Record<string, unknown>): Promise<T> => {
    const response = await fetch(new URL("/graphql", url), { method: "POST",
      headers: { "content-type": "application/json" }, body: JSON.stringify({ query, variables }) });
    const body = await response.json() as { data?: T; errors?: Array<{ message: string }> };
    if (!response.ok || !body.data || body.errors?.length) throw new Error(JSON.stringify(body.errors ?? body));
    return body.data;
  };
  const listArtifacts = async (runId: string): Promise<FileChangeRow[]> => (await graphql<{
    getRunFileChanges: FileChangeRow[] }>(
    "query($runId: String!) { getRunFileChanges(runId: $runId) { runId path sourceTool status } }", { runId }))
    .getRunFileChanges;
  const preview = async (runId: string, filePath: string) => {
    const response = await fetch(new URL(
      `/rest/runs/${encodeURIComponent(runId)}/file-change-content?path=${encodeURIComponent(filePath)}`, url));
    return { status: response.status, contentType: response.headers.get("content-type"),
      cacheControl: response.headers.get("cache-control"), body: Buffer.from(await response.arrayBuffer()) };
  };
  const imageBytes = (step: number) => Buffer.concat([PNG, Buffer.from(`image-${step}`)]);
  const expectPreviews = async (runId: string, images: Map<number, string>) => {
    for (const [step, image] of images) {
      const observed = await preview(runId, image);
      expect(observed.status, `${image}: ${observed.body.toString()}`).toBe(200);
      expect(observed.contentType).toMatch(/^image\/png/);
      expect(observed.cacheControl).toBe("no-store");
      expect(observed.body.equals(imageBytes(step))).toBe(true);
    }
  };
  const expectListed = async (runId: string, images: Map<number, string>) => {
    const rows = await listArtifacts(runId);
    expect(rows.map((row) => row.path).sort()).toEqual([...images.values()].sort());
    for (const row of rows) expect(row).toMatchObject({ runId, sourceTool: "generated_output", status: "available" });
  };

  /** Plants AGY's step output and the image bytes, as AGY persists them before it reports the step DONE. */
  const plantImage = async (conversationId: string, step: number): Promise<string> => {
    const image = path.join(brainRoot, conversationId, `image_${step}_1.png`);
    const stepDir = path.join(brainRoot, conversationId, ".system_generated", "steps", String(step));
    await fs.mkdir(stepDir, { recursive: true });
    await fs.writeFile(path.join(stepDir, "output.txt"),
      `Using prompt: image ${step}\n\nGenerated image is saved at ${image}.\n\n Do not output the path of this image.\n`);
    await fs.writeFile(image, imageBytes(step));
    return image;
  };

  const openSocket = async (socketPath: string) => {
    const socket = new WebSocket("ws://" + url.hostname + ":" + url.port + socketPath);
    sockets.push(socket);
    const messages: Wire[] = [];
    socket.on("message", (raw: unknown) => {
      try {
        const parsed = JSON.parse(String(raw)) as { type?: unknown; payload?: unknown };
        if (typeof parsed.type === "string") messages.push({ type: parsed.type,
          payload: parsed.payload && typeof parsed.payload === "object" && !Array.isArray(parsed.payload)
            ? parsed.payload as Record<string, unknown> : {} });
      } catch { /* Ignore only malformed diagnostic transport rows. */ }
    });
    await new Promise<void>((resolve, reject) => { socket.once("open", resolve); socket.once("error", reject); });
    return { socket, messages };
  };
  const waitFor = async (messages: Wire[], predicate: (message: Wire) => boolean, label: string) => {
    const deadline = Date.now() + 20_000;
    while (Date.now() < deadline && !messages.some(predicate)) await wait(50);
    expect(messages.some(predicate), `${label}: ${JSON.stringify(messages.map((m) =>
      ["ERROR", "FILE_CHANGE"].includes(m.type) ? m : m.type))}`).toBe(true);
  };
  // The agent stream carries camelCase payloads, the team stream snake_case ones.
  const imageFileChange = (image: string) => (message: Wire) => message.type === "FILE_CHANGE" &&
    (message.payload["sourceTool"] ?? message.payload["source_tool"]) === "generated_output" &&
    message.payload["path"] === image;
  const turnCompleted = (count: number) => (message: Wire, _index?: number, all?: Wire[]) =>
    (all ?? []).filter((m) => m.type === "TURN_COMPLETED").length >= count && message.type === "TURN_COMPLETED";

  /**
   * Scripts the AGY CLI for one image turn. The CLI reads this when the server launches it, so call it before the
   * run (or its restore) starts.
   */
  const scriptImageTurn = (conversationId: string, steps: number[]) => {
    const gate = path.join(home, `gate-${randomUUID()}`);
    process.env["AGY_FAKE_CASE"] = "image_done";
    process.env["AGY_FAKE_CONVERSATION_ID"] = conversationId;
    process.env["AGY_FAKE_IMAGE_STEPS"] = steps.join(",");
    process.env["AGY_FAKE_IMAGE_GATE"] = gate;
    return { conversationId, steps, gate };
  };

  /**
   * One turn that generates the images of `steps` in order. Image n (n ≥ 2) is only generated after the user has
   * opened every earlier image and listed the artifacts, as happens while the user watches the Artifacts tab.
   */
  const runWatchedImageTurn = async (input: {
    runId: string; send: () => void; messages: Wire[]; script: ReturnType<typeof scriptImageTurn>;
    images: Map<number, string>; completedTurns: number;
  }) => {
    const { conversationId, steps, gate } = input.script;
    for (const step of steps) input.images.set(step, await plantImage(conversationId, step));
    input.send();
    try {
      for (const [position, step] of steps.entries()) {
        if (position > 0) await fs.writeFile(`${gate}_${position + 1}`, "");
        await waitFor(input.messages, imageFileChange(input.images.get(step)!), `FILE_CHANGE image ${step}`);
        // The user opens the newly produced image and every earlier one, then the tab re-hydrates the list.
        const shown = new Map([...input.images].filter(([s]) => s <= step));
        await expectPreviews(input.runId, shown);
        await expectListed(input.runId, shown);
      }
    } finally {
      // On a failed assertion, let the scripted turn finish so the run can be terminated and cleaned up.
      for (let position = 2; position <= steps.length; position += 1) await fs.writeFile(`${gate}_${position}`, "");
    }
    await waitFor(input.messages, turnCompleted(input.completedTurns), "TURN_COMPLETED");
    expect(input.messages.some((m) => m.type === "ERROR" || m.type === "TOOL_EXECUTION_FAILED")).toBe(false);
  };

  const createAgentDefinition = async (name: string) => {
    const id = (await graphql<{ createAgentDefinition: { id: string } }>(
      "mutation($input: CreateAgentDefinitionInput!) { createAgentDefinition(input: $input) { id } }",
      { input: { name: `${name}-${randomUUID()}`, role: "assistant", description: "multi-image artifact probe",
        instructions: "Use native image generation when requested.", category: "runtime-e2e", toolNames: [] } }))
      .createAgentDefinition.id;
    agentDefinitionIds.push(id);
    return id;
  };

  beforeAll(async () => {
    dataDir = await fs.mkdtemp(path.join(home, "app-data-"));
    workspace = path.join(dataDir, "workspace");
    await fs.mkdir(workspace);
    await fs.writeFile(path.join(dataDir, ".env"), "AUTOBYTEUS_SERVER_HOST=http://localhost:8000\nAPP_ENV=test\n");
    appConfigProvider.config.setCustomAppDataDir(dataDir);
    const started = await startStudioE2eRuntimeServer();
    app = started.fastify;
    url = started.mainUrl;
  });
  afterAll(async () => {
    for (const socket of sockets) if (socket.readyState === WebSocket.OPEN) socket.close();
    if (url) {
      const quiet = (query: string, variables: Record<string, unknown>) => graphql(query, variables).catch(() => undefined);
      for (const teamRunId of teamRunIds) await quiet(
        "mutation($teamRunId: String!) { terminateAgentTeamRun(teamRunId: $teamRunId) { success } }", { teamRunId });
      for (const agentRunId of agentRunIds) await quiet(
        "mutation($agentRunId: String!) { terminateAgentRun(agentRunId: $agentRunId) { success } }", { agentRunId });
      for (const id of teamDefinitionIds) await quiet(
        "mutation($id: String!) { deleteAgentTeamDefinition(id: $id) { success } }", { id });
      for (const id of agentDefinitionIds) await quiet(
        "mutation($id: String!) { deleteAgentDefinition(id: $id) { success } }", { id });
    }
    if (app) await app.close();
    if (home) await fs.rm(home, { recursive: true, force: true });
    for (const name of ["AGY_FAKE_CASE", "AGY_FAKE_CONVERSATION_ID", "AGY_FAKE_IMAGE_STEPS", "AGY_FAKE_IMAGE_GATE"]) {
      delete process.env[name];
    }
  }, 60_000);

  it("E-001/E-003 standalone: images previewable during the turn, after terminate, and after restore with a new turn", async () => {
    const definitionId = await createAgentDefinition("agy-multi-image");
    const conversationId = randomUUID();
    const firstTurn = scriptImageTurn(conversationId, [1, 2, 3]);
    const started = (await graphql<{ createAgentRun: { success: boolean; message: string; runId: string | null } }>(
      "mutation($input: CreateAgentRunInput!) { createAgentRun(input: $input) { success message runId } }",
      { input: { agentDefinitionId: definitionId, workspaceRootPath: workspace, llmModelIdentifier: MODEL,
        llmConfig: null, autoExecuteTools: true, runtimeKind: "antigravity_cli" } })).createAgentRun;
    expect(started.success, started.message).toBe(true);
    const runId = started.runId!;
    agentRunIds.push(runId);
    const images = new Map<number, string>();
    const first = await openSocket(`/ws/agent/${runId}`);
    await runWatchedImageTurn({ runId, messages: first.messages, script: firstTurn, images,
      completedTurns: 1,
      send: () => sendE2eSendMessageCommand(first.socket, { agent_run_id: runId, content: "Generate three images." }) });
    // Reopening the Artifacts tab later in the same active run (no restart).
    await expectListed(runId, images);
    await expectPreviews(runId, images);

    // E-003 (SCN-003 with real recorded data): the terminated run is read from disk.
    const terminated = (await graphql<{ terminateAgentRun: { success: boolean } }>(
      "mutation($agentRunId: String!) { terminateAgentRun(agentRunId: $agentRunId) { success } }",
      { agentRunId: runId })).terminateAgentRun;
    expect(terminated.success).toBe(true);
    first.socket.close();
    await expectListed(runId, images);
    await expectPreviews(runId, images);

    // Re-activation of a run that already has file_changes.json: earlier and new images are all served.
    const secondTurn = scriptImageTurn(conversationId, [4, 5]);
    const restored = (await graphql<{ restoreAgentRun: { success: boolean; message: string; runId: string } }>(
      "mutation($agentRunId: String!) { restoreAgentRun(agentRunId: $agentRunId) { success message runId } }",
      { agentRunId: runId })).restoreAgentRun;
    expect(restored, restored.message).toMatchObject({ success: true, runId });
    await expectListed(runId, images);
    await expectPreviews(runId, images);
    const second = await openSocket(`/ws/agent/${runId}`);
    await runWatchedImageTurn({ runId, messages: second.messages, script: secondTurn, images,
      completedTurns: 1,
      send: () => sendE2eSendMessageCommand(second.socket, { agent_run_id: runId, content: "Generate two more." }) });
    expect(images.size).toBe(5);
    await expectListed(runId, images);
    await expectPreviews(runId, images);
  }, 120_000);

  it("E-002/E-004 Team member: images previewable during the turn and after the team run is terminated", async () => {
    const creatorId = await createAgentDefinition("agy-multi-image-creator");
    const reviewerId = await createAgentDefinition("agy-multi-image-reviewer");
    const teamDefinitionId = (await graphql<{ createAgentTeamDefinition: { id: string } }>(
      "mutation($input: CreateAgentTeamDefinitionInput!) { createAgentTeamDefinition(input: $input) { id } }",
      { input: { name: `agy-multi-image-team-${randomUUID()}`, description: "multi-image artifact probe team",
        instructions: "Creator generates images.", coordinatorMemberName: "creator",
        nodes: [{ memberName: "creator", ref: creatorId, refScope: "SHARED" },
          { memberName: "reviewer", ref: reviewerId, refScope: "SHARED" }] } })).createAgentTeamDefinition.id;
    teamDefinitionIds.push(teamDefinitionId);
    const member = (memberAddress: string, agentDefinitionId: string) => ({ memberAddress, agentDefinitionId,
      llmModelIdentifier: MODEL, llmConfig: {}, autoExecuteTools: true, runtimeKind: "antigravity_cli",
      workspaceRootPath: workspace });
    const script = scriptImageTurn(randomUUID(), [1, 2, 3]);
    const created = (await graphql<{ createAgentTeamRun: { success: boolean; message: string; teamRunId: string | null } }>(
      "mutation($input: CreateAgentTeamRunInput!) { createAgentTeamRun(input: $input) { success message teamRunId } }",
      { input: { teamDefinitionId,
        teamConfigs: [{ teamAddress: "/", llmModelIdentifier: MODEL, llmConfig: {}, autoExecuteTools: true,
          runtimeKind: "antigravity_cli", workspaceRootPath: workspace }],
        memberConfigs: [member("/creator", creatorId), member("/reviewer", reviewerId)] } })).createAgentTeamRun;
    expect(created.success, created.message).toBe(true);
    const teamRunId = created.teamRunId!;
    teamRunIds.push(teamRunId);
    const tree = (await graphql<{ getTeamRunResumeConfig: { executionTree: Record<string, unknown> } }>(
      "query($teamRunId: String!) { getTeamRunResumeConfig(teamRunId: $teamRunId) { executionTree } }",
      { teamRunId })).getTeamRunResumeConfig.executionTree;
    const memberRunId = flattenE2eConfiguredAgentExecutions(tree)
      .find((execution) => execution.memberName === "creator")?.agentRunId;
    expect(memberRunId).toBeTruthy();

    const images = new Map<number, string>();
    const team = await openSocket(`/ws/agent-team/${teamRunId}`);
    await runWatchedImageTurn({ runId: memberRunId!, messages: team.messages, script,
      images, completedTurns: 1,
      send: () => sendE2eSendMessageCommand(team.socket, { agent_run_id: memberRunId, content: "Generate three images." }) });
    await expectListed(memberRunId!, images);
    await expectPreviews(memberRunId!, images);

    const terminated = (await graphql<{ terminateAgentTeamRun: { success: boolean } }>(
      "mutation($teamRunId: String!) { terminateAgentTeamRun(teamRunId: $teamRunId) { success } }",
      { teamRunId })).terminateAgentTeamRun;
    expect(terminated.success).toBe(true);
    team.socket.close();
    await expectListed(memberRunId!, images);
    await expectPreviews(memberRunId!, images);
  }, 120_000);
});
