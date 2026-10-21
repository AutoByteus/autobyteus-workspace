#!/usr/bin/env node
// API-30 driver (temporary probe tool). Commands:
//   send <baseUrl> <runId> <text>            the owner's composer message to a standalone run
//   conv <baseUrl> <runId>                   the run's conversation (JSON)
//   member <baseUrl> <teamRunId> <runId>     a Team member's conversation (JSON)
//   tools <baseUrl> <runId>                  every tool call of the run: name and arguments as the runtime sent them
//   gql <baseUrl> <query> [variablesJson]
import { randomUUID } from "node:crypto";

const [cmd, baseUrl, ...rest] = process.argv.slice(2);
const gql = async (query, variables) => {
  const body = await (await fetch(`${baseUrl}/graphql`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query, variables }) })).json();
  if (body.errors?.length) throw new Error(JSON.stringify(body.errors));
  return body.data;
};
const conversation = async (runId) => (await gql(`query($id:String!){getRunProjection(runId:$id){conversation}}`, { id: runId })).getRunProjection?.conversation ?? [];

if (cmd === "send") {
  const [runId, text] = rest;
  const socket = new WebSocket(`${baseUrl.replace("http", "ws")}/ws/agent/${runId}`);
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  await new Promise((resolve) => setTimeout(resolve, 800));
  const id = `api30-${randomUUID()}`;
  socket.send(JSON.stringify({ type: "SEND_MESSAGE", payload: { message_id: id, dedupe_key: `agent_run_input:api30:${id}`, context_file_paths: [], image_urls: [], agent_run_id: runId, content: text } }));
  await new Promise((resolve) => setTimeout(resolve, 1500));
  socket.close();
  console.log("sent", id);
} else if (cmd === "conv") {
  console.log(JSON.stringify(await conversation(rest[0]), null, 1));
} else if (cmd === "member") {
  console.log(JSON.stringify((await gql(`query($id:String!,$a:String!){getTeamMemberRunProjection(teamRunId:$id,agentRunId:$a){conversation}}`, { id: rest[0], a: rest[1] })).getTeamMemberRunProjection?.conversation ?? [], null, 1));
} else if (cmd === "tools") {
  const calls = [];
  const walk = (value) => {
    if (Array.isArray(value)) return value.forEach(walk);
    if (!value || typeof value !== "object") return;
    if (value.kind === "tool_call") { calls.push({ toolName: value.toolName, toolArgs: value.toolArgs ?? null, toolResult: value.toolResult ?? null, toolError: value.toolError ?? null }); return; }
    Object.values(value).forEach(walk);
  };
  walk(await conversation(rest[0]));
  console.log(JSON.stringify(calls, null, 1));
} else if (cmd === "gql") {
  console.log(JSON.stringify(await gql(rest[0], rest[1] ? JSON.parse(rest[1]) : undefined), null, 1));
} else {
  throw new Error(`unknown command ${cmd}`);
}
process.exit(0);
