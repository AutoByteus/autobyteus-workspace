import { createHash } from "node:crypto";
import { initializePrisma, shutdownPrisma } from "repository_prisma";
import { ApplicationDatabaseLocation } from "../../../../dist/config/application-database-location.js";
import { SecretVaultBootstrap } from "../../../../dist/secret-management/bootstrap/secret-vault-bootstrap.js";
import { SecretVaultRepository } from "../../../../dist/secret-management/persistence/secret-vault-repository.js";
import { SecretRootKeyFile } from "../../../../dist/secret-management/root-key/secret-root-key-file.js";

const EVENT_PREFIX = "SECRET_VAULT_WORKER_EVENT ";
const [mode, databaseUrl] = process.argv.slice(2);

const emit = (event) => {
  process.stdout.write(`${EVENT_PREFIX}${JSON.stringify(event)}\n`);
};

const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");

const waitForRelease = () => new Promise((resolve, reject) => {
  let buffered = "";
  const onData = (chunk) => {
    buffered += chunk;
    const newline = buffered.indexOf("\n");
    if (newline === -1) return;
    const command = buffered.slice(0, newline).trim();
    cleanup();
    if (command === "RELEASE") {
      resolve();
      return;
    }
    reject(new Error(`Unexpected worker command: ${command}`));
  };
  const onEnd = () => {
    cleanup();
    reject(new Error("Worker input ended before RELEASE."));
  };
  const cleanup = () => {
    process.stdin.off("data", onData);
    process.stdin.off("end", onEnd);
    process.stdin.pause();
    process.stdin.destroy();
  };
  process.stdin.setEncoding("utf8");
  process.stdin.on("data", onData);
  process.stdin.on("end", onEnd);
});

class ObservedSecretVaultRepository extends SecretVaultRepository {
  async withInitializationLock(operation) {
    emit({ type: "LOCK_REQUESTED" });
    return super.withInitializationLock(async (repository) => {
      emit({ type: "LOCK_CALLBACK_ENTERED" });
      return operation(repository);
    });
  }
}

class ControlledSecretRootKeyFile extends SecretRootKeyFile {
  async inspectExisting() {
    emit({ type: "ROOT_KEY_INSPECTION_ENTERED" });
    return super.inspectExisting();
  }

  async createExclusive() {
    const key = await super.createExclusive();
    if (mode === "holder") {
      emit({ type: "INITIALIZATION_HELD_AFTER_KEY_PUBLICATION" });
      await waitForRelease();
      emit({ type: "INITIALIZATION_RELEASED" });
    }
    return key;
  }
}

if (!["holder", "contender"].includes(mode) || !databaseUrl) {
  emit({ type: "FATAL", message: "Expected mode and absolute SQLite file URL." });
  process.exitCode = 2;
} else {
  let observationTimer;
  try {
    const location = ApplicationDatabaseLocation.fromAbsoluteFileUrl(databaseUrl);
    await initializePrisma({ datasourceUrl: location.databaseUrl });
    emit({ type: "PACKAGE_READY" });

    const repository = new ObservedSecretVaultRepository();
    const rootKeyFile = new ControlledSecretRootKeyFile(location);
    const initialization = new SecretVaultBootstrap(
      location,
      repository,
      rootKeyFile,
    ).initializeOrVerify();

    if (mode === "contender") {
      observationTimer = setTimeout(() => {
        emit({ type: "CONTENTION_OBSERVATION_WINDOW_ELAPSED" });
      }, 300);
    }

    const result = await initialization;
    if (result.health.state !== "READY" || !result.rootKey || !result.metadata) {
      throw new Error(`Initializer completed with health ${result.health.state}.`);
    }
    clearTimeout(observationTimer);
    emit({
      type: "READY",
      rootKeyDigest: digest(result.rootKey),
      encryptionDomainId: Buffer.from(result.metadata.encryptionDomainId).toString("hex"),
    });
    result.rootKey.fill(0);
  } catch (error) {
    clearTimeout(observationTimer);
    emit({
      type: "FATAL",
      name: error instanceof Error ? error.name : "UnknownError",
      message: error instanceof Error ? error.message : String(error),
    });
    process.exitCode = 1;
  } finally {
    await shutdownPrisma().catch((error) => {
      emit({
        type: "SHUTDOWN_FAILURE",
        message: error instanceof Error ? error.message : String(error),
      });
      process.exitCode = 1;
    });
  }
}
