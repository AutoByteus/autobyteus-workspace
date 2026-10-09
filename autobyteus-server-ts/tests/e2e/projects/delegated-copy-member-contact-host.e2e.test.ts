import "reflect-metadata";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import type { FastifyInstance } from "fastify";
import WebSocket from "ws";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { appConfigProvider } from "../../../src/config/app-config-provider.js";
import { startStudioE2eRuntimeServer } from "../helpers/studio-runtime-test-server.js";
import { buildE2eClientCommandIds, sendE2eSendMessageCommand } from "../helpers/websocket-command-helpers.js";
import { until } from "../helpers/agy-runtime-error-fixture.js";

// Members of a delegated copy contact the standalone Agent-run host that delegated the work
// (delegated-copy-member-contact-delegator SR-005/SR-006: REQ-001..REQ-004, REQ-006; AC-001..AC-003, AC-006, AC-009)
// through the real Studio HTTP/WebSocket server, GraphQL, the Agent-root stream, scoped MCP agent tools and the AGY backend.
// Only the external AGY CLI is scripted (tests/fixtures/agy-failure-cli.mjs, `linked_skills`): `CALL_TOOL:{...}` makes
// the agent call that actual agent tool and reply `CALLED:<tool result>`; anything else is answered `OK`. No inference.
// One Agent run (the host "Manager") delegates a Team copy (lead coordinator + reviewer) and an Agent copy (solo):
// - DCM-001: `@` candidates per focused agent: the host never sees itself; the Team-copy reviewer and the Agent copy see
//   the host plus exactly the host's own list; an Agent-root query without `focusedAgentRunId` is an error.
// - DCM-002: the user's `@Manager` post to the not-yet-started reviewer (its first input, through the Agent-root stream)
//   is accepted, stores the run-agent note with the explicit send_message_to sentence and no delegate_task sentence,
//   and adds nothing to the run.
// - DCM-003: following the note, the reviewer's send_message_to(<host address>) reaches the existing host run.
// - DCM-004: list_available_agents lists the host at its address for the reviewer and the Agent copy, not for the host;
//   a plain-words send_message_to to the listed address reaches the same host run.
// - DCM-005: delegate_task(<host address>) from a copy member is refused; no copy or collaborator is added.
// - DCM-006: the host's own `@Manager` and an ineligible mention from a copy member are still rejected.
// - DCM-007: after Stop, the stored run answers candidates per focused agent; the user's `@Manager` post to the reviewer
//   restores the root and the reviewer's message reaches the same host run (earlier conversation kept).
// `DELEGATED_COPY_CONTACT_E2E_EVIDENCE_DIR` keeps a JSON receipt.
// Run: env -u AUTOBYTEUS_AGENT_PACKAGE_ROOTS -u AUTOBYTEUS_SKILLS_PATHS -u AUTOBYTEUS_APPLICATION_PACKAGE_ROOTS \
//   RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=$PWD/autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs \
//   pnpm -C autobyteus-server-ts exec vitest run tests/e2e/projects/delegated-copy-member-contact-host.e2e.test.ts --no-watch
const { home, priorHome } = await vi.hoisted(async () => {
  // A disposable HOME keeps the scripted AGY actor's files out of the user's home.
  if (process.env["RUN_AGY_FAILURE_E2E"] !== "1") return { home: "", priorHome: process.env["HOME"] };
  const nodeFs = await import("node:fs");
  const nodeOs = await import("node:os");
  const nodePath = await import("node:path");
  const priorHome = process.env["HOME"];
  const home = nodeFs.realpathSync(nodeFs.mkdtempSync(nodePath.join(nodeOs.tmpdir(), "delegated-copy-contact-home-")));
  process.env["HOME"] = home;
  return { home, priorHome };
});
const cli = process.env.ANTIGRAVITY_CLI_COMMAND ?? "";
const enabled = process.env.RUN_AGY_FAILURE_E2E === "1"
  && spawnSync(cli, ["--version"], { stdio: "ignore" }).status === 0;
const suite = enabled ? describe : describe.skip;

type Frame = { type: string; payload: Record<string, any> };
type Listed = { name: string; kind: string; address: string };
const segment = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
const callTool = (name: string, args: object) => `CALL_TOOL:${JSON.stringify({ name, arguments: args })}`;
const objectsIn = (value: unknown): Record<string, any>[] => {
  if (Array.isArray(value)) return value.flatMap(objectsIn);
  if (!value || typeof value !== "object") return [];
  return [value as Record<string, any>, ...Object.values(value).flatMap(objectsIn)];
};
/** Task execution nodes (Agent or Team copies), identified by their recorded start. */
const taskNodes = (tree: unknown) => objectsIn(tree).flatMap((record) => {
  const startedAt = record.startedAt ?? record.started_at;
  const agentRunId = record.agentRunId ?? record.agent_run_id;
  const teamRunId = record.teamRunId ?? record.team_run_id;
  if (typeof startedAt !== "string" || !(agentRunId || teamRunId)) return [];
  return [{ agentRunId: teamRunId ? undefined : agentRunId as string, teamRunId: teamRunId as string | undefined,
    address: record.address as string,
    members: Array.isArray(record.members) ? (record.members as any[]).map((member) => ({
      address: member.address as string, agentRunId: (member.agentRunId ?? member.agent_run_id) as string })) : [] }];
});
const collaboratorsIn = (tree: unknown) => objectsIn(tree).flatMap((record) => Array.isArray(record.collaborators) ? record.collaborators : []);
/** The `CALLED:<result>` replies of the scripted actor, in conversation order. */
const calledResults = (conversation: unknown): string[] => (Array.isArray(conversation) ? conversation : []).flatMap((entry) => {
  const strings = objectsIn(entry).flatMap((record) => Object.values(record)).filter((value): value is string =>
    typeof value === "string" && value.includes("CALLED:"));
  return strings.length ? [strings[0]!.slice(strings[0]!.indexOf("CALLED:") + "CALLED:".length)] : [];
});
/** The structured result of one MCP tool call reported by the scripted actor. */
const toolResult = (called: string): Record<string, any> => {
  const raw = JSON.parse(called) as Record<string, any>;
  if (raw.structuredContent && typeof raw.structuredContent === "object") return { ...raw.structuredContent, isError: raw.isError === true };
  const text = raw.content?.find?.((part: any) => part.type === "text")?.text;
  try { return { ...JSON.parse(text), isError: raw.isError === true }; } catch { return { text: text ?? called, isError: raw.isError === true }; }
};

suite("Delegated copy members contact the Agent-run host (real HTTP/WS/GraphQL/scoped MCP, scripted AGY actor)", () => {
  let dataDir = "", workspace = "", app: FastifyInstance | undefined, url!: URL;
  const sockets: WebSocket[] = [];
  let hostRunId = "";
  let rootActive = false;
  const ids = { manager: "", lead: "", reviewer: "", solo: "", squad: "", outsider: "", outsiderOrg: "" };
  const names = { manager: "", lead: "", reviewer: "", solo: "", squad: "" };
  const savedEnv = new Map<string, string | undefined>();
  const evidence: Record<string, unknown> = {};

  const graphqlRaw = async (query: string, variables?: Record<string, unknown>) => {
    const response = await fetch(new URL("/graphql", url), { method: "POST",
      headers: { "content-type": "application/json" }, body: JSON.stringify({ query, variables }) });
    return { ok: response.ok, body: await response.json() as { data?: any; errors?: Array<{ message: string }> } };
  };
  const graphql = async <T = any>(query: string, variables?: Record<string, unknown>): Promise<T> => {
    const { ok, body } = await graphqlRaw(query, variables);
    if (!ok || !body.data || body.errors?.length) throw new Error(JSON.stringify(body.errors ?? body));
    return body.data;
  };
  const config = () => ({ workspaceRootPath: workspace, llmModelIdentifier: "gemini-3.8-flash-low",
    llmConfig: null, autoExecuteTools: true, runtimeKind: "antigravity_cli" });
  const agentDefinition = async (name: string, toolNames: string[]) => (await graphql(
    `mutation($input:CreateAgentDefinitionInput!){createAgentDefinition(input:$input){id}}`,
    { input: { name, role: "assistant", description: `${name} (delegated copy contact E2E)`, instructions: "Follow the user's request.", toolNames } },
  )).createAgentDefinition.id as string;
  const connect = async (route: string, id: string, ready: (frames: Frame[]) => boolean) => {
    const socket = new WebSocket(`ws://${url.host}/ws/${route}/${id}`);
    sockets.push(socket);
    const frames: Frame[] = [];
    socket.on("message", (raw: unknown) => frames.push(JSON.parse(String(raw))));
    await new Promise<void>((resolve, reject) => { socket.once("open", resolve); socket.once("error", reject); });
    await until(() => ready(frames), `${route} stream ready`);
    return { socket, frames };
  };
  const terminateHost = async () => {
    const result = (await graphql(`mutation($id:String!){terminateAgentRun(agentRunId:$id){success message}}`, { id: hostRunId })).terminateAgentRun;
    expect(result.success, result.message).toBe(true);
    rootActive = false;
  };
  const liveAgyCwds = (): string[] => spawnSync("pgrep", ["-f", "agy-failure-cli"], { encoding: "utf8" }).stdout.trim().split("\n")
    .filter(Boolean).map((pid) => (spawnSync("lsof", ["-a", "-d", "cwd", "-p", pid, "-Fn"], { encoding: "utf8" }).stdout
      .split("\n").find((line) => line.startsWith("n")) ?? "").slice(1));

  beforeAll(async () => {
    dataDir = await fs.mkdtemp(path.join(os.tmpdir(), "delegated-copy-contact-e2e-"));
    workspace = path.join(dataDir, "workspace");
    await fs.mkdir(workspace);
    await fs.writeFile(path.join(dataDir, ".env"), "AUTOBYTEUS_SERVER_HOST=http://localhost:8000\nAPP_ENV=test\n");
    savedEnv.set("AGY_FAKE_CASE", process.env["AGY_FAKE_CASE"]);
    process.env["AGY_FAKE_CASE"] = "linked_skills";
    appConfigProvider.config.setCustomAppDataDir(dataDir);
    const started = await startStudioE2eRuntimeServer();
    app = started.fastify; url = started.mainUrl;
    const suffix = randomUUID().slice(0, 6);
    names.manager = `DCM Manager ${suffix}`; names.lead = `DCM Lead ${suffix}`; names.reviewer = `DCM Reviewer ${suffix}`;
    names.solo = `DCM Solo ${suffix}`; names.squad = `DCM Squad ${suffix}`;
    // The host and both copy members that are asked to discover it select list_available_agents (it is opt-in).
    ids.manager = await agentDefinition(names.manager, ["list_available_agents"]);
    ids.lead = await agentDefinition(names.lead, []);
    ids.reviewer = await agentDefinition(names.reviewer, ["list_available_agents"]);
    ids.solo = await agentDefinition(names.solo, ["list_available_agents"]);
    ids.squad = (await graphql(`mutation($input:CreateAgentTeamDefinitionInput!){createAgentTeamDefinition(input:$input){id}}`,
      { input: { name: names.squad, description: "Delegated Team", instructions: "Follow requests.", coordinatorMemberName: "lead",
        nodes: [{ memberName: "lead", ref: ids.lead, refScope: "SHARED" }, { memberName: "reviewer", ref: ids.reviewer, refScope: "SHARED" }] } },
    )).createAgentTeamDefinition.id;
    // An Agent Org definition is never a mention candidate (ineligible mention, DCM-006).
    ids.outsider = await agentDefinition(`DCM Outsider ${suffix}`, []);
    ids.outsiderOrg = (await graphql(`mutation($input:CreateAgentOrgDefinitionInput!){createAgentOrgDefinition(input:$input){id}}`,
      { input: { name: `DCM Org ${suffix}`, description: "Org", instructions: "Follow requests.", handoffs: [],
        members: [{ memberName: "outsider", ref: ids.outsider, refType: "AGENT", refScope: "SHARED" }] } },
    )).createAgentOrgDefinition.id;
  }, 120_000);

  afterAll(async () => {
    const errors: string[] = [];
    for (const socket of sockets) socket.terminate();
    if (rootActive) await terminateHost().catch((error) => errors.push(String(error)));
    if (app) await app.close();
    const leftover = liveAgyCwds().filter((cwd) => dataDir && cwd.includes(path.basename(dataDir)));
    if (leftover.length) errors.push(`live AGY processes after close: ${leftover.join(", ")}`);
    if (dataDir) await fs.rm(dataDir, { recursive: true, force: true });
    for (const [key, value] of savedEnv) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
    if (home) {
      if (priorHome === undefined) delete process.env["HOME"]; else process.env["HOME"] = priorHome;
      await fs.rm(home, { recursive: true, force: true });
    }
    const dir = process.env["DELEGATED_COPY_CONTACT_E2E_EVIDENCE_DIR"];
    if (dir) {
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(path.join(dir, "delegated-copy-member-contact-host.json"), `${JSON.stringify({ ...evidence,
        cleanup: { dataRemoved: await fs.access(dataDir).then(() => false, () => true),
          homeRemoved: !home || await fs.access(home).then(() => false, () => true), serverClosed: !app?.server.listening,
          rootActive, leftoverProcesses: leftover, errors } }, null, 2)}\n`);
    }
    expect(errors, "owned cleanup").toEqual([]);
  }, 120_000);

  it("a Team-copy member and an Agent copy reach the existing host by @, list_available_agents and send_message_to; the host never sees itself", async () => {
    const created = (await graphql(`mutation($input:CreateAgentRunInput!){createAgentRun(input:$input){success message runId}}`,
      { input: { agentDefinitionId: ids.manager, ...config() } })).createAgentRun;
    expect(created.success, created.message).toBe(true);
    hostRunId = created.runId; rootActive = true;
    const input = await connect("agent", hostRunId, (frames) => frames.some((frame) => frame.type === "CONNECTED"));
    const view = await connect("agent-collaboration", hostRunId, (frames) => frames.some((frame) => frame.type === "ROOT_EXECUTION_VIEW_SNAPSHOT"));
    const liveTree = async () => (await graphql(`query($id:String!){agentRunCollaboration(runId:$id)}`, { id: hostRunId }))
      .agentRunCollaboration?.root_agent?.execution_tree ?? null;
    const hostConversation = async () => (await graphql(`query($id:String!){getRunProjection(runId:$id){conversation}}`,
      { id: hostRunId })).getRunProjection?.conversation;
    const memberConversation = async (address: string, agentRunId: string) => (await graphql(
      `query($h:String!,$a:String!,$r:String!){agentRunCollaborationMemberProjection(hostRunId:$h,memberAddress:$a,agentRunId:$r){conversation}}`,
      { h: hostRunId, a: address, r: agentRunId })).agentRunCollaborationMemberProjection?.conversation;
    const candidatesFor = async (focusedAgentRunId: string | null) => ((await graphql(
      `query($k:String!,$id:String!,$f:String){collaboratorMentionCandidates(rootSubjectKind:$k,rootRunId:$id,focusedAgentRunId:$f){availability candidates{kind definitionId}}}`,
      { k: "agent", id: hostRunId, f: focusedAgentRunId })).collaboratorMentionCandidates.candidates as any[]).map((candidate) => candidate.definitionId as string);
    /** Sends one scripted tool call to the host through its own stream and returns the tool result. */
    const hostCalls = async (content: string) => {
      const before = calledResults(await hostConversation()).length;
      sendE2eSendMessageCommand(input.socket, { agent_run_id: hostRunId, content });
      let results: string[] = [];
      await until(async () => { results = calledResults(await hostConversation()); return results.length > before; },
        `host tool result for ${content.slice(0, 100)}`, 60_000);
      return results[before]!;
    };
    /** Posts a user message to a copy member through the Agent-root stream (the task-child composer path); returns its ACK. */
    const postToChild = async (agentRunId: string, content: string, mentions?: Array<{ kind: "agent" | "agent_team"; definition_id: string }>) => {
      const commandId = randomUUID();
      view.socket.send(JSON.stringify({ type: "SEND_MESSAGE", payload: {
        root_subject_kind: "agent", root_run_id: hostRunId, target_agent_run_id: agentRunId, command_id: commandId,
        content, context_file_paths: [], image_urls: [], ...buildE2eClientCommandIds(), ...(mentions ? { mentions } : {}) } }));
      let ack: Frame | undefined;
      await until(() => Boolean(ack = view.frames.find((frame) => frame.type === "AGENT_COMMAND_ACK" && frame.payload.command_id === commandId)),
        `ACK for ${commandId}`, 60_000);
      return ack!.payload;
    };
    /** Posts a scripted tool call to a copy member and returns the tool result it reports. */
    const childCalls = async (address: string, agentRunId: string, content: string, mentions?: Array<{ kind: "agent" | "agent_team"; definition_id: string }>) => {
      const before = calledResults(await memberConversation(address, agentRunId)).length;
      const ack = await postToChild(agentRunId, content, mentions);
      expect(ack.state, JSON.stringify(ack)).toBe("accepted");
      let results: string[] = [];
      await until(async () => { results = calledResults(await memberConversation(address, agentRunId)); return results.length > before; },
        `copy member tool result for ${content.slice(0, 100)}`, 60_000);
      return results[before]!;
    };

    // Setup: the host delegates a Team copy (lead coordinator + reviewer) and an Agent copy.
    const squadAddress = `/${segment(names.squad)}`;
    const soloAddress = `/${segment(names.solo)}`;
    const teamDelegated = toolResult(await hostCalls(callTool("delegate_task", { recipient_address: squadAddress, description: "Reply OK." })));
    expect(teamDelegated.isError, JSON.stringify(teamDelegated)).toBe(false);
    const soloDelegated = toolResult(await hostCalls(callTool("delegate_task", { recipient_address: soloAddress, description: "Reply OK." })));
    expect(soloDelegated.isError, JSON.stringify(soloDelegated)).toBe(false);
    let nodes: ReturnType<typeof taskNodes> = [];
    await until(async () => { nodes = taskNodes(await liveTree()); return nodes.length === 2; }, "Team and Agent copies started", 60_000);
    const teamCopy = nodes.find((node) => node.teamRunId)!;
    const soloCopy = nodes.find((node) => node.agentRunId)!;
    const reviewer = teamCopy.members.find((member) => member.address.endsWith("/reviewer"))!;
    expect(reviewer?.agentRunId, JSON.stringify(nodes)).toBeTruthy();
    expect(soloCopy?.agentRunId, JSON.stringify(nodes)).toBeTruthy();
    const tree = await liveTree();
    const hostAddress = (objectsIn(tree).find((record) => (record.agentRunId ?? record.agent_run_id) === hostRunId && typeof record.address === "string")
      ?.address ?? `/${segment(names.manager)}`) as string;
    expect(hostAddress).toBe(`/${segment(names.manager)}`);
    const nodeKeys = () => nodes.map((node) => node.teamRunId ?? node.agentRunId).sort();
    const expectNothingAdded = async (label: string) => {
      const current = await liveTree();
      expect(taskNodes(current).map((node) => node.teamRunId ?? node.agentRunId).sort(), `${label}: no new copy`).toEqual(nodeKeys());
      expect(collaboratorsIn(current), `${label}: no collaborator`).toEqual([]);
    };
    Object.assign(evidence, { hostRunId, hostAddress, teamCopy, soloCopy });

    // DCM-001 (REQ-001, AC-001): candidates per focused agent.
    const hostView = await candidatesFor(hostRunId);
    const reviewerView = await candidatesFor(reviewer.agentRunId);
    const soloView = await candidatesFor(soloCopy.agentRunId!);
    expect(hostView).not.toContain(ids.manager);
    expect(hostView).toEqual(expect.arrayContaining([ids.lead, ids.reviewer, ids.solo, ids.squad]));
    expect(reviewerView).toContain(ids.manager);
    expect(soloView).toContain(ids.manager);
    // Other candidates are unchanged: a non-host list is exactly the host plus the host's own list.
    expect([...reviewerView].sort()).toEqual([...hostView, ids.manager].sort());
    expect([...soloView].sort()).toEqual([...hostView, ids.manager].sort());
    expect(reviewerView).not.toContain(ids.outsiderOrg);
    const missingFocused = await graphqlRaw(`query($k:String!,$id:String!){collaboratorMentionCandidates(rootSubjectKind:$k,rootRunId:$id){candidates{definitionId}}}`,
      { k: "agent", id: hostRunId });
    expect(JSON.stringify(missingFocused.body.errors ?? [])).toContain("focusedAgentRunId is required for an Agent run root.");
    evidence["DCM-001"] = { hostView, reviewerView, soloView, missingFocusedErrors: missingFocused.body.errors };

    // DCM-002 (REQ-002, REQ-004, AC-002): the user's `@Manager` post to the not-yet-started reviewer.
    // DCM-003 (REQ-006, AC-003): following the note, the reviewer messages the host at its address.
    const marker = `CREATE_TICKET_${randomUUID().slice(0, 8)}`;
    const hostCalledBefore = JSON.stringify(await hostConversation());
    expect(hostCalledBefore).not.toContain(marker);
    const reviewerSend = toolResult(await childCalls(reviewer.address, reviewer.agentRunId,
      callTool("send_message_to", { recipient_address: hostAddress, content: `Please create the follow-up ticket ${marker}.` }),
      [{ kind: "agent", definition_id: ids.manager }]));
    expect(reviewerSend, JSON.stringify(reviewerSend)).toMatchObject({ isError: false, accepted: true, code: "DELIVERED", target_agent_run_id: hostRunId });
    const reviewerText = JSON.stringify(await memberConversation(reviewer.address, reviewer.agentRunId));
    const runAgentEntry = `- ${names.manager} (Agent) at ${hostAddress}, the run's own agent`;
    const runAgentGuidance = `Use send_message_to with recipient_address ${hostAddress} to message ${names.manager}; delegate_task cannot target it.`;
    expect(reviewerText).toContain("[Mentioned collaborators]");
    expect(reviewerText).toContain(runAgentEntry);
    expect(reviewerText).toContain(runAgentGuidance);
    expect(reviewerText).not.toContain("Delegate the work with delegate_task");
    expect(reviewerText).not.toContain("already in this run");
    let hostText = "";
    await until(async () => { hostText = JSON.stringify(await hostConversation()); return hostText.includes(marker); },
      "the host's existing run received the reviewer's message", 60_000);
    // The receiving run is the existing host (same run ID, earlier conversation kept), and nothing was added.
    expect(hostText).toContain("CALLED:");
    await expectNothingAdded("@host and send_message_to");
    // The Team tab's record: one reviewer → host message carrying the request.
    const communication = (await graphql(`query($id:String!){agentRunCollaboration(runId:$id)}`, { id: hostRunId }))
      .agentRunCollaboration?.root_agent?.communication_messages?.messages as any[] | undefined ?? [];
    const toHost = communication.filter((message) => message.senderAgentRunId === reviewer.agentRunId
      && message.receiverAgentRunId === hostRunId && String(message.content).includes(marker));
    expect(toHost, JSON.stringify(communication).slice(0, 1_000)).toHaveLength(1);
    evidence["DCM-002"] = { runAgentEntry, runAgentGuidance, reviewerConversation: reviewerText.slice(0, 4_000) };
    evidence["DCM-003"] = { reviewerSend, marker, teamTabRecord: toHost[0] };

    // DCM-004 (REQ-003, AC-006): list_available_agents per sender; a plain-words contact reaches the same host run.
    const listedBy = (result: Record<string, any>) => (result.agents as Listed[] | undefined) ?? [];
    const reviewerList = toolResult(await childCalls(reviewer.address, reviewer.agentRunId, callTool("list_available_agents", {})));
    const soloList = toolResult(await childCalls(soloCopy.address, soloCopy.agentRunId!, callTool("list_available_agents", {})));
    const hostList = toolResult(await hostCalls(callTool("list_available_agents", {})));
    for (const [label, result] of [["reviewer", reviewerList], ["solo", soloList], ["host", hostList]] as const) {
      expect(result.isError, `${label}: ${JSON.stringify(result)}`).toBe(false);
      expect(Array.isArray(result.agents), `${label}: ${JSON.stringify(result)}`).toBe(true);
    }
    const hostEntry = { name: names.manager, kind: "agent", address: hostAddress };
    expect(listedBy(reviewerList)).toContainEqual(expect.objectContaining(hostEntry));
    expect(listedBy(soloList)).toContainEqual(expect.objectContaining(hostEntry));
    expect(listedBy(hostList).map((entry) => entry.address)).not.toContain(hostAddress);
    expect(listedBy(hostList).map((entry) => entry.name)).not.toContain(names.manager);
    // A non-host list is the host entry plus exactly the host's own list (same addresses).
    const addresses = (result: Record<string, any>) => listedBy(result).map((entry) => entry.address).sort();
    expect(addresses(reviewerList)).toEqual([...addresses(hostList), hostAddress].sort());
    expect(addresses(soloList)).toEqual([...addresses(hostList), hostAddress].sort());
    const plainMarker = `PLAIN_WORDS_${randomUUID().slice(0, 8)}`;
    const soloSend = toolResult(await childCalls(soloCopy.address, soloCopy.agentRunId!,
      callTool("send_message_to", { recipient_address: hostAddress, content: `Status for the manager: ${plainMarker}.` })));
    expect(soloSend, JSON.stringify(soloSend)).toMatchObject({ isError: false, accepted: true, code: "DELIVERED", target_agent_run_id: hostRunId });
    await until(async () => JSON.stringify(await hostConversation()).includes(plainMarker), "the host received the Agent copy's message", 60_000);
    await expectNothingAdded("list_available_agents and plain-words send");
    evidence["DCM-004"] = { reviewerList, soloList, hostList, soloSend };

    // DCM-005 (AC-009): delegate_task to the host is refused; no copy or collaborator is added.
    const refusedRaw = await childCalls(reviewer.address, reviewer.agentRunId,
      callTool("delegate_task", { recipient_address: hostAddress, description: "Do the follow-up yourself." }));
    const refused = toolResult(refusedRaw);
    // Nothing started: `delegated: false` with the reason, and no copy IDs.
    expect(refused.delegated, refusedRaw).toBe(false);
    expect(refused.message, refusedRaw).toEqual(expect.any(String));
    for (const field of ["target_agent_run_id", "target_team_run_id", "target_team_coordinator_agent_run_id"]) expect(refused, refusedRaw).not.toHaveProperty(field);
    expect(refusedRaw).not.toMatch(/ad_hoc_task_[0-9a-f-]{36}/);
    await expectNothingAdded("delegate_task to the host");
    evidence["DCM-005"] = { refused: refusedRaw.slice(0, 2_000) };

    // DCM-006 (preserved): the host's own `@Manager` and an ineligible mention from a copy member are rejected.
    const hostAckFrom = input.frames.length;
    sendE2eSendMessageCommand(input.socket, { agent_run_id: hostRunId, content: "Reply OK.", mentions: [{ kind: "agent", definition_id: ids.manager }] });
    let hostAck: Frame | undefined;
    await until(() => Boolean(hostAck = input.frames.slice(hostAckFrom).find((frame) => frame.type === "AGENT_COMMAND_ACK")), "host self-mention ACK", 60_000);
    expect(hostAck!.payload.accepted, JSON.stringify(hostAck!.payload)).toBe(false);
    expect(JSON.stringify(hostAck!.payload)).toContain(`${names.manager} is this run's own definition.`);
    const ineligible = await postToChild(reviewer.agentRunId, "Reply OK.", [{ kind: "agent_team", definition_id: ids.outsiderOrg }]);
    expect(ineligible.state, JSON.stringify(ineligible)).toBe("rejected");
    await expectNothingAdded("rejected mentions");
    evidence["DCM-006"] = { hostSelfMentionAck: hostAck!.payload, ineligibleAck: ineligible };

    // DCM-007 (REQ-001, REQ-002, REQ-006 after Stop): a stopped run answers per focused agent from its stored tree;
    // the user's `@Manager` post to the reviewer restores the root and still reaches the same host run.
    input.socket.close();
    view.socket.close();
    await terminateHost();
    const storedHostView = await candidatesFor(hostRunId);
    const storedReviewerView = await candidatesFor(reviewer.agentRunId);
    expect(storedHostView).not.toContain(ids.manager);
    expect(storedReviewerView).toContain(ids.manager);
    expect([...storedReviewerView].sort()).toEqual([...storedHostView, ids.manager].sort());
    const restoredView = await connect("agent-collaboration", hostRunId, (frames) => frames.some((frame) => frame.type === "ROOT_EXECUTION_VIEW_SNAPSHOT"));
    rootActive = true;
    view.socket = restoredView.socket; view.frames = restoredView.frames;
    const restoredMarker = `AFTER_RESTORE_${randomUUID().slice(0, 8)}`;
    const restoredSend = toolResult(await childCalls(reviewer.address, reviewer.agentRunId,
      callTool("send_message_to", { recipient_address: hostAddress, content: `Follow-up after restore ${restoredMarker}.` }),
      [{ kind: "agent", definition_id: ids.manager }]));
    expect(restoredSend, JSON.stringify(restoredSend)).toMatchObject({ isError: false, accepted: true, code: "DELIVERED", target_agent_run_id: hostRunId });
    await until(async () => JSON.stringify(await hostConversation()).includes(restoredMarker), "the restored host received the reviewer's message", 60_000);
    // The host's earlier conversation is kept: the same run, not a new one.
    expect(JSON.stringify(await hostConversation())).toContain(marker);
    await expectNothingAdded("after restore");
    evidence["DCM-007"] = { storedHostView, storedReviewerView, restoredSend };

    view.socket.close();
    await terminateHost();
  }, 300_000);
});
