// Ticket-local real-provider smoke for anthropic-incomplete-content-block Step 2 (AC-010 on real
// streams). Not committed: a copy is kept in the ticket's probes/ folder as evidence.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { LLMUserMessage } from 'autobyteus-ts/llm/user-message.js';
import { LiveE2eHarness } from '../../../../test-support/live-e2e/live-e2e-harness.js';

const enabled = process.env.RUN_REAL_E2E === '1';
const run = enabled ? describe : describe.skip;

type Case = { id: string; scenario: string; model: string };
const cases: Case[] = [
  { id: 'anthropic', scenario: 'anthropic.llm', model: 'claude-opus-5-5' },
  { id: 'openai', scenario: 'openai.llm', model: 'gpt-5.4-mini' },
  { id: 'deepseek', scenario: 'deepseek.llm', model: 'deepseek-v4-flash' },
  { id: 'glm', scenario: 'openai.llm', model: 'glm-5.3' },
  { id: 'gemini', scenario: 'gemini.vertex-express.llm', model: 'gemini-3.8-flash' },
  { id: 'grok', scenario: 'openai.llm', model: 'grok-4.7' },
];

const WRITE_FILE_TOOL = {
  name: 'write_file',
  description: 'Write a file to disk.',
  input_schema: {
    type: 'object',
    properties: { path: { type: 'string' }, content: { type: 'string' } },
    required: ['path', 'content'],
  },
};

const collect = async (llm: any, content: string, kwargs: Record<string, unknown>) => {
  const chunks: any[] = [];
  for await (const chunk of llm.streamUserMessage(new LLMUserMessage({ content }), kwargs)) chunks.push(chunk);
  return chunks;
};

const summarize = (chunks: any[]) => ({
  terminalChunks: chunks.filter((chunk) => chunk.is_complete).length,
  terminalIsLast: Boolean(chunks.at(-1)?.is_complete),
  finish: chunks.at(-1)?.finish ?? null,
  nativeTurnChunks: chunks.filter((chunk) => chunk.providerNativeAssistantTurn).length,
  toolDeltaChunks: chunks.filter((chunk) => chunk.tool_calls?.length).length,
  textLength: chunks.map((chunk) => chunk.content ?? '').join('').length,
});

run('finish real-provider smoke', () => {
  let harness: LiveE2eHarness;
  beforeAll(async () => { harness = await LiveE2eHarness.open(); });
  afterAll(async () => { await harness?.close(); });

  for (const testCase of cases) {
    it(`${testCase.id}: a small max_tokens ends with one terminal chunk and finish output_limit`, async () => {
      const execution = await harness.requireScenario(testCase.scenario);
      await execution.activateGeminiMode();
      const llm = await execution.createLlm(testCase.model, { max_tokens: 24 });
      let summary;
      let error: string | null = null;
      try {
        summary = summarize(await collect(llm, 'Count from 1 to 300, separated by single spaces. Output only the numbers.',
          { logicalConversationId: `finish-smoke-${testCase.id}` }));
      } catch (caught) {
        error = String((caught as Error)?.message ?? caught).slice(0, 300);
      } finally {
        await llm.cleanup();
      }
      process.stdout.write(`${JSON.stringify({ case: testCase.id, model: testCase.model, kind: 'text_cut', error, ...summary })}\n`);
      expect(error).toBeNull();
      expect(summary!.terminalChunks).toBe(1);
      expect(summary!.terminalIsLast).toBe(true);
      expect(summary!.finish?.reason).toBe('output_limit');
    }, 240_000);
  }

  it('anthropic: a write_file call cut by max_tokens is classified (no "content block is incomplete")', async () => {
    const execution = await harness.requireScenario('anthropic.llm');
    const llm = await execution.createLlm('claude-opus-5-5', { max_tokens: 400 });
    let summary;
    let error: string | null = null;
    try {
      summary = summarize(await collect(llm,
        'Call write_file now to write /tmp/essay.md containing a 3000-word essay about rivers. Do not reply with text first.',
        { logicalConversationId: 'finish-smoke-anthropic-tool', tools: [WRITE_FILE_TOOL] }));
    } catch (caught) {
      error = String((caught as Error)?.message ?? caught).slice(0, 300);
    } finally {
      await llm.cleanup();
    }
    process.stdout.write(`${JSON.stringify({ case: 'anthropic', model: 'claude-opus-5-5', kind: 'tool_cut', error, ...summary })}\n`);
    expect(error).toBeNull();
    expect(summary!.terminalChunks).toBe(1);
    expect(summary!.finish).toEqual({ reason: 'output_limit', providerReason: 'max_tokens' });
    expect(summary!.nativeTurnChunks).toBe(0);
  }, 240_000);
});
