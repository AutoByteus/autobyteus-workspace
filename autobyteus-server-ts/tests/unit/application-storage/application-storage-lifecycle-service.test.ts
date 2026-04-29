import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ApplicationStorageLifecycleService } from "../../../src/application-storage/services/application-storage-lifecycle-service.js";
import type { ApplicationBundle } from "../../../src/application-bundles/domain/models.js";

const createMockAppConfig = (rootDir: string) => ({
  getAppDataDir: () => rootDir,
});

const createBundle = (applicationRootPath: string, migrationsDirPath: string | null): ApplicationBundle => ({
  id: "built-in:applications__ticketing-app",
  localApplicationId: "ticketing-app",
  packageId: "built-in:applications",
  name: "Ticketing App",
  description: "Ticketing application",
  iconAssetPath: null,
  entryHtmlAssetPath: "/application-bundles/ticketing-app/assets/ui/index.html",
  runtimeTarget: {
    kind: "AGENT_TEAM",
    localId: "ticket-team",
    definitionId: "ticket-team-def",
  },
  writable: true,
  applicationRootPath,
  packageRootPath: path.dirname(path.dirname(applicationRootPath)),
  localAgentIds: [],
  localTeamIds: ["ticket-team"],
  entryHtmlRelativePath: "ui/index.html",
  iconRelativePath: null,
  backend: {
    manifestPath: path.join(applicationRootPath, "backend", "bundle.json"),
    manifestRelativePath: "backend/bundle.json",
    entryModulePath: path.join(applicationRootPath, "backend", "dist", "entry.mjs"),
    entryModuleRelativePath: "backend/dist/entry.mjs",
    moduleFormat: "esm",
    distribution: "self-contained",
    targetRuntime: { engine: "node", semver: ">=22 <23" },
    sdkCompatibility: {
      backendDefinitionContractVersion: "2",
      frontendSdkContractVersion: "3",
    },
    supportedExposures: {
      queries: true,
      commands: true,
      routes: true,
      graphql: true,
      notifications: true,
      eventHandlers: true,
    },
    migrationsDirPath,
    migrationsDirRelativePath: migrationsDirPath ? "backend/migrations" : null,
    assetsDirPath: null,
    assetsDirRelativePath: null,
  },
});

describe("ApplicationStorageLifecycleService", () => {
  let tempRoot: string;
  let applicationRootPath: string;
  let migrationsDirPath: string;

  beforeEach(async () => {
    tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "autobyteus-app-storage-"));
    applicationRootPath = path.join(tempRoot, "bundle", "applications", "ticketing-app");
    migrationsDirPath = path.join(applicationRootPath, "backend", "migrations");
    await fs.mkdir(migrationsDirPath, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(tempRoot, { recursive: true, force: true });
  });

  it("creates app.sqlite and hidden platform.sqlite, then applies allowed app migrations", async () => {
    await fs.writeFile(
      path.join(migrationsDirPath, "001_create_tickets.sql"),
      "CREATE TABLE tickets (id TEXT PRIMARY KEY, title TEXT NOT NULL);\n",
      "utf-8",
    );

    const service = new ApplicationStorageLifecycleService({
      appConfig: createMockAppConfig(tempRoot) as never,
      applicationBundleService: {
        getApplicationById: async () => createBundle(applicationRootPath, migrationsDirPath),
      } as never,
    });

    const layout = await service.ensureStoragePrepared("built-in:applications__ticketing-app");

    const appDb = new DatabaseSync(layout.appDatabasePath);
    const platformDb = new DatabaseSync(layout.platformDatabasePath);
    try {
      const ticketsTable = appDb
        .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'tickets'")
        .get() as { name: string } | undefined;
      expect(ticketsTable?.name).toBe("tickets");

      const reservedTable = platformDb
        .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = '__autobyteus_publication_journal'")
        .get() as { name: string } | undefined;
      expect(reservedTable?.name).toBe("__autobyteus_publication_journal");

      const appliedMigration = platformDb
        .prepare("SELECT migration_name FROM __autobyteus_app_migrations")
        .get() as { migration_name: string } | undefined;
      expect(appliedMigration?.migration_name).toBe("001_create_tickets.sql");
    } finally {
      platformDb.close();
      appDb.close();
    }
  });

  it("reapplies app migrations when app.sqlite is emptied after the platform migration ledger already exists", async () => {
    await fs.writeFile(
      path.join(migrationsDirPath, "001_create_briefs.sql"),
      "CREATE TABLE briefs (brief_id TEXT PRIMARY KEY, title TEXT NOT NULL);\n",
      "utf-8",
    );

    const service = new ApplicationStorageLifecycleService({
      appConfig: createMockAppConfig(tempRoot) as never,
      applicationBundleService: {
        getApplicationById: async () => createBundle(applicationRootPath, migrationsDirPath),
      } as never,
    });

    const initialLayout = await service.ensureStoragePrepared("built-in:applications__ticketing-app");
    const initialPlatformDb = new DatabaseSync(initialLayout.platformDatabasePath);
    try {
      const initialLedgerCount = initialPlatformDb
        .prepare("SELECT COUNT(*) AS migrationCount FROM __autobyteus_app_migrations")
        .get() as { migrationCount?: number } | undefined;
      expect(initialLedgerCount?.migrationCount).toBe(1);
    } finally {
      initialPlatformDb.close();
    }
    await fs.writeFile(initialLayout.appDatabasePath, "");

    const repairedLayout = await service.ensureStoragePrepared("built-in:applications__ticketing-app");

    const appDb = new DatabaseSync(repairedLayout.appDatabasePath);
    const platformDb = new DatabaseSync(repairedLayout.platformDatabasePath);
    try {
      const briefsTable = appDb
        .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'briefs'")
        .get() as { name: string } | undefined;
      expect(briefsTable?.name).toBe("briefs");

      const ledgerRow = platformDb
        .prepare("SELECT migration_name, checksum FROM __autobyteus_app_migrations WHERE migration_name = ?")
        .get("001_create_briefs.sql") as { migration_name?: string; checksum?: string } | undefined;
      expect(ledgerRow?.migration_name).toBe("001_create_briefs.sql");
      expect(ledgerRow?.checksum).toBeTruthy();

      const repairedLedgerCount = platformDb
        .prepare("SELECT COUNT(*) AS migrationCount FROM __autobyteus_app_migrations")
        .get() as { migrationCount?: number } | undefined;
      expect(repairedLedgerCount?.migrationCount).toBe(1);
    } finally {
      platformDb.close();
      appDb.close();
    }
  });

  it("bootstraps hidden platform state without running app-authored migrations", async () => {
    await fs.writeFile(
      path.join(migrationsDirPath, "001_invalid.sql"),
      "ATTACH DATABASE 'platform.sqlite' AS platform;\nCREATE TABLE __autobyteus_bad (id TEXT);\n",
      "utf-8",
    );

    const service = new ApplicationStorageLifecycleService({
      appConfig: createMockAppConfig(tempRoot) as never,
      applicationBundleService: {
        getApplicationById: async () => createBundle(applicationRootPath, migrationsDirPath),
      } as never,
    });

    const layout = await service.ensurePlatformStatePrepared("built-in:applications__ticketing-app");

    const platformDb = new DatabaseSync(layout.platformDatabasePath);
    try {
      const reservedTable = platformDb
        .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = '__autobyteus_session_index'")
        .get() as { name: string } | undefined;
      expect(reservedTable?.name).toBe("__autobyteus_session_index");
    } finally {
      platformDb.close();
    }

    await expect(service.ensureStoragePrepared("built-in:applications__ticketing-app")).rejects.toThrow(
      "ATTACH is not allowed in app migrations",
    );
  });

  it("rejects forbidden SQL so app-authored migrations cannot escape into platform-owned storage", async () => {
    await fs.writeFile(
      path.join(migrationsDirPath, "001_invalid.sql"),
      "ATTACH DATABASE 'platform.sqlite' AS platform;\nCREATE TABLE __autobyteus_bad (id TEXT);\n",
      "utf-8",
    );

    const service = new ApplicationStorageLifecycleService({
      appConfig: createMockAppConfig(tempRoot) as never,
      applicationBundleService: {
        getApplicationById: async () => createBundle(applicationRootPath, migrationsDirPath),
      } as never,
    });

    await expect(service.ensureStoragePrepared("built-in:applications__ticketing-app")).rejects.toThrow(
      "ATTACH is not allowed in app migrations",
    );
  });
});
