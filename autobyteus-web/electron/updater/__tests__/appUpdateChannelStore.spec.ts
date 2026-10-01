import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { isAppUpdateChannel, loadAppUpdateChannel, saveAppUpdateChannel } from '../appUpdateChannelStore';

const { loggerMock } = vi.hoisted(() => ({
  loggerMock: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('../../logger', () => ({
  logger: loggerMock,
}));

describe('appUpdateChannelStore', () => {
  let userDataDir = '';
  const channelFile = () => path.join(userDataDir, 'app-update-channel.v1.json');

  beforeEach(() => {
    userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'app-update-channel-spec-'));
    vi.clearAllMocks();
  });

  afterEach(() => {
    fs.rmSync(userDataDir, { recursive: true, force: true });
  });

  it('reads stable when no preference file exists', () => {
    expect(loadAppUpdateChannel(userDataDir)).toBe('stable');
    expect(loggerMock.warn).not.toHaveBeenCalled();
    expect(loggerMock.error).not.toHaveBeenCalled();
  });

  it('round-trips a saved channel', () => {
    expect(saveAppUpdateChannel(userDataDir, 'beta')).toBe(true);
    expect(JSON.parse(fs.readFileSync(channelFile(), 'utf8'))).toEqual({ channel: 'beta' });
    expect(loadAppUpdateChannel(userDataDir)).toBe('beta');

    expect(saveAppUpdateChannel(userDataDir, 'stable')).toBe(true);
    expect(loadAppUpdateChannel(userDataDir)).toBe('stable');
  });

  it.each([
    ['an unknown channel', JSON.stringify({ channel: 'nightly' })],
    ['a missing channel field', JSON.stringify({})],
    ['a JSON null', 'null'],
    ['a JSON string', JSON.stringify('beta')],
  ])('reads stable for %s', (_label, content) => {
    fs.writeFileSync(channelFile(), content);
    expect(loadAppUpdateChannel(userDataDir)).toBe('stable');
    expect(loggerMock.warn).toHaveBeenCalledTimes(1);
  });

  it('reads stable for a corrupt file', () => {
    fs.writeFileSync(channelFile(), '{"channel": "be');
    expect(loadAppUpdateChannel(userDataDir)).toBe('stable');
    expect(loggerMock.error).toHaveBeenCalledTimes(1);
  });

  it('returns false and logs when the file cannot be written', () => {
    const missingDir = path.join(userDataDir, 'missing');
    expect(saveAppUpdateChannel(missingDir, 'beta')).toBe(false);
    expect(loggerMock.error).toHaveBeenCalledWith(
      '[updater] Failed to save the update channel preference.',
      expect.anything(),
    );
  });

  it('recognizes only stable and beta', () => {
    expect(isAppUpdateChannel('stable')).toBe(true);
    expect(isAppUpdateChannel('beta')).toBe(true);
    for (const value of ['Beta', 'nightly', '', null, undefined, 1, {}]) {
      expect(isAppUpdateChannel(value)).toBe(false);
    }
  });
});
