import "reflect-metadata";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { graphql as graphqlFn, GraphQLSchema } from "graphql";
import { buildGraphqlSchema } from "../../../src/api/graphql/schema.js";
import { AgentDefinitionService } from "../../../src/agent-definition/services/agent-definition-service.js";
import { parseAgentMd, serializeAgentMd } from "../../../src/agent-definition/utils/agent-md-parser.js";
import { bootstrapBuiltInAgents } from "../../../src/built-in-agents/built-in-agent-bootstrapper.js";
import { DAILY_ASSISTANT_AGENT_DEFINITION_ID } from "../../../src/built-in-agents/built-in-agent-registry.js";
import { appConfigProvider } from "../../../src/config/app-config-provider.js";
import { ServerSettingsService } from "../../../src/services/server-settings-service.js";
import { AgentRunHistoryIndexStore } from "../../../src/run-history/store/agent-run-history-index-store.js";
import { configureE2eStudioApplicationApiServices } from "../helpers/studio-application-api-services.js";

const ID = DAILY_ASSISTANT_AGENT_DEFINITION_ID;
const TEMPLATE = new URL("../../../src/built-in-agents/templates/daily-assistant/", import.meta.url);
const APPROVED_SHA256 = "49ed6e909ef92a470fb8b3fce84f471334cd125ff50adf2f5e6aff60389d07b7";

describe("Daily Assistant bootstrap → GraphQL identity (AC-001–006)", () => {
  let root: string;
  let definitions: AgentDefinitionService;
  let schema: GraphQLSchema;
  let graphql: typeof graphqlFn;
  let closeServices: (() => void) | undefined;

  beforeEach(async () => {
    vi.stubEnv("AUTOBYTEUS_AGENT_PACKAGE_ROOTS", "");
    vi.stubEnv("AUTOBYTEUS_RETROSPECTIVE_SKILL_IMPROVER_AGENT_DEFINITION_ID", "");
    root = await fs.mkdtemp(path.join(os.tmpdir(), "general-agent-api-"));
    appConfigProvider.resetForTests();
    appConfigProvider.initialize({ appDataDir: root });
    definitions = new AgentDefinitionService();
    closeServices = configureE2eStudioApplicationApiServices({ agentDefinitionService: definitions }).close;
    schema = await buildGraphqlSchema();
    // Resolve the schema's GraphQL instance, as other repository GraphQL E2E tests do.
    const require = createRequire(import.meta.url);
    const graphqlPath = require.resolve("graphql", { paths: [path.dirname(require.resolve("type-graphql"))] });
    graphql = (await import(graphqlPath)).graphql;
  });

  afterEach(async () => {
    closeServices?.();
    appConfigProvider.resetForTests();
    vi.unstubAllEnvs();
    await fs.rm(root, { recursive: true, force: true });
  });

  const bootstrap = () => bootstrapBuiltInAgents({
    agentDefinitionService: definitions,
    serverSettingsService: new ServerSettingsService(),
  });
  const queryIdentity = async () => {
    const result = await graphql({ schema, source: `{
      agentDefinition(id:"${ID}") { id name description role instructions toolNames skillNames skillScope }
      agentDefinitions { id name }
    }` });
    expect(result.errors).toBeUndefined();
    return result.data as unknown as {
      agentDefinition: { id: string; name: string; description: string; role: string; instructions: string;
        toolNames: string[]; skillNames: string[]; skillScope: string };
      agentDefinitions: { id: string; name: string }[];
    };
  };
  const assertApprovedIdentity = async () => {
    const template = await fs.readFile(new URL("agent.md", TEMPLATE), "utf8");
    expect(createHash("sha256").update(template).digest("hex")).toBe(APPROVED_SHA256);
    const config = JSON.parse(await fs.readFile(new URL("agent-config.json", TEMPLATE), "utf8"));
    const payload = await queryIdentity();
    expect(payload.agentDefinition).toEqual({
      id: "autobyteus-daily-assistant", ...parseAgentMd(template),
      toolNames: config.toolNames, skillNames: [], skillScope: "ALL_INSTALLED",
    });
    expect(payload.agentDefinition.toolNames.filter(name => name === "list_available_agents")).toHaveLength(1);
    expect(payload.agentDefinitions.filter(agent => agent.id === ID)).toEqual([{ id: ID, name: "Daily Assistant" }]);
    expect(await fs.readFile(path.join(root, "agents", ID, "agent.md"), "utf8")).toBe(template);
    expect(JSON.parse(await fs.readFile(path.join(root, "agents", ID, "agent-config.json"), "utf8"))).toEqual(config);
  };

  it("publishes fresh exact authored content and preserved config through current GraphQL readers", async () => {
    await bootstrap();
    await assertApprovedIdentity();
  });

  it("refreshes old same-ID content while historical snapshots remain byte-identical and readable", async () => {
    const agentDir = path.join(root, "agents", ID);
    await fs.mkdir(agentDir, { recursive: true });
    await fs.writeFile(path.join(agentDir, "agent.md"), serializeAgentMd({
      name: "General Agent", description: "Previous platform content", role: "General Agent",
    }, "Previous built-in prompt"));
    await fs.writeFile(path.join(agentDir, "agent-config.json"), JSON.stringify({ toolNames: ["read_file"] }));
    const memoryDir = path.join(root, "memory");
    await fs.mkdir(memoryDir);
    const row = { runId: "existing-run", agentDefinitionId: ID, agentName: "General Agent",
      workspaceRootPath: root, summary: "Previous conversation", createdAt: "2026-10-02T10:00:00.000Z",
      archivedAt: null, terminatedAt: "2026-10-02T11:00:00.000Z" };
    const history = JSON.stringify([row]);
    const historyPath = path.join(memoryDir, "run_history_index.json");
    await fs.writeFile(historyPath, history);
    // Warm the ordinary definition reader before startup refresh to exercise invalidation too.
    expect((await queryIdentity()).agentDefinition.name).toBe("General Agent");
    await bootstrap();
    await assertApprovedIdentity();
    expect(await new AgentRunHistoryIndexStore(memoryDir).getRow(row.runId)).toEqual(row);
    expect(await fs.readFile(historyPath, "utf8")).toBe(history);
  });
});
