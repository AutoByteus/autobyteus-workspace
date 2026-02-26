import { PtySession } from './pty-session.js';
import { WslTmuxSession } from './wsl-tmux-session.js';

let isWindowsImpl = () => process.platform === 'win32';

export function isWindows(): boolean {
  return isWindowsImpl();
}

export function setIsWindowsForTests(fn: () => boolean): void {
  isWindowsImpl = fn;
}

export function getDefaultSessionFactory() {
  if (isWindows()) {
    return WslTmuxSession;
  }

  return PtySession;
}
