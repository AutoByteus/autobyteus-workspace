import { describe, expect, it } from 'vitest';
import { hydrateContextAttachment } from '../contextAttachmentModel';

describe('hydrateContextAttachment local-file transition', () => {
  it('hydrates legacy and canonical locators into the canonical external current variant', () => {
    const legacy = hydrateContextAttachment({
      locator: 'local-file:///Users/Normy/Video%20100%25%231.mp4',
      type: 'Video',
    });
    const canonical = hydrateContextAttachment({
      locator: 'local-file://local/Users/Normy/Video%20100%25%231.mp4',
      type: 'Video',
    });

    expect(legacy).toMatchObject({
      kind: 'external_url',
      id: 'local-file://local/Users/Normy/Video%20100%25%231.mp4',
      locator: 'local-file://local/Users/Normy/Video%20100%25%231.mp4',
      type: 'Video',
    });
    expect(canonical).toEqual(legacy);
  });

  it('retains unsupported local locator metadata in an explicit non-executable variant', () => {
    expect(hydrateContextAttachment({
      locator: 'local-file://opaque/image.png',
      type: 'image',
      displayName: 'image.png',
    })).toEqual({
      kind: 'unsupported_local_file',
      id: 'local-file://opaque/image.png',
      locator: 'local-file://opaque/image.png',
      displayName: 'image.png',
      type: 'Image',
    });
  });

  it('leaves non-local external and workspace locator classification unchanged', () => {
    expect(hydrateContextAttachment({ locator: 'https://cdn.example/image.png' })).toMatchObject({
      kind: 'external_url',
      locator: 'https://cdn.example/image.png',
    });
    expect(hydrateContextAttachment({ locator: 'notes/readme.md' })).toMatchObject({
      kind: 'workspace_path',
      locator: 'notes/readme.md',
    });
  });
});

describe('recognized upload basename labels', () => {
  it.each([
    '/rest/drafts/agent-runs/draft/context-files/',
    '/rest/drafts/team-runs/draft/members/lead/context-files/',
    '/rest/drafts/agent-org-runs/root/agent-runs/task/context-files/',
    '/rest/runs/agent/context-files/',
    '/rest/team-runs/team/members/lead/context-files/',
    '/rest/agent-org-runs/root/agent-runs/task/context-files/',
  ])('formats an encoded or decoded recorded basename only on %s', route => {
    const storedFilename = 'ctx_token__notes 100%.txt';
    const encoded = encodeURIComponent(storedFilename);
    for (const displayName of [storedFilename, encoded, null]) {
      const attachment = hydrateContextAttachment({ locator: route + encoded, type: 'text', displayName });
      expect(attachment).toMatchObject({ kind: 'uploaded', id: storedFilename, storedFilename,
        locator: route + encoded, displayName: 'notes 100%.txt', type: 'Text' });
    }
    expect(hydrateContextAttachment({ locator: route + encoded, displayName: 'ctx_custom__notes.txt' }).displayName)
      .toBe('ctx_custom__notes.txt');
  });
});
