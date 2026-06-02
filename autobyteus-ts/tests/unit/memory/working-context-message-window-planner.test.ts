import { describe, expect, it } from 'vitest';
import {
  Message,
  MessageRole,
  ToolCallPayload,
  ToolResultPayload,
} from '../../../src/llm/utils/messages.js';
import { WorkingContextMessageWindowPlanner } from '../../../src/memory/compaction/working-context-message-window-planner.js';
import type {
  MessageBudgetStrategy,
  MessageBudgetStrategyResult,
} from '../../../src/memory/compaction/message-budget-strategy.js';

class FixedBudgetStrategy implements MessageBudgetStrategy {
  constructor(private readonly recentSuffixBudgetTokens = 250) {}

  calculate(input: { units: Array<{ id: string }> }): MessageBudgetStrategyResult {
    return {
      costByUnitId: Object.fromEntries(input.units.map((unit) => [unit.id, 100])),
      recentSuffixBudgetTokens: this.recentSuffixBudgetTokens,
    };
  }
}

describe('WorkingContextMessageWindowPlanner', () => {
  it('compacts old canonical messages while retaining a budget-bounded recent suffix', () => {
    const planner = new WorkingContextMessageWindowPlanner(undefined, new FixedBudgetStrategy(250));
    const messages = [
      new Message(MessageRole.SYSTEM, { content: 'System' }),
      new Message(MessageRole.USER, { content: 'old user' }),
      new Message(MessageRole.ASSISTANT, { content: 'old assistant' }),
      new Message(MessageRole.USER, { content: 'recent user' }),
      new Message(MessageRole.ASSISTANT, { content: 'recent assistant' }),
    ];

    const plan = planner.plan({ messages, minRecentNaturalUnits: 2 });

    expect(plan.headMessages.map((message) => message.role)).toEqual([MessageRole.SYSTEM]);
    expect(plan.compactableUnits.flatMap((unit) => unit.messages.map((message) => message.content))).toEqual([
      'old user',
      'old assistant',
    ]);
    expect(plan.retainedMessages.map((message) => message.content)).toEqual(['recent user', 'recent assistant']);
  });

  it('protects only the latest live tool-call/result group as structured messages', () => {
    const planner = new WorkingContextMessageWindowPlanner(undefined, new FixedBudgetStrategy(100));
    const firstToolCall = new Message(MessageRole.ASSISTANT, {
      content: 'I will search first.',
      tool_payload: new ToolCallPayload([{ id: 'call_1', name: 'search', arguments: { q: 'a' } }]),
    });
    const firstToolResult = new Message(MessageRole.TOOL, {
      tool_payload: new ToolResultPayload('call_1', 'search', { first: true }),
    });
    const latestToolCall = new Message(MessageRole.ASSISTANT, {
      content: 'I will search again.',
      tool_payload: new ToolCallPayload([{ id: 'call_2', name: 'search', arguments: { q: 'b' } }]),
    });
    const latestToolResult = new Message(MessageRole.TOOL, {
      tool_payload: new ToolResultPayload('call_2', 'search', { second: true }),
    });

    const plan = planner.plan({
      messages: [
        new Message(MessageRole.SYSTEM, { content: 'System' }),
        new Message(MessageRole.USER, { content: 'Please investigate.' }),
        firstToolCall,
        firstToolResult,
        latestToolCall,
        latestToolResult,
      ],
      minRecentNaturalUnits: 0,
    });

    expect(plan.protectedSuffixUnits).toHaveLength(1);
    expect(plan.protectedSuffixUnits[0].messages).toEqual([latestToolCall, latestToolResult]);
    expect(plan.compactableUnits.some((unit) => unit.messages.includes(firstToolCall))).toBe(true);
    expect(plan.retainedMessages).toContain(latestToolCall);
    expect(plan.retainedMessages).toContain(latestToolResult);
  });

  it('does not let the default recent-unit floor retain all oversized natural units', () => {
    const planner = new WorkingContextMessageWindowPlanner();
    const huge = 'x'.repeat(20_000);

    const plan = planner.plan({
      messages: [
        new Message(MessageRole.SYSTEM, { content: 'System' }),
        new Message(MessageRole.USER, { content: `old ${huge}` }),
        new Message(MessageRole.ASSISTANT, { content: `latest ${huge}` }),
      ],
      inputBudgetTokens: 1_000,
    });

    expect(plan.compactableUnits.length).toBeGreaterThan(0);
    expect(plan.retainedUnits.length).toBeLessThan(2);
    expect(plan.estimatedRetainedTokens).toBeLessThanOrEqual(350);
  });

  it('compacts a large settled active-turn prefix while protecting the live tool suffix', () => {
    const planner = new WorkingContextMessageWindowPlanner();
    const huge = 'x'.repeat(12_000);
    const liveToolCall = new Message(MessageRole.ASSISTANT, {
      content: 'I need the latest result before continuing.',
      tool_payload: new ToolCallPayload([{ id: 'call_live', name: 'search', arguments: { q: 'live' } }]),
    });
    const liveToolResult = new Message(MessageRole.TOOL, {
      tool_payload: new ToolResultPayload('call_live', 'search', { live: true }),
    });

    const plan = planner.plan({
      messages: [
        new Message(MessageRole.SYSTEM, { content: 'System' }),
        new Message(MessageRole.USER, { content: `active turn consumed prefix ${huge}` }),
        new Message(MessageRole.ASSISTANT, { content: `consumed assistant reasoning ${huge}` }),
        liveToolCall,
        liveToolResult,
      ],
      inputBudgetTokens: 1_000,
    });

    expect(plan.protectedSuffixUnits).toHaveLength(1);
    expect(plan.protectedSuffixUnits[0].messages).toEqual([liveToolCall, liveToolResult]);
    expect(plan.compactableUnits.flatMap((unit) => unit.messages).some((message) => message.content?.includes('consumed'))).toBe(true);
    expect(plan.retainedMessages).toContain(liveToolCall);
    expect(plan.retainedMessages).toContain(liveToolResult);
  });
});
