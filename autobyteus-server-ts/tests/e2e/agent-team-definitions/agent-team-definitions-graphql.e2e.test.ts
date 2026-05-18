import "reflect-metadata";
import { promises as fs } from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import type { graphql as graphqlFn, GraphQLSchema } from "graphql";
import {
  buildTeamLocalAgentDefinitionId,
  buildTeamLocalTeamDefinitionId,
} from "autobyteus-ts/agent-team/utils/team-local-definition-id.js";
import { buildGraphqlSchema } from "../../../src/api/graphql/schema.js";
import { ApplicationBundleService } from "../../../src/application-bundles/services/application-bundle-service.js";
import { AgentDefinitionService } from "../../../src/agent-definition/services/agent-definition-service.js";
import { AgentTeamDefinitionService } from "../../../src/agent-team-definition/services/agent-team-definition-service.js";
import { appConfigProvider } from "../../../src/config/app-config-provider.js";

function uniqueId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

async function writeSharedAgentFixture(dataDir: string, agentId: string, name = agentId) {
  const agentDir = path.join(dataDir, "agents", agentId);
  await fs.mkdir(agentDir, { recursive: true });
  await fs.writeFile(
    path.join(agentDir, "agent.md"),
    [
      "---",
      `name: ${name}`,
      "description: GraphQL e2e fixture agent",
      "role: assistant",
      "---",
      "",
      "Support team-definition GraphQL validation.",
    ].join("\n"),
    "utf-8",
  );
  await fs.writeFile(
    path.join(agentDir, "agent-config.json"),
    JSON.stringify({ toolNames: [], skillNames: [] }, null, 2),
    "utf-8",
  );
  return agentDir;
}

async function writeRootTeamFixture(input: {
  dataDir: string;
  teamId: string;
  name: string;
  description?: string;
  instructions?: string;
  coordinatorMemberName?: string;
  members?: Array<{
    memberName: string;
    ref: string;
    refType: "agent" | "agent_team";
    refScope: "shared" | "team_local" | "application_owned";
  }>;
}) {
  const teamDir = path.join(input.dataDir, "agent-teams", input.teamId);
  await fs.mkdir(teamDir, { recursive: true });
  await fs.writeFile(
    path.join(teamDir, "team.md"),
    [
      "---",
      `name: ${input.name}`,
      `description: ${input.description ?? "GraphQL e2e fixture team"}`,
      "---",
      "",
      input.instructions ?? "Coordinate fixture work.",
    ].join("\n"),
    "utf-8",
  );
  await fs.writeFile(
    path.join(teamDir, "team-config.json"),
    JSON.stringify(
      {
        coordinatorMemberName: input.coordinatorMemberName ?? "",
        members: input.members ?? [],
        avatarUrl: null,
      },
      null,
      2,
    ),
    "utf-8",
  );
  return teamDir;
}

async function writeLocalAgentFixture(input: {
  ownerTeamDir: string;
  agentId: string;
  name: string;
}) {
  const agentDir = path.join(input.ownerTeamDir, "agents", input.agentId);
  await fs.mkdir(agentDir, { recursive: true });
  await fs.writeFile(
    path.join(agentDir, "agent.md"),
    [
      "---",
      `name: ${input.name}`,
      "description: Local fixture agent",
      "role: assistant",
      "---",
      "",
      "Handle local fixture work.",
    ].join("\n"),
    "utf-8",
  );
  await fs.writeFile(
    path.join(agentDir, "agent-config.json"),
    JSON.stringify({ toolNames: [], skillNames: [] }, null, 2),
    "utf-8",
  );
  return agentDir;
}

describe("Agent team definitions GraphQL e2e", () => {
  let schema: GraphQLSchema;
  let graphql: typeof graphqlFn;
  const cleanupPaths = new Set<string>();
  const emptyApplicationBundleProvider = {
    listBundles: async () => [],
    validatePackageRoot: async () => undefined,
    buildApplicationOwnedAgentSources: () => [],
    buildApplicationOwnedTeamSources: () => [],
  };

  beforeAll(async () => {
    ApplicationBundleService.resetInstance();
    ApplicationBundleService.getInstance({
      provider: emptyApplicationBundleProvider,
      builtInMaterializer: {
        ensureMaterialized: async () => undefined,
        getBundledSourceRootPath: () => appConfigProvider.config.getAppRootDir(),
      },
    });
    (AgentDefinitionService as unknown as { instance: AgentDefinitionService | null }).instance = null;
    (AgentTeamDefinitionService as unknown as { instance: AgentTeamDefinitionService | null }).instance = null;
    schema = await buildGraphqlSchema();
    const require = createRequire(import.meta.url);
    const typeGraphqlRoot = path.dirname(require.resolve("type-graphql"));
    const graphqlPath = require.resolve("graphql", { paths: [typeGraphqlRoot] });
    const graphqlModule = await import(graphqlPath);
    graphql = graphqlModule.graphql as typeof graphqlFn;
  });

  afterEach(async () => {
    for (const filePath of cleanupPaths) {
      await fs.rm(filePath, { recursive: true, force: true }).catch(() => undefined);
    }
    cleanupPaths.clear();
    ApplicationBundleService.resetInstance();
    ApplicationBundleService.getInstance({
      provider: emptyApplicationBundleProvider,
      builtInMaterializer: {
        ensureMaterialized: async () => undefined,
        getBundledSourceRootPath: () => appConfigProvider.config.getAppRootDir(),
      },
    });
    (AgentDefinitionService as unknown as { instance: AgentDefinitionService | null }).instance = null;
    (AgentTeamDefinitionService as unknown as { instance: AgentTeamDefinitionService | null }).instance = null;
  });

  const execGraphql = async <T>(
    query: string,
    variables?: Record<string, unknown>,
  ): Promise<T> => {
    const result = await graphql({
      schema,
      source: query,
      variableValues: variables,
    });
    if (result.errors?.length) {
      throw result.errors[0];
    }
    return result.data as T;
  };

  const runGraphql = async (query: string, variables?: Record<string, unknown>) =>
    graphql({
      schema,
      source: query,
      variableValues: variables,
    });

  it("creates, updates, lists templates, and deletes agent team definitions", async () => {
    const unique = uniqueId("team_def");
    const dataDir = appConfigProvider.config.getAppDataDir();
    const initialAgentId = `agent_a_${unique}`;
    const updatedAgentId = `agent_b_${unique}`;
    const initialNestedTeamId = `nested_team_a_${unique}`;
    const updatedNestedTeamId = `nested_team_b_${unique}`;

    for (const supportPath of [
      await writeSharedAgentFixture(dataDir, initialAgentId, `Agent A ${unique}`),
      await writeSharedAgentFixture(dataDir, updatedAgentId, `Agent B ${unique}`),
      await writeRootTeamFixture({
        dataDir,
        teamId: initialNestedTeamId,
        name: `Nested Team A ${unique}`,
      }),
      await writeRootTeamFixture({
        dataDir,
        teamId: updatedNestedTeamId,
        name: `Nested Team B ${unique}`,
      }),
    ]) {
      cleanupPaths.add(supportPath);
    }

    const createMutation = `
      mutation CreateTeam($input: CreateAgentTeamDefinitionInput!) {
        createAgentTeamDefinition(input: $input) {
          id
          name
          description
          category
          instructions
          avatarUrl
          coordinatorMemberName
          defaultLaunchConfig {
            llmModelIdentifier
            runtimeKind
            llmConfig
          }
          nodes {
            memberName
            ref
            refType
            refScope
          }
        }
      }
    `;

    const created = await execGraphql<{
      createAgentTeamDefinition: {
        id: string;
        name: string;
        description: string;
        category: string | null;
        instructions: string;
        avatarUrl: string | null;
        coordinatorMemberName: string;
        defaultLaunchConfig: {
          llmModelIdentifier: string | null;
          runtimeKind: string | null;
          llmConfig: Record<string, unknown> | null;
        } | null;
        nodes: Array<{
          memberName: string;
          ref: string;
          refType: "AGENT" | "AGENT_TEAM";
          refScope?: "SHARED" | "TEAM_LOCAL" | null;
        }>;
      };
    }>(createMutation, {
      input: {
        name: `team_${unique}`,
        description: "Team definition for e2e",
        category: "software-engineering",
        instructions: "You coordinate the md-centric team.",
        avatarUrl: "http://localhost:8000/rest/files/images/e2e-team-avatar.png",
        coordinatorMemberName: "leader",
        defaultLaunchConfig: {
          runtimeKind: "autobyteus",
          llmModelIdentifier: "gpt-5.4-mini",
          llmConfig: {
            reasoning_effort: "medium",
          },
        },
        nodes: [
          {
            memberName: "leader",
            ref: initialAgentId,
            refType: "AGENT",
            refScope: "SHARED",
          },
          {
            memberName: "helper",
            ref: initialNestedTeamId,
            refType: "AGENT_TEAM",
            refScope: "SHARED",
          },
        ],
      },
    });

    cleanupPaths.add(path.join(dataDir, "agent-teams", created.createAgentTeamDefinition.id));

    expect(created.createAgentTeamDefinition.category).toBe("software-engineering");
    expect(created.createAgentTeamDefinition.instructions).toContain("md-centric team");
    expect(created.createAgentTeamDefinition.defaultLaunchConfig).toEqual({
      runtimeKind: "autobyteus",
      llmModelIdentifier: "gpt-5.4-mini",
      llmConfig: {
        reasoning_effort: "medium",
      },
    });
    expect(created.createAgentTeamDefinition.nodes).toHaveLength(2);
    expect(created.createAgentTeamDefinition.nodes[0]?.ref).toBe(initialAgentId);

    const teamDir = path.join(dataDir, "agent-teams", created.createAgentTeamDefinition.id);
    const [teamMdRaw, teamConfigRaw] = await Promise.all([
      fs.readFile(path.join(teamDir, "team.md"), "utf-8"),
      fs.readFile(path.join(teamDir, "team-config.json"), "utf-8"),
    ]);

    expect(teamMdRaw).toContain(`name: team_${unique}`);
    expect(teamMdRaw).toContain("category: software-engineering");
    expect(teamMdRaw).toContain("You coordinate the md-centric team.");
    expect(JSON.parse(teamConfigRaw)).toMatchObject({
      coordinatorMemberName: "leader",
      defaultLaunchConfig: {
        runtimeKind: "autobyteus",
        llmModelIdentifier: "gpt-5.4-mini",
        llmConfig: {
          reasoning_effort: "medium",
        },
      },
      members: [
        { memberName: "leader", ref: initialAgentId, refType: "agent", refScope: "shared" },
        { memberName: "helper", ref: initialNestedTeamId, refType: "agent_team", refScope: "shared" },
      ],
    });

    const updateMutation = `
      mutation UpdateTeam($input: UpdateAgentTeamDefinitionInput!) {
        updateAgentTeamDefinition(input: $input) {
          id
          description
          category
          instructions
          avatarUrl
          coordinatorMemberName
          defaultLaunchConfig {
            llmModelIdentifier
            runtimeKind
            llmConfig
          }
          nodes {
            memberName
            ref
            refType
            refScope
          }
        }
      }
    `;
    const updated = await execGraphql<{
      updateAgentTeamDefinition: {
        id: string;
        description: string;
        category: string | null;
        instructions: string;
        avatarUrl: string | null;
        coordinatorMemberName: string;
        defaultLaunchConfig: {
          llmModelIdentifier: string | null;
          runtimeKind: string | null;
          llmConfig: Record<string, unknown> | null;
        } | null;
        nodes: Array<{
          memberName: string;
          ref: string;
          refType: "AGENT" | "AGENT_TEAM";
          refScope?: "SHARED" | "TEAM_LOCAL" | null;
        }>;
      };
    }>(updateMutation, {
      input: {
        id: created.createAgentTeamDefinition.id,
        description: "Updated team description",
        category: "platform",
        instructions: "You coordinate the updated md-centric team.",
        avatarUrl: "",
        coordinatorMemberName: "helper",
        defaultLaunchConfig: {
          runtimeKind: "codex",
          llmModelIdentifier: "gpt-5.4",
          llmConfig: {
            reasoning_effort: "high",
          },
        },
        nodes: [
          {
            memberName: "helper",
            ref: updatedAgentId,
            refType: "AGENT",
            refScope: "SHARED",
          },
          {
            memberName: "subteam",
            ref: updatedNestedTeamId,
            refType: "AGENT_TEAM",
            refScope: "SHARED",
          },
        ],
      },
    });

    expect(updated.updateAgentTeamDefinition.description).toBe("Updated team description");
    expect(updated.updateAgentTeamDefinition.category).toBe("platform");
    expect(updated.updateAgentTeamDefinition.avatarUrl).toBeNull();
    expect(updated.updateAgentTeamDefinition.coordinatorMemberName).toBe("helper");
    expect(updated.updateAgentTeamDefinition.defaultLaunchConfig).toEqual({
      runtimeKind: "codex",
      llmModelIdentifier: "gpt-5.4",
      llmConfig: {
        reasoning_effort: "high",
      },
    });
    expect(updated.updateAgentTeamDefinition.nodes[1]?.refType).toBe("AGENT_TEAM");

    const updatedConfigAfterWrite = JSON.parse(
      await fs.readFile(path.join(teamDir, "team-config.json"), "utf-8"),
    ) as {
      coordinatorMemberName: string;
      defaultLaunchConfig: Record<string, unknown> | null;
      members: Array<{
        memberName: string;
        ref: string;
        refType: "agent" | "agent_team";
        refScope?: "shared" | "team_local";
      }>;
    };

    expect(updatedConfigAfterWrite.defaultLaunchConfig).toEqual({
      runtimeKind: "codex",
      llmModelIdentifier: "gpt-5.4",
      llmConfig: {
        reasoning_effort: "high",
      },
    });

    const preserved = await execGraphql<{
      updateAgentTeamDefinition: {
        id: string;
        description: string;
        defaultLaunchConfig: {
          llmModelIdentifier: string | null;
          runtimeKind: string | null;
          llmConfig: Record<string, unknown> | null;
        } | null;
      };
    }>(updateMutation, {
      input: {
        id: created.createAgentTeamDefinition.id,
        description: "Updated without clearing launch defaults",
      },
    });

    expect(preserved.updateAgentTeamDefinition.description).toBe(
      "Updated without clearing launch defaults",
    );
    expect(preserved.updateAgentTeamDefinition.defaultLaunchConfig).toEqual({
      runtimeKind: "codex",
      llmModelIdentifier: "gpt-5.4",
      llmConfig: {
        reasoning_effort: "high",
      },
    });
    const preservedConfigAfterWrite = JSON.parse(
      await fs.readFile(path.join(teamDir, "team-config.json"), "utf-8"),
    ) as {
      defaultLaunchConfig?: Record<string, unknown> | null;
    };
    expect(preservedConfigAfterWrite.defaultLaunchConfig).toEqual({
      runtimeKind: "codex",
      llmModelIdentifier: "gpt-5.4",
      llmConfig: {
        reasoning_effort: "high",
      },
    });

    const cleared = await execGraphql<{
      updateAgentTeamDefinition: {
        id: string;
        defaultLaunchConfig: {
          llmModelIdentifier: string | null;
          runtimeKind: string | null;
          llmConfig: Record<string, unknown> | null;
        } | null;
      };
    }>(updateMutation, {
      input: {
        id: created.createAgentTeamDefinition.id,
        defaultLaunchConfig: null,
      },
    });

    expect(cleared.updateAgentTeamDefinition.defaultLaunchConfig).toBeNull();
    const clearedConfigAfterWrite = JSON.parse(
      await fs.readFile(path.join(teamDir, "team-config.json"), "utf-8"),
    ) as {
      defaultLaunchConfig?: Record<string, unknown> | null;
    };
    expect(clearedConfigAfterWrite.defaultLaunchConfig).toBeNull();

    const templateId = `_template_${unique}`;
    const templateDir = path.join(dataDir, "agent-teams", templateId);
    cleanupPaths.add(templateDir);
    await fs.mkdir(templateDir, { recursive: true });
    await fs.writeFile(
      path.join(templateDir, "team.md"),
      [
        "---",
        "name: Template Team",
        "description: Template team description",
        "category: template",
        "---",
        "",
        "Template team instructions",
      ].join("\n"),
      "utf-8",
    );
    await fs.writeFile(
      path.join(templateDir, "team-config.json"),
      JSON.stringify(
        {
          coordinatorMemberName: "lead",
          members: [
            { memberName: "lead", ref: "template-agent", refType: "agent", refScope: "shared" },
          ],
          avatarUrl: null,
        },
        null,
        2,
      ),
      "utf-8",
    );

    const listQuery = `
      query TeamLists {
        agentTeamDefinitions {
          id
        }
        agentTeamTemplates {
          id
          name
          description
          category
          instructions
        }
      }
    `;

    const listed = await execGraphql<{
      agentTeamDefinitions: Array<{ id: string }>;
      agentTeamTemplates: Array<{
        id: string;
        name: string;
        description: string;
        category: string | null;
        instructions: string;
      }>;
    }>(listQuery);

    expect(listed.agentTeamDefinitions.some((entry) => entry.id === templateId)).toBe(false);
    const template = listed.agentTeamTemplates.find((entry) => entry.id === templateId);
    expect(template).toBeDefined();
    expect(template?.name).toBe("Template Team");
    expect(template?.category).toBe("template");
    expect(template?.instructions).toBe("Template team instructions");

    const deleteMutation = `
      mutation DeleteTeam($id: String!) {
        deleteAgentTeamDefinition(id: $id) {
          success
          message
        }
      }
    `;
    const deleted = await execGraphql<{ deleteAgentTeamDefinition: { success: boolean } }>(
      deleteMutation,
      { id: created.createAgentTeamDefinition.id },
    );
    expect(deleted.deleteAgentTeamDefinition.success).toBe(true);

    const query = `
      query GetTeam($id: String!) {
        agentTeamDefinition(id: $id) {
          id
        }
      }
    `;
    const afterDelete = await execGraphql<{
      agentTeamDefinition: { id: string } | null;
    }>(query, { id: created.createAgentTeamDefinition.id });
    expect(afterDelete.agentTeamDefinition).toBeNull();
  });

  it("round-trips TEAM_LOCAL members from file-authored teams through read and update GraphQL flows", async () => {
    const unique = uniqueId("team_local_graphql");
    const dataDir = appConfigProvider.config.getAppDataDir();
    const teamId = `team_local_${unique}`;
    const teamDir = await writeRootTeamFixture({
      dataDir,
      teamId,
      name: `Team Local ${unique}`,
      description: "team-local persistence",
      instructions: "Use the team-local reviewer when coordinating work.",
      coordinatorMemberName: "local_reviewer",
      members: [
        {
          memberName: "local_reviewer",
          ref: "reviewer",
          refType: "agent",
          refScope: "team_local",
        },
      ],
    });
    cleanupPaths.add(teamDir);
    await writeLocalAgentFixture({
      ownerTeamDir: teamDir,
      agentId: "reviewer",
      name: `Local Reviewer ${unique}`,
    });
    await writeLocalAgentFixture({
      ownerTeamDir: teamDir,
      agentId: "reviewer_v2",
      name: `Local Reviewer V2 ${unique}`,
    });
    const sharedLeadAgentId = `shared_lead_${unique}`;
    cleanupPaths.add(await writeSharedAgentFixture(dataDir, sharedLeadAgentId, `Shared Lead ${unique}`));

    const createdConfig = JSON.parse(
      await fs.readFile(path.join(teamDir, "team-config.json"), "utf-8"),
    ) as {
      coordinatorMemberName: string;
      members: Array<{
        memberName: string;
        ref: string;
        refType: "agent" | "agent_team";
        refScope?: "shared" | "team_local";
      }>;
    };

    expect(createdConfig).toMatchObject({
      coordinatorMemberName: "local_reviewer",
      members: [
        {
          memberName: "local_reviewer",
          ref: "reviewer",
          refType: "agent",
          refScope: "team_local",
        },
      ],
    });

    const getQuery = `
      query TeamById($id: String!) {
        agentTeamDefinition(id: $id) {
          id
          coordinatorMemberName
          nodes {
            memberName
            ref
            refType
            refScope
          }
        }
      }
    `;

    const fetched = await execGraphql<{
      agentTeamDefinition: {
        id: string;
        coordinatorMemberName: string;
        nodes: Array<{
          memberName: string;
          ref: string;
          refType: "AGENT" | "AGENT_TEAM";
          refScope?: "SHARED" | "TEAM_LOCAL" | null;
        }>;
      } | null;
    }>(getQuery, { id: teamId });

    expect(fetched.agentTeamDefinition?.nodes).toEqual([
      {
        memberName: "local_reviewer",
        ref: "reviewer",
        refType: "AGENT",
        refScope: "TEAM_LOCAL",
      },
    ]);

    const updateMutation = `
      mutation UpdateTeam($input: UpdateAgentTeamDefinitionInput!) {
        updateAgentTeamDefinition(input: $input) {
          id
          coordinatorMemberName
          nodes {
            memberName
            ref
            refType
            refScope
          }
        }
      }
    `;

    const updated = await execGraphql<{
      updateAgentTeamDefinition: {
        id: string;
        coordinatorMemberName: string;
        nodes: Array<{
          memberName: string;
          ref: string;
          refType: "AGENT" | "AGENT_TEAM";
          refScope?: "SHARED" | "TEAM_LOCAL" | null;
        }>;
      };
    }>(updateMutation, {
      input: {
        id: teamId,
        coordinatorMemberName: "shared_lead",
        nodes: [
          {
            memberName: "shared_lead",
            ref: sharedLeadAgentId,
            refType: "AGENT",
            refScope: "SHARED",
          },
          {
            memberName: "local_reviewer",
            ref: "reviewer_v2",
            refType: "AGENT",
            refScope: "TEAM_LOCAL",
          },
        ],
      },
    });

    expect(updated.updateAgentTeamDefinition.coordinatorMemberName).toBe("shared_lead");
    expect(updated.updateAgentTeamDefinition.nodes).toEqual([
      {
        memberName: "shared_lead",
        ref: sharedLeadAgentId,
        refType: "AGENT",
        refScope: "SHARED",
      },
      {
        memberName: "local_reviewer",
        ref: "reviewer_v2",
        refType: "AGENT",
        refScope: "TEAM_LOCAL",
      },
    ]);

    const updatedConfig = JSON.parse(
      await fs.readFile(path.join(teamDir, "team-config.json"), "utf-8"),
    ) as {
      coordinatorMemberName: string;
      members: Array<{
        memberName: string;
        ref: string;
        refType: "agent" | "agent_team";
        refScope?: "shared" | "team_local";
      }>;
    };

    expect(updatedConfig).toMatchObject({
      coordinatorMemberName: "shared_lead",
      members: [
        {
          memberName: "shared_lead",
          ref: sharedLeadAgentId,
          refType: "agent",
          refScope: "shared",
        },
        {
          memberName: "local_reviewer",
          ref: "reviewer_v2",
          refType: "agent",
          refScope: "team_local",
        },
      ],
    });
  });

  it("exposes team-local subteams in GraphQL with ownership metadata and local member scopes", async () => {
    const unique = uniqueId("team_local_subteam_graphql");
    const dataDir = appConfigProvider.config.getAppDataDir();
    const parentTeamId = `company_${unique}`;
    const localTeamId = `department_${unique}`;
    const canonicalLocalTeamId = buildTeamLocalTeamDefinitionId(parentTeamId, localTeamId);

    const parentTeamDir = await writeRootTeamFixture({
      dataDir,
      teamId: parentTeamId,
      name: `Company ${unique}`,
      description: "Company root team",
      instructions: "Coordinate company work.",
      coordinatorMemberName: "department",
      members: [
        {
          memberName: "department",
          ref: localTeamId,
          refType: "agent_team",
          refScope: "team_local",
        },
      ],
    });
    cleanupPaths.add(parentTeamDir);

    const localTeamDir = path.join(parentTeamDir, "agent-teams", localTeamId);
    await fs.mkdir(localTeamDir, { recursive: true });
    await fs.writeFile(
      path.join(localTeamDir, "team.md"),
      [
        "---",
        `name: Department ${unique}`,
        "description: Local department team",
        "---",
        "",
        "Coordinate department work.",
      ].join("\n"),
      "utf-8",
    );
    await fs.writeFile(
      path.join(localTeamDir, "team-config.json"),
      JSON.stringify(
        {
          coordinatorMemberName: "planner",
          members: [
            {
              memberName: "planner",
              ref: "planner",
              refType: "agent",
              refScope: "team_local",
            },
          ],
          avatarUrl: null,
        },
        null,
        2,
      ),
      "utf-8",
    );
    await writeLocalAgentFixture({
      ownerTeamDir: localTeamDir,
      agentId: "planner",
      name: `Department Planner ${unique}`,
    });

    const result = await execGraphql<{
      agentTeamDefinitions: Array<{
        id: string;
        name: string;
        ownershipScope: "SHARED" | "TEAM_LOCAL" | "APPLICATION_OWNED";
        ownerTeamId: string | null;
        ownerTeamName: string | null;
        nodes: Array<{
          memberName: string;
          ref: string;
          refType: "AGENT" | "AGENT_TEAM";
          refScope: "SHARED" | "TEAM_LOCAL" | "APPLICATION_OWNED" | null;
        }>;
      }>;
      agentTeamDefinition: {
        id: string;
        ownershipScope: "SHARED" | "TEAM_LOCAL" | "APPLICATION_OWNED";
        ownerTeamId: string | null;
        ownerTeamName: string | null;
        nodes: Array<{
          memberName: string;
          ref: string;
          refType: "AGENT" | "AGENT_TEAM";
          refScope: "SHARED" | "TEAM_LOCAL" | "APPLICATION_OWNED" | null;
        }>;
      } | null;
    }>(`
      query TeamLocalSubteams($id: String!) {
        agentTeamDefinitions {
          id
          name
          ownershipScope
          ownerTeamId
          ownerTeamName
          nodes {
            memberName
            ref
            refType
            refScope
          }
        }
        agentTeamDefinition(id: $id) {
          id
          ownershipScope
          ownerTeamId
          ownerTeamName
          nodes {
            memberName
            ref
            refType
            refScope
          }
        }
      }
    `, { id: canonicalLocalTeamId });

    const parent = result.agentTeamDefinitions.find((team) => team.id === parentTeamId);
    const local = result.agentTeamDefinitions.find((team) => team.id === canonicalLocalTeamId);

    expect(parent).toMatchObject({
      id: parentTeamId,
      ownershipScope: "SHARED",
      ownerTeamId: null,
      nodes: [
        {
          memberName: "department",
          ref: localTeamId,
          refType: "AGENT_TEAM",
          refScope: "TEAM_LOCAL",
        },
      ],
    });
    expect(local).toMatchObject({
      id: canonicalLocalTeamId,
      ownershipScope: "TEAM_LOCAL",
      ownerTeamId: parentTeamId,
      ownerTeamName: `Company ${unique}`,
      nodes: [
        {
          memberName: "planner",
          ref: "planner",
          refType: "AGENT",
          refScope: "TEAM_LOCAL",
        },
      ],
    });
    expect(result.agentTeamDefinition).toMatchObject({
      id: canonicalLocalTeamId,
      ownershipScope: "TEAM_LOCAL",
      ownerTeamId: parentTeamId,
      ownerTeamName: `Company ${unique}`,
    });
  });

  it("exposes company-level team-local departments and their local agents without promoting departments to root catalog entries", async () => {
    const unique = uniqueId("company_local_departments_graphql");
    const dataDir = appConfigProvider.config.getAppDataDir();
    const parentTeamId = `northstar_${unique}`;
    const parentTeamName = `Northstar Operating Company ${unique}`;
    const departments = [
      {
        localId: "engineering-org",
        memberName: "engineering_org",
        name: `Northstar Engineering Org ${unique}`,
        coordinator: "vp_engineering",
        agents: [
          { memberName: "vp_engineering", localId: "vp-engineering" },
          { memberName: "platform_engineering_manager", localId: "platform-engineering-manager" },
        ],
      },
      {
        localId: "product-org",
        memberName: "product_org",
        name: `Northstar Product Org ${unique}`,
        coordinator: "vp_product",
        agents: [
          { memberName: "vp_product", localId: "vp-product" },
          { memberName: "ux_research_lead", localId: "ux-research-lead" },
        ],
      },
      {
        localId: "revenue-org",
        memberName: "revenue_org",
        name: `Northstar Revenue Org ${unique}`,
        coordinator: "vp_sales",
        agents: [
          { memberName: "vp_sales", localId: "vp-sales" },
          { memberName: "customer_success_lead", localId: "customer-success-lead" },
        ],
      },
      {
        localId: "operations-org",
        memberName: "operations_org",
        name: `Northstar Operations Org ${unique}`,
        coordinator: "vp_operations",
        agents: [
          { memberName: "vp_operations", localId: "vp-operations" },
          { memberName: "data_analytics_lead", localId: "data-analytics-lead" },
        ],
      },
      {
        localId: "finance-people-org",
        memberName: "finance_people_org",
        name: `Northstar Finance People Org ${unique}`,
        coordinator: "vp_finance",
        agents: [
          { memberName: "vp_finance", localId: "vp-finance" },
          { memberName: "people_ops_lead", localId: "people-ops-lead" },
        ],
      },
    ];

    const parentTeamDir = await writeRootTeamFixture({
      dataDir,
      teamId: parentTeamId,
      name: parentTeamName,
      description: "Company root with local department teams",
      instructions: "Coordinate company work across local departments.",
      coordinatorMemberName: "ceo",
      members: [
        {
          memberName: "ceo",
          ref: "ceo",
          refType: "agent",
          refScope: "team_local",
        },
        ...departments.map((department) => ({
          memberName: department.memberName,
          ref: department.localId,
          refType: "agent_team" as const,
          refScope: "team_local" as const,
        })),
      ],
    });
    cleanupPaths.add(parentTeamDir);

    await writeLocalAgentFixture({
      ownerTeamDir: parentTeamDir,
      agentId: "ceo",
      name: `Northstar CEO ${unique}`,
    });

    for (const department of departments) {
      const localTeamDir = path.join(parentTeamDir, "agent-teams", department.localId);
      await fs.mkdir(localTeamDir, { recursive: true });
      await fs.writeFile(
        path.join(localTeamDir, "team.md"),
        [
          "---",
          `name: ${department.name}`,
          "description: Local company department team",
          "---",
          "",
          "Coordinate department work.",
        ].join("\n"),
        "utf-8",
      );
      await fs.writeFile(
        path.join(localTeamDir, "team-config.json"),
        JSON.stringify(
          {
            coordinatorMemberName: department.coordinator,
            members: department.agents.map((agent) => ({
              memberName: agent.memberName,
              ref: agent.localId,
              refType: "agent",
              refScope: "team_local",
            })),
            avatarUrl: null,
          },
          null,
          2,
        ),
        "utf-8",
      );

      for (const agent of department.agents) {
        await writeLocalAgentFixture({
          ownerTeamDir: localTeamDir,
          agentId: agent.localId,
          name: `${department.name} ${agent.memberName}`,
        });
      }
    }

    const result = await execGraphql<{
      agentTeamDefinitions: Array<{
        id: string;
        name: string;
        ownershipScope: "SHARED" | "TEAM_LOCAL" | "APPLICATION_OWNED";
        ownerTeamId: string | null;
        ownerTeamName: string | null;
        nodes: Array<{
          memberName: string;
          ref: string;
          refType: "AGENT" | "AGENT_TEAM";
          refScope: "SHARED" | "TEAM_LOCAL" | "APPLICATION_OWNED" | null;
        }>;
      }>;
      agentDefinitions: Array<{
        id: string;
        name: string;
        ownershipScope: "SHARED" | "TEAM_LOCAL";
        ownerTeamId: string | null;
        ownerTeamName: string | null;
      }>;
    }>(`
      query CompanyLocalDepartmentDefinitions {
        agentTeamDefinitions {
          id
          name
          ownershipScope
          ownerTeamId
          ownerTeamName
          nodes {
            memberName
            ref
            refType
            refScope
          }
        }
        agentDefinitions {
          id
          name
          ownershipScope
          ownerTeamId
          ownerTeamName
        }
      }
    `);

    const parent = result.agentTeamDefinitions.find((team) => team.id === parentTeamId);
    expect(parent).toMatchObject({
      id: parentTeamId,
      name: parentTeamName,
      ownershipScope: "SHARED",
      ownerTeamId: null,
      ownerTeamName: null,
    });
    expect(parent?.nodes).toEqual([
      {
        memberName: "ceo",
        ref: "ceo",
        refType: "AGENT",
        refScope: "TEAM_LOCAL",
      },
      ...departments.map((department) => ({
        memberName: department.memberName,
        ref: department.localId,
        refType: "AGENT_TEAM" as const,
        refScope: "TEAM_LOCAL" as const,
      })),
    ]);

    const rootCatalogTeamIds = result.agentTeamDefinitions
      .filter((team) => team.ownershipScope !== "TEAM_LOCAL")
      .map((team) => team.id);
    expect(rootCatalogTeamIds).toContain(parentTeamId);

    const parentLocalCeoId = buildTeamLocalAgentDefinitionId(parentTeamId, "ceo");
    expect(result.agentDefinitions.find((agent) => agent.id === parentLocalCeoId)).toMatchObject({
      id: parentLocalCeoId,
      name: `Northstar CEO ${unique}`,
      ownershipScope: "TEAM_LOCAL",
      ownerTeamId: parentTeamId,
      ownerTeamName: parentTeamName,
    });

    for (const department of departments) {
      const canonicalDepartmentId = buildTeamLocalTeamDefinitionId(
        parentTeamId,
        department.localId,
      );
      const localTeam = result.agentTeamDefinitions.find(
        (team) => team.id === canonicalDepartmentId,
      );

      expect(rootCatalogTeamIds).not.toContain(canonicalDepartmentId);
      expect(result.agentTeamDefinitions.find((team) => team.id === department.localId)).toBeUndefined();
      expect(localTeam).toMatchObject({
        id: canonicalDepartmentId,
        name: department.name,
        ownershipScope: "TEAM_LOCAL",
        ownerTeamId: parentTeamId,
        ownerTeamName: parentTeamName,
      });
      expect(localTeam?.nodes).toEqual(
        department.agents.map((agent) => ({
          memberName: agent.memberName,
          ref: agent.localId,
          refType: "AGENT" as const,
          refScope: "TEAM_LOCAL" as const,
        })),
      );

      for (const agent of department.agents) {
        const canonicalLocalAgentId = buildTeamLocalAgentDefinitionId(
          canonicalDepartmentId,
          agent.localId,
        );
        expect(
          result.agentDefinitions.find((definition) => definition.id === canonicalLocalAgentId),
        ).toMatchObject({
          id: canonicalLocalAgentId,
          name: `${department.name} ${agent.memberName}`,
          ownershipScope: "TEAM_LOCAL",
          ownerTeamId: canonicalDepartmentId,
          ownerTeamName: department.name,
        });
      }
    }
  });

  it("exposes md-centric team GraphQL output contract", async () => {
    const introspection = await execGraphql<{
      teamType: {
        fields: Array<{
          name: string;
          type: {
            kind: string;
            name: string | null;
            ofType?: { kind: string; name: string | null } | null;
          };
        }>;
      } | null;
    }>(`
      query TeamSchemaContract {
        teamType: __type(name: "AgentTeamDefinition") {
          fields {
            name
            type {
              kind
              name
              ofType {
                kind
                name
              }
            }
          }
        }
      }
    `);

    const fields = introspection.teamType?.fields ?? [];
    const instructions = fields.find((field) => field.name === "instructions");
    const category = fields.find((field) => field.name === "category");
    const nodes = fields.find((field) => field.name === "nodes");
    const coordinator = fields.find((field) => field.name === "coordinatorMemberName");
    const role = fields.find((field) => field.name === "role");

    expect(instructions?.type.kind).toBe("NON_NULL");
    expect(instructions?.type.ofType?.name).toBe("String");
    expect(category?.type.kind).toBe("SCALAR");
    expect(category?.type.name).toBe("String");
    expect(nodes?.type.kind).toBe("NON_NULL");
    expect(nodes?.type.ofType?.kind).toBe("LIST");
    expect(coordinator?.type.kind).toBe("NON_NULL");
    expect(coordinator?.type.ofType?.name).toBe("String");

    // REQ-014 permits role removal or optional retention.
    if (role) {
      expect(role.type.kind).not.toBe("NON_NULL");
    }
  });

  it("returns validation error when coordinatorMemberName is not present in nodes", async () => {
    const unique = uniqueId("team_invalid_coordinator");
    const createMutation = `
      mutation CreateTeam($input: CreateAgentTeamDefinitionInput!) {
        createAgentTeamDefinition(input: $input) {
          id
        }
      }
    `;

    const result = await runGraphql(createMutation, {
      input: {
        name: `team_${unique}`,
        description: "invalid coordinator test",
        instructions: "team instructions",
        coordinatorMemberName: "missing_leader",
        nodes: [
          {
            memberName: "helper",
            ref: "agent-1",
            refType: "AGENT",
            refScope: "SHARED",
          },
        ],
      },
    });

    expect(result.errors?.length ?? 0).toBeGreaterThan(0);
    expect(result.errors?.[0]?.message).toContain("Coordinator member name must match");
  });
});
