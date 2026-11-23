import fs from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { MessageLog } from "../../../src/run-history/store/message-log.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import { AgentRunMetadataStore } from "../../../src/run-history/store/agent-run-metadata-store.js";
import { getAgentOrgRunExecutionTreePath } from "../../../src/run-history/store/agent-org-run-execution-tree-path.js";
import { getTeamRunExecutionTreePath } from "../../../src/run-history/store/team-run-execution-tree-path.js";
import { TeamCommunicationStore } from "../../../src/services/team-communication/team-communication-store.js";
import {
  testAgentOrgExecutionTree,
  testOrgAgentNode,
  testOrgTeamNode,
} from "../../fixtures/current-agent-org-run-fixtures.js";
import { testAgentNode, testExecutionTree } from "../../fixtures/current-team-run-fixtures.js";
import {
  createSanitizedTestEnvironment,
  executeGraphql,
  removeOwnedTestRuntime,
  resolveTestDatabaseLocation,
  startBuiltTestServer,
  testRuntimeRoot,
} from "../../../../test-support/live-e2e/test-runtime-bootstrap.mjs";
import { AGENT_ORG_UNITS_OWN_RUNS_V1_MIGRATION_ID } from "../../../src/app-data-migrations/migrations/agent-org-units-own-runs-v1/agent-org-units-own-runs-v1-app-data-migration.js";
import { faithfulUpgradeLedger, migrationsFrom, migrationsOfStartUnderTest } from "../app-data-migrations/helpers/faithful-upgrade-ledger.js";

/**
 * Run history written before the run-level skill access mode was removed still stores
 * `skillAccessMode`. The running server must open such history through the current GraphQL
 * contract, which no longer has the field.
 */
type RunningTestServer = Awaited<ReturnType<typeof startBuiltTestServer>>;
type DatabaseLocation = ReturnType<typeof resolveTestDatabaseLocation>;
type Json = Record<string, unknown>;

const STORED_MODES = ["PRELOADED_ONLY", "NONE"] as const;
/** The migrations every released build registers (the release record). */
const RELEASED_MIGRATION_ORDER = JSON.parse(fs.readFileSync(new URL("../../../src/app-data-migrations/released-migration-order.json", import.meta.url), "utf8")) as string[];
const REMOVED_FIELD = /skill_?access_?mode/i;

const ownedServers = new Set<RunningTestServer>();
const ownedTargets: Array<{ runtimeRoot: string; database: DatabaseLocation }> = [];

const writeJson = (filePath: string, value: unknown): void => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true, mode: 0o700 });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
};

/** Adds the stored legacy key to every launch configuration in a tree, as released writers did. */
const withStoredMode = (tree: unknown, mode: string): { tree: Json; launchConfigurations: number } => {
  const copy = JSON.parse(JSON.stringify(tree)) as Json;
  let launchConfigurations = 0;
  const visit = (value: unknown): void => {
    if (!value || typeof value !== "object") return;
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    for (const [key, child] of Object.entries(value)) {
      if (key === "launchConfiguration" || key === "defaultLaunchConfiguration") {
        (child as Json).skillAccessMode = mode;
        launchConfigurations += 1;
      } else {
        visit(child);
      }
    }
  };
  visit(copy);
  return { tree: copy, launchConfigurations };
};

/**
 * Writes one stored run of each kind. Trees carry the legacy key in every launch configuration;
 * the message files a complete team or agent-org package needs are written by the current stores.
 */
const seedStoredHistory = async (memoryDir: string, mode: (typeof STORED_MODES)[number]) => {
  const suffix = mode.toLowerCase().replaceAll("_", "-");
  const agentRunId = `stored-agent-${suffix}`;
  const teamRunId = `stored-team-${suffix}`;
  const orgRunId = `stored-org-${suffix}`;

  writeJson(new AgentRunMetadataStore(memoryDir).getMetadataPath(agentRunId), {
    runId: agentRunId,
    agentDefinitionId: "stored-agent-definition",
    workspaceRootPath: "/tmp/stored-skill-access-mode-workspace",
    memoryDir: path.join(memoryDir, "agents", agentRunId),
    llmModelIdentifier: "stored-model",
    llmConfig: null,
    autoExecuteTools: false,
    skillAccessMode: mode,
    runtimeKind: RuntimeKind.AUTOBYTEUS,
    platformAgentRunId: null,
    preparedAt: "2026-05-01T09:00:00.000Z",
    preparedExpiresAt: "2026-05-02T09:00:00.000Z",
    startedAt: "2026-05-01T09:05:00.000Z",
    applicationExecutionContext: null,
  });

  const team = withStoredMode(testExecutionTree({
    rootTeamRunId: teamRunId,
    rootTeamDefinitionId: "stored-team-definition",
    coordinatorAddress: "/coordinator",
    children: [
      testAgentNode("/coordinator", { agentRunId: `${teamRunId}-coordinator` }),
      testAgentNode("/reviewer", { agentRunId: `${teamRunId}-reviewer` }),
    ],
  }), mode);
  const teamDir = path.join(memoryDir, "agent_teams", teamRunId);
  const teamTreePath = getTeamRunExecutionTreePath(teamDir);
  writeJson(teamTreePath, team.tree);
  await new TeamCommunicationStore().write(teamDir, { schemaVersion: 1, rootTeamRunId: teamRunId, messages: [] });

  const org = withStoredMode(testAgentOrgExecutionTree({
    orgRunId,
    members: [
      testOrgAgentNode("/director", `${orgRunId}-director`),
      testOrgTeamNode({
        address: "/team",
        teamRunId: `${orgRunId}-team`,
        coordinatorAddress: "/team/lead",
        members: [testOrgAgentNode("/team/lead", `${orgRunId}-team-lead`)],
      }),
    ],
  }), mode);
  const orgDir = path.join(memoryDir, "agent_orgs", orgRunId);
  const orgTreePath = getAgentOrgRunExecutionTreePath(orgDir);
  writeJson(orgTreePath, org.tree);
  // The released Org's (empty) log, as released builds wrote it; the startup conversion converts the Org (slice 5).
  await new MessageLog(orgDir, "agent_org_communication_messages").appendBatch([]);

  expect(team.launchConfigurations).toBe(3);
  expect(org.launchConfigurations).toBe(4);
  for (const stored of [teamTreePath, orgTreePath]) {
    expect(fs.readFileSync(stored, "utf8")).toContain(`"skillAccessMode": "${mode}"`);
  }
  return { agentRunId, teamRunId, orgRunId };
};

afterEach(async () => {
  for (const server of [...ownedServers]) {
    if (server.child.exitCode === null) {
      await server.stop().catch(() => server.child.kill("SIGKILL"));
    }
    ownedServers.delete(server);
  }
  for (const target of ownedTargets.splice(0)) {
    await removeOwnedTestRuntime(target.runtimeRoot, target.database);
  }
});

describe("run history stored with the removed skillAccessMode through the running server", () => {
  it("opens stored agent, team and agent-org history through a GraphQL contract that no longer has the field", async () => {
    const suffix = `${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const runtimeRoot = path.join(testRuntimeRoot, `stored-skill-access-mode-${suffix}`);
    const database = resolveTestDatabaseLocation(`file:./db/stored-skill-access-mode-${suffix}.db`);
    const isolatedHome = path.join(runtimeRoot, "isolated-home");
    fs.mkdirSync(isolatedHome, { recursive: true, mode: 0o700 });
    ownedTargets.push({ runtimeRoot, database });
    const start = async () => {
      const started = await startBuiltTestServer({
        runtimeRoot,
        databaseUrlOverride: database.databaseUrl,
        environment: createSanitizedTestEnvironment({ HOME: isolatedHome }),
      });
      ownedServers.add(started);
      return started;
    };
    type Migration = { migrationId: string; status: string; attempts: number };
    const migrations = async (url: string) =>
      (await executeGraphql<{ getAppDataMigrations: Migration[] }>(url, "{getAppDataMigrations{migrationId status attempts}}")).getAppDataMigrations;
    // A faithful upgrade (autobyteus-619): the stored history is the latest release's (every released migration ran on its
    // install); the Org is still in the released shape that autobyteus-29's startup conversion converts (slice 5), so that
    // conversion and every later migration never ran.
    const ledger = await faithfulUpgradeLedger({
      databaseFile: database.databasePath,
      firstStart: async () => {
        const fresh = await start();
        const ids = (await migrations(fresh.serverUrl)).map((migration) => migration.migrationId);
        await fresh.stop();
        ownedServers.delete(fresh);
        return ids;
      },
      neverRan: migrationsFrom(AGENT_ORG_UNITS_OWN_RUNS_V1_MIGRATION_ID),
    });
    expect(ledger.registered.filter((id) => !ledger.neverRan.includes(id)), "the modeled release ran exactly the released migrations")
      .toEqual(RELEASED_MIGRATION_ORDER);
    const seeded = [];
    for (const mode of STORED_MODES) {
      seeded.push({ mode, ...await seedStoredHistory(path.join(runtimeRoot, "memory"), mode) });
    }

    const server = await start();
    console.log(`removed-skill-access-mode: the migrations that ran on the start under test\n${migrationsOfStartUnderTest(ledger, await migrations(server.serverUrl))}`);

    const schema = await executeGraphql<{
      __schema: {
        types: Array<{
          name: string;
          fields: Array<{ name: string }> | null;
          inputFields: Array<{ name: string }> | null;
        }>;
      };
    }>(server.serverUrl, `
      query RemovedSkillAccessModeSchema {
        __schema { types { name fields { name } inputFields { name } } }
      }
    `);
    const removedNames = schema.__schema.types.flatMap((type) => [
      type.name,
      ...(type.fields ?? []).map((field) => `${type.name}.${field.name}`),
      ...(type.inputFields ?? []).map((field) => `${type.name}.${field.name}`),
    ]).filter((name) => /skillAccess/i.test(name));
    expect(removedNames).toEqual([]);
    expect(schema.__schema.types.map((type) => type.name)).toEqual(
      expect.arrayContaining(["CreateAgentRunInput", "TeamMemberConfigInput", "CreateAgentOrgRunInput"]),
    );

    for (const { mode, agentRunId, teamRunId, orgRunId } of seeded) {
      const agent = await executeGraphql<{
        getAgentRunResumeConfig: { runId: string; isActive: boolean; metadataConfig: Json };
      }>(server.serverUrl, `
        query StoredAgentResume($runId: String!) {
          getAgentRunResumeConfig(runId: $runId) {
            runId
            isActive
            metadataConfig {
              agentDefinitionId workspaceRootPath llmModelIdentifier llmConfig autoExecuteTools runtimeKind
            }
          }
        }
      `, { runId: agentRunId });
      expect(agent.getAgentRunResumeConfig, mode).toEqual({
        runId: agentRunId,
        isActive: false,
        metadataConfig: {
          agentDefinitionId: "stored-agent-definition",
          workspaceRootPath: "/tmp/stored-skill-access-mode-workspace",
          llmModelIdentifier: "stored-model",
          llmConfig: null,
          autoExecuteTools: false,
          runtimeKind: "autobyteus",
        },
      });

      const team = await executeGraphql<{
        getTeamRunResumeConfig: { teamRunId: string; isActive: boolean; executionTree: Json };
      }>(server.serverUrl, `
        query StoredTeamResume($teamRunId: String!) {
          getTeamRunResumeConfig(teamRunId: $teamRunId) { teamRunId isActive executionTree }
        }
      `, { teamRunId });
      expect(team.getTeamRunResumeConfig, mode).toMatchObject({
        teamRunId,
        isActive: false,
        executionTree: {
          root_team: {
            default_launch_configuration: {
              runtime_kind: "autobyteus",
              llm_model_identifier: "test-model",
              llm_config: null,
              auto_execute_tools: true,
              workspace_root_path: null,
            },
            members: [
              expect.objectContaining({ address: "/coordinator" }),
              expect.objectContaining({ address: "/reviewer" }),
            ],
          },
        },
      });
      expect(JSON.stringify(team.getTeamRunResumeConfig), mode).not.toMatch(REMOVED_FIELD);

      const org = await executeGraphql<{
        getAgentOrgRunConfig: { orgRunId: string; isActive: boolean; executionTree: Json };
      }>(server.serverUrl, `
        query StoredOrgConfig($orgRunId: String!) {
          getAgentOrgRunConfig(orgRunId: $orgRunId) { orgRunId isActive executionTree }
        }
      `, { orgRunId });
      expect(org.getAgentOrgRunConfig, mode).toMatchObject({ orgRunId, isActive: false });
      const orgTree = JSON.stringify(org.getAgentOrgRunConfig.executionTree);
      expect(orgTree, mode).toContain("/director");
      expect(orgTree, mode).toContain("/team/lead");
      expect(orgTree, mode).not.toMatch(REMOVED_FIELD);
    }
  }, 120_000);
});
