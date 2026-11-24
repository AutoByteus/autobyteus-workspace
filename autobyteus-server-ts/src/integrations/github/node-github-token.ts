import type { SecretValue } from "autobyteus-ts/secrets/secret-value.js";
import { SecretVaultError } from "autobyteus-ts/secrets/vault/secret-vault-types.js";
import { getSecretVaultRuntime } from "../../secret-management/secret-vault-runtime.js";

/** A question the GitHub client asks when GitHub answers "not visible": this node's GitHub token, or `null`. */
export type GitHubTokenReader = () => Promise<SecretValue | null>;

/**
 * This node's GitHub token (its GitHub connection, the vault entry `integration.github.token`), read from the vault
 * at the moment of use; `null` when GitHub is not connected. Any other vault failure (for example
 * `VAULT_UNAVAILABLE`) is thrown. The vault runtime is looked up per call, like `getIntegrationConnectionService`:
 * startup initializes it before any import, update check or scheduled check runs.
 */
export const readNodeGitHubToken: GitHubTokenReader = async () => {
  try {
    return await getSecretVaultRuntime().requireService().resolveForUse({ kind: "integration", integrationId: "github" });
  } catch (error) {
    if (error instanceof SecretVaultError && error.code === "NOT_FOUND") return null;
    throw error;
  }
};
