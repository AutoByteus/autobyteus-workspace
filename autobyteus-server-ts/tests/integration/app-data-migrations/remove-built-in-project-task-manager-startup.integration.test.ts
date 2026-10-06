import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AgentDefinitionService } from "../../../src/agent-definition/services/agent-definition-service.js";
import { serializeAgentMd } from "../../../src/agent-definition/utils/agent-md-parser.js";
import { AppDataMigrationRegistry } from "../../../src/app-data-migrations/app-data-migration-registry.js";
import { AppDataMigrationRunner } from "../../../src/app-data-migrations/app-data-migration-runner.js";
import {
  AppDataMigrationRecoveryAction,
  type AppDataMigrationDefinition,
} from "../../../src/app-data-migrations/domain/app-data-migration-types.js";
import { REMOVE_BUILT_IN_PROJECT_TASK_MANAGER_MIGRATION_ID as MIGRATION_ID } from "../../../src/app-data-migrations/migrations/remove-built-in-project-task-manager-migration.js";
import { AppDataMigrationRecordRepository } from "../../../src/app-data-migrations/repositories/app-data-migration-record-repository.js";
import { bootstrapBuiltInAgents } from "../../../src/built-in-agents/built-in-agent-bootstrapper.js";
import { appConfigProvider } from "../../../src/config/app-config-provider.js";
import { ServerSettingsService } from "../../../src/services/server-settings-service.js";

/**
 * Startup-path proof for the retired built-in Project Task Manager (AC-002, AC-003, AC-004, AC-006):
 * owned temp app data and package root, the migration as registered by the real registry, the real
 * runner over an isolated SQLite record store, then the real built-in bootstrap and agent catalog.
 */

const RETIRED_ID = "autobyteus-project-task-manager";
const REPOSITORY_ID = "project-task-manager";

let root: string;
let appDataDir: string;
let packageRoot: string;
let previousAgentPackageRoots: string | undefined;
const clients: PrismaClient[] = [];

const writeText = async (filePath: string, content: string): Promise<void> => {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content, "utf-8");
};

const exists = async (target: string): Promise<boolean> => {
  try {
    await fs.lstat(target);
    return true;
  } catch {
    return false;
  }
};

const agentMd = (name: string, instructions: string): string =>
  serializeAgentMd({ name, description: `${name} for tests`, role: name }, instructions);

const installedCopyDir = (): string => path.join(appDataDir, "agents", RETIRED_ID);

/** Seeds an upgraded beta install plus the data that must survive byte for byte. */
const seedUpgradedInstall = async (): Promise<string[]> => {
  await writeText(path.join(installedCopyDir(), "agent.md"), agentMd("Project Task Manager", "OLD BUILT-IN"));
  await writeText(path.join(installedCopyDir(), "agent-config.json"), "{\"toolNames\":[\"list_projects\"]}");
  const preserved = [
    path.join(packageRoot, "agents", REPOSITORY_ID, "agent.md"),
    path.join(packageRoot, "agents", REPOSITORY_ID, "agent-config.json"),
    path.join(packageRoot, "agents", REPOSITORY_ID, "skills", "project-task-management", "SKILL.md"),
    path.join(appDataDir, "agents", "my-user-agent", "agent.md"),
    path.join(appDataDir, "memory", "run_history_index.json"),
    path.join(appDataDir, "memory", "agents", "old-ptm-run", "raw_traces.jsonl"),
    path.join(appDataDir, "projects", "project-1", "project.json"),
    path.join(appDataDir, "projects", "project-1", "tasks", "task-1", "context.md"),
  ];
  await writeText(preserved[0]!, agentMd("Project Task Manager", "REPOSITORY MANAGER"));
  await writeText(preserved[1]!, "{\"skillNames\":[\"project-task-management\"]}");
  await writeText(preserved[2]!, "---\nname: project-task-management\ndescription: Manage Projects.\n---\n\n# Skill\n");
  await writeText(preserved[3]!, agentMd("My User Agent", "USER AGENT"));
  await writeText(preserved[4]!, JSON.stringify([{ runId: "old-ptm-run", agentDefinitionId: RETIRED_ID, agentName: "Project Task Manager" }]));
  await writeText(preserved[5]!, "{\"type\":\"user\",\"content\":\"plan my project\"}\n");
  await writeText(preserved[6]!, "{\"id\":\"project-1\",\"name\":\"Project\"}");
  await writeText(preserved[7]!, "Task context\n");
  return preserved;
};

const readAll = async (files: string[]): Promise<string[]> =>
  Promise.all(files.map((filePath) => fs.readFile(filePath, "base64")));

const createRecordRepository = async (): Promise<AppDataMigrationRecordRepository> => {
  const db = new PrismaClient({ datasources: { db: { url: `file:${path.join(root, "records.sqlite")}` } } });
  clients.push(db);
  // Released record DDL with the current column name, as in definition-nonmutation-startup.test.ts.
  const ddl = (await fs.readFile(path.resolve("prisma/migrations/20260517090000_add_app_data_migration_records/migration.sql"), "utf8"))
    .replaceAll("\"summary_json\"", "\"summary\"");
  for (const statement of ddl.split(";").filter((s) => s.trim())) {
    await db.$executeRawUnsafe(statement);
  }
  return new AppDataMigrationRecordRepository(db);
};

/** The migration exactly as the production registry constructs it from the configured agents directory. */
const registeredMigration = (): AppDataMigrationDefinition => {
  const definitions = new AppDataMigrationRegistry().listDefinitions();
  const definition = definitions.at(-1);
  expect(definition?.id).toBe(MIGRATION_ID);
  return definition!;
};

const startServer = async (repository: AppDataMigrationRecordRepository, migration: AppDataMigrationDefinition) => {
  const runner = new AppDataMigrationRunner(new AppDataMigrationRegistry([migration]), repository, {
    logsDir: path.join(root, "migration-logs"),
  });
  const [migrationStatus] = await runner.runPending();
  const agentDefinitionService = new AgentDefinitionService();
  const bootstrap = await bootstrapBuiltInAgents({
    agentDefinitionService,
    serverSettingsService: new ServerSettingsService(),
  });
  const visible = await agentDefinitionService.getVisibleAgentDefinitions();
  return { migrationStatus: migrationStatus!, bootstrap, visible };
};

const projectTaskManagers = (visible: Array<{ id: string; name: string }>) =>
  visible.filter((definition) => definition.name === "Project Task Manager").map((definition) => definition.id);

describe("Retired built-in Project Task Manager on the startup path", () => {
  beforeEach(async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), "retired-ptm-startup-"));
    appDataDir = path.join(root, "app-data");
    packageRoot = path.join(root, "agent-repository");
    await fs.mkdir(appDataDir, { recursive: true });
    previousAgentPackageRoots = process.env.AUTOBYTEUS_AGENT_PACKAGE_ROOTS;
    process.env.AUTOBYTEUS_AGENT_PACKAGE_ROOTS = packageRoot;
    appConfigProvider.resetForTests();
    appConfigProvider.initialize({ appDataDir });
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await Promise.all(clients.splice(0).map((client) => client.$disconnect()));
    appConfigProvider.resetForTests();
    if (previousAgentPackageRoots === undefined) {
      delete process.env.AUTOBYTEUS_AGENT_PACKAGE_ROOTS;
    } else {
      process.env.AUTOBYTEUS_AGENT_PACKAGE_ROOTS = previousAgentPackageRoots;
    }
    await fs.rm(root, { recursive: true, force: true });
  });

  it("removes the installed copy once, lists exactly one Project Task Manager and preserves everything else across restarts", async () => {
    const preserved = await seedUpgradedInstall();
    const before = await readAll(preserved);
    const migration = registeredMigration();
    const execute = vi.spyOn(migration, "execute");
    // Precondition: without the cleanup the catalog shows the duplicate the user reported.
    expect(projectTaskManagers(await new AgentDefinitionService().getVisibleAgentDefinitions()).sort())
      .toEqual([RETIRED_ID, REPOSITORY_ID]);
    const repository = await createRecordRepository();

    const first = await startServer(repository, migration);

    expect(first.migrationStatus).toMatchObject({ migrationId: MIGRATION_ID, status: "SUCCEEDED", attempts: 1 });
    expect(await exists(installedCopyDir())).toBe(false);
    expect(first.bootstrap.builtInAgents.map((item) => item.agentDefinitionId).sort())
      .toEqual(["autobyteus-daily-assistant", "autobyteus-retrospective-skill-improver"]);
    expect(projectTaskManagers(first.visible)).toEqual([REPOSITORY_ID]);
    expect(first.visible.some((definition) => definition.id === RETIRED_ID)).toBe(false);
    expect(first.visible.some((definition) => definition.id === "my-user-agent")).toBe(true);
    expect(await readAll(preserved)).toEqual(before);

    const restart = await startServer(repository, migration);

    expect(execute).toHaveBeenCalledTimes(1);
    expect(restart.migrationStatus).toMatchObject({ status: "SUCCEEDED", attempts: 1 });
    expect(await exists(installedCopyDir())).toBe(false);
    expect(projectTaskManagers(restart.visible)).toEqual([REPOSITORY_ID]);
    expect(await readAll(preserved)).toEqual(before);
  });

  it("records nothing to remove on an install that never had the built-in", async () => {
    const repository = await createRecordRepository();

    const first = await startServer(repository, registeredMigration());

    expect(first.migrationStatus).toMatchObject({ status: "SUCCEEDED", summary: "Scanned 1; migrated 0; skipped 1; failed 0." });
    expect(await exists(installedCopyDir())).toBe(false);
    expect(first.visible.some((definition) => definition.id === RETIRED_ID)).toBe(false);
  });

  it("lets startup continue when the removal fails, then retries and succeeds on the next start", async () => {
    await seedUpgradedInstall();
    const migration = registeredMigration();
    const repository = await createRecordRepository();
    vi.spyOn(fs, "rm").mockRejectedValueOnce(Object.assign(new Error("EBUSY: resource busy or locked"), { code: "EBUSY" }));

    const failed = await startServer(repository, migration);

    expect(failed.migrationStatus).toMatchObject({
      status: "FAILED",
      attempts: 1,
      recoveryAction: AppDataMigrationRecoveryAction.RESTART_TO_RETRY,
      canRetry: false,
      errorMessage: "The retired built-in Project Task Manager folder could not be removed; the cleanup retries on the next start.",
    });
    expect(failed.bootstrap.refreshedCache).toBe(true);
    expect(failed.bootstrap.builtInAgents.every((item) => item.resolved)).toBe(true);
    expect(await exists(path.join(installedCopyDir(), "agent.md"))).toBe(true);

    const retried = await startServer(repository, migration);

    expect(retried.migrationStatus).toMatchObject({ status: "SUCCEEDED", attempts: 2 });
    expect(await exists(installedCopyDir())).toBe(false);
    expect(projectTaskManagers(retried.visible)).toEqual([REPOSITORY_ID]);
  });
});
