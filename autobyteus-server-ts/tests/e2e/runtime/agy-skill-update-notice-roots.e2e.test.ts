import "reflect-metadata";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import type { FastifyInstance } from "fastify";
import WebSocket from "ws";
import { create } from "tar";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { appConfigProvider } from "../../../src/config/app-config-provider.js";
import { startStudioE2eRuntimeServer } from "../helpers/studio-runtime-test-server.js";
import { sendE2eSendMessageCommand } from "../helpers/websocket-command-helpers.js";
import { until } from "../helpers/agy-runtime-error-fixture.js";
import { flattenE2eConfiguredAgentExecutions } from "../helpers/team-run-metadata-helpers.js";

// Skill update notices across run roots at the real server/wire boundary (Studio HTTP/GraphQL/WebSocket, scoped MCP
// agent tools, run supervisor, idle shutdown, skill catalog and GitHub skill sources). Only the AGY CLI is scripted
// (tests/fixtures/agy-failure-cli.mjs, case linked_skills): `CALL_TOOL:{...}` calls a real agent tool;
// `ECHO_INPUT` replies `ECHO:<json of the exact provider input of that turn>`, so a reply shows what the agent got.
// GitHub HTTP is controlled (SUN-E2E-003). No model calls.
// - SUN-E2E-001 (AC-007, REQ-002/011): a Team member that uses the skill, a Team member that does not, an Org member
//   and a delegated copy that use it. After the skill changes, each one's next input carries one notice in the same
//   turn, except the member that does not use the skill.
// - SUN-E2E-002 (AC-003, REQ-006, QR-003): a delegated copy shut down after idle (grace 60 s) is not restored by a
//   skill change. The Manager's later message restores it, and that one turn carries the notice.
// - SUN-E2E-003 (AC-005b, REQ-009): a GitHub skill-source Update publishes a new generation folder. The next input
//   says "updated" with the new SKILL.md path; a later edit in the new folder gives another notice.
// Run (about 3 minutes):
//   env -u AUTOBYTEUS_AGENT_PACKAGE_ROOTS -u AUTOBYTEUS_SKILLS_PATHS -u AUTOBYTEUS_APPLICATION_PACKAGE_ROOTS \
//   RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=$PWD/autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs \
//   pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/agy-skill-update-notice-roots.e2e.test.ts --no-watch
// SKILL_NOTICE_ROOTS_E2E_EVIDENCE_DIR keeps a JSON receipt.
const cli = process.env.ANTIGRAVITY_CLI_COMMAND ?? "";
const enabled = process.env.RUN_AGY_FAILURE_E2E === "1" && spawnSync(cli, ["--version"], { stdio: "ignore" }).status === 0;
const suite = enabled ? describe : describe.skip;

type Frame = { type: string; payload: Record<string, any>; at: number };
const HEADER = "[Platform notice — skill updated]";
const GRACE_KEY = "AUTOBYTEUS_TASK_EXECUTION_IDLE_SHUTDOWN_GRACE_MS";
const GRACE_MS = 60_000;
const GITHUB_URL = "https://github.com/apar-sun-e2e/skills";
const segment = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
const callTool = (name: string, args: object) => `CALL_TOOL:${JSON.stringify({ name, arguments: args })}`;
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const skillMd = (name: string, codeword: string) => `---\nname: ${name}\ndescription: Holds the ${name} codeword.\n---\n\nThe current codeword is ${codeword}.\n`;
const occurrences = (text: string, needle: string) => text.split(needle).length - 1;

/** Every string after `marker` in a conversation projection, one per conversation entry, in order. */
const markerTexts = (conversation: unknown, marker: string): string[] => (Array.isArray(conversation) ? conversation : []).flatMap((entry) => {
  const strings: string[] = [];
  const visit = (value: unknown) => {
    if (typeof value === "string") { if (value.includes(marker)) strings.push(value); return; }
    if (Array.isArray(value)) { value.forEach(visit); return; }
    if (value && typeof value === "object") Object.values(value).forEach(visit);
  };
  visit(entry);
  return strings.length ? [strings[0]!.slice(strings[0]!.indexOf(marker) + marker.length)] : [];
});
/** The exact provider inputs the scripted agent echoed (`ECHO:<json>`), in order. */
const echoes = (conversation: unknown): string[] => markerTexts(conversation, "ECHO:").map((raw) => {
  const json = raw.slice(0, raw.lastIndexOf("\"") + 1);
  return JSON.parse(json) as string;
});
const objectsIn = (value: unknown): Record<string, any>[] => {
  const found: Record<string, any>[] = [];
  const visit = (node: unknown) => {
    if (Array.isArray(node)) { node.forEach(visit); return; }
    if (!node || typeof node !== "object") return;
    found.push(node as Record<string, any>);
    Object.values(node).forEach(visit);
  };
  visit(value);
  return found;
};
/** Task execution nodes (delegated copies) of a root tree. */
const taskNodes = (tree: unknown) => objectsIn(tree).flatMap((record) => {
  const startedAt = record.startedAt ?? record.started_at;
  const agentRunId = record.agentRunId ?? record.agent_run_id;
  return typeof startedAt === "string" && agentRunId && !(record.teamRunId ?? record.team_run_id)
    ? [{ agentRunId: String(agentRunId), address: String(record.address) }] : [];
});

suite("Skill update notices across run roots (real HTTP/WS/scoped MCP, idle shutdown, GitHub sources; scripted AGY)", () => {
  let dataDir = "", workspace = "", argvLog = "", upstream = "";
  let app: FastifyInstance | undefined;
  let url!: URL;
  const sockets: WebSocket[] = [];
  const active: Array<{ kind: "agent" | "team" | "org"; id: string }> = [];
  const savedEnv = new Map<string, string | undefined>();
  const evidence: Record<string, unknown> = {};
  const ids = { manager: "", user: "", plain: "", team: "", org: "", gh: "" };
  const names = { user: "", plain: "" };
  let githubRevision = "a".repeat(40);
  const githubRequests: string[] = [];

  const graphql = async <T = any>(query: string, variables?: Record<string, unknown>): Promise<T> => {
    const response = await fetch(new URL("/graphql", url), { method: "POST",
      headers: { "content-type": "application/json" }, body: JSON.stringify({ query, variables }) });
    const body = await response.json() as { data?: T; errors?: unknown[] };
    if (!response.ok || !body.data || (body.errors && body.errors.length)) throw new Error(JSON.stringify(body.errors ?? body));
    return body.data;
  };
  const config = () => ({ workspaceRootPath: workspace, llmModelIdentifier: "gemini-3.8-flash-low",
    llmConfig: null, autoExecuteTools: true, runtimeKind: "antigravity_cli" });
  const agentDefinition = async (name: string, toolNames: string[], skillNames: string[]) => (await graphql(
    `mutation($input:CreateAgentDefinitionInput!){createAgentDefinition(input:$input){id}}`,
    { input: { name, role: "assistant", description: `${name} (skill notice roots E2E)`, instructions: "Follow the user's request.", toolNames, skillNames } },
  )).createAgentDefinition.id as string;
  const connect = async (route: string, id: string, ready: (frames: Frame[]) => boolean) => {
    const socket = new WebSocket(`ws://${url.host}/ws/${route}/${id}`);
    sockets.push(socket);
    const frames: Frame[] = [];
    socket.on("message", (raw: unknown) => { const parsed = JSON.parse(String(raw)); frames.push({ type: parsed.type, payload: parsed.payload ?? {}, at: Date.now() }); });
    await new Promise<void>((resolve, reject) => { socket.once("open", resolve); socket.once("error", reject); });
    await until(() => ready(frames), `${route} stream ready`);
    return { socket, frames };
  };
  const launches = async () => (await fs.readFile(argvLog, "utf8").catch(() => "")).split("\n").filter(Boolean).length;
  const writeSkill = async (name: string, codeword: string) => {
    await fs.mkdir(path.join(dataDir, "skills", name), { recursive: true });
    await fs.writeFile(path.join(dataDir, "skills", name, "SKILL.md"), skillMd(name, codeword));
  };

  beforeAll(async () => {
    dataDir = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), "skill-notice-roots-e2e-")));
    workspace = path.join(dataDir, "workspace");
    argvLog = path.join(dataDir, "agy-argv.jsonl");
    upstream = path.join(dataDir, "github-upstream", "wrapper");
    await fs.mkdir(workspace, { recursive: true });
    await writeSkill("roots-probe", "ROOTS-V1");
    await fs.writeFile(path.join(dataDir, ".env"), `AUTOBYTEUS_SERVER_HOST=http://localhost:8000\nAPP_ENV=test\n${GRACE_KEY}=${GRACE_MS}\n`);
    for (const key of ["AGY_FAKE_CASE", "AGY_FAKE_ARGV_LOG", "AUTOBYTEUS_AGENT_PACKAGE_ROOTS", "AUTOBYTEUS_SKILLS_PATHS", "AUTOBYTEUS_APPLICATION_PACKAGE_ROOTS"]) {
      savedEnv.set(key, process.env[key]);
      delete process.env[key];
    }
    process.env["AGY_FAKE_CASE"] = "linked_skills";
    process.env["AGY_FAKE_ARGV_LOG"] = argvLog;
    // Only GitHub's API and archive host are controlled; this suite's own HTTP is real.
    const realFetch = globalThis.fetch;
    vi.stubGlobal("fetch", async (input: string | URL | Request, init?: RequestInit) => {
      const target = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      if (target.startsWith("https://api.github.com/") || target.startsWith("https://codeload.github.com/")) {
        githubRequests.push(target);
        if (target === "https://api.github.com/repos/apar-sun-e2e/skills") {
          return Response.json({ owner: { login: "apar-sun-e2e" }, name: "skills", private: false, default_branch: "main", html_url: GITHUB_URL });
        }
        if (target.endsWith("/branches/main")) return Response.json({ commit: { sha: githubRevision } });
        if (target.startsWith("https://codeload.github.com/apar-sun-e2e/skills/tar.gz/")) {
          const archive = path.join(dataDir, `github-${githubRevision.slice(0, 6)}.tar.gz`);
          await create({ gzip: true, file: archive, cwd: path.dirname(upstream), portable: true }, ["wrapper"]);
          return new Response(await fs.readFile(archive));
        }
        throw new Error(`Unexpected GitHub request: ${target}`);
      }
      return realFetch(input as never, init);
    });
    appConfigProvider.config.setCustomAppDataDir(dataDir);
    const started = await startStudioE2eRuntimeServer();
    app = started.fastify; url = started.mainUrl;
    const settings = (await graphql(`query{getServerSettings{key value}}`)).getServerSettings as Array<{ key: string; value: string }>;
    expect(settings.find((entry) => entry.key === GRACE_KEY)?.value).toBe(String(GRACE_MS));
    const suffix = randomUUID().slice(0, 6);
    names.user = `SUN User ${suffix}`; names.plain = `SUN Plain ${suffix}`;
    ids.manager = await agentDefinition(`SUN Manager ${suffix}`, ["delegate_task", "send_message_to"], []);
    ids.user = await agentDefinition(names.user, [], ["roots-probe"]);
    ids.plain = await agentDefinition(names.plain, [], []);
    ids.team = (await graphql(`mutation($input:CreateAgentTeamDefinitionInput!){createAgentTeamDefinition(input:$input){id}}`,
      { input: { name: `SUN Team ${suffix}`, description: "Team root", instructions: "Follow requests.", coordinatorMemberName: "user",
        nodes: [{ memberName: "user", ref: ids.user, refScope: "SHARED" }, { memberName: "plain", ref: ids.plain, refScope: "SHARED" }] } },
    )).createAgentTeamDefinition.id;
    ids.org = (await graphql(`mutation($input:CreateAgentOrgDefinitionInput!){createAgentOrgDefinition(input:$input){id}}`,
      { input: { name: `SUN Org ${suffix}`, description: "Org root", instructions: "Follow requests.",
        members: [{ memberName: "user", ref: ids.user, refType: "AGENT", refScope: "SHARED" }], handoffs: [] } },
    )).createAgentOrgDefinition.id;
  }, 120_000);

  afterAll(async () => {
    const errors: string[] = [];
    for (const socket of sockets) socket.terminate();
    for (const run of [...active].reverse()) {
      const mutation = run.kind === "agent" ? `mutation($id:String!){terminateAgentRun(agentRunId:$id){success}}`
        : run.kind === "team" ? `mutation($id:String!){terminateAgentTeamRun(teamRunId:$id){success}}`
          : `mutation($id:String!){terminateAgentOrgRun(agentOrgRunId:$id){success}}`;
      await graphql(mutation, { id: run.id }).catch((error) => errors.push(String(error)));
    }
    if (app) await app.close();
    vi.unstubAllGlobals();
    for (const [key, value] of savedEnv) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
    if (dataDir) await fs.rm(dataDir, { recursive: true, force: true });
    const dir = process.env["SKILL_NOTICE_ROOTS_E2E_EVIDENCE_DIR"];
    if (dir) {
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(path.join(dir, "skill-update-notice-roots.json"), `${JSON.stringify({ ...evidence, githubRequests,
        cleanup: { dataRemoved: await fs.access(dataDir).then(() => false, () => true), serverClosed: !app?.server.listening, errors } }, null, 2)}\n`);
    }
    expect(errors, "owned cleanup").toEqual([]);
  }, 120_000);

  /** A standalone Manager run (AGY) with its input and collaboration channels. */
  const startManager = async () => {
    const created = (await graphql(`mutation($input:CreateAgentRunInput!){createAgentRun(input:$input){success message runId}}`,
      { input: { agentDefinitionId: ids.manager, ...config() } })).createAgentRun;
    expect(created.success, created.message).toBe(true);
    const runId = created.runId as string;
    active.push({ kind: "agent", id: runId });
    const input = await connect("agent", runId, (frames) => frames.some((f) => f.type === "CONNECTED"));
    const view = await connect("agent-collaboration", runId, (frames) => frames.some((f) => f.type === "ROOT_EXECUTION_VIEW_SNAPSHOT"));
    const conversation = async () => (await graphql(`query($id:String!){getRunProjection(runId:$id){conversation}}`, { id: runId })).getRunProjection?.conversation;
    const call = async (content: string) => {
      const before = markerTexts(await conversation(), "CALLED:").length;
      sendE2eSendMessageCommand(input.socket, { agent_run_id: runId, content });
      let results: string[] = [];
      await until(async () => { results = markerTexts(await conversation(), "CALLED:"); return results.length > before; }, `Manager result for ${content.slice(0, 80)}`, 60_000);
      return results[before]!;
    };
    const tree = async () => (await graphql(`query($id:String!){agentRunCollaboration(runId:$id)}`, { id: runId })).agentRunCollaboration?.root_agent?.execution_tree ?? null;
    const copyConversation = async (address: string, agentRunId: string) => (await graphql(
      `query($h:String!,$a:String!,$r:String!){agentRunCollaborationMemberProjection(hostRunId:$h,memberAddress:$a,agentRunId:$r){conversation}}`,
      { h: runId, a: address, r: agentRunId })).agentRunCollaborationMemberProjection?.conversation;
    /** Delegates `description` to the user agent and returns the new copy once it echoed its first input. */
    const delegateCopy = async (description: string) => {
      const known = new Set(taskNodes(await tree()).map((node) => node.agentRunId));
      await call(callTool("delegate_task", { recipient_address: `/${segment(names.user)}`, description }));
      let copy: { agentRunId: string; address: string } | undefined;
      await until(async () => {
        copy = taskNodes(await tree()).find((node) => !known.has(node.agentRunId));
        return !!copy && echoes(await copyConversation(copy.address, copy.agentRunId)).length >= 1;
      }, "copy echoed its first input", 60_000);
      return copy!;
    };
    /** Messages a copy through the Manager's real send_message_to and returns the copy's next echo. */
    const messageCopy = async (copy: { agentRunId: string; address: string }, content: string) => {
      const before = echoes(await copyConversation(copy.address, copy.agentRunId)).length;
      await call(callTool("send_message_to", { target_agent_run_id: copy.agentRunId, content }));
      let all: string[] = [];
      await until(async () => { all = echoes(await copyConversation(copy.address, copy.agentRunId)); return all.length > before; }, "copy echoed the message", 90_000);
      return all[before]!;
    };
    return { runId, view, conversation, call, tree, copyConversation, delegateCopy, messageCopy };
  };

  it("SUN-E2E-001 (AC-007, REQ-002, REQ-011): a Team member, an Org member and a delegated copy that use the skill each get one notice with their next input; a member that does not use it gets none", async () => {
    const record: Record<string, unknown> = {};
    // Team root: member `user` (uses roots-probe) and member `plain` (no skills).
    const team = (await graphql(`mutation($input:CreateAgentTeamRunInput!){createAgentTeamRun(input:$input){success message teamRunId}}`,
      { input: { teamDefinitionId: ids.team, teamConfigs: [{ teamAddress: "/", ...config() }], memberConfigs: [
        { memberAddress: "/user", agentDefinitionId: ids.user, ...config() },
        { memberAddress: "/plain", agentDefinitionId: ids.plain, ...config() }] } })).createAgentTeamRun;
    expect(team.success, team.message).toBe(true);
    active.push({ kind: "team", id: team.teamRunId });
    const teamView = await connect("agent-team", team.teamRunId, (frames) => frames.some((f) => f.type === "TEAM_EXECUTION_VIEW_SNAPSHOT"));
    const teamTree = (await graphql(`query($id:String!){getTeamRunResumeConfig(teamRunId:$id){executionTree}}`, { id: team.teamRunId })).getTeamRunResumeConfig.executionTree;
    const member = (address: string) => flattenE2eConfiguredAgentExecutions(teamTree).find((entry: any) => entry.memberAddress === address)!.agentRunId as string;
    const teamMembers = { user: member("/user"), plain: member("/plain") };
    const teamEcho = async (agentRunId: string, content: string) => {
      const conversation = async () => (await graphql(`query($id:String!,$a:String!){getTeamMemberRunProjection(teamRunId:$id,agentRunId:$a){conversation}}`,
        { id: team.teamRunId, a: agentRunId })).getTeamMemberRunProjection?.conversation;
      const before = echoes(await conversation()).length;
      sendE2eSendMessageCommand(teamView.socket, { agent_run_id: agentRunId, content });
      let all: string[] = [];
      await until(async () => { all = echoes(await conversation()); return all.length > before; }, `team member ${agentRunId} echo`, 60_000);
      return all[before]!;
    };
    // Org root with member `user`.
    const org = (await graphql(`mutation($input:CreateAgentOrgRunInput!){createAgentOrgRun(input:$input){success message agentOrgRunId}}`,
      { input: { agentOrgDefinitionId: ids.org, rootConfiguration: config(), agentOverrides: [], teamOverrides: [] } })).createAgentOrgRun;
    expect(org.success, org.message).toBe(true);
    active.push({ kind: "org", id: org.agentOrgRunId });
    const orgView = await connect("agent-org", org.agentOrgRunId, (frames) => frames.some((f) => f.type === "ROOT_EXECUTION_VIEW_SNAPSHOT"));
    const orgTree = (await graphql(`query($id:String!){getAgentOrgRunConfig(orgRunId:$id){executionTree}}`, { id: org.agentOrgRunId })).getAgentOrgRunConfig.executionTree;
    const orgMember = orgTree.rootOrg.members.find((entry: any) => entry.address === "/user").agentRunId as string;
    const orgEcho = async (content: string) => {
      const conversation = async () => (await graphql(`query($id:String!,$a:String!,$m:String!){getAgentOrgMemberRunProjection(orgRunId:$id,memberAddress:$m,agentRunId:$a){conversation}}`,
        { id: org.agentOrgRunId, a: orgMember, m: "/user" })).getAgentOrgMemberRunProjection?.conversation;
      const before = echoes(await conversation()).length;
      orgView.socket.send(JSON.stringify({ type: "SEND_MESSAGE", payload: { root_subject_kind: "agent_org", root_run_id: org.agentOrgRunId,
        target_agent_run_id: orgMember, command_id: randomUUID(), message_id: randomUUID(), dedupe_key: randomUUID(), content, context_file_paths: [], image_urls: [] } }));
      let all: string[] = [];
      await until(async () => { all = echoes(await conversation()); return all.length > before; }, "org member echo", 60_000);
      return all[before]!;
    };
    // Standalone Manager with a delegated copy of the user agent.
    const manager = await startManager();
    const copy = await manager.delegateCopy("ECHO_INPUT first task");

    // Every participant is live and has seen the first skill version.
    const first = {
      teamUser: await teamEcho(teamMembers.user, "ECHO_INPUT team user first"),
      teamPlain: await teamEcho(teamMembers.plain, "ECHO_INPUT team plain first"),
      org: await orgEcho("ECHO_INPUT org first"),
      copy: echoes(await manager.copyConversation(copy.address, copy.agentRunId))[0]!,
    };
    for (const [who, text] of Object.entries(first)) expect(text, `${who} first input has no notice`).not.toContain(HEADER);

    // The skill changes while everyone is idle; nothing is sent until each one's next input.
    const launchesBefore = await launches();
    await writeSkill("roots-probe", "ROOTS-V2");
    await wait(3_000);
    expect(await launches(), "no run started by the change").toBe(launchesBefore);

    const next = {
      teamUser: await teamEcho(teamMembers.user, "ECHO_INPUT team user second"),
      teamPlain: await teamEcho(teamMembers.plain, "ECHO_INPUT team plain second"),
      org: await orgEcho("ECHO_INPUT org second"),
      copy: await manager.messageCopy(copy, "ECHO_INPUT copy second"),
    };
    const skillPath = path.join(dataDir, "skills", "roots-probe", "SKILL.md");
    for (const who of ["teamUser", "org", "copy"] as const) {
      const text = next[who];
      expect(occurrences(text, HEADER), `${who}: exactly one notice in the same turn`).toBe(1);
      expect(text.indexOf(HEADER), `${who}: notice first`).toBeLessThan(text.indexOf("ECHO_INPUT"));
      expect(text, `${who}: names the skill`).toContain("roots-probe");
      expect(text, `${who}: gives the current SKILL.md path`).toContain(skillPath);
      expect(text, `${who}: the message follows unchanged`).toMatch(/ECHO_INPUT (team user|org|copy) second/);
    }
    expect(next.teamPlain, "member without the skill gets no notice").not.toContain(HEADER);
    // Each notice was delivered once: the following input is clean.
    expect(await teamEcho(teamMembers.user, "ECHO_INPUT team user third")).not.toContain(HEADER);
    record.next = next;
    evidence.sun001 = record;
  }, 240_000);

  it("SUN-E2E-002 (AC-003, REQ-006, QR-003): a delegated copy shut down after idle is not restored by a skill change; the Manager's message restores it with one combined notice", async () => {
    const manager = await startManager();
    const copy = await manager.delegateCopy("ECHO_INPUT shutdown first");
    const idleSince = Date.now();
    // Idle shutdown: the copy goes offline one grace period after its turn.
    const offline = () => objectsIn(manager.view.frames.map((frame) => frame.payload)).some((record) =>
      record.agent_run_id === copy.agentRunId && record.message?.type === "AGENT_STATUS" && record.message?.payload?.status === "offline");
    await until(() => offline(), "copy shut down after idle", GRACE_MS + 45_000);
    const offlineAfterMs = Date.now() - idleSince;
    const launchesBefore = await launches();
    await writeSkill("roots-probe", `ROOTS-${randomUUID().slice(0, 4)}`);
    await wait(4_000);
    expect(await launches(), "the change does not restore the copy").toBe(launchesBefore);

    const echoed = await manager.messageCopy(copy, "ECHO_INPUT after restore");
    expect(await launches(), "the Manager's message restored the copy").toBe(launchesBefore + 1);
    expect(occurrences(echoed, HEADER), "one notice in the restored copy's first turn").toBe(1);
    expect(echoed.indexOf(HEADER)).toBeLessThan(echoed.indexOf("ECHO_INPUT after restore"));
    expect(echoed).toContain("roots-probe");
    evidence.sun002 = { offlineAfterMs, echoed };
  }, 240_000);

  it("SUN-E2E-003 (AC-005b, REQ-009): a GitHub skill-source Update publishes a new generation; the run is told the skill was updated, with the new path, and the new folder is watched", async () => {
    const writeUpstream = async (codeword: string) => {
      await fs.mkdir(upstream, { recursive: true });
      await fs.writeFile(path.join(upstream, "SKILL.md"), skillMd("gh-probe", codeword));
    };
    await writeUpstream("GH-V1");
    githubRevision = "a".repeat(40);
    const imported = (await graphql(`mutation($u:String!){importGitHubSkillSource(repositoryUrl:$u){sources{sourceId sourceKind path github{installedRevision status}} warnings}}`,
      { u: GITHUB_URL })).importGitHubSkillSource;
    const source = imported.sources.find((entry: any) => entry.sourceKind === "GITHUB_REPOSITORY");
    expect(source?.github?.installedRevision).toBe(githubRevision);
    const skillRoot = async () => ((await graphql(`{ skills { name rootPath } }`)).skills as Array<{ name: string; rootPath: string }>)
      .find((skill) => skill.name === "gh-probe")?.rootPath ?? null;
    const firstRoot = await skillRoot();
    expect(firstRoot).toBeTruthy();
    ids.gh = await agentDefinition(`SUN GitHub User ${randomUUID().slice(0, 6)}`, [], ["gh-probe"]);
    const created = (await graphql(`mutation($input:CreateAgentRunInput!){createAgentRun(input:$input){success message runId}}`,
      { input: { agentDefinitionId: ids.gh, ...config() } })).createAgentRun;
    expect(created.success, created.message).toBe(true);
    active.push({ kind: "agent", id: created.runId });
    const input = await connect("agent", created.runId, (frames) => frames.some((f) => f.type === "CONNECTED"));
    const conversation = async () => (await graphql(`query($id:String!){getRunProjection(runId:$id){conversation}}`, { id: created.runId })).getRunProjection?.conversation;
    const echo = async (content: string) => {
      const before = echoes(await conversation()).length;
      sendE2eSendMessageCommand(input.socket, { agent_run_id: created.runId, content });
      let all: string[] = [];
      await until(async () => { all = echoes(await conversation()); return all.length > before; }, `echo ${content}`, 60_000);
      return all[before]!;
    };
    expect(await echo("ECHO_INPUT gh first")).not.toContain(HEADER);

    // Upstream moves on; the user clicks Update: a new generation folder replaces the old one.
    await writeUpstream("GH-V2");
    githubRevision = "b".repeat(40);
    await graphql(`mutation($ids:[String!]){checkGitHubSkillSourceUpdates(sourceIds:$ids){sources{sourceId}}}`, { ids: [source.sourceId] });
    const updated = (await graphql(`mutation($id:String!){updateGitHubSkillSource(sourceId:$id){sources{sourceId github{installedRevision status}}}}`,
      { id: source.sourceId })).updateGitHubSkillSource;
    expect(updated.sources.find((entry: any) => entry.sourceId === source.sourceId)?.github?.installedRevision).toBe(githubRevision);
    const secondRoot = await skillRoot();
    expect(secondRoot, "the update published a new generation folder").not.toBe(firstRoot);
    await wait(3_000);
    const afterUpdate = await echo("ECHO_INPUT gh after update");
    expect(occurrences(afterUpdate, HEADER)).toBe(1);
    expect(afterUpdate, "reported as updated with the new path").toContain(path.join(secondRoot!, "SKILL.md"));
    expect(afterUpdate).not.toMatch(/no longer available/i);

    // The new generation folder is watched: a local edit there produces another notice.
    await fs.writeFile(path.join(secondRoot!, "SKILL.md"), skillMd("gh-probe", "GH-V3"));
    await wait(3_000);
    const afterEdit = await echo("ECHO_INPUT gh after local edit");
    expect(occurrences(afterEdit, HEADER)).toBe(1);
    expect(afterEdit).toContain(path.join(secondRoot!, "SKILL.md"));
    evidence.sun003 = { firstRoot, secondRoot, afterUpdate, afterEdit };
  }, 180_000);
});
