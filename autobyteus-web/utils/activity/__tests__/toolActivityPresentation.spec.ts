import { describe, expect, it } from 'vitest';
import type { ToolActivity } from '~/types/activity/RunActivity';
import { toolActivityDetailSections, toolActivityStatusPresentation } from '../toolActivityPresentation';
import { compactionActivityDetailRows } from '~/utils/compactionActivityPresentation';

// autobyteus-590 D-3, D-4: one owner for a tool activity's status and details sections, and a compaction's detail rows,
// shared by the desktop Activity panel and the phone.
const tool = (patch: Partial<ToolActivity> = {}): ToolActivity => ({
  kind: 'tool', activityId: 'a-1', timestamp: new Date(0), invocationId: 'inv-1', toolName: 'run_bash', type: 'terminal_command',
  status: 'success', arguments: {}, logs: [], result: null, error: null, ...patch,
});

describe('toolActivityStatusPresentation', () => {
  it.each([
    ['success', 'Success', 'green', 'heroicons:check-circle-solid'],
    ['error', 'Failed', 'red', 'heroicons:x-circle-solid'],
    ['approved', 'Approved', 'cyan', 'heroicons:check-badge-solid'],
    ['parsed', 'Parsed', 'slate', 'heroicons:document-check-solid'],
    ['executing', 'Running', 'blue', 'heroicons:clock-solid'],
    ['parsing', 'Running', 'blue', 'heroicons:clock-solid'],
    ['awaiting-approval', 'Review', 'amber', 'heroicons:hand-raised-solid'],
    ['denied', 'Denied', 'gray', 'heroicons:no-symbol-solid'],
    ['interrupted', 'Stopped', 'neutral', 'heroicons:stop-circle-solid'],
  ] as const)('%s: the desktop\'s word, tone and icon', (status, label, tone, icon) => {
    expect(toolActivityStatusPresentation(status)).toMatchObject({ label, tone, icon });
  });

  it('only a running call is running', () => {
    expect(toolActivityStatusPresentation('executing').isRunning).toBe(true);
    expect(toolActivityStatusPresentation('success').isRunning).toBe(false);
  });
});

describe('toolActivityDetailSections', () => {
  it('lists only the sections that are present, in order: arguments, logs, result, error', () => {
    expect(toolActivityDetailSections(tool())).toEqual([]);
    const sections = toolActivityDetailSections(tool({
      arguments: { command: 'ls', nested: { a: 1 } }, logs: ['one', 'two'], result: { ok: true }, error: 'boom',
    }));
    expect(sections.map((section) => section.key)).toEqual(['arguments', 'logs', 'result', 'error']);
    expect(sections[0]!.text).toBe('{\n  "command": "ls",\n  "nested": {\n    "a": 1\n  }\n}');
    expect(sections[1]).toEqual({ key: 'logs', text: 'one\ntwo', lines: ['one', 'two'] });
    expect(sections[2]!.text).toBe('{\n  "ok": true\n}');
    expect(sections[3]).toEqual({ key: 'error', text: 'boom' });
  });

  it('shows a string result as it is', () => {
    expect(toolActivityDetailSections(tool({ result: 'plain output' }))).toEqual([{ key: 'result', text: 'plain output' }]);
  });
});

describe('compactionActivityDetailRows', () => {
  it('lists the rows that have a value, in the desktop\'s order, the error last', () => {
    const rows = compactionActivityDetailRows({
      kind: 'compaction', activityId: 'c-1', timestamp: new Date(0), updatedAt: new Date(0), phase: 'failed', message: 'm',
      turnId: 'turn-1', provider: 'anthropic', summaryCharCount: 1200, summaryTokenCount: 0, rawTraceCount: null, errorMessage: 'Summarizer timed out',
    });
    expect(rows).toEqual([
      { label: 'Turn', value: 'turn-1' },
      { label: 'Provider', value: 'anthropic' },
      { label: 'Summary characters', value: '1200' },
      { label: 'Summary tokens (estimated)', value: '0' },
      { label: 'Error', value: 'Summarizer timed out' },
    ]);
  });
});
