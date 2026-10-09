import "reflect-metadata";
import fs from "node:fs/promises";
import { readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import type { FastifyInstance } from "fastify";
import WebSocket from "ws";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { appConfigProvider } from "../../../src/config/app-config-provider.js";
import { startStudioE2eRuntimeServer } from "../helpers/studio-runtime-test-server.js";
import { buildE2eClientCommandIds } from "../helpers/websocket-command-helpers.js";
import { flattenE2eConfiguredAgentExecutions } from "../helpers/team-run-metadata-helpers.js";

// Context files attached in the app reach an Antigravity (AGY) agent as text (agy-image-context-input), through
// the real server: files are uploaded as drafts and finalized over REST exactly as the web stores do, the
// finalized `/rest/...` locators are sent over the app WebSocket (images as `image_urls`, other files as
// `context_file_paths`), and the stream handler, AgentRun normalizer and AGY backend produce AGY's stdin line.
// Only the AGY CLI is scripted (tests/fixtures/agy-failure-cli.mjs, case context_files): it records each raw
// stdin line and opens every listed absolute path with view_file, reporting the file's sha256.
// Run: RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<abs>/tests/fixtures/agy-failure-cli.mjs
const fakeCommand = process.env["ANTIGRAVITY_CLI_COMMAND"] ?? "";
const enabled = process.env["RUN_AGY_FAILURE_E2E"] === "1" &&
  spawnSync(fakeCommand, ["--version"], { stdio: "ignore" })["status"] === 0;
const suite = enabled ? describe : describe.skip;

type Wire = { type: string; payload: Record<string, any> };
type Attachment = { storedFilename: string; displayName: string; locator: string };
type InputRow = { conversation_id: string; turns: number; line: { message: { content: unknown } } };
const IMAGE_HEADING = "Attached images (open each with view_file to see it):";
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==", "base64");
const TXT = Buffer.from("NOTE-MARKER-5531\n");
const PDF = Buffer.from("%PDF-1.4\n% context file fixture\n");
const sha256 = (bytes: Buffer) => `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const stringsIn = (value: unknown): string[] => typeof value === "string" ? [value]
  : Array.isArray(value) ? value.flatMap(stringsIn) : value && typeof value === "object" ? Object.values(value).flatMap(stringsIn) : [];

suite("AGY receives app-attached context files as text through the real server (fake AGY CLI)", () => {
  let dataDir = "";
  let workspace = "";
  let outside = "";
  let app: FastifyInstance;
  let url: URL;
  let definitionId = "";
  let inputLog = "";
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
  const inputs = (): InputRow[] => {
    try { return readFileSync(inputLog, "utf8").split("\n").filter(Boolean).map((line) => JSON.parse(line) as InputRow); }
    catch { return []; }
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
    const until = async (predicate: () => boolean, ms = 20_000) => {
      const deadline = Date.now() + ms;
      while (Date.now() < deadline && !predicate()) await wait(25);
      expect(predicate(), JSON.stringify(frames)).toBe(true);
    };
    return { socket, frames, until };
  };
  /** One user send, as the web stores do it: images as `image_urls`, every other file as `context_file_paths`. */
  const sendMessage = (socket: WebSocket, agentRunId: string, content: string, images: string[], files: string[]) => {
    const ids = buildE2eClientCommandIds();
    socket.send(JSON.stringify({ type: "SEND_MESSAGE", payload: { ...ids, agent_run_id: agentRunId, content,
      context_file_paths: files, image_urls: images } }));
    return ids.message_id;
  };
  /** The view_file results the scripted agent reported for one run (path → `sha256:<hex>` or error code). */
  const viewed = (frames: Wire[], agentRunId?: string) => {
    const mine = frames.filter((f) => !agentRunId || f.payload["agent_run_id"] === agentRunId);
    const started = new Map<string, string>();
    for (const f of mine.filter((f) => f.type === "TOOL_EXECUTION_STARTED" && f.payload["tool_name"] === "view_file")) {
      // Standalone frames carry `tool_args`, Team frames `arguments`.
      const args = f.payload["tool_args"] ?? f.payload["arguments"];
      started.set(String(f.payload["invocation_id"]), String(args?.["AbsolutePath"] ?? ""));
    }
    const results = new Map<string, string>();
    for (const f of mine.filter((f) => f.type === "TOOL_EXECUTION_SUCCEEDED" || f.type === "TOOL_EXECUTION_FAILED")) {
      const file = started.get(String(f.payload["invocation_id"]));
      if (file) results.set(file, String(f.payload["result"]?.["output"] ?? f.payload["error"] ?? ""));
    }
    return results;
  };
  /** An uploaded file's finalized local path: absolute, inside the server's own data folder, named as stored. */
  const expectStoredPath = (file: string, attachment: Attachment) => {
    expect(path.isAbsolute(file), file).toBe(true);
    expect(file.startsWith(dataDir + path.sep), file).toBe(true);
    expect(path.basename(file)).toBe(attachment.storedFilename);
  };
  const listedUnder = (text: string, heading: string) => {
    const at = text.indexOf(heading);
    if (at < 0) return [];
    const block = text.slice(at + heading.length).split("\n\n")[0] ?? "";
    // Absolute paths only, as the scripted agent opens them.
    return [...block.matchAll(/^- (\/.*)$/gm)].map(([, file]) => file!);
  };

  beforeAll(async () => {
    dataDir = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), "agy-context-files-e2e-")));
    workspace = path.join(dataDir, "workspace");
    outside = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), "agy-context-files-outside-")));
    await fs.mkdir(workspace);
    await fs.writeFile(path.join(dataDir, ".env"), "AUTOBYTEUS_SERVER_HOST=http://localhost:8000\nAPP_ENV=test\n");
    appConfigProvider.config.setCustomAppDataDir(dataDir);
    inputLog = path.join(dataDir, "agy-inputs.jsonl");
    process.env["AGY_FAKE_CASE"] = "context_files";
    process.env["AGY_FAKE_INPUT_LOG"] = inputLog;
    const started = await startStudioE2eRuntimeServer();
    app = started.fastify;
    url = started.mainUrl;
    definitionId = (await graphql<{ createAgentDefinition: { id: string } }>(
      "mutation($input: CreateAgentDefinitionInput!) { createAgentDefinition(input: $input) { id } }",
      { input: { name: "agy-context-files-" + randomUUID(), role: "assistant", description: "context files probe",
        instructions: "Answer briefly.", category: "runtime-e2e", toolNames: [] } })).createAgentDefinition.id;
  });
  afterAll(async () => {
    for (const socket of sockets) if (socket.readyState === WebSocket.OPEN) socket.close();
    if (url) {
      for (const runId of runIds) await graphql("mutation($id: String!) { terminateAgentRun(agentRunId: $id) { success } }",
        { id: runId }).catch(() => undefined);
      for (const id of teamRunIds) await graphql("mutation($id: String!) { terminateAgentTeamRun(teamRunId: $id) { success } }",
        { id }).catch(() => undefined);
      for (const id of teamDefinitionIds) await graphql("mutation($id: String!) { deleteAgentTeamDefinition(id: $id) { success } }",
        { id }).catch(() => undefined);
      if (definitionId) await graphql("mutation($id: String!) { deleteAgentDefinition(id: $id) { success } }",
        { id: definitionId }).catch(() => undefined);
    }
    if (app) await app.close();
    for (const dir of [dataDir, outside]) if (dir) await fs.rm(dir, { recursive: true, force: true });
    delete process.env["AGY_FAKE_CASE"];
    delete process.env["AGY_FAKE_INPUT_LOG"];
  });

  const openStandaloneRun = async () => {
    const created = await graphql<{ createAgentRun: { success: boolean; message: string; runId: string | null } }>(
      "mutation($input: CreateAgentRunInput!) { createAgentRun(input: $input) { success message runId } }",
      { input: { agentDefinitionId: definitionId, workspaceRootPath: workspace, llmModelIdentifier: "gemini-3.8-flash-low",
        llmConfig: null, autoExecuteTools: true, runtimeKind: "antigravity_cli" } });
    expect(created.createAgentRun.success, created.createAgentRun.message).toBe(true);
    const runId = created.createAgentRun.runId!;
    runIds.push(runId);
    return { runId, ...(await connect("agent", runId)) };
  };
  /** Waits for the next AGY stdin line after `before` and for the scripted agent's reply to it. */
  const nextInput = async (before: number, run: { frames: Wire[]; until: (p: () => boolean, ms?: number) => Promise<void> },
    agentRunId?: string) => {
    await run.until(() => inputs().length > before);
    const row = inputs()[before]!;
    const replies = () => run.frames.filter((f) => f.type === "SEGMENT_CONTENT"
      && (!agentRunId || f.payload["agent_run_id"] === agentRunId)).map((f) => String(f.payload["delta"] ?? "")).join("");
    const content = row.line.message.content;
    const expected = `VIEWED:${typeof content === "string" ? listedUnder(content, IMAGE_HEADING).length
      + listedUnder(content, "Reference files:").length : 0}`;
    await run.until(() => replies().includes(expected));
    return row;
  };

  it("E2E-CF-001/004: uploaded image, .txt and .pdf reach AGY as one text with absolute paths; a later plain message is unchanged", async () => {
    const run = await openStandaloneRun();
    const draftOwner = { kind: "agent_draft", draftRunId: run.runId };
    const finalized = await finalize(draftOwner, { kind: "agent_final", runId: run.runId }, [
      await upload(draftOwner, "screen shot.png", PNG, "image/png"),
      await upload(draftOwner, "notes.txt", TXT, "text/plain"),
      await upload(draftOwner, "spec.pdf", PDF, "application/pdf"),
    ]);
    const [image, notes, spec] = finalized as [Attachment, Attachment, Attachment];
    expect(image.locator).toMatch(/^\/rest\/runs\//);

    const before = inputs().length;
    const messageId = sendMessage(run.socket, run.runId, "What is in these?", [image.locator], [notes.locator, spec.locator]);
    const row = await nextInput(before, run);
    const content = row.line.message.content;
    // REQ-003: AGY's stdin user line carries a single text string, never content blocks.
    expect(typeof content).toBe("string");
    expect(Object.keys(row.line.message)).toEqual(["content"]);
    const text = content as string;
    const [imagePath] = listedUnder(text, IMAGE_HEADING);
    const [notesPath, specPath] = listedUnder(text, "Reference files:");
    expectStoredPath(imagePath!, image);
    expectStoredPath(notesPath!, notes);
    expectStoredPath(specPath!, spec);
    // REQ-001/REQ-002: exact AGY text (typed text, explicit image section, shared reference section).
    expect(text).toBe(["What is in these?", "", IMAGE_HEADING, `- ${imagePath}`, "", "Reference files:",
      `- ${notesPath}`, `- ${specPath}`].join("\n"));
    // The agent can open every listed path and gets the uploaded bytes.
    await run.until(() => viewed(run.frames).size === 3);
    expect(Object.fromEntries(viewed(run.frames))).toEqual({
      [imagePath!]: sha256(PNG), [notesPath!]: sha256(TXT), [specPath!]: sha256(PDF) });
    await run.until(() => run.frames.some((f) => f.type === "AGENT_COMMAND_ACK" && f.payload["message_id"] === messageId));
    expect(run.frames.find((f) => f.type === "AGENT_COMMAND_ACK" && f.payload["message_id"] === messageId)!.payload)
      .toMatchObject({ accepted: true });

    // E2E-CF-004: a plain follow-up message reaches AGY byte-identical (no attachment carry-over).
    const plainBefore = inputs().length;
    sendMessage(run.socket, run.runId, "Thanks.\nReference files:\n- kept as typed", [], []);
    const plain = await nextInput(plainBefore, run);
    expect(plain.line.message.content).toBe("Thanks.\nReference files:\n- kept as typed");
    expect(plain.conversation_id).toBe(row.conversation_id);

    // REQ-006: the stored/displayed user message is what the user typed; the path text went to AGY only.
    await wait(300);
    const conversation = (await graphql<{ getRunProjection: { conversation: unknown } }>(
      "query($runId: String!) { getRunProjection(runId: $runId) { conversation } }", { runId: run.runId }))
      .getRunProjection.conversation;
    const stored = stringsIn(conversation);
    expect(stored).toContain("What is in these?");
    expect(stored.some((s) => s.includes(IMAGE_HEADING)), JSON.stringify(conversation)).toBe(false);
  }, 60_000);

  it("E2E-CF-002: sending requires text; an attachments-only send is rejected before AGY and the same image then goes with text", async () => {
    // REQ-004 (SR-004, DEC-006): composers never offer an attachments-only send, and the server's unchanged
    // admission rule (non-empty content, every runtime) rejects one from any other client before the backend.
    const run = await openStandaloneRun();
    const draftOwner = { kind: "agent_draft", draftRunId: run.runId };
    const [image] = await finalize(draftOwner, { kind: "agent_final", runId: run.runId },
      [await upload(draftOwner, "pasted.png", PNG, "image/png")]) as [Attachment];
    const ackOf = (id: string) => run.frames.find((f) => f.type === "AGENT_COMMAND_ACK" && f.payload["message_id"] === id);
    const before = inputs().length;
    const rejectedId = sendMessage(run.socket, run.runId, "  \n", [image.locator], []);
    await run.until(() => Boolean(ackOf(rejectedId)));
    expect(ackOf(rejectedId)!.payload).toMatchObject({ state: "rejected", accepted: false, code: "RUNTIME_REJECTED",
      message: "AgentRun input content must be a non-empty string." });
    await wait(300);
    expect(inputs()).toHaveLength(before);
    expect(run.frames.some((f) => f.type === "TURN_STARTED")).toBe(false);

    // The run stays usable: with text, the same uploaded image reaches AGY and is opened.
    const acceptedId = sendMessage(run.socket, run.runId, "Describe it", [image.locator], []);
    const row = await nextInput(before, run);
    const [imagePath] = listedUnder(row.line.message.content as string, IMAGE_HEADING);
    expectStoredPath(imagePath!, image);
    expect(row.line.message.content).toBe(["Describe it", "", IMAGE_HEADING, `- ${imagePath}`].join("\n"));
    await run.until(() => viewed(run.frames).get(imagePath!) === sha256(PNG));
    expect(ackOf(acceptedId)?.payload).toMatchObject({ accepted: true });
  }, 60_000);

  it("E2E-CF-003: a remote image URL is named and a pasted absolute image path outside the workspace is listed as an image", async () => {
    const run = await openStandaloneRun();
    const pasted = path.join(outside, "pasted photo.png");
    await fs.writeFile(pasted, PNG);
    const before = inputs().length;
    sendMessage(run.socket, run.runId, "Compare them", ["https://example.com/cat.png", pasted], []);
    const row = await nextInput(before, run);
    expect(row.line.message.content).toBe(["Compare them", "", IMAGE_HEADING, `- ${pasted}`,
      "Attached image URL: https://example.com/cat.png"].join("\n"));
    await run.until(() => viewed(run.frames).get(pasted) === sha256(PNG));
  }, 60_000);

  it("E2E-CF-005: an AGY team member receives an uploaded image and .txt as text through the Team WebSocket", async () => {
    const teamDefinitionId = (await graphql<{ createAgentTeamDefinition: { id: string } }>(
      "mutation($input: CreateAgentTeamDefinitionInput!) { createAgentTeamDefinition(input: $input) { id } }",
      { input: { name: "agy-context-files-team-" + randomUUID(), description: "context files team probe",
        instructions: "Answer briefly.", coordinatorMemberName: "alpha",
        nodes: [{ memberName: "alpha", ref: definitionId, refScope: "SHARED" }] } })).createAgentTeamDefinition.id;
    teamDefinitionIds.push(teamDefinitionId);
    const created = await graphql<{ createAgentTeamRun: { success: boolean; message: string; teamRunId: string | null } }>(
      "mutation($input: CreateAgentTeamRunInput!) { createAgentTeamRun(input: $input) { success message teamRunId } }",
      { input: { teamDefinitionId,
        teamConfigs: [{ teamAddress: "/", llmModelIdentifier: "gemini-3.8-flash-low", llmConfig: {},
          autoExecuteTools: true, runtimeKind: "antigravity_cli", workspaceRootPath: workspace }],
        memberConfigs: [{ memberAddress: "/alpha", agentDefinitionId: definitionId,
          llmModelIdentifier: "gemini-3.8-flash-low", llmConfig: {}, autoExecuteTools: true,
          runtimeKind: "antigravity_cli", workspaceRootPath: workspace }] } });
    expect(created.createAgentTeamRun.success, created.createAgentTeamRun.message).toBe(true);
    const teamRunId = created.createAgentTeamRun.teamRunId!;
    teamRunIds.push(teamRunId);
    const tree = (await graphql<{ getTeamRunResumeConfig: { executionTree: Record<string, unknown> } }>(
      "query($id: String!) { getTeamRunResumeConfig(teamRunId: $id) { executionTree } }", { id: teamRunId }))
      .getTeamRunResumeConfig.executionTree;
    const alpha = flattenE2eConfiguredAgentExecutions(tree).find((member) => member.memberName === "alpha")!.agentRunId;

    // As agentTeamRunStore does: upload under the member's draft owner, finalize to the member's final owner.
    const draftOwner = { kind: "team_member_draft", teamDraftId: teamRunId, memberAddress: "/alpha" };
    const finalized = await finalize(draftOwner, { kind: "team_member_final", teamRunId, agentRunId: alpha }, [
      await upload(draftOwner, "diagram.png", PNG, "image/png"),
      await upload(draftOwner, "notes.txt", TXT, "text/plain"),
    ]);
    const [image, notes] = finalized as [Attachment, Attachment];
    expect(image.locator).toMatch(/^\/rest\/team-runs\//);

    const team = await connect("agent-team", teamRunId);
    const before = inputs().length;
    sendMessage(team.socket, alpha, "her", [image.locator], [notes.locator]);
    const row = await nextInput(before, team, alpha);
    const text = row.line.message.content as string;
    const [imagePath] = listedUnder(text, IMAGE_HEADING);
    const [notesPath] = listedUnder(text, "Reference files:");
    expectStoredPath(imagePath!, image);
    expectStoredPath(notesPath!, notes);
    expect(text).toBe(["her", "", IMAGE_HEADING, `- ${imagePath}`, "", "Reference files:", `- ${notesPath}`].join("\n"));
    await team.until(() => viewed(team.frames, alpha).size === 2);
    expect(Object.fromEntries(viewed(team.frames, alpha))).toEqual({ [imagePath!]: sha256(PNG), [notesPath!]: sha256(TXT) });
    expect(team.frames.some((f) => f.type === "AGENT_COMMAND_ACK" && (f.payload["state"] === "rejected"
      || f.payload["accepted"] === false)), JSON.stringify(team.frames)).toBe(false);
  }, 60_000);
});
