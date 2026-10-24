import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { reactive } from 'vue';
import AboutSettingsManager from '../AboutSettingsManager.vue';
import { localizationRuntime } from '~/localization/runtime/localizationRuntime';

/** Settings → Updates: the app's own automatic check (UXJ-010, REQ-012/013/015/025). */
const holder = vi.hoisted(() => ({ store: null as any }));
vi.mock('~/stores/appUpdateStore', () => ({ useAppUpdateStore: () => holder.store }));

const mountPanel = () => mount(AboutSettingsManager, {
  global: { mocks: { $t: (key: string, params?: Record<string, string | number>) => localizationRuntime.translate(key, params) } },
});

beforeEach(() => {
  holder.store = reactive({
    initialized: true, isElectron: true, status: 'no-update', message: '', currentVersion: '1.5.6',
    currentVersionIsPrerelease: false, updateChannel: 'stable', updateStaged: false,
    checkedAt: '2026-10-23T10:00:00.000Z', availableVersion: null, errorKind: null, errorOperation: null,
    autoCheck: { enabled: true, intervalMinutes: 60 } as { enabled: boolean; intervalMinutes: number } | null,
    initialize: vi.fn(), checkForUpdates: vi.fn(), downloadUpdate: vi.fn(), installUpdateAndRestart: vi.fn(), setUpdateChannel: vi.fn(),
    setAutoCheck: vi.fn(async (change: Record<string, unknown>) => {
      holder.store.autoCheck = { ...holder.store.autoCheck, ...change };
      return true;
    }),
  });
});

describe('Settings → Updates automatic check', () => {
  it('is on by default, every 1 hour, with what it contacts (VIS-024)', () => {
    const wrapper = mountPanel();
    expect(wrapper.get('[data-testid="settings-updates-auto-check-toggle"]').attributes('aria-checked')).toBe('true');
    expect(wrapper.get('[data-testid="settings-updates-auto-state"]').text()).toBe('Automatic checks: every 1 hour');
    expect(wrapper.get('[data-testid="settings-updates-auto-check-description"]').text())
      .toContain('A newer version is only announced; you decide to download and install it.');
    expect((wrapper.get('[data-testid="update-interval-app-value"]').element as HTMLInputElement).value).toBe('1');
    expect(wrapper.get('[data-testid="settings-updates-status"]').text()).toContain('Up to date');
  });

  it('turning it off dims the interval, says it has no effect, and the state line says off (VIS-026)', async () => {
    const wrapper = mountPanel();
    await wrapper.get('[data-testid="settings-updates-auto-check-toggle"]').trigger('click');
    await flushPromises();
    expect(holder.store.setAutoCheck).toHaveBeenCalledWith({ enabled: false });
    expect(wrapper.get('[data-testid="settings-updates-auto-check-no-effect"]').text())
      .toBe('Automatic checks are off. Check for Updates below still works.');
    expect(wrapper.get('[data-testid="settings-updates-auto-state"]').text()).toBe('Automatic checks: off');
  });

  it('before any check with automatic checks off, the status says so', () => {
    holder.store.status = 'idle';
    holder.store.checkedAt = null;
    holder.store.autoCheck = { enabled: false, intervalMinutes: 60 };
    const wrapper = mountPanel();
    expect(wrapper.get('[data-testid="settings-updates-status"]').text()).toContain('Automatic checks are off');
  });

  it('saves the interval through the shell, and shows the refusal when the shell does not take it', async () => {
    const wrapper = mountPanel();
    await wrapper.get('[data-testid="update-interval-app-value"]').setValue('30');
    await wrapper.get('[data-testid="update-interval-app-unit"]').setValue('minutes');
    await flushPromises();
    expect(holder.store.setAutoCheck).toHaveBeenCalledWith({ intervalMinutes: 30 });
    holder.store.setAutoCheck.mockResolvedValueOnce(false);
    await wrapper.get('[data-testid="update-interval-app-value"]').setValue('45');
    await wrapper.get('[data-testid="update-interval-app-value"]').trigger('blur');
    await flushPromises();
    expect(wrapper.get('[data-testid="update-interval-app-hint"]').text()).toBe('Enter a whole number from 15 minutes to 24 hours.');
  });

  it('a failed periodic check shows Check failed and the note (VIS-025, REQ-025)', () => {
    holder.store.status = 'error';
    holder.store.errorKind = 'network';
    holder.store.errorOperation = 'periodic-check';
    const wrapper = mountPanel();
    expect(wrapper.get('[data-testid="settings-updates-status"]').text()).toContain('Check failed');
    expect(wrapper.get('[data-testid="settings-updates-auto-failed-note"]').text())
      .toBe('The last automatic check failed. The next one runs at the interval.');
  });

  it('has no automatic-check section when this launch never checks (disabled updates, browser windows)', () => {
    holder.store.autoCheck = null;
    const wrapper = mountPanel();
    expect(wrapper.find('[data-testid="settings-updates-auto-check"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="settings-updates-auto-state"]').exists()).toBe(false);
  });
});
