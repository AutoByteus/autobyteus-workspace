import { it, expect, vi } from 'vitest';
import { ProcessGroupObserver } from '../../../../../src/tools/terminal/command-execution/process-group-observer.js';
const target = { kind: 'wsl', wslExecutable: 'wsl.exe', distro: 'Ubuntu' } as const;
it('requires exact-distro session/group/birth proof and revalidates before signalling', async () => {
  let stdout = '100 1 100 100 S 555\n101 100 100 100 S 556\n';
  const run = vi.fn(async () => ({ stdout }));
  const observer = new ProcessGroupObserver(run);
  const group = await observer.establish(target, 100, Date.now() + 500);
  await observer.signal(group, 'TERM', Date.now() + 500, () => true);
  expect(run.mock.calls.at(-1)?.slice(0, 2)).toMatchObject(['wsl.exe', ['-d', 'Ubuntu', '--exec', '/bin/kill', '-TERM', '--', '-100']]);
  stdout = '100 1 100 100 S 999\n';
  await expect(observer.signal(group, 'KILL', Date.now() + 500, () => true)).rejects.toThrow('identity lost');
});
it.each(['100 1 100 200 S 555\n', '', 'malformed'])('refuses unverified anchor %s', async stdout => {
  const observer = new ProcessGroupObserver(async () => ({ stdout }));
  await expect(observer.establish(target, 100, Date.now() + 500)).rejects.toThrow();
});
it('does not translate inspection denial into empty absence', async () => {
  const observer = new ProcessGroupObserver(async () => { throw new Error('permission denied'); });
  await expect(observer.snapshot(target)).rejects.toThrow('permission denied');
});

it('clips a shared observation to each caller deadline without starting another scan', async () => {
  let release!: (value: { stdout: string }) => void;
  const run = vi.fn(() => new Promise<{ stdout: string }>(resolve => { release = resolve; }));
  const observer = new ProcessGroupObserver(run);
  const first = observer.snapshot(target, Date.now() + 500);
  await expect(observer.snapshot(target, Date.now() + 10)).rejects.toThrow('deadline exceeded');
  expect(run).toHaveBeenCalledTimes(1);
  release({ stdout: '100 1 100 100 S 555\n' });
  await expect(first).resolves.toHaveLength(1);
});

it('never treats an empty process table as confirmed absence', async () => {
  await expect(new ProcessGroupObserver(async () => ({ stdout: '' })).snapshot(target)).rejects.toThrow('not absence evidence');
});
it('refuses signalling when captured anchor exit is observed during revalidation', async () => {
  const run = vi.fn(async () => ({ stdout: '100 1 100 100 S 555\n' }));
  const observer = new ProcessGroupObserver(run);
  const group = await observer.establish(target, 100, Date.now() + 500);
  await expect(observer.signal(group, 'TERM', Date.now() + 500, () => false)).rejects.toThrow('exit observed');
  expect(run.mock.calls).toHaveLength(2);
});
