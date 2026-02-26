import { initializeLogging } from '../../src/utils/logger.js';

export function setConsoleLogLevel(level?: string, filePath?: string): void {
  initializeLogging({ level, filePath });
}
