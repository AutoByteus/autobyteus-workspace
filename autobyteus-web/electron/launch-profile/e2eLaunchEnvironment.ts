import { ELECTRON_LAUNCH_ENV_KEYS } from './electronLaunchProfile'

const EXACT_DENIED_KEYS = new Set([
  'ELECTRON_RUN_AS_NODE',
  'NODE_OPTIONS',
  'OPENAI_API_KEY',
  'ANTHROPIC_API_KEY',
  'SERPER_API_KEY',
  'SERPAPI_API_KEY',
  'AUTOBYTEUS_MCP_GATEWAY_TOKEN',
  'GOOGLE_APPLICATION_CREDENTIALS',
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY',
  'AWS_PROFILE',
  'GITHUB_TOKEN',
])

const SENSITIVE_KEY_PATTERN = /(API_KEY|TOKEN|PASSWORD|SECRET|PRIVATE_KEY|CREDENTIAL)/i

export function isDeniedE2EEnvironmentKey(key: string, platform: NodeJS.Platform): boolean {
  const normalizedKey = key.toUpperCase()
  if (EXACT_DENIED_KEYS.has(normalizedKey) || SENSITIVE_KEY_PATTERN.test(normalizedKey)) {
    return true
  }
  if (platform === 'darwin' && normalizedKey.startsWith('DYLD_')) {
    return true
  }
  if (platform === 'linux' && normalizedKey.startsWith('LD_')) {
    return true
  }
  return false
}

export function scrubE2ELaunchEnvironment(
  env: NodeJS.ProcessEnv,
  platform: NodeJS.Platform = process.platform,
): NodeJS.ProcessEnv {
  const launchKeys = new Set<string>(ELECTRON_LAUNCH_ENV_KEYS.map((key) => (
    platform === 'win32' ? key.toUpperCase() : key
  )))
  for (const key of Object.keys(env)) {
    const comparableKey = platform === 'win32' ? key.toUpperCase() : key
    if (launchKeys.has(comparableKey) || isDeniedE2EEnvironmentKey(key, platform)) {
      delete env[key]
    }
  }
  return Object.freeze({ ...env })
}
