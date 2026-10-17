#!/usr/bin/env node
// Real-runtime prompt check (AC-001): a standalone agent on the given runtime is asked to quote, from its own instructions, the
// first paragraph and bullet of "Working With Other Agents"; the quote must equal the approved view (wording §4.1).
// Usage (from the repository root): node prompt-quote.mjs <backendUrl> <seeded.json> <dataRoot> <runtimeKind> <model> [label]
import { createRequire } from "node:module";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { randomUUID } from "node:crypto";
import path from "node:path";
const WebSocket = createRequire(`${process.cwd()}/autobyteus-server-ts/package.json`)("ws");
const [backend, seededPath, dataRoot, runtimeKind, model, label = runtimeKind] = process.argv.slice(2);
const seeded = JSON.parse(readFileSync(seededPath, "utf8"));
const EXPECTED = [
  "You can delegate tasks to other agents and agent teams.",
  "- To delegate a task, use `delegate_task` with the address of an agent or agent team. This creates a new task agent (or task agent team) that works on your task, and you get back its ID. Your task description becomes the task agent's first message, together with your ID so it can reply; don't send it again with `send_message_to`.",
];
const gql = async (query, variables) => { const r = await (await fetch(new URL("/graphql", backend), { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query, variables }) })).json(); if (r.errors?.length || !r.data) throw new Error(JSON.stringify(r.errors ?? r)); return r.data; };
const created = (await gql(`mutation($input:CreateAgentRunInput!){createAgentRun(input:$input){success message runId}}`, { input: { agentDefinitionId: seeded.researchLead.id,
  workspaceRootPath: path.join(dataRoot, "workspace"), llmModelIdentifier: model, llmConfig: null, autoExecuteTools: true, runtimeKind } })).createAgentRun;
if (!created.success) { console.log(JSON.stringify({ label, runtimeKind, model, error: created.message })); process.exit(2); }
const socket = new WebSocket(`ws://${new URL(backend).host}/ws/agent/${created.runId}`);
await new Promise((resolve, reject) => { socket.once("open", resolve); socket.once("error", reject); });
await new Promise((resolve) => setTimeout(resolve, 1500));
socket.send(JSON.stringify({ type: "SEND_MESSAGE", payload: { agent_run_id: created.runId, message_id: `e2e-${randomUUID()}`, dedupe_key: `agent_run_input:e2e:${randomUUID()}`, context_file_paths: [], image_urls: [],
  content: "Do not call any tool. Quote, exactly and character for character inside a markdown code block, the paragraph of your instructions that starts with \"You can delegate tasks\" and the first bullet point under it." } }));
const find = (dir) => { for (const entry of readdirSync(dir, { withFileTypes: true })) { if (entry.isDirectory()) { if (entry.name === created.runId) return path.join(dir, entry.name); const f = find(path.join(dir, entry.name)); if (f) return f; } } return null; };
let reply = "";
for (let i = 0; i < 60 && !reply; i += 1) {
  await new Promise((resolve) => setTimeout(resolve, 3000));
  const dir = find(path.join(dataRoot, "server-data", "memory"));
  const file = dir && path.join(dir, "raw_traces_active.jsonl");
  if (file && existsSync(file)) reply = readFileSync(file, "utf8").trim().split("\n").map((l) => JSON.parse(l)).filter((d) => d.trace_type === "assistant" && d.content).map((d) => d.content).join("\n");
}
socket.close();
const exact = EXPECTED.map((text) => reply.includes(text));
console.log(JSON.stringify({ label, runtimeKind, model, runId: created.runId, quotedParagraphExact: exact[0], quotedBulletExact: exact[1], reply: reply.slice(0, 1500) }));
