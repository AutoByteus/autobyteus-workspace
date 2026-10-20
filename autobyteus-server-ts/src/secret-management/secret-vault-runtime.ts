import { createServerLogger } from "../logging/server-app-logger.js";
import { SecretVaultBootstrap } from "./bootstrap/secret-vault-bootstrap.js";
import { SecretVaultError, type SecretVaultHealth } from "autobyteus-ts/secrets/vault/secret-vault-types.js";
import { SecretVaultRepository } from "./persistence/secret-vault-repository.js";
import type { SecretVaultSource } from "./secret-vault-source.js";
import { SecretManagementService } from "./services/secret-management-service.js";
import { openReadOnlyTestVault } from "./test-vault/read-only-test-vault.js";
import { TEST_VAULT_SETTING_NAME } from "autobyteus-ts/secrets/test-vault-setting.js";

/** Where the runtime announces which vault it opened (location only). */
export type SecretVaultAnnouncer = Readonly<{
  info(line: string): void;
  warn(line: string): void;
}>;

const silent: SecretVaultAnnouncer = { info: () => undefined, warn: () => undefined };

export class SecretVaultRuntime {
  private service: SecretManagementService | null = null;
  private closeSource: () => void = () => undefined;

  constructor(private readonly announcer: SecretVaultAnnouncer = silent) {}

  /**
   * Opens the selected vault source.
   *
   * - `test`: opens the test vault read-only. If it is invalid, forbidden,
   *   missing or not READY, this throws `SecretVaultError` and opens nothing;
   *   there is no fallback to the application vault.
   * - `application`: initializes or verifies the vault in the server's own
   *   database; vault problems become the health value, as before.
   */
  async initialize(source: SecretVaultSource): Promise<void> {
    if (this.service) return;
    if (source.kind === "test") {
      const vault = await openReadOnlyTestVault(source.directory);
      this.service = vault.service;
      this.closeSource = vault.close;
      this.announcer.info(`Secret vault: test vault ${vault.location.directory} (read-only)`);
      return;
    }
    if (source.notice) {
      this.announcer.warn(
        `Secret vault: ${TEST_VAULT_SETTING_NAME} ignored on the real app data dir (${source.notice})`,
      );
    }
    const repository = new SecretVaultRepository();
    const bootstrap = await new SecretVaultBootstrap(source.location, repository).initializeOrVerify();
    const service = new SecretManagementService(
      repository,
      bootstrap.rootKey,
      bootstrap.metadata,
      bootstrap.health,
    );
    this.service = service;
    this.closeSource = () => service.close();
    this.announcer.info("Secret vault: application database");
  }

  requireService(): SecretManagementService {
    if (!this.service) {
      throw new SecretVaultError(
        "VAULT_UNAVAILABLE",
        true,
        "SECRET_VAULT_UNAVAILABLE",
      );
    }
    return this.service;
  }

  async getHealth(): Promise<SecretVaultHealth> {
    return this.service?.getHealth()
      ?? { state: "UNAVAILABLE", instructionCode: "SECRET_VAULT_UNAVAILABLE" };
  }

  async close(): Promise<void> {
    if (this.service) this.closeSource();
    this.service = null;
    this.closeSource = () => undefined;
  }
}

const createServerVaultAnnouncer = (): SecretVaultAnnouncer => {
  const logger = createServerLogger("secret-management.vault");
  return { info: (line) => logger.info(line), warn: (line) => logger.warn(line) };
};

let runtime = new SecretVaultRuntime(createServerVaultAnnouncer());

export const getSecretVaultRuntime = (): SecretVaultRuntime => runtime;

export const resetSecretVaultRuntimeForTests = async (): Promise<void> => {
  await runtime.close();
  runtime = new SecretVaultRuntime(createServerVaultAnnouncer());
};
