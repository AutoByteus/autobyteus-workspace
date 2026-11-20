import "reflect-metadata";
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { AgentDefinition } from "../../../../../src/agent-definition/domain/models.js";
import { AgentDefinitionConverter } from "../../../../../src/api/graphql/converters/agent-definition-converter.js";
import { appConfigProvider } from "../../../../../src/config/app-config-provider.js";

/** The GraphQL agent definition gives every agent's semantic memory folder (autobyteus-554 REQ-004); no folder is created. */
const agent = (id: string) => new AgentDefinition({ id, name: "Operator", description: "d", instructions: "i" });

describe("AgentDefinitionConverter semanticMemoryPath", () => {
  it("gives every agent its folder under the server's memory folder, without creating it", async () => {
    const converted = await AgentDefinitionConverter.toGraphql(agent("team-local-agent:marketing-team:scout"));
    const expected = path.join(path.resolve(appConfigProvider.config.getMemoryDir()), "semantic", "team-local-agent%3Amarketing-team%3Ascout");
    expect(converted.semanticMemoryPath).toBe(expected);
    expect(converted).not.toHaveProperty("semanticMemoryEnabled");
    expect(fs.existsSync(expected)).toBe(false);
  });
});
