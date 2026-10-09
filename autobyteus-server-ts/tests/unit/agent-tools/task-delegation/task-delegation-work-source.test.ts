import { describe, expect, it } from 'vitest';
import { parseDelegateTaskInput } from '../../../../src/agent-tools/task-delegation/task-delegation-tool-input-parsers.js';

describe('one strict delegation work source at the shared native/MCP parser', () => {
  it('accepts Task ID alone and preserves the no-ID described mode', () => {
    expect(parseDelegateTaskInput({ recipient_address: '/writer', task_id: ' task-A ' })).toEqual({ subject: 'new_copy', input: { recipient_address: '/writer', task_id: 'task-A' } });
    expect(parseDelegateTaskInput({ recipient_address: '/writer', description: ' described work ' })).toEqual({ subject: 'new_copy', input: { recipient_address: '/writer', description: 'described work', reference_files: [] } });
    expect(parseDelegateTaskInput({ recipient_address: '/writer', description: 'work', reference_files: ['/absolute/saved.txt'] })).toEqual({ subject: 'new_copy', input: { recipient_address: '/writer', description: 'work', reference_files: ['/absolute/saved.txt'] } });
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

describe('existing-copy mode: a copy\'s own ID with task_id (REQ-002)', () => {
  it('names a Team copy by its team run ID and an Agent copy by its agent run ID', () => {
    expect(parseDelegateTaskInput({ target_team_run_id: ' team-9 ', task_id: ' task-B ' }))
      .toEqual({ subject: 'existing_copy', input: { copy: { teamRunId: 'team-9' }, taskId: 'task-B' } });
    expect(parseDelegateTaskInput({ target_agent_run_id: 'agent-1', task_id: 'task-B' }))
      .toEqual({ subject: 'existing_copy', input: { copy: { agentRunId: 'agent-1' }, taskId: 'task-B' } });
  });
  it('requires exactly one copy ID', () => {
    expect(() => parseDelegateTaskInput({ target_team_run_id: 't', target_agent_run_id: 'a', task_id: 'B' }))
      .toThrow('supply exactly one of target_team_run_id (a Team copy) or target_agent_run_id (an Agent copy)');
  });
  it.each([{}, { task_id: '' }, { task_id: '  ' }, { task_id: null }])('requires a saved Task (%j): description-only work goes to a new copy', extra => {
    expect(() => parseDelegateTaskInput({ target_team_run_id: 't', ...extra })).toThrow('Invalid delegate_task input');
  });
  it.each([{ recipient_address: '/team' }, { description: 'work' }, { reference_files: [] }, { project_id: 'P' }])('takes nothing else with the copy ID (%j)', extra => {
    expect(() => parseDelegateTaskInput({ target_agent_run_id: 'a', task_id: 'B', ...extra }))
      .toThrow('with target_team_run_id or target_agent_run_id, supply only that ID and task_id');
  });
  it.each([{ target_team_run_id: '' }, { target_agent_run_id: ' ' }])('rejects a blank copy ID (%j)', id => {
    expect(() => parseDelegateTaskInput({ ...id, task_id: 'B' })).toThrow('Invalid delegate_task input');
  });
});
