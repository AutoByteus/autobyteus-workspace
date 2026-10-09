import { describe, expect, it } from 'vitest';
import { AgentStatus } from '~/types/agent/AgentStatus';
import { hasSendableDraft, resolveAgentPrimaryAction } from '../agentPrimaryAction';

const resolve = (overrides: Partial<Parameters<typeof resolveAgentPrimaryAction>[0]> = {}) =>
  resolveAgentPrimaryAction({
    hasContext: true,
    status: AgentStatus.Idle,
    submissionPending: false,
    isUploading: false,
    hasDraft: true,
    ...overrides,
  });

describe('resolveAgentPrimaryAction', () => {
  it('uses running as the sole interrupt action state', () => {
    expect(resolve({ status: AgentStatus.Running, submissionPending: true, hasDraft: false }))
      .toEqual({ kind: 'interrupt', enabled: true });
  });

  it('keeps initializing and local submission pending disabled', () => {
    expect(resolve({ status: AgentStatus.Initializing })).toEqual({
      kind: 'disabled',
      enabled: false,
      reason: 'initializing',
    });
    expect(resolve({ submissionPending: true })).toEqual({
      kind: 'disabled',
      enabled: false,
      reason: 'submission_pending',
    });
  });

  it('allows send only with context, upload completion, and a non-empty draft', () => {
    expect(resolve()).toEqual({ kind: 'send', enabled: true });
    expect(resolve({ hasContext: false })).toMatchObject({ kind: 'disabled', reason: 'no_context' });
    expect(resolve({ isUploading: true })).toMatchObject({ kind: 'disabled', reason: 'uploading' });
    expect(resolve({ hasDraft: false })).toMatchObject({ kind: 'disabled', reason: 'empty_draft' });
  });

  it('permits retrying from offline and error when the draft is sendable', () => {
    expect(resolve({ status: AgentStatus.Offline })).toEqual({ kind: 'send', enabled: true });
    expect(resolve({ status: AgentStatus.Error })).toEqual({ kind: 'send', enabled: true });
  });
});

describe('hasSendableDraft', () => {
  const draft = (requirement: string, requestedSkillNames: string[] = [], contextFilePaths: unknown[] = []) =>
    ({ requirement, requestedSkillNames, contextFilePaths });

  it('requires typed text or a skill tag; context files alone are not sendable', () => {
    const file = { kind: 'workspace_path', locator: '/tmp/a.png', type: 'Image' };
    expect(hasSendableDraft(draft('', [], [file]))).toBe(false);
    expect(hasSendableDraft(draft('  \n', [], [file]))).toBe(false);
    expect(hasSendableDraft(draft('describe this', [], [file]))).toBe(true);
    expect(hasSendableDraft(draft('', ['writer']))).toBe(true);
    expect(hasSendableDraft(draft(''))).toBe(false);
  });
});
