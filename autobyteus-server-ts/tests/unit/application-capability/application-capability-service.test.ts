import { describe, expect, it, vi } from 'vitest';
import { ApplicationCapabilityService } from '../../../src/application-capability/services/application-capability-service.js';

const createHarness = (options?: {
  persisted?: boolean | null;
  hasDiscoverableApplications?: boolean;
}) => {
  let persisted = options?.persisted ?? null;
  const serverSettingsService = {
    getApplicationsEnabledSetting: vi.fn(() => persisted),
    setApplicationsEnabledSetting: vi.fn((enabled: boolean) => {
      persisted = enabled;
    }),
  };
  const applicationBundleService = {
    hasDiscoverableApplications: vi
      .fn()
      .mockResolvedValue(options?.hasDiscoverableApplications ?? false),
  };

  const service = new ApplicationCapabilityService({
    applicationBundleService,
    serverSettingsService,
  });

  return {
    service,
    applicationBundleService,
    serverSettingsService,
    getPersisted: () => persisted,
  };
};

describe('ApplicationCapabilityService', () => {
  it('returns the persisted server setting when one already exists', async () => {
    const harness = createHarness({ persisted: true });

    const capability = await harness.service.getCapability();

    expect(capability).toEqual({
      enabled: true,
      scope: 'BOUND_NODE',
      settingKey: 'ENABLE_APPLICATIONS',
      source: 'SERVER_SETTING',
    });
    expect(harness.applicationBundleService.hasDiscoverableApplications).not.toHaveBeenCalled();
  });

  it('initializes to enabled when discoverable applications already exist', async () => {
    const harness = createHarness({ persisted: null, hasDiscoverableApplications: true });

    const firstCapability = await harness.service.getCapability();
    const secondCapability = await harness.service.getCapability();

    expect(firstCapability).toEqual({
      enabled: true,
      scope: 'BOUND_NODE',
      settingKey: 'ENABLE_APPLICATIONS',
      source: 'INITIALIZED_FROM_DISCOVERED_APPLICATIONS',
    });
    expect(secondCapability).toEqual({
      enabled: true,
      scope: 'BOUND_NODE',
      settingKey: 'ENABLE_APPLICATIONS',
      source: 'SERVER_SETTING',
    });
    expect(harness.serverSettingsService.setApplicationsEnabledSetting).toHaveBeenCalledWith(true);
    expect(harness.applicationBundleService.hasDiscoverableApplications).toHaveBeenCalledTimes(1);
    expect(harness.getPersisted()).toBe(true);
  });

  it('initializes to disabled when the discoverable application catalog is empty', async () => {
    const harness = createHarness({ persisted: null, hasDiscoverableApplications: false });

    const capability = await harness.service.getCapability();

    expect(capability).toEqual({
      enabled: false,
      scope: 'BOUND_NODE',
      settingKey: 'ENABLE_APPLICATIONS',
      source: 'INITIALIZED_EMPTY_CATALOG',
    });
    expect(harness.serverSettingsService.setApplicationsEnabledSetting).toHaveBeenCalledWith(false);
    expect(harness.getPersisted()).toBe(false);
  });

  it('persists explicit runtime toggles through the typed setter', async () => {
    const harness = createHarness({ persisted: null, hasDiscoverableApplications: true });

    const capability = await harness.service.setEnabled(false);

    expect(capability).toEqual({
      enabled: false,
      scope: 'BOUND_NODE',
      settingKey: 'ENABLE_APPLICATIONS',
      source: 'SERVER_SETTING',
    });
    expect(harness.serverSettingsService.setApplicationsEnabledSetting).toHaveBeenNthCalledWith(1, true);
    expect(harness.serverSettingsService.setApplicationsEnabledSetting).toHaveBeenNthCalledWith(2, false);
    expect(harness.getPersisted()).toBe(false);
  });
});
