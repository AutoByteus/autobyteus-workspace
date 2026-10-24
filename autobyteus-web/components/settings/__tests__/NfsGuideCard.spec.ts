import { mount, flushPromises } from '@vue/test-utils';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { localizationRuntime } from '~/localization/runtime/localizationRuntime';
import { nfsPublishedRelease, type NfsPublishedRelease } from '~/utils/nfsLauncherCommands';
import NfsGuideCard from '../NfsGuideCard.vue';

const wrappers: ReturnType<typeof mount>[] = [];
const render = (release: NfsPublishedRelease | null = nfsPublishedRelease) => {
  const wrapper = mount(NfsGuideCard, { props: { release } }); wrappers.push(wrapper); return wrapper;
};
const installed = ['interactive', 'create', 'connect', 'status', 'reconnect', 'detach', 'version'];
beforeEach(async () => {
  await localizationRuntime.setPreference('en');
  vi.useFakeTimers();
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: vi.fn().mockResolvedValue(undefined) } });
});
afterEach(() => { wrappers.splice(0).forEach(w => w.unmount()); vi.useRealTimers(); vi.restoreAllMocks(); });

describe('NFS guide', () => {
  it.each(['en', 'zh-CN'] as const)('retains only the advanced README link across descriptor states in %s', async locale => {
    await localizationRuntime.setPreference(locale);
    const notice = locale === 'en' ? 'Published installer: v0.1.0' : '已发布安装器：v0.1.0';
    for (const release of [nfsPublishedRelease, { ...nfsPublishedRelease, availableComputers: ['macos'] as const }, null, { ...nfsPublishedRelease, downloadUrl: 'http://unsafe' }]) {
      const w = render(release);
      expect(w.findAll('a').map(a => a.attributes('href'))).toEqual(['https://github.com/AutoByteus/autobyteus-nfs/blob/v0.1.0/README.md']);
      expect(w.get('a').attributes('target')).toBe('_blank');
      expect(w.get('a').attributes('rel')).toBe('noopener noreferrer');
      for (const label of ['View release downloads', 'Review the pinned installer script', '查看版本下载', '查看固定版本的安装脚本']) {
        expect(w.text()).not.toContain(label);
      }
      expect(w.text().includes(notice)).toBe(release !== null && release.downloadUrl.startsWith('https:'));
      expect(w.text()).toContain(locale === 'en' ? 'URL shown in the command' : '命令中网址对应的安装脚本');
    }
  });
  it.each([null, { ...nfsPublishedRelease, installerSha256: '' }, { ...nfsPublishedRelease, downloadUrl: 'http://unsafe' }])(
    'disables invalid/unavailable installers and version notice but keeps prerequisite installed reference', async release => {
      const w = render(release);
      expect(w.get('#nfs-release-unavailable').text()).toContain('Install separately');
      for (const id of ['macos', 'linux']) {
        expect(w.get(`[data-testid="copy-nfs-${id}"]`).attributes('disabled')).toBeDefined();
        await w.get(`[data-testid="copy-nfs-${id}"]`).trigger('click');
      }
      expect(navigator.clipboard.writeText).not.toHaveBeenCalled();
      expect(w.findAll('a').map(a => a.attributes('href'))).toEqual(['https://github.com/AutoByteus/autobyteus-nfs/blob/v0.1.0/README.md']);
      expect(w.text()).toContain('Run these only after installing');
      expect(w.findAll('code')).toHaveLength(7);
    },
  );
  it('only enables the available platform of a partial descriptor', () => {
    const w = render({ ...nfsPublishedRelease, availableComputers: ['macos'] });
    expect(w.get('[data-testid="copy-nfs-macos"]').attributes('disabled')).toBeUndefined();
    expect(w.get('[data-testid="copy-nfs-linux"]').attributes('disabled')).toBeDefined();
    expect(w.findAll('a').map(a => a.attributes('href'))).toEqual(['https://github.com/AutoByteus/autobyteus-nfs/blob/v0.1.0/README.md']);
    expect(w.text()).toContain('Published installer: v0.1.0');
  });
  it('copies exactly each displayed command with one success lifecycle and safe links', async () => {
    const w = render();
    expect(w.findAll('code')).toHaveLength(9);
    const labels = w.findAll('button').map(b => b.attributes('aria-label'));
    expect(new Set(labels).size).toBe(9);
    for (const id of ['macos', 'linux', ...installed]) {
      const button = w.get(`[data-testid="copy-nfs-${id}"]`);
      const card = button.element.parentElement!.parentElement!;
      await button.trigger('click'); await flushPromises();
      expect(navigator.clipboard.writeText).toHaveBeenLastCalledWith(card.querySelector('code')!.textContent);
      expect(button.text()).toBe('Copied');
      expect(w.get('[role="status"]').text()).toContain('Command copied');
      await vi.advanceTimersByTimeAsync(2000); expect(w.get('[role="status"]').text()).toBe('');
    }
    for (const a of w.findAll('a')) {
      expect(a.attributes('target')).toBe('_blank'); expect(a.attributes('rel')).toBe('noopener noreferrer');
    }
  });
  it('does not start a second clipboard request while one is pending', async () => {
    let resolve!: () => void;
    vi.mocked(navigator.clipboard.writeText).mockImplementation(() => new Promise<void>(r => { resolve = r; }));
    const w = render();
    await w.get('[data-testid="copy-nfs-create"]').trigger('click');
    expect(w.findAll('button').every(b => b.attributes('disabled') !== undefined)).toBe(true);
    expect(w.get('[role="status"]').text()).toBe('');
    await w.get('[data-testid="copy-nfs-macos"]').trigger('click');
    expect(navigator.clipboard.writeText).toHaveBeenCalledTimes(1);
    resolve(); await flushPromises();
    expect(w.get('[data-testid="copy-nfs-create"]').text()).toBe('Copied');
  });
  it('clears stale success on denial and supports unavailable clipboard/manual selection', async () => {
    const w = render();
    await w.get('[data-testid="copy-nfs-version"]').trigger('click'); await flushPromises();
    vi.mocked(navigator.clipboard.writeText).mockRejectedValue(Error('denied'));
    await w.get('[data-testid="copy-nfs-linux"]').trigger('click'); await flushPromises();
    expect(w.get('[role="status"]').text()).toContain('Select and copy');
    expect(w.get('[data-testid="copy-nfs-version"]').text()).toBe('Copy');
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: undefined });
    await w.get('[data-testid="copy-nfs-status"]').trigger('click'); await flushPromises();
    expect(w.get('[role="status"]').text()).toContain('Could not copy');
  });
  it.each(['resolve', 'reject'])('does not schedule state/timers after unmount on %s', async outcome => {
    let resolve!: () => void, reject!: (e: Error) => void;
    vi.mocked(navigator.clipboard.writeText).mockImplementation(() => new Promise<void>((a, b) => { resolve = a; reject = b; }));
    const w = render();
    await w.get('[data-testid="copy-nfs-detach"]').trigger('click');
    w.unmount(); wrappers.splice(wrappers.indexOf(w), 1);
    const timers = vi.getTimerCount();
    if (outcome === 'resolve') resolve(); else reject(Error('denied'));
    await flushPromises(); expect(vi.getTimerCount()).toBe(timers);
  });
  it('clears the success reset timer on unmount', async () => {
    const w = render(); await w.get('[data-testid="copy-nfs-version"]').trigger('click'); await flushPromises();
    const timers = vi.getTimerCount(); w.unmount(); wrappers.splice(wrappers.indexOf(w), 1);
    expect(vi.getTimerCount()).toBe(timers - 1);
  });
  it('renders actual Chinese messages and still copies exact command bytes', async () => {
    await localizationRuntime.setPreference('zh-CN');
    const w = render();
    expect(w.text()).toContain('1. 安装命令行工具'); expect(w.text()).toContain('仍待进行');
    expect(w.text()).not.toContain('settings.components');
    await w.get('[data-testid="copy-nfs-status"]').trigger('click'); await flushPromises();
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('~/.local/bin/autobyteus-nfs status');
    expect(w.get('[data-testid="copy-nfs-status"]').text()).toBe('已复制');
  });
});
