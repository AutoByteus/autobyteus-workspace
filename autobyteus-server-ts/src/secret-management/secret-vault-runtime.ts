import type { PrismaClient } from "@prisma/client";
import type { ApplicationDatabaseLocation } from "../config/application-database-location.js";
import { createConfiguredPrismaClient } from "../config/prisma-client-factory.js";
import { SecretVaultBootstrap } from "./bootstrap/secret-vault-bootstrap.js";
import { SecretVaultError, type SecretVaultHealth } from "./domain/secret-vault-types.js";
import { SecretVaultPrismaRepository } from "./persistence/secret-vault-prisma-repository.js";
import { SecretManagementService } from "./services/secret-management-service.js";

export class SecretVaultRuntime {
  private prisma: PrismaClient | null = null;
  private service: SecretManagementService | null = null;

  async initialize(location: ApplicationDatabaseLocation): Promise<void> {
    if (this.service) return;
    const prisma = createConfiguredPrismaClient(location.databaseUrl);
    const repository = new SecretVaultPrismaRepository(prisma);
    const bootstrap = await new SecretVaultBootstrap(location, repository).initializeOrVerify();
    this.prisma = prisma;
    this.service = new SecretManagementService(
      repository,
      bootstrap.rootKey,
      bootstrap.metadata,
      bootstrap.health,
    );
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
    this.service?.close();
    this.service = null;
    await this.prisma?.$disconnect();
    this.prisma = null;
  }
}

let runtime = new SecretVaultRuntime();

export const getSecretVaultRuntime = (): SecretVaultRuntime => runtime;

export const resetSecretVaultRuntimeForTests = async (): Promise<void> => {
  await runtime.close();
  runtime = new SecretVaultRuntime();
};
