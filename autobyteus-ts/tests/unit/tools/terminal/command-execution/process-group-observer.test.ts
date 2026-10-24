import { it, expect, vi } from 'vitest';
import { ProcessGroupObserver } from '../../../../../src/tools/terminal/command-execution/process-group-observer.js';
const target = { kind: 'wsl', wslExecutable: 'wsl.exe', distro: 'Ubuntu' } as const;
it('requires exact-distro session/group/birth proof and revalidates before signalling', async () => {
  let stdout = '100 1 100 100 S 555\n101 100 100 100 S 556\n';
  const run = vi.fn(async () => ({ stdout }));
  const observer = new ProcessGroupObserver(run);
  const group = await observer.establish(target, 100, Date.now() + 500);
  await observer.signal(group, 'TERM', Date.now() + 500);
  expect(run.mock.calls.at(-1)?.slice(0, 2)).toMatchObject(['wsl.exe', ['-d', 'Ubuntu', '--exec', '/bin/kill', '-TERM', '--', '-100']]);
  stdout = '100 1 100 100 S 999\n';
  await expect(observer.signal(group, 'KILL', Date.now() + 500)).rejects.toThrow('identity lost');
});
it.each(['100 1 100 200 S 555\n', '', 'malformed'])('refuses unverified anchor %s', async stdout => {
  const observer = new ProcessGroupObserver(async () => ({ stdout }));
  await expect(observer.establish(target, 100, Date.now() + 500)).rejects.toThrow();
});
it('does not translate inspection denial into empty absence', async () => {
  const observer = new ProcessGroupObserver(async () => { throw new Error('permission denied'); });
  await expect(observer.snapshot(target)).rejects.toThrow('permission denied');
});
