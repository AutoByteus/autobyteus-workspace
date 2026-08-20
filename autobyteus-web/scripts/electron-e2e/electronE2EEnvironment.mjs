const COMMON_SOURCE_KEYS = [
  'PATH', 'LANG', 'LANGUAGE', 'TZ', 'CI', 'NO_COLOR', 'FORCE_COLOR',
]

const PLATFORM_SOURCE_KEYS = {
  darwin: [
    'HOME', 'USER', 'LOGNAME', 'SHELL', 'TMPDIR', '__CF_USER_TEXT_ENCODING',
  ],
  linux: [
    'HOME', 'USER', 'LOGNAME', 'SHELL', 'TMPDIR', 'TMP', 'TEMP', 'DISPLAY',
    'WAYLAND_DISPLAY', 'XAUTHORITY', 'XDG_RUNTIME_DIR', 'DBUS_SESSION_BUS_ADDRESS',
    'DESKTOP_SESSION', 'XDG_CURRENT_DESKTOP',
  ],
  win32: [
    'SystemRoot', 'WINDIR', 'COMSPEC', 'PATHEXT', 'PATH', 'TEMP', 'TMP',
    'USERNAME', 'USERDOMAIN', 'USERPROFILE', 'HOMEDRIVE', 'HOMEPATH', 'APPDATA',
    'LOCALAPPDATA', 'ProgramData', 'ProgramFiles', 'ProgramFiles(x86)', 'ProgramW6432',
    'PROCESSOR_ARCHITECTURE', 'NUMBER_OF_PROCESSORS',
  ],
}

function normalizedKey(key, platform) {
  return platform === 'win32' ? key.toUpperCase() : key
}

function sourceEntry(sourceEnv, requestedKey, platform) {
  if (platform !== 'win32') {
    return Object.prototype.hasOwnProperty.call(sourceEnv, requestedKey)
      ? [requestedKey, sourceEnv[requestedKey]]
      : null
  }
  const requested = requestedKey.toUpperCase()
  const actualKey = Object.keys(sourceEnv).find((key) => key.toUpperCase() === requested)
  return actualKey ? [actualKey, sourceEnv[actualKey]] : null
}

export function buildCredentialSafeElectronEnv({
  sourceEnv,
  launch,
  extraEnv = {},
  platform = process.platform,
  isDeniedKey,
}) {
  if (typeof isDeniedKey !== 'function') {
    throw new Error('Credential-safe environment construction requires the compiled deny policy')
  }
  const baselineKeys = [...COMMON_SOURCE_KEYS, ...(PLATFORM_SOURCE_KEYS[platform] ?? [])]
  const reservedKeys = new Set([
    ...baselineKeys.map((key) => normalizedKey(key, platform)),
    'AUTOBYTEUS_ELECTRON_LAUNCH_PROFILE',
    'AUTOBYTEUS_ELECTRON_SERVER_PORT',
    'AUTOBYTEUS_ELECTRON_DATA_ROOT',
  ].map((key) => normalizedKey(key, platform)))
  const output = {}

  for (const requestedKey of baselineKeys) {
    const entry = sourceEntry(sourceEnv, requestedKey, platform)
    if (!entry) continue
    const [key, value] = entry
    if (typeof value === 'string' && !isDeniedKey(key, platform)) {
      output[key] = value
    }
  }
  for (const [key, value] of Object.entries(sourceEnv)) {
    if (
      /^LC_[A-Z0-9_]+$/.test(key)
      && typeof value === 'string'
      && !isDeniedKey(key, platform)
    ) {
      output[key] = value
    }
  }

  for (const [key, value] of Object.entries(extraEnv)) {
    if (reservedKeys.has(normalizedKey(key, platform))) {
      throw new Error(`extraEnv cannot override reserved E2E environment key: ${key}`)
    }
    if (isDeniedKey(key, platform)) {
      throw new Error(
        `extraEnv key ${key} is secret-bearing or unsafe; seed secrets into the isolated test context instead`,
      )
    }
    if (typeof value !== 'string') {
      throw new Error(`extraEnv value must be a string: ${key}`)
    }
    output[key] = value
  }

  for (const key of Object.keys(output)) {
    if (isDeniedKey(key, platform)) delete output[key]
  }
  output.AUTOBYTEUS_ELECTRON_LAUNCH_PROFILE = 'e2e'
  output.AUTOBYTEUS_ELECTRON_SERVER_PORT = String(launch.port)
  output.AUTOBYTEUS_ELECTRON_DATA_ROOT = launch.dataRoot
  return Object.freeze(output)
}

export const credentialSafeElectronEnvironmentSourceKeys = Object.freeze({
  common: [...COMMON_SOURCE_KEYS],
  darwin: [...PLATFORM_SOURCE_KEYS.darwin],
  linux: [...PLATFORM_SOURCE_KEYS.linux],
  win32: [...PLATFORM_SOURCE_KEYS.win32],
})
