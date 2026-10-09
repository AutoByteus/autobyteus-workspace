import "reflect-metadata";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import zlib from "node:zlib";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import type { FastifyInstance } from "fastify";
import WebSocket from "ws";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { appConfigProvider } from "../../../src/config/app-config-provider.js";
import { startStudioE2eRuntimeServer } from "../helpers/studio-runtime-test-server.js";
import { buildE2eClientCommandIds } from "../helpers/websocket-command-helpers.js";
import { flattenE2eConfiguredAgentExecutions } from "../helpers/team-run-metadata-helpers.js";

// Real AGY (agy-image-context-input AC-006): images and files attached in the app reach an Antigravity agent
// through the real server (REST upload + finalize as the web stores do, app WebSocket send, normalizer, AGY
// backend), the agent opens them with its native view_file and answers from their actual content. Solid-colour
// PNGs make the colour unknowable without seeing the image. Standalone run and Team member.
// Opt-in (about 1 minute; uses the local `agy` login; leave ANTIGRAVITY_CLI_COMMAND unset):
//   RUN_AGY_CONTEXT_FILES_E2E=1 [AGY_E2E_MODEL=<id>] [AGY_CONTEXT_FILES_EVIDENCE_DIR=<dir>] vitest run tests/e2e/runtime/agy-context-files-live.e2e.test.ts
const live = process.env["RUN_AGY_CONTEXT_FILES_E2E"] === "1" && !process.env["ANTIGRAVITY_CLI_COMMAND"] &&
  spawnSync("agy", ["--version"], { stdio: "ignore" })["status"] === 0;
const suite = live ? describe : describe.skip;
const MODEL = process.env["AGY_E2E_MODEL"] ?? "gemini-3.8-flash-low";
const evidenceDir = path.resolve(process.env["AGY_CONTEXT_FILES_EVIDENCE_DIR"]
  ?? path.join(os.tmpdir(), "agy-context-files-live-evidence"));
const TURN_MS = 150_000;
type Wire = { type: string; payload: Record<string, any> };
type Attachment = { storedFilename: string; displayName: string; locator: string };
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (bytes: Buffer) => {
  let c = 0xffffffff;
  for (const byte of bytes) c = crcTable[(c ^ byte) & 0xff]! ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type: string, data: Buffer) => {
  const typed = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const length = Buffer.alloc(4); length.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(typed));
  return Buffer.concat([length, typed, crc]);
};
/** A solid-colour RGB PNG. */
const solidPng = (size: number, rgb: [number, number, number]) => {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0); header.writeUInt32BE(size, 4);
  header[8] = 8; header[9] = 2;
  const row = Buffer.concat([Buffer.from([0]), Buffer.alloc(size * 3).map((_, i) => rgb[i % 3]!)]);
  const pixels = zlib.deflateSync(Buffer.concat(Array.from({ length: size }, () => row)));
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header), chunk("IDAT", pixels), chunk("IEND", Buffer.alloc(0))]);
};

suite("real AGY sees app-attached images and files through the real server", () => {
  let dataDir = "";
  let workspace = "";
  let outside = "";
  let app: FastifyInstance;
  let url: URL;
  let definitionId = "";
  const runIds: string[] = [];
  const teamRunIds: string[] = [];
  const teamDefinitionIds: string[] = [];
  const sockets: WebSocket[] = [];

  const graphql = async <T = any>(query: string, variables?: Record<string, unknown>): Promise<T> => {
    const response = await fetch(new URL("/graphql", url), { method: "POST",
      headers: { "content-type": "application/json" }, body: JSON.stringify({ query, variables }) });
    const body = await response.json() as { data?: T; errors?: Array<{ message: string }> };
    if (!response.ok || !body.data || body.errors?.length) throw new Error(JSON.stringify(body.errors ?? body));
    return body.data;
  };
  const upload = async (owner: unknown, filename: string, bytes: Buffer, type: string): Promise<Attachment> => {
    const form = new FormData();
    form.set("owner", JSON.stringify(owner));
    form.set("file", new Blob([new Uint8Array(bytes)], { type }), filename);
    const response = await fetch(new URL("/rest/context-files/upload", url), { method: "POST", body: form });
    expect(response.status, await response.clone().text()).toBe(200);
    return response.json() as Promise<Attachment>;
  };
  const finalize = async (draftOwner: unknown, finalOwner: unknown, attachments: Attachment[]): Promise<Attachment[]> => {
    const response = await fetch(new URL("/rest/context-files/finalize", url), { method: "POST",
      headers: { "content-type": "application/json" }, body: JSON.stringify({ draftOwner, finalOwner, attachments }) });
    expect(response.status, await response.clone().text()).toBe(200);
    return (await response.json() as { attachments: Attachment[] }).attachments;
  };
  const connect = async (route: string, id: string) => {
    const socket = new WebSocket(`ws://${url.hostname}:${url.port}/ws/${route}/${id}`);
    sockets.push(socket);
    const frames: Wire[] = [];
    socket.on("message", (raw: unknown) => {
      try {
        const parsed = JSON.parse(String(raw)) as { type?: unknown; payload?: unknown };
        if (typeof parsed.type === "string") frames.push({ type: parsed.type,
          payload: parsed.payload && typeof parsed.payload === "object" ? parsed.payload as Record<string, any> : {} });
      } catch { /* Ignore only malformed diagnostic transport rows. */ }
    });
    await new Promise<void>((resolve, reject) => { socket.once("open", resolve); socket.once("error", reject); });
    return { socket, frames };
  };
  const send = (socket: WebSocket, agentRunId: string, content: string, images: string[], files: string[]) =>
    socket.send(JSON.stringify({ type: "SEND_MESSAGE", payload: { ...buildE2eClientCommandIds(), agent_run_id: agentRunId,
      content, context_file_paths: files, image_urls: images } }));
  /** Waits for the agent's turn to finish; returns its reply text and the paths it opened with view_file. */
  const turn = async (frames: Wire[], agentRunId: string | null, label: string) => {
    const mine = () => frames.filter((f) => !agentRunId || f.payload["agent_run_id"] === agentRunId);
    const deadline = Date.now() + TURN_MS;
    while (Date.now() < deadline && !mine().some((f) => f.type === "TURN_COMPLETED" || f.type === "ERROR")) await wait(250);
    await fs.mkdir(evidenceDir, { recursive: true });
    await fs.writeFile(path.join(evidenceDir, `${label}.json`), JSON.stringify(mine(), null, 2));
    expect(mine().some((f) => f.type === "TURN_COMPLETED"), `${label}: ${JSON.stringify(mine()).slice(-3000)}`).toBe(true);
    const reply = mine().filter((f) => f.type === "SEGMENT_CONTENT" && f.payload["segment_type"] === "text")
      .map((f) => String(f.payload["delta"] ?? "")).join("");
    const opened = mine().filter((f) => f.type === "TOOL_EXECUTION_SUCCEEDED" && f.payload["tool_name"] === "view_file")
      .map((f) => String((f.payload["tool_args"] ?? f.payload["arguments"])?.["AbsolutePath"] ?? ""));
    return { reply, opened };
  };
  /** The finalized local path of an uploaded file (inside the server's data folder, named as stored). */
  const storedPath = (opened: string[], attachment: Attachment) =>
    opened.find((file) => file.startsWith(dataDir + path.sep) && path.basename(file) === attachment.storedFilename);

  beforeAll(async () => {
    dataDir = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), "agy-context-files-live-")));
    outside = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), "agy-context-files-live-outside-")));
    workspace = path.join(dataDir, "workspace");
    await fs.mkdir(workspace);
    await fs.writeFile(path.join(dataDir, ".env"), "AUTOBYTEUS_SERVER_HOST=http://localhost:8000\nAPP_ENV=test\n");
    appConfigProvider.config.setCustomAppDataDir(dataDir);
    const started = await startStudioE2eRuntimeServer();
    app = started.fastify;
    url = started.mainUrl;
    definitionId = (await graphql<{ createAgentDefinition: { id: string } }>(
      "mutation($input: CreateAgentDefinitionInput!) { createAgentDefinition(input: $input) { id } }",
      { input: { name: "agy-context-files-live-" + randomUUID(), role: "assistant", description: "Daily assistant",
        instructions: "You are a helpful daily assistant. Answer the user's messages briefly.",
        category: "runtime-e2e", toolNames: [] } })).createAgentDefinition.id;
  }, 60_000);
  afterAll(async () => {
    for (const socket of sockets) if (socket.readyState === WebSocket.OPEN) socket.close();
    if (url) {
      for (const id of runIds) await graphql("mutation($id: String!) { terminateAgentRun(agentRunId: $id) { success } }",
        { id }).catch(() => undefined);
      for (const id of teamRunIds) await graphql("mutation($id: String!) { terminateAgentTeamRun(teamRunId: $id) { success } }",
        { id }).catch(() => undefined);
      for (const id of teamDefinitionIds) await graphql("mutation($id: String!) { deleteAgentTeamDefinition(id: $id) { success } }",
        { id }).catch(() => undefined);
      if (definitionId) await graphql("mutation($id: String!) { deleteAgentDefinition(id: $id) { success } }",
        { id: definitionId }).catch(() => undefined);
    }
    if (app) await app.close();
    for (const dir of [dataDir, outside]) if (dir) await fs.rm(dir, { recursive: true, force: true });
  }, 60_000);

  const openStandaloneRun = async () => {
    const created = await graphql<{ createAgentRun: { success: boolean; message: string; runId: string | null } }>(
      "mutation($input: CreateAgentRunInput!) { createAgentRun(input: $input) { success message runId } }",
      { input: { agentDefinitionId: definitionId, workspaceRootPath: workspace, llmModelIdentifier: MODEL,
        llmConfig: null, autoExecuteTools: true, runtimeKind: "antigravity_cli" } });
    expect(created.createAgentRun.success, created.createAgentRun.message).toBe(true);
    const runId = created.createAgentRun.runId!;
    runIds.push(runId);
    return { runId, ...(await connect("agent", runId)) };
  };

  it("LIVE-CF-001: an uploaded image sent with the user's minimal text \"her\" is opened and described", async () => {
    const run = await openStandaloneRun();
    const draftOwner = { kind: "agent_draft", draftRunId: run.runId };
    const [image] = await finalize(draftOwner, { kind: "agent_final", runId: run.runId },
      [await upload(draftOwner, "Screenshot 2026-10-08.png", solidPng(64, [220, 20, 20]), "image/png")]) as [Attachment];
    send(run.socket, run.runId, "her", [image.locator], []);
    const { reply, opened } = await turn(run.frames, null, "LIVE-CF-001-standalone-her");
    expect(storedPath(opened, image), JSON.stringify(opened)).toBeDefined();
    expect(reply.toLowerCase(), reply).toContain("red");
  }, TURN_MS + 30_000);

  it("LIVE-CF-002: a pasted absolute image path outside the workspace is opened and its colour named", async () => {
    const run = await openStandaloneRun();
    const pasted = path.join(outside, "pasted image.png");
    await fs.writeFile(pasted, solidPng(64, [20, 170, 40]));
    send(run.socket, run.runId, "What colour is this image? Answer in one word.", [pasted], []);
    const { reply, opened } = await turn(run.frames, null, "LIVE-CF-002-standalone-pasted-path");
    expect(opened, JSON.stringify(opened)).toContain(pasted);
    expect(reply.toLowerCase(), reply).toContain("green");
  }, TURN_MS + 30_000);

  it("LIVE-CF-003: an AGY team member opens an uploaded image and an uploaded note", async () => {
    const teamDefinitionId = (await graphql<{ createAgentTeamDefinition: { id: string } }>(
      "mutation($input: CreateAgentTeamDefinitionInput!) { createAgentTeamDefinition(input: $input) { id } }",
      { input: { name: "agy-context-files-live-team-" + randomUUID(), description: "context files live team",
        instructions: "Answer briefly.", coordinatorMemberName: "alpha",
        nodes: [{ memberName: "alpha", ref: definitionId, refScope: "SHARED" }] } })).createAgentTeamDefinition.id;
    teamDefinitionIds.push(teamDefinitionId);
    const created = await graphql<{ createAgentTeamRun: { success: boolean; message: string; teamRunId: string | null } }>(
      "mutation($input: CreateAgentTeamRunInput!) { createAgentTeamRun(input: $input) { success message teamRunId } }",
      { input: { teamDefinitionId,
        teamConfigs: [{ teamAddress: "/", llmModelIdentifier: MODEL, llmConfig: {}, autoExecuteTools: true,
          runtimeKind: "antigravity_cli", workspaceRootPath: workspace }],
        memberConfigs: [{ memberAddress: "/alpha", agentDefinitionId: definitionId, llmModelIdentifier: MODEL,
          llmConfig: {}, autoExecuteTools: true, runtimeKind: "antigravity_cli", workspaceRootPath: workspace }] } });
    expect(created.createAgentTeamRun.success, created.createAgentTeamRun.message).toBe(true);
    const teamRunId = created.createAgentTeamRun.teamRunId!;
    teamRunIds.push(teamRunId);
    const tree = (await graphql<{ getTeamRunResumeConfig: { executionTree: Record<string, unknown> } }>(
      "query($id: String!) { getTeamRunResumeConfig(teamRunId: $id) { executionTree } }", { id: teamRunId }))
      .getTeamRunResumeConfig.executionTree;
    const alpha = flattenE2eConfiguredAgentExecutions(tree).find((member) => member.memberName === "alpha")!.agentRunId;
    const draftOwner = { kind: "team_member_draft", teamDraftId: teamRunId, memberAddress: "/alpha" };
    const [image, note] = await finalize(draftOwner, { kind: "team_member_final", teamRunId, agentRunId: alpha }, [
      await upload(draftOwner, "chart.png", solidPng(64, [30, 60, 220]), "image/png"),
      await upload(draftOwner, "note.txt", Buffer.from("The project marker is NOTE-MARKER-6612.\n"), "text/plain"),
    ]) as [Attachment, Attachment];
    const team = await connect("agent-team", teamRunId);
    send(team.socket, alpha, "What colour is the attached image, and what marker is in the attached note? Answer briefly.",
      [image.locator], [note.locator]);
    const { reply, opened } = await turn(team.frames, alpha, "LIVE-CF-003-team-member");
    expect(storedPath(opened, image), JSON.stringify(opened)).toBeDefined();
    expect(reply.toLowerCase(), reply).toContain("blue");
    expect(reply, reply).toContain("NOTE-MARKER-6612");
  }, TURN_MS + 60_000);
});
