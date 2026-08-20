import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PRODUCTION_EMBEDDED_SERVER_PORT } from '../../../shared/embeddedServerClientEndpoint'
import { scrubE2ELaunchEnvironment } from '../e2eLaunchEnvironment'
import { resolveElectronLaunchProfile } from '../electronLaunchProfile'
import { applyElectronLaunchProfilePaths } from '../electronLaunchProfilePaths'

describe('Electron launch profile', () => {
  const cleanupRoots: string[] = []
  const fixture = () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'autobyteus-launch-profile-test-'))
    cleanupRoots.push(root)
    const production = path.join(root, 'production')
    const selected = path.join(root, 'selected')
    fs.mkdirSync(production)
    fs.mkdirSync(selected)
    return { production, selected }
  }

  afterEach(() => {
    for (const root of cleanupRoots.splice(0)) {
      fs.rmSync(root, { recursive: true, force: true })
    }
  })

  it('preserves production defaults only when no E2E-only values are present', () => {
    const { production } = fixture()
    const profile = resolveElectronLaunchProfile({
      env: {},
      protectedPaths: [production],
      productionBaseDataRoot: production,
    })
    expect(profile.name).toBe('production')
    expect(profile.clientEndpoint.port).toBe(PRODUCTION_EMBEDDED_SERVER_PORT)
    expect(() => resolveElectronLaunchProfile({
      env: { AUTOBYTEUS_ELECTRON_SERVER_PORT: '31001' },
      protectedPaths: [production],
      productionBaseDataRoot: production,
    })).toThrow('valid only')
  })

  it('requires a non-default port and existing safe root as one E2E contract', () => {
    const { production, selected } = fixture()
    const profile = resolveElectronLaunchProfile({
      env: {
        AUTOBYTEUS_ELECTRON_LAUNCH_PROFILE: 'e2e',
        AUTOBYTEUS_ELECTRON_SERVER_PORT: '31001',
        AUTOBYTEUS_ELECTRON_DATA_ROOT: selected,
      },
      protectedPaths: [production],
      productionBaseDataRoot: production,
    })
    expect(profile.name).toBe('e2e')
    expect(profile.clientEndpoint).toEqual({ host: '127.0.0.1', port: 31001 })
    expect(profile.baseDataRoot).toBe(fs.realpathSync(selected))

    expect(() => resolveElectronLaunchProfile({
      env: {
        AUTOBYTEUS_ELECTRON_LAUNCH_PROFILE: 'e2e',
        AUTOBYTEUS_ELECTRON_SERVER_PORT: String(PRODUCTION_EMBEDDED_SERVER_PORT),
        AUTOBYTEUS_ELECTRON_DATA_ROOT: selected,
      },
      protectedPaths: [production],
    })).toThrow('must differ from production port')
  })

  it('creates and applies only verified E2E descendants', () => {
    const { production, selected } = fixture()
    const profile = resolveElectronLaunchProfile({
      env: {
        AUTOBYTEUS_ELECTRON_LAUNCH_PROFILE: 'e2e',
        AUTOBYTEUS_ELECTRON_SERVER_PORT: '31002',
        AUTOBYTEUS_ELECTRON_DATA_ROOT: selected,
      },
      protectedPaths: [production],
    })
    const setPath = vi.fn()
    const setAppLogsPath = vi.fn()
    const plan = applyElectronLaunchProfilePaths({ setPath, setAppLogsPath }, profile)
    expect(plan?.serverData).toBe(path.join(fs.realpathSync(selected), 'server-data'))
    expect(setPath).toHaveBeenCalledWith('userData', plan?.userData)
    expect(setPath).toHaveBeenCalledWith('sessionData', plan?.sessionData)
    expect(setAppLogsPath).toHaveBeenCalledWith(plan?.logs)
    expect(fs.realpathSync(plan!.backendConfig).startsWith(fs.realpathSync(selected))).toBe(true)
  })

  it('scrubs credentials, unsafe switches, and resolved launch keys before imports', () => {
    const env: NodeJS.ProcessEnv = {
      PATH: '/bin',
      OPENAI_API_KEY: 'secret',
      custom_TOKEN: 'secret',
      NODE_OPTIONS: '--require unsafe',
      AUTOBYTEUS_ELECTRON_LAUNCH_PROFILE: 'e2e',
      AUTOBYTEUS_ELECTRON_SERVER_PORT: '31003',
      AUTOBYTEUS_ELECTRON_DATA_ROOT: '/tmp/example',
      AUTOBYTEUS_E2E_FIXTURE_ID: 'fixture-1',
    }
    const snapshot = scrubE2ELaunchEnvironment(env, 'linux')
    expect(snapshot.PATH).toBe('/bin')
    expect(snapshot.AUTOBYTEUS_E2E_FIXTURE_ID).toBe('fixture-1')
    expect(snapshot.OPENAI_API_KEY).toBeUndefined()
    expect(snapshot.custom_TOKEN).toBeUndefined()
    expect(snapshot.NODE_OPTIONS).toBeUndefined()
    expect(snapshot.AUTOBYTEUS_ELECTRON_LAUNCH_PROFILE).toBeUndefined()
    expect(env.OPENAI_API_KEY).toBeUndefined()
  })
})
