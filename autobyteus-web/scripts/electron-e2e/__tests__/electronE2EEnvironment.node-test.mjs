import assert from 'node:assert/strict'
import test from 'node:test'
import { buildCredentialSafeElectronEnv } from '../electronE2EEnvironment.mjs'

const denied = (key, platform) => (
  /(API_KEY|TOKEN|PASSWORD|SECRET|PRIVATE_KEY|CREDENTIAL)/i.test(key)
  || ['NODE_OPTIONS', 'ELECTRON_RUN_AS_NODE', 'AWS_PROFILE'].includes(key.toUpperCase())
  || (platform === 'linux' && key.toUpperCase().startsWith('LD_'))
)

test('credential-safe environment starts from the allowlist and forces launch values', () => {
  const env = buildCredentialSafeElectronEnv({
    platform: 'linux',
    sourceEnv: {
      PATH: '/bin',
      HOME: '/home/tester',
      DISPLAY: ':1',
      LC_ALL: 'C',
      OPENAI_API_KEY: 'secret',
      AWS_PROFILE: 'production',
      UNRELATED_CALLER_VALUE: 'not-copied',
      LD_PRELOAD: '/unsafe.so',
    },
    launch: { port: 31001, dataRoot: '/tmp/autobyteus-e2e-test' },
    extraEnv: { AUTOBYTEUS_E2E_FIXTURE_ID: 'fixture-1' },
    isDeniedKey: denied,
  })

  assert.equal(env.PATH, '/bin')
  assert.equal(env.HOME, '/home/tester')
  assert.equal(env.DISPLAY, ':1')
  assert.equal(env.LC_ALL, 'C')
  assert.equal(env.AUTOBYTEUS_E2E_FIXTURE_ID, 'fixture-1')
  assert.equal(env.OPENAI_API_KEY, undefined)
  assert.equal(env.AWS_PROFILE, undefined)
  assert.equal(env.UNRELATED_CALLER_VALUE, undefined)
  assert.equal(env.LD_PRELOAD, undefined)
  assert.equal(env.AUTOBYTEUS_ELECTRON_LAUNCH_PROFILE, 'e2e')
  assert.equal(env.AUTOBYTEUS_ELECTRON_SERVER_PORT, '31001')
  assert.equal(env.AUTOBYTEUS_ELECTRON_DATA_ROOT, '/tmp/autobyteus-e2e-test')
})

test('explicit extras cannot override core values or carry secrets', () => {
  const input = {
    platform: 'linux',
    sourceEnv: { PATH: '/bin' },
    launch: { port: 31001, dataRoot: '/tmp/autobyteus-e2e-test' },
    isDeniedKey: denied,
  }
  assert.throws(
    () => buildCredentialSafeElectronEnv({ ...input, extraEnv: { PATH: '/other' } }),
    /cannot override reserved/,
  )
  assert.throws(
    () => buildCredentialSafeElectronEnv({ ...input, extraEnv: { TEST_TOKEN: 'secret' } }),
    /secret-bearing or unsafe/,
  )
})
