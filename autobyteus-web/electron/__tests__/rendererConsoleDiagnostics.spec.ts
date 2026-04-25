import { EventEmitter } from 'events';
import { describe, expect, it, vi } from 'vitest';
import { attachRendererConsoleDiagnostics } from '../rendererConsoleDiagnostics';

describe('attachRendererConsoleDiagnostics', () => {
  it('persists authoritative ApplicationSurface diagnostics from renderer console output', () => {
    const webContents = new EventEmitter();
    const childLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };
    const logger = {
      child: vi.fn().mockReturnValue(childLogger),
    };

    attachRendererConsoleDiagnostics(webContents as never, {
      logger: logger as never,
      nodeId: 'embedded',
    });

    webContents.emit(
      'console-message',
      {},
      1,
      '[ApplicationSurface] committed launch descriptor sessionId=session-1 iframeLaunchId=session-1::iframe-launch-1',
      21,
      'file:///Applications/AutoByteus.app/Contents/Resources/app/index.html',
    );

    expect(logger.child).toHaveBeenCalledWith('renderer.console');
    expect(childLogger.info).toHaveBeenCalledWith(
      '[ApplicationSurface] committed launch descriptor sessionId=session-1 iframeLaunchId=session-1::iframe-launch-1 (nodeId=embedded, source=file:///Applications/AutoByteus.app/Contents/Resources/app/index.html, line=21)',
    );
  });

  it('persists targeted iframe bridge diagnostics from renderer console output', () => {
    const webContents = new EventEmitter();
    const childLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };
    const logger = {
      child: vi.fn().mockReturnValue(childLogger),
    };

    attachRendererConsoleDiagnostics(webContents as never, {
      logger: logger as never,
      nodeId: 'embedded',
    });

    webContents.emit(
      'console-message',
      {},
      1,
      '[ApplicationIframeHost] posted bootstrap payload sessionId=session-1',
      42,
      'http://127.0.0.1:29695/application-bundles/app/assets/ui/index.html',
    );

    expect(logger.child).toHaveBeenCalledWith('renderer.console');
    expect(childLogger.info).toHaveBeenCalledWith(
      '[ApplicationIframeHost] posted bootstrap payload sessionId=session-1 (nodeId=embedded, source=http://127.0.0.1:29695/application-bundles/app/assets/ui/index.html, line=42)',
    );
  });

  it('ignores unrelated renderer console chatter', () => {
    const webContents = new EventEmitter();
    const childLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };
    const logger = {
      child: vi.fn().mockReturnValue(childLogger),
    };

    attachRendererConsoleDiagnostics(webContents as never, {
      logger: logger as never,
      nodeId: 'embedded',
    });

    webContents.emit('console-message', {}, 1, '[Vue warn]: component missing key', 12, 'renderer.js');

    expect(childLogger.debug).not.toHaveBeenCalled();
    expect(childLogger.info).not.toHaveBeenCalled();
    expect(childLogger.warn).not.toHaveBeenCalled();
    expect(childLogger.error).not.toHaveBeenCalled();
  });
});
