import type { AppUpdateErrorKind, AppUpdateOperation, AppUpdateState } from '~/shared/appUpdateTypes';

const DEFAULT_ERROR_KIND: AppUpdateErrorKind = 'unknown';

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

export function getSettingsAppUpdateErrorMessageKey(errorKind: AppUpdateErrorKind | null | undefined): string {
  return SETTINGS_MESSAGE_KEYS[resolveKind(errorKind)];
}

export function getAppUpdateErrorToastMessageKey(errorKind: AppUpdateErrorKind | null | undefined): string {
  return TOAST_MESSAGE_KEYS[resolveKind(errorKind)];
}

/**
 * A check the user did not start (at launch or periodically) never raises a toast (DEC-016, REQ-025);
 * Settings → Updates shows its error.
 */
export function isQuietBackgroundAppUpdateError(
  state: Pick<AppUpdateState, 'status' | 'errorOperation'>,
): boolean {
  return state.status === 'error' && (state.errorOperation === 'startup-check' || state.errorOperation === 'periodic-check');
}

export function buildAppUpdateErrorToastSignature(
  errorKind: AppUpdateErrorKind | null | undefined,
  _errorOperation: AppUpdateOperation | null | undefined,
  _message: string,
): string {
  return resolveKind(errorKind);
}
