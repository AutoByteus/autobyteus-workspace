export function buildElectronE2ELaunchEnvironment({
  sourceEnv,
  launch,
  extraEnv = {},
}) {
  const output = {
    ...sourceEnv,
    ...extraEnv,
    AUTOBYTEUS_ELECTRON_LAUNCH_PROFILE: 'e2e',
    AUTOBYTEUS_ELECTRON_SERVER_PORT: String(launch.port),
    AUTOBYTEUS_ELECTRON_DATA_ROOT: launch.dataRoot,
  }
  return Object.freeze(output)
}
