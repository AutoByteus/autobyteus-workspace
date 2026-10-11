import { describe, expect, it } from 'vitest';
import {
  assertStoredFilename,
  buildDraftContextFileLocator,
  buildFinalContextFileLocator,
  ContextFileDescriptorError,
  ContextFilePathContainmentError,
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

  it('preserves exact Team execution IDs', () => {
    const owner = parseFinalContextFileOwnerDescriptor({
      kind: 'team_member_final',
      teamRunId: 'team-1',
      agentRunId: 'designer-run',
    });

    expect(owner).not.toHaveProperty('memberRunId');
    const locator = buildFinalContextFileLocator(owner, 'ctx_abc123__diagram-final.png');
    expect(locator).toBe('/rest/team-runs/team-1/agent-runs/designer-run/context-files/ctx_abc123__diagram-final.png');
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
    const storedFilename = 'ctx_deadbeef__my-notes_1.v2.txt';
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
      '/rest/drafts/agent-runs/..%2Fagent-runs%2Fvictim/context-files/ctx_a__b.txt',
      '/rest/drafts/agent-runs/%2E%2E/context-files/ctx_a__b.txt',
      '/rest/drafts/agent-runs/..%2F..%2Fx/context-files/ctx_a__b.txt',
      '/rest/drafts/team-runs/..%2Fagent-runs%2Fvictim/members/%2FA/context-files/ctx_a__b.txt',
      '/rest/drafts/team-runs/%2E%2E/members/%2FA/context-files/ctx_a__b.txt',
      '/rest/drafts/agent-runs/x/context-files/%2E',
      '/rest/drafts/agent-runs/x/context-files/ctx_a__b%00.txt',
    ])('rejects a draft locator with an invalid owner or file: %s', (pathname) => {
      expect(() => parseDraftContextFileLocator(pathname)).toThrow();
    });
  });

  describe('owner identity rule (every owner ID field)', () => {
    const legitimateIds = [
      'solution_designer_0123456789abcdef0123456789abcdef',
      'temp-1728555555555-3',
      'temp-chat-1728555555555-12',
      'team-draft-3f2b8c1e-9a4d-4e6f-8b7a-1c2d3e4f5a6b',
      'old run with inner spaces',
    ];
    const rejectedIds = ['', '.', '..', 'a/b', 'a\\b', 'a\u0000b', ' padded', 'padded ', '../agent-runs/victim', 42, null, undefined];

    const owners: Array<{ parse: (input: unknown) => unknown; base: Record<string, unknown>; fields: string[] }> = [
      { parse: parseDraftContextFileOwnerDescriptor, base: { kind: 'agent_draft' }, fields: ['draftRunId'] },
      { parse: parseDraftContextFileOwnerDescriptor, base: { kind: 'team_member_draft', memberAddress: '/team/lead' }, fields: ['teamDraftId'] },
      { parse: parseDraftContextFileOwnerDescriptor, base: { kind: 'org_member_draft' }, fields: ['orgRunId', 'agentRunId'] },
      { parse: parseDraftContextFileOwnerDescriptor, base: { kind: 'agent_collaboration_member_draft' }, fields: ['hostRunId', 'agentRunId'] },
      { parse: parseFinalContextFileOwnerDescriptor, base: { kind: 'agent_final' }, fields: ['runId'] },
      { parse: parseFinalContextFileOwnerDescriptor, base: { kind: 'team_member_final' }, fields: ['teamRunId', 'agentRunId'] },
      { parse: parseFinalContextFileOwnerDescriptor, base: { kind: 'org_member_final' }, fields: ['orgRunId', 'agentRunId'] },
      { parse: parseFinalContextFileOwnerDescriptor, base: { kind: 'agent_collaboration_member_final' }, fields: ['hostRunId', 'agentRunId'] },
    ];
    const valid = (owner: (typeof owners)[number], id: string) =>
      Object.fromEntries([...Object.entries(owner.base), ...owner.fields.map((field) => [field, id])]);
    const cases = owners.flatMap((owner) => owner.fields.map((field) => ({ owner, field, kind: owner.base.kind as string })));

    it.each(cases)('$kind.$field accepts every legitimate ID format unchanged', ({ owner }) => {
      for (const id of legitimateIds) {
        expect(owner.parse(valid(owner, id))).toEqual(valid(owner, id));
      }
    });

    it.each(cases)('$kind.$field rejects malformed or traversal IDs', ({ owner, field }) => {
      for (const id of rejectedIds) {
        expect(() => owner.parse({ ...valid(owner, 'ok'), [field]: id }), JSON.stringify(id)).toThrow(ContextFileDescriptorError);
      }
    });

    // REQ-009 makes the two draft kinds exact; agent_final keeps its current shape (not in scope).
    it.each(owners.filter((owner) => owner.base.kind !== 'agent_final').map((owner) => ({ owner, kind: owner.base.kind as string })))(
      '$kind rejects unknown extra fields', ({ owner }) => {
        expect(() => owner.parse({ ...valid(owner, 'ok'), extra: 1 })).toThrow(ContextFileDescriptorError);
      },
    );

    it('keeps the canonical team address rule for memberAddress, including an encoded nested address', () => {
      const owner = { kind: 'team_member_draft', teamDraftId: 'team-draft-1', memberAddress: '/delivery/lead' };
      expect(parseDraftContextFileLocator(buildDraftContextFileLocator(owner as ContextFileDraftOwnerDescriptor, 'ctx_a__b.txt')))
        .toEqual({ owner, storedFilename: 'ctx_a__b.txt' });
      for (const memberAddress of ['lead', '/a//b', '/a/../b', '']) {
        expect(() => parseDraftContextFileOwnerDescriptor({ ...owner, memberAddress })).toThrow();
      }
    });
  });

  describe('stored filename allowlist', () => {
    it.each(['ctx_0123456789ab__notes.txt', 'ctx_0123456789ab__Quarterly_notes_2026.md', 'ctx_ab12__diagram-final.png', 'ctx_ab12__file'])(
      'accepts the generated name %s', (name) => {
        expect(assertStoredFilename(name)).toBe(name);
      },
    );

    it.each(['', '.', '..', '...', 'a..b', 'a b', 'a:b', 'a\u0000b', ' ctx_a__b.txt', 'ctx_a__b.txt ', 'a/b', 'a\\b', 'notes (1).txt', 'é.txt'])(
      'rejects %j', (name) => {
        expect(() => assertStoredFilename(name)).toThrow(ContextFileDescriptorError);
      },
    );
  });

  it('treats a containment failure as a descriptor error', () => {
    expect(new ContextFilePathContainmentError('x')).toBeInstanceOf(ContextFileDescriptorError);
  });
});
