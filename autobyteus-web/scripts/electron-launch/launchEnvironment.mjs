export const LAUNCH_PROFILE_ENV = 'AUTOBYTEUS_ELECTRON_LAUNCH_PROFILE'
export const SERVER_PORT_ENV = 'AUTOBYTEUS_ELECTRON_SERVER_PORT'
export const DATA_ROOT_ENV = 'AUTOBYTEUS_ELECTRON_DATA_ROOT'

/**
 * Environment for launching an isolated (`e2e` profile) AutoByteus desktop process.
 *
 * The caller environment is preserved (the app's server-environment policy decides what reaches
 * the embedded server) except `ELECTRON_RUN_AS_NODE`: callers inside AutoByteus inherit it from
 * the main app's server, and it would make the desktop binary run as plain Node.
 */
export function buildIsolatedLaunchEnvironment({
  sourceEnv,
  launch,
  extraEnv = {},
}) {
  const output = {
    ...sourceEnv,
    ...extraEnv,
    [LAUNCH_PROFILE_ENV]: 'e2e',
    [SERVER_PORT_ENV]: String(launch.port),
    [DATA_ROOT_ENV]: launch.dataRoot,
  }
  delete output.ELECTRON_RUN_AS_NODE
  return Object.freeze(output)
}
