export {
  getDefaultSessionFactory,
  isWindows,
  isAndroid,
  isDarwin,
  setIsWindowsForTests,
  setIsAndroidForTests,
  setIsDarwinForTests
} from './session-factory.js';
export { DirectShellSession } from './direct-shell-session.js';
export { IsolatedPtySession } from './isolated-pty-session.js';
export { PtySession } from './pty-session.js';
export { WslTmuxSession } from './wsl-tmux-session.js';
export { TerminalSessionManager } from './terminal-session-manager.js';
export {
  TerminalResult,
  type BackgroundTaskStart,
  type BackgroundTaskEnd,
  type BackgroundTaskOutcome,
  type BackgroundCommandStarted
} from './types.js';
export {
  BackgroundProcessManager,
  type BackgroundTaskState,
  type BackgroundTaskChangeListener
} from './background-process-manager.js';
export { getBackgroundManager } from './background-process-context.js';
export type { TerminalSession, TerminalSessionFactory } from './terminal-session.js';
