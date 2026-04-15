import type { WebContents } from 'electron';
import type { ElectronAppLogger } from './logger';

const DIAGNOSTIC_CONSOLE_PREFIXES = [
  '[ApplicationSurface]',
  '[ApplicationIframeHost]',
  '[BriefStudio]',
] as const;

const toLoggerMethod = (
  level: number,
): keyof Pick<ElectronAppLogger, 'debug' | 'info' | 'warn' | 'error'> => {
  switch (level) {
    case 3:
      return 'error';
    case 2:
      return 'warn';
    case 0:
      return 'debug';
    case 1:
    default:
      return 'info';
  }
};

const shouldPersistRendererMessage = (message: string): boolean =>
  DIAGNOSTIC_CONSOLE_PREFIXES.some((prefix) => message.startsWith(prefix));

export function attachRendererConsoleDiagnostics(
  webContents: Pick<WebContents, 'on'>,
  options: {
    logger: ElectronAppLogger;
    nodeId: string;
  },
): void {
  const rendererLogger = options.logger.child('renderer.console');
  webContents.on('console-message', (_event, level, message, line, sourceId) => {
    if (!shouldPersistRendererMessage(message)) {
      return;
    }

    const loggerMethod = toLoggerMethod(level);
    rendererLogger[loggerMethod](
      `${message} (nodeId=${options.nodeId}, source=${sourceId || 'unknown'}, line=${line})`,
    );
  });
}
