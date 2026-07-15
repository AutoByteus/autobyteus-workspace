import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { query } from '../../../autobyteus-server-ts/node_modules/@anthropic-ai/claude-agent-sdk/sdk.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '../../..');
const envPath = path.join(repoRoot, 'autobyteus-server-ts/.env.test');
const parseEnvLine = (line) => {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) return null;
  const idx = trimmed.indexOf('=');
  if (idx < 0) return null;
  const key = trimmed.slice(0, idx).trim();
  let value = trimmed.slice(idx + 1).trim();
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    value = value.slice(1, -1);
  }
  return [key, value];
};
for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
  const parsed = parseEnvLine(line);
  if (parsed) process.env[parsed[0]] = parsed[1];
}
process.env.CLAUDE_AGENT_SDK_AUTH_MODE = 'api-key';

const summarizeObject = (value) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value;
  const out = {};
  for (const [key, inner] of Object.entries(value)) {
    if (inner && typeof inner === 'object' && !Array.isArray(inner)) {
      out[key] = summarizeObject(inner);
    } else {
      out[key] = inner;
    }
  }
  return out;
};

const seenAssistantIds = new Set();
const rows = [];
const options = {
  model: process.env.CLAUDE_AGENT_SDK_PROBE_MODEL || 'claude-sonnet-4-6',
  cwd: repoRoot,
  maxTurns: 1,
  permissionMode: 'default',
  disallowedTools: ['Bash', 'Read', 'Write', 'Edit', 'MultiEdit', 'Glob', 'Grep', 'WebSearch', 'WebFetch'],
  thinking: { type: 'enabled', budgetTokens: 1024 },
  env: { ...process.env, CLAUDE_AGENT_SDK_AUTH_MODE: 'api-key' },
};

try {
  for await (const message of query({ prompt: 'Reply exactly: OK', options })) {
    if (message.type === 'assistant') {
      const betaMessage = message.message;
      const id = betaMessage?.id ?? null;
      rows.push({
        type: 'assistant',
        id,
        duplicateId: id ? seenAssistantIds.has(id) : false,
        usage: summarizeObject(betaMessage?.usage),
        contentTypes: Array.isArray(betaMessage?.content)
          ? betaMessage.content.map((block) => block?.type ?? null)
          : [],
      });
      if (id) seenAssistantIds.add(id);
    } else if (message.type === 'result') {
      rows.push({
        type: 'result',
        subtype: message.subtype,
        is_error: message.is_error,
        num_turns: message.num_turns,
        total_cost_usd_type: typeof message.total_cost_usd,
        usage: summarizeObject(message.usage),
        modelUsage: summarizeObject(message.modelUsage),
        stop_reason: message.stop_reason,
      });
    } else {
      rows.push({ type: message.type, subtype: message.subtype ?? null });
    }
  }
  console.log(JSON.stringify({ ok: true, rows }, null, 2));
} catch (error) {
  console.log(JSON.stringify({
    ok: false,
    errorName: error?.name ?? null,
    errorMessage: String(error?.message ?? error),
    rows,
  }, null, 2));
  process.exitCode = 1;
}
