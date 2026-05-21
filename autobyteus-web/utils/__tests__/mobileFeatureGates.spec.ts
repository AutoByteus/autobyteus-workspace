import { describe, expect, it } from 'vitest';
import {
  assertMobileFeatureSupported,
  canUseLocalFolderPicker,
  isFeatureAvailableInRuntime,
  isMobileFeatureSupported,
  mobileFeatureForRouteLocation,
} from '~/utils/mobileFeatureGates';

describe('mobile feature gates', () => {
  it('allows mobile parity features and rejects Electron-only features', () => {
    expect(isMobileFeatureSupported('agentRuns')).toBe(true);
    expect(isMobileFeatureSupported('terminal')).toBe(true);
    expect(isMobileFeatureSupported('vnc')).toBe(true);
    expect(isMobileFeatureSupported('desktopUpdates')).toBe(false);
    expect(() => assertMobileFeatureSupported('localFolderPicker')).toThrow(/not available/);
  });

  it('maps mobile desktop routes to unsupported feature ids', () => {
    expect(mobileFeatureForRouteLocation({ path: '/settings', query: {} })).toBe('desktopSettings');
    expect(mobileFeatureForRouteLocation({ path: '/mobile/settings', query: { section: 'updates' } })).toBe('desktopUpdates');
    expect(mobileFeatureForRouteLocation({ path: '/applications/app-1', query: {} })).toBe('applicationIframe');
    expect(mobileFeatureForRouteLocation({ path: '/mobile/workspace', query: {} })).toBe('desktopWorkspace');
  });

  it('keeps desktop-only controls available outside mobile but blocked in mobile', () => {
    expect(isFeatureAvailableInRuntime('applicationIframe', false)).toBe(true);
    expect(isFeatureAvailableInRuntime('applicationIframe', true)).toBe(false);
    expect(canUseLocalFolderPicker({
      isEmbeddedWindow: true,
      hasElectronFolderDialog: true,
      mobileRuntime: false,
    })).toBe(true);
    expect(canUseLocalFolderPicker({
      isEmbeddedWindow: true,
      hasElectronFolderDialog: true,
      mobileRuntime: true,
    })).toBe(false);
  });
});
