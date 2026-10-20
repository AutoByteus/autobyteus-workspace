import { describe, expect, it } from 'vitest';
import { resolveProviderApiKeyResolver } from '../../src/secrets/provider-api-key-resolver.js';

// tests/setup.ts: default runs are credential-free (REQ-011, AC-009), whatever the shell exports.
describe('default test setup', () => {
  it('leaves no credential variable visible to tests', () => {
    expect(Object.keys(process.env).filter((name) => /_API_KEY$/i.test(name))).toEqual([]);
  });

  it.skipIf(process.env.RUN_LIVE_PROVIDER_TESTS === '1')('removes the test-vault selector without the live gate', async () => {
    expect(process.env.AUTOBYTEUS_TEST_VAULT).toBeUndefined();
    await expect(resolveProviderApiKeyResolver().resolve('DEEPSEEK'))
      .rejects.toMatchObject({ kind: 'missing_api_key', providerId: 'DEEPSEEK' });
  });
});
