// Ticket-local real-provider smoke for anthropic-incomplete-content-block Step 1 (RSK-004).
// Not committed: a copy is kept in the ticket's probes/ folder as evidence.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { LLMUserMessage } from 'autobyteus-ts/llm/user-message.js';
import { LiveE2eHarness } from '../../../../test-support/live-e2e/live-e2e-harness.js';

const enabled = process.env.RUN_REAL_E2E === '1';
const run = enabled ? describe : describe.skip;

type Case = { id: string; model: string; expectedParameter: string; scenario: string };

// Unconfigured = catalog maximum (or omitted); configured = small explicit limit that must be honored.
const cases: Case[] = [
  { id: 'anthropic', scenario: 'anthropic.llm', model: 'claude-opus-5-5', expectedParameter: 'max_tokens=128000 (streaming)' },
  { id: 'openai', scenario: 'openai.llm', model: 'gpt-5.4-mini', expectedParameter: 'max_output_tokens=128000' },
  { id: 'deepseek', scenario: 'deepseek.llm', model: 'deepseek-v4-flash', expectedParameter: 'max_tokens=384000' },
  { id: 'glm', scenario: 'openai.llm', model: 'glm-5.3', expectedParameter: 'max_tokens=128000' },
  { id: 'gemini', scenario: 'gemini.vertex-express.llm', model: 'gemini-3.8-flash', expectedParameter: 'maxOutputTokens=65536' },
  { id: 'kimi', scenario: 'openai.llm', model: 'kimi-k3', expectedParameter: 'omitted (no catalog limit)' },
  { id: 'grok', scenario: 'openai.llm', model: 'grok-4.7', expectedParameter: 'omitted (no catalog limit)' },
];

const stream = async (llm: any, content: string, conversation: string) => {
  let text = '';
  let outputTokens: number | null = null;
  for await (const chunk of llm.streamUserMessage(new LLMUserMessage({ content }), { logicalConversationId: conversation })) {
    text += chunk.content ?? '';
    if (chunk.is_complete && chunk.usage) outputTokens = chunk.usage.output_tokens ?? null;
  }
  return { text, outputTokens };
};

run('output-limit real-provider smoke', () => {
  let harness: LiveE2eHarness;
  beforeAll(async () => { harness = await LiveE2eHarness.open(); });
  afterAll(async () => { await harness?.close(); });

  for (const testCase of cases) {
    it(`${testCase.id}: accepts the default limit (${testCase.expectedParameter}) and honors a configured one`, async () => {
      const execution = await harness.requireScenario(testCase.scenario);
      await execution.activateGeminiMode();
      const defaults = await execution.createLlm(testCase.model);
      let defaultResult;
      let defaultError: string | null = null;
      try {
        defaultResult = await stream(defaults, 'Reply with the single word pong.', `smoke-default-${testCase.id}`);
      } catch (error) {
        defaultError = String((error as Error)?.message ?? error).slice(0, 400);
      } finally {
        await defaults.cleanup();
      }

      const limited = await execution.createLlm(testCase.model, { max_tokens: 24 });
      let limitedResult;
      let limitedError: string | null = null;
      try {
        limitedResult = await stream(limited, 'Count from 1 to 300, separated by single spaces. Output only the numbers.', `smoke-limited-${testCase.id}`);
      } catch (error) {
        limitedError = String((error as Error)?.message ?? error).slice(0, 400);
      } finally {
        await limited.cleanup();
      }

      process.stdout.write(`${JSON.stringify({
        case: testCase.id,
        model: testCase.model,
        defaultLimit: testCase.expectedParameter,
        defaultOk: defaultError === null,
        defaultError,
        defaultTextLength: defaultResult?.text.length ?? null,
        defaultOutputTokens: defaultResult?.outputTokens ?? null,
        configuredLimit: 24,
        limitedError,
        limitedTextLength: limitedResult?.text.length ?? null,
        limitedOutputTokens: limitedResult?.outputTokens ?? null,
      })}\n`);

      expect(defaultError).toBeNull();
      expect(defaultResult!.text.trim().length).toBeGreaterThan(0);
      expect(limitedError).toBeNull();
      // A counted 1..300 answer is ~600 tokens; an honored limit of 24 stops it far earlier.
      expect(limitedResult!.text.length).toBeLessThan(400);
    }, 240_000);
  }
});
