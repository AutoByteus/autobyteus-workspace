import "reflect-metadata";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import type { FastifyInstance } from "fastify";
import WebSocket from "ws";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { appConfigProvider } from "../../../src/config/app-config-provider.js";
import { startStudioE2eRuntimeServer } from "../helpers/studio-runtime-test-server.js";
import { sendE2eSendMessageCommand } from "../helpers/websocket-command-helpers.js";
import { until } from "../helpers/agy-runtime-error-fixture.js";
import { grokAcpFixturePath } from "../helpers/grok-fake-cli.js";

// autobyteus-324 REQ-010 / AC-007: a Grok run whose tools changed reopens its session (a new
// `grok agent stdio` process, `session/load`) at its next message. When that reopen fails, the
// message fails with a plain message, is not sent, and gets no tools notice; another open run is
// not touched; the next message retries the reopen, and that message is sent with the notice.
// Real Studio server (GraphQL definition save, run WebSocket), the scripted ACP agent in place of
// the Grok CLI: no provider credits. Each `grok agent ... stdio` process of a run (keyed by its
// workspace) replays `prompt.jsonl` first and `load.jsonl` after; while the `fail-next-load` file
// exists, the next process exits before `session/load` (and removes the file).
const GROK = "grok_build";
const GROK_MODEL = "grok-4.7";
const ALPHA = "list_projects";
const BETA = "list_project_tasks";
const FAKE_GROK_SCRIPT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../fixtures/grok-acp/fake-grok-cli.mjs");
const REOPEN_FAILED = /^Couldn't give this run its new tools \(.+\)\. Send your message again to retry, or stop and resume the run\.$/s;

type Frame = { type: string; payload?: Record<string, any> };
type Entry = { kind: string; role?: string | null; content?: string | null; senderId?: string | null };
type Run = { key: string; runId: string; workspace: string; socket: WebSocket; frames: Frame[] };

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe("Grok tool-list reopen failure (scripted ACP agent, real server)", () => {
  let dataDir = "", grokDir = "", app: FastifyInstance | undefined, url!: URL;
  const runs: Record<string, Run> = {};
  const savedEnv = new Map<string, string | undefined>();

  const graphql = async <T = any>(query: string, variables?: Record<string, unknown>): Promise<T> => {
    const response = await fetch(new URL("/graphql", url), { method: "POST",
      headers: { "content-type": "application/json" }, body: JSON.stringify({ query, variables }) });
    const body = await response.json() as { data?: T; errors?: unknown[] };
    if (!response.ok || !body.data || body.errors?.length) throw new Error(JSON.stringify(body.errors ?? body));
    return body.data;
  };
  const createDefinition = async (name: string, toolNames: string[]) => (await graphql(
    `mutation($input:CreateAgentDefinitionInput!){createAgentDefinition(input:$input){id}}`, { input: {
      name, role: "assistant", description: "autobyteus-324 reopen failure e2e", instructions: "Follow the user's request.", toolNames,
    } })).createAgentDefinition.id as string;
  const conversation = async (runId: string): Promise<Entry[]> =>
    ((await graphql(`query($id:String!){getRunProjection(runId:$id){conversation}}`, { id: runId })).getRunProjection?.conversation ?? []) as Entry[];
  /** The scripted agent processes of a run, in launch order: the client methods each received. */
  const processesOf = async (run: Run): Promise<string[][]> => {
    const dir = path.join(run.workspace, ".fake-grok");
    const names = (await fs.readdir(dir).catch(() => [] as string[])).filter((name) => name.endsWith(".jsonl")).sort();
    return Promise.all(names.map(async (name) => (await fs.readFile(path.join(dir, name), "utf8")).trim().split("\n").filter(Boolean)
      .map((line) => JSON.parse(line).method as string | undefined).filter((method): method is string => Boolean(method))));
  };
  const startRun = async (key: string, definitionId: string): Promise<Run> => {
    const workspace = path.join(dataDir, `workspace-${key}`);
    await fs.mkdir(workspace);
    const created = (await graphql(`mutation($input:CreateAgentRunInput!){createAgentRun(input:$input){success message runId}}`, { input: {
      agentDefinitionId: definitionId, workspaceRootPath: workspace, llmModelIdentifier: GROK_MODEL, llmConfig: null,
      autoExecuteTools: true, runtimeKind: GROK,
    } })).createAgentRun;
    expect(created.success, created.message).toBe(true);
    const socket = new WebSocket(`ws://${url.host}/ws/agent/${created.runId}`);
    const frames: Frame[] = [];
    socket.on("message", (raw: unknown) => frames.push(JSON.parse(String(raw))));
    await new Promise<void>((resolve, reject) => { socket.once("open", resolve); socket.once("error", reject); });
    await until(() => frames.some((frame) => frame.type === "CONNECTED"), `${key} stream connected`);
    return (runs[key] = { key, runId: created.runId as string, workspace, socket, frames });
  };
  /**
   * The failures the run's stream shows the user (the web renders exactly these as a failed message):
   * `ERROR` frames and `SEND_MESSAGE` acks that were not accepted.
   */
  const shownFailures = (frames: Frame[]) => frames.filter((frame) => frame.type === "ERROR"
    || (frame.type === "AGENT_COMMAND_ACK" && frame.payload?.command_type === "SEND_MESSAGE" && frame.payload?.accepted === false))
    .map((frame) => ({ code: frame.payload?.code ?? null, message: String(frame.payload?.message ?? "") }));
  /** The run left the message: its input queue is empty again and the run is idle. */
  const settled = (frames: Frame[]) => {
    const lastInput = frames.filter((frame) => frame.type === "AGENT_INPUT_STATE").at(-1);
    const lastStatus = frames.filter((frame) => frame.type === "AGENT_STATUS").at(-1);
    return Boolean(lastInput && (lastInput.payload?.entries ?? []).length === 0 && lastStatus?.payload?.status === "idle");
  };
  /** Sends a message and waits until the run is done with it (a turn ended, or the input left the queue). */
  const send = async (run: Run, content: string) => {
    const fromFrame = run.frames.length;
    sendE2eSendMessageCommand(run.socket, { agent_run_id: run.runId, content });
    await until(() => {
      const frames = run.frames.slice(fromFrame);
      return shownFailures(frames).length > 0 || frames.some((frame) => frame.type === "TURN_COMPLETED") || settled(frames);
    }, `${run.key}: "${content}" settled`, 30_000);
    await wait(1_000);
    return run.frames.slice(fromFrame);
  };
  const notices = (entries: Entry[]) => entries.filter((entry) => entry.kind === "system_task_notification"
    && (entry.senderId === "system.tool_list_update_notifier" || (entry.content ?? "").startsWith("[Platform notice — tools updated]")));

  beforeAll(async () => {
    dataDir = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), "tool-list-reopen-failure-e2e-")));
    grokDir = path.join(dataDir, "fake-grok");
    await fs.mkdir(grokDir);
    await fs.writeFile(path.join(dataDir, ".env"), "AUTOBYTEUS_SERVER_HOST=http://localhost:8000\nAPP_ENV=test\n");
    await fs.writeFile(path.join(grokDir, "grok"), [
      "#!/bin/sh",
      'if [ "$1" = agent ] && [ "$(eval echo \\${$#})" = stdio ]; then',
      '  mkdir -p "$PWD/.fake-grok"',
      '  n=$(ls "$PWD/.fake-grok" | wc -l | tr -d " ")',
      `  if [ "$n" = 0 ]; then export FAKE_ACP_FIXTURE="${grokAcpFixturePath("prompt")}"; else export FAKE_ACP_FIXTURE="${grokAcpFixturePath("load")}"; fi`,
      `  if [ "$n" != 0 ] && [ -f "${grokDir}/fail-next-load" ]; then rm -f "${grokDir}/fail-next-load"; export FAKE_ACP_STOP_BEFORE=session/load; fi`,
      '  export FAKE_ACP_RECORD="$PWD/.fake-grok/process-$n.jsonl"',
      '  : > "$FAKE_ACP_RECORD"',
      "fi",
      `exec "${process.execPath}" "${FAKE_GROK_SCRIPT}" "$@"`,
      "",
    ].join("\n"), { mode: 0o755 });
    for (const [key, value] of Object.entries({ GROK_BUILD_COMMAND: path.join(grokDir, "grok"), FAKE_ACP_REPORT_MCP_READY: "1" })) {
      savedEnv.set(key, process.env[key]);
      process.env[key] = value;
    }
    appConfigProvider.config.setCustomAppDataDir(dataDir);
    const started = await startStudioE2eRuntimeServer();
    app = started.fastify; url = started.mainUrl;
  }, 120_000);

  afterAll(async () => {
    for (const run of Object.values(runs)) {
      run.socket.terminate();
      await graphql(`mutation($id:String!){terminateAgentRun(agentRunId:$id){success message}}`, { id: run.runId }).catch(() => undefined);
    }
    if (app) await app.close();
    for (const [key, value] of savedEnv) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    if (dataDir) await fs.rm(dataDir, { recursive: true, force: true });
  }, 120_000);

  it("fails the message with the plain message, touches no other run, and retries at the next message", async () => {
    const suffix = randomUUID().slice(0, 6);
    const changing = await createDefinition(`Reopen Failure ${suffix}`, [ALPHA]);
    const other = await createDefinition(`Reopen Other ${suffix}`, [ALPHA]);
    const a = await startRun("a", changing);
    const b = await startRun("b", other);

    const first = await send(a, "List the files.");
    expect(shownFailures(first)).toEqual([]);
    expect(await processesOf(a)).toEqual([["initialize", "session/new", "session/prompt"]]);

    // The tool list changes; the next message must reopen the session, and that reopen fails.
    await graphql(`mutation($input:UpdateAgentDefinitionInput!){updateAgentDefinition(input:$input){id}}`,
      { input: { id: changing, toolNames: [ALPHA, BETA] } });
    await wait(2_000);
    await fs.writeFile(path.join(grokDir, "fail-next-load"), "");
    const beforeFailure = (await conversation(a.runId)).length;
    const failed = await send(a, "Use the new tool.");
    // The user sees the message fail with the plain message (REQ-010, AC-007).
    expect(shownFailures(failed), "the run's stream shows the failed message").toEqual([
      { code: expect.stringMatching(/^(RUNTIME_SESSION_REOPEN_FAILED|RUNTIME_REJECTED)$/), message: expect.stringMatching(REOPEN_FAILED) },
    ]);
    // Not sent: the reopen process stopped before `session/load`, and no process got a prompt.
    expect(await processesOf(a)).toEqual([["initialize", "session/new", "session/prompt"], ["initialize"]]);
    expect(notices((await conversation(a.runId)).slice(beforeFailure))).toEqual([]);

    // The other run is not touched: its first message goes to its own first process.
    const otherTurn = await send(b, "List the files.");
    expect(shownFailures(otherTurn)).toEqual([]);
    expect(await processesOf(b)).toEqual([["initialize", "session/new", "session/prompt"]]);

    // The next message retries the reopen; the session is loaded and the message is sent with the notice.
    const beforeRetry = (await conversation(a.runId)).length;
    const retried = await send(a, "Use the new tool now.");
    expect(shownFailures(retried)).toEqual([]);
    expect(await processesOf(a)).toEqual([
      ["initialize", "session/new", "session/prompt"], ["initialize"], ["initialize", "session/load", "session/prompt"],
    ]);
    const afterRetry = (await conversation(a.runId)).slice(beforeRetry);
    expect(notices(afterRetry).map((entry) => entry.content).join("\n")).toContain(`Now available: ${BETA}.`);
    expect(afterRetry.filter((entry) => entry.kind === "message" && entry.role === "user").map((entry) => entry.content))
      .toContain("Use the new tool now.");
  }, 180_000);
});
