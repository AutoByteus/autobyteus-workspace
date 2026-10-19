import { describe, expect, it } from 'vitest';
import { MissingApiKeyError as PackageMissingApiKeyError, SecretValue as PackageSecretValue } from 'autobyteus-ts';
import { SecretValue as SubpathSecretValue } from 'autobyteus-ts/secrets/secret-value.js';
import { MissingApiKeyError } from '../../../src/secrets/provider-api-key-error.js';
import { SecretValue } from '../../../src/secrets/secret-value.js';

// Server code that live test setup loads imports `autobyteus-ts` by package
// name. The Vitest alias must resolve it to these sources, so a missing key it
// reports is the same `MissingApiKeyError` class the agent loop checks.
describe('autobyteus-ts self alias in tests', () => {
  it('resolves the package root and subpaths to the same source modules', () => {
    expect(PackageMissingApiKeyError).toBe(MissingApiKeyError);
    expect(PackageSecretValue).toBe(SecretValue);
    expect(SubpathSecretValue).toBe(SecretValue);
  });
});
