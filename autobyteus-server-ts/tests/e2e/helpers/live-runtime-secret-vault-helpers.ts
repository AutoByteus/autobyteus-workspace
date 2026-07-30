import { SecretValue } from "autobyteus-ts/secrets/secret-value.js";
import { ApplicationDatabaseLocation } from "../../../src/config/application-database-location.js";
import { appConfigProvider } from "../../../src/config/app-config-provider.js";
import {
  LOCAL_IMPORT_CREDENTIAL_ALIAS_NAMES,
  localImportSecretIdForAlias,
} from "../../../src/secret-management/provisioning/local-import-credential-alias-registry.js";
import {
  getSecretVaultRuntime,
  resetSecretVaultRuntimeForTests,
} from "../../../src/secret-management/secret-vault-runtime.js";

export const initializeLiveRuntimeSecretVaultFromEnvironment = async (): Promise<void> => {
  const configuredDatabaseUrl = process.env.DATABASE_URL_TEST ?? process.env.DATABASE_URL;
  if (!configuredDatabaseUrl) {
    throw new Error("LIVE_RUNTIME_TEST_DATABASE_URL_REQUIRED");
  }
  await resetSecretVaultRuntimeForTests();
  const runtime = getSecretVaultRuntime();
  await runtime.initialize(ApplicationDatabaseLocation.fromConfiguredFileUrl(
    configuredDatabaseUrl,
    appConfigProvider.config.getAppRootDir(),
  ));

  const inputs = LOCAL_IMPORT_CREDENTIAL_ALIAS_NAMES.flatMap((alias) => {
    const value = process.env[alias]?.trim();
    const secretId = localImportSecretIdForAlias(alias);
    return value && secretId
      ? [{ secretId, input: SecretValue.fromString(value) }]
      : [];
  });

  if (inputs.length > 0) {
    await runtime.requireService().saveBatch(inputs, true);
  }
};

export const closeLiveRuntimeSecretVault = async (): Promise<void> => {
  await resetSecretVaultRuntimeForTests();
};
