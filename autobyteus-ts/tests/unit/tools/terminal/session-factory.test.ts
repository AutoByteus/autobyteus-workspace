import { describe, it, expect, afterEach } from 'vitest';
import { getDefaultSessionFactory, isWindows, setIsWindowsForTests } from '../../../../src/tools/terminal/session-factory.js';

afterEach(() => {
  setIsWindowsForTests(() => process.platform === 'win32');
});

describe('session_factory', () => {
  it('returns WslTmuxSession on Windows', () => {
    setIsWindowsForTests(() => true);

    const factory = getDefaultSessionFactory();
    expect(factory.name).toBe('WslTmuxSession');
  });

  it('returns PtySession on non-Windows', () => {
    setIsWindowsForTests(() => false);

    const factory = getDefaultSessionFactory();
    expect(factory.name).toBe('PtySession');
  });

  it('detects current platform', () => {
    const currentIsWindows = isWindows();
    expect(typeof currentIsWindows).toBe('boolean');
  });
});
