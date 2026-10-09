// Gemini cache lab: live probes of native AutoByteus Gemini request caching.
// Credentials come only from an isolated lab vault (LAB_DATABASE_URL); values are never printed.
// Usage: node gemini-cache-lab.mjs <experiment> [--model gemini-3.8-flash] [--calls 12] [--out file.jsonl]
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const worktree = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../../..');
const serverRoot = path.join(worktree, 'autobyteus-server-ts');
const coreRoot = path.join(worktree, 'autobyteus-ts');
const imp = (p) => import(pathToFileURL(p).href);
const requireFromServer = createRequire(path.join(serverRoot, 'package.json'));

const args = process.argv.slice(2);
const experiment = args[0] ?? 'loop';
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : fallback;
};
const modelName = opt('model', 'gemini-3.8-flash');
const calls = Number(opt('calls', '10'));
const outFile = opt('out', null);
const delayMs = Number(opt('delay-ms', '0'));
const resultTokens = Number(opt('result-chars', '6000'));
const runtimeKind = opt('runtime', 'vertexExpress');
const thinking = opt('thinking', 'medium');
const labDatabaseUrl = process.env.LAB_DATABASE_URL;
if (!labDatabaseUrl) throw new Error('LAB_DATABASE_URL_REQUIRED');

// Load the ESM build, the same module instance the server dist imports.
const prismaPackageDir = path.dirname(requireFromServer.resolve('repository_prisma/package.json'));
const { initializePrisma, shutdownPrisma } = await import(pathToFileURL(path.join(prismaPackageDir, 'dist/index.mjs')).href);
const { ApplicationDatabaseLocation } = await imp(path.join(serverRoot, 'dist/config/application-database-location.js'));
const { getSecretVaultRuntime } = await imp(path.join(serverRoot, 'dist/secret-management/secret-vault-runtime.js'));
const { createLlmProviderApiKeyResolver } = await imp(path.join(serverRoot, 'dist/secret-management/resolution/secret-management-provider-api-key-resolver.js'));
const { GeminiLLM } = await imp(path.join(coreRoot, 'dist/llm/api/gemini-llm.js'));
const { LLMModel } = await imp(path.join(coreRoot, 'dist/llm/models.js'));
const { LLMProvider } = await imp(path.join(coreRoot, 'dist/llm/providers.js'));
const { LLMConfig } = await imp(path.join(coreRoot, 'dist/llm/utils/llm-config.js'));
const { Message, MessageRole, ToolCallPayload, ToolResultPayload } = await imp(path.join(coreRoot, 'dist/llm/utils/messages.js'));
const { initializeGeminiClientWithRuntime } = await imp(path.join(coreRoot, 'dist/utils/gemini-helper.js'));

const location = ApplicationDatabaseLocation.fromAbsoluteFileUrl(labDatabaseUrl);
await initializePrisma({ datasourceUrl: location.databaseUrl });
await getSecretVaultRuntime().initialize(location);
const resolver = createLlmProviderApiKeyResolver();
const runtimeSelection = async () => (runtimeKind === 'aiStudio' ? { kind: 'aiStudio' } : { kind: 'vertexExpress' });

// Realistic, stable ~20K-token system prompt built from repository skill text.
const skillRoot = path.join(worktree, '.claude/skills/solution-designer');
const systemPromptSource = [
  'SKILL.md', 'references/requirements-engineering.md', 'references/architecture-design.md', 'design-principles.md',
].map((f) => { try { return fs.readFileSync(path.join(skillRoot, f), 'utf8'); } catch { return ''; } }).join('\n\n');
const repoSkillRoot = '/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/.claude/skills/solution-designer';
const systemPrompt = systemPromptSource.trim().length > 1000 ? systemPromptSource : [
  'SKILL.md', 'references/requirements-engineering.md', 'references/architecture-design.md', 'design-principles.md',
].map((f) => fs.readFileSync(path.join(repoSkillRoot, f), 'utf8')).join('\n\n');

const tools = [{
  functionDeclarations: [
    { name: 'read_section', description: 'Read one numbered section of the project document. Call it once per section, in order.',
      parameters: { type: 'object', properties: { section: { type: 'integer', description: 'Section number, starting at 1.' } }, required: ['section'] } },
    { name: 'finish', description: 'Call when every requested section has been read.',
      parameters: { type: 'object', properties: { summary: { type: 'string' } }, required: ['summary'] } },
  ],
}];

const sectionText = (n) => {
  const base = `Section ${n}. `;
  let s = base;
  let i = 0;
  while (s.length < resultTokens) { s += `Line ${n}.${i}: the ledger records event ${n * 1000 + i} with checksum ${(n * 7919 + i * 104729) % 1000003}. `; i += 1; }
  return s;
};

const model = new LLMModel({ name: modelName, value: modelName, canonicalName: modelName, provider: LLMProvider.GEMINI });
const newLlm = (extraParams = {}) => {
  const llm = new GeminiLLM(model, new LLMConfig({ extraParams: { thinking_level: thinking, ...extraParams } }), resolver, runtimeSelection);
  llm.configureSystemPrompt(systemPrompt);
  return llm;
};

const out = outFile ? fs.createWriteStream(outFile, { flags: 'a' }) : null;
const record = (row) => {
  const line = JSON.stringify({ ts: new Date().toISOString(), experiment, model: modelName, runtime: runtimeKind, ...row });
  console.log(line);
  out?.write(line + '\n');
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function streamOnce(llm, messages) {
  let content = '';
  const toolCalls = [];
  let usage = null;
  const t0 = Date.now();
  for await (const chunk of llm.streamMessages(messages, null, { tools }, {})) {
    if (chunk.content) content += chunk.content;
    for (const d of chunk.tool_calls ?? []) toolCalls.push(d);
    if (chunk.usage) usage = chunk.usage;
  }
  return { content, toolCalls, usage, ms: Date.now() - t0 };
}

const usageRow = (u) => ({
  prompt: u?.inputTokens ?? u?.input_tokens ?? null,
  cached: u?.cacheReadInputTokens ?? u?.cache_read_input_tokens ?? null,
  raw: u?.raw_usage_json ?? null,
});

async function agentLoop(label, llm) {
  const messages = [
    new Message(MessageRole.SYSTEM, systemPrompt),
    new Message(MessageRole.USER, `Read sections 1 through ${calls} with read_section, one call per response, in order. Do not summarize until all are read; then call finish.`),
  ];
  let previousPrompt = null;
  for (let call = 1; call <= calls; call += 1) {
    if (delayMs && call > 1) await sleep(delayMs);
    const res = await streamOnce(llm, messages);
    const u = usageRow(res.usage);
    const raw = u.raw ?? {};
    const prompt = raw.promptTokenCount ?? u.prompt;
    const cached = raw.cachedContentTokenCount ?? u.cached ?? 0;
    record({ label, call, prompt, cached, previousPrompt, cacheableUpperBound: previousPrompt,
      hitOfPrompt: prompt ? +(cached / prompt).toFixed(3) : null,
      hitOfCacheable: previousPrompt ? +(cached / previousPrompt).toFixed(3) : null,
      ms: res.ms, toolCalls: res.toolCalls.map((t) => t.name) });
    previousPrompt = prompt;
    if (!res.toolCalls.length) break;
    const specs = res.toolCalls.map((d, i) => ({
      id: d.call_id ?? `call_${call}_${i}`, name: d.name, arguments: JSON.parse(d.arguments_delta || '{}'), nativeToolCallContext: d.native_context ?? undefined,
    }));
    messages.push(new Message(MessageRole.ASSISTANT, { content: res.content || null, tool_payload: new ToolCallPayload(specs) }));
    for (const s of specs) {
      const result = s.name === 'read_section' ? sectionText(Number(s.arguments.section ?? call)) : 'done';
      messages.push(new Message(MessageRole.TOOL, { tool_payload: new ToolResultPayload(s.id, s.name, result) }));
    }
    if (specs.some((s) => s.name === 'finish')) break;
  }
}

try {
  if (experiment === 'loop') {
    await agentLoop('native-current', newLlm());
  } else if (experiment === 'probe-explicit') {
    // Is explicit context caching available on this runtime/model? Create, use once, delete.
    const { client } = await initializeGeminiClientWithRuntime(await runtimeSelection(), resolver, {});
    let cache = null;
    try {
      cache = await client.caches.create({ model: modelName, config: { systemInstruction: systemPrompt, tools, ttl: '300s', displayName: 'autobyteus-cache-lab' } });
      record({ label: 'explicit-create', ok: true, cacheName: cache.name ? '[redacted-name]' : null, usageMetadata: cache.usageMetadata ?? null, expireTime: cache.expireTime ?? null });
      const res = await client.models.generateContent({ model: modelName, contents: [{ role: 'user', parts: [{ text: 'Reply with OK.' }] }], config: { cachedContent: cache.name } });
      record({ label: 'explicit-use', usage: res.usageMetadata ?? null });
    } catch (error) {
      record({ label: 'explicit-error', ok: false, status: error?.status ?? null, message: String(error?.message ?? error).slice(0, 600) });
    } finally {
      if (cache?.name) { try { await client.caches.delete({ name: cache.name }); record({ label: 'explicit-delete', ok: true }); } catch (e) { record({ label: 'explicit-delete', ok: false, message: String(e?.message ?? e).slice(0, 300) }); } }
    }
  } else if (experiment === 'replay') {
    // Replay exact production request prefixes from a working_context_snapshot.json.
    const snapshotPath = opt('snapshot', null);
    const from = Number(opt('from', '40'));
    const count = Number(opt('count', '10'));
    const maxTokens = Number(opt('max-tokens', '512'));
    const snap = JSON.parse(fs.readFileSync(snapshotPath, 'utf8')).messages;
    const toMessage = (x) => {
      let payload = null;
      if (x.tool_payload?.tool_calls) payload = new ToolCallPayload(x.tool_payload.tool_calls.map((c) => ({ id: c.id, name: c.name, arguments: c.arguments ?? {}, nativeToolCallContext: c.nativeToolCallContext })));
      else if (x.tool_payload?.tool_call_id) payload = new ToolResultPayload(x.tool_payload.tool_call_id, x.tool_payload.tool_name, x.tool_payload.tool_result, x.tool_payload.tool_error ?? null);
      return new Message(x.role, { content: x.content, reasoning_content: x.reasoning_content, image_urls: x.image_urls ?? [], audio_urls: x.audio_urls ?? [], video_urls: x.video_urls ?? [], tool_payload: payload });
    };
    const messages = snap.map(toMessage);
    const toolNames = [...new Set(snap.flatMap((x) => x.tool_payload?.tool_calls?.map((c) => c.name) ?? []))].sort();
    const replayTools = [{ functionDeclarations: toolNames.map((name) => ({ name, description: `Tool ${name}.`, parameters: { type: 'object', properties: {} } })) }];
    const llm = new GeminiLLM(model, new LLMConfig({ maxTokens, extraParams: { thinking_level: thinking } }), resolver, runtimeSelection);
    llm.configureSystemPrompt(snap[0].content);
    const callIdx = snap.map((x, i) => (x.role === 'assistant' ? i : -1)).filter((i) => i >= 0);
    let previousPrompt = null;
    const delays = (opt('delays', '') || '').split(',').filter(Boolean).map(Number);
    for (const [n, ci] of callIdx.slice(from, from + count).entries()) {
      const wait = n > 0 ? (delays.length ? (delays[n - 1] ?? delays[delays.length - 1]) * 1000 : delayMs) : 0;
      if (wait) await sleep(wait);
      let usage = null; const t0 = Date.now();
      try {
        for await (const chunk of llm.streamMessages(messages.slice(0, ci), null, { tools: replayTools }, {})) if (chunk.usage) usage = chunk.usage;
      } catch (error) { record({ label: 'replay-error', call: from + n, message: String(error?.message ?? error).slice(0, 400) }); continue; }
      const raw = usage?.raw_usage_json ?? {};
      const prompt = raw.promptTokenCount ?? null; const cached = raw.cachedContentTokenCount ?? 0;
      record({ label: opt('label', 'replay'), call: from + n, messageIndex: ci, prompt, cached, previousPrompt,
        uncached: prompt - cached, newTail: previousPrompt ? prompt - previousPrompt : null,
        hitOfPrompt: prompt ? +(cached / prompt).toFixed(3) : null, ms: Date.now() - t0 });
      previousPrompt = prompt;
    }
  } else {
    throw new Error(`UNKNOWN_EXPERIMENT ${experiment}`);
  }
} finally {
  out?.end();
  await getSecretVaultRuntime().close();
  await shutdownPrisma();
}
