import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Message, MessageRole, ToolCallPayload, ToolResultPayload } from '../../../src/llm/utils/messages.js';
import { ANTHROPIC_ASSISTANT_TURN_KEY, parseAnthropicAssistantTurn } from '../../../src/llm/utils/provider-native-assistant-turn.js';
import { AcceptedCompactionBuilder } from '../../../src/memory/compaction/accepted-compaction-builder.js';
import { WorkingContext } from '../../../src/memory/working-context.js';
import { FileMemoryStore } from '../../../src/memory/store/file-store.js';

describe('AcceptedCompactionBuilder Anthropic retained tail', () => {
  it('keeps tool protocol but removes every pre-summary signed block', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'compaction-anthropic-'));
    try {
      const assistant = new Message(MessageRole.ASSISTANT, {
        content: 'Searching.',
        reasoning_content: 'synthetic display reasoning',
        tool_payload: new ToolCallPayload([{ id: 'toolu_1', name: 'search', arguments: { q: 'x' } }]),
        metadata: { [ANTHROPIC_ASSISTANT_TURN_KEY]: { provider: 'anthropic', blocks: [
          { type: 'thinking', thinking: 'synthetic private', signature: 'signed' },
          { type: 'redacted_thinking', data: 'synthetic-redacted' },
          { type: 'text', text: 'Searching.' },
          { type: 'tool_use', id: 'toolu_1', name: 'search', input: { q: 'x' } },
        ] } },
      });
      const result = new Message(MessageRole.TOOL, {
        tool_payload: new ToolResultPayload('toolu_1', 'search', 'found'),
      });
      const baseline = new WorkingContext([
        new Message(MessageRole.SYSTEM, { content: 'System' }),
        new Message(MessageRole.USER, { content: 'Find x' }),
        assistant, result,
      ]);
      const store = new FileMemoryStore(dir, 'agent-1');
      const builder = new AcceptedCompactionBuilder(store, { targetKind: 'agent_run', runId: 'agent-1', memberId: null });
      const accepted = builder.build({
        compactionId: 'compact-1', expectedPreviousCompactionId: null, baseline,
        proposal: {
          selectedNewRawTraceIds: ['raw-1'], retainedMessages: [assistant, result],
          output: { episodes: [{ summary: 'Found x' }], semanticEntries: [] },
          execution: { runtimeKind: 'autobyteus', provider: 'anthropic', modelIdentifier: 'claude-opus-5-5' },
          budgetAssessment: { planningBudget: { postCompactionTargetTokens: 100_000 }, estimatedUntrackedOverheadTokens: 0 },
        } as any,
      });
      const messages = accepted.finalizedContext.buildMessages();
      const retained = messages.find((message) => message.tool_payload instanceof ToolCallPayload)!;
      expect(parseAnthropicAssistantTurn(retained.metadata?.[ANTHROPIC_ASSISTANT_TURN_KEY]).blocks).toEqual([
        { type: 'text', text: 'Searching.' },
        { type: 'tool_use', id: 'toolu_1', name: 'search', input: { q: 'x' } },
      ]);
      expect(retained.reasoning_content).toBe('synthetic display reasoning');
      expect(messages.some((message) => message.tool_payload instanceof ToolResultPayload)).toBe(true);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
