import { mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';
import dotenv from 'dotenv';
import { describe, expect, it } from 'vitest';
import { AnthropicLLM } from '../../../src/llm/api/anthropic-llm.js';
import { LLMModel } from '../../../src/llm/models.js';
import { LLMConfig } from '../../../src/llm/utils/llm-config.js';
import { Message, MessageRole, ToolCallPayload, ToolResultPayload } from '../../../src/llm/utils/messages.js';
import { ANTHROPIC_ASSISTANT_TURN_KEY, type AnthropicAssistantTurn } from '../../../src/llm/utils/provider-native-assistant-turn.js';
import { supportedModelDefinitions } from '../../../src/llm/supported-model-definitions.js';
import { SecretValue } from '../../../src/secrets/secret-value.js';
import type { LlmTokenUsageObservation } from '../../../src/llm/utils/llm-token-usage-observation.js';

const MAX_REQUESTS = 4;
const MAX_HTML_CHARS = 50_000;
const key = dotenv.parse(readFileSync(join(homedir(), '.autobyteus/server-data/.env'))).ANTHROPIC_API_KEY;
const definition = supportedModelDefinitions.find(row => row.value === 'claude-opus-5-5');
const tools = [
  { name: 'write_html', description: 'Write the complete single-file HTML game to the test workspace. Then call inspect_html to verify it.',
    input_schema: { type: 'object', properties: { html: { type: 'string', description: 'Complete index.html source' } }, required: ['html'] } },
  { name: 'inspect_html', description: 'Inspect the saved index.html for the required game structures. Call this after write_html, before final answer.',
    input_schema: { type: 'object', properties: {} } },
];
const safeStatus = (error: unknown): string => String(error).match(/\b(400|401|403|404|429|500|503)\b/)?.[1] ?? 'unknown';

const gameChecks = (html: string) => ({
  html: /<html[\s>]/i.test(html),
  canvas: /<canvas[\s>]/i.test(html),
  script: /<script[\s>]/i.test(html),
  keyboard: /keydown|keyup/i.test(html),
  loop: /requestAnimationFrame/i.test(html),
  platform: /platform/i.test(html),
});

describe('temporary complex Opus 5.5 AnthropicLLM signed-replay live probe', () => {
  it('creates and inspects a small one-file platform game through signed native tool turns', async () => {
    expect(Boolean(key), 'candidate key missing').toBe(true);
    expect(definition, 'exact catalog model missing').toBeTruthy();
    const dir = mkdtempSync(join(tmpdir(), 'api-e2e-opus55-game-'));
    const htmlPath = join(dir, 'index.html');
    const llm = new AnthropicLLM(new LLMModel(definition!), new LLMConfig({ maxTokens: 4096 }), {
      resolve: async () => SecretValue.fromString(key!),
    });
    const messages: Message[] = [
      new Message(MessageRole.SYSTEM, 'You are building a tiny playable one-file HTML platform game. Use only the provided tools for file work. Keep the game concise, self-contained and offline. Always inspect the saved file before concluding.'),
      new Message(MessageRole.USER, 'Create a tiny Mario-style platform game in one index.html: canvas, left/right movement, jump/gravity, platforms, one coin and a goal. First call write_html with the complete file. Then call inspect_html. If inspection reports missing features, fix the file using write_html and inspect again. Do not provide a final response until inspection succeeds.'),
    ];
    let calls = 0;
    let signedTurns = 0;
    let signedReplayAccepted = false;
    let pendingSignedReplay = false;
    let inspected = false;
    let finalTurn = false;
    let totalInput = 0;
    let totalOutput = 0;
    try {
      for (let request = 1; request <= MAX_REQUESTS; request++) {
        let native: AnthropicAssistantTurn | null = null;
        let usage: LlmTokenUsageObservation | null = null;
        try {
          for await (const chunk of llm.streamMessages(messages, null, {
            tools, tool_choice: { type: 'auto' }, thinking: { type: 'adaptive' }, output_config: { effort: 'xhigh' },
          })) {
            if (chunk.providerNativeAssistantTurn) native = chunk.providerNativeAssistantTurn;
            if (chunk.is_complete && chunk.usage) usage = chunk.usage;
          }
        } catch (error) {
          throw new Error(`product AnthropicLLM request ${request} failed; HTTP status ${safeStatus(error)}; provider body suppressed`);
        }
        if (pendingSignedReplay) signedReplayAccepted = true;
        pendingSignedReplay = false;
        totalInput += usage?.input_tokens ?? 0;
        totalOutput += usage?.output_tokens ?? 0;
        const blocks = native?.blocks ?? [];
        const toolUses = blocks.filter(block => block.type === 'tool_use');
        const signed = blocks.some(block => block.type === 'thinking' && Boolean(block.signature));
        if (signed && toolUses.length) { signedTurns++; pendingSignedReplay = true; }
        console.log('GAME_TURN', request, 'blocks', blocks.map(block => block.type).join(','),
          'tools', toolUses.map(block => block.type === 'tool_use' ? block.name : '').join(','),
          'signed', signed, 'usage', Boolean(usage));
        if (!toolUses.length) { finalTurn = true; break; }
        expect(native, 'tool turn missing native assistant blocks').toBeTruthy();
        const assistant = new Message(MessageRole.ASSISTANT, {
          content: blocks.filter(block => block.type === 'text').map(block => block.type === 'text' ? block.text : '').join(''),
          tool_payload: new ToolCallPayload(toolUses.map(block => {
            if (block.type !== 'tool_use') throw new Error('invalid tool block');
            return { id: block.id, name: block.name, arguments: block.input };
          })),
          metadata: { [ANTHROPIC_ASSISTANT_TURN_KEY]: native },
        });
        messages.push(assistant);
        for (const block of toolUses) {
          if (block.type !== 'tool_use') continue;
          calls++;
          let result: Record<string, unknown>;
          if (block.name === 'write_html') {
            const html = block.input.html;
            if (typeof html === 'string' && html.length > 0 && html.length <= MAX_HTML_CHARS) {
              writeFileSync(htmlPath, html, 'utf8');
              result = { saved: true, bytes: Buffer.byteLength(html), next: 'Call inspect_html before final answer.' };
            } else result = { saved: false, reason: 'HTML missing or exceeds size cap' };
          } else if (block.name === 'inspect_html') {
            inspected = true;
            const html = existsSync(htmlPath) ? readFileSync(htmlPath, 'utf8') : '';
            const checks = gameChecks(html);
            result = { exists: Boolean(html), checks, missing: Object.entries(checks).filter(([, ok]) => !ok).map(([name]) => name) };
          } else result = { error: 'unknown tool' };
          messages.push(new Message(MessageRole.TOOL, {
            tool_payload: new ToolResultPayload(block.id, block.name, result),
          }));
        }
      }
      const html = existsSync(htmlPath) ? readFileSync(htmlPath, 'utf8') : '';
      const checks = gameChecks(html);
      console.log('GAME_SUMMARY', 'requests_max', MAX_REQUESTS, 'tool_calls', calls,
        'signed_tool_turns', signedTurns, 'signed_replay_accepted', signedReplayAccepted,
        'inspected', inspected, 'final_turn', finalTurn, 'game_checks', Object.values(checks).every(Boolean),
        'html_bytes', Buffer.byteLength(html), 'input_tokens', totalInput, 'output_tokens', totalOutput);
      expect(calls).toBeGreaterThanOrEqual(2);
      expect(signedTurns).toBeGreaterThanOrEqual(1);
      expect(signedReplayAccepted).toBe(true);
      expect(inspected).toBe(true);
      expect(Object.values(checks).every(Boolean)).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }, 180_000);
});
