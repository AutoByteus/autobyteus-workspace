import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';
import { logger } from '../logger';

/** "Update automatically" for the app (autobyteus-356), kept by the desktop in `<userData>/app-update-automatic.json`. */
const APP_UPDATE_AUTOMATIC_FILE_NAME = 'app-update-automatic.json';

const filePathOf = (userDataPath: string): string => path.join(userDataPath, APP_UPDATE_AUTOMATIC_FILE_NAME);

/** Reads the switch. A missing, unreadable or invalid file means off. */
export function loadAppUpdateAutomatic(userDataPath: string): boolean {
  let raw: string;
  try {
    raw = fs.readFileSync(filePathOf(userDataPath), 'utf8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      logger.warn('[updater] The automatic update setting is unreadable; it is off.', error);
    }
    return false;
  }
  try {
    const enabled = (JSON.parse(raw) as { enabled?: unknown } | null)?.enabled;
    if (typeof enabled === 'boolean') return enabled;
    logger.warn('[updater] The automatic update setting has an unknown shape; it is off.');
  } catch (error) {
    logger.warn('[updater] The automatic update setting is not valid JSON; it is off.', error);
  }
  return false;
}

/** Saves the switch atomically. Returns false when the file could not be written. */
export function saveAppUpdateAutomatic(userDataPath: string, enabled: boolean): boolean {
  const target = filePathOf(userDataPath);
  const temporary = `${target}.${randomUUID()}.tmp`;
  try {
    fs.writeFileSync(temporary, `${JSON.stringify({ enabled }, null, 2)}\n`, 'utf8');
    fs.renameSync(temporary, target);
    return true;
  } catch (error) {
    fs.rmSync(temporary, { force: true });
    logger.error('[updater] Failed to save the automatic update setting.', error);
    return false;
  }
}
