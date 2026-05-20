import "reflect-metadata";
import { afterEach, describe, expect, it, vi } from "vitest";
import { buildGraphqlSchema } from "../../../../../src/api/graphql/schema.js";
import { AgentDefinitionResolver } from "../../../../../src/api/graphql/types/agent-definition.js";
import { AgentTeamDefinitionResolver } from "../../../../../src/api/graphql/types/agent-team-definition.js";
import { AgentDefinitionService } from "../../../../../src/agent-definition/services/agent-definition-service.js";
import { AgentTeamDefinitionService } from "../../../../../src/agent-team-definition/services/agent-team-definition-service.js";

describe("definition catalog refresh GraphQL boundary", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("exposes subject-owned catalog refresh mutations and removes node sync fields", async () => {
    const schema = await buildGraphqlSchema();
    const queryFields = schema.getQueryType()?.getFields() ?? {};
    const mutationFields = schema.getMutationType()?.getFields() ?? {};

    expect(mutationFields).toHaveProperty("refreshAgentDefinitionCatalog");
    expect(mutationFields).toHaveProperty("refreshAgentTeamDefinitionCatalog");
    expect(mutationFields).not.toHaveProperty("runNodeSync");
    expect(mutationFields).not.toHaveProperty("importSyncBundle");
    expect(queryFields).not.toHaveProperty("exportSyncBundle");
  });

  it("refreshes the agent definition cache through the agent definition boundary", async () => {
    const refreshCache = vi.fn().mockResolvedValue(undefined);
    vi.spyOn(AgentDefinitionService, "getInstance").mockReturnValue({
      refreshCache,
    } as unknown as AgentDefinitionService);

    const result = await new AgentDefinitionResolver().refreshAgentDefinitionCatalog();

    expect(result).toBe(true);
    expect(refreshCache).toHaveBeenCalledTimes(1);
  });

  it("refreshes agent definitions before team definitions for team catalog refresh", async () => {
    const calls: string[] = [];
    const refreshAgentCache = vi.fn(async () => {
      calls.push("agent");
    });
    const refreshTeamCache = vi.fn(async () => {
      calls.push("team");
    });

    vi.spyOn(AgentDefinitionService, "getInstance").mockReturnValue({
      refreshCache: refreshAgentCache,
    } as unknown as AgentDefinitionService);
    vi.spyOn(AgentTeamDefinitionService, "getInstance").mockReturnValue({
      refreshCache: refreshTeamCache,
    } as unknown as AgentTeamDefinitionService);

    const result = await new AgentTeamDefinitionResolver().refreshAgentTeamDefinitionCatalog();

    expect(result).toBe(true);
    expect(calls).toEqual(["agent", "team"]);
    expect(refreshAgentCache).toHaveBeenCalledTimes(1);
    expect(refreshTeamCache).toHaveBeenCalledTimes(1);
  });
});
