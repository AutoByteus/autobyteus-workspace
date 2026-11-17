import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import WebSocket from "ws";
import { afterAll, describe, expect, it } from "vitest";
import type { Rec } from "../helpers/collaboration-root-harness.js";
import { createRoot, killBuiltStudios, startBuiltStudio, terminateRoot, until, type BuiltStudio } from "../helpers/built-studio-roots.js";

// autobyteus-500 FU-036 (REQ-009, AC-006, D-3): a command a client sends on a run stream before the stream is ready is
// refused with SESSION_NOT_READY, never dropped. `run-stream-not-ready.integration.test.ts` proves the refusal with
// handlers that are held connecting; this suite sends on the real handlers of the BUILT Studio server (`dist/app.js`),
// where the session may already be ready when the command arrives. Only the AGY CLI is scripted. No user data.
// - RSE-1: on `/ws/agent-org/:orgRunId` and on `/ws/agent-collaboration/:runId`, a command sent the moment the socket
//   opens gets exactly one answer: `SESSION_NOT_READY`, or its own AGENT_COMMAND_ACK (the session took it). Repeated on
//   fresh sockets; the counts of each answer are logged.
// Prerequisite: `pnpm -C autobyteus-server-ts build` for the current worktree.
// Run: env -i PATH="$PATH" HOME="$(mktemp -d)" TMPDIR="$TMPDIR" RUN_AGY_FAILURE_E2E=1 \
//   ANTIGRAVITY_CLI_COMMAND=$PWD/autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs \
//   pnpm -C autobyteus-server-ts exec vitest run tests/e2e/agent/run-stream-early-command.e2e.test.ts --no-watch
const cli = process.env.ANTIGRAVITY_CLI_COMMAND ?? "";
const enabled = process.env.RUN_AGY_FAILURE_E2E === "1" && spawnSync(cli, ["--version"], { stdio: "ignore" }).status === 0;
const suite = enabled ? describe : describe.skip;
const ROUNDS = 8;

suite("A command sent on open to the org and collaboration streams is answered, never dropped (built server, FU-036)", () => {
  let root = "";
  let server: BuiltStudio | null = null;

  afterAll(async () => {
    await server?.stop().catch(() => undefined);
    killBuiltStudios();
    if (root) await fs.rm(root, { recursive: true, force: true });
  }, 60_000);

  /** Opens a socket, sends `command` in the open handler, and returns the answer that names it. */
  const sendOnOpen = async (s: BuiltStudio, route: string, command: (commandId: string) => Rec) => {
    const commandId = randomUUID();
    const socket = new WebSocket(`${s.url.replace(/^http/, "ws")}${route}`);
    s.sockets.push(socket);
    const frames: Rec[] = [];
    socket.on("message", (raw: unknown) => { try { frames.push(JSON.parse(String(raw)) as Rec); } catch { /* not a frame */ } });
    socket.once("open", () => socket.send(JSON.stringify(command(commandId))));
    const answers = () => frames.filter((f) => (f.type === "ERROR" && f.payload?.code === "SESSION_NOT_READY")
      || (f.type === "AGENT_COMMAND_ACK" && f.payload?.command_id === commandId));
    await until(() => answers().length > 0 || null, `an answer to the command sent on open to ${route}`, 20_000)
      .catch((error) => { throw new Error(`${error}; frames: ${JSON.stringify(frames.map((f) => f.type))}`); });
    // Settle, then the command has exactly one answer.
    await new Promise((resolve) => setTimeout(resolve, 500));
    socket.close();
    const found = answers();
    expect(found, JSON.stringify(found)).toHaveLength(1);
    return found[0]!.type === "ERROR" ? "SESSION_NOT_READY" : `ACK:${found[0]!.payload.state}:${found[0]!.payload.code ?? ""}`;
  };

  it("RSE-1 org and agent-collaboration streams: every command sent on open is refused SESSION_NOT_READY or acknowledged", async () => {
    root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), "run-stream-early-e2e-")));
    const workspace = path.join(root, "workspace");
    for (const dir of ["home", "workspace"]) await fs.mkdir(path.join(root, dir));
    await fs.writeFile(path.join(root, ".env"), "APP_ENV=test\nAUTOBYTEUS_SERVER_HOST=http://127.0.0.1:8000\n");
    server = await startBuiltStudio(root, { ANTIGRAVITY_CLI_COMMAND: cli, AGY_FAKE_CASE: "linked_skills" });
    const s = server;
    const tag = randomUUID().slice(0, 6);
    const manager = (await s.gql(`mutation($input:CreateAgentDefinitionInput!){createAgentDefinition(input:$input){id}}`,
      { input: { name: `RSE Manager ${tag}`, role: "assistant", description: "m", instructions: "Follow the request.", toolNames: [] } })).createAgentDefinition.id as string;
    const org = (await s.gql(`mutation($input:CreateAgentOrgDefinitionInput!){createAgentOrgDefinition(input:$input){id}}`,
      { input: { name: `RSE Org ${tag}`, description: "o", instructions: "Plan.", handoffs: [],
        members: [{ memberName: "manager", ref: manager, refType: "AGENT", refScope: "SHARED" }] } })).createAgentOrgDefinition.id as string;
    const orgRoot = await createRoot(s, "org", { manager, org }, workspace);
    const agentRoot = await createRoot(s, "agent", { manager }, workspace);

    const outcomes: Record<string, string[]> = { org: [], collaboration: [] };
    for (let round = 0; round < ROUNDS; round += 1) {
      outcomes.org!.push(await sendOnOpen(s, `/ws/agent-org/${orgRoot.rootId}`, (commandId) => ({ type: "INTERRUPT_GENERATION",
        payload: { root_subject_kind: "agent_org", root_run_id: orgRoot.rootId, target_agent_run_id: orgRoot.managerRunId, command_id: commandId } })));
      // The collaboration view takes commands for its peer rows; a run that is not one is answered RUN_NOT_FOUND once ready.
      outcomes.collaboration!.push(await sendOnOpen(s, `/ws/agent-collaboration/${agentRoot.rootId}`, (commandId) => ({ type: "INTERRUPT_GENERATION",
        payload: { root_subject_kind: "agent", root_run_id: agentRoot.rootId, target_agent_run_id: `not-a-peer-${tag}`, command_id: commandId } })));
    }
    console.log(`RSE-1 answers to a command sent on open: ${JSON.stringify(outcomes)}`);
    for (const [stream, list] of Object.entries(outcomes)) {
      expect(list, stream).toHaveLength(ROUNDS);
      for (const outcome of list) expect(outcome, stream).toMatch(/^(SESSION_NOT_READY|ACK:(accepted|rejected|failed):)/);
    }
    for (const r of [agentRoot, orgRoot]) await terminateRoot(s, r).catch(() => undefined);
    await s.stop();
    server = null;
  }, 300_000);
});
