import type { AppUpdateState } from '~/shared/appUpdateTypes';

type Readiness = Pick<AppUpdateState, 'activationMode' | 'automaticUpdate' | 'updateStaged' | 'availableVersion' | 'automaticInstallBlockedVersion'>;

/** Describe this verified release; the switch explanation describes the general preference. */
export function managedReadyMessageKey(state: Readiness) {
  const { activationMode, availableVersion } = state;
  if (activationMode === 'native' || !state.updateStaged || !availableVersion) return null;
  if (state.automaticInstallBlockedVersion === availableVersion) {
    return activationMode === 'managed-restart' ? 'settings.notifications.app.readyManual' : 'settings.notifications.app.readyManualFromMenu';
  }
  return activationMode === 'managed-quit' && state.automaticUpdate ? 'settings.notifications.app.readyOnQuit' : null;
}
