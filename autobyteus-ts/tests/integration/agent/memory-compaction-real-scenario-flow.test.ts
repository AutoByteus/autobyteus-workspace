import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { LLMRequestAssembler } from '../../../src/agent/llm-request-assembler.js';
import { OpenAIChatRenderer } from '../../../src/llm/prompt-renderers/openai-chat-renderer.js';
import { LLMUserMessage } from '../../../src/llm/user-message.js';
import { Compactor } from '../../../src/memory/compaction/compactor.js';
import { CompactionResult } from '../../../src/memory/compaction/compaction-result.js';
import { Summarizer } from '../../../src/memory/compaction/summarizer.js';
import { MemoryManager } from '../../../src/memory/memory-manager.js';
import { MemoryType } from '../../../src/memory/models/memory-types.js';
import { CompactionPolicy } from '../../../src/memory/policies/compaction-policy.js';
import { FileMemoryStore } from '../../../src/memory/store/file-store.js';
import { RawTraceItem } from '../../../src/memory/models/raw-trace-item.js';

const extractMarkedItems = (traces: RawTraceItem[]) => {
  const decisions: string[] = [];
  const constraints: string[] = [];

  for (const trace of traces) {
    const content = (trace.content ?? '').trim();
    if (!content) {
      continue;
    }
    const decisionMatch = content.match(/decision\s*:\s*(.+)/i);
    if (decisionMatch?.[1]) {
      const decision = decisionMatch[1].trim();
      if (decision && !decisions.includes(decision)) {
        decisions.push(decision);
      }
    }
    const constraintMatch = content.match(/constraint\s*:\s*(.+)/i);
    if (constraintMatch?.[1]) {
      const constraint = constraintMatch[1].trim();
      if (constraint && !constraints.includes(constraint)) {
        constraints.push(constraint);
      }
    }
  }

  return { decisions, constraints };
};

class ScenarioSummarizer extends Summarizer {
  lastPayload: Record<string, unknown> | null = null;

  summarize(traces: RawTraceItem[]): CompactionResult {
    const summary = traces.map((trace) => trace.content).filter(Boolean).join(' ');
    const { decisions, constraints } = extractMarkedItems(traces);
    const semanticFacts = [
      ...decisions.map((decision) => ({ fact: decision, tags: ['decision'], confidence: 0.9 })),
      ...constraints.map((constraint) => ({ fact: constraint, tags: ['constraint'], confidence: 0.9 }))
    ];

    this.lastPayload = {
      episodic_summary: summary,
      semantic_facts: semanticFacts,
      decisions,
      constraints
    };

    return new CompactionResult(summary, semanticFacts);
  }
}

describe('Memory compaction real scenario flow', () => {
  it('retains decisions/constraints from traces', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mem-compact-scenario-'));
    try {
      const store = new FileMemoryStore(tempDir, 'agent_compact_scenario');
      const policy = new CompactionPolicy({ rawTailTurns: 1, triggerRatio: 0.1 });
      const summarizer = new ScenarioSummarizer();
      const compactor = new Compactor(store, policy, summarizer);
      const memoryManager = new MemoryManager({ store, compactionPolicy: policy, compactor });

      const turn1 = memoryManager.startTurn();
      memoryManager.ingestUserMessage(
        new LLMUserMessage({ content: 'Idea: Approach-ALPHA keeps all raw traces forever.' }),
        turn1,
        'LLMUserMessageReadyEvent'
      );
      memoryManager.ingestAssistantResponse(
        { content: 'We can try Approach-ALPHA first.', reasoning: null } as any,
        turn1,
        'LLMCompleteResponseReceivedEvent'
      );

      const turn2 = memoryManager.startTurn();
      memoryManager.ingestUserMessage(
        new LLMUserMessage({ content: 'DROPPED: Approach-ALPHA caused context overflow.' }),
        turn2,
        'LLMUserMessageReadyEvent'
      );
      memoryManager.ingestAssistantResponse(
        { content: 'We will not use Approach-ALPHA.', reasoning: null } as any,
        turn2,
        'LLMCompleteResponseReceivedEvent'
      );

      const turn3 = memoryManager.startTurn();
      memoryManager.ingestUserMessage(
        new LLMUserMessage({
          content: 'DECISION: Use Approach-BETA (compaction + episodic/semantic). Constraint: keep raw tail 2 turns.'
        }),
        turn3,
        'LLMUserMessageReadyEvent'
      );
      memoryManager.ingestAssistantResponse(
        { content: 'Proceeding with Approach-BETA.', reasoning: null } as any,
        turn3,
        'LLMCompleteResponseReceivedEvent'
      );

      const currentTurn = memoryManager.startTurn();
      const currentUser = new LLMUserMessage({ content: 'Please respond with pong.' });
      memoryManager.ingestUserMessage(currentUser, currentTurn, 'LLMUserMessageReadyEvent');

      const assembler = new LLMRequestAssembler(memoryManager, new OpenAIChatRenderer());
      memoryManager.requestCompaction();

      const request = await assembler.prepareRequest(currentUser, currentTurn, 'System prompt');
      expect(request.didCompact).toBe(true);

      const episodicItems = store.list(MemoryType.EPISODIC);
      const semanticItems = store.list(MemoryType.SEMANTIC);
      expect(episodicItems.length).toBeGreaterThan(0);

      const summaryText = episodicItems[0].summary;
      expect(summaryText).toContain('Approach-BETA');
      expect(summaryText).toContain('Approach-ALPHA');

      const payload = summarizer.lastPayload ?? {};
      const decisions = (payload.decisions as string[]) ?? [];
      const constraints = (payload.constraints as string[]) ?? [];
      expect(decisions.some((item) => item.includes('Approach-BETA'))).toBe(true);
      expect(constraints.some((item) => item.toLowerCase().includes('raw tail') || item.includes('2'))).toBe(true);

      const semanticFacts = semanticItems.map((item) => item.fact).join(' ');
      expect(semanticFacts).toContain('Approach-BETA');
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
