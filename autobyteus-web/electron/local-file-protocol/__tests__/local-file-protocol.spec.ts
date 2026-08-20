import type { WebFrameMain } from 'electron';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const protocolMocks = vi.hoisted(() => ({
  registerSchemesAsPrivileged: vi.fn(),
  onBeforeRequest: vi.fn(),
  handle: vi.fn(),
  createLocalFileResponse: vi.fn(),
  logError: vi.fn(),
}));

vi.mock('electron', () => ({
  protocol: {
    registerSchemesAsPrivileged: protocolMocks.registerSchemesAsPrivileged,
    handle: protocolMocks.handle,
  },
  session: {
    defaultSession: {
      webRequest: {
        onBeforeRequest: protocolMocks.onBeforeRequest,
      },
    },
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

import { installLocalFileProtocol } from '../local-file-protocol';
import { registerLocalFileProtocolScheme } from '../register-local-file-scheme';

const createFrame = (kind = 'main-frame'): WebFrameMain => ({
  kind,
  isDestroyed: () => false,
} as unknown as WebFrameMain);

describe('local-file protocol lifecycle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('registers exactly the required standard streaming Fetch and CORS privileges', () => {
    registerLocalFileProtocolScheme();

    expect(protocolMocks.registerSchemesAsPrivileged).toHaveBeenCalledOnce();
    expect(protocolMocks.registerSchemesAsPrivileged).toHaveBeenCalledWith([
      {
        scheme: 'local-file',
        privileges: {
          standard: true,
          stream: true,
          supportFetchAPI: true,
          corsEnabled: true,
        },
      },
    ]);
  });

  it('installs one filtered main-frame gate before one delegating handler', async () => {
    const expectedResponse = new Response('video bytes');
    protocolMocks.createLocalFileResponse.mockResolvedValue(expectedResponse);
    const mainFrame = createFrame();
    const isOwnedMainFrame = vi.fn((_webContentsId: number, _frame: WebFrameMain) => true);

    installLocalFileProtocol({ isOwnedMainFrame });

    expect(protocolMocks.onBeforeRequest).toHaveBeenCalledOnce();
    expect(protocolMocks.onBeforeRequest.mock.calls[0][0]).toEqual({
      urls: ['local-file://*/*'],
    });
    expect(protocolMocks.handle).toHaveBeenCalledOnce();
    expect(protocolMocks.handle.mock.calls[0][0]).toBe('local-file');
    expect(protocolMocks.onBeforeRequest.mock.invocationCallOrder[0])
      .toBeLessThan(protocolMocks.handle.mock.invocationCallOrder[0]);

    const requestGate = protocolMocks.onBeforeRequest.mock.calls[0][1] as (
      details: { webContentsId?: number; frame?: WebFrameMain | null },
      callback: (response: { cancel: boolean }) => void,
    ) => void;
    const gateCallback = vi.fn();
    requestGate({ webContentsId: 42, frame: mainFrame }, gateCallback);
    expect(isOwnedMainFrame).toHaveBeenCalledWith(42, mainFrame);
    expect(gateCallback).toHaveBeenCalledWith({ cancel: false });

    const handler = protocolMocks.handle.mock.calls[0][1] as (
      request: Request,
    ) => Promise<Response>;
    const request = new Request('local-file://local/tmp/video.mp4');
    await expect(handler(request)).resolves.toBe(expectedResponse);
    expect(protocolMocks.createLocalFileResponse).toHaveBeenCalledWith(request);
  });

  it('cancels absent requester identities before consulting the registry predicate', () => {
    const isOwnedMainFrame = vi.fn((_webContentsId: number, _frame: WebFrameMain) => true);
    installLocalFileProtocol({ isOwnedMainFrame });
    const requestGate = protocolMocks.onBeforeRequest.mock.calls[0][1] as (
      details: { webContentsId?: number; frame?: WebFrameMain | null },
      callback: (response: { cancel: boolean }) => void,
    ) => void;

    for (const details of [
      {},
      { webContentsId: 42 },
      { frame: createFrame() },
      { webContentsId: 42, frame: null },
    ]) {
      const callback = vi.fn();
      requestGate(details, callback);
      expect(callback).toHaveBeenCalledWith({ cancel: true });
    }
    expect(isOwnedMainFrame).not.toHaveBeenCalled();
  });

  it('cancels unknown, destroyed, and same-webContents subframe identities rejected by the registry', () => {
    const isOwnedMainFrame = vi.fn((_webContentsId: number, _frame: WebFrameMain) => false);
    installLocalFileProtocol({ isOwnedMainFrame });
    const requestGate = protocolMocks.onBeforeRequest.mock.calls[0][1] as (
      details: { webContentsId: number; frame: WebFrameMain },
      callback: (response: { cancel: boolean }) => void,
    ) => void;
    const rejectedIdentities = [
      { webContentsId: 999, frame: createFrame('unknown-shell-frame') },
      { webContentsId: 42, frame: createFrame('destroyed-main-frame') },
      { webContentsId: 42, frame: createFrame('same-webContents-subframe') },
    ];

    for (const details of rejectedIdentities) {
      const callback = vi.fn();
      requestGate(details, callback);
      expect(callback).toHaveBeenCalledWith({ cancel: true });
    }
    expect(isOwnedMainFrame).toHaveBeenCalledTimes(rejectedIdentities.length);
  });

  it('fails closed when the live registry predicate throws', () => {
    const isOwnedMainFrame = vi.fn((_webContentsId: number, _frame: WebFrameMain) => {
      throw new Error('destroyed during lookup');
    });
    installLocalFileProtocol({ isOwnedMainFrame });
    const requestGate = protocolMocks.onBeforeRequest.mock.calls[0][1] as (
      details: { webContentsId: number; frame: WebFrameMain },
      callback: (response: { cancel: boolean }) => void,
    ) => void;
    const callback = vi.fn();

    requestGate({ webContentsId: 42, frame: createFrame() }, callback);

    expect(callback).toHaveBeenCalledWith({ cancel: true });
    expect(protocolMocks.logError).toHaveBeenCalledOnce();
  });

  it('returns a deterministic no-byte response for an unexpected owner failure', async () => {
    protocolMocks.createLocalFileResponse.mockRejectedValue(new Error('unexpected'));
    installLocalFileProtocol({
      isOwnedMainFrame: vi.fn((_webContentsId: number, _frame: WebFrameMain) => true),
    });
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
