import "reflect-metadata";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildSchema } from "type-graphql";
const { graphql } = createRequire(import.meta.url)("graphql") as typeof import("graphql");
import type { AppConfig } from "../../../src/config/app-config.js";
import type { ApplicationBundleService } from "../../../src/application-bundles/services/application-bundle-service.js";
import { createBundleBackedDefinitionServices } from "../../../src/application-platform/definitions/create-bundle-backed-definition-services.js";
import { configureStudioApplicationApiServices } from "../../../src/api/graphql/studio-application-api-services.js";
import { AgentTeamDefinitionResolver } from "../../../src/api/graphql/types/agent-team-definition.js";

/**
 * imported-team-defaults-edit (SR-003, AC-001/AC-003/AC-005): the Team edit page's GraphQL save of
 * a Team from a registered agent package (as `autobyteus-agents`) writes its default runtime/model
 * into the package, and the hosted definition catalog serves the saved default afterwards.
 */
const bundleService = {
  listApplicationOwnedAgentSources: async () => [], listApplicationOwnedTeamSources: async () => [],
  getApplicationOwnedAgentSourceById: async () => null, getApplicationOwnedTeamSourceById: async () => null,
} as unknown as ApplicationBundleService;
const mutation = `mutation($input: UpdateAgentTeamDefinitionInput!) {
  updateAgentTeamDefinition(input: $input) { id description revision defaultLaunchConfig { runtimeKind llmModelIdentifier llmConfig } } }`;
const launch = { runtimeKind: "claude_agent_sdk", llmModelIdentifier: "claude-sonnet-5-5", llmConfig: { thinking: "xhigh" } };

describe("registered package Team save through GraphQL", () => {
  let root: string;
  let pkgTeamDir: string;
  let definitions: ReturnType<typeof createBundleBackedDefinitionServices>;
  let registration: ReturnType<typeof configureStudioApplicationApiServices> | undefined;
  let schema: Awaited<ReturnType<typeof buildSchema>>;

  beforeEach(async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), "registered-team-graphql-"));
    const data = path.join(root, "data"), pkg = path.join(root, "autobyteus-agents");
    pkgTeamDir = path.join(pkg, "agent-teams", "software-engineering-team");
    await fs.mkdir(path.join(pkgTeamDir, "agents", "lead"), { recursive: true });
    await fs.writeFile(path.join(pkgTeamDir, "team.md"), "---\nname: Software Engineering Team\ndescription: From the package\n---\n\nShip software.\n");
    await fs.writeFile(path.join(pkgTeamDir, "team-config.json"), JSON.stringify({ coordinatorMemberName: "lead",
      members: [{ memberName: "lead", ref: "lead", refScope: "team_local" }], handoffs: [], avatarUrl: null, defaultLaunchConfig: null }));
    await fs.writeFile(path.join(pkgTeamDir, "agents", "lead", "agent.md"), "---\nname: Lead\ndescription: Leads\nrole: Lead\n---\n\nLead the team.\n");
    await fs.writeFile(path.join(pkgTeamDir, "agents", "lead", "agent-config.json"), JSON.stringify({ toolNames: [], skillNames: [] }));
    const config = {
      getAgentsDir: () => path.join(data, "agents"),
      getAgentMdPath: (id: string) => path.join(data, "agents", id, "agent.md"),
      getAgentConfigPath: (id: string) => path.join(data, "agents", id, "agent-config.json"),
      getAgentTeamsDir: () => path.join(data, "agent-teams"),
      getAgentOrgsDir: () => path.join(data, "agent-orgs"),
      getAdditionalAgentPackageRoots: () => [pkg],
      getRegisteredAgentPackageRoots: () => [pkg],
    } as unknown as AppConfig;
    definitions = createBundleBackedDefinitionServices({ appConfig: config, bundleService });
    const unused = new Proxy({}, { get: (_target, key) => { throw new Error(`Unexpected unrelated service operation ${String(key)}`); } });
    registration = configureStudioApplicationApiServices({ ...definitions, bundleService,
      agentOrgDefinitionService: unused, agentRunService: unused, teamRunService: unused, agentOrgRunService: unused,
      definitionAdmissionService: unused, collaborationRootHistoryService: unused, runModelConfigService: unused, delegatedLaunchSelectionService: unused,
      capabilityService: unused, packageQueries: unused, packageCommands: unused,
    } as never);
    schema = await buildSchema({ resolvers: [AgentTeamDefinitionResolver], validate: false });
  });
  afterEach(async () => {
    registration?.close(); registration = undefined;
    definitions.packageDefinitions.reloader.close();
    await fs.rm(root, { recursive: true, force: true });
  });

  it("saves the default runtime/model into the package and serves it afterwards; a stale revision conflicts", async () => {
    const before = (await definitions.agentTeamDefinitionService.getDefinitionById("software-engineering-team"))!;
    expect(before.defaultLaunchConfig).toBeNull();
    const save = (expectedRevision: string, description: string) => graphql({ schema, source: mutation, variableValues: { input: {
      id: "software-engineering-team", expectedRevision, description, defaultLaunchConfig: launch } } });
    const saved = await save(before.revision!, "Edited in the app");
    expect(saved.errors).toBeUndefined();
    expect(saved.data?.updateAgentTeamDefinition).toMatchObject({ id: "software-engineering-team", description: "Edited in the app", defaultLaunchConfig: launch });
    const config = JSON.parse(await fs.readFile(path.join(pkgTeamDir, "team-config.json"), "utf8"));
    expect(config.defaultLaunchConfig).toEqual(launch);
    // The catalog that launches and delegation read serves the saved default.
    expect((await definitions.agentTeamDefinitionService.getDefinitionById("software-engineering-team"))?.defaultLaunchConfig).toEqual(launch);
    const stale = await save(before.revision!, "Concurrent edit");
    expect(stale.errors?.[0]?.extensions).toMatchObject({ code: "DEFINITION_REVISION_CONFLICT" });
  });
});
