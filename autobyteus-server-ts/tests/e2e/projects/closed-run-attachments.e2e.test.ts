import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import WebSocket from "ws";
import { afterAll, describe, expect, it } from "vitest";
import { segment, type Rec } from "../helpers/collaboration-root-harness.js";
import { buildE2eClientCommandIds } from "../helpers/websocket-command-helpers.js";
import {
  PROJECT_TOOLS, createRoot, killBuiltStudios, managerOf, managerTab, restoreRoot, startBuiltStudio, terminateRoot, treeRunIds, until,
  type BuiltStudio, type Root,
} from "../helpers/built-studio-roots.js";

// autobyteus-469 AC-007 ("a file attached in an earlier conversation of a dismissed run opens") through the BUILT Studio server
// (`dist/app.js`), real HTTP/GraphQL/WebSocket, scripted MCP tools and a real server restart. Only the external AGY CLI is
// scripted (`tests/fixtures/agy-failure-cli.mjs`, `linked_skills`): `CALL_TOOL:{...}` makes the Manager call the real tool.
// For a standalone Agent root and an Agent Org root (CRA-1): the Manager delegates a Task to a worker, sends it a message with a
// reference file, and the user sends the worker a message with a context file. The Task is closed; once the worker has stopped
// and left the tree, the message's reference still opens through the top run's route, also after a server restart, from the
// stopped root and after its restore. The Task is then reopened and the Manager continues the worker by its run ID: the
// worker's context file opens again through the top run's member route.
// While the Task is closed, the context-file route's answer for the worker is recorded, never asserted: that route resolves its
// owner through the tree, no screen opens a closed run's conversation, and the route's rule for it is follow-up FU-006.
// The Team root is not covered: a context file of a Team root's delegated run is uploaded through a Team draft owner that this
// journey cannot address from an existing run.
// Prerequisite: `pnpm -C autobyteus-server-ts build` for the current worktree (a stale dist is not proof).
// Run: env -i PATH="$PATH" HOME="$(cd "$(mktemp -d)" && pwd -P)" TMPDIR="$TMPDIR" RUN_AGY_FAILURE_E2E=1 \
//   ANTIGRAVITY_CLI_COMMAND=$PWD/autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs \
//   pnpm -C autobyteus-server-ts exec vitest run tests/e2e/projects/closed-run-attachments.e2e.test.ts --no-watch
const cli = process.env.ANTIGRAVITY_CLI_COMMAND ?? "";
const enabled = process.env.RUN_AGY_FAILURE_E2E === "1" && spawnSync(cli, ["--version"], { stdio: "ignore" }).status === 0;
const suite = enabled ? describe : describe.skip;

type Kind = "agent" | "org";
const KINDS: Kind[] = ["agent", "org"];
/** The renderer's reference id of a root message's reference file (`agentOrgReferenceProjection.ts`). */
const referenceIdOf = (messageId: string, file: string) => createHash("sha256").update(`${messageId}\0${file}`).digest("hex");

suite("AC-007: a closed run's earlier attachments still open (built server, scripted AGY, real restart)", () => {
  let root = "";
  let workspace = "";
  let server: BuiltStudio | null = null;
  const start = async () => { server = await startBuiltStudio(root, { ANTIGRAVITY_CLI_COMMAND: cli, AGY_FAKE_CASE: "linked_skills" }); return server; };
  /** One root's journey state, kept across the restart. */
  const journeys = new Map<Kind, { r: Root; taskId: string; worker: string; workerAddress: string; refFile: string; refBytes: string;
    messageId: string; ctxName: string; ctxBytes: string }>();
  const observed: Rec = {};

  afterAll(async () => {
    await server?.stop().catch(() => undefined);
    killBuiltStudios();
    if (root) await fs.rm(root, { recursive: true, force: true });
  }, 60_000);

  const referenceUrl = (s: BuiltStudio, kind: Kind, rootId: string, messageId: string, file: string) =>
    `${s.url}/rest/${kind === "agent" ? "agent-collaborations" : "agent-org-runs"}/${encodeURIComponent(rootId)}/communication/messages/`
    + `${encodeURIComponent(messageId)}/references/${referenceIdOf(messageId, file)}/content`;
  const contextFileUrl = (s: BuiltStudio, kind: Kind, rootId: string, agentRunId: string, storedFilename: string) =>
    `${s.url}/rest/${kind === "agent" ? "agent-collaborations" : "agent-org-runs"}/${encodeURIComponent(rootId)}/agent-runs/`
    + `${encodeURIComponent(agentRunId)}/context-files/${encodeURIComponent(storedFilename)}`;
  const fetchText = async (url: string) => { const response = await fetch(url); return { status: response.status, body: await response.text() }; };

  /** The user sends the worker a message with one context file, as the composer does (upload, finalize, send). */
  const sendContextFile = async (s: BuiltStudio, kind: Kind, r: Root, worker: string, name: string, bytes: string) => {
    const draftOwner = kind === "agent" ? { kind: "agent_collaboration_member_draft", hostRunId: r.rootId, agentRunId: worker }
      : { kind: "org_member_draft", orgRunId: r.rootId, agentRunId: worker };
    const finalOwner = kind === "agent" ? { kind: "agent_collaboration_member_final", hostRunId: r.rootId, agentRunId: worker }
      : { kind: "org_member_final", orgRunId: r.rootId, agentRunId: worker };
    const form = new FormData();
    form.set("owner", JSON.stringify(draftOwner));
    form.set("file", new Blob([bytes], { type: "text/markdown" }), name);
    const uploaded = await fetch(`${s.url}/rest/context-files/upload`, { method: "POST", body: form });
    expect(uploaded.status, await uploaded.clone().text()).toBe(200);
    const draft = await uploaded.json() as Rec;
    const finalized = await fetch(`${s.url}/rest/context-files/finalize`, { method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ draftOwner, finalOwner, attachments: [draft] }) });
    expect(finalized.status, await finalized.clone().text()).toBe(200);
    const [attachment] = (await finalized.json() as { attachments: Rec[] }).attachments;
    const socket = new WebSocket(`${s.url.replace(/^http/, "ws")}/ws/${kind === "agent" ? "agent-collaboration" : "agent-org"}/${r.rootId}`);
    s.sockets.push(socket);
    const frames: Rec[] = [];
    socket.on("message", (raw) => frames.push(JSON.parse(String(raw))));
    await new Promise<void>((resolve, reject) => { socket.once("open", () => resolve()); socket.once("error", reject); });
    await until(() => frames.some((frame) => frame.type === "ROOT_EXECUTION_VIEW_SNAPSHOT"), `${kind}: view snapshot`);
    const content = `Here are my notes for you (${name}).`;
    socket.send(JSON.stringify({ type: "SEND_MESSAGE", payload: kind === "agent"
      ? { root_subject_kind: "agent", root_run_id: r.rootId, target_agent_run_id: worker, command_id: randomUUID(), content,
        context_file_paths: [attachment!.locator], image_urls: [], ...buildE2eClientCommandIds() }
      : { root_subject_kind: "agent_org", root_run_id: r.rootId, target_agent_run_id: worker, command_id: randomUUID(), message_id: randomUUID(),
        dedupe_key: randomUUID(), content, context_file_paths: [attachment!.locator], image_urls: [] } }));
    await until(() => { const error = frames.find((frame) => frame.type === "ERROR"); if (error) throw new Error(JSON.stringify(error)); return frames.length > 1; },
      `${kind}: the message to the worker is taken`);
    socket.close();
    return attachment!.storedFilename as string;
  };

  it("CRA-1 a reference of a message with the closed run opens through the top run (also after a restart); the run's context file opens again once its Task is reopened", async () => {
    root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), "closed-run-attachments-e2e-")));
    workspace = path.join(root, "workspace");
    for (const dir of ["home", "workspace", path.join("workspace", "refs")]) await fs.mkdir(path.join(root, dir));
    await fs.writeFile(path.join(root, ".env"), "APP_ENV=test\nAUTOBYTEUS_SERVER_HOST=http://127.0.0.1:8000\n");
    let s = await start();
    const tag = randomUUID().slice(0, 6);
    const names = { manager: `CRA Manager ${tag}`, worker: `CRA Writer ${tag}`, org: `CRA Org ${tag}` };
    const agent = async (name: string, toolNames: string[]) => (await s.gql(`mutation($input:CreateAgentDefinitionInput!){createAgentDefinition(input:$input){id}}`,
      { input: { name, role: "assistant", description: name, instructions: "Follow the request.", toolNames } })).createAgentDefinition.id as string;
    const manager = await agent(names.manager, PROJECT_TOOLS);
    const workerDef = await agent(names.worker, []);
    const org = (await s.gql(`mutation($input:CreateAgentOrgDefinitionInput!){createAgentOrgDefinition(input:$input){id}}`,
      { input: { name: names.org, description: names.org, instructions: "Deliver.", handoffs: [], members: [
        { memberName: "manager", ref: manager, refType: "AGENT", refScope: "SHARED" },
        { memberName: "worker", ref: workerDef, refType: "AGENT", refScope: "SHARED" }] } })).createAgentOrgDefinition.id as string;
    const projectId = (await s.gql(`mutation($input:CreateProjectInput!){createProject(input:$input){projectId}}`, { input: { name: `CRA ${tag}` } })).createProject.projectId as string;

    // Before the closure: the reference and the context file open (the baseline both reads are compared to).
    for (const kind of KINDS) {
      const r = await createRoot(s, kind, { manager, org }, workspace);
      const taskId = (await s.gql(`mutation($input:CreateProjectTaskInput!){createProjectTask(input:$input){taskId}}`,
        { input: { projectId, title: `Write the ${kind} notes.`, description: `Write the ${kind} notes.` } })).createProjectTask.taskId as string;
      const workerAddress = kind === "org" ? "/worker" : `/${segment(names.worker)}`;
      const m = await managerOf(s, r);
      const delegated = await m.call("delegate_task", { recipient_address: workerAddress, task_id: taskId });
      expect(delegated, JSON.stringify(delegated)).toMatchObject({ delegated: true });
      const worker = delegated.target_agent_run_id as string;
      await until(async () => (await treeRunIds(s, r)).includes(worker), `${kind}: worker in the tree`);
      const refFile = path.join(workspace, "refs", `ac007-${kind}-${tag}.md`);
      const refBytes = `AC-007 reference of the ${kind} root ${tag}\n`;
      await fs.writeFile(refFile, refBytes);
      const sent = await m.call("send_message_to", { target_agent_run_id: worker, content: "My notes are attached.", reference_files: [refFile] });
      expect(sent, JSON.stringify(sent)).toMatchObject({ accepted: true });
      m.close();
      const message = await until(async () => (await managerTab(s, r)).messages.find((entry) => entry.receiverAgentRunId === worker
        && (entry.referenceFiles as string[]).includes(refFile)), `${kind}: the message with the reference is in the Manager's Team tab`);
      const ctxBytes = `AC-007 context file of the ${kind} worker ${tag}\n`;
      const ctxName = await sendContextFile(s, kind, r, worker, `ac007-${kind}-notes.md`, ctxBytes);
      expect(await fetchText(referenceUrl(s, kind, r.rootId, message.messageId, refFile)), `${kind}: reference before the closure`).toEqual({ status: 200, body: refBytes });
      expect(await fetchText(contextFileUrl(s, kind, r.rootId, worker, ctxName)), `${kind}: context file before the closure`).toEqual({ status: 200, body: ctxBytes });
      journeys.set(kind, { r, taskId, worker, workerAddress, refFile, refBytes, messageId: message.messageId as string, ctxName, ctxBytes });
    }

    // The Task closes; once the worker has stopped it leaves the tree. AC-007 (1): the reference opens through the top run.
    for (const kind of KINDS) {
      const j = journeys.get(kind)!;
      const m = await managerOf(s, j.r);
      const closed = await m.call("update_task", { task_id: j.taskId, status: "DONE" });
      expect(closed.isError, JSON.stringify(closed)).toBe(false);
      m.close();
      await until(async () => !(await treeRunIds(s, j.r)).includes(j.worker), `${kind}: the worker left the tree`);
      expect(await fetchText(referenceUrl(s, kind, j.r.rootId, j.messageId, j.refFile)), `${kind}: reference after the closure`).toEqual({ status: 200, body: j.refBytes });
      // Recorded only (follow-up FU-006): the context-file route's answer while the Task is closed.
      observed[`${kind}ContextFileWhileClosed`] = (await fetchText(contextFileUrl(s, kind, j.r.rootId, j.worker, j.ctxName))).status;
    }

    // A real restart: the reference opens from the stopped root's stored log, and again after the root is restored.
    await s.stop();
    s = await start();
    for (const kind of KINDS) {
      const j = journeys.get(kind)!;
      expect(await fetchText(referenceUrl(s, kind, j.r.rootId, j.messageId, j.refFile)), `${kind}: reference after the restart (stopped root)`)
        .toEqual({ status: 200, body: j.refBytes });
      await restoreRoot(s, j.r);
      expect(await treeRunIds(s, j.r), `${kind}: the closed worker is not in the restored tree`).not.toContain(j.worker);
      expect(await fetchText(referenceUrl(s, kind, j.r.rootId, j.messageId, j.refFile)), `${kind}: reference after the restart (restored root)`)
        .toEqual({ status: 200, body: j.refBytes });
    }

    // AC-007 (2): the Task is reopened and the Manager continues the worker by its run ID; its context file opens again.
    for (const kind of KINDS) {
      const j = journeys.get(kind)!;
      const m = await managerOf(s, j.r);
      const reopened = await m.call("update_task", { task_id: j.taskId, status: "IN_PROGRESS" });
      expect(reopened.isError, JSON.stringify(reopened)).toBe(false);
      const continued = await m.call("send_message_to", { target_agent_run_id: j.worker, content: "Second round on the notes." });
      expect(continued, JSON.stringify(continued)).toMatchObject({ accepted: true, target_agent_run_id: j.worker });
      m.close();
      await until(async () => (await treeRunIds(s, j.r)).includes(j.worker), `${kind}: the worker is in the tree again`);
      expect(await fetchText(contextFileUrl(s, kind, j.r.rootId, j.worker, j.ctxName)), `${kind}: context file after the reopen`).toEqual({ status: 200, body: j.ctxBytes });
      expect(await fetchText(referenceUrl(s, kind, j.r.rootId, j.messageId, j.refFile)), `${kind}: reference after the reopen`).toEqual({ status: 200, body: j.refBytes });
      await terminateRoot(s, j.r);
    }
    console.log(`CRA-1 observed (not asserted): ${JSON.stringify(observed)}`);
    await s.stop();
    server = null;
  }, 600_000);
});
