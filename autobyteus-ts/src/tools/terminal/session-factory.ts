import { PtySession } from './pty-session.js';
import { WslTmuxSession } from './wsl-tmux-session.js';
import { DirectShellSession } from './direct-shell-session.js';
import type { TerminalSessionFactory } from './terminal-session.js';

let isWindowsImpl = () => process.platform === 'win32';
let isAndroidImpl = () => (
  process.platform === 'android'
  || Boolean(process.env.ANDROID_ROOT)
  || Boolean(process.env.ANDROID_DATA)
);

export function isWindows(): boolean {
  return isWindowsImpl();
}

export function isAndroid(): boolean {
  return isAndroidImpl();
}

export function setIsWindowsForTests(fn: () => boolean): void {
  isWindowsImpl = fn;
}

export function setIsAndroidForTests(fn: () => boolean): void {
  isAndroidImpl = fn;
}

export function getDefaultSessionFactory(): TerminalSessionFactory {
  if (isAndroid()) {
    return DirectShellSession;
  }

  if (isWindows()) {
    return WslTmuxSession;
  }

  return PtySession;
}
