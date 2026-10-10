import { describe, expect, it } from 'vitest';
import {
  buildDraftContextFileLocator,
  buildFinalContextFileLocator,
  getDisplayNameFromStoredFilename,
  getStoredFilenameFromLocator,
  parseDraftContextFileLocator,
  parseDraftContextFileOwnerDescriptor,
  parseFinalContextFileOwnerDescriptor,
  type ContextFileDraftOwnerDescriptor,
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


  describe('draft locator codec', () => {
    const storedFilename = 'ctx_deadbeef__my notes (1).txt';
    const owners: ContextFileDraftOwnerDescriptor[] = [
      { kind: 'agent_draft', draftRunId: 'temp-run-1' },
      { kind: 'team_member_draft', teamDraftId: 'team-1', memberAddress: '/C/D' as never },
      { kind: 'org_member_draft', orgRunId: 'org-1', agentRunId: 'agent-1' },
      { kind: 'agent_collaboration_member_draft', hostRunId: 'host-1', agentRunId: 'child-1' },
    ];

    it('covers every draft owner kind', () => {
      expect(owners.map((owner) => owner.kind).sort()).toEqual([
        'agent_collaboration_member_draft', 'agent_draft', 'org_member_draft', 'team_member_draft',
      ]);
    });

    it.each(owners)('parses exactly what it builds for $kind', (owner) => {
      const locator = buildDraftContextFileLocator(owner, storedFilename);
      expect(parseDraftContextFileLocator(locator)).toEqual({ owner, storedFilename });
    });

    it('keeps the established locator strings', () => {
      expect(owners.map((owner) => buildDraftContextFileLocator(owner, 'ctx_a__b.txt'))).toEqual([
        '/rest/drafts/agent-runs/temp-run-1/context-files/ctx_a__b.txt',
        '/rest/drafts/team-runs/team-1/members/%2FC%2FD/context-files/ctx_a__b.txt',
        '/rest/drafts/agent-org-runs/org-1/agent-runs/agent-1/context-files/ctx_a__b.txt',
        '/rest/drafts/agent-collaborations/host-1/agent-runs/child-1/context-files/ctx_a__b.txt',
      ]);
    });

    it.each([
      '/rest/runs/run-1/context-files/ctx_a__b.txt',
      '/rest/agent-collaborations/host/agent-runs/child/context-files/ctx_a__b.txt',
      '/rest/drafts/unknown-runs/x/context-files/ctx_a__b.txt',
      '/rest/drafts/agent-runs/x/context-files',
      '/rest/drafts/agent-runs/x/files/ctx_a__b.txt',
      '/rest/drafts/agent-runs/x/context-files/ctx_a__b.txt/extra',
      '/rest/drafts/team-runs/team-1/members/C/D/context-files/ctx_a__b.txt',
      '/rest/drafts/agent-org-runs/org/members/a/context-files/ctx_a__b.txt',
      'rest/drafts/agent-runs/x/context-files/ctx_a__b.txt',
    ])('returns null for a path that is not a draft locator: %s', (pathname) => {
      expect(parseDraftContextFileLocator(pathname)).toBeNull();
    });

    it.each([
      '/rest/drafts/agent-runs/x/context-files/..',
      '/rest/drafts/agent-runs/x/context-files/%2E%2E%2Fsecret',
      '/rest/drafts/agent-runs/%20/context-files/ctx_a__b.txt',
      '/rest/drafts/agent-runs/x/context-files/%E0%A4%A',
      '/rest/drafts/team-runs/team-1/members/no-root/context-files/ctx_a__b.txt',
      '/rest/drafts/agent-org-runs/org/agent-runs/%2E%2E/context-files/ctx_a__b.txt',
      '/rest/drafts/agent-collaborations/host/agent-runs/a%2Fb/context-files/ctx_a__b.txt',
    ])('rejects a draft locator with an invalid owner or file: %s', (pathname) => {
      expect(() => parseDraftContextFileLocator(pathname)).toThrow();
    });
  });
});
