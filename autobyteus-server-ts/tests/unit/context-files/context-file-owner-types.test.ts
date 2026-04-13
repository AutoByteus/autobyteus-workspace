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

  it('normalizes team member route keys and extracts stored filename/display name', () => {
    const owner = parseFinalContextFileOwnerDescriptor({
      kind: 'team_member_final',
      teamRunId: 'team-1',
      memberRouteKey: 'Solution Designer',
    });

    const locator = buildFinalContextFileLocator(owner, 'ctx_abc123__diagram-final.png');
    expect(locator).toBe('/rest/team-runs/team-1/members/Solution%20Designer/context-files/ctx_abc123__diagram-final.png');
    expect(getStoredFilenameFromLocator(locator)).toBe('ctx_abc123__diagram-final.png');
    expect(getDisplayNameFromStoredFilename('ctx_abc123__diagram-final.png')).toBe('diagram-final.png');
  });

  it('rejects invalid stored filenames when extracting from locators', () => {
    expect(getStoredFilenameFromLocator('/rest/runs/run-1/context-files/../../etc/passwd')).toBeNull();
  });
});
