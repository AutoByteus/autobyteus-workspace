export const LAUNCH_PROFILE_ENV = 'AUTOBYTEUS_ELECTRON_LAUNCH_PROFILE'
export const SERVER_PORT_ENV = 'AUTOBYTEUS_ELECTRON_SERVER_PORT'
export const DATA_ROOT_ENV = 'AUTOBYTEUS_ELECTRON_DATA_ROOT'
export const TEST_UPDATE_FEED_URL_ENV = 'AUTOBYTEUS_ELECTRON_TEST_UPDATE_FEED_URL'

/**
 * Environment for launching an isolated (`e2e` profile) AutoByteus desktop process.
 *
 * The caller environment is preserved (the app's server-environment policy decides what reaches
 * the embedded server) except `ELECTRON_RUN_AS_NODE`: callers inside AutoByteus inherit it from
 * the main app's server, and it would make the desktop binary run as plain Node.
 * The test update feed is set only by an explicit `launch.testUpdateFeedUrl`; an inherited value
 * is dropped, so an isolated instance stays quiet without the opt-in.
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
  delete output[TEST_UPDATE_FEED_URL_ENV]
  if (launch.testUpdateFeedUrl) output[TEST_UPDATE_FEED_URL_ENV] = launch.testUpdateFeedUrl
  return Object.freeze(output)
}
