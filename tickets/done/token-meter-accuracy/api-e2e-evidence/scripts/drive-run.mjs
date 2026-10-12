#!/usr/bin/env node
// Drives one real agent turn on an AutoByteus backend (isolated instance) through its public
// GraphQL + agent WebSocket, and prints the TOKEN_USAGE_UPDATED stream and the persisted summary.
// Usage: node drive-run.mjs <backendUrl> <runtimeKind> <modelChoice> <promptFile> [runId] [--released]
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";

const [backendUrl, runtimeKind, modelChoice, promptFile, existingRunIdArg, ...flags] = process.argv.slice(2);
const released = flags.includes("--released") || existingRunIdArg === "--released";
const existingRunId = existingRunIdArg && existingRunIdArg !== "--released" && existingRunIdArg !== "-" ? existingRunIdArg : null;
const prompt = fs.readFileSync(promptFile, "utf8").trim();
const gql = async (query, variables = {}) => {
  const response = await fetch(`${backendUrl}/graphql`, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });
  const body = await response.json();
  if (body.errors?.length) throw new Error(JSON.stringify(body.errors));
  return body.data;
};

const summaryFields = `runId grossInputTokens standardInputTokens cacheReadInputTokens cacheCreationInputTokens outputTokens totalTokens
  usageReportCount latestPromptTokens effectiveContextWindowTokens contextWindowUsagePercent latestModelIdentifier latestRuntimeKind
  estimatedApiTotalCost apiCostStatus${released ? "" : " contextCompactionThresholdTokens revision"}`;
const summaryOf = async (runId) => (await gql(`query($runId: String!) { getAgentRunTokenUsageSummary(runId: $runId) { ${summaryFields} } }`, { runId })).getAgentRunTokenUsageSummary;

let runId = existingRunId;
let modelIdentifier = null;
if (!runId) {
  const catalog = await gql(`query($runtimeKind: String) { providerModelCatalogSnapshots(runtimeKind: $runtimeKind) { llmModels { modelIdentifier } } }`, { runtimeKind });
  const models = catalog.providerModelCatalogSnapshots.flatMap((p) => p.llmModels.map((m) => m.modelIdentifier));
  modelIdentifier = models.find((m) => m === modelChoice) ?? models.find((m) => m.toLowerCase().includes(modelChoice.toLowerCase()));
  if (!modelIdentifier) throw new Error(`No model matching '${modelChoice}' in ${JSON.stringify(models)}`);
  const definition = await gql(`mutation($input: CreateAgentDefinitionInput!) { createAgentDefinition(input: $input) { id } }`, {
    input: { name: `tma-api-e2e-${runtimeKind}-${randomUUID().slice(0, 8)}`, role: "assistant",
      description: "token-meter-accuracy API/E2E validation agent",
      instructions: "You are a test agent. When asked to run shell commands, run each one with your shell tool, one tool call per step, waiting for each result. Then answer briefly.",
      category: "api-e2e", toolNames: [], skillNames: [] },
  });
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "tma-api-e2e-ws-"));
  const run = await gql(`mutation($input: CreateAgentRunInput!) { createAgentRun(input: $input) { success message runId } }`, {
    input: { agentDefinitionId: definition.createAgentDefinition.id, workspaceRootPath: workspace, llmModelIdentifier: modelIdentifier,
      autoExecuteTools: true, runtimeKind, llmConfig: null },
  });
  if (!run.createAgentRun.success) throw new Error(run.createAgentRun.message);
  runId = run.createAgentRun.runId;
}

const wsUrl = backendUrl.replace(/^http/, "ws") + `/ws/agent/${runId}`;
const socket = new WebSocket(wsUrl);
const messages = [];
const t0 = Date.now();
socket.addEventListener("message", (event) => {
  try { const parsed = JSON.parse(String(event.data)); messages.push({ t: Date.now() - t0, ...parsed }); } catch {}
});
await new Promise((resolve, reject) => { socket.addEventListener("open", resolve); socket.addEventListener("error", reject); });
const waitFor = async (predicate, label, timeoutMs = 600_000) => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const index = messages.findIndex(predicate);
    if (index >= 0) return index;
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(`Timed out waiting for ${label}; seen ${messages.map((m) => m.type).join(",")}`);
};
await waitFor((m) => m.type === "CONNECTED", "CONNECTED", 20_000);
const start = messages.length;
const midTurnSummaries = [];
socket.send(JSON.stringify({ type: "SEND_MESSAGE", payload: { message_id: `e2e-${randomUUID()}`,
  dedupe_key: `agent_run_input:e2e:${randomUUID()}`, context_file_paths: [], image_urls: [], content: prompt } }));
await waitFor((m, i) => i >= start && m.type === "AGENT_COMMAND_ACK", "ACK", 60_000);
// Sample the persisted summary while the turn runs (what a fetched meter would show).
let idle = false;
const sampler = (async () => {
  while (!idle) {
    try { midTurnSummaries.push({ t: Date.now() - t0, summary: await summaryOf(runId) }); } catch (error) { midTurnSummaries.push({ t: Date.now() - t0, error: String(error) }); }
    await new Promise((r) => setTimeout(r, 1500));
  }
})();
await waitFor((m, i) => i >= start + 1 && m.type === "AGENT_STATUS" && m.payload?.status === "idle", "idle");
idle = true;
await sampler;
await new Promise((r) => setTimeout(r, 1500));
const finalSummary = await summaryOf(runId);
socket.close();
const turn = messages.slice(start);
const usage = turn.filter((m) => m.type === "TOKEN_USAGE_UPDATED").map((m) => ({
  index: turn.indexOf(m), t: m.t, ingestion: m.payload.ingestion_kind, call: m.payload.reports_model_call ?? null,
  model: m.payload.model_identifier, input: m.payload.reported_input_tokens, cacheRead: m.payload.cache_read_input_tokens,
  cacheCreation: m.payload.cache_creation_input_tokens, output: m.payload.reported_output_tokens,
  accountingTotal: m.payload.accounting_total_tokens, prompt: m.payload.latest_prompt_tokens,
  window: m.payload.effective_context_window_tokens, percent: m.payload.context_window_usage_percent,
  threshold: m.payload.context_compaction_threshold_tokens ?? null, flags: m.payload.quality_flags,
  summaryCount: m.payload.run_summary_after_event?.usage_report_count ?? null,
  summaryRevision: m.payload.run_summary_after_event?.revision ?? null,
}));
const idleIndex = turn.findIndex((m) => m.type === "AGENT_STATUS" && m.payload?.status === "idle");
const types = turn.map((m) => m.type);
console.log(JSON.stringify({ backendUrl, runtimeKind, modelIdentifier, runId, idleIndex, idleAt: turn[idleIndex]?.t ?? null,
  usage, midTurnSummaries, finalSummary, messageTypes: types }, null, 2));
