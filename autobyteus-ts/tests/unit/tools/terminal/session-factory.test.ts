import { describe, it, expect, afterEach } from 'vitest';
import {
  getDefaultSessionFactory,
  isWindows,
  isAndroid,
  setIsWindowsForTests,
  setIsAndroidForTests
} from '../../../../src/tools/terminal/session-factory.js';

afterEach(() => {
  setIsWindowsForTests(() => process.platform === 'win32');
  setIsAndroidForTests(() => process.platform === 'android');
});

describe('session_factory', () => {
  it('returns DirectShellSession on Android', () => {
    setIsAndroidForTests(() => true);
    setIsWindowsForTests(() => false);

    const factory = getDefaultSessionFactory();
    expect(factory.name).toBe('DirectShellSession');
  });

  it('returns WslTmuxSession on Windows', () => {
    setIsAndroidForTests(() => false);
    setIsWindowsForTests(() => true);

    const factory = getDefaultSessionFactory();
    expect(factory.name).toBe('WslTmuxSession');
  });

  it('returns PtySession on non-Windows', () => {
    setIsAndroidForTests(() => false);
    setIsWindowsForTests(() => false);

    const factory = getDefaultSessionFactory();
    expect(factory.name).toBe('PtySession');
  });

  it('detects current platform', () => {
    const currentIsWindows = isWindows();
    const currentIsAndroid = isAndroid();
    expect(typeof currentIsWindows).toBe('boolean');
    expect(typeof currentIsAndroid).toBe('boolean');
  });
});
