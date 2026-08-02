#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ticketDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const evidenceDir = path.join(ticketDir, 'benchmark-evidence');
const outputPath = path.join(evidenceDir, 'selected-run-summary.json');

const selections = [
  ['flash_current_thinking', 'flash-thinking-reported-toolset-5x.jsonl', 'reported_toolset'],
  ['flash_legacy_thinking', 'flash-thinking-reported-legacy-schema-5x.jsonl', 'reported_legacy_schema'],
  ['flash_bare_parser_thinking', 'flash-thinking-legacy-experimental-bare-parser-5x.jsonl', 'reported_legacy_schema'],
  ['flash_current_nonthinking', 'flash-nonthinking-current-vs-legacy-3x.jsonl', 'reported_toolset'],
  ['flash_legacy_nonthinking', 'flash-nonthinking-current-vs-legacy-3x.jsonl', 'reported_legacy_schema'],
  ['pro_current_thinking', 'pro-thinking-current-vs-legacy-3x.jsonl', 'reported_toolset'],
  ['pro_legacy_thinking', 'pro-thinking-current-vs-legacy-3x.jsonl', 'reported_legacy_schema'],
  ['flash_portfolio_exact_thinking', 'flash-thinking-neutral-3x.jsonl', 'portfolio_neutral'],
  ['flash_strict_edit', 'flash-thinking-pilot-matrix.jsonl', 'strict_edit'],
  ['flash_exact_replace', 'flash-thinking-pilot-matrix.jsonl', 'replace'],
  ['flash_whole_file_write', 'flash-thinking-pilot-matrix.jsonl', 'write'],
  ['flash_bash', 'flash-thinking-pilot-matrix.jsonl', 'bash'],
  ['flash_portfolio', 'flash-thinking-pilot-matrix.jsonl', 'portfolio'],
  ['pro_exact_replace', 'pro-mechanism-pilot.jsonl', 'replace'],
  ['pro_whole_file_write', 'pro-mechanism-pilot.jsonl', 'write'],
  ['pro_bash', 'pro-mechanism-pilot.jsonl', 'bash'],
  ['flash_xml_pilot', 'pilot-flash-xml.jsonl', 'reported_toolset']
];

const prices = {
  'deepseek-v4-flash': { miss: 0.14, cache: 0.0028, output: 0.28 },
  'deepseek-v4-pro': { miss: 0.435, cache: 0.003625, output: 0.87 }
};
const editingTools = new Set(['edit_file', 'replace_in_file', 'insert_in_file', 'write_file', 'run_bash']);

const sum = (items) => items.reduce((total, value) => total + value, 0);
const round = (value, digits = 4) => Number(value.toFixed(digits));

function usageTotals(run) {
  const totals = {
    calls: 0,
    input: 0,
    cacheMiss: 0,
    cacheRead: 0,
    output: 0,
    reasoning: 0,
    estimatedCostUsd: 0
  };
  const modelPrices = prices[run.model];
  for (const event of run.token_usage_events ?? []) {
    const usage = event.usage ?? {};
    totals.calls += 1;
    totals.input += usage.input_tokens ?? 0;
    totals.cacheMiss += usage.cache_miss_input_tokens ?? usage.input_tokens ?? 0;
    totals.cacheRead += usage.cache_read_input_tokens ?? 0;
    totals.output += usage.output_tokens ?? 0;
    totals.reasoning += usage.reasoning_output_tokens ?? 0;
  }
  if (modelPrices) {
    totals.estimatedCostUsd = (
      totals.cacheMiss * modelPrices.miss
      + totals.cacheRead * modelPrices.cache
      + totals.output * modelPrices.output
    ) / 1_000_000;
  }
  return totals;
}

function firstEditOutcome(run) {
  const started = (run.tool_calls ?? []).find(
    (event) => event.phase === 'started' && editingTools.has(event.tool_name)
  );
  if (!started) return { tool: null, applicationSucceeded: false, bareHunk: false };
  const terminal = (run.tool_calls ?? []).find(
    (event) => event.invocation_id === started.invocation_id
      && (event.phase === 'succeeded' || event.phase === 'failed')
  );
  const patch = typeof started.arguments?.patch === 'string' ? started.arguments.patch : '';
  return {
    tool: started.tool_name,
    applicationSucceeded: terminal?.phase === 'succeeded',
    bareHunk: started.tool_name === 'edit_file' && /^@@(?:\r?\n|$)/.test(patch)
  };
}

function summarize(label, file, variant, runs) {
  const selected = runs.filter((run) => run.variant === variant);
  const usages = selected.map(usageTotals);
  const firstEdits = selected.map(firstEditOutcome);
  const firstToolCounts = Object.fromEntries(
    [...new Set(firstEdits.map((entry) => entry.tool ?? 'none'))]
      .sort()
      .map((toolName) => [toolName, firstEdits.filter((entry) => (entry.tool ?? 'none') === toolName).length])
  );
  return {
    label,
    evidence_file: file,
    model: selected[0]?.model ?? null,
    thinking_type: selected[0]?.thinking_type ?? null,
    tool_call_format: selected[0]?.tool_call_format ?? 'api_tool_call',
    variant,
    runs: selected.length,
    exact_final_successes: selected.filter((run) => run.task_success).length,
    schema_valid_runs: selected.filter((run) => run.schema_valid_tool_call).length,
    first_edit_application_successes: firstEdits.filter((entry) => entry.applicationSucceeded).length,
    first_edit_bare_hunks: firstEdits.filter((entry) => entry.bareHunk).length,
    tool_failures: sum(selected.map((run) => run.failure_count ?? 0)),
    recovered_runs: selected.filter((run) => run.recovered_after_failure).length,
    sentinel_unchanged_runs: selected.filter((run) => run.sentinel_unchanged).length,
    first_edit_tools: firstToolCounts,
    average_duration_ms: selected.length ? Math.round(sum(selected.map((run) => run.duration_ms)) / selected.length) : null,
    average_llm_calls: selected.length ? round(sum(usages.map((usage) => usage.calls)) / selected.length, 2) : null,
    average_input_tokens: selected.length ? Math.round(sum(usages.map((usage) => usage.input)) / selected.length) : null,
    average_output_tokens: selected.length ? Math.round(sum(usages.map((usage) => usage.output)) / selected.length) : null,
    average_reasoning_tokens: selected.length ? Math.round(sum(usages.map((usage) => usage.reasoning)) / selected.length) : null,
    estimated_average_cost_usd: selected.length
      ? round(sum(usages.map((usage) => usage.estimatedCostUsd)) / selected.length, 8)
      : null
  };
}

const cache = new Map();
const summaries = [];
for (const [label, file, variant] of selections) {
  if (!cache.has(file)) {
    const text = await fs.readFile(path.join(evidenceDir, file), 'utf8');
    cache.set(file, text.split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line)));
  }
  summaries.push(summarize(label, file, variant, cache.get(file)));
}

const output = {
  generated_at: new Date().toISOString(),
  note: 'Costs are estimates from repository catalog prices and provider-reported cache/token fields.',
  summaries
};
await fs.writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`, 'utf8');
process.stdout.write(`${outputPath}\n`);

