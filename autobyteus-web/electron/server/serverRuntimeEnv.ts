import * as path from 'path'
import { toPrismaSqliteUrl } from './prismaSqliteUrl'

/**
 * How the embedded server child environment relates to the Electron caller environment.
 *
 * - `inherit-caller`: the server receives the complete caller environment (production launches).
 * - `isolated-baseline`: the server receives only system-baseline variables from the caller
 *   (isolated `e2e` launches). AutoByteus settings then come from the isolated data root's own
 *   `.env`, never from a production environment the caller happened to inherit.
 */
export type ServerEnvironmentPolicy = 'inherit-caller' | 'isolated-baseline'

/**
 * Caller variables an isolated server may inherit: OS/user identity, locale, terminal,
 * temporary directories, proxies/certificates, display/session buses and Windows system paths.
 * Every other caller variable (AutoByteus settings, database, provider/runtime configuration)
 * is intentionally dropped. `LC_*` variables are inherited as well.
 */
export const ISOLATED_SERVER_BASELINE_ENV_NAMES: readonly string[] = Object.freeze([
  'HOME',
  'USER',
  'LOGNAME',
  'SHELL',
  'PATH',
  'LANG',
  'LANGUAGE',
  'TZ',
  'TMPDIR',
  'TEMP',
  'TMP',
  'TERM',
  'COLORTERM',
  'SSH_AUTH_SOCK',
  'HTTP_PROXY',
  'HTTPS_PROXY',
  'NO_PROXY',
  'http_proxy',
  'https_proxy',
  'no_proxy',
  'ALL_PROXY',
  'all_proxy',
  'NODE_EXTRA_CA_CERTS',
  'SSL_CERT_FILE',
  'SSL_CERT_DIR',
  'XDG_RUNTIME_DIR',
  'XDG_CONFIG_HOME',
  'XDG_CACHE_HOME',
  'XDG_DATA_HOME',
  'DISPLAY',
  'WAYLAND_DISPLAY',
  'DBUS_SESSION_BUS_ADDRESS',
  'CODEX_HOME',
  'SystemRoot',
  'SYSTEMROOT',
  'windir',
  'ComSpec',
  'PATHEXT',
  'USERPROFILE',
  'APPDATA',
  'LOCALAPPDATA',
  'ProgramData',
  'ProgramFiles',
])

// Matched case-insensitively: Windows environment names are case-insensitive (`Path`, `SystemRoot`).
const BASELINE_ENV_NAME_SET = new Set(ISOLATED_SERVER_BASELINE_ENV_NAMES.map((name) => name.toUpperCase()))

function isBaselineEnvName(name: string): boolean {
  const upper = name.toUpperCase()
  return BASELINE_ENV_NAME_SET.has(upper) || upper.startsWith('LC_')
}

function pickBaselineEnv(callerEnv: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  const picked: NodeJS.ProcessEnv = {}
  for (const [name, value] of Object.entries(callerEnv)) {
    if (typeof value === 'string' && isBaselineEnvName(name)) {
      picked[name] = value
    }
  }
  return picked
}

export type BuildServerProcessEnvInput = Readonly<{
  policy: ServerEnvironmentPolicy
  callerEnv: NodeJS.ProcessEnv
  /** PATH resolved from the user's login shell; `null` when unavailable or not used (Windows). */
  loginShellPath: string | null
  port: number
  appDataDir: string
  publicServerUrl: string
  runtimeOverrides: Record<string, string>
}>

/**
 * Compose the complete environment of the embedded server child process.
 * This is the only place that decides which caller variables reach the server.
 */
export function buildServerProcessEnv({
  policy,
  callerEnv,
  loginShellPath,
  port,
  appDataDir,
  publicServerUrl,
  runtimeOverrides,
}: BuildServerProcessEnvInput): NodeJS.ProcessEnv {
  const inherited = policy === 'inherit-caller' ? { ...callerEnv } : pickBaselineEnv(callerEnv)
  const dbType = policy === 'inherit-caller' ? callerEnv.DB_TYPE ?? 'sqlite' : 'sqlite'

  return {
    ...inherited,
    ...(loginShellPath ? { PATH: loginShellPath } : {}),
    ELECTRON_RUN_AS_NODE: '1',
    PORT: port.toString(),
    SERVER_PORT: port.toString(),
    // Ensure Prisma uses runtime server-data DB path from process start.
    DATABASE_URL: toPrismaSqliteUrl(path.join(appDataDir, 'db', 'production.db')),
    DB_TYPE: dbType,
    AUTOBYTEUS_DATA_DIR: appDataDir,
    AUTOBYTEUS_SERVER_HOST: publicServerUrl,
    ...runtimeOverrides,
  }
}
