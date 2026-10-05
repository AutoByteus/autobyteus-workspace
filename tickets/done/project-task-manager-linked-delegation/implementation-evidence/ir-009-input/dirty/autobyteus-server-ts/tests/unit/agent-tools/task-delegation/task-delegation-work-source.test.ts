import { describe, expect, it } from 'vitest';
import { parseDelegateTaskInput } from '../../../../src/agent-tools/task-delegation/task-delegation-tool-input-parsers.js';

describe('one strict delegation work source at the shared native/MCP parser', () => {
  it('accepts Task ID alone and preserves the no-ID described mode', () => {
    expect(parseDelegateTaskInput({ recipient_address: '/writer', task_id: ' task-A ' })).toEqual({ recipient_address: '/writer', task_id: 'task-A' });
    expect(parseDelegateTaskInput({ recipient_address: '/writer', description: ' described work ' })).toEqual({ recipient_address: '/writer', description: 'described work', reference_files: [] });
    expect(parseDelegateTaskInput({ recipient_address: '/writer', description: 'work', reference_files: ['/absolute/saved.txt'] })).toEqual({ recipient_address: '/writer', description: 'work', reference_files: ['/absolute/saved.txt'] });
  });
  it.each([null, '', '  ', undefined, 0])('presence selects linked mode even for invalid task_id=%j; never falls back to description', task_id => {
    expect(() => parseDelegateTaskInput({ recipient_address: '/writer', task_id, description: 'not a fallback' })).toThrow('Invalid delegate_task input');
  });
  it.each([{ description: '' }, { description: 'override' }, { reference_files: [] }, { reference_files: ['/override'] }, { project_id: 'P' }, { unknown: true }])('rejects additional linked-mode payload fields (%j)', extra => {
    expect(() => parseDelegateTaskInput({ recipient_address: '/writer', task_id: 'A', ...extra })).toThrow('Invalid delegate_task input');
  });
  it.each([{}, { description: '' }, { description: null }, { description: 'work', project_id: 'P' }])('rejects missing/invalid described work and unsupported fields (%j)', payload => {
    expect(() => parseDelegateTaskInput({ recipient_address: '/writer', ...payload })).toThrow('Invalid delegate_task input');
  });
});
