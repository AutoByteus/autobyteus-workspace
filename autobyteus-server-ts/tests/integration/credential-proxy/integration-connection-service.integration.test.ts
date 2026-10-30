/**
 * GitHub connect, test, disconnect and agent access (DS-001) over a real one-database secret vault in a temp dir and
 * a fake GitHub `/user` check: a token is stored only after GitHub accepts it, under the integration's own vault id;
 * the connections file never holds it; disconnect keeps the agent ticks. Dummy values only.
 */
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { initializePrisma, shutdownPrisma } from "repository_prisma";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SecretValue } from "autobyteus-ts/secrets/secret-value.js";
import { ApplicationDatabaseLocation } from "../../../src/config/application-database-location.js";
import { SecretVaultBootstrap } from "../../../src/secret-management/bootstrap/secret-vault-bootstrap.js";
import { SecretVaultRepository } from "../../../src/secret-management/persistence/secret-vault-repository.js";
import { SecretManagementService } from "../../../src/secret-management/services/secret-management-service.js";
import { IntegrationConnectionService } from "../../../src/credential-proxy/integration-connection-service.js";
import { IntegrationConnectionStore } from "../../../src/credential-proxy/integration-connection-store.js";
import { IntegrationDefinitions } from "../../../src/credential-proxy/integration-definitions.js";

const TABLES = `
  CREATE TABLE secret_entries (
    secret_id TEXT NOT NULL PRIMARY KEY,
    nonce BLOB NOT NULL CHECK (length(nonce) = 12),
    ciphertext BLOB NOT NULL,
    authentication_tag BLOB NOT NULL CHECK (length(authentication_tag) = 16)
  );
  CREATE TABLE secret_encryption_metadata (
    singleton_id INTEGER NOT NULL PRIMARY KEY CHECK (singleton_id = 1),
    encryption_domain_id BLOB NOT NULL UNIQUE CHECK (length(encryption_domain_id) = 16),
    encryption_format_version INTEGER NOT NULL,
    verifier_nonce BLOB NOT NULL CHECK (length(verifier_nonce) = 12),
    verifier_ciphertext BLOB NOT NULL,
    verifier_authentication_tag BLOB NOT NULL CHECK (length(verifier_authentication_tag) = 16)
  );
`;

const GOOD = "test-dummy-github-token-good";
const BAD = "test-dummy-github-token-bad";
const CONSUMER = { kind: "integration", integrationId: "github" } as const;

describe("IntegrationConnectionService over a real vault", () => {
  let directory: string;
  let databasePath: string;
  let management: SecretManagementService;
  let integrationsDir: string;
  let githubLogin = "octo";
  let githubDown = false;
  const fetchImpl = vi.fn(async (url: URL | RequestInfo, init?: RequestInit) => {
    if (githubDown) throw new TypeError("fetch failed");
    const authorization = new Headers(init?.headers).get("authorization");
    if (String(url) !== "https://api.github.com/user") return new Response("{}", { status: 404 });
    if (authorization !== `Bearer ${GOOD}`) return Response.json({ message: "Bad credentials" }, { status: 401 });
    return Response.json({ login: githubLogin });
  });

  const service = () => new IntegrationConnectionService({
    store: new IntegrationConnectionStore(integrationsDir),
    definitions: new IntegrationDefinitions(),
    management: () => management,
    fetchImpl: fetchImpl as typeof fetch,
  });
  const connectionsFile = () => fs.readFile(path.join(integrationsDir, "connections.json"), "utf8").catch(() => "");
  const storedToken = async () => management.getStatusForConsumer(CONSUMER);

  beforeEach(async () => {
    await shutdownPrisma();
    fetchImpl.mockClear();
    githubLogin = "octo";
    githubDown = false;
    directory = await fs.mkdtemp(path.join(os.tmpdir(), "integration-connection-"));
    await fs.chmod(directory, 0o700);
    integrationsDir = path.join(directory, "integrations");
    const location = ApplicationDatabaseLocation.fromConfiguredFileUrl("file:application.db", directory);
    databasePath = location.databasePath;
    const database = new DatabaseSync(databasePath);
    database.exec(TABLES);
    database.close();
    await initializePrisma({ datasourceUrl: location.databaseUrl });
    const repository = new SecretVaultRepository();
    const bootstrap = await new SecretVaultBootstrap(location, repository).initializeOrVerify();
    management = new SecretManagementService(repository, bootstrap.rootKey, bootstrap.metadata, bootstrap.health);
  });

  afterEach(async () => {
    management?.close();
    await shutdownPrisma();
    await fs.rm(directory, { recursive: true, force: true });
  });

  it("checks the token with GitHub, then stores it under the integration's vault id and the login in the file", async () => {
    expect(await service().status()).toEqual({ connected: false, login: null, connectedAt: null, agentDefinitionIds: [] });

    const status = await service().connect(SecretValue.fromString(GOOD));

    expect(status).toMatchObject({ connected: true, login: "octo", connectedAt: expect.any(String) });
    expect(fetchImpl).toHaveBeenCalledOnce();
    expect(fetchImpl.mock.calls[0]![1]).toMatchObject({ redirect: "manual" });
    expect(await storedToken()).toBe("CONFIGURED");
    expect((await management.resolveForUse(CONSUMER)).revealToTrustedConsumer()).toBe(GOOD);
    const rows = new DatabaseSync(databasePath).prepare("SELECT secret_id FROM secret_entries").all();
    expect(rows.map((row) => row["secret_id"])).toContain("integration.github.token");
    expect(await connectionsFile()).not.toContain(GOOD);
    expect(await service().status()).toEqual(status);
  });

  it("stores nothing for a token GitHub rejects, or when GitHub can't be reached", async () => {
    await expect(service().connect(SecretValue.fromString(BAD))).rejects.toMatchObject({ code: "TOKEN_REJECTED" });
    githubDown = true;
    await expect(service().connect(SecretValue.fromString(GOOD))).rejects.toMatchObject({ code: "TOKEN_CHECK_FAILED" });
    expect(await storedToken()).toBe("MISSING");
    expect(await connectionsFile()).toBe("");
  });

  it("tests the stored token again and refreshes the login", async () => {
    await expect(service().test()).rejects.toMatchObject({ code: "INTEGRATION_NOT_CONNECTED" });
    await service().connect(SecretValue.fromString(GOOD));
    githubLogin = "octo-renamed";
    expect(await service().test()).toMatchObject({ connected: true, login: "octo-renamed" });
    githubDown = true;
    await expect(service().test()).rejects.toMatchObject({ code: "TOKEN_CHECK_FAILED" });
  });

  it("keeps the agent ticks across disconnect and reconnect, trimmed and without duplicates", async () => {
    expect(await service().setAgentAccess([" agent-a ", "agent-b", "agent-a", ""])).toEqual({
      connected: false, login: null, connectedAt: null, agentDefinitionIds: ["agent-a", "agent-b"],
    });
    await service().connect(SecretValue.fromString(GOOD));

    const disconnected = await service().disconnect();

    expect(disconnected).toEqual({ connected: false, login: null, connectedAt: null, agentDefinitionIds: ["agent-a", "agent-b"] });
    expect(await storedToken()).toBe("MISSING");
    expect(await service().disconnect()).toEqual(disconnected);
    expect((await service().connect(SecretValue.fromString(GOOD))).agentDefinitionIds).toEqual(["agent-a", "agent-b"]);
  });

  it("reports not connected when the file has a login but the vault entry is gone", async () => {
    await service().connect(SecretValue.fromString(GOOD));
    await management.removeForConsumer(CONSUMER);
    expect(await service().status()).toMatchObject({ connected: false, login: null });
  });
});
