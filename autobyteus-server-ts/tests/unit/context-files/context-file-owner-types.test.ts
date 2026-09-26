import { describe, expect, it } from 'vitest';
import {
  buildDraftContextFileLocator,
  buildFinalContextFileLocator,
  getDisplayNameFromStoredFilename,
  getStoredFilenameFromLocator,
  parseDraftContextFileOwnerDescriptor,
  parseFinalContextFileOwnerDescriptor,
} from '../../../src/context-files/domain/context-file-owner-types.js';

describe('context-file-owner-types', () => {
  it('parses and builds agent draft/final descriptors and locators', () => {
    const draftOwner = parseDraftContextFileOwnerDescriptor({
      kind: 'agent_draft',
      draftRunId: 'temp-run-1',
    });
    const finalOwner = parseFinalContextFileOwnerDescriptor({
      kind: 'agent_final',
      runId: 'run-1',
    });

    expect(buildDraftContextFileLocator(draftOwner, 'ctx_deadbeef__notes.txt')).toBe(
      '/rest/drafts/agent-runs/temp-run-1/context-files/ctx_deadbeef__notes.txt',
    );
    expect(buildFinalContextFileLocator(finalOwner, 'ctx_deadbeef__notes.txt')).toBe(
      '/rest/runs/run-1/context-files/ctx_deadbeef__notes.txt',
    );
  });

  it('preserves exact Team execution IDs and extracts stored filename/display name', () => {
    const owner = parseFinalContextFileOwnerDescriptor({
      kind: 'team_member_final',
      teamRunId: 'team-1',
      agentRunId: 'designer-run',
    });

    expect(owner).not.toHaveProperty('memberRunId');
    const locator = buildFinalContextFileLocator(owner, 'ctx_abc123__diagram-final.png');
    expect(locator).toBe('/rest/team-runs/team-1/agent-runs/designer-run/context-files/ctx_abc123__diagram-final.png');
    expect(getStoredFilenameFromLocator(locator)).toBe('ctx_abc123__diagram-final.png');
    expect(getDisplayNameFromStoredFilename('ctx_abc123__diagram-final.png')).toBe('diagram-final.png');
  });

  it('rejects invalid stored filenames when extracting from locators', () => {
    expect(getStoredFilenameFromLocator('/rest/runs/run-1/context-files/../../etc/passwd')).toBeNull();
  });
  it.each([
    {}, { agentRunId: '' }, { agentRunId: '../escape' }, { agentRunId: ' a' },
    { agentRunId: 'a/b' }, { agentRunId: 42 }, { agentRunId: 'a\\b' },
    { agentRunId: 'a', memberAddress: '/worker' }, { memberAddress: '/worker' },
    { agentRunId: 'a', teamRunId: '..' },
  ])('rejects missing, unsafe and old/mixed Team identity: %j', (input) => {
    expect(() => parseFinalContextFileOwnerDescriptor({ kind: 'team_member_final', teamRunId: 'team', ...input })).toThrow();
  });

});
