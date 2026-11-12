import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { downloadMimeTypeOf, SAVE_FAILED_MESSAGE, useMobileFileDownload } from '../useMobileFileDownload';

// autobyteus-472 DS-003 (REQ-004, REQ-005): Download reads the open file's bytes from its own URL (with the phone's key
// on the node's routes) and hands them to the Android app as base64 over the shell bridge; in a browser, to the
// browser's download. The key is never in the message, the name or a URL.

const io = vi.hoisted(() => ({ fetch: vi.fn(), credential: 'phone-key-SECRET' as string | null }));
vi.mock('~/utils/remoteAccess/authorizedTransport', async (importOriginal) => ({
  ...(await importOriginal<typeof import('~/utils/remoteAccess/authorizedTransport')>()),
  getActiveRemoteAccessCredential: () => io.credential,
  fetchWithRemoteAccessCredential: (input: string, init: RequestInit, credential: string | null) => io.fetch(input, init, credential),
}));
const toasts = vi.hoisted(() => ({ addToast: vi.fn() }));
vi.mock('~/composables/useToasts', () => ({ useToasts: () => toasts }));

const PDF_BYTES = '%PDF-1.4 resume';

const installShell = () => {
  const shell = { postMessage: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn() };
  (window as unknown as { AutoByteusShell?: unknown }).AutoByteusShell = shell;
  return shell;
};

beforeEach(() => {
  setActivePinia(createPinia());
  io.fetch.mockReset().mockResolvedValue(new Response(PDF_BYTES, { status: 200, headers: { 'content-type': 'application/pdf' } }));
  toasts.addToast.mockReset();
});
afterEach(() => {
  delete (window as unknown as { AutoByteusShell?: unknown }).AutoByteusShell;
  vi.restoreAllMocks();
});

describe('useMobileFileDownload', () => {
  it('in the Android app hands the bytes to the app as base64 under the file\'s own name, with no key or URL', async () => {
    const shell = installShell();
    const url = 'http://192.168.77.40:29695/rest/workspaces/w-1/content?path=docs%2Fresume.pdf';
    await useMobileFileDownload().download({ path: '/home/me/docs/resume.pdf', type: 'PDF', url });

    // The page's own request carries the key, as the viewer's did.
    expect(io.fetch).toHaveBeenCalledWith(url, expect.anything(), 'phone-key-SECRET');
    expect(shell.postMessage).toHaveBeenCalledTimes(1);
    const sent = shell.postMessage.mock.calls[0][0] as string;
    expect(JSON.parse(sent)).toEqual({ type: 'saveFile', fileName: 'resume.pdf', mimeType: 'application/pdf', base64: btoa(PDF_BYTES) });
    expect(sent).not.toContain('phone-key-SECRET');
    expect(sent).not.toContain('192.168.77.40');
    expect(toasts.addToast).not.toHaveBeenCalled();
  });

  it('reads a node file from its object URL', async () => {
    const shell = installShell();
    await useMobileFileDownload().download({ path: '/srv/out/chart.PNG', type: 'Image', url: 'blob:http://node/abc' });
    expect(io.fetch.mock.calls[0][0]).toBe('blob:http://node/abc');
    expect(JSON.parse(shell.postMessage.mock.calls[0][0])).toMatchObject({ fileName: 'chart.PNG', mimeType: 'image/png' });
  });

  it('in a phone browser uses the browser\'s download of an object URL', async () => {
    const created = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:download-1');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    const clicked: Array<{ href: string; download: string }> = [];
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      clicked.push({ href: this.href, download: this.download });
    });
    await useMobileFileDownload().download({ path: '/w/photo.jpeg', type: 'Image', url: 'blob:http://node/photo' });
    expect(created).toHaveBeenCalledTimes(1);
    expect(clicked).toEqual([{ href: 'blob:download-1', download: 'photo.jpeg' }]);
  });

  it('says it could not save when the bytes cannot be read, and hands nothing over', async () => {
    const shell = installShell();
    io.fetch.mockResolvedValue(new Response('', { status: 404 }));
    await useMobileFileDownload().download({ path: '/w/resume.pdf', type: 'PDF', url: 'blob:gone' });
    expect(shell.postMessage).not.toHaveBeenCalled();
    expect(toasts.addToast).toHaveBeenCalledWith(SAVE_FAILED_MESSAGE, 'error');
    expect(SAVE_FAILED_MESSAGE).toBe("Couldn't save the file.");
  });

  it('saves only PDFs and images, under a name whose extension matches the type', async () => {
    expect(downloadMimeTypeOf({ path: '/a/b.pdf', type: 'PDF' })).toBe('application/pdf');
    expect(downloadMimeTypeOf({ path: '/a/b.jpg', type: 'Image' })).toBe('image/jpeg');
    expect(downloadMimeTypeOf({ path: '/a/b.svg', type: 'Image' })).toBe('image/svg+xml');
    expect(downloadMimeTypeOf({ path: '/a/b.md', type: 'Text' })).toBeNull();
    expect(downloadMimeTypeOf({ path: '/a/b.mp4', type: 'Video' })).toBeNull();
    expect(downloadMimeTypeOf({ path: '/a/b.pdf', type: 'Image' })).toBeNull();
    expect(downloadMimeTypeOf({ path: '/a/b', type: 'PDF' })).toBeNull();

    const shell = installShell();
    await useMobileFileDownload().download({ path: '/w/notes.md', type: 'Text', url: 'blob:x' });
    expect(io.fetch).not.toHaveBeenCalled();
    expect(shell.postMessage).not.toHaveBeenCalled();
  });
});
