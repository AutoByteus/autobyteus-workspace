import { isMobileRemoteAccessRuntime, stripMobileRuntimePrefix } from '~/utils/remoteAccess/mobileRuntime';

export type MobileFeatureId =
  | 'pairing'
  | 'serverStatus'
  | 'agentRuns'
  | 'agentTeamRuns'
  | 'runHistory'
  | 'workspaceFiles'
  | 'terminal'
  | 'desktopWorkspace'
  | 'desktopSettings'
  | 'desktopUpdates'
  | 'localFolderPicker'
  | 'applicationIframe';

const supportedMobileFeatures = new Set<MobileFeatureId>([
  'pairing',
  'serverStatus',
  'agentRuns',
  'agentTeamRuns',
  'runHistory',
  'workspaceFiles',
]);

export function isMobileFeatureSupported(featureId: MobileFeatureId): boolean {
  return supportedMobileFeatures.has(featureId);
}

export function assertMobileFeatureSupported(featureId: MobileFeatureId): void {
  if (!isMobileFeatureSupported(featureId)) {
    throw new Error(`Feature '${featureId}' is not supported in the mobile client yet.`);
  }
}

export function isFeatureAvailableInRuntime(
  featureId: MobileFeatureId,
  mobileRuntime = isMobileRemoteAccessRuntime(),
): boolean {
  return !mobileRuntime || isMobileFeatureSupported(featureId);
}

export function mobileFeatureForRouteLocation(input: {
  path: string;
  query?: Record<string, unknown>;
}): MobileFeatureId | null {
  const path = stripMobileRuntimePrefix(input.path);
  if (path.startsWith('/workspace')) {
    return 'desktopWorkspace';
  }
  if (path.startsWith('/applications')) {
    return 'applicationIframe';
  }
  if (path.startsWith('/settings')) {
    const section = String(input.query?.section ?? '').toLowerCase();
    return section === 'updates' || section === 'about' ? 'desktopUpdates' : 'desktopSettings';
  }
  return null;
}

export function canUseLocalFolderPicker(input: {
  isEmbeddedWindow: boolean;
  hasElectronFolderDialog: boolean;
  mobileRuntime?: boolean;
}): boolean {
  return input.isEmbeddedWindow
    && input.hasElectronFolderDialog
    && isFeatureAvailableInRuntime('localFolderPicker', input.mobileRuntime);
}
