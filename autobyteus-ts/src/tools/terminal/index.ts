export {
  getDefaultSessionFactory,
  isWindows,
  isAndroid,
  setIsWindowsForTests,
  setIsAndroidForTests
} from './session-factory.js';
export { DirectShellSession } from './direct-shell-session.js';
export { PtySession } from './pty-session.js';
export { WslTmuxSession } from './wsl-tmux-session.js';
export { TerminalSessionManager } from './terminal-session-manager.js';
export { TerminalResult, BackgroundProcessOutput, ProcessInfo } from './types.js';
export type { TerminalSession, TerminalSessionFactory } from './terminal-session.js';
