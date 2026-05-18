import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildTeamLocalAgentDefinitionId,
  buildTeamLocalTeamDefinitionId,
} from "autobyteus-ts/agent-team/utils/team-local-definition-id.js";
import { AgentDefinition } from "../../../src/agent-definition/domain/models.js";
import { findAgentSourcePaths } from "../../../src/agent-definition/providers/agent-definition-source-paths.js";
import { listTeamLocalAgentDefinitions } from "../../../src/agent-definition/providers/team-local-agent-discovery.js";

const writeTeam = async (teamDir: string, name: string): Promise<void> => {
  await fs.mkdir(teamDir, { recursive: true });
  await fs.writeFile(
    path.join(teamDir, "team.md"),
    [
      "---",
      `name: ${name}`,
      "description: Test team",
      "---",
      "",
      "Coordinate work.",
    ].join("\n"),
    "utf-8",
  );
  await fs.writeFile(
    path.join(teamDir, "team-config.json"),
    JSON.stringify({ coordinatorMemberName: "", members: [] }, null, 2),
    "utf-8",
  );
};

const writeAgent = async (agentDir: string, name: string): Promise<void> => {
  await fs.mkdir(agentDir, { recursive: true });
  await fs.writeFile(
    path.join(agentDir, "agent.md"),
    [
      "---",
      `name: ${name}`,
      "description: Test agent",
      "---",
      "",
      "Do work.",
    ].join("\n"),
    "utf-8",
  );
  await fs.writeFile(path.join(agentDir, "agent-config.json"), "{}\n", "utf-8");
};

describe("team-local-agent-discovery", () => {
  const cleanupPaths = new Set<string>();

  afterEach(async () => {
    vi.restoreAllMocks();
    for (const targetPath of cleanupPaths) {
      await fs.rm(targetPath, { recursive: true, force: true }).catch(() => undefined);
    }
    cleanupPaths.clear();
  });

  it("resolves and lists local agents owned by team-local subteams", async () => {
    const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "autobyteus-local-agent-"));
    cleanupPaths.add(tempRoot);
    const teamRoot = path.join(tempRoot, "agent-teams");
    const parentTeamDir = path.join(teamRoot, "company");
    const localTeamDir = path.join(parentTeamDir, "agent-teams", "research");
    const localAgentDir = path.join(localTeamDir, "agents", "planner");
    await writeTeam(parentTeamDir, "Company Team");
    await writeTeam(localTeamDir, "Research Team");
    await writeAgent(localAgentDir, "Planner");

    const localTeamId = buildTeamLocalTeamDefinitionId("company", "research");
    const localAgentId = buildTeamLocalAgentDefinitionId(localTeamId, "planner");
    const applicationBundleService = {
      getApplicationOwnedAgentSourceById: vi.fn(async () => null),
      getApplicationOwnedTeamSourceById: vi.fn(async () => null),
    };

    const sourcePaths = await findAgentSourcePaths({
      agentId: localAgentId,
      readAgentRoots: [],
      readTeamRoots: [teamRoot],
      applicationBundleService,
      warn: vi.fn(),
    });

    expect(sourcePaths).toMatchObject({
      mdPath: path.join(localAgentDir, "agent.md"),
      ownershipScope: "team_local",
      ownerTeamId: localTeamId,
      ownerTeamName: "Research Team",
    });

    const listed = await listTeamLocalAgentDefinitions({
      sharedTeamRoots: [teamRoot],
      applicationOwnedTeamSources: [],
      existingDefinitions: [],
      warn: vi.fn(),
      readAgentFromPaths: async (_mdPath, _configPath, resolvedAgentDefinitionId, ownership) =>
        new AgentDefinition({
          id: resolvedAgentDefinitionId,
          name: "Planner",
          description: "Test agent",
          instructions: "Do work.",
          ownershipScope: ownership.ownershipScope,
          ownerTeamId: ownership.ownerTeamId,
          ownerTeamName: ownership.ownerTeamName,
        }),
    });

    expect(listed).toEqual([
      expect.objectContaining({
        id: localAgentId,
        ownershipScope: "team_local",
        ownerTeamId: localTeamId,
        ownerTeamName: "Research Team",
      }),
    ]);
  });
});
