import type { AppUpdateErrorKind, AppUpdateOperation, AppUpdateState } from '~/shared/appUpdateTypes';

const DEFAULT_ERROR_KIND: AppUpdateErrorKind = 'unknown';

const NOTICE_MESSAGE_KEYS: Record<AppUpdateErrorKind, string> = {
  network: 'shell.components.app.AppUpdateNotice.statusMessage.error.network',
  'release-preparing': 'shell.components.app.AppUpdateNotice.statusMessage.error.releasePreparing',
  metadata: 'shell.components.app.AppUpdateNotice.statusMessage.error.metadata',
  download: 'shell.components.app.AppUpdateNotice.statusMessage.error.download',
  install: 'shell.components.app.AppUpdateNotice.statusMessage.error.install',
  unavailable: 'shell.components.app.AppUpdateNotice.statusMessage.error.unavailable',
  unknown: 'shell.components.app.AppUpdateNotice.statusMessage.error.unknown',
};

const SETTINGS_MESSAGE_KEYS: Record<AppUpdateErrorKind, string> = {
  network: 'settings.components.settings.AboutSettingsManager.message.error.network',
  'release-preparing': 'settings.components.settings.AboutSettingsManager.message.error.releasePreparing',
  metadata: 'settings.components.settings.AboutSettingsManager.message.error.metadata',
  download: 'settings.components.settings.AboutSettingsManager.message.error.download',
  install: 'settings.components.settings.AboutSettingsManager.message.error.install',
  unavailable: 'settings.components.settings.AboutSettingsManager.message.error.unavailable',
  unknown: 'settings.components.settings.AboutSettingsManager.message.error.unknown',
};

const TOAST_MESSAGE_KEYS: Record<AppUpdateErrorKind, string> = {
  network: 'settings.updates.store.errors.network',
  'release-preparing': 'settings.updates.store.errors.releasePreparing',
  metadata: 'settings.updates.store.errors.metadata',
  download: 'settings.updates.store.errors.download',
  install: 'settings.updates.store.errors.install',
  unavailable: 'settings.updates.store.errors.unavailable',
  unknown: 'settings.updates.store.errors.unknown',
};

function resolveKind(errorKind: AppUpdateErrorKind | null | undefined): AppUpdateErrorKind {
  return errorKind ?? DEFAULT_ERROR_KIND;
}

export function getAppUpdateNoticeErrorMessageKey(errorKind: AppUpdateErrorKind | null | undefined): string {
  return NOTICE_MESSAGE_KEYS[resolveKind(errorKind)];
}

export function getSettingsAppUpdateErrorMessageKey(errorKind: AppUpdateErrorKind | null | undefined): string {
  return SETTINGS_MESSAGE_KEYS[resolveKind(errorKind)];
}

export function getAppUpdateErrorToastMessageKey(errorKind: AppUpdateErrorKind | null | undefined): string {
  return TOAST_MESSAGE_KEYS[resolveKind(errorKind)];
}

export function isQuietStartupAppUpdateError(
  state: Pick<AppUpdateState, 'status' | 'errorKind' | 'errorOperation'>,
): boolean {
  if (state.status !== 'error' || state.errorOperation !== 'startup-check') {
    return false;
  }

  return state.errorKind === 'network' || state.errorKind === 'release-preparing';
}

export function buildAppUpdateErrorToastSignature(
  errorKind: AppUpdateErrorKind | null | undefined,
  _errorOperation: AppUpdateOperation | null | undefined,
  _message: string,
): string {
  return resolveKind(errorKind);
}
