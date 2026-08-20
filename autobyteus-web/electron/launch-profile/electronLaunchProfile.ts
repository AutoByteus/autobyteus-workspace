import * as path from 'path'
import {
  createEmbeddedServerClientEndpoint,
  PRODUCTION_EMBEDDED_SERVER_CLIENT_ENDPOINT,
  PRODUCTION_EMBEDDED_SERVER_PORT,
  type EmbeddedServerClientEndpoint,
} from '../../shared/embeddedServerClientEndpoint'
import { getCanonicalBaseDataPath } from '../appDataPaths'
import {
  getResolvedSafeE2EDataRootPath,
  resolveExistingSafeE2EDataRoot,
  type ResolvedSafeE2EDataRoot,
} from './e2eDataRootSafety'

export const ELECTRON_LAUNCH_PROFILE_ENV = 'AUTOBYTEUS_ELECTRON_LAUNCH_PROFILE'
export const ELECTRON_SERVER_PORT_ENV = 'AUTOBYTEUS_ELECTRON_SERVER_PORT'
export const ELECTRON_DATA_ROOT_ENV = 'AUTOBYTEUS_ELECTRON_DATA_ROOT'

export const ELECTRON_LAUNCH_ENV_KEYS = Object.freeze([
  ELECTRON_LAUNCH_PROFILE_ENV,
  ELECTRON_SERVER_PORT_ENV,
  ELECTRON_DATA_ROOT_ENV,
] as const)

export type E2EElectronPathPlan = Readonly<{
  root: string
  baseDataRoot: string
  serverData: string
  logs: string
  extensions: string
  browserArtifacts: string
  userData: string
  sessionData: string
  crashDumps: string
  downloads: string
  backendHome: string
  backendConfig: string
  backendCache: string
  backendTemp: string
}>

type BaseElectronLaunchProfile = Readonly<{
  clientEndpoint: EmbeddedServerClientEndpoint
  baseDataRoot: string
}>

export type ProductionElectronLaunchProfile = BaseElectronLaunchProfile & Readonly<{
  name: 'production'
  updaterEnabled: true
}>

export type E2EElectronLaunchProfile = BaseElectronLaunchProfile & Readonly<{
  name: 'e2e'
  updaterEnabled: false
  safeDataRoot: ResolvedSafeE2EDataRoot
  paths: E2EElectronPathPlan
}>

export type ElectronLaunchProfile =
  | ProductionElectronLaunchProfile
  | E2EElectronLaunchProfile

type ResolveElectronLaunchProfileInput = {
  env: NodeJS.ProcessEnv
  protectedPaths: readonly string[]
  productionBaseDataRoot?: string
}

function parseE2EPort(rawPort: string | undefined): number {
  if (!rawPort || !/^\d+$/.test(rawPort)) {
    throw new Error(`${ELECTRON_SERVER_PORT_ENV} must be a base-10 TCP port`)
  }
  const port = Number(rawPort)
  if (!Number.isInteger(port) || port < 1024 || port > 65535) {
    throw new Error(`${ELECTRON_SERVER_PORT_ENV} must be between 1024 and 65535`)
  }
  if (port === PRODUCTION_EMBEDDED_SERVER_PORT) {
    throw new Error(
      `${ELECTRON_SERVER_PORT_ENV} must differ from production port ${PRODUCTION_EMBEDDED_SERVER_PORT}`,
    )
  }
  return port
}

export function buildE2EElectronPathPlan(
  safeDataRoot: ResolvedSafeE2EDataRoot,
): E2EElectronPathPlan {
  const root = getResolvedSafeE2EDataRootPath(safeDataRoot)
  return Object.freeze({
    root,
    baseDataRoot: root,
    serverData: path.join(root, 'server-data'),
    logs: path.join(root, 'logs'),
    extensions: path.join(root, 'extensions'),
    browserArtifacts: path.join(root, 'browser-artifacts'),
    userData: path.join(root, 'electron', 'user-data'),
    sessionData: path.join(root, 'electron', 'session-data'),
    crashDumps: path.join(root, 'electron', 'crash-dumps'),
    downloads: path.join(root, 'electron', 'downloads'),
    backendHome: path.join(root, 'backend-home'),
    backendConfig: path.join(root, 'backend-home', '.config'),
    backendCache: path.join(root, 'backend-home', '.cache'),
    backendTemp: path.join(root, 'backend-home', 'tmp'),
  })
}

export function resolveElectronLaunchProfile({
  env,
  protectedPaths,
  productionBaseDataRoot = getCanonicalBaseDataPath(),
}: ResolveElectronLaunchProfileInput): ElectronLaunchProfile {
  const selectorValue = env[ELECTRON_LAUNCH_PROFILE_ENV]
  const selector = selectorValue === undefined ? 'production' : selectorValue.trim()
  const rawPort = env[ELECTRON_SERVER_PORT_ENV]?.trim()
  const rawRoot = env[ELECTRON_DATA_ROOT_ENV]?.trim()

  if (selector === 'production') {
    if (
      Object.prototype.hasOwnProperty.call(env, ELECTRON_SERVER_PORT_ENV)
      || Object.prototype.hasOwnProperty.call(env, ELECTRON_DATA_ROOT_ENV)
    ) {
      throw new Error(
        `${ELECTRON_SERVER_PORT_ENV} and ${ELECTRON_DATA_ROOT_ENV} are valid only when ${ELECTRON_LAUNCH_PROFILE_ENV}=e2e`,
      )
    }
    return Object.freeze({
      name: 'production' as const,
      updaterEnabled: true as const,
      clientEndpoint: PRODUCTION_EMBEDDED_SERVER_CLIENT_ENDPOINT,
      baseDataRoot: productionBaseDataRoot,
    })
  }

  if (selector !== 'e2e') {
    throw new Error(
      `${ELECTRON_LAUNCH_PROFILE_ENV} must be either production or e2e`,
    )
  }
  if (!rawPort || !rawRoot) {
    throw new Error(
      `${ELECTRON_SERVER_PORT_ENV} and ${ELECTRON_DATA_ROOT_ENV} are both required for e2e`,
    )
  }

  const port = parseE2EPort(rawPort)
  const safeDataRoot = resolveExistingSafeE2EDataRoot({
    selectedPath: rawRoot,
    protectedPaths,
  })
  const paths = buildE2EElectronPathPlan(safeDataRoot)
  return Object.freeze({
    name: 'e2e' as const,
    updaterEnabled: false as const,
    clientEndpoint: createEmbeddedServerClientEndpoint(port),
    baseDataRoot: paths.baseDataRoot,
    safeDataRoot,
    paths,
  })
}
