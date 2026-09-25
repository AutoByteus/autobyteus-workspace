import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import type { AppConfig } from "../../src/config/app-config.js";
import { AgentOrgFlatTeamFamiliesV1AppDataMigration } from "../../src/app-data-migrations/migrations/agent-org-flat-team-families-v1/agent-org-flat-team-families-v1-app-data-migration.js";
import { AgentOrgTokenAttributionRepository } from "../../src/app-data-migrations/migrations/agent-org-flat-team-families-v1/agent-org-token-attribution-repository.js";
import { AgentOrgTokenAttributionTransition } from "../../src/app-data-migrations/migrations/agent-org-flat-team-families-v1/agent-org-token-attribution-transition.js";
import { AtomicRunPackageFileCommitWriter } from "../../src/run-history/store/atomic-run-package-file-commit-writer.js";
import { createCurrentTokenUsageTestHarness } from "./token-usage-run-record-fixtures.js";
import { testExecutionTree, testAgentNode } from "../fixtures/current-team-run-fixtures.js";
import { testOrgTeamNode, testOrgAgentNode } from "../fixtures/current-agent-org-run-fixtures.js";

export const putOrgFixture = async (file: string, data: unknown, raw = false): Promise<void> => {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, raw ? data as string : JSON.stringify(data, null, 2) + "\n");
};
export const nestedTree = (id: string) => {
  const tree = testExecutionTree({ rootTeamRunId: id, children: [testAgentNode("/direct", { agentRunId: `${id}-direct` })], coordinatorAddress: "/direct" });
  return { ...tree, rootTeam: { ...tree.rootTeam, members: [...tree.rootTeam.members,
    testOrgTeamNode({ address: "/team", teamRunId: `${id}-team`, coordinatorAddress: "/team/lead", members: [testOrgAgentNode("/team/lead", `${id}-lead`)] })] } };
};
export const writeNestedRoot = async (memory: string, id = "org") => {
  const source = path.join(memory, "agent_teams", id), target = path.join(memory, "agent_orgs", id);
  await putOrgFixture(path.join(source, "team_run_execution_tree.json"), nestedTree(id));
  await putOrgFixture(path.join(source, "task_delegation_records.json"), { schemaVersion: 1, rootTeamRunId: id, records: [] });
  await putOrgFixture(path.join(source, "team_communication_messages.json"), { schemaVersion: 1, rootTeamRunId: id, messages: [] });
  return { source, target };
};
/** Each test owns a new DB with only released token tables. Never uses the process DB. */
export const createOrgMigrationFixture = async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "org-token-implementation-")), memory = path.join(root, "memory");
  const client = new PrismaClient({ datasources: { db: { url: `file:${path.join(root, "tokens.sqlite")}` } } });
  for (const name of ["20260819090000_add_token_usage_run_records", "20260822090000_add_token_usage_analytics", "20260923130000_add_claude_sdk_usage_state"]) {
    const ddl = await fs.readFile(path.resolve("prisma/migrations", name, "migration.sql"), "utf8");
    for (const statement of ddl.split(";").filter((part) => part.trim())) await client.$executeRawUnsafe(statement);
  }
  const repository = new AgentOrgTokenAttributionRepository(client);
  const tokens = new AgentOrgTokenAttributionTransition(memory, repository);
  const harness = createCurrentTokenUsageTestHarness(client, { useProcessReadiness: true });
  const config = { getBaseUrl: () => "http://127.0.0.1:43151" } as AppConfig;
  return {
    root, memory, client, attributionRepository: repository, tokens, ...harness,
    migrate: (writer = new AtomicRunPackageFileCommitWriter()) => new AgentOrgFlatTeamFamiliesV1AppDataMigration(memory, config, writer, tokens).execute(),
    close: async () => { await client.$disconnect(); await fs.rm(root, { recursive: true, force: true }); },
  };
};
