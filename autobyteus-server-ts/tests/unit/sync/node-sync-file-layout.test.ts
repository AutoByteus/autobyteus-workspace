import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildTeamLocalAgentDefinitionId,
  buildTeamLocalTeamDefinitionId,
} from "autobyteus-ts/agent-team/utils/team-local-definition-id.js";
import { appConfigProvider } from "../../../src/config/app-config-provider.js";
import {
  readAgentDefinitionPayload,
  readAgentTeamDefinitionPayload,
  writeAgentTeamDefinitionPayload,
} from "../../../src/sync/services/node-sync-file-layout.js";

describe("node-sync-file-layout", () => {
  const cleanupPaths = new Set<string>();

  afterEach(async () => {
    vi.restoreAllMocks();
    for (const targetPath of cleanupPaths) {
      await fs.rm(targetPath, { recursive: true, force: true }).catch(() => undefined);
    }
    cleanupPaths.clear();
  });

  it("writes and reads nested team-local team and agent payloads under their owning team", async () => {
    const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), "autobyteus-sync-layout-"));
    cleanupPaths.add(dataDir);
    vi.spyOn(appConfigProvider.config, "getAppDataDir").mockReturnValue(dataDir);

    const localTeamId = buildTeamLocalTeamDefinitionId("company", "research");
    const localAgentId = buildTeamLocalAgentDefinitionId(localTeamId, "planner");
    await writeAgentTeamDefinitionPayload({
      teamId: "company",
      files: {
        teamMd: "---\nname: Company\n---\n\nRoot team\n",
        teamConfigJson: "{}\n",
      },
      localAgents: [],
    });
    await writeAgentTeamDefinitionPayload({
      teamId: localTeamId,
      files: {
        teamMd: "---\nname: Research\n---\n\nLocal team\n",
        teamConfigJson: "{}\n",
      },
      localAgents: [
        {
          agentId: "planner",
          files: {
            agentMd: "---\nname: Planner\n---\n\nPlan work\n",
            agentConfigJson: "{\"toolNames\":[]}\n",
          },
        },
      ],
    });

    const localTeamDir = path.join(dataDir, "agent-teams", "company", "agent-teams", "research");
    expect(await fs.readFile(path.join(localTeamDir, "team.md"), "utf-8")).toContain("name: Research");
    expect(await fs.readFile(path.join(localTeamDir, "agents", "planner", "agent.md"), "utf-8")).toContain(
      "name: Planner",
    );

    await expect(readAgentTeamDefinitionPayload(localTeamId)).resolves.toMatchObject({
      teamId: localTeamId,
      files: {
        teamMd: expect.stringContaining("name: Research"),
      },
      localAgents: [
        {
          agentId: "planner",
          files: {
            agentMd: expect.stringContaining("name: Planner"),
          },
        },
      ],
    });
    await expect(readAgentDefinitionPayload(localAgentId)).resolves.toMatchObject({
      agentId: localAgentId,
      files: {
        agentMd: expect.stringContaining("name: Planner"),
      },
    });
  });
});
