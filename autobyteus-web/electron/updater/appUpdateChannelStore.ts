import * as fsSync from 'fs';
import * as path from 'path';
import type { AppUpdateChannel } from '../../shared/appUpdateTypes';
import { logger } from '../logger';

const APP_UPDATE_CHANNEL_FILE_NAME = 'app-update-channel.v1.json';
const DEFAULT_APP_UPDATE_CHANNEL: AppUpdateChannel = 'stable';

function getChannelFilePath(userDataPath: string): string {
  return path.join(userDataPath, APP_UPDATE_CHANNEL_FILE_NAME);
}

export function isAppUpdateChannel(value: unknown): value is AppUpdateChannel {
  return value === 'stable' || value === 'beta';
}

/** Reads the saved channel. A missing, unreadable or invalid value means `stable`. */
export function loadAppUpdateChannel(userDataPath: string): AppUpdateChannel {
  const filePath = getChannelFilePath(userDataPath);
  if (!fsSync.existsSync(filePath)) {
    return DEFAULT_APP_UPDATE_CHANNEL;
  }

  try {
    const parsed = JSON.parse(fsSync.readFileSync(filePath, 'utf8')) as { channel?: unknown } | null;
    const channel = parsed?.channel;
    if (isAppUpdateChannel(channel)) {
      return channel;
    }
    logger.warn('[updater] Update channel file is invalid; using the stable channel.');
  } catch (error) {
    logger.error('[updater] Failed to read the update channel file; using the stable channel.', error);
  }
  return DEFAULT_APP_UPDATE_CHANNEL;
}

/** Saves the channel. Returns false when the file could not be written. */
export function saveAppUpdateChannel(userDataPath: string, channel: AppUpdateChannel): boolean {
  try {
    fsSync.writeFileSync(getChannelFilePath(userDataPath), JSON.stringify({ channel }, null, 2), 'utf8');
    return true;
  } catch (error) {
    logger.error('[updater] Failed to save the update channel preference.', error);
    return false;
  }
}
