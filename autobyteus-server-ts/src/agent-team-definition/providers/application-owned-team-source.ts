import { promises as fs } from "node:fs";
import { AgentTeamDefinition } from "../domain/models.js";
import { parseTeamMd, serializeTeamMd, TeamMdParseError } from "../utils/team-md-parser.js";
import {
  type ApplicationOwnedTeamConfigMember,
  canonicalizeApplicationOwnedTeamMembers,
  localizeApplicationOwnedTeamMembers,
} from "../utils/application-owned-team-ref-normalizer.js";
import { readJsonFile } from "../../persistence/file/store-utils.js";

export type ApplicationOwnedTeamSourcePaths = {
  definitionId: string;
  teamDir: string;
  mdPath: string;
  configPath: string;
  rootPath: string;
  applicationId: string;
  applicationName: string;
  packageId: string;
  localApplicationId: string;
  localTeamId: string;
};

type ApplicationOwnedTeamConfigRecord = {
  coordinatorMemberName?: string;
  members?: ApplicationOwnedTeamConfigMember[];
  avatarUrl?: string | null;
};

export class ApplicationOwnedTeamConfigParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ApplicationOwnedTeamConfigParseError";
  }
}

const normalizeMembers = (value: unknown): ApplicationOwnedTeamConfigMember[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((entry, index) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      throw new ApplicationOwnedTeamConfigParseError(`members[${index}] must be an object.`);
    }

    const candidate = entry as Record<string, unknown>;
    const memberName = typeof candidate.memberName === "string" ? candidate.memberName.trim() : "";
    const ref = typeof candidate.ref === "string" ? candidate.ref.trim() : "";
    const refType = candidate.refType === "agent_team"
      ? "agent_team"
      : candidate.refType === "agent"
        ? "agent"
        : null;
    const refScope = candidate.refScope === "application_owned"
      ? "application_owned"
      : candidate.refScope === undefined || candidate.refScope === null
        ? null
        : "invalid";

    if (!memberName || !ref || !refType) {
      throw new ApplicationOwnedTeamConfigParseError(
        `members[${index}] must include non-empty memberName, ref, and refType.`,
      );
    }
    if (refType === "agent" && refScope !== "application_owned") {
      throw new ApplicationOwnedTeamConfigParseError(
        `members[${index}] with refType 'agent' must include refScope 'application_owned'.`,
      );
    }
    if (refType === "agent_team" && refScope) {
      throw new ApplicationOwnedTeamConfigParseError(
        `members[${index}] with refType 'agent_team' must not include refScope.`,
      );
    }

    return {
      memberName,
      ref,
      refType,
      refScope: refType === "agent" ? "application_owned" : null,
    };
  });
};

export const readApplicationOwnedTeamConfigFile = async (
  configPath: string,
): Promise<ApplicationOwnedTeamConfigRecord> => {
  const record = await readJsonFile<Record<string, unknown>>(configPath, {});
  return {
    coordinatorMemberName:
      typeof record.coordinatorMemberName === "string" ? record.coordinatorMemberName : "",
    avatarUrl: typeof record.avatarUrl === "string" ? record.avatarUrl : null,
    members: normalizeMembers(record.members),
  };
};

export const readApplicationOwnedTeamDefinitionFromSource = async (
  options: {
    sourcePaths: ApplicationOwnedTeamSourcePaths;
    canonicalizeAgentRef: (localAgentId: string) => string;
    canonicalizeTeamRef: (localTeamId: string) => string;
  },
): Promise<AgentTeamDefinition | null> => {
  try {
    const mdContent = await fs.readFile(options.sourcePaths.mdPath, "utf-8");
    const parsed = parseTeamMd(mdContent, options.sourcePaths.mdPath);
    const config = await readApplicationOwnedTeamConfigFile(options.sourcePaths.configPath);

    return new AgentTeamDefinition({
      id: options.sourcePaths.definitionId,
      name: parsed.name,
      description: parsed.description,
      instructions: parsed.instructions,
      category: parsed.category,
      avatarUrl: config.avatarUrl ?? null,
      coordinatorMemberName:
        typeof config.coordinatorMemberName === "string" ? config.coordinatorMemberName : "",
      nodes: canonicalizeApplicationOwnedTeamMembers(config.members ?? [], {
        canonicalizeAgentRef: options.canonicalizeAgentRef,
        canonicalizeTeamRef: options.canonicalizeTeamRef,
      }),
      ownershipScope: "application_owned",
      ownerApplicationId: options.sourcePaths.applicationId,
      ownerApplicationName: options.sourcePaths.applicationName,
      ownerPackageId: options.sourcePaths.packageId,
      ownerLocalApplicationId: options.sourcePaths.localApplicationId,
    });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }
    if (
      error instanceof TeamMdParseError ||
      error instanceof ApplicationOwnedTeamConfigParseError
    ) {
      throw error;
    }
    throw error;
  }
};

export const buildApplicationOwnedTeamWriteContent = (
  definition: AgentTeamDefinition,
  options: {
    localizeAgentRef: (canonicalAgentId: string) => string;
    localizeTeamRef: (canonicalTeamId: string) => string;
  },
): {
  mdContent: string;
  configRecord: ApplicationOwnedTeamConfigRecord;
} => ({
  mdContent: serializeTeamMd(
    {
      name: definition.name,
      description: definition.description,
      category: definition.category,
    },
    definition.instructions,
  ),
  configRecord: {
    coordinatorMemberName: definition.coordinatorMemberName,
    avatarUrl: definition.avatarUrl ?? null,
    members: localizeApplicationOwnedTeamMembers(definition.nodes, {
      localizeAgentRef: options.localizeAgentRef,
      localizeTeamRef: options.localizeTeamRef,
    }),
  },
});
