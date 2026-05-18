import { promises as fs } from "node:fs";
import { buildTeamLocalTeamDefinitionId } from "autobyteus-ts/agent-team/utils/team-local-definition-id.js";
import {
  defaultAgentConfig,
  normalizeAgentConfigRecord,
  type AgentConfigRecord,
} from "../../agent-definition/providers/agent-definition-config.js";
import { buildTeamLocalAgentFilePaths } from "../../agent-definition/providers/team-local-agent-discovery.js";
import { parseAgentMd } from "../../agent-definition/utils/agent-md-parser.js";
import {
  defaultTeamConfig,
  normalizeTeamConfigRecord,
  type TeamConfigMember,
  type TeamConfigRecord,
} from "../../agent-team-definition/providers/team-definition-config.js";
import {
  buildTeamLocalTeamSourcePaths,
  getCanonicalTeamDefinitionIdFromSourcePaths,
  type ResolvedTeamSourcePaths,
} from "../../agent-team-definition/providers/team-definition-source-paths.js";
import { parseTeamMd } from "../../agent-team-definition/utils/team-md-parser.js";
import {
  buildScopedMemberResolutionContext,
  resolveScopedAgentMemberRef,
  resolveScopedTeamMemberRef,
} from "../../agent-team-definition/utils/scoped-team-member-resolution.js";
import { readJsonFile } from "../../persistence/file/store-utils.js";

export type ApplicationOwnedLocalTeamValidationInput = {
  owningApplicationId: string;
  applicationIdByTeamId: Map<string, string>;
  parentSourcePaths: ResolvedTeamSourcePaths;
  localTeamId: string;
  visitedTeamIds?: Set<string>;
};

const readLocalTeamConfig = async (
  sourcePaths: ResolvedTeamSourcePaths,
): Promise<TeamConfigRecord> => {
  const mdContent = await fs.readFile(sourcePaths.mdPath, "utf-8");
  parseTeamMd(mdContent, sourcePaths.mdPath);
  return normalizeTeamConfigRecord(
    await readJsonFile<TeamConfigRecord>(sourcePaths.configPath, defaultTeamConfig()),
  );
};

const assertCoordinatorMemberExists = (
  teamId: string,
  config: TeamConfigRecord,
): void => {
  const coordinatorMemberName = config.coordinatorMemberName?.trim();
  if (!coordinatorMemberName) {
    return;
  }
  const exists = (config.members ?? []).some(
    (member) => member.memberName.trim() === coordinatorMemberName,
  );
  if (!exists) {
    throw new Error(
      `Team-local child team '${teamId}' coordinator member '${coordinatorMemberName}' was not found in members.`,
    );
  }
};

const assertLocalAgentFilesValid = async (
  teamId: string,
  teamDir: string,
  member: TeamConfigMember,
): Promise<void> => {
  try {
    const filePaths = buildTeamLocalAgentFilePaths(teamDir, member.ref);
    const mdContent = await fs.readFile(filePaths.mdPath, "utf-8");
    parseAgentMd(mdContent, filePaths.mdPath);
    normalizeAgentConfigRecord(
      await readJsonFile<AgentConfigRecord>(filePaths.configPath, defaultAgentConfig()),
    );
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      throw new Error(
        `Team-local child team '${teamId}' member '${member.memberName}' must reference a local agent inside its own agents/ folder.`,
      );
    }
    throw error;
  }
};

const assertSameApplicationTeamRef = (
  input: Pick<ApplicationOwnedLocalTeamValidationInput, "owningApplicationId" | "applicationIdByTeamId">,
  teamId: string,
  member: TeamConfigMember,
  resolvedTeamId: string,
): void => {
  const ownerApplicationId = input.applicationIdByTeamId.get(resolvedTeamId) ?? null;
  if (ownerApplicationId !== input.owningApplicationId) {
    throw new Error(
      `Team-local child team '${teamId}' member '${member.memberName}' must reference a team inside the same application bundle.`,
    );
  }
};

const validateLocalTeamSource = async (
  input: ApplicationOwnedLocalTeamValidationInput & {
    sourcePaths: ResolvedTeamSourcePaths;
    teamId: string;
  },
): Promise<void> => {
  const visitedTeamIds = input.visitedTeamIds ?? new Set<string>();
  if (visitedTeamIds.has(input.teamId)) {
    throw new Error(
      `Circular dependency detected in application-owned local child teams involving ID: ${input.teamId}`,
    );
  }
  visitedTeamIds.add(input.teamId);

  let config: TeamConfigRecord;
  try {
    config = await readLocalTeamConfig(input.sourcePaths);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      throw new Error(
        `Team-local child team '${input.teamId}' could not be read from '${input.sourcePaths.teamDir}'.`,
      );
    }
    throw error;
  }

  assertCoordinatorMemberExists(input.teamId, config);
  const resolutionContext = buildScopedMemberResolutionContext({
    id: input.teamId,
    ownershipScope: "team_local",
    ownerApplicationId: input.owningApplicationId,
  });

  for (const member of config.members ?? []) {
    if (member.refType === "agent") {
      resolveScopedAgentMemberRef(resolutionContext, member);
      if (member.refScope === "team_local") {
        await assertLocalAgentFilesValid(input.teamId, input.sourcePaths.teamDir, member);
      }
      continue;
    }

    const resolvedTeamId = resolveScopedTeamMemberRef(resolutionContext, member);
    if (resolvedTeamId === input.teamId) {
      throw new Error(
        `Team-local child team '${input.teamId}' cannot reference itself as a nested team member.`,
      );
    }
    if (member.refScope === "team_local") {
      await validateApplicationOwnedLocalTeamTree({
        owningApplicationId: input.owningApplicationId,
        applicationIdByTeamId: input.applicationIdByTeamId,
        parentSourcePaths: input.sourcePaths,
        localTeamId: member.ref,
        visitedTeamIds: new Set(visitedTeamIds),
      });
      continue;
    }
    if (member.refScope === "application_owned") {
      assertSameApplicationTeamRef(input, input.teamId, member, resolvedTeamId);
    }
  }
};

export const validateApplicationOwnedLocalTeamTree = async (
  input: ApplicationOwnedLocalTeamValidationInput,
): Promise<void> => {
  const ownerTeamId = getCanonicalTeamDefinitionIdFromSourcePaths(input.parentSourcePaths);
  const teamId = buildTeamLocalTeamDefinitionId(ownerTeamId, input.localTeamId);
  const sourcePaths = await buildTeamLocalTeamSourcePaths(
    input.parentSourcePaths,
    teamId,
    input.localTeamId,
  );
  await validateLocalTeamSource({
    ...input,
    sourcePaths,
    teamId,
  });
};
