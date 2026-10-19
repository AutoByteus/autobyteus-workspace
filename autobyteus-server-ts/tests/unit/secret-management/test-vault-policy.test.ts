import { describe, expect, it } from 'vitest';
import { MissingApiKeyError } from 'autobyteus-ts';
import { LOCAL_IMPORT_CREDENTIAL_ALIAS_NAMES } from '../../../src/secret-management/provisioning/local-import-credential-alias-registry.js';
import { TEST_VAULT_SETTING_NAME as SERVER_SETTING_NAME } from '../../../src/secret-management/test-vault/test-vault-location.js';
import {
  captureTestVaultSelection,
  capturedTestVaultSetting,
  isCredentialEnvironmentName,
  liveUnavailableReason,
  stripCredentialEnvironment,
  TEST_VAULT_SETTING_NAME,
} from '../../../../test-support/test-vault/test-vault.js';

describe('test-vault test policy', () => {
  it('names the same selector as the server', () => {
    expect(TEST_VAULT_SETTING_NAME).toBe(SERVER_SETTING_NAME);
  });

  it('treats every importer credential alias as a credential variable', () => {
    for (const alias of LOCAL_IMPORT_CREDENTIAL_ALIAS_NAMES) expect(isCredentialEnvironmentName(alias)).toBe(true);
    expect(isCredentialEnvironmentName('RUN_DEEPSEEK_E2E')).toBe(false);
    expect(isCredentialEnvironmentName(TEST_VAULT_SETTING_NAME)).toBe(false);
  });

  it('deletes inherited credential variables and reports only their names', () => {
    const env: NodeJS.ProcessEnv = {
      PATH: '/bin',
      OPENAI_API_KEY: 'synthetic-openai',
      DEEPSEEK_API_KEY: 'synthetic-deepseek',
      ZHIPU_API_KEY: 'synthetic-unrecognized-alias',
      RUN_LIVE_PROVIDER_TESTS: '1',
    };
    expect(stripCredentialEnvironment(env)).toEqual(['DEEPSEEK_API_KEY', 'OPENAI_API_KEY', 'ZHIPU_API_KEY']);
    expect(env).toEqual({ PATH: '/bin', RUN_LIVE_PROVIDER_TESTS: '1' });
  });

  it('moves the selector out of the environment and keeps it for live opt-ins only', () => {
    const env: NodeJS.ProcessEnv = { [TEST_VAULT_SETTING_NAME]: ' /srv/vault ' };
    captureTestVaultSelection(env);
    expect(env).toEqual({});
    expect(capturedTestVaultSetting()).toBe('/srv/vault');
    // A later file in the same worker process no longer sees the variable; the capture stays.
    captureTestVaultSelection({});
    expect(capturedTestVaultSetting()).toBe('/srv/vault');
    captureTestVaultSelection({ [TEST_VAULT_SETTING_NAME]: '' });
    expect(capturedTestVaultSetting()).toBeUndefined();
  });

  it('reports a missing key or a classified refusal as a reason, and nothing else', () => {
    expect(liveUnavailableReason('DeepSeek', new MissingApiKeyError('DEEPSEEK')))
      .toContain('API key not provided for DEEPSEEK');
    expect(liveUnavailableReason('DeepSeek', new Error('429 Too Many Requests')))
      .toBe('provider refused DeepSeek: rate_limited');
    expect(liveUnavailableReason('GLM', new Error('身份验证失败')))
      .toBe('provider refused GLM: invalid_or_missing_credentials');
    expect(liveUnavailableReason('DeepSeek', new Error('expected 2 to be 3'))).toBeNull();
  });
});
