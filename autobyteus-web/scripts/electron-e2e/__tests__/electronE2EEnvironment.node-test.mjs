import assert from 'node:assert/strict'
import test from 'node:test'
import { buildElectronE2ELaunchEnvironment } from '../electronE2EEnvironment.mjs'

test('E2E environment preserves caller provisioning values and forces only isolation values', () => {
  const sourceEnv = {
    PATH: '/bin',
    HOME: '/home/tester',
    NODE_OPTIONS: '--require caller-hook',
    ELECTRON_RUN_AS_NODE: 'caller-value',
    OPENAI_API_KEY: 'non-secret-openai-sentinel',
    GOOGLE_API_KEY: 'non-secret-provider-sentinel',
    SERPER_API_KEY: 'non-secret-search-sentinel',
    CODEX_HOME: '/caller/codex-home',
    NPM_CONFIG_USERCONFIG: '/caller/npmrc',
    AUTOBYTEUS_ELECTRON_LAUNCH_PROFILE: 'production',
    AUTOBYTEUS_ELECTRON_SERVER_PORT: '32000',
    AUTOBYTEUS_ELECTRON_DATA_ROOT: '/caller/root',
  }
  const extraEnv = {
    PATH: '/fixture/bin',
    AUTOBYTEUS_E2E_FIXTURE_ID: 'fixture-1',
    AUTOBYTEUS_ELECTRON_SERVER_PORT: '32001',
  }

  const env = buildElectronE2ELaunchEnvironment({
    sourceEnv,
    launch: { port: 31001, dataRoot: '/tmp/autobyteus-e2e-test' },
    extraEnv,
  })

  assert.equal(env.PATH, '/fixture/bin')
  assert.equal(env.HOME, '/home/tester')
  assert.equal(env.NODE_OPTIONS, '--require caller-hook')
  assert.equal(env.ELECTRON_RUN_AS_NODE, 'caller-value')
  assert.equal(env.OPENAI_API_KEY, 'non-secret-openai-sentinel')
  assert.equal(env.GOOGLE_API_KEY, 'non-secret-provider-sentinel')
  assert.equal(env.SERPER_API_KEY, 'non-secret-search-sentinel')
  assert.equal(env.CODEX_HOME, '/caller/codex-home')
  assert.equal(env.NPM_CONFIG_USERCONFIG, '/caller/npmrc')
  assert.equal(env.AUTOBYTEUS_E2E_FIXTURE_ID, 'fixture-1')
  assert.equal(env.AUTOBYTEUS_ELECTRON_LAUNCH_PROFILE, 'e2e')
  assert.equal(env.AUTOBYTEUS_ELECTRON_SERVER_PORT, '31001')
  assert.equal(env.AUTOBYTEUS_ELECTRON_DATA_ROOT, '/tmp/autobyteus-e2e-test')
  assert.deepEqual(sourceEnv, {
    PATH: '/bin',
    HOME: '/home/tester',
    NODE_OPTIONS: '--require caller-hook',
    ELECTRON_RUN_AS_NODE: 'caller-value',
    OPENAI_API_KEY: 'non-secret-openai-sentinel',
    GOOGLE_API_KEY: 'non-secret-provider-sentinel',
    SERPER_API_KEY: 'non-secret-search-sentinel',
    CODEX_HOME: '/caller/codex-home',
    NPM_CONFIG_USERCONFIG: '/caller/npmrc',
    AUTOBYTEUS_ELECTRON_LAUNCH_PROFILE: 'production',
    AUTOBYTEUS_ELECTRON_SERVER_PORT: '32000',
    AUTOBYTEUS_ELECTRON_DATA_ROOT: '/caller/root',
  })
  assert.equal(Object.isFrozen(env), true)
})
