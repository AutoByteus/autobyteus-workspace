#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ticketDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const evidenceDir = path.join(ticketDir, 'benchmark-evidence');
const outputPath = path.join(evidenceDir, 'cross-provider-context-summary.json');

const cohorts = [
  {
    id: 'deepseek_current_numeric',
    files: ['flash-thinking-reported-toolset-5x.jsonl'],
    variant: 'reported_toolset',
    models: ['deepseek-v4-flash']
  },
  {
    id: 'gemini_current_numeric',
    files: ['gemini35-current-numeric-pilot-v2.jsonl', 'gemini35-current-numeric-main.jsonl'],
    variant: 'strict_edit',
    models: ['gemini-3.5-flash']
  },
  {
    id: 'gpt_current_numeric',
    files: ['gpt56sol-current-numeric-pilot.jsonl'],
    variant: 'strict_edit',
    models: ['gpt-5.6-sol']
  },
  {
    id: 'context_only_explicit',
    files: ['cross-provider-context-only-main.jsonl'],
    variant: 'context_edit',
    models: ['deepseek-v4-flash', 'gemini-3.5-flash', 'gpt-5.6-sol']
  },
  {
    id: 'context_only_schema_only',
    files: ['cross-provider-context-only-neutral.jsonl'],
    variant: 'context_edit_neutral',
    models: ['deepseek-v4-flash', 'gemini-3.5-flash', 'gpt-5.6-sol']
  },
  {
    id: 'gemini_context_header_normalized_schema_only',
    files: ['gemini-context-normalized-neutral.jsonl'],
    variant: 'context_edit_neutral',
    models: ['gemini-3.5-flash']
  },
  {
    id: 'gemini_exact_replace',
    files: ['gemini35-replace-pilot.jsonl'],
    variant: 'replace',
    models: ['gemini-3.5-flash'],
    optional: true
  },
  {
    id: 'generic_schema_context_parser',
    files: ['cross-provider-generic-schema-pilot.jsonl'],
    variant: 'generic_edit',
    models: ['deepseek-v4-flash', 'gemini-3.5-flash', 'gpt-5.6-sol'],
    optional: true
  }
];

const editingTools = new Set(['edit_file', 'replace_in_file', 'insert_in_file', 'write_file', 'run_bash']);
const sum = (values) => values.reduce((total, value) => total + value, 0);

function firstEdit(run) {
  const started = (run.tool_calls ?? []).find(
    (event) => event.phase === 'started' && editingTools.has(event.tool_name)
  );
  if (!started) return { tool: null, succeeded: false, format: null };
  const terminal = (run.tool_calls ?? []).find(
    (event) => event.invocation_id === started.invocation_id &&
      (event.phase === 'succeeded' || event.phase === 'failed')
  );
  const patch = typeof started.arguments?.patch === 'string' ? started.arguments.patch : '';
  const firstLine = patch.split(/\r?\n/).find((line) => line.trim().length)?.trim() ?? '';
  let format = null;
  if (started.tool_name === 'edit_file') {
    if (firstLine === '@@') format = 'bare_context';
    else if (/^@@ -\d+(?:,\d+)? \+\d+(?:,\d+)? @@/.test(firstLine)) format = 'numeric_unified';
    else if (firstLine.startsWith('diff --git ') || firstLine.startsWith('--- ')) format = 'file_header_diff';
    else if (firstLine === '*** Begin Patch') format = 'codex_envelope';
    else format = 'other';
  }
  return { tool: started.tool_name, succeeded: terminal?.phase === 'succeeded', format };
}

function tokenTotals(run) {
  const totals = { calls: 0, input: 0, output: 0, reasoning: 0 };
  for (const event of run.token_usage_events ?? []) {
    const usage = event.usage ?? {};
    totals.calls += 1;
    totals.input += usage.input_tokens ?? 0;
    totals.output += usage.output_tokens ?? 0;
    totals.reasoning += usage.reasoning_output_tokens ?? 0;
  }
  return totals;
}

const summaries = [];
for (const cohort of cohorts) {
  const rows = [];
  for (const file of cohort.files) {
    try {
      const text = await fs.readFile(path.join(evidenceDir, file), 'utf8');
      rows.push(...text.split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line)));
    } catch (error) {
      if (cohort.optional && error?.code === 'ENOENT') continue;
      throw error;
    }
  }

  for (const model of cohort.models) {
    const selected = rows.filter((run) => run.variant === cohort.variant && run.model === model);
    if (!selected.length) continue;
    const firstEdits = selected.map(firstEdit);
    const tokens = selected.map(tokenTotals);
    const formatCounts = {};
    const firstToolCounts = {};
    for (const edit of firstEdits) {
      const format = edit.format ?? 'n/a';
      const tool = edit.tool ?? 'none';
      formatCounts[format] = (formatCounts[format] ?? 0) + 1;
      firstToolCounts[tool] = (firstToolCounts[tool] ?? 0) + 1;
    }
    summaries.push({
      cohort: cohort.id,
      model,
      variant: cohort.variant,
      evidence_files: cohort.files,
      runs: selected.length,
      exact_final_successes: selected.filter((run) => run.task_success).length,
      first_edit_application_successes: firstEdits.filter((edit) => edit.succeeded).length,
      tool_failures: sum(selected.map((run) => run.failure_count ?? 0)),
      sentinel_unchanged_runs: selected.filter((run) => run.sentinel_unchanged).length,
      first_edit_tools: firstToolCounts,
      first_edit_patch_formats: formatCounts,
      average_duration_ms: Math.round(sum(selected.map((run) => run.duration_ms)) / selected.length),
      average_llm_calls: Number((sum(tokens.map((entry) => entry.calls)) / selected.length).toFixed(2)),
      average_input_tokens: Math.round(sum(tokens.map((entry) => entry.input)) / selected.length),
      average_output_tokens: Math.round(sum(tokens.map((entry) => entry.output)) / selected.length),
      average_reasoning_tokens: Math.round(sum(tokens.map((entry) => entry.reasoning)) / selected.length)
    });
  }
}

await fs.writeFile(outputPath, `${JSON.stringify({
  generated_at: new Date().toISOString(),
  summaries
}, null, 2)}\n`, 'utf8');
process.stdout.write(`${outputPath}\n`);
