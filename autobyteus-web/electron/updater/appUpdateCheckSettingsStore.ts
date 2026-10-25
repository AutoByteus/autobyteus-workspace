import * as fsSync from 'fs';
import * as path from 'path';
import { DEFAULT_APP_UPDATE_AUTO_CHECK, isAppUpdateAutoCheck, type AppUpdateAutoCheck } from '../../shared/appUpdateTypes';
import { logger } from '../logger';

const APP_UPDATE_CHECKS_FILE_NAME = 'app-update-checks.json';

function getSettingsFilePath(userDataPath: string): string {
  return path.join(userDataPath, APP_UPDATE_CHECKS_FILE_NAME);
}

/**
 * Reads `<userData>/app-update-checks.json` (`{ enabled, intervalMinutes }`). A missing file
 * means the default (on, every 60 minutes); an unreadable or invalid one also reads as the
 * default, with a warning.
 */
export function loadAppUpdateCheckSettings(userDataPath: string): AppUpdateAutoCheck {
  const filePath = getSettingsFilePath(userDataPath);
  if (!fsSync.existsSync(filePath)) {
    return { ...DEFAULT_APP_UPDATE_AUTO_CHECK };
  }
  try {
    const parsed = JSON.parse(fsSync.readFileSync(filePath, 'utf8')) as unknown;
    if (isAppUpdateAutoCheck(parsed)) {
      return { enabled: parsed.enabled, intervalMinutes: parsed.intervalMinutes };
    }
    logger.warn('[updater] App update check settings are invalid; using the default (on, every 60 minutes).');
  } catch (error) {
    logger.error('[updater] Failed to read the app update check settings; using the default.', error);
  }
  return { ...DEFAULT_APP_UPDATE_AUTO_CHECK };
}

/** Saves the settings. Returns false when the file could not be written. */
export function saveAppUpdateCheckSettings(userDataPath: string, settings: AppUpdateAutoCheck): boolean {
  try {
    fsSync.writeFileSync(
      getSettingsFilePath(userDataPath),
      JSON.stringify({ enabled: settings.enabled, intervalMinutes: settings.intervalMinutes }, null, 2),
      'utf8',
    );
    return true;
  } catch (error) {
    logger.error('[updater] Failed to save the app update check settings.', error);
    return false;
  }
}
