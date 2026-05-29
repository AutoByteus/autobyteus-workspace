import { describe, it, expect, afterEach } from 'vitest';
import {
  getDefaultSessionFactory,
  getFallbackSessionFactories,
  isWindows,
  isAndroid,
  isDarwin,
  setIsWindowsForTests,
  setIsAndroidForTests,
  setIsDarwinForTests
} from '../../../../src/tools/terminal/session-factory.js';

afterEach(() => {
  setIsWindowsForTests(() => process.platform === 'win32');
  setIsAndroidForTests(() => process.platform === 'android');
  setIsDarwinForTests(() => process.platform === 'darwin');
});

describe('session_factory', () => {
  it('returns DirectShellSession on Android', () => {
    setIsAndroidForTests(() => true);
    setIsWindowsForTests(() => false);
    setIsDarwinForTests(() => false);

    const factory = getDefaultSessionFactory();
    expect(factory.name).toBe('DirectShellSession');
  });

  it('returns WslTmuxSession on Windows', () => {
    setIsAndroidForTests(() => false);
    setIsWindowsForTests(() => true);
    setIsDarwinForTests(() => false);

    const factory = getDefaultSessionFactory();
    expect(factory.name).toBe('WslTmuxSession');
  });

  it('returns IsolatedPtySession on Darwin', () => {
    setIsAndroidForTests(() => false);
    setIsWindowsForTests(() => false);
    setIsDarwinForTests(() => true);

    const factory = getDefaultSessionFactory();
    expect(factory.name).toBe('IsolatedPtySession');
  });

  it('returns PtySession on non-Windows non-Darwin Unix', () => {
    setIsAndroidForTests(() => false);
    setIsWindowsForTests(() => false);
    setIsDarwinForTests(() => false);

    const factory = getDefaultSessionFactory();
    expect(factory.name).toBe('PtySession');
  });

  it('returns DirectShellSession as fallback for PtySession', () => {
    setIsAndroidForTests(() => false);
    setIsWindowsForTests(() => false);
    setIsDarwinForTests(() => false);

    const factory = getDefaultSessionFactory();
    const fallbacks = getFallbackSessionFactories(factory);

    expect(fallbacks.map((entry) => entry.name)).toEqual(['DirectShellSession']);
  });

  it('falls back from IsolatedPtySession to local PTY and direct shell backends', () => {
    setIsAndroidForTests(() => false);
    setIsWindowsForTests(() => false);
    setIsDarwinForTests(() => true);

    const factory = getDefaultSessionFactory();
    const fallbacks = getFallbackSessionFactories(factory);

    expect(fallbacks.map((entry) => entry.name)).toEqual(['PtySession', 'DirectShellSession']);
  });

  it('detects current platform', () => {
    const currentIsWindows = isWindows();
    const currentIsAndroid = isAndroid();
    const currentIsDarwin = isDarwin();
    expect(typeof currentIsWindows).toBe('boolean');
    expect(typeof currentIsAndroid).toBe('boolean');
    expect(typeof currentIsDarwin).toBe('boolean');
  });
});
