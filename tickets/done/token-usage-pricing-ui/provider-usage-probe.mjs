#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const envPath = path.join(root, 'autobyteus-ts/.env.test');
const env = { ...process.env };
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const idx = trimmed.indexOf('=');
    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    // This probe is intentionally driven by autobyteus-ts/.env.test.
    // Let the file override inherited shell env so retesting changed keys is deterministic.
    env[key] = value;
  }
}

const optIn = env.AUTOBYTEUS_PROVIDER_USAGE_PROBE === '1' || process.argv.includes('--yes');
if (!optIn) {
  console.error('Refusing to run real provider probes without AUTOBYTEUS_PROVIDER_USAGE_PROBE=1 or --yes.');
  process.exit(2);
}

const selected = new Set(process.argv.filter(a => a.startsWith('--provider=')).map(a => a.split('=')[1]));
const only = (name) => selected.size === 0 || selected.has(name);
const streamMode = process.argv.includes('--stream');
const isUsableKey = (v) => {
  if (typeof v !== 'string') return false;
  const trimmed = v.trim();
  if (!trimmed) return false;
  // Real OpenAI-compatible provider keys commonly start with "sk-".
  // Reject only obvious placeholders without logging any secret material.
  return !/^(changeme|your-|xxx|test|dummy|placeholder|replace[_-]?me|example|todo)/i.test(trimmed);
};

const outDir = path.join(root, 'tickets/in-progress/token-usage-pricing-ui/probe-results');
fs.mkdirSync(outDir, { recursive: true });

const now = new Date().toISOString().replace(/[:.]/g, '-');
const results = [];

function sanitizeStringValue(value) {
  const redacted = value
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, 'Bearer [REDACTED]')
    .replace(/((?:api[_-]?key|access[_-]?token|refresh[_-]?token|secret|key)=)([^&\s]+)/gi, '$1[REDACTED]')
    .replace(/\bsk-[A-Za-z0-9_-]{8,}\b/g, '[REDACTED_SECRET]')
    .replace(/\bAIza[A-Za-z0-9_-]{20,}\b/g, '[REDACTED_SECRET]')
    .replace(/\b[A-Za-z0-9_-]{40,}\b/g, '[REDACTED_LONG_SECRET]');
  return redacted.length > 120 ? `${redacted.slice(0, 40)}…(${redacted.length} chars)` : redacted;
}

function safeText(value) {
  return sanitizeStringValue(String(value ?? '')).slice(0, 500);
}

function safeKeys(obj) {
  if (!obj || typeof obj !== 'object') return null;
  if (Array.isArray(obj)) return obj.map(safeKeys);
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (/api[_-]?key|authorization|token|secret/i.test(k)) continue;
    if (v && typeof v === 'object') out[k] = safeKeys(v);
    else if (typeof v === 'string') out[k] = sanitizeStringValue(v);
    else out[k] = v;
  }
  return out;
}

function summarizeOpenAICompat(json) {
  const choice = json?.choices?.[0] ?? null;
  const message = choice?.message ?? null;
  const delta = choice?.delta ?? null;
  return {
    topLevelKeys: Object.keys(json ?? {}),
    usage: json?.usage ?? null,
    usageKeys: json?.usage ? Object.keys(json.usage) : [],
    promptDetails: json?.usage?.prompt_tokens_details ?? json?.usage?.input_tokens_details ?? null,
    completionDetails: json?.usage?.completion_tokens_details ?? json?.usage?.output_tokens_details ?? null,
    messageKeys: message ? Object.keys(message) : [],
    deltaKeys: delta ? Object.keys(delta) : [],
    hasReasoningContent: Boolean(message?.reasoning_content ?? delta?.reasoning_content),
    hasReasoningTextField: Boolean(message?.reasoning ?? delta?.reasoning),
    finishReason: choice?.finish_reason ?? null,
  };
}

function summarizeAnthropic(json) {
  return {
    topLevelKeys: Object.keys(json ?? {}),
    usage: json?.usage ?? null,
    usageKeys: json?.usage ? Object.keys(json.usage) : [],
    contentTypes: Array.isArray(json?.content) ? json.content.map(c => c?.type) : null,
    contentKeys: Array.isArray(json?.content) ? json.content.map(c => Object.keys(c ?? {})) : null,
    stopReason: json?.stop_reason ?? null,
  };
}

function summarizeGemini(json) {
  const parts = json?.candidates?.[0]?.content?.parts ?? [];
  return {
    topLevelKeys: Object.keys(json ?? {}),
    usageMetadata: json?.usageMetadata ?? null,
    usageKeys: json?.usageMetadata ? Object.keys(json.usageMetadata) : [],
    partKeys: Array.isArray(parts) ? parts.map(p => Object.keys(p ?? {})) : null,
    hasThoughtPart: Array.isArray(parts) ? parts.some(p => p?.thought === true) : false,
    finishReason: json?.candidates?.[0]?.finishReason ?? null,
  };
}

function openAIHeaders(apiKey) {
  const headers = { authorization: `Bearer ${apiKey}` };
  const organization = env.OPENAI_ORG_ID || env.OPENAI_ORGANIZATION;
  const project = env.OPENAI_PROJECT_ID;
  if (organization) headers['OpenAI-Organization'] = organization;
  if (project) headers['OpenAI-Project'] = project;
  return headers;
}

async function postJson(name, url, headers, body, summarizer) {
  const started = Date.now();
  try {
    const res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) });
    const text = await res.text();
    let json = null;
    try { json = text ? JSON.parse(text) : null; } catch {}
    const summary = {
      provider: name,
      attempted: true,
      ok: res.ok,
      status: res.status,
      durationMs: Date.now() - started,
      model: body.model ?? url.match(/models\/([^:/?]+)/)?.[1] ?? null,
      summary: res.ok ? summarizer(json) : { errorKeys: json ? Object.keys(json) : [], error: safeKeys(json) ?? safeText(text) },
    };
    results.push(summary);
    fs.writeFileSync(path.join(outDir, `${now}-${name}.json`), JSON.stringify(summary, null, 2));
    console.log(JSON.stringify(summary, null, 2));
  } catch (error) {
    const summary = { provider: name, attempted: true, ok: false, networkError: safeText(error?.message ?? error) };
    results.push(summary);
    fs.writeFileSync(path.join(outDir, `${now}-${name}.json`), JSON.stringify(summary, null, 2));
    console.log(JSON.stringify(summary, null, 2));
  }
}

async function postOpenAICompatibleChat(name, url, headers, body) {
  if (!streamMode) {
    return postJson(name, url, headers, body, summarizeOpenAICompat);
  }

  const started = Date.now();
  const streamBody = {
    ...body,
    stream: true,
    stream_options: { include_usage: true },
  };

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...headers },
      body: JSON.stringify(streamBody)
    });
    const text = await res.text();
    let errorJson = null;
    if (!res.ok) {
      try { errorJson = text ? JSON.parse(text) : null; } catch {}
      const summary = {
        provider: name,
        attempted: true,
        ok: false,
        stream: true,
        status: res.status,
        durationMs: Date.now() - started,
        model: body.model ?? null,
        summary: { errorKeys: errorJson ? Object.keys(errorJson) : [], error: safeKeys(errorJson) ?? safeText(text) },
      };
      results.push(summary);
      fs.writeFileSync(path.join(outDir, `${now}-${name}-stream.json`), JSON.stringify(summary, null, 2));
      console.log(JSON.stringify(summary, null, 2));
      return;
    }

    let finalUsage = null;
    let usageChunks = 0;
    let parsedEvents = 0;
    let parseErrors = 0;
    let sawReasoningDelta = false;
    let sawReasoningTextField = false;
    let sawContentDelta = false;
    const deltaKeys = new Set();
    const finishReasons = new Set();

    for (const rawLine of text.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line.startsWith('data:')) continue;
      const payload = line.slice('data:'.length).trim();
      if (!payload || payload === '[DONE]') continue;
      let event = null;
      try {
        event = JSON.parse(payload);
        parsedEvents += 1;
      } catch {
        parseErrors += 1;
        continue;
      }

      if (event?.usage) {
        finalUsage = event.usage;
        usageChunks += 1;
      }

      for (const choice of event?.choices ?? []) {
        if (choice?.finish_reason) finishReasons.add(choice.finish_reason);
        const delta = choice?.delta;
        if (!delta || typeof delta !== 'object') continue;
        for (const key of Object.keys(delta)) deltaKeys.add(key);
        if (delta.reasoning_content) sawReasoningDelta = true;
        if (delta.reasoning) sawReasoningTextField = true;
        if (delta.content) sawContentDelta = true;
      }
    }

    const promptDetails = finalUsage?.prompt_tokens_details ?? finalUsage?.input_tokens_details ?? null;
    const completionDetails = finalUsage?.completion_tokens_details ?? finalUsage?.output_tokens_details ?? null;
    const summary = {
      provider: name,
      attempted: true,
      ok: true,
      stream: true,
      status: res.status,
      durationMs: Date.now() - started,
      model: body.model ?? null,
      summary: {
        parsedEvents,
        parseErrors,
        usageChunks,
        usage: finalUsage,
        usageKeys: finalUsage ? Object.keys(finalUsage) : [],
        promptDetails,
        completionDetails,
        deltaKeys: Array.from(deltaKeys),
        sawReasoningDelta,
        sawReasoningTextField,
        sawContentDelta,
        finishReasons: Array.from(finishReasons),
      },
    };
    results.push(summary);
    fs.writeFileSync(path.join(outDir, `${now}-${name}-stream.json`), JSON.stringify(summary, null, 2));
    console.log(JSON.stringify(summary, null, 2));
  } catch (error) {
    const summary = { provider: name, attempted: true, ok: false, stream: true, networkError: safeText(error?.message ?? error) };
    results.push(summary);
    fs.writeFileSync(path.join(outDir, `${now}-${name}-stream.json`), JSON.stringify(summary, null, 2));
    console.log(JSON.stringify(summary, null, 2));
  }
}

async function skip(name, reason) {
  const summary = { provider: name, attempted: false, ok: false, skipped: true, reason };
  results.push(summary);
  console.log(JSON.stringify(summary, null, 2));
}

const prompt = 'Answer with exactly one word: OK';

if (only('openai')) {
  if (isUsableKey(env.OPENAI_API_KEY)) {
    await postJson('openai', 'https://api.openai.com/v1/responses', openAIHeaders(env.OPENAI_API_KEY), {
      // Do not reuse AUTOBYTEUS_LLM_MODEL_ID here: test environments may point it
      // at a routed/non-OpenAI model value. Keep OpenAI probing explicit.
      model: env.OPENAI_PROBE_MODEL || 'gpt-5.4-mini',
      input: prompt,
      max_output_tokens: 64,
      reasoning: { effort: 'low' }
    }, (json) => ({
      topLevelKeys: Object.keys(json ?? {}),
      usage: json?.usage ?? null,
      usageKeys: json?.usage ? Object.keys(json.usage) : [],
      inputDetails: json?.usage?.input_tokens_details ?? null,
      outputDetails: json?.usage?.output_tokens_details ?? null,
      outputItemTypes: Array.isArray(json?.output) ? json.output.map(i => i?.type) : null,
    }));
  } else await skip('openai', 'OPENAI_API_KEY missing/unusable');
}

if (only('deepseek')) {
  if (isUsableKey(env.DEEPSEEK_API_KEY)) {
    await postOpenAICompatibleChat('deepseek', 'https://api.deepseek.com/chat/completions', {
      authorization: `Bearer ${env.DEEPSEEK_API_KEY}`
    }, {
      model: env.DEEPSEEK_PROBE_MODEL || 'deepseek-v4-flash',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 64,
      reasoning_effort: 'high',
      thinking: { type: 'enabled' }
    });
  } else await skip('deepseek', 'DEEPSEEK_API_KEY missing/unusable');
}

if (only('kimi')) {
  if (isUsableKey(env.KIMI_API_KEY)) {
    await postOpenAICompatibleChat('kimi', 'https://api.moonshot.ai/v1/chat/completions', {
      authorization: `Bearer ${env.KIMI_API_KEY}`
    }, {
      model: env.KIMI_PROBE_MODEL || 'kimi-k2.7-code',
      messages: [{ role: 'user', content: prompt }],
      max_completion_tokens: 64,
      prompt_cache_key: `autobyteus-token-probe-${new Date().toISOString().slice(0,10)}`,
      stream: false
    });
  } else await skip('kimi', 'KIMI_API_KEY missing/unusable');
}

if (only('glm')) {
  if (isUsableKey(env.GLM_API_KEY || env.ZHIPU_API_KEY)) {
    await postOpenAICompatibleChat('glm', 'https://open.bigmodel.cn/api/coding/paas/v4/chat/completions', {
      authorization: `Bearer ${env.GLM_API_KEY || env.ZHIPU_API_KEY}`
    }, {
      model: env.GLM_PROBE_MODEL || 'glm-5.2',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 64,
      reasoning_effort: 'high',
      thinking: { type: 'enabled' }
    });
  } else await skip('glm', 'GLM_API_KEY/ZHIPU_API_KEY missing/unusable');
}

if (only('qwen')) {
  const key = env.DASHSCOPE_API_KEY || env.QWEN_API_KEY;
  if (isUsableKey(key)) {
    await postOpenAICompatibleChat('qwen', 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions', {
      authorization: `Bearer ${key}`
    }, {
      model: env.QWEN_PROBE_MODEL || 'qwen3.7-max',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 64
    });
  } else await skip('qwen', 'DASHSCOPE_API_KEY/QWEN_API_KEY missing/unusable');
}

if (only('minimax')) {
  if (isUsableKey(env.MINIMAX_API_KEY)) {
    await postOpenAICompatibleChat('minimax', 'https://api.minimax.io/v1/chat/completions', {
      authorization: `Bearer ${env.MINIMAX_API_KEY}`
    }, {
      model: env.MINIMAX_PROBE_MODEL || 'MiniMax-M3',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 64
    });
  } else await skip('minimax', 'MINIMAX_API_KEY missing/unusable');
}

if (only('anthropic')) {
  if (isUsableKey(env.ANTHROPIC_API_KEY)) {
    await postJson('anthropic', 'https://api.anthropic.com/v1/messages', {
      'x-api-key': env.ANTHROPIC_API_KEY,
      'anthropic-version': env.ANTHROPIC_API_VERSION || '2023-06-01'
    }, {
      model: env.ANTHROPIC_PROBE_MODEL || 'claude-sonnet-4-6',
      max_tokens: 1100,
      thinking: { type: 'enabled', budget_tokens: 1024, display: 'omitted' },
      messages: [{ role: 'user', content: prompt }]
    }, summarizeAnthropic);
  } else await skip('anthropic', 'ANTHROPIC_API_KEY missing/unusable');
}

if (only('gemini')) {
  if (isUsableKey(env.GEMINI_API_KEY || env.VERTEX_AI_API_KEY)) {
    const key = env.GEMINI_API_KEY || env.VERTEX_AI_API_KEY;
    const model = env.GEMINI_PROBE_MODEL || 'gemini-3.5-flash';
    await postJson('gemini', `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`, {}, {
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        maxOutputTokens: 64,
        thinkingConfig: { thinkingBudget: 32, includeThoughts: true }
      }
    }, summarizeGemini);
  } else await skip('gemini', 'GEMINI_API_KEY/VERTEX_AI_API_KEY missing/unusable');
}

fs.writeFileSync(path.join(outDir, `${now}-summary.json`), JSON.stringify(results, null, 2));
console.error(`Wrote sanitized probe summaries to ${outDir}`);
