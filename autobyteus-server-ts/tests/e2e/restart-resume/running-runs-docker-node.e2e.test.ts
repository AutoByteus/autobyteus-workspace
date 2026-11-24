/**
 * A restart keeps a person's runs running on a Docker node (autobyteus-638, AC-001, AC-002; the incident's restart kind):
 * `docker stop` then `docker start` (the container's graceful end) and `docker kill` then `docker start` (a crash).
 *
 * A test-owned container from the server image, bound to 127.0.0.1 on a free port, with fresh anonymous volumes, runs
 * this worktree's server package mounted read-only over `/opt/autobyteus/server-package` (TESTING.md, Docker server
 * nodes). The test reaches it as the desktop app does: a setup code from the node's CLI, exchanged for an owner
 * credential. Its runs use the scripted AGY CLI (`tests/fixtures/agy-failure-cli.mjs`, mounted read-only): no provider.
 *
 * RUN-D-01: a person's Agent run has an exchange and is idle; it is in the node's running-run record. `docker stop`,
 * `docker start`: the node logs "1 brought back", the run is running again before any input, with its own runtime
 * session, and the person's next message is answered. Then `docker kill`, `docker start`: the same.
 *
 * Gate: RUN_RUNNING_RUNS_DOCKER_E2E=1, Docker, and RUNNING_RUNS_DOCKER_SERVER_PACKAGE: this worktree's server package
 * for the image's platform, built with
 *   docker buildx build -f autobyteus-server-ts/docker/Dockerfile.monorepo --target server-package \
 *     --platform linux/<arch> --output type=local,dest=<new folder> .
 * RUNNING_RUNS_DOCKER_IMAGE names the image (default `autobyteus/autobyteus-server:beta`). The container is removed with
 * its volumes. Command (in autobyteus-server-ts):
 *   RUN_RUNNING_RUNS_DOCKER_E2E=1 RUNNING_RUNS_DOCKER_SERVER_PACKAGE=<folder> \
 *     pnpm exec vitest run tests/e2e/restart-resume/running-runs-docker-node.e2e.test.ts --no-watch
 * RUNNING_RUNS_DOCKER_E2E_EVIDENCE_DIR (optional) keeps the case's summary.
 */
import { execFile } from "node:child_process";
import { randomBytes, randomUUID } from "node:crypto";
import fs from "node:fs";
import fsp from "node:fs/promises";
import net from "node:net";
import path from "node:path";
import { promisify } from "node:util";
import WebSocket from "ws";
import { afterAll, describe, expect, it } from "vitest";
import { attachOwnerCredential } from "../../../../test-support/node-access/owner-credential-attachment.mjs";
import { sendE2eSendMessageCommand } from "../helpers/websocket-command-helpers.js";
import { agentStreamFramesOf } from "../helpers/agent-stream-frames.js";

type Json = Record<string, any>;
type Wire = { type: string; payload: Json };
const execFileAsync = promisify(execFile);
const GATE = process.env.RUN_RUNNING_RUNS_DOCKER_E2E === "1";
const PACKAGE_DIR = process.env.RUNNING_RUNS_DOCKER_SERVER_PACKAGE ?? "";
const IMAGE = process.env.RUNNING_RUNS_DOCKER_IMAGE ?? "autobyteus/autobyteus-server:beta";
const EVIDENCE_DIR = process.env.RUNNING_RUNS_DOCKER_E2E_EVIDENCE_DIR?.trim() || "";
const READY = GATE && fs.existsSync(path.join(PACKAGE_DIR, "dist", "app.js"));
const FIXTURE = path.resolve(import.meta.dirname, "../../fixtures/agy-failure-cli.mjs");
const container = `api638-running-runs-${randomBytes(4).toString("hex")}`;
const SUMMARY = "Running runs after the restart:";

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const until = async (check: () => boolean | Promise<boolean>, label: string, ms = 180_000) => {
  const deadline = Date.now() + ms;
  let last: unknown;
  while (Date.now() < deadline) { try { if (await check()) return; } catch (error) { last = error; } await wait(500); }
  throw new Error(`Timed out: ${label}${last ? ` (${String(last)})` : ""}`);
};
const freePort = () => new Promise<number>((resolve, reject) => {
  const server = net.createServer();
  server.once("error", reject);
  server.listen(0, "127.0.0.1", () => { const port = (server.address() as net.AddressInfo).port; server.close(() => resolve(port)); });
});
const docker = async (...args: string[]) => (await execFileAsync("docker", args, { maxBuffer: 64 * 1024 * 1024 })).stdout;
const logs = async () => { const { stdout, stderr } = await execFileAsync("docker", ["logs", container], { maxBuffer: 64 * 1024 * 1024 }); return `${stdout}\n${stderr}`; };

afterAll(async () => {
  if (READY) await execFileAsync("docker", ["rm", "-f", "-v", container]).catch(() => undefined);
}, 60_000);

describe.skipIf(!READY)("A restart keeps a person's runs running on a Docker node", () => {
  it("RUN-D-01: docker stop/start, then docker kill/start: the idle run is running again, with its session, and answers", async () => {
    const port = await freePort();
    const url = `http://127.0.0.1:${port}`;
    await docker("run", "-d", "--name", container, "--cap-add", "SYS_ADMIN", "--security-opt", "seccomp=unconfined",
      "-p", `127.0.0.1:${port}:8000`, "-e", `AUTOBYTEUS_SERVER_HOST=${url}`,
      "-e", "ANTIGRAVITY_CLI_COMMAND=/opt/test/agy-failure-cli.mjs", "-e", "AGY_FAKE_CASE=linked_skills",
      "-v", "/home/autobyteus/data", "-v", "/root", "-v", "/app/autobyteus-server-ts/workspace", "-v", "/home/vncuser/.config/chromium",
      "-v", `${FIXTURE}:/opt/test/agy-failure-cli.mjs:ro`, "-v", `${path.resolve(PACKAGE_DIR)}:/opt/autobyteus/server-package:ro`, IMAGE);
    const healthy = () => until(async () => (await fetch(`${url}/rest/health`)).ok, "the node's health", 300_000);
    await healthy();
    const setup = await docker("exec", container, "node", "/opt/autobyteus/server-package/dist/node-access-cli.js", "setup-code", "--data-dir", "/home/autobyteus/data");
    const setupCode = /Setup code: (\S+)/.exec(setup)?.[1];
    expect(setupCode, "the node printed a setup code").toBeTruthy();
    const exchange = await fetch(`${url}/rest/node-access/setup-exchanges`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ setupCode, desktopName: "api638 test" }) });
    expect(exchange.status).toBe(201);
    const detach = attachOwnerCredential(url, ((await exchange.json()) as { credential: string }).credential);
    const gql = async <T = any>(query: string, variables: Json = {}): Promise<T> => {
      const body = await (await fetch(`${url}/graphql`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query, variables }) })).json() as { data?: T; errors?: unknown[] };
      if (!body.data || body.errors?.length) throw new Error(JSON.stringify(body.errors ?? body));
      return body.data;
    };
    const talk = async (runId: string, content: string, label: string) => {
      const messages: Wire[] = [];
      const socket = new WebSocket(`${url.replace(/^http/, "ws")}/ws/agent/${runId}`);
      socket.on("message", (raw: unknown) => {
        try {
          for (const frame of agentStreamFramesOf(JSON.parse(String(raw)) as never) as unknown as Array<{ type?: string; payload?: Json }>) {
            if (typeof frame.type === "string") messages.push({ type: frame.type, payload: frame.payload && typeof frame.payload === "object" ? frame.payload : {} });
          }
        } catch { /* diagnostic rows only */ }
      });
      await new Promise<void>((resolve, reject) => { socket.once("open", () => resolve()); socket.once("error", reject); });
      await until(() => messages.some((m) => m.type === "CONNECTED"), `${label}: CONNECTED`, 120_000);
      sendE2eSendMessageCommand(socket, { agent_run_id: runId, content });
      await until(() => messages.some((m) => m.type === "TURN_COMPLETED" || m.type === "ERROR"), `${label}: the turn ended`, 180_000);
      await wait(500);
      socket.close();
      expect(messages.filter((m) => m.type === "ERROR").map((m) => m.payload), `${label}: errors`).toEqual([]);
      return messages.filter((m) => m.type === "SEGMENT_CONTENT").map((m) => String(m.payload.delta ?? "")).join("");
    };
    const isActive = async (runId: string) => (await gql(`query($id:String!){getAgentRunResumeConfig(runId:$id){isActive}}`, { id: runId })).getAgentRunResumeConfig.isActive === true;
    const runFile = async (runId: string) => JSON.parse(await docker("exec", container, "cat", `/home/autobyteus/data/memory/agents/${runId}/run_metadata.json`)) as Json;
    const record = async () => JSON.parse(await docker("exec", container, "sh", "-c", "cat /home/autobyteus/data/restart-resume/running-runs.json 2>/dev/null || echo null")) as Json | null;
    const summaries = async () => (await logs()).split("\n").filter((line) => line.includes(SUMMARY)).map((line) => line.slice(line.indexOf(SUMMARY)));

    const outcome: Json = {};
    try {
      // A person's Agent run on the scripted AGY: one exchange, idle, recorded.
      const definitionId = (await gql(`mutation($input:CreateAgentDefinitionInput!){createAgentDefinition(input:$input){id}}`,
        { input: { name: `docker-person-${randomUUID().slice(0, 6)}`, role: "assistant", description: "running runs Docker E2E", instructions: "Answer briefly.", toolNames: [], skillNames: [] } })).createAgentDefinition.id;
      const created = (await gql(`mutation($input:CreateAgentRunInput!){createAgentRun(input:$input){success message runId}}`,
        { input: { agentDefinitionId: definitionId, workspaceRootPath: "/app/autobyteus-server-ts/workspace", llmModelIdentifier: "gemini-3.8-flash-low", llmConfig: null, autoExecuteTools: true, runtimeKind: "antigravity_cli" } })).createAgentRun;
      expect(created.success, created.message).toBe(true);
      const runId = created.runId as string;
      outcome.first = await talk(runId, "Hello before the restart.", "before");
      await until(async () => ((await record())?.runs as Json[] | undefined)?.some((run) => run.rootRunId === runId) === true, "recorded running", 15_000);
      const session = (await runFile(runId)).platformAgentRunId ?? null;

      for (const [label, end] of [["stop", ["stop", "-t", "60", container]], ["kill", ["kill", container]]] as const) {
        const seen = (await summaries()).length;
        await docker(...end);
        outcome[`${label}Record`] = await docker("run", "--rm", "--volumes-from", container, "--entrypoint", "cat", IMAGE, "/home/autobyteus/data/restart-resume/running-runs.json").then(JSON.parse).catch(() => null);
        await docker("start", container);
        await healthy();
        await until(async () => (await summaries()).length > seen, `${label}: the restore summary`, 180_000);
        outcome[`${label}Summary`] = (await summaries()).at(-1);
        await until(() => isActive(runId), `${label}: running again`, 60_000);
        outcome[`${label}Session`] = (await runFile(runId)).platformAgentRunId ?? null;
        outcome[`${label}Answer`] = await talk(runId, `Hello after the ${label}.`, `after the ${label}`);
        expect((outcome[`${label}Record`]?.runs as Json[] | undefined)?.some((run) => run.rootRunId === runId), `${label}: the record after the end`).toBe(true);
        expect(outcome[`${label}Summary`], `${label}: the restore`).toBe(`${SUMMARY} 1 brought back, 0 skipped, 0 failed`);
        expect(outcome[`${label}Session`], `${label}: its own runtime session`).toBe(session);
        expect(String(outcome[`${label}Answer`]).trim().length, `${label}: answered`).toBeGreaterThan(0);
      }
      outcome.runId = runId;
      outcome.session = session;
    } finally {
      detach();
      if (EVIDENCE_DIR) { await fsp.mkdir(EVIDENCE_DIR, { recursive: true }); await fsp.writeFile(path.join(EVIDENCE_DIR, "RUN-D-01.json"), JSON.stringify(outcome, null, 2)); }
    }
  }, 1_200_000);
});
