import { describe, expect, it } from 'vitest';
import {
  SETTINGS_BACK_ACTION,
  SETTINGS_DESTINATIONS,
  SETTINGS_NAVIGATION_REGION_ID,
  SERVER_SETTINGS_MODES,
  normalizeServerSettingsMode,
  normalizeSettingsSection,
  resolveSettingsNavigation,
} from '../settingsNavigation';

describe('settingsNavigation model', () => {
  it('owns the complete ordered Settings navigation identity', () => {
    expect(SETTINGS_DESTINATIONS.map(({ section }) => section)).toEqual([
      'api-keys',
      'token-usage',
      'messaging',
      'display',
      'language',
      'local-tools',
      'mcp-servers',
      'application-packages',
      'agent-packages',
      'server-settings',
      'extensions',
      'updates',
    ]);
    expect(SETTINGS_DESTINATIONS.every(({ availability }) => availability === 'always')).toBe(true);
    expect(SERVER_SETTINGS_MODES.map(({ mode }) => mode)).toEqual(['quick', 'advanced', 'migrations']);
    expect(SETTINGS_BACK_ACTION).toMatchObject({
      action: 'back-to-workspace',
      testId: 'settings-nav-back',
    });
  });

  it('normalizes current and legacy route identities without accepting unknown sections', () => {
    expect(normalizeSettingsSection('about')).toBe('updates');
    expect(normalizeSettingsSection('token-usage')).toBe('token-usage');
    expect(normalizeSettingsSection('server-status')).toBeNull();
    expect(normalizeSettingsSection('nodes')).toBeNull();
    expect(normalizeSettingsSection(['display'])).toBeNull();
    expect(normalizeServerSettingsMode('advanced')).toBe('advanced');
    expect(normalizeServerSettingsMode('migrations')).toBe('migrations');
    expect(normalizeServerSettingsMode('unknown')).toBe('quick');
  });

  it('resolves active destinations and non-server collapsed-header context', () => {
    const model = resolveSettingsNavigation('token-usage', 'quick');

    expect(model.region.id).toBe(SETTINGS_NAVIGATION_REGION_ID);
    expect(model.destinations.find(({ section }) => section === 'token-usage')?.isActive).toBe(true);
    expect(model.activeContext).toEqual({
      section: 'token-usage',
      primaryLabelKey: 'settings.page.sections.tokenUsage',
      secondaryLabelKey: null,
      iconClass: 'i-heroicons-chart-bar-20-solid',
    });
  });

  it.each([
    ['quick', 'settings.page.serverSettings.quick'],
    ['advanced', 'settings.page.serverSettings.advanced'],
    ['migrations', 'settings.page.serverSettings.migrations'],
  ] as const)('resolves Server Settings %s context from the same records', (mode, labelKey) => {
    const model = resolveSettingsNavigation('server-settings', mode);

    expect(model.activeContext.secondaryLabelKey).toBe(labelKey);
    expect(model.serverSettingsModes.find((item) => item.mode === mode)?.isActive).toBe(true);
  });
});
