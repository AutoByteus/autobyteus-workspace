import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createUploadedContextAttachment, createWorkspaceContextAttachment } from '~/utils/contextFiles/contextAttachmentModel';
import type { ContextAttachment } from '~/types/conversation';

// autobyteus-450 DS-001 / REQ-002: on the phone an attachment opens in the phone's viewer, never by navigating the page.

const nav = vi.hoisted(() => ({ openContextFile: vi.fn(), openFile: vi.fn(), openNodeFile: vi.fn() }));
const pathOpen = vi.hoisted(() => ({ openMobileFilePath: vi.fn() }));
vi.mock('~/composables/mobile/useMobileNavigation', () => ({ useMobileNavigation: () => nav }));
vi.mock('~/composables/mobile/mobileFileOpening', () => pathOpen);
vi.mock('~/stores/windowNodeContextStore', () => ({
  useWindowNodeContextStore: () => ({ initialized: true, nodeBaseUrl: 'http://node.example', getBoundEndpoints: () => ({ rest: 'http://node.example/rest' }) }),
}));

import { useMobileAttachmentOpening } from '../useMobileAttachmentOpening';

describe('useMobileAttachmentOpening', () => {
  const windowOpen = vi.fn();
  beforeEach(() => {
    vi.clearAllMocks();
    window.open = windowOpen as typeof window.open;
    pathOpen.openMobileFilePath.mockResolvedValue({ status: 'opened', path: 'docs/a.md' });
  });

  it('opens an uploaded file (sent or draft) on the Files screen by its node URL path and name, with no navigation', async () => {
    const { open } = useMobileAttachmentOpening();
    for (const phase of ['final', 'draft'] as const) {
      const locator = phase === 'final' ? '/rest/runs/run-1/context-files/ctx_ab__photo.png' : '/rest/drafts/agent-runs/run-1/context-files/ctx_ab__photo.png';
      await open(createUploadedContextAttachment({ storedFilename: 'ctx_ab__photo.png', locator, displayName: 'photo.png', phase, type: 'Image' }));
      expect(nav.openContextFile).toHaveBeenLastCalledWith({ locator, name: 'photo.png' });
    }
    expect(windowOpen).not.toHaveBeenCalled();
  });

  it('opens a path on the node through the phone\'s path open (a workspace or node file), as a file link does', async () => {
    const { open } = useMobileAttachmentOpening();
    await open(createWorkspaceContextAttachment('/Users/me/project/notes.txt', 'Text'));
    expect(pathOpen.openMobileFilePath).toHaveBeenCalledWith(expect.objectContaining({ absolutePath: '/Users/me/project/notes.txt', mobileNavigation: nav }));
    expect(windowOpen).not.toHaveBeenCalled();
  });

  it('a path the phone cannot open here (another node\'s run) opens nothing and navigates nowhere', async () => {
    pathOpen.openMobileFilePath.mockResolvedValue({ status: 'unavailable' });
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    await useMobileAttachmentOpening().open(createWorkspaceContextAttachment('/elsewhere/a.md', 'Markdown'));
    expect(windowOpen).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it('an external URL (another site) still opens outside the page; an unsupported local file opens nothing', async () => {
    const { open } = useMobileAttachmentOpening();
    await open({ kind: 'external_url', id: 'x', locator: 'https://example.org/spec.pdf', displayName: 'spec.pdf', type: 'Pdf' } as ContextAttachment);
    expect(windowOpen).toHaveBeenCalledWith('https://example.org/spec.pdf', '_blank', 'noopener,noreferrer');
    windowOpen.mockClear();
    await open({ kind: 'unsupported_local_file', id: 'y', locator: 'C:\\a.png', displayName: 'a.png', type: 'Image' } as ContextAttachment);
    expect(windowOpen).not.toHaveBeenCalled();
    expect(nav.openContextFile).not.toHaveBeenCalled();
  });
});
