/**
 * Temporary API/E2E harness (compaction-prompt-cache-reuse, AC-003 + C-010). Not durable: it depends on a private real
 * conversation and its result needs human review.
 *
 * AC-003: one real native-run history (>= 200k tokens) is restored into a real MemoryManager, exactly as on a restore.
 * On the product's own `LlmPhaseSummaryPort` (Opus 5.5) it then produces:
 *   (a) the cached summary request (the agent's conversation + COMPACTION_SUMMARY_INSTRUCTION);
 *   (b) the transcript summary request (COMPACTION_SUMMARY_PROMPT + the rendered compactable history, from the real planner
 *       and CompactionContentBuilder), on the same baseline.
 * Both summaries are parsed with the product parser. Two compacted contexts are then built with the real
 * `prepareCompaction` + validator + commit on two separate MemoryManager copies. The same next user messages are sent to
 * both on the agent's LLM as conversation requests, with the agent's tools. Everything is written to AC3_OUT for the
 * report.
 * C-010: the same two summary requests are sent on a Gemini (Vertex Express) LLM, and the request bodies are captured
 * (system-instruction placement).
 *
 * Run (copied into autobyteus-ts/tests/_ac003/ for the run only):
 *   env -i … RUN_AC003=1 ANTHROPIC_API_KEY=… VERTEX_AI_API_KEY=… AC3_SOURCE=<snapshot dir copy> AC3_OUT=<dir> \
 *     ./node_modules/.bin/vitest run tests/_ac003/ac003-compare.test.ts --no-watch
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { LLMFactory } from '../../src/llm/llm-factory.js';
import type { BaseLLM } from '../../src/llm/base.js';
import { LLMProvider } from '../../src/llm/providers.js';
import { Message, MessageRole } from '../../src/llm/utils/messages.js';
import { SecretValue } from '../../src/secrets/secret-value.js';
import type { ProviderApiKeyResolver } from '../../src/secrets/provider-api-key-resolver.js';
import { registerTools } from '../../src/tools/register-tools.js';
import { ToolSchemaProvider } from '../../src/tools/usage/providers/tool-schema-provider.js';
import { MemoryManager } from '../../src/memory/memory-manager.js';
import { FileMemoryStore } from '../../src/memory/store/file-store.js';
import { WorkingContextSnapshotStore } from '../../src/memory/store/working-context-snapshot-store.js';
import { WorkingContextSnapshotBootstrapOptions, WorkingContextSnapshotBootstrapper } from '../../src/memory/restore/working-context-snapshot-bootstrapper.js';
import { CompactionPolicy } from '../../src/memory/policies/compaction-policy.js';
import { WorkingContextMessageWindowPlanner } from '../../src/memory/compaction/working-context-message-window-planner.js';
import { CompactionContentBuilder } from '../../src/memory/compaction/compaction-content-builder.js';
import { resolveCompactionPlanningBudget } from '../../src/memory/compaction/compaction-planning-budget.js';
import { WorkingContextCompactionOutputValidator } from '../../src/memory/compaction/working-context-compaction-output-validator.js';
import { COMPACTION_SUMMARY_INSTRUCTION as PRODUCT_SUMMARY_INSTRUCTION, COMPACTION_SUMMARY_PROMPT } from '../../src/memory/compaction/compaction-summary-prompt.js';
/** AC3_INSTRUCTION_FILE substitutes a reference wording (e.g. the IR-001 instruction) for the cached request only. */
const COMPACTION_SUMMARY_INSTRUCTION = process.env.AC3_INSTRUCTION_FILE ? fs.readFileSync(process.env.AC3_INSTRUCTION_FILE, 'utf-8') : PRODUCT_SUMMARY_INSTRUCTION;
import { parseCompactionSummary } from '../../src/memory/compaction/compaction-summary-parser.js';
import { estimateMessagesTokens } from '../../src/memory/compaction/message-budget-strategy.js';
import { resolveCompactionTokenBudget, resolveLlmRequestCapacity } from '../../src/agent/token-budget.js';
import { LlmPhaseSummaryPort } from '../../src/agent/loop/llm-phase-summary-port.js';
import { conversationRequestKwargs, conversationRequestOptions } from '../../src/agent/loop/conversation-request.js';
import { sanitizeMediaInputMessages } from '../../src/llm/utils/media-input-sanitizer.js';

const RUN = process.env.RUN_AC003 === '1';
const SOURCE = process.env.AC3_SOURCE ?? '';
const OUT = process.env.AC3_OUT ?? '';
const keyResolver = (): ProviderApiKeyResolver => ({
  async resolve(_provider: string, slot?: string) {
    const value = slot === 'geminiVertexExpressApiKey' ? process.env.VERTEX_AI_API_KEY : process.env.ANTHROPIC_API_KEY;
    if (!value) throw new Error(`missing key for ${slot ?? 'apiKey'}`);
    return SecretValue.fromString(value.trim());
  },
});

/** Records provider request bodies and responses (no headers or keys). */
const captured: Array<{ label: string; host: string; body: Record<string, unknown>; status: number; response: string }> = [];
let label = 'setup';
const originalFetch = globalThis.fetch;
globalThis.fetch = (async (input: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]) => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  const host = (() => { try { return new URL(url).hostname; } catch { return ''; } })();
  const response = await originalFetch(input, init);
  if (host && host !== 'localhost' && typeof init?.body === 'string') {
    let body: Record<string, unknown> = {};
    try { body = JSON.parse(init.body) as Record<string, unknown>; } catch { /* non-JSON */ }
    const record = { label, host, body, status: response.status, response: '' };
    captured.push(record);
    response.clone().text().then((text) => { record.response = text; }).catch(() => undefined);
  }
  return response;
}) as typeof fetch;

const usageOf = (text: string) => {
  const max = (field: string) => { let m: number | null = null; for (const x of text.matchAll(new RegExp(`"${field}"\\s*:\\s*(\\d+)`, 'g'))) m = Math.max(m ?? 0, Number(x[1])); return m; };
  return { input_tokens: max('input_tokens'), cache_read_input_tokens: max('cache_read_input_tokens'), cache_creation_input_tokens: max('cache_creation_input_tokens'),
    output_tokens: max('output_tokens'), promptTokenCount: max('promptTokenCount'), cachedContentTokenCount: max('cachedContentTokenCount') };
};

const copySnapshot = (agentId: string): string => {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'ac003-mem-'));
  const dir = path.join(base, 'agents', agentId);
  fs.mkdirSync(dir, { recursive: true });
  for (const name of fs.readdirSync(SOURCE)) fs.copyFileSync(path.join(SOURCE, name), path.join(dir, name));
  return base;
};
/** Registers a threshold-crossing compaction request and begins its attempt, as the product's gate and executor do. */
const beginCompaction = (memory: MemoryManager, planningBudget: Parameters<MemoryManager['requestCompaction']>[0]['planningBudget'], turnId: string) => {
  const operationId = memory.requestCompaction({ requestedTurnId: turnId, requestKind: 'threshold_crossing', planningBudget });
  memory.beginPendingCompactionAttempt({ operationId, turnId });
  return operationId;
};
const restore = (agentId: string, systemPrompt: string) => {
  const base = copySnapshot(agentId);
  const memory = new MemoryManager({ store: new FileMemoryStore(base, agentId), workingContextSnapshotStore: new WorkingContextSnapshotStore(base, agentId) });
  new WorkingContextSnapshotBootstrapper().bootstrap(memory, systemPrompt, new WorkingContextSnapshotBootstrapOptions());
  return { memory, base };
};

/** Tool schemas the original run used: registry tools as the product builds them; others (server tools) as minimal stubs. */
const toolSchemasFor = (names: string[], provider: LLMProvider) => {
  const known = new ToolSchemaProvider().buildSchema(names, provider);
  const knownNames = new Set(known.map((schema) => String(schema.name ?? (schema as { function?: { name?: string } }).function?.name ?? '')));
  const stubs = names.filter((name) => !knownNames.has(name)).map((name) => provider === LLMProvider.ANTHROPIC
    ? { name, description: `Tool '${name}' from the original run.`, input_schema: { type: 'object', properties: {}, additionalProperties: true } }
    : { name, description: `Tool '${name}' from the original run.`, parameters: { type: 'object', properties: {} } });
  return [...known, ...stubs];
};

/** The same next user messages for both compacted contexts (AC3_CONTINUATIONS JSON array overrides). */
const CONTINUATIONS: string[] = process.env.AC3_CONTINUATIONS ? JSON.parse(process.env.AC3_CONTINUATIONS) as string[] : [
  'Quick check from memory, without running any tools: which ticket was this, what exactly did you finalize (branch, commits, and where it landed), did you release a new version, and is the worktree still there? Is anything still open for you?',
  "I changed my mind again: please prepare the release after all. Do not run anything yet. Based on what you found earlier about how releases work in this repository, tell me step by step what you would do (exact commands, paths, branch and version), and what you would check before and after.",
];

describe.skipIf(!RUN)('AC-003 cached vs transcript summary on one real history', () => {
  it('produces both summaries, both compacted contexts and both continuations', async () => {
    registerTools();
    fs.mkdirSync(OUT, { recursive: true });
    const snapshot = JSON.parse(fs.readFileSync(path.join(SOURCE, 'working_context_snapshot.json'), 'utf-8')) as { agent_id: string; messages: Array<Record<string, any>> };
    const agentId = snapshot.agent_id;
    const systemPrompt = String(snapshot.messages.find((message) => message.role === 'system')?.content ?? '');
    const toolNames = [...new Set(snapshot.messages.flatMap((message) => (message.tool_payload?.tool_calls ?? []).map((call: { name: string }) => call.name)))].sort();
    const historyText = JSON.stringify(snapshot.messages);

    const opus = await LLMFactory.createLLM('claude-opus-5-5', undefined, keyResolver()) as BaseLLM;
    opus.configureSystemPrompt(systemPrompt);
    const tools = toolSchemasFor(toolNames, LLMProvider.ANTHROPIC);
    const { memory } = restore(agentId, systemPrompt);
    const observed = estimateMessagesTokens(memory.getWorkingContextMessages());
    // Place this history at the compaction trigger, as a context-size override in Settings does (the product resolves the
    // request capacity with `activeContextTokensOverride`): input budget ~= observed / 0.8, so compaction is due now.
    const fullCapacity = resolveLlmRequestCapacity(opus.model, opus.config)!;
    const reserved = (fullCapacity.effectiveContextCapacity ?? 0) - fullCapacity.inputBudget;
    const activeContextTokensOverride = Math.floor(observed / 0.8) + reserved - 1000;
    const capacity = resolveLlmRequestCapacity(opus.model, opus.config, { activeContextTokensOverride });
    const port = new LlmPhaseSummaryPort({ agentId, llm: opus, tools, requestCapacity: capacity, notifier: null });
    const budget = resolveCompactionTokenBudget(capacity!, opus.model, opus.config, new CompactionPolicy());
    const planningBudget = resolveCompactionPlanningBudget(budget, observed);
    beginCompaction(memory, planningBudget, 'ac003_turn');
    const baseline = memory.captureCompactionBaseline();
    const source = baseline.context.copy();
    const baselineMessages = source.buildMessages();
    const plan = new WorkingContextMessageWindowPlanner().plan({ messages: baselineMessages, planningBudget });
    const transcript = new CompactionContentBuilder().build(plan.compactableUnits, { maxItemChars: new CompactionPolicy().maxItemChars });
    const meta: Record<string, unknown> = { agentId, toolNames, baselineMessageCount: baselineMessages.length, estimatedBaselineTokens: observed,
      compactableUnits: plan.compactableUnits.length, retainedMessages: plan.retainedMessages.length, transcriptChars: transcript.length,
      fitsInputBudget: port.fitsInputBudget(baselineMessages, COMPACTION_SUMMARY_INSTRUCTION), inputBudget: capacity?.inputBudget,
      activeContextTokensOverride, triggerThresholdTokens: budget.triggerThresholdTokens, postCompactionTarget: planningBudget,
      cachedInstructionFirstLine: COMPACTION_SUMMARY_INSTRUCTION.trim().split('\n')[0], continuations: CONTINUATIONS };
    const signal = new AbortController().signal;

    label = 'opus-cached';
    const cached = await port.requestCachedSummary(baselineMessages, COMPACTION_SUMMARY_INSTRUCTION, { operationId: 'ac003', executionTurnId: 'ac003_turn', attempt: 1 }, signal);
    label = 'opus-transcript';
    const transcriptResult = await port.requestTranscriptSummary(COMPACTION_SUMMARY_PROMPT, transcript, { operationId: 'ac003', executionTurnId: 'ac003_turn', attempt: 2 }, signal);
    await new Promise((resolve) => setTimeout(resolve, 500));
    const results: Record<string, any> = {};
    for (const [mode, result] of [['cached', cached], ['transcript', transcriptResult]] as const) {
      let summary: string | null = null; let parseError: string | null = null;
      try { summary = parseCompactionSummary(result.content); } catch (error) { parseError = String(error); }
      results[mode] = { summary, parseError, hasToolCalls: result.hasToolCalls, metadata: result.metadata, rawContentChars: result.content.length };
    }

    // Identifier check: every path, hash or backticked identifier in a summary must occur in the original history.
    const identifiers = (text: string) => [...new Set([...text.matchAll(/`([^`\n]{3,200})`/g)].map((m) => m[1]!)
      .concat([...text.matchAll(/\b[0-9a-f]{7,40}\b/g)].map((m) => m[0]))
      .concat([...text.matchAll(/(?:\/[\w.@-]+){2,}/g)].map((m) => m[0])))];
    for (const mode of ['cached', 'transcript']) {
      const summary = results[mode].summary as string | null;
      if (!summary) continue;
      const ids = identifiers(summary);
      results[mode].identifierCheck = { total: ids.length, notInHistory: ids.filter((id) => !historyText.includes(id)) };
    }

    // Two compacted contexts with the real prepareCompaction + validator + commit, then the same continuations.
    for (const mode of ['cached', 'transcript']) {
      const summary = results[mode].summary as string | null;
      if (!summary) { results[mode].continuation = 'skipped: no valid summary'; continue; }
      const copy = restore(agentId, systemPrompt).memory;
      beginCompaction(copy, planningBudget, `ac003_${mode}_compaction`);
      const copyBaseline = copy.captureCompactionBaseline();
      const copySource = copyBaseline.context.copy();
      const copyPlan = new WorkingContextMessageWindowPlanner().plan({ messages: copySource.buildMessages(), planningBudget });
      const accepted = copy.prepareCompaction(copyBaseline, { selectedNewRawTraceIds: copyPlan.rawTraceIdsToArchive,
        retainedMessages: copyPlan.retainedMessages, summary, budgetAssessment: copyPlan.budgetAssessment });
      new WorkingContextCompactionOutputValidator().assertValid(copyBaseline.context, copySource, accepted, copyPlan);
      copy.commitAcceptedCompaction(accepted, signal);
      const compacted = copy.getWorkingContextMessages();
      const turns: Array<Record<string, unknown>> = [];
      let conversation = [...compacted];
      for (const [index, text] of CONTINUATIONS.entries()) {
        conversation = [...conversation, new Message(MessageRole.USER, { content: text })];
        label = `opus-continue-${mode}-${index + 1}`;
        const outbound = await sanitizeMediaInputMessages([...conversation], opus.model.multimodalCapabilities);
        let content = ''; const toolCalls: unknown[] = [];
        for await (const chunk of opus.streamMessages(outbound.outboundMessages, conversationRequestKwargs(`ac003_${mode}`, tools),
          conversationRequestOptions({ signal, turnId: `ac003_${mode}_${index + 1}` }))) {
          if (chunk.content) content += chunk.content;
          if (chunk.tool_calls?.length) toolCalls.push(...chunk.tool_calls);
        }
        turns.push({ user: text, assistant: content, toolCallDeltas: toolCalls.length, identifiersNotInHistory: identifiers(content).filter((id) => !historyText.includes(id)) });
        conversation = [...conversation, new Message(MessageRole.ASSISTANT, { content })];
      }
      results[mode].compactedMessageCount = compacted.length;
      results[mode].compactedEstimatedTokens = estimateMessagesTokens(compacted);
      results[mode].continuation = turns;
    }

    // C-010: the same two summary requests on Gemini (Vertex Express); request bodies captured.
    const c010: Record<string, unknown> = {};
    if (process.env.VERTEX_AI_API_KEY) {
      const gemini = await LLMFactory.createLLM('gemini-3.8-flash', undefined, keyResolver(), async () => ({ kind: 'vertexExpress' })) as BaseLLM;
      gemini.configureSystemPrompt(systemPrompt);
      const geminiTools = toolSchemasFor(toolNames, LLMProvider.GEMINI);
      const geminiPort = new LlmPhaseSummaryPort({ agentId, llm: gemini, tools: geminiTools, requestCapacity: resolveLlmRequestCapacity(gemini.model, gemini.config, { activeContextTokensOverride }), notifier: null });
      for (const [mode, run] of [
        ['cached', () => geminiPort.requestCachedSummary(baselineMessages, COMPACTION_SUMMARY_INSTRUCTION, { operationId: 'c010', executionTurnId: 'c010_turn', attempt: 1 }, signal)],
        ['transcript', () => geminiPort.requestTranscriptSummary(COMPACTION_SUMMARY_PROMPT, transcript, { operationId: 'c010', executionTurnId: 'c010_turn', attempt: 2 }, signal)],
      ] as const) {
        label = `gemini-${mode}`;
        try {
          const result = await run();
          let parsed = false; try { parseCompactionSummary(result.content); parsed = true; } catch { /* recorded */ }
          c010[mode] = { parsed, hasToolCalls: result.hasToolCalls, completion: result.metadata.completionStatus, chars: result.content.length, summary: result.content };
        } catch (error) { c010[mode] = { error: String(error).slice(0, 800) }; }
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 1500));
    const calls = captured.map((call) => {
      const body = call.body as Record<string, any>;
      const geminiConfig = (body.generationConfig ?? body.config ?? {}) as Record<string, any>;
      const systemInstruction = body.systemInstruction ?? geminiConfig.systemInstruction ?? null;
      return { label: call.label, host: call.host, status: call.status, usage: usageOf(call.response),
        anthropicSystemChars: typeof body.system === 'string' ? body.system.length : Array.isArray(body.system) ? JSON.stringify(body.system).length : null,
        messageCount: Array.isArray(body.messages) ? body.messages.length : Array.isArray(body.contents) ? body.contents.length : null,
        geminiSystemInstruction: systemInstruction === null ? null : JSON.stringify(systemInstruction).slice(0, 400),
        geminiContentsRoles: Array.isArray(body.contents) ? [...new Set((body.contents as any[]).map((c) => c.role))] : null,
        geminiFirstContentText: Array.isArray(body.contents) ? JSON.stringify(body.contents[0]).slice(0, 400) : null,
        summaryPromptInSystemInstruction: systemInstruction ? JSON.stringify(systemInstruction).includes('You summarize the conversation history') : null,
        agentPromptInSystemInstruction: systemInstruction ? JSON.stringify(systemInstruction).includes(systemPrompt.slice(0, 60)) : null,
        summaryPromptInContents: Array.isArray(body.contents) ? JSON.stringify(body.contents).includes('You summarize the conversation history') : null };
    });
    // C-010 excerpts: what the Gemini requests carry as system instruction and as first/last content (bounded).
    const geminiBodies = captured.filter((call) => call.label.startsWith('gemini-')).map((call) => {
      const body = call.body as Record<string, any>;
      const contents = Array.isArray(body.contents) ? body.contents as any[] : [];
      const si = body.systemInstruction ?? body.generationConfig?.systemInstruction ?? body.config?.systemInstruction ?? null;
      const siText = si === null ? null : (typeof si === 'string' ? si : JSON.stringify(si));
      return { label: call.label, topLevelKeys: Object.keys(body), generationConfigKeys: Object.keys(body.generationConfig ?? {}),
        systemInstructionChars: siText?.length ?? null, systemInstructionStart: siText?.slice(0, 300) ?? null,
        systemInstructionHasSummaryPrompt: siText?.includes('You summarize the conversation history') ?? false,
        contentsCount: contents.length, firstContentStart: JSON.stringify(contents[0] ?? null).slice(0, 300),
        lastContentStart: JSON.stringify(contents.at(-1) ?? null).slice(0, 300),
        contentsHaveSummaryPrompt: JSON.stringify(contents).includes('You summarize the conversation history') };
    });
    fs.writeFileSync(path.join(OUT, 'ac003-results.json'), JSON.stringify({ meta, results, c010, calls, geminiBodies }, null, 2));
    expect(results.cached.summary, String(results.cached.parseError)).toBeTruthy();
    expect(results.transcript.summary, String(results.transcript.parseError)).toBeTruthy();
  }, 3_600_000);
});
