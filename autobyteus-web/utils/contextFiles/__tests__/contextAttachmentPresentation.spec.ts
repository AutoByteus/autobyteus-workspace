import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createExternalUrlContextAttachment,
  createUploadedContextAttachment,
  createWorkspaceContextAttachment,
} from '../contextAttachmentModel';
import { contextAttachmentPresentation } from '../contextAttachmentPresentation';

const { getServerBaseUrlMock, getServerUrlsMock } = vi.hoisted(() => ({
  getServerBaseUrlMock: vi.fn(() => 'https://app.example'),
  getServerUrlsMock: vi.fn(() => ({ rest: 'https://api.example/rest' })),
}));

vi.mock('~/utils/serverConfig', () => ({
  getServerBaseUrl: getServerBaseUrlMock,
  getServerUrls: getServerUrlsMock,
}));

describe('contextAttachmentPresentation.openAttachment', () => {
  const openWorkspaceFile = vi.fn();
  const openFilePreview = vi.fn();
  const openBrowserUrl = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('opens workspace-path attachments through the workspace file opener', () => {
    const attachment = createWorkspaceContextAttachment('/Users/normy/project/notes.txt', 'Text');

    contextAttachmentPresentation.openAttachment(attachment, {
      workspaceId: 'ws-1',
      openWorkspaceFile,
      openFilePreview,
      openBrowserUrl,
      preferFileViewerForPreviewableImages: true,
    });

    expect(openWorkspaceFile).toHaveBeenCalledWith('/Users/normy/project/notes.txt', 'ws-1');
    expect(openFilePreview).not.toHaveBeenCalled();
    expect(openBrowserUrl).not.toHaveBeenCalled();
  });

  it('routes previewable uploaded images into file preview when preferred', () => {
    const attachment = createUploadedContextAttachment({
      storedFilename: 'ctx_upload__proof.png',
      locator: 'https://node.example/rest/runs/run-1/context-files/ctx_upload__proof.png',
      displayName: 'proof.png',
      phase: 'final',
      type: 'Image',
    });

    contextAttachmentPresentation.openAttachment(attachment, {
      workspaceId: 'ws-1',
      openWorkspaceFile,
      openFilePreview,
      openBrowserUrl,
      preferFileViewerForPreviewableImages: true,
    });

    expect(openFilePreview).toHaveBeenCalledWith(
      'https://node.example/rest/runs/run-1/context-files/ctx_upload__proof.png',
      'ws-1',
    );
    expect(openWorkspaceFile).not.toHaveBeenCalled();
    expect(openBrowserUrl).not.toHaveBeenCalled();
  });

  it('routes previewable external images into file preview when preferred', () => {
    const attachment = createExternalUrlContextAttachment({
      locator: 'https://cdn.example.com/image.png',
      displayName: 'image.png',
      type: 'Image',
    });

    contextAttachmentPresentation.openAttachment(attachment, {
      workspaceId: 'ws-1',
      openWorkspaceFile,
      openFilePreview,
      openBrowserUrl,
      preferFileViewerForPreviewableImages: true,
    });

    expect(openFilePreview).toHaveBeenCalledWith('https://cdn.example.com/image.png', 'ws-1');
    expect(openWorkspaceFile).not.toHaveBeenCalled();
    expect(openBrowserUrl).not.toHaveBeenCalled();
  });

  it('falls back to browser-open behavior when image preview has failed', () => {
    const attachment = createUploadedContextAttachment({
      storedFilename: 'ctx_upload__proof.png',
      locator: 'https://node.example/rest/runs/run-1/context-files/ctx_upload__proof.png',
      displayName: 'proof.png',
      phase: 'final',
      type: 'Image',
    });

    contextAttachmentPresentation.openAttachment(attachment, {
      workspaceId: 'ws-1',
      openWorkspaceFile,
      openFilePreview,
      openBrowserUrl,
      preferFileViewerForPreviewableImages: true,
      failedKeys: new Set([attachment.id]),
    });

    expect(openBrowserUrl).toHaveBeenCalledWith('https://node.example/rest/runs/run-1/context-files/ctx_upload__proof.png');
    expect(openFilePreview).not.toHaveBeenCalled();
    expect(openWorkspaceFile).not.toHaveBeenCalled();
  });
});
