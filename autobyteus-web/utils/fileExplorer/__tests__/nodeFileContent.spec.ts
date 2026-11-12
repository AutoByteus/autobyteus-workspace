import { beforeEach, describe, expect, it, vi } from 'vitest';

const transport = vi.hoisted(() => ({ fetch: vi.fn() }));
vi.mock('~/utils/remoteAccess/authorizedTransport', () => ({ authorizedFetch: transport.fetch }));
import {
  loadNodeFile,
  nodeFileContentUrl,
  nodeFilePreviewError,
  nodeFilePreviewErrorMessageKey,
} from '../nodeFileContent';

describe('the shared node-file loader (autobyteus-471)', () => {
  beforeEach(() => transport.fetch.mockReset());

  it('builds the node-file URL from a REST base, the path encoded', () => {
    expect(nodeFileContentUrl('http://node.example/rest/', '/Users/a b/x#1.md'))
      .toBe('http://node.example/rest/node-files/content?path=%2FUsers%2Fa%20b%2Fx%231.md');
  });

  it('keeps text as content and anything else as a blob, fetched once with the client credential', async () => {
    transport.fetch.mockResolvedValueOnce(new Response('# Notes', { status: 200 }));
    expect(await loadNodeFile('http://node.example/rest', '/w/notes.md', true)).toEqual({ kind: 'text', content: '# Notes' });
    expect(transport.fetch).toHaveBeenCalledWith('http://node.example/rest/node-files/content?path=%2Fw%2Fnotes.md');
    transport.fetch.mockResolvedValueOnce(new Response(new Blob([new Uint8Array([0x89, 0x50])]), { status: 200 }));
    const image = await loadNodeFile('http://node.example/rest', '/w/a.png', false);
    expect(image.kind).toBe('blob');
  });

  it('maps the node\'s refusals; any other failure, a network error included, is "failed"', async () => {
    const cases = [
      [new Response(JSON.stringify({ code: 'NODE_FILE_NOT_FOUND' }), { status: 404 }), 'not-found'],
      [new Response(JSON.stringify({ code: 'NODE_FILE_IS_FOLDER' }), { status: 400 }), 'folder'],
      [new Response(JSON.stringify({ code: 'NODE_FILE_UNREADABLE' }), { status: 400 }), 'failed'],
      [new Response('oops', { status: 500 }), 'failed'],
    ] as const;
    for (const [answer, refusal] of cases) {
      transport.fetch.mockResolvedValueOnce(answer);
      expect(await loadNodeFile('http://n/rest', '/w/x.md', true)).toEqual({ kind: 'refused', refusal });
    }
    transport.fetch.mockRejectedValueOnce(new TypeError('network'));
    expect(await loadNodeFile('http://n/rest', '/w/x.md', true)).toEqual({ kind: 'refused', refusal: 'failed' });
  });

  it('words a refusal stored as an open file\'s error, and nothing else', () => {
    expect(nodeFilePreviewErrorMessageKey(nodeFilePreviewError('not-found'))).toBe('workspace.components.mobile.views.MobileFiles.node_file_not_found');
    expect(nodeFilePreviewErrorMessageKey(nodeFilePreviewError('folder'))).toBe('workspace.components.mobile.views.MobileFiles.node_file_is_folder');
    expect(nodeFilePreviewErrorMessageKey(nodeFilePreviewError('failed'))).toBe('workspace.components.conversation.segments.renderer.MarkdownRenderer.file_preview_failed');
    expect(nodeFilePreviewErrorMessageKey('local-file-preview:unreadable')).toBeNull();
    expect(nodeFilePreviewErrorMessageKey('Some other error')).toBeNull();
  });
});
