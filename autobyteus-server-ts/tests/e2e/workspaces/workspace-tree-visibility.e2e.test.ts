import "reflect-metadata";
import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import WebSocket from "ws";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { until } from "../helpers/agy-runtime-error-fixture.js";
import { sendE2eSendMessageCommand } from "../helpers/websocket-command-helpers.js";
import { callTool, segment, startCollaborationHarness, type CollaborationHarness, type Rec } from "../helpers/collaboration-root-harness.js";

// Hidden from the Workspaces tree (workspace-tree-vs-chooser, autobyteus-385), through the real Studio HTTP/WebSocket/GraphQL
// server, the Project/Task services, delegation and the AGY backend. Only the external AGY CLI is scripted
// (tests/fixtures/agy-failure-cli.mjs, `linked_skills`); no inference.
// - WTV-01 (AC-001, AC-006 server part): hiding leaves the folder registered and listed with `shownInWorkspacesTree: false`;
//   `workspaces.json` keeps its flat shape and entries; the mark is in `workspaces_hidden_from_tree.json`.
// - WTV-02 (AC-004 agent, AC-005): prepare in the hidden folder (the chat's path) shows it; the first message activates the
//   run; with the run active, hide and remove are refused with the removal guard's message; after Stop it stays shown.
// - WTV-03 (AC-004 team and org): creating a team run or an org run in the hidden folder shows it.
// - WTV-04 (AC-004 "Add workspace"): createWorkspace for the hidden folder shows it.
// - WTV-05 (AC-003): a delegation of a Project Task into a hidden Project folder leaves it hidden.
// - WTV-06 (AC-008 server part): restoring a stopped run in a hidden folder does not show the folder for good; the
//   workspace run history reports the run active there (what the tree's "shown while active" rule reads), then inactive.
// - WTV-07 (AC-002): removeWorkspace unregisters the folder and forgets the mark; files and run history stay on disk.
// Run: env -i PATH="$PATH" HOME="$(cd "$(mktemp -d)" && pwd -P)" TMPDIR="$TMPDIR" RUN_AGY_FAILURE_E2E=1 \
//   ANTIGRAVITY_CLI_COMMAND=$PWD/autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs \
//   pnpm -C autobyteus-server-ts exec vitest run tests/e2e/workspaces/workspace-tree-visibility.e2e.test.ts --no-watch
// WORKSPACE_TREE_VISIBILITY_E2E_EVIDENCE_DIR=<dir> writes the observed reads as JSON evidence.
const { home, priorHome } = await vi.hoisted(async () => {
  // A disposable HOME keeps the scripted actors' files out of the user's home.
  if (process.env["RUN_AGY_FAILURE_E2E"] !== "1") return { home: "", priorHome: process.env["HOME"] };
  const nodeFs = await import("node:fs");
  const nodeOs = await import("node:os");
  const nodePath = await import("node:path");
  const priorHome = process.env["HOME"];
  const home = nodeFs.realpathSync(nodeFs.mkdtempSync(nodePath.join(nodeOs.tmpdir(), "wtv-e2e-home-")));
  process.env["HOME"] = home;
  return { home, priorHome };
});
const cli = process.env.ANTIGRAVITY_CLI_COMMAND ?? "";
const enabled = process.env.RUN_AGY_FAILURE_E2E === "1" && spawnSync(cli, ["--version"], { stdio: "ignore" }).status === 0;
const suite = enabled ? describe : describe.skip;

const GUARD_MESSAGE = "Stop active agent or team runs in this workspace before removing it from Workspaces.";
const WORKSPACES = `query{workspaces{workspaceId workspaceRootPath shownInWorkspacesTree}}`;

suite("Hidden from the Workspaces tree (real HTTP/WS/GraphQL, delegation, scripted AGY actor)", () => {
  let h: CollaborationHarness;
  const ids: Rec = {};
  const names: Rec = {};
  const sockets: WebSocket[] = [];
  const evidence: Rec = {};
  let folder: string;
  let folderId: string;
  let projectFolder: string;
  let projectFolderId: string;
  let stoppedRoot: Awaited<ReturnType<CollaborationHarness["startRoot"]>>;

  const listed = async () => (await h.graphql(WORKSPACES)).workspaces as Rec[];
  const shownOf = async (workspaceId: string) => (await listed()).find((workspace) => workspace.workspaceId === workspaceId)?.shownInWorkspacesTree;
  const addWorkspace = async (rootPath: string) => (await h.graphql(
    `mutation($input:CreateWorkspaceInput!){createWorkspace(input:$input){workspaceId shownInWorkspacesTree}}`, { input: { rootPath } })).createWorkspace as Rec;
  const hide = async (workspaceId: string) => (await h.graphql(
    `mutation($input:HideWorkspaceFromTreeInput!){hideWorkspaceFromTree(input:$input){success message workspaceId}}`, { input: { workspaceId } })).hideWorkspaceFromTree as Rec;
  const remove = async (workspaceId: string) => (await h.graphql(
    `mutation($input:RemoveWorkspaceInput!){removeWorkspace(input:$input){success message workspaceId workspaceRootPath}}`, { input: { workspaceId } })).removeWorkspace as Rec;
  const hideOk = async (workspaceId: string) => {
    const result = await hide(workspaceId);
    expect(result.success, result.message).toBe(true);
    expect(await shownOf(workspaceId)).toBe(false);
  };
  const registry = async () => JSON.parse(await fs.readFile(path.join(h.dataDir, "workspaces.json"), "utf8")) as Record<string, string>;
  const hiddenFile = async () => JSON.parse(await fs.readFile(path.join(h.dataDir, "workspaces_hidden_from_tree.json"), "utf8")) as Rec;
  const metadataOf = async (runId: string): Promise<Rec> => {
    const walk = async (dir: string): Promise<string | null> => {
      for (const entry of await fs.readdir(dir, { withFileTypes: true }).catch(() => [])) {
        const full = path.join(dir, entry.name);
        if (!entry.isDirectory()) continue;
        if (entry.name === runId) return path.join(full, "run_metadata.json");
        const found = await walk(full);
        if (found) return found;
      }
      return null;
    };
    const file = await walk(path.join(h.dataDir, "memory"));
    if (!file) throw new Error(`No run folder for ${runId}`);
    return JSON.parse(await fs.readFile(file, "utf8")) as Rec;
  };
  const agentRunsIn = async (rootPath: string) => {
    const groups = (await h.graphql(`query{listWorkspaceRunHistory{workspaceRootPath agentDefinitions{runs{runId isActive statusSource}}}}`)).listWorkspaceRunHistory as Rec[];
    return (groups.find((group) => group.workspaceRootPath === rootPath)?.agentDefinitions as Rec[] ?? []).flatMap((group) => group.runs as Rec[]);
  };

  beforeAll(async () => {
    h = await startCollaborationHarness("workspace-tree-visibility-e2e");
    const suffix = randomUUID().slice(0, 6);
    for (const key of ["manager", "mate", "writer"]) names[key] = `WTV ${key} ${suffix}`;
    ids.manager = await h.agentDefinition(names.manager, { toolNames: ["create_task", "update_task"] });
    ids.mate = await h.agentDefinition(names.mate);
    ids.writer = await h.agentDefinition(names.writer);
    ids.team = await h.teamDefinition(`WTV Team ${suffix}`, [["manager", ids.manager], ["mate", ids.mate]], "manager");
    ids.org = await h.orgDefinition(`WTV Org ${suffix}`, [
      { memberName: "manager", ref: ids.manager, refType: "AGENT", refScope: "SHARED" },
      { memberName: "writer", ref: ids.writer, refType: "AGENT", refScope: "SHARED" }], []);
    folder = h.workspace;
    projectFolder = path.join(h.dataDir, "project-folder");
    await fs.mkdir(projectFolder);
    folderId = (await addWorkspace(folder)).workspaceId as string;
    projectFolderId = (await addWorkspace(projectFolder)).workspaceId as string;
  }, 180_000);

  afterAll(async () => {
    for (const socket of sockets) socket.terminate();
    const dir = process.env["WORKSPACE_TREE_VISIBILITY_E2E_EVIDENCE_DIR"];
    if (dir) {
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(path.join(dir, "workspace-tree-visibility.json"), `${JSON.stringify({ ids, ...evidence }, null, 2)}\n`);
    }
    await h?.close();
    if (priorHome === undefined) delete process.env["HOME"]; else process.env["HOME"] = priorHome;
    if (home) await fs.rm(home, { recursive: true, force: true });
  }, 180_000);

  it("WTV-01: hiding keeps the folder registered and listed, marked not shown; workspaces.json keeps its shape", async () => {
    const before = await registry();
    await hideOk(folderId);

    const all = await listed();
    expect(all.find((workspace) => workspace.workspaceId === folderId)).toEqual({ workspaceId: folderId, workspaceRootPath: folder, shownInWorkspacesTree: false });
    expect(all.find((workspace) => workspace.workspaceId === projectFolderId)?.shownInWorkspacesTree).toBe(true);
    expect(await registry()).toEqual(before);
    expect(Object.values(before).every((value) => typeof value === "string")).toBe(true);
    expect(await hiddenFile()).toEqual({ workspaceIds: [folderId] });
    evidence.wtv01 = { workspaces: all, registry: before, hidden: await hiddenFile() };
  }, 60_000);

  it("WTV-02: the chat's prepare-then-message in a hidden folder shows it; while active, hide and remove are refused", async () => {
    const prepared = (await h.graphql(`mutation($input:CreateAgentRunInput!){prepareAgentRun(input:$input){success message runId}}`,
      { input: { agentDefinitionId: ids.manager, ...h.config() } })).prepareAgentRun as Rec;
    expect(prepared.success, prepared.message).toBe(true);
    expect(await shownOf(folderId)).toBe(true);

    const runId = prepared.runId as string;
    const socket = new WebSocket(`ws://${h.url.host}/ws/agent/${runId}`);
    sockets.push(socket);
    const frames: Rec[] = [];
    socket.on("message", (raw: unknown) => frames.push(JSON.parse(String(raw))));
    await new Promise<void>((resolve, reject) => { socket.once("open", resolve); socket.once("error", reject); });
    await until(() => frames.some((frame) => frame.type === "CONNECTED"), "prepared run stream connected");
    sendE2eSendMessageCommand(socket, { agent_run_id: runId, content: "Reply OK." });
    await until(async () => Boolean(await h.promptOf(runId).catch(() => "")), `run ${runId} activated`, 60_000);

    // The capsule is written while the run is still initializing; the guard sees it once the runtime holds it.
    await until(async () => (await agentRunsIn(folder)).some((run) => run.runId === runId && run.statusSource === "ACTIVE_RUNTIME"),
      `run ${runId} held by the runtime`, 60_000);

    const refusedHide = await hide(folderId);
    const refusedRemove = await remove(folderId);
    expect(refusedHide).toEqual({ success: false, message: GUARD_MESSAGE, workspaceId: folderId });
    expect(refusedRemove).toMatchObject({ success: false, message: GUARD_MESSAGE });
    expect(await shownOf(folderId)).toBe(true);

    socket.close();
    await h.terminate("agent", runId);
    expect(await shownOf(folderId)).toBe(true);
    expect((await agentRunsIn(folder)).map((run) => run.runId)).toContain(runId);
    evidence.wtv02 = { runId, refusedHide, refusedRemove };
  }, 180_000);

  it("WTV-03: creating a team run or an org run in the hidden folder shows it", async () => {
    for (const kind of ["team", "org"] as const) {
      await hideOk(folderId);
      const root = await h.startRoot(kind, ids);
      expect(await shownOf(folderId), kind).toBe(true);
      root.close();
      await h.terminate(kind, root.rootId);
      expect(await shownOf(folderId), kind).toBe(true);
      evidence[`wtv03_${kind}`] = root.rootId;
    }
  }, 240_000);

  it("WTV-04: Add workspace with the hidden folder shows it", async () => {
    await hideOk(folderId);
    const added = await addWorkspace(folder);
    expect(added).toEqual({ workspaceId: folderId, shownInWorkspacesTree: true });
    expect(await shownOf(folderId)).toBe(true);
  }, 60_000);

  it("WTV-05: a delegation of a Project Task into a hidden Project folder leaves it hidden", async () => {
    const project = (await h.graphql(`mutation($input:CreateProjectInput!){createProject(input:$input){projectId}}`,
      { input: { name: `WTV Project ${randomUUID().slice(0, 6)}`, workspaces: [{ workspaceRootPath: projectFolder, description: "folder" }] } })).createProject as Rec;
    const taskId = (await h.graphql(`mutation($input:CreateProjectTaskInput!){createProjectTask(input:$input){taskId}}`,
      { input: { projectId: project.projectId, title: "Write the notes.", description: "Write the notes." } })).createProjectTask.taskId as string;
    await hideOk(projectFolderId);

    stoppedRoot = await h.startRoot("agent", ids);
    const delegated = await stoppedRoot.calls(stoppedRoot.rootId, "/", callTool("delegate_task", { recipient_address: `/${segment(names.writer)}`, task_id: taskId }));
    expect(delegated.delegated, JSON.stringify(delegated)).toBe(true);
    const copyId = delegated.target_agent_run_id as string;
    await until(async () => Boolean(await h.promptOf(copyId).catch(() => "")), `copy ${copyId} activated`, 60_000);

    // The copy works in the hidden Project folder (its run metadata), which re-registered it through ensureWorkspaceByRootPath.
    expect((await metadataOf(copyId)).workspaceRootPath).toBe(projectFolder);
    expect(await registry()).toHaveProperty(projectFolderId, projectFolder);
    expect(await shownOf(projectFolderId)).toBe(false);
    stoppedRoot.close();
    await h.terminate("agent", stoppedRoot.rootId);
    expect(await shownOf(projectFolderId)).toBe(false);
    evidence.wtv05 = { projectId: project.projectId, taskId, rootId: stoppedRoot.rootId, copyId, hidden: await hiddenFile() };
  }, 240_000);

  it("WTV-06: restoring a stopped run in a hidden folder does not show it for good; history reports the run active there, then not", async () => {
    await hideOk(folderId);
    const reopened = await h.reopenRoot(stoppedRoot);

    expect(await shownOf(folderId)).toBe(false);
    const whileActive = (await agentRunsIn(folder)).find((run) => run.runId === stoppedRoot.rootId);
    expect(whileActive?.isActive).toBe(true);

    reopened.close();
    await h.terminate("agent", stoppedRoot.rootId);
    expect((await agentRunsIn(folder)).find((run) => run.runId === stoppedRoot.rootId)?.isActive).toBe(false);
    expect(await shownOf(folderId)).toBe(false);
    evidence.wtv06 = { rootId: stoppedRoot.rootId, whileActive };
  }, 180_000);

  it("WTV-07: Remove unregisters the hidden folder and forgets its mark; files and run history stay on disk", async () => {
    await fs.writeFile(path.join(folder, "keep.txt"), "kept");
    const removed = await remove(folderId);

    expect(removed).toMatchObject({ success: true, workspaceId: folderId, workspaceRootPath: folder });
    expect((await listed()).some((workspace) => workspace.workspaceId === folderId)).toBe(false);
    expect(await registry()).not.toHaveProperty(folderId);
    expect((await hiddenFile()).workspaceIds).not.toContain(folderId);
    expect(await fs.readFile(path.join(folder, "keep.txt"), "utf8")).toBe("kept");
    expect((await agentRunsIn(folder)).map((run) => run.runId)).toContain(stoppedRoot.rootId);
    evidence.wtv07 = { removed, hidden: await hiddenFile() };
  }, 60_000);
});
