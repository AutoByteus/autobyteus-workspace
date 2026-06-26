#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { query } from '../../../autobyteus-server-ts/node_modules/@anthropic-ai/claude-agent-sdk/sdk.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '../../..');
const evidenceDir = path.resolve(here, '../experiment-evidence');

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return false;
  for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx < 0) continue;
    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    process.env[key] = value;
  }
  return true;
}

const originalRoot = '/Users/normy/autobyteus_org/autobyteus-workspace-superrepo';
const loadedEnvFiles = [
  path.join(repoRoot, 'autobyteus-server-ts/.env.test'),
  path.join(repoRoot, 'autobyteus-ts/.env.test'),
  path.join(originalRoot, 'autobyteus-server-ts/.env.test'),
  path.join(originalRoot, 'autobyteus-ts/.env.test'),
].filter(loadEnvFile);

process.env.CLAUDE_AGENT_SDK_AUTH_MODE = 'api-key';

const repeatedPrefix = Array.from({ length: 260 }, (_, idx) => {
  const n = String(idx + 1).padStart(3, '0');
  return `CLAUDE_AGENT_SDK_CACHE_PROBE_PREFIX_${n}: alpha beta gamma delta epsilon zeta eta theta iota kappa lambda mu. Keep this exact line stable.`;
}).join('\n');

const promptFor = (marker) => [
  'Token usage cache probe. Do not use tools. Reply with only the requested marker word.',
  'Stable prefix begins below and is intentionally repeated across turns.',
  repeatedPrefix,
  `Reply exactly: ${marker}`,
].join('\n');

function summarizeObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value;
  const out = {};
  for (const [key, inner] of Object.entries(value)) {
    if (inner && typeof inner === 'object' && !Array.isArray(inner)) out[key] = summarizeObject(inner);
    else out[key] = inner;
  }
  return out;
}

async function runOne(label, prompt, options) {
  const rows = [];
  const seenAssistantIds = new Set();
  for await (const message of query({ prompt, options })) {
    if (message.type === 'assistant') {
      const betaMessage = message.message;
      const id = betaMessage?.id ?? null;
      rows.push({
        type: 'assistant',
        uuid: message.uuid ?? null,
        id,
        duplicateId: id ? seenAssistantIds.has(id) : false,
        usage: summarizeObject(betaMessage?.usage),
        contentTypes: Array.isArray(betaMessage?.content) ? betaMessage.content.map((block) => block?.type ?? null) : [],
      });
      if (id) seenAssistantIds.add(id);
    } else if (message.type === 'result') {
      rows.push({
        type: 'result',
        subtype: message.subtype,
        is_error: message.is_error,
        num_turns: message.num_turns,
        session_id: message.session_id ?? null,
        total_cost_usd_type: typeof message.total_cost_usd,
        total_cost_usd: typeof message.total_cost_usd === 'number' ? message.total_cost_usd : null,
        usage: summarizeObject(message.usage),
        modelUsage: summarizeObject(message.modelUsage),
        stop_reason: message.stop_reason,
      });
    } else {
      rows.push({ type: message.type, subtype: message.subtype ?? null, session_id: message.session_id ?? null });
    }
  }
  const resultRow = rows.find((row) => row.type === 'result');
  return { label, rows, resultUsage: resultRow?.usage ?? null, resultModelUsage: resultRow?.modelUsage ?? null, session_id: resultRow?.session_id ?? null };
}

async function main() {
  const sessionId = randomUUID();
  const baseOptions = {
    model: process.env.CLAUDE_AGENT_SDK_PROBE_MODEL || 'claude-sonnet-4-6',
    cwd: repoRoot,
    maxTurns: 1,
    maxBudgetUsd: 0.25,
    permissionMode: 'default',
    tools: [],
    disallowedTools: ['Bash', 'Read', 'Write', 'Edit', 'MultiEdit', 'Glob', 'Grep', 'WebSearch', 'WebFetch'],
    thinking: { type: 'disabled' },
    env: { ...process.env, CLAUDE_AGENT_SDK_AUTH_MODE: 'api-key' },
  };

  const first = await runOne('warmup', promptFor('WARMUP'), { ...baseOptions, sessionId });
  const resumeId = first.session_id || sessionId;
  const second = await runOne('probe', promptFor('PROBE'), { ...baseOptions, resume: resumeId });
  const result = {
    ok: true,
    provider: 'claude-agent-sdk-runtime',
    model: baseOptions.model,
    env_files_loaded: loadedEnvFiles.map((file) => path.relative(repoRoot, file)),
    sessionIdRequested: sessionId,
    sessionIdUsedForResume: resumeId,
    completed_at: new Date().toISOString(),
    prompt_shape: {
      sequential_sdk_queries: 2,
      repeated_prefix_line_count: 260,
      repeated_prefix_chars: repeatedPrefix.length,
      second_query_used_resume: true,
    },
    calls: [first, second],
  };
  await mkdir(evidenceDir, { recursive: true });
  const file = path.join(evidenceDir, `${new Date().toISOString().replace(/[:.]/g, '-')}-claude-agent-sdk-two-round.json`);
  await writeFile(file, JSON.stringify(result, null, 2));
  console.log(JSON.stringify({ ok: true, evidence_file: file, warmupUsage: first.resultUsage, probeUsage: second.resultUsage, probeModelUsage: second.resultModelUsage }, null, 2));
}

main().catch(async (error) => {
  const failure = { ok: false, provider: 'claude-agent-sdk-runtime', errorName: error?.name ?? null, errorMessage: String(error?.message ?? error), completed_at: new Date().toISOString() };
  await mkdir(evidenceDir, { recursive: true });
  const file = path.join(evidenceDir, `${new Date().toISOString().replace(/[:.]/g, '-')}-claude-agent-sdk-two-round-failure.json`);
  await writeFile(file, JSON.stringify(failure, null, 2));
  console.error(JSON.stringify({ ...failure, evidence_file: file }, null, 2));
  process.exit(1);
});
