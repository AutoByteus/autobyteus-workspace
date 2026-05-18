import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { buildTeamLocalTeamDefinitionId } from "autobyteus-ts/agent-team/utils/team-local-definition-id.js";
import { listAllTeamSourcePaths } from "../../../src/agent-team-definition/providers/team-local-team-discovery.js";
import {
  findTeamSourcePaths,
  getCanonicalTeamDefinitionIdFromSourcePaths,
} from "../../../src/agent-team-definition/providers/team-definition-source-paths.js";

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

describe("team-local-team-discovery", () => {
  const cleanupPaths = new Set<string>();

  afterEach(async () => {
    for (const targetPath of cleanupPaths) {
      await fs.rm(targetPath, { recursive: true, force: true }).catch(() => undefined);
    }
    cleanupPaths.clear();
  });

  it("discovers and resolves recursively nested team-local subteams", async () => {
    const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "autobyteus-local-team-"));
    cleanupPaths.add(tempRoot);
    const teamRoot = path.join(tempRoot, "agent-teams");
    const parentTeamDir = path.join(teamRoot, "company");
    const departmentTeamDir = path.join(parentTeamDir, "agent-teams", "research");
    const cellTeamDir = path.join(departmentTeamDir, "agent-teams", "drafting-cell");
    await writeTeam(parentTeamDir, "Company Team");
    await writeTeam(departmentTeamDir, "Research Team");
    await writeTeam(cellTeamDir, "Drafting Cell");

    const departmentTeamId = buildTeamLocalTeamDefinitionId("company", "research");
    const cellTeamId = buildTeamLocalTeamDefinitionId(departmentTeamId, "drafting-cell");
    const sourcePathsList = await listAllTeamSourcePaths({
      sharedTeamRoots: [teamRoot],
      applicationOwnedTeamSources: [],
    });

    expect(sourcePathsList.map(getCanonicalTeamDefinitionIdFromSourcePaths)).toEqual([
      "company",
      departmentTeamId,
      cellTeamId,
    ]);

    const resolvedCell = await findTeamSourcePaths(cellTeamId, [teamRoot], {
      getApplicationOwnedTeamSourceById: async () => null,
    });

    expect(resolvedCell).toMatchObject({
      kind: "team_local",
      definitionId: cellTeamId,
      ownerTeamId: departmentTeamId,
      ownerTeamName: "Research Team",
      localTeamId: "drafting-cell",
      teamDir: cellTeamDir,
    });
  });
});
