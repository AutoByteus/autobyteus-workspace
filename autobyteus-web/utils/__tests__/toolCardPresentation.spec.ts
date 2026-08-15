import { describe, expect, it } from 'vitest';
import {
  buildToolCardPresentation,
  getToolCardPresentationWitnessValues,
} from '../toolCardPresentation';

const toolSegment = (overrides: Record<string, unknown> = {}) => ({
  type: 'tool_call' as const,
  invocationId: 'tool-1',
  toolName: 'search',
  arguments: { query: 'weather' },
  status: 'parsing' as const,
  approvalTarget: null,
  logs: [],
  result: null,
  error: null,
  rawContent: '',
  ...overrides,
});

describe('toolCardPresentation', () => {
  it('maps statuses by the indicator visual and interaction equivalence classes', () => {
    const parsing = buildToolCardPresentation(toolSegment({ status: 'parsing' }));
    const executing = buildToolCardPresentation(toolSegment({ status: 'executing' }));
    const parsed = buildToolCardPresentation(toolSegment({ status: 'parsed' }));
    const interrupted = buildToolCardPresentation(toolSegment({ status: 'interrupted' }));

    expect(parsing.statusKey).toBe('running');
    expect(executing.statusKey).toBe('running');
    expect(parsed.statusKey).toBe('default');
    expect(interrupted.statusKey).toBe('default');
  });

  it('uses the terminal command fallback without hiding other argument summaries when the fallback is empty', () => {
    const fallback = buildToolCardPresentation({
      ...toolSegment(),
      type: 'terminal_command',
      toolName: '',
      arguments: { cmd: 'ignored because the top-level fallback has priority' },
      command: 'printf fallback',
    } as any);
    const argumentSummary = buildToolCardPresentation({
      ...toolSegment(),
      type: 'terminal_command',
      toolName: '',
      arguments: { query: 'retained summary' },
      command: '',
    } as any);

    expect(fallback.summary?.text).toBe('printf fallback');
    expect(argumentSummary.summary?.text).toBe('retained summary');
  });

  it('exposes approval target primitives only while the inline action is rendered', () => {
    const target = { agentRunId: 'member-run-a' };
    const awaiting = buildToolCardPresentation(toolSegment({
      status: 'awaiting-approval',
      approvalTarget: target,
    }));
    const approved = buildToolCardPresentation(toolSegment({
      status: 'approved',
      approvalTarget: target,
    }));

    expect(awaiting.approvalTarget).toEqual(target);
    expect(getToolCardPresentationWitnessValues(awaiting)).toContain('member-run-a');
    expect(approved.approvalTarget).toBeNull();
    expect(approved.approvalTargetPrimitives).toEqual([]);
  });
});
