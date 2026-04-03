import { describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { AgentDefinitionService } from "../../../src/agent-definition/services/agent-definition-service.js";
import { appConfigProvider } from "../../../src/config/app-config-provider.js";

describe("AgentDefinitionService integration", () => {
  it("returns created definitions from file persistence", async () => {
    const service = new AgentDefinitionService();

    const createdAgentIds: string[] = [];
    for (let i = 0; i < 3; i += 1) {
      const created = await service.createAgentDefinition({
        name: `File Mapping Agent ${i}-${randomUUID()}`,
        role: "Test",
        description: "Agent definition persistence verification",
        instructions: `Agent instruction ${i}`,
        category: `category-${i}`,
      });
      if (created.id) {
        createdAgentIds.push(created.id);
      }
    }

    const definitions = await service.getAllAgentDefinitions();
    expect(definitions.length).toBeGreaterThanOrEqual(3);

    for (const [index, createdId] of createdAgentIds.entries()) {
      const definition = definitions.find((item) => item.id === createdId) ?? null;
      expect(definition).toBeDefined();
      expect(definition?.instructions).toBe(`Agent instruction ${index}`);
      expect(definition?.category).toBe(`category-${index}`);
    }
  });

  it("keeps shared-only and visible mixed agent lists separate", async () => {
    const service = new AgentDefinitionService();
    const unique = randomUUID();
    const teamId = `team-${unique}`;
    const localAgentId = `local-agent-${unique}`;
    const teamDir = path.join(appConfigProvider.config.getAppDataDir(), "agent-teams", teamId);
    const localAgentDir = path.join(teamDir, "agents", localAgentId);

    await fs.mkdir(localAgentDir, { recursive: true });
    await fs.writeFile(
      path.join(teamDir, "team.md"),
      [
        "---",
        `name: Team ${unique}`,
        "description: Mixed list ownership test",
        "---",
        "",
        "Coordinate the local team agent.",
      ].join("\n"),
      "utf-8",
    );
    await fs.writeFile(
      path.join(localAgentDir, "agent.md"),
      [
        "---",
        `name: Local Agent ${unique}`,
        "description: Local ownership test",
        "---",
        "",
        "Local agent instructions",
      ].join("\n"),
      "utf-8",
    );
    await fs.writeFile(
      path.join(localAgentDir, "agent-config.json"),
      JSON.stringify({ toolNames: [], skillNames: [] }, null, 2),
      "utf-8",
    );

    try {
      await service.refreshCache();

      const sharedOnly = await service.getAllAgentDefinitions();
      const visible = await service.getVisibleAgentDefinitions();
      const localDefinitionId = `team-local:${teamId}:${localAgentId}`;

      expect(sharedOnly.some((definition) => definition.id === localDefinitionId)).toBe(false);

      const localDefinition = visible.find((definition) => definition.id === localDefinitionId);
      expect(localDefinition).toBeDefined();
      expect(localDefinition?.ownershipScope).toBe("team_local");
      expect(localDefinition?.ownerTeamId).toBe(teamId);
      expect(localDefinition?.ownerTeamName).toBe(`Team ${unique}`);
    } finally {
      await fs.rm(teamDir, { recursive: true, force: true });
      await service.refreshCache();
    }
  });
});
