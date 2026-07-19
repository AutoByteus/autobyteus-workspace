import { beforeEach, describe, expect, it, vi } from 'vitest';

const protocolMocks = vi.hoisted(() => ({
  registerSchemesAsPrivileged: vi.fn(),
  handle: vi.fn(),
  createLocalFileResponse: vi.fn(),
  logError: vi.fn(),
}));

vi.mock('electron', () => ({
  protocol: {
    registerSchemesAsPrivileged: protocolMocks.registerSchemesAsPrivileged,
    handle: protocolMocks.handle,
  },
}));

vi.mock('../local-file-response', () => ({
  createLocalFileResponse: protocolMocks.createLocalFileResponse,
}));

vi.mock('../../logger', () => ({
  logger: {
    child: () => ({ error: protocolMocks.logError }),
  },
}));

import {
  installLocalFileProtocol,
  registerLocalFileProtocolScheme,
} from '../local-file-protocol';

describe('local-file protocol lifecycle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('registers exactly the standard streaming privileges', () => {
    registerLocalFileProtocolScheme();

    expect(protocolMocks.registerSchemesAsPrivileged).toHaveBeenCalledOnce();
    expect(protocolMocks.registerSchemesAsPrivileged).toHaveBeenCalledWith([
      {
        scheme: 'local-file',
        privileges: { standard: true, stream: true },
      },
    ]);
  });

  it('installs one handler that delegates to the response owner', async () => {
    const expectedResponse = new Response('video bytes');
    protocolMocks.createLocalFileResponse.mockResolvedValue(expectedResponse);

    installLocalFileProtocol();

    expect(protocolMocks.handle).toHaveBeenCalledOnce();
    expect(protocolMocks.handle.mock.calls[0][0]).toBe('local-file');

    const handler = protocolMocks.handle.mock.calls[0][1] as (
      request: Request,
    ) => Promise<Response>;
    const request = new Request('local-file://local/tmp/video.mp4');
    await expect(handler(request)).resolves.toBe(expectedResponse);
    expect(protocolMocks.createLocalFileResponse).toHaveBeenCalledWith(request);
  });

  it('returns a deterministic no-byte response for an unexpected owner failure', async () => {
    protocolMocks.createLocalFileResponse.mockRejectedValue(new Error('unexpected'));
    installLocalFileProtocol();
    const handler = protocolMocks.handle.mock.calls[0][1] as (
      request: Request,
    ) => Promise<Response>;

    const response = await handler(new Request('local-file://local/tmp/video.mp4'));

    expect(response.status).toBe(404);
    expect(response.body).toBeNull();
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(protocolMocks.logError).toHaveBeenCalledOnce();
  });
});
