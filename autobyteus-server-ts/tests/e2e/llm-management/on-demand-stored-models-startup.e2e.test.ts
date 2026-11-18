import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import http from "node:http";
import { once } from "node:events";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import WebSocket from "ws";
import { afterAll, describe, expect, it } from "vitest";
import type { Rec } from "../helpers/collaboration-root-harness.js";
import { killBuiltStudios, startBuiltStudio, until, type BuiltStudio } from "../helpers/built-studio-roots.js";
import { agentStreamFramesOf, waitConnected } from "../helpers/agent-stream-frames.js";
import { buildE2eClientCommandIds } from "../helpers/websocket-command-helpers.js";

// autobyteus-500 G-5 (REQ-016, AC-012; SR-015 R1, SR-016, CR-500-003, CR-500-004): AutoByteus models whose provider is loaded
// on demand (LM Studio, Ollama) through the BUILT Studio server (`dist/app.js`), real HTTP/GraphQL/WebSocket and real restarts.
// The two providers are emulated HTTP hosts on loopback (their model lists and chat answers); nothing else is scripted.
// - ODM-1: a standalone run on an LM Studio model and one on an Ollama model, and a Team whose two members run on the LM
//   Studio model, each answer once; then, across restarts:
//   a. both hosts up: every run and member starts and answers again; Settings' model options name the current model (no
//      "not offered" note);
//   b. the Ollama host down: the Ollama run's start goes on as without G-5 (the provider's own failure, logged), with no G-5
//      refusal, and its model options are "list unreadable" (no note);
//   c. LM Studio read but no longer listing the model: the standalone run and a member are refused with G-5's text and no
//      chat request reaches the host; Settings' options read the list and name no current model (the note); a member whose
//      agent definition was removed gets its own not-found answer, not G-5's (G-5 speaks only for an existing agent).
// Prerequisite: `pnpm -C autobyteus-server-ts build` for the current worktree.
// Run: env -i PATH="$PATH" HOME="$(mktemp -d)" TMPDIR="$TMPDIR" RUN_AGY_FAILURE_E2E=1 \
//   ANTIGRAVITY_CLI_COMMAND=$PWD/autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs \
//   pnpm -C autobyteus-server-ts exec vitest run tests/e2e/llm-management/on-demand-stored-models-startup.e2e.test.ts --no-watch
const cli = process.env.ANTIGRAVITY_CLI_COMMAND ?? "";
const enabled = process.env.RUN_AGY_FAILURE_E2E === "1" && spawnSync(cli, ["--version"], { stdio: "ignore" }).status === 0;
const suite = enabled ? describe : describe.skip;
const LMS = "odm-lms-model";
const OLL = "odm-oll-model";
const G5 = "can't start: its saved model";
type Chat = { model: string; at: number };

suite("AutoByteus models loaded on demand across restarts: started, refused only when read and missing (built server, G-5)", () => {
  let root = "";
  let server: BuiltStudio | null = null;
  const hosts: http.Server[] = [];
  const chats: Chat[] = [];
  let lmsModels = [LMS];

  afterAll(async () => {
    await server?.stop().catch(() => undefined);
    killBuiltStudios();
    for (const host of hosts) host.close();
    if (root) await fs.rm(root, { recursive: true, force: true });
  }, 60_000);

  const listen = async (handler: http.RequestListener) => {
    const host = http.createServer(handler);
    hosts.push(host);
    host.listen(0, "127.0.0.1");
    await once(host, "listening");
    return { host, origin: `http://127.0.0.1:${(host.address() as { port: number }).port}` };
  };
  const bodyOf = async (req: http.IncomingMessage) => { let body = ""; for await (const chunk of req) body += chunk; return body ? JSON.parse(body) as Rec : {}; };
  /** LM Studio: its model list (`lmsModels`) and an OpenAI-style streamed chat answer "OK". */
  const startLmStudio = () => listen(async (req, res) => {
    if (req.url === "/api/v1/models") {
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify({ models: lmsModels.map((key) => ({ key, max_context_length: 32768, loaded_instances: [{ config: { context_length: 32768 } }] })) }));
      return;
    }
    if (req.url !== "/v1/chat/completions") { res.writeHead(404); res.end(); return; }
    const request = await bodyOf(req);
    chats.push({ model: String(request.model), at: Date.now() });
    const base = { id: randomUUID(), object: "chat.completion.chunk", created: 1, model: request.model };
    res.writeHead(200, { "content-type": "text/event-stream" });
    res.write(`data: ${JSON.stringify({ ...base, choices: [{ index: 0, delta: { role: "assistant", content: "OK" }, finish_reason: null }] })}\n\n`);
    res.write(`data: ${JSON.stringify({ ...base, choices: [{ index: 0, delta: {}, finish_reason: "stop" }] })}\n\n`);
    res.end("data: [DONE]\n\n");
  });
  /** Ollama: `/api/tags`, `/api/ps`, `/api/show` and a chat answer "OK" (NDJSON when streamed). */
  const startOllama = () => listen(async (req, res) => {
    res.setHeader("content-type", "application/json");
    if (req.url === "/api/tags") { res.end(JSON.stringify({ models: [{ name: OLL, model: OLL, size: 1, digest: "d", details: {} }] })); return; }
    if (req.url === "/api/ps") { res.end(JSON.stringify({ models: [] })); return; }
    if (req.url === "/api/show") { await bodyOf(req); res.end(JSON.stringify({ model_info: {}, parameters: "" })); return; }
    if (req.url !== "/api/chat") { res.writeHead(404); res.end(); return; }
    const request = await bodyOf(req);
    chats.push({ model: String(request.model), at: Date.now() });
    const part = { model: request.model, created_at: new Date().toISOString(), message: { role: "assistant", content: "OK" }, done: false };
    const done = { model: request.model, created_at: new Date().toISOString(), message: { role: "assistant", content: "" }, done: true,
      done_reason: "stop", total_duration: 1, load_duration: 1, prompt_eval_count: 1, prompt_eval_duration: 1, eval_count: 1, eval_duration: 1 };
    if (request.stream === false) { res.end(JSON.stringify({ ...done, message: { role: "assistant", content: "OK" } })); return; }
    res.setHeader("content-type", "application/x-ndjson");
    res.write(`${JSON.stringify(part)}\n`);
    res.end(`${JSON.stringify(done)}\n`);
  });

  /** The user's message to a run (its own stream) or a team member (the team's stream), until it is answered or refused. */
  const message = async (s: BuiltStudio, route: string, agentRunId: string, model: string, label: string) => {
    const socket = new WebSocket(`${s.url.replace(/^http/, "ws")}/ws/${route}`);
    s.sockets.push(socket);
    const frames: Array<{ type: string; payload: Rec }> = [];
    socket.on("message", (raw: unknown) => { try { frames.push(...agentStreamFramesOf(JSON.parse(String(raw)) as Rec)); } catch { /* not a frame */ } });
    await new Promise<void>((resolve, reject) => { socket.once("open", () => resolve()); socket.once("error", reject); });
    await waitConnected(frames);
    const chatsBefore = chats.filter((chat) => chat.model === model).length;
    socket.send(JSON.stringify({ type: "SEND_MESSAGE", payload: { ...buildE2eClientCommandIds(), agent_run_id: agentRunId,
      content: `Hello. Marker ${label}.`, context_file_paths: [], image_urls: [] } }));
    // A run's own stream is all its own; on a team's stream, a member's frames name it.
    const mine = () => route.startsWith("agent/") ? frames : frames.filter((f) => JSON.stringify(f).includes(agentRunId));
    const refusal = () => mine().find((f) => f.type === "ERROR" || (f.type === "AGENT_COMMAND_ACK" && f.payload.accepted === false)
      || (f.type === "AGENT_STATUS" && f.payload.status === "error"));
    const answered = () => chats.filter((chat) => chat.model === model).length > chatsBefore
      && mine().some((f) => f.type === "ASSISTANT_COMPLETE" || f.type === "TURN_COMPLETED");
    await until(() => answered() || refusal() || null, `${label}: answered or refused`, 90_000)
      .catch((error) => { throw new Error(`${error}; chats ${chats.length}; frames: ${JSON.stringify(mine().map((f) => [f.type, JSON.stringify(f.payload).slice(0, 200)]))}`); });
    await new Promise((resolve) => setTimeout(resolve, 1_500));
    socket.close();
    const errorText = JSON.stringify(mine().filter((f) => f.type === "ERROR" || f.type === "AGENT_COMMAND_ACK" || f.type === "AGENT_STATUS")
      .map((f) => f.payload));
    return { answered: answered(), errorText, chats: chats.filter((chat) => chat.model === model).length - chatsBefore };
  };
  const options = async (s: BuiltStudio, runId: string) => (await s.gql(`query($id:String!){agentRunModelOptions(agentRunId:$id){currentModelIdentifier modelListReadable unavailableReason currentModel{llmModelIdentifier}}}`,
    { id: runId })).agentRunModelOptions as Rec;
  const teamScopes = async (s: BuiltStudio, teamRunId: string) => (await s.gql(`query($id:String!){teamRunModelOptions(teamRunId:$id){scopeKind scopeAddress currentModelIdentifier modelListReadable currentModel{llmModelIdentifier}}}`,
    { id: teamRunId })).teamRunModelOptions as Rec[];
  const teamOptions = async (s: BuiltStudio, teamRunId: string, address: string) => (await teamScopes(s, teamRunId)).find((scope) => scope.scopeAddress === address);

  it("ODM-1 LM Studio and Ollama models start after a restart; a host that is down is not a refusal; read and missing is refused; a removed agent gets its own answer", async () => {
    root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), "on-demand-models-e2e-")));
    const workspace = path.join(root, "workspace");
    for (const dir of ["home", "workspace"]) await fs.mkdir(path.join(root, dir));
    await fs.writeFile(path.join(root, ".env"), "APP_ENV=test\nAUTOBYTEUS_SERVER_HOST=http://127.0.0.1:8000\n");
    const lmStudio = await startLmStudio();
    let ollama = await startOllama();
    const lmsId = `${LMS}:lmstudio@${new URL(lmStudio.origin).host}`;
    const ollId = `${OLL}:ollama@${new URL(ollama.origin).host}`;
    const env = () => ({ ANTIGRAVITY_CLI_COMMAND: cli, AGY_FAKE_CASE: "linked_skills", LMSTUDIO_HOSTS: lmStudio.origin, OLLAMA_HOSTS: ollama.origin });
    server = await startBuiltStudio(root, env());
    let s = server;
    const tag = randomUUID().slice(0, 6);
    const agent = async (name: string) => (await s.gql(`mutation($input:CreateAgentDefinitionInput!){createAgentDefinition(input:$input){id}}`,
      { input: { name, role: "assistant", description: name, instructions: "Reply OK.", toolNames: [] } })).createAgentDefinition.id as string;
    const worker = await agent(`ODM Worker ${tag}`);
    const lead = await agent(`ODM Lead ${tag}`);
    const retired = await agent(`ODM Retired ${tag}`);
    const teamDefinition = (await s.gql(`mutation($input:CreateAgentTeamDefinitionInput!){createAgentTeamDefinition(input:$input){id}}`,
      { input: { name: `ODM Team ${tag}`, description: "t", instructions: "Work.", coordinatorMemberName: "lead",
        nodes: [{ memberName: "lead", ref: lead, refScope: "SHARED" }, { memberName: "retired", ref: retired, refScope: "SHARED" }] } })).createAgentTeamDefinition.id as string;
    const config = (model: string) => ({ workspaceRootPath: workspace, llmModelIdentifier: model, llmConfig: null, autoExecuteTools: true, runtimeKind: "autobyteus" });
    const run = async (model: string) => {
      const created = (await s.gql(`mutation($input:CreateAgentRunInput!){createAgentRun(input:$input){success message runId}}`,
        { input: { agentDefinitionId: worker, ...config(model) } })).createAgentRun as Rec;
      expect(created.success, created.message).toBe(true);
      return created.runId as string;
    };
    const lmRun = await run(lmsId);
    const olRun = await run(ollId);
    const team = (await s.gql(`mutation($input:CreateAgentTeamRunInput!){createAgentTeamRun(input:$input){success message teamRunId}}`,
      { input: { teamDefinitionId: teamDefinition, teamConfigs: [{ teamAddress: "/", ...config(lmsId) }],
        memberConfigs: [{ memberAddress: "/lead", agentDefinitionId: lead, ...config(lmsId) }, { memberAddress: "/retired", agentDefinitionId: retired, ...config(lmsId) }] } })).createAgentTeamRun as Rec;
    expect(team.success, team.message).toBe(true);
    const teamRunId = team.teamRunId as string;
    const members = ((await s.gql(`query($id:String!){getTeamRunResumeConfig(teamRunId:$id){executionTree}}`, { id: teamRunId })).getTeamRunResumeConfig.executionTree as Rec).root_team.members as Rec[];
    const memberRun = (address: string) => members.find((member) => member.address === address)!.agent_run_id as string;
    const stopAll = async (st: BuiltStudio) => {
      for (const id of [lmRun, olRun]) await st.gql(`mutation($id:String!){terminateAgentRun(agentRunId:$id){success}}`, { id }).catch(() => undefined);
      await st.gql(`mutation($id:String!){terminateAgentTeamRun(teamRunId:$id){success}}`, { id: teamRunId }).catch(() => undefined);
    };
    const results: Rec = {};
    results.first = {
      lms: await message(s, `agent/${lmRun}`, lmRun, LMS, "ODM-first-lms"),
      oll: await message(s, `agent/${olRun}`, olRun, OLL, "ODM-first-oll"),
      lead: await message(s, `agent-team/${teamRunId}`, memberRun("/lead"), LMS, "ODM-first-lead"),
      retired: await message(s, `agent-team/${teamRunId}`, memberRun("/retired"), LMS, "ODM-first-retired"),
    };
    for (const [key, result] of Object.entries(results.first)) expect((result as Rec).answered, `first start ${key}: ${JSON.stringify(result)}`).toBe(true);
    await stopAll(s);
    await s.stop();

    // a. A real restart with both hosts up: each start loads its provider first and answers; no false "not offered" note.
    server = await startBuiltStudio(root, env());
    s = server;
    results.restart = {
      lmsOptions: await options(s, lmRun), ollOptions: await options(s, olRun), leadOptions: await teamOptions(s, teamRunId, "/lead"),
      teamScopes: await teamScopes(s, teamRunId),
      lms: await message(s, `agent/${lmRun}`, lmRun, LMS, "ODM-restart-lms"),
      oll: await message(s, `agent/${olRun}`, olRun, OLL, "ODM-restart-oll"),
      lead: await message(s, `agent-team/${teamRunId}`, memberRun("/lead"), LMS, "ODM-restart-lead"),
    };
    for (const key of ["lms", "oll", "lead"]) expect(results.restart[key].answered, `restart ${key}: ${JSON.stringify(results.restart[key])}`).toBe(true);
    expect(results.restart.lmsOptions, "LM Studio run: no note").toMatchObject({ modelListReadable: true, currentModel: { llmModelIdentifier: lmsId } });
    expect(results.restart.ollOptions, "Ollama run: no note").toMatchObject({ modelListReadable: true, currentModel: { llmModelIdentifier: ollId } });
    expect(results.restart.leadOptions, `lead: no note; scopes ${JSON.stringify(results.restart.teamScopes)}`)
      .toMatchObject({ modelListReadable: true, currentModel: { llmModelIdentifier: lmsId } });
    await stopAll(s);
    await s.stop();

    // b. The Ollama host is down: G-5 cannot read its list, so the start goes on as without the check.
    ollama.host.close();
    await once(ollama.host, "close").catch(() => undefined);
    server = await startBuiltStudio(root, env());
    s = server;
    results.hostDown = { ollOptions: await options(s, olRun), oll: await message(s, `agent/${olRun}`, olRun, OLL, "ODM-down-oll") };
    console.log(`ODM-1 Ollama host down: ${JSON.stringify(results.hostDown)}`);
    expect(results.hostDown.oll.errorText, "no G-5 refusal while the host is down").not.toContain(G5);
    // The start's own answer, as without the check (the start path's unchanged MODEL_IDENTIFIER_NOT_AVAILABLE).
    expect(results.hostDown.oll.errorText, "the start's own failure is answered").toContain("MODEL_IDENTIFIER_NOT_AVAILABLE");
    expect(results.hostDown.oll.answered).toBe(false);
    expect(results.hostDown.ollOptions, "unreadable: no note").toMatchObject({ modelListReadable: false, currentModel: null });
    await stopAll(s);
    await s.stop();

    // c. LM Studio is read and no longer lists the model; the retired member's agent definition is removed.
    lmsModels = ["odm-other-model"];
    const definitionFiles = (await fs.readdir(root, { recursive: true, withFileTypes: true }))
      .filter((entry) => entry.isFile() && entry.name === "agent.md" && path.basename(entry.parentPath) === retired && !entry.parentPath.includes(`${path.sep}memory${path.sep}`));
    expect(definitionFiles.length, "the retired agent's definition on disk").toBeGreaterThan(0);
    for (const entry of definitionFiles) await fs.rm(entry.parentPath, { recursive: true, force: true });
    server = await startBuiltStudio(root, env());
    s = server;
    results.missing = {
      lmsOptions: await options(s, lmRun),
      lms: await message(s, `agent/${lmRun}`, lmRun, LMS, "ODM-missing-lms"),
      lead: await message(s, `agent-team/${teamRunId}`, memberRun("/lead"), LMS, "ODM-missing-lead"),
      retired: await message(s, `agent-team/${teamRunId}`, memberRun("/retired"), LMS, "ODM-missing-retired"),
    };
    console.log(`ODM-1 read and missing: ${JSON.stringify(results.missing)}`);
    expect(results.missing.lms.answered).toBe(false);
    expect(results.missing.lms.chats, "no chat request for a refused start").toBe(0);
    expect(results.missing.lms.errorText).toContain(`${G5} '${lmsId}' is not offered by AutoByteus now.`);
    expect(results.missing.lmsOptions, "the note: read, and no current model").toMatchObject({ modelListReadable: true, currentModel: null });
    expect(results.missing.lead.answered).toBe(false);
    expect(results.missing.lead.chats).toBe(0);
    expect(results.missing.lead.errorText).toContain(`lead ${G5} '${lmsId}' is not offered by AutoByteus now.`);
    expect(results.missing.retired.answered).toBe(false);
    expect(results.missing.retired.chats).toBe(0);
    expect(results.missing.retired.errorText, "a removed agent gets its own answer, not G-5's").not.toContain(G5);
    // The member path's own not-found answer (SR-015 R2).
    expect(results.missing.retired.errorText).toContain(`AgentDefinition with ID ${retired} not found`);
    await stopAll(s);
    await s.stop();
    server = null;
  }, 900_000);
});
