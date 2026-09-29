/**
 * Isolated-launch capability marker shipped with every desktop build.
 *
 * `isolatedLaunchContract` states the isolated-launch contract this build honors: in the `e2e`
 * launch profile the embedded server gets only the system-baseline environment, and updates
 * report the quiet `disabled` state. `pnpm isolated-app` refuses builds without it. Bump the
 * integer only when that contract changes incompatibly.
 */
export const ISOLATED_LAUNCH_MARKER_FILE = 'isolated-launch.json'

export const ISOLATED_LAUNCH_CONTRACT = 1

export const ISOLATED_LAUNCH_MARKER_SOURCE_PATH = `build/isolated-launch/${ISOLATED_LAUNCH_MARKER_FILE}`

/** electron-builder resource: `<resources>/isolated-launch.json` (macOS, Linux unpacked, AppImage). */
export const ISOLATED_LAUNCH_MARKER_EXTRA_RESOURCE = {
  from: ISOLATED_LAUNCH_MARKER_SOURCE_PATH,
  to: ISOLATED_LAUNCH_MARKER_FILE,
} as const
