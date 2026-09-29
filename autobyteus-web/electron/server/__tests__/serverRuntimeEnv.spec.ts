import { describe, expect, it } from 'vitest'
import {
  buildServerProcessEnv,
  ISOLATED_SERVER_BASELINE_ENV_NAMES,
  type BuildServerProcessEnvInput,
} from '../serverRuntimeEnv'

const productionLikeCallerEnv: NodeJS.ProcessEnv = {
  HOME: '/Users/tester',
  USER: 'tester',
  PATH: '/caller/bin',
  LANG: 'en_US.UTF-8',
  LC_ALL: 'en_US.UTF-8',
  LC_CTYPE: 'UTF-8',
  TMPDIR: '/tmp/tester',
  HTTPS_PROXY: 'http://proxy.local:3128',
  CODEX_HOME: '/Users/tester/.codex',
  ELECTRON_RUN_AS_NODE: '1',
  DB_TYPE: 'sqlite',
  DB_NAME: '/Users/tester/.autobyteus/server-data/db/production.db',
  DATABASE_URL: 'file:/Users/tester/.autobyteus/server-data/db/production.db',
  AUTOBYTEUS_MEMORY_DIR: '/Users/tester/.autobyteus/server-data/memory',
  AUTOBYTEUS_AGENT_PACKAGE_ROOTS: '/Users/tester/agent-packages',
  AUTOBYTEUS_SKILLS_PATHS: '/Users/tester/skills',
  AUTOBYTEUS_DATA_DIR: '/Users/tester/.autobyteus/server-data',
  AUTOBYTEUS_SERVER_HOST: 'http://localhost:29695',
  AUTOBYTEUS_LLM_SERVER_HOSTS: 'http://llm.local',
  OPENAI_API_KEY: 'non-secret-openai-sentinel',
  CODEX_APP_SERVER_COMMAND: '/Users/tester/bin/codex',
  APP_ENV: 'production',
  LOG_LEVEL: 'debug',
}

function input(overrides: Partial<BuildServerProcessEnvInput> = {}): BuildServerProcessEnvInput {
  return {
    policy: 'inherit-caller',
    callerEnv: productionLikeCallerEnv,
    loginShellPath: '/login-shell/bin',
    port: 31041,
    appDataDir: '/tmp/isolated-root/server-data',
    publicServerUrl: 'http://127.0.0.1:31041',
    runtimeOverrides: {
      AUTOBYTEUS_BROWSER_BRIDGE_BASE_URL: 'http://127.0.0.1:41234',
      AUTOBYTEUS_BROWSER_BRIDGE_TOKEN: 'browser-token',
    },
    ...overrides,
  }
}

describe('buildServerProcessEnv — inherit-caller (production)', () => {
  it('matches the established production composition exactly', () => {
    const callerEnv = productionLikeCallerEnv
    const runtimeOverrides = input().runtimeOverrides
    // The pre-policy production composition from the platform managers, spelled out literally.
    const established = {
      ...callerEnv,
      PATH: '/login-shell/bin',
      ELECTRON_RUN_AS_NODE: '1',
      PORT: '31041',
      SERVER_PORT: '31041',
      DATABASE_URL: 'file:/tmp/isolated-root/server-data/db/production.db',
      DB_TYPE: callerEnv.DB_TYPE ?? 'sqlite',
      AUTOBYTEUS_DATA_DIR: '/tmp/isolated-root/server-data',
      AUTOBYTEUS_SERVER_HOST: 'http://127.0.0.1:31041',
      ...runtimeOverrides,
    }

    const env = buildServerProcessEnv(input())

    expect(env).toEqual(established)
    expect(Object.keys(env)).toEqual(Object.keys(established))
  })

  it('keeps the caller PATH when no login-shell PATH is available', () => {
    const env = buildServerProcessEnv(input({ loginShellPath: null }))
    expect(env.PATH).toBe('/caller/bin')
  })

  it('defaults DB_TYPE to sqlite when the caller does not provide it', () => {
    const env = buildServerProcessEnv(input({ callerEnv: { HOME: '/h' } }))
    expect(env.DB_TYPE).toBe('sqlite')
  })

  it('normalizes windows-style db paths for prisma file URLs', () => {
    const env = buildServerProcessEnv(input({
      appDataDir: 'C:\\Users\\tester\\.autobyteus\\server-data',
      loginShellPath: null,
    }))
    expect(env.DATABASE_URL).toBe('file:C:/Users/tester/.autobyteus/server-data/db/production.db')
  })

  it('merges runtime override values last', () => {
    const env = buildServerProcessEnv(input({ runtimeOverrides: { AUTOBYTEUS_SERVER_HOST: 'http://override' } }))
    expect(env.AUTOBYTEUS_SERVER_HOST).toBe('http://override')
  })
})

describe('buildServerProcessEnv — isolated-baseline (e2e)', () => {
  it('inherits only baseline caller variables plus Electron-owned values', () => {
    const env = buildServerProcessEnv(input({ policy: 'isolated-baseline' }))

    expect(env).toEqual({
      HOME: '/Users/tester',
      USER: 'tester',
      PATH: '/login-shell/bin',
      LANG: 'en_US.UTF-8',
      LC_ALL: 'en_US.UTF-8',
      LC_CTYPE: 'UTF-8',
      TMPDIR: '/tmp/tester',
      HTTPS_PROXY: 'http://proxy.local:3128',
      CODEX_HOME: '/Users/tester/.codex',
      ELECTRON_RUN_AS_NODE: '1',
      PORT: '31041',
      SERVER_PORT: '31041',
      DATABASE_URL: 'file:/tmp/isolated-root/server-data/db/production.db',
      DB_TYPE: 'sqlite',
      AUTOBYTEUS_DATA_DIR: '/tmp/isolated-root/server-data',
      AUTOBYTEUS_SERVER_HOST: 'http://127.0.0.1:31041',
      AUTOBYTEUS_BROWSER_BRIDGE_BASE_URL: 'http://127.0.0.1:41234',
      AUTOBYTEUS_BROWSER_BRIDGE_TOKEN: 'browser-token',
    })
  })

  it('never passes production AutoByteus, database, provider or runtime settings', () => {
    const env = buildServerProcessEnv(input({ policy: 'isolated-baseline' }))

    for (const name of [
      'DB_NAME',
      'AUTOBYTEUS_MEMORY_DIR',
      'AUTOBYTEUS_AGENT_PACKAGE_ROOTS',
      'AUTOBYTEUS_SKILLS_PATHS',
      'AUTOBYTEUS_LLM_SERVER_HOSTS',
      'OPENAI_API_KEY',
      'CODEX_APP_SERVER_COMMAND',
      'APP_ENV',
      'LOG_LEVEL',
    ]) {
      expect(env, name).not.toHaveProperty(name)
    }
    expect(env.DATABASE_URL).not.toContain('.autobyteus')
    expect(env.AUTOBYTEUS_DATA_DIR).toBe('/tmp/isolated-root/server-data')
  })

  it('forces sqlite even when the caller sets another DB_TYPE', () => {
    const env = buildServerProcessEnv(input({
      policy: 'isolated-baseline',
      callerEnv: { ...productionLikeCallerEnv, DB_TYPE: 'postgresql' },
    }))
    expect(env.DB_TYPE).toBe('sqlite')
  })

  it('falls back to the caller PATH when no login-shell PATH is available', () => {
    const env = buildServerProcessEnv(input({ policy: 'isolated-baseline', loginShellPath: null }))
    expect(env.PATH).toBe('/caller/bin')
  })

  it('matches baseline names case-insensitively for Windows environments', () => {
    expect(ISOLATED_SERVER_BASELINE_ENV_NAMES).toEqual(expect.arrayContaining([
      'SystemRoot', 'ComSpec', 'PATHEXT', 'USERPROFILE', 'APPDATA', 'LOCALAPPDATA',
    ]))
    const env = buildServerProcessEnv(input({
      policy: 'isolated-baseline',
      loginShellPath: null,
      callerEnv: { SystemRoot: 'C:\\Windows', PATHEXT: '.EXE', Path: 'C:\\bin', AutoByteus_Memory_Dir: 'x' },
    }))
    expect(env.SystemRoot).toBe('C:\\Windows')
    expect(env.PATHEXT).toBe('.EXE')
    expect(env.Path).toBe('C:\\bin')
    expect(env).not.toHaveProperty('AutoByteus_Memory_Dir')
  })
})
