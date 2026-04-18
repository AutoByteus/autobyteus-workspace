import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { AgentTeamDefinition, TeamMember } from "../../../src/agent-team-definition/domain/models.js";
import {
  buildApplicationOwnedTeamWriteContent,
  readApplicationOwnedTeamDefinitionFromSource,
  type ApplicationOwnedTeamSourcePaths,
} from "../../../src/agent-team-definition/providers/application-owned-team-source.js";

describe("application-owned-team-source", () => {
  const cleanupPaths = new Set<string>();

  afterEach(async () => {
    for (const targetPath of cleanupPaths) {
      await fs.rm(targetPath, { recursive: true, force: true }).catch(() => undefined);
    }
    cleanupPaths.clear();
  });

  const createSourcePaths = async (): Promise<ApplicationOwnedTeamSourcePaths> => {
    const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "autobyteus-app-owned-team-"));
    cleanupPaths.add(tempRoot);

    const teamDir = path.join(tempRoot, "applications", "brief-studio", "agent-teams", "launch-team");
    await fs.mkdir(teamDir, { recursive: true });

    return {
      definitionId: "bundle-team__pkg-1__brief-studio__launch-team",
      teamDir,
      mdPath: path.join(teamDir, "team.md"),
      configPath: path.join(teamDir, "team-config.json"),
      rootPath: path.join(tempRoot, "applications", "brief-studio"),
      applicationId: "bundle-app__pkg-1__brief-studio",
      applicationName: "Brief Studio",
      packageId: "pkg-1",
      localApplicationId: "brief-studio",
      localTeamId: "launch-team",
    };
  };

  it("reads application-owned team defaultLaunchConfig through the shared normalizer", async () => {
    const sourcePaths = await createSourcePaths();

    await fs.writeFile(
      sourcePaths.mdPath,
      [
        "---",
        "name: Launch Team",
        "description: Coordinates the application launch",
        "category: coordination",
        "---",
        "",
        "Coordinate the launch.",
      ].join("\n"),
      "utf-8",
    );
    await fs.writeFile(
      sourcePaths.configPath,
      JSON.stringify(
        {
          coordinatorMemberName: "lead",
          defaultLaunchConfig: {
            runtimeKind: "autobyteus",
            llmModelIdentifier: "gpt-5.4-mini",
            llmConfig: {
              reasoning_effort: "high",
            },
          },
          members: [
            {
              memberName: "lead",
              ref: "researcher",
              refType: "agent",
              refScope: "team_local",
            },
          ],
        },
        null,
        2,
      ),
      "utf-8",
    );

    const definition = await readApplicationOwnedTeamDefinitionFromSource({
      sourcePaths,
      canonicalizeTeamRef: (localTeamId) => `canonical-team:${localTeamId}`,
    });

    expect(definition).toMatchObject({
      id: sourcePaths.definitionId,
      ownershipScope: "application_owned",
      ownerApplicationId: sourcePaths.applicationId,
      ownerPackageId: sourcePaths.packageId,
      defaultLaunchConfig: {
        runtimeKind: "autobyteus",
        llmModelIdentifier: "gpt-5.4-mini",
        llmConfig: {
          reasoning_effort: "high",
        },
      },
      coordinatorMemberName: "lead",
      nodes: [
        {
          memberName: "lead",
          ref: "researcher",
          refType: "agent",
          refScope: "team_local",
        },
      ],
    });
  });

  it("writes application-owned team defaultLaunchConfig back to source config", () => {
    const definition = new AgentTeamDefinition({
      id: "bundle-team__pkg-1__brief-studio__launch-team",
      name: "Launch Team",
      description: "Coordinates the application launch",
      instructions: "Coordinate the launch.",
      category: "coordination",
      coordinatorMemberName: "lead",
      defaultLaunchConfig: {
        runtimeKind: "autobyteus",
        llmModelIdentifier: "gpt-5.4-mini",
        llmConfig: {
          reasoning_effort: "medium",
        },
      },
      ownershipScope: "application_owned",
      ownerApplicationId: "bundle-app__pkg-1__brief-studio",
      ownerApplicationName: "Brief Studio",
      ownerPackageId: "pkg-1",
      ownerLocalApplicationId: "brief-studio",
      nodes: [
        new TeamMember({
          memberName: "lead",
          ref: "researcher",
          refType: "agent",
          refScope: "team_local",
        }),
        new TeamMember({
          memberName: "subteam",
          ref: "canonical-team:review-team",
          refType: "agent_team",
        }),
      ],
    });

    const result = buildApplicationOwnedTeamWriteContent(definition, {
      localizeTeamRef: (canonicalTeamId) => canonicalTeamId.replace("canonical-team:", ""),
    });

    expect(result.mdContent).toContain("name: Launch Team");
    expect(result.mdContent).toContain("Coordinate the launch.");
    expect(result.configRecord).toEqual({
      coordinatorMemberName: "lead",
      avatarUrl: null,
      defaultLaunchConfig: {
        runtimeKind: "autobyteus",
        llmModelIdentifier: "gpt-5.4-mini",
        llmConfig: {
          reasoning_effort: "medium",
        },
      },
      members: [
        {
          memberName: "lead",
          ref: "researcher",
          refType: "agent",
          refScope: "team_local",
        },
        {
          memberName: "subteam",
          ref: "review-team",
          refType: "agent_team",
          refScope: null,
        },
      ],
    });
  });
});
