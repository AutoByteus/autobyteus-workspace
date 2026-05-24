import { PtySession } from './pty-session.js';
import { IsolatedPtySession } from './isolated-pty-session.js';
import { WslTmuxSession } from './wsl-tmux-session.js';
import { DirectShellSession } from './direct-shell-session.js';
import type { TerminalSessionFactory } from './terminal-session.js';

let isWindowsImpl = () => process.platform === 'win32';
let isAndroidImpl = () => (
  process.platform === 'android'
  || Boolean(process.env.ANDROID_ROOT)
  || Boolean(process.env.ANDROID_DATA)
);
let isDarwinImpl = () => process.platform === 'darwin';

export function isWindows(): boolean {
  return isWindowsImpl();
}

export function isAndroid(): boolean {
  return isAndroidImpl();
}

export function isDarwin(): boolean {
  return isDarwinImpl();
}

export function setIsWindowsForTests(fn: () => boolean): void {
  isWindowsImpl = fn;
}

export function setIsAndroidForTests(fn: () => boolean): void {
  isAndroidImpl = fn;
}

export function setIsDarwinForTests(fn: () => boolean): void {
  isDarwinImpl = fn;
}

export function getDefaultSessionFactory(): TerminalSessionFactory {
  if (isAndroid()) {
    return DirectShellSession;
  }

  if (isWindows()) {
    return WslTmuxSession;
  }

  if (isDarwin()) {
    return IsolatedPtySession;
  }

  return PtySession;
}

export function getFallbackSessionFactories(
  primaryFactory: TerminalSessionFactory,
): TerminalSessionFactory[] {
  if (primaryFactory === PtySession) {
    return [DirectShellSession];
  }

  if (primaryFactory === IsolatedPtySession) {
    return [PtySession, DirectShellSession];
  }

  return [];
}
