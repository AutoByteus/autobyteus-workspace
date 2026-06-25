#!/usr/bin/env node
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import fs from 'node:fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadEnvFileWithOverride(filePath) {
  if (!fs.existsSync(filePath)) return false;
  const text = fs.readFileSync(filePath, 'utf8');
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;
    const key = match[1];
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
  return true;
}

const repoRootForEnv = path.resolve(__dirname, '../../..');
const originalCheckoutRootForEnv = '/Users/normy/autobyteus_org/autobyteus-workspace-superrepo';
const loadedEnvFiles = [
  path.join(repoRootForEnv, 'autobyteus-ts/.env.test'),
  path.join(repoRootForEnv, 'autobyteus-server-ts/.env.test'),
  path.join(originalCheckoutRootForEnv, 'autobyteus-ts/.env.test'),
  path.join(originalCheckoutRootForEnv, 'autobyteus-server-ts/.env.test'),
].filter(loadEnvFileWithOverride);


import { LLMModel } from '../../../autobyteus-ts/dist/llm/models.js';
import { LLMProvider } from '../../../autobyteus-ts/dist/llm/providers.js';
import { LLMConfig } from '../../../autobyteus-ts/dist/llm/utils/llm-config.js';
import { Message, MessageRole } from '../../../autobyteus-ts/dist/llm/utils/messages.js';
import { OpenAILLM } from '../../../autobyteus-ts/dist/llm/api/openai-llm.js';
import { DeepSeekLLM } from '../../../autobyteus-ts/dist/llm/api/deepseek-llm.js';
import { GlmLLM } from '../../../autobyteus-ts/dist/llm/api/glm-llm.js';
import { KimiLLM } from '../../../autobyteus-ts/dist/llm/api/kimi-llm.js';
import { QwenLLM } from '../../../autobyteus-ts/dist/llm/api/qwen-llm.js';
import { GrokLLM } from '../../../autobyteus-ts/dist/llm/api/grok-llm.js';
import { MistralLLM } from '../../../autobyteus-ts/dist/llm/api/mistral-llm.js';
import { GeminiLLM } from '../../../autobyteus-ts/dist/llm/api/gemini-llm.js';
import { AnthropicLLM } from '../../../autobyteus-ts/dist/llm/api/anthropic-llm.js';

const evidenceDir = path.resolve(__dirname, '../experiment-evidence');

if (!process.env.DASHSCOPE_API_KEY && process.env.QWEN_API_KEY) {
  process.env.DASHSCOPE_API_KEY = process.env.QWEN_API_KEY;
}
if (!process.env.GLM_API_KEY && process.env.ZHIPU_API_KEY) {
  process.env.GLM_API_KEY = process.env.ZHIPU_API_KEY;
}

const provider = process.argv[2];
const mode = process.argv[3] ?? 'two-call';

const repeatedLines = Array.from({ length: 260 }, (_, idx) => {
  const n = String(idx + 1).padStart(3, '0');
  return `CACHE_PROBE_SHARED_PREFIX_${n}: alpha beta gamma delta epsilon zeta eta theta iota kappa lambda mu. Keep this exact line stable for provider cache testing.`;
}).join('\n');

const baseSystem = [
  'You are participating in a token usage cache probe.',
  'Return only the requested marker word. Do not explain.',
  'The following repeated prefix is intentionally stable across calls.',
  repeatedLines,
].join('\n');

const user1 = 'Return only WARMUP.';
const user2 = 'Return only PROBE.';

function modelFor(providerKey) {
  switch (providerKey) {
    case 'openai':
      return { cls: OpenAILLM, provider: LLMProvider.OPENAI, name: 'gpt-5.4-mini', value: 'gpt-5.4-mini', maxTokens: 16 };
    case 'deepseek':
      return { cls: DeepSeekLLM, provider: LLMProvider.DEEPSEEK, name: 'deepseek-v4-flash', value: 'deepseek-v4-flash', maxTokens: 16, extraParams: { thinking_type: 'disabled' } };
    case 'glm':
      return { cls: GlmLLM, provider: LLMProvider.GLM, name: 'glm-5.2', value: 'glm-5.2', maxTokens: 16, extraParams: { thinking_type: 'disabled' } };
    case 'kimi':
      return { cls: KimiLLM, provider: LLMProvider.KIMI, name: 'kimi-k2.7-code', value: 'kimi-k2.7-code', maxTokens: 16 };
    case 'qwen':
      return { cls: QwenLLM, provider: LLMProvider.QWEN, name: 'qwen3.7-max', value: 'qwen3.7-max', maxTokens: 16 };
    case 'grok':
      return { cls: GrokLLM, provider: LLMProvider.GROK, name: 'grok-build-0.1', value: 'grok-build-0.1', maxTokens: 16 };
    case 'mistral':
      return { cls: MistralLLM, provider: LLMProvider.MISTRAL, name: 'mistral-large-3', value: 'mistral-large-2512', maxTokens: 16 };
    case 'gemini':
      return { cls: GeminiLLM, provider: LLMProvider.GEMINI, name: 'gemini-3-flash-preview', value: 'gemini-3-flash-preview', maxTokens: 16, extraParams: { thinking_level: 'minimal' } };
    case 'anthropic':
      return { cls: AnthropicLLM, provider: LLMProvider.ANTHROPIC, name: 'claude-sonnet-4.6', value: 'claude-sonnet-4-6', maxTokens: 16 };
    default:
      throw new Error(`Unknown provider '${providerKey}'.`);
  }
}

function usageSummary(usage) {
  if (!usage) return null;
  return {
    input_tokens: usage.input_tokens ?? null,
    output_tokens: usage.output_tokens ?? null,
    total_tokens: usage.total_tokens ?? null,
    cache_read_input_tokens: usage.cache_read_input_tokens ?? null,
    cache_creation_input_tokens: usage.cache_creation_input_tokens ?? null,
    reasoning_output_tokens: usage.reasoning_output_tokens ?? null,
    billable_input_tokens: usage.billable_input_tokens ?? null,
    billable_output_tokens: usage.billable_output_tokens ?? null,
    quality_flags: usage.quality_flags ?? [],
    raw_usage_json: usage.raw_usage_json ?? null,
  };
}

async function invokeStandard(llm, marker, userContent) {
  const messages = provider === 'gemini'
    ? [new Message(MessageRole.USER, `${baseSystem}\n${userContent}`)]
    : [
        new Message(MessageRole.SYSTEM, baseSystem),
        new Message(MessageRole.USER, userContent),
      ];
  const response = await llm.sendMessages(messages);
  return {
    marker,
    content_preview: String(response.content ?? '').slice(0, 80),
    normalized_usage: usageSummary(response.usage),
  };
}

async function invokeAnthropicWithExplicitCache(llm, marker, userContent) {
  // Override request.system via kwargs so Anthropic receives cache_control on a large stable prefix.
  const messages = [new Message(MessageRole.USER, userContent)];
  const system = [
    {
      type: 'text',
      text: baseSystem,
      cache_control: { type: 'ephemeral' },
    },
  ];
  const response = await llm.sendMessages(messages, null, { system });
  return {
    marker,
    content_preview: String(response.content ?? '').slice(0, 80),
    normalized_usage: usageSummary(response.usage),
  };
}

function inferSemantic(call) {
  const raw = call?.normalized_usage?.raw_usage_json ?? {};
  const u = call?.normalized_usage ?? {};
  const hasOpenAiGrossFields = raw.prompt_tokens !== undefined || raw.input_tokens_details !== undefined || raw.prompt_tokens_details !== undefined;
  const hasDeepSeekMiss = raw.prompt_cache_miss_tokens !== undefined;
  const hasAnthropicAdditive = raw.cache_read_input_tokens !== undefined || raw.cache_creation_input_tokens !== undefined || raw.cache_creation !== undefined;
  if (hasAnthropicAdditive) return 'likely_base_excludes_cache_for_anthropic_additive_usage';
  if (hasOpenAiGrossFields || hasDeepSeekMiss) return 'likely_gross_includes_cache';
  if ((u.cache_read_input_tokens ?? 0) > 0 && (u.input_tokens ?? 0) >= (u.cache_read_input_tokens ?? 0)) return 'likely_gross_includes_cache';
  return 'not_confirmed_from_payload';
}

async function main() {
  if (!provider) throw new Error('Usage: probe-llm-usage.mjs <provider> [two-call|anthropic-cache]');
  const spec = modelFor(provider);
  const model = new LLMModel({
    name: spec.name,
    value: spec.value,
    canonicalName: spec.name,
    provider: spec.provider,
  });
  const config = new LLMConfig({
    maxTokens: spec.maxTokens,
    temperature: 0,
    extraParams: spec.extraParams ?? {},
  });
  const llm = new spec.cls(model, config);
  const startedAt = new Date().toISOString();
  const calls = [];
  if (provider === 'anthropic' && mode === 'anthropic-cache') {
    calls.push(await invokeAnthropicWithExplicitCache(llm, 'warmup', user1));
    calls.push(await invokeAnthropicWithExplicitCache(llm, 'probe', user2));
  } else {
    calls.push(await invokeStandard(llm, 'warmup', user1));
    calls.push(await invokeStandard(llm, 'probe', user2));
  }
  await llm.cleanup?.();

  const result = {
    provider,
    mode,
    model: { name: spec.name, value: spec.value, provider: spec.provider },
    started_at: startedAt,
    completed_at: new Date().toISOString(),
    env_files_loaded: loadedEnvFiles.map((file) => path.relative(repoRootForEnv, file)),
    prompt_shape: {
      repeated_prefix_line_count: 260,
      stable_system_prefix_chars: baseSystem.length,
      calls: ['same system prefix; user suffix differs'],
    },
    calls,
    semantic_inference_from_probe_call: inferSemantic(calls[calls.length - 1]),
  };

  await mkdir(evidenceDir, { recursive: true });
  const file = path.join(evidenceDir, `${new Date().toISOString().replace(/[:.]/g, '-')}-${provider}-${mode}.json`);
  await writeFile(file, JSON.stringify(result, null, 2));
  console.log(JSON.stringify({ ok: true, provider, mode, evidence_file: file, probe_usage: calls[calls.length - 1].normalized_usage }, null, 2));
}

main().catch(async (error) => {
  const message = error?.message ?? String(error);
  const failure = { ok: false, provider, mode, error: message, completed_at: new Date().toISOString() };
  await mkdir(evidenceDir, { recursive: true });
  const file = path.join(evidenceDir, `${new Date().toISOString().replace(/[:.]/g, '-')}-${provider ?? 'unknown'}-${mode}-failure.json`);
  await writeFile(file, JSON.stringify(failure, null, 2));
  console.error(JSON.stringify({ ...failure, evidence_file: file }, null, 2));
  process.exit(1);
});
