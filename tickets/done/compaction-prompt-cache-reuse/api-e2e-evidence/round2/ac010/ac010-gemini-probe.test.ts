/**
 * AC-010 probe (temporary; copied into autobyteus-ts/tests/_ac010/ for a run, then removed).
 * On each Gemini runtime (Gemini API key = aiStudio, Vertex Express): (1) a normal agent request must carry the agent's
 * own system prompt as `systemInstruction`; (2) the transcript fallback request through the product's
 * LlmPhaseSummaryPort must carry exactly COMPACTION_SUMMARY_PROMPT, and its reply must parse. Bodies are captured at fetch.
 * Keys come from env (AC010_GEMINI_API_KEY / AC010_VERTEX_AI_API_KEY); nothing secret is written.
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { LLMFactory } from '../../src/llm/llm-factory.js';
import type { BaseLLM } from '../../src/llm/base.js';
import { Message, MessageRole } from '../../src/llm/utils/messages.js';
import { SecretValue } from '../../src/secrets/secret-value.js';
import type { ProviderApiKeyResolver } from '../../src/secrets/provider-api-key-resolver.js';
import { COMPACTION_SUMMARY_PROMPT } from '../../src/memory/compaction/compaction-summary-prompt.js';
import { parseCompactionSummary } from '../../src/memory/compaction/compaction-summary-parser.js';
import { resolveLlmRequestCapacity } from '../../src/agent/token-budget.js';
import { LlmPhaseSummaryPort } from '../../src/agent/loop/llm-phase-summary-port.js';
import { conversationRequestKwargs, conversationRequestOptions } from '../../src/agent/loop/conversation-request.js';

const OUT = process.env.AC010_OUT ?? '';
const AGENT_PROMPT = 'You are Release Helper, an engineering agent for the AutoByteus repository. Work carefully and report exactly what you did.';
const TRANSCRIPT = [
  'Here is the conversation history of the target agent whose conversation history needs to be compacted.',
  '[USER] Please rename autobyteus-ts/src/tools/old-name.ts to new-name.ts and update the imports. Do not touch tests.',
  '[ASSISTANT] I will rename the file and update the two importers.',
  '[TOOL_CALL] run_bash {"command": "git mv autobyteus-ts/src/tools/old-name.ts autobyteus-ts/src/tools/new-name.ts"}',
  '[TOOL_RESULT] exitCode 0',
  '[TOOL_CALL] edit_file {"path": "autobyteus-ts/src/tools/index.ts"}',
  '[TOOL_RESULT] edited 1 line',
  '[ASSISTANT] Renamed and updated autobyteus-ts/src/tools/index.ts. I believe nothing else imports it, but I have not searched yet.',
  '[USER] Thanks. Also check the docs later; for now stop here.',
].join('\n');

const resolver = (): ProviderApiKeyResolver => ({
  async resolve(_provider: string, slot?: string) {
    const value = slot === 'geminiAiStudioApiKey' ? process.env.AC010_GEMINI_API_KEY : process.env.AC010_VERTEX_AI_API_KEY;
    if (!value) throw new Error(`missing key for ${slot}`);
    return SecretValue.fromString(value.trim());
  },
});

const captured: Array<{ label: string; host: string; body: Record<string, any>; status: number }> = [];
let label = 'setup';
const originalFetch = globalThis.fetch;
globalThis.fetch = (async (input: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]) => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  const response = await originalFetch(input, init);
  if (typeof init?.body === 'string') {
    let body: Record<string, any> = {};
    try { body = JSON.parse(init.body); } catch { /* non-JSON */ }
    captured.push({ label, host: new URL(url).hostname, body, status: response.status });
  }
  return response;
}) as typeof fetch;

const systemText = (body: Record<string, any>): string | null => {
  const si = body.systemInstruction ?? body.generationConfig?.systemInstruction ?? null;
  if (si === null) return null;
  if (typeof si === 'string') return si;
  return Array.isArray(si.parts) ? si.parts.map((part: any) => String(part.text ?? '')).join('') : JSON.stringify(si);
};
const withRetry = async <T>(run: () => Promise<T>): Promise<T> => {
  for (let attempt = 1; ; attempt += 1) {
    try { return await run(); } catch (error) {
      if (attempt >= 4 || !/429|RESOURCE_EXHAUSTED/.test(String(error))) throw error;
      await new Promise((resolve) => setTimeout(resolve, 65_000));
    }
  }
};

describe.skipIf(process.env.RUN_AC010 !== '1')('AC-010 Gemini system prompt from the request', () => {
  it('normal request carries the agent prompt; transcript fallback carries the summary prompt and parses', async () => {
    fs.mkdirSync(OUT, { recursive: true });
    const results: Record<string, any> = {};
    const runtimes = (process.env.AC010_RUNTIMES ?? 'aiStudio,vertexExpress').split(',') as Array<'aiStudio' | 'vertexExpress'>;
    for (const runtime of runtimes) {
      const llm = await LLMFactory.createLLM('gemini-3.8-flash', undefined, resolver(), async () => ({ kind: runtime })) as BaseLLM;
      llm.configureSystemPrompt(AGENT_PROMPT);
      const r: Record<string, any> = {};
      const signal = new AbortController().signal;
      label = `${runtime}-agent`;
      try {
        let content = '';
        await withRetry(async () => {
          content = '';
          for await (const chunk of llm.streamMessages(
            [new Message(MessageRole.SYSTEM, { content: AGENT_PROMPT }), new Message(MessageRole.USER, { content: 'Reply with only the word ok.' })],
            conversationRequestKwargs(`ac010_${runtime}`, []), conversationRequestOptions({ signal, turnId: `ac010_${runtime}` }))) {
            if (chunk.content) content += chunk.content;
          }
        });
        r.agent = { reply: content.slice(0, 50) };
      } catch (error) { r.agent = { error: String(error).slice(0, 400) }; }
      label = `${runtime}-transcript`;
      try {
        const port = new LlmPhaseSummaryPort({ agentId: `ac010_${runtime}`, llm, tools: [], requestCapacity: resolveLlmRequestCapacity(llm.model, llm.config), notifier: null });
        const result = await withRetry(() => port.requestTranscriptSummary(COMPACTION_SUMMARY_PROMPT, TRANSCRIPT, { operationId: 'ac010', executionTurnId: 'ac010_turn', attempt: 3 }, signal));
        let parsed = false; let parseError: string | null = null;
        try { parseCompactionSummary(result.content); parsed = true; } catch (error) { parseError = String(error).slice(0, 300); }
        r.transcript = { parsed, parseError, completion: result.metadata.completionStatus, summary: result.content };
      } catch (error) { r.transcript = { error: String(error).slice(0, 400) }; }
      const ok = (l: string) => captured.filter((call) => call.label === l && call.status === 200);
      r.agentBodies = ok(`${runtime}-agent`).map((call) => ({ host: call.host, systemInstructionIsAgentPrompt: systemText(call.body) === AGENT_PROMPT, contents: call.body.contents?.length }));
      r.transcriptBodies = ok(`${runtime}-transcript`).map((call) => ({ host: call.host, systemInstructionIsSummaryPrompt: systemText(call.body) === COMPACTION_SUMMARY_PROMPT,
        systemInstructionStart: systemText(call.body)?.slice(0, 80) ?? null, contents: call.body.contents?.length }));
      r.statuses = captured.filter((call) => call.label.startsWith(runtime)).map((call) => `${call.label}:${call.status}`);
      results[runtime] = r;
    }
    fs.writeFileSync(path.join(OUT, 'ac010-results.json'), JSON.stringify(results, null, 2));
    for (const runtime of runtimes) {
      expect(results[runtime].agentBodies.length, `${runtime} agent request accepted`).toBeGreaterThan(0);
      expect(results[runtime].agentBodies.every((b: any) => b.systemInstructionIsAgentPrompt), `${runtime} agent prompt`).toBe(true);
      expect(results[runtime].transcriptBodies.every((b: any) => b.systemInstructionIsSummaryPrompt), `${runtime} summary prompt`).toBe(true);
      expect(results[runtime].transcript.parsed, `${runtime} transcript reply parses`).toBe(true);
    }
  }, 900_000);
});
