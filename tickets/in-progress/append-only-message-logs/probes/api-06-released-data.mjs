#!/usr/bin/env node
// API-06 data package (append-only-message-logs): drives a RELEASED AutoByteus server (an isolated instance of the installed
// v1.5.6-beta.4 app on a test-owned data root) through its public GraphQL/WebSocket API with the scripted AGY CLI
// (`AGY_FAKE_CASE=linked_skills`: `CALL_TOOL:{…}` makes the agent call the real tool; no inference), so the released runtime
// writes every file of the runs, its JSON message logs included. Never run against the user's app or data.
// Usage: node api-06-released-data.mjs <backendUrl> <workspaceDir> <outputIdsJson>
// Creates: a hub (standalone run) with an agent task agent and a task agent team; a team run whose lead messages its teammate
// and a task agent; an org run whose director messages its analyst and a task agent; an empty team run; a second team run (later
// made unreadable). Every message carries a reference file under <workspaceDir>/refs. All runs are terminated at the end.
import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

const [backend, workspace, output] = process.argv.slice(2);
if (!backend || !workspace || !output) throw new Error("usage: api-06-released-data.mjs <backendUrl> <workspaceDir> <outputIdsJson>");
const MODEL = "gemini-3.8-flash-low";
const config = { workspaceRootPath: workspace, llmModelIdentifier: MODEL, llmConfig: null, autoExecuteTools: true, runtimeKind: "antigravity_cli" };
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const until = async (check, label, timeout = 90_000) => {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) { if (await check()) return; await sleep(150); }
  throw new Error(`Timed out: ${label}`);
};
const gql = async (query, variables = {}) => {
  const response = await fetch(`${backend}/graphql`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query, variables }) });
  const body = await response.json();
  if (body.errors?.length) throw new Error(`${query.slice(0, 80)}: ${JSON.stringify(body.errors)}`);
  return body.data;
};
const objectsIn = (value) => Array.isArray(value) ? value.flatMap(objectsIn) : value && typeof value === "object" ? [value, ...Object.values(value).flatMap(objectsIn)] : [];
const callTool = (name, args) => `CALL_TOOL:${JSON.stringify({ name, arguments: args })}`;
const calledResults = (conversation) => (Array.isArray(conversation) ? conversation : []).flatMap((entry) => {
  const strings = objectsIn(entry).flatMap((record) => Object.values(record)).filter((value) => typeof value === "string" && value.includes("CALLED:"));
  if (!strings.length) return [];
  const raw = JSON.parse(strings[0].slice(strings[0].indexOf("CALLED:") + 7));
  if (raw.structuredContent && typeof raw.structuredContent === "object") return [{ ...raw.structuredContent, isError: raw.isError === true }];
  const text = raw.content?.find?.((part) => part.type === "text")?.text;
  try { return [{ ...JSON.parse(text), isError: raw.isError === true }]; } catch { return [{ text, isError: raw.isError === true }]; }
});
const reference = async (name) => {
  const file = path.join(workspace, "refs", `${name}.md`);
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, `reference ${name}\n`);
  return file;
};

const driver = async (kind, rootId) => {
  const route = kind === "agent" ? "agent" : kind === "team" ? "agent-team" : "agent-org";
  const readyType = kind === "agent" ? "CONNECTED" : kind === "team" ? "TEAM_EXECUTION_VIEW_SNAPSHOT" : "ROOT_EXECUTION_VIEW_SNAPSHOT";
  const socket = new WebSocket(`${backend.replace("http", "ws")}/ws/${route}/${rootId}`);
  const frames = [];
  socket.addEventListener("message", (event) => frames.push(JSON.parse(String(event.data))));
  await new Promise((resolve, reject) => { socket.addEventListener("open", resolve, { once: true }); socket.addEventListener("error", reject, { once: true }); });
  await until(() => frames.some((frame) => frame.type === readyType), `${route}/${rootId} ready`);
  const conversation = async (agentRunId, address) => {
    if (kind === "agent") return (await gql(`query($id:String!){getRunProjection(runId:$id){conversation}}`, { id: agentRunId })).getRunProjection?.conversation;
    if (kind === "team") return (await gql(`query($id:String!,$a:String!){getTeamMemberRunProjection(teamRunId:$id,agentRunId:$a){conversation}}`, { id: rootId, a: agentRunId })).getTeamMemberRunProjection?.conversation;
    return (await gql(`query($id:String!,$a:String!,$m:String!){getAgentOrgMemberRunProjection(orgRunId:$id,memberAddress:$m,agentRunId:$a){conversation}}`, { id: rootId, a: agentRunId, m: address })).getAgentOrgMemberRunProjection?.conversation;
  };
  const call = async (agentRunId, address, content) => {
    const before = calledResults(await conversation(agentRunId, address)).length;
    const messageId = `probe-${randomUUID()}`;
    socket.send(JSON.stringify({ type: "SEND_MESSAGE", payload: kind === "org"
      ? { root_subject_kind: "agent_org", root_run_id: rootId, target_agent_run_id: agentRunId, command_id: randomUUID(), message_id: randomUUID(), dedupe_key: randomUUID(), content, context_file_paths: [], image_urls: [] }
      : { message_id: messageId, dedupe_key: `agent_run_input:probe:${messageId}`, context_file_paths: [], image_urls: [], agent_run_id: agentRunId, content } }));
    let results = [];
    await until(async () => (results = calledResults(await conversation(agentRunId, address))).length > before, `${kind} ${address}: ${content.slice(0, 80)}`);
    const result = results[before];
    if (result.isError || result.accepted === false || result.delegated === false) throw new Error(`${kind} ${address} tool call failed: ${JSON.stringify(result)}`);
    return result;
  };
  return { call, close: () => socket.close() };
};

const definition = async (name) => (await gql(`mutation($input:CreateAgentDefinitionInput!){createAgentDefinition(input:$input){id}}`,
  { input: { name, role: "assistant", description: `${name} (API-06 data package)`, instructions: "Follow the request.", toolNames: [] } })).createAgentDefinition.id;
const ids = { host: await definition("AOML Host"), helper: await definition("AOML Helper"), lead: await definition("AOML Lead"), mate: await definition("AOML Mate") };
ids.pair = (await gql(`mutation($input:CreateAgentTeamDefinitionInput!){createAgentTeamDefinition(input:$input){id}}`,
  { input: { name: "AOML Pair", description: "API-06 team", instructions: "Follow requests.", coordinatorMemberName: "lead",
    nodes: [{ memberName: "lead", ref: ids.lead, refScope: "SHARED" }, { memberName: "mate", ref: ids.mate, refScope: "SHARED" }] } })).createAgentTeamDefinition.id;
ids.company = (await gql(`mutation($input:CreateAgentOrgDefinitionInput!){createAgentOrgDefinition(input:$input){id}}`,
  { input: { name: "AOML Company", description: "API-06 org", instructions: "Follow requests.", handoffs: [], members: [
    { memberName: "director", ref: ids.lead, refType: "AGENT", refScope: "SHARED" }, { memberName: "analyst", ref: ids.mate, refType: "AGENT", refScope: "SHARED" }] } })).createAgentOrgDefinition.id;

const out = { definitions: ids };
// Hub (standalone family): an agent task agent and a task agent team, each messaged with a reference file.
out.hub = (await gql(`mutation($input:CreateAgentRunInput!){createAgentRun(input:$input){success message runId}}`, { input: { agentDefinitionId: ids.host, ...config } })).createAgentRun.runId;
const hub = await driver("agent", out.hub);
out.hubHelper = (await hub.call(out.hub, "/", callTool("delegate_task", { recipient_address: "/aoml_helper", description: "Reply OK." }))).target_agent_run_id;
await hub.call(out.hub, "/", callTool("send_message_to", { target_agent_run_id: out.hubHelper, content: "Released hub to helper.", reference_files: [await reference("hub-helper")] }));
const pair = await hub.call(out.hub, "/", callTool("delegate_task", { recipient_address: "/aoml_pair", description: "Reply OK." }));
out.hubPair = pair.target_team_run_id; out.hubPairCoordinator = pair.target_team_coordinator_agent_run_id;
await hub.call(out.hub, "/", callTool("send_message_to", { target_agent_run_id: out.hubPairCoordinator, content: "Released hub to pair.", reference_files: [await reference("hub-pair")] }));
hub.close();

// Team run family: the lead messages its teammate and a task agent it delegates.
const teamRun = async () => (await gql(`mutation($input:CreateAgentTeamRunInput!){createAgentTeamRun(input:$input){success message teamRunId}}`,
  { input: { teamDefinitionId: ids.pair, teamConfigs: [{ teamAddress: "/", ...config }], memberConfigs: [
    { memberAddress: "/lead", agentDefinitionId: ids.lead, ...config }, { memberAddress: "/mate", agentDefinitionId: ids.mate, ...config }] } })).createAgentTeamRun.teamRunId;
const teamMembers = async (teamRunId) => Object.fromEntries(((await gql(`query($id:String!){getTeamRunResumeConfig(teamRunId:$id){executionTree}}`, { id: teamRunId }))
  .getTeamRunResumeConfig.executionTree.root_team.members).map((member) => [member.address, member.agent_run_id]));
out.team = await teamRun();
out.teamMembers = await teamMembers(out.team);
const team = await driver("team", out.team);
await team.call(out.teamMembers["/lead"], "/lead", callTool("send_message_to", { recipient_address: "/mate", content: "Released team lead to mate.", reference_files: [await reference("team-mate")] }));
out.teamHelper = (await team.call(out.teamMembers["/lead"], "/lead", callTool("delegate_task", { recipient_address: "/aoml_helper", description: "Reply OK." }))).target_agent_run_id;
await team.call(out.teamMembers["/lead"], "/lead", callTool("send_message_to", { target_agent_run_id: out.teamHelper, content: "Released team lead to helper.", reference_files: [await reference("team-helper")] }));
team.close();

// Org family: the director messages its analyst and a task agent it delegates.
out.org = (await gql(`mutation($input:CreateAgentOrgRunInput!){createAgentOrgRun(input:$input){success message agentOrgRunId}}`,
  { input: { agentOrgDefinitionId: ids.company, rootConfiguration: config, agentOverrides: [], teamOverrides: [] } })).createAgentOrgRun.agentOrgRunId;
out.orgMembers = Object.fromEntries(((await gql(`query($id:String!){getAgentOrgRunConfig(orgRunId:$id){executionTree}}`, { id: out.org }))
  .getAgentOrgRunConfig.executionTree.rootOrg.members).map((member) => [member.address, member.agentRunId]));
const org = await driver("org", out.org);
await org.call(out.orgMembers["/director"], "/director", callTool("send_message_to", { recipient_address: "/analyst", content: "Released org director to analyst.", reference_files: [await reference("org-analyst")] }));
out.orgHelper = (await org.call(out.orgMembers["/director"], "/director", callTool("delegate_task", { recipient_address: "/aoml_helper", description: "Reply OK." }))).target_agent_run_id;
await org.call(out.orgMembers["/director"], "/director", callTool("send_message_to", { target_agent_run_id: out.orgHelper, content: "Released org director to helper.", reference_files: [await reference("org-helper")] }));
org.close();

// A team run that never exchanges a message, and one whose log is made unreadable afterwards.
out.teamEmpty = await teamRun();
out.teamUnreadable = await teamRun();

await gql(`mutation($id:String!){terminateAgentRun(agentRunId:$id){success}}`, { id: out.hub });
for (const id of [out.team, out.teamEmpty, out.teamUnreadable]) await gql(`mutation($id:String!){terminateAgentTeamRun(teamRunId:$id){success}}`, { id });
await gql(`mutation($id:String!){terminateAgentOrgRun(agentOrgRunId:$id){success}}`, { id: out.org });
await fs.writeFile(output, `${JSON.stringify(out, null, 2)}\n`);
console.log(JSON.stringify(out, null, 2));
