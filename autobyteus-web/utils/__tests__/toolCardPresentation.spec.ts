import { describe, expect, it } from 'vitest';
import {
  buildEventMonitorPageToolCardPresentation,
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

  it('keeps Activity-only failure detail out of the compact center presentation and witness', () => {
    const diagnostic = 'first line\ncomplete Activity diagnostic\nExit code: 23';
    const presentation = buildToolCardPresentation(toolSegment({
      status: 'error',
      error: diagnostic,
    }));

    expect(presentation).not.toHaveProperty('errorMessage');
    expect(getToolCardPresentationWitnessValues(presentation)).not.toContain(diagnostic);
    expect(presentation.statusKey).toBe('error');
  });

  // autobyteus-590 D-2a: the conversation's tool cards read the shared summary, so they show the agent tools' recipient and
  // Task, and a command without its leading cd (the full command stays in the title).
  it('a card names whom an agent tool addresses and which Task, and drops a leading cd from a command', () => {
    expect(buildToolCardPresentation(toolSegment({ toolName: 'send_message_to', arguments: { recipient_address: '/architecture_reviewer', content: 'Review it.' } })).summary)
      .toEqual({ kind: 'text', text: '→ /architecture_reviewer', title: '→ /architecture_reviewer' });
    expect(buildToolCardPresentation(toolSegment({ toolName: 'update_task', arguments: { task_id: 'autobyteus-590', status: 'DONE' } })).summary?.text)
      .toBe('autobyteus-590');
    const command = buildToolCardPresentation({ ...toolSegment(), type: 'terminal_command', toolName: 'run_bash', arguments: { command: 'cd /Users/me/repo && pnpm test' }, command: '' } as any);
    expect(command.summary).toEqual({ kind: 'command', text: 'pnpm test', title: 'cd /Users/me/repo && pnpm test' });
  });

  it('an event monitor page card drops a leading cd too', () => {
    const card = buildEventMonitorPageToolCardPresentation({ invocationId: 'i-1', toolName: 'run_bash', statusKey: 'success', summaryArgs: { command: 'cd /w && make build' }, approvalTarget: null });
    expect(card.summary).toEqual({ kind: 'command', text: 'make build', title: 'cd /w && make build' });
  });
});

