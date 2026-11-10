import "reflect-metadata";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { AgentDefinition } from "../../../../../src/agent-definition/domain/models.js";
import { AgentDefinitionConverter } from "../../../../../src/api/graphql/converters/agent-definition-converter.js";
import { appConfigProvider } from "../../../../../src/config/app-config-provider.js";

/** DS-003: the GraphQL agent definition shows whether semantic memory is on and, when on, its folder (no folder is created). */
const agent = (id: string, semanticMemoryEnabled: boolean) => new AgentDefinition({
  id, name: "Operator", description: "d", instructions: "i", semanticMemoryEnabled,
});

describe("AgentDefinitionConverter semantic memory fields", () => {
  it("gives the folder of an agent with semantic memory under the server's memory folder", async () => {
    const converted = await AgentDefinitionConverter.toGraphql(agent("team-local-agent:marketing-team:scout", true));
    expect(converted.semanticMemoryEnabled).toBe(true);
    expect(converted.semanticMemoryPath).toBe(
      path.join(path.resolve(appConfigProvider.config.getMemoryDir()), "semantic", "team-local-agent%3Amarketing-team%3Ascout"),
    );
  });

  it("gives no folder when it is off", async () => {
    const converted = await AgentDefinitionConverter.toGraphql(agent("computer-use-operator", false));
    expect(converted).toMatchObject({ semanticMemoryEnabled: false, semanticMemoryPath: null });
  });
});
