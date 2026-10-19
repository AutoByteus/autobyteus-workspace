#!/usr/bin/env node
// API-06 (append-only-message-logs): for every message of the given runs, as the server serves them (the renderer's views), fetch
// every reference file by messageId + referenceId over REST and print status and body, plus the message count of each view.
// Usage: node api-06-references.mjs <backendUrl> <idsJson>
import fs from "node:fs/promises";
import { createHash } from "node:crypto";

const [backend, idsFile] = process.argv.slice(2);
const ids = JSON.parse(await fs.readFile(idsFile, "utf8"));
const gql = async (query, variables) => {
  const body = await (await fetch(`${backend}/graphql`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query, variables }) })).json();
  if (body.errors?.length) throw new Error(JSON.stringify(body.errors));
  return body.data;
};
const rootReferenceId = (messageId, file) => createHash("sha256").update(`${messageId}\0${file}`).digest("hex");
const check = async (label, route, expectFile) => {
  const response = await fetch(`${backend}/rest/${route}`);
  const text = await response.text();
  const expected = await fs.readFile(expectFile, "utf8").catch(() => null);
  console.log(`${response.status} ${text === expected ? "BODY_EQUALS_FILE" : "BODY_DIFFERS"} ${label}`);
};
const hub = (await gql(`query($id:String!){agentRunCollaboration(runId:$id)}`, { id: ids.hub })).agentRunCollaboration.root_agent.communication_messages.messages;
console.log(`hub ${ids.hub}: ${hub.length} messages`);
for (const m of hub) for (const file of m.referenceFiles) await check(`hub ${m.messageId} "${m.content}"`, `agent-collaborations/${ids.hub}/communication/messages/${m.messageId}/references/${rootReferenceId(m.messageId, file)}/content`, file);
for (const teamRunId of [ids.team, ids.teamEmpty]) {
  const team = (await gql(`query($id:String!){getTeamCommunicationMessages(teamRunId:$id){messageId content referenceFiles{referenceId path}}}`, { id: teamRunId })).getTeamCommunicationMessages;
  console.log(`team ${teamRunId}: ${team.length} messages`);
  for (const m of team) for (const file of m.referenceFiles) await check(`team ${m.messageId} "${m.content}"`, `team-runs/${teamRunId}/team-communication/messages/${m.messageId}/references/${file.referenceId}/content`, file.path);
}
const org = (await gql(`query($id:String!){getAgentOrgRunInspection(orgRunId:$id)}`, { id: ids.org })).getAgentOrgRunInspection.root_org.communication_messages.messages;
console.log(`org ${ids.org}: ${org.length} messages (${org.filter((m) => m.messageId.startsWith("older-")).length} synthesized older)`);
for (const m of org) for (const file of m.referenceFiles) await check(`org ${m.messageId} "${m.content}"`, `agent-org-runs/${ids.org}/communication/messages/${m.messageId}/references/${rootReferenceId(m.messageId, file)}/content`, file);
const sorted = (list) => list.every((m, i) => i === 0 || list[i - 1].createdAt <= m.createdAt);
console.log(`createdAt order: hub ${sorted(hub)}, org ${sorted(org)}`);
