import { createHash } from "node:crypto";
import path from "node:path";
import { AgentTeamDefinition, TeamMember } from "../domain/agent-team-definition.js";
import { parseTeamMd } from "../utils/team-md-parser.js";
import { readAgentTeamDefinitionConfig } from "./agent-team-definition-config.js";
import { getCanonicalTeamDefinitionIdFromSourcePaths, type ResolvedTeamSourcePaths } from "./team-definition-source-paths.js";
import type { DefinitionSourceDescriptor } from "../../collaboration-definition-admission/domain/definition-source-descriptor.js";
import type { DefinitionReadResult } from "../../agent-package-definitions/domain/agent-package-definition-types.js";
import { errorMessage, fingerprintOf, pathExists, readOptionalText } from "../../agent-package-definitions/domain/definition-files.js";

const TEAM_FILES = ["team.md", "team-config.json"] as const;

/** The Team revision used for optimistic concurrency: a hash of its two definition files. */
export const teamRevisionFor = (files: Readonly<Record<(typeof TEAM_FILES)[number], string>>): string => {
  const hash = createHash("sha256");
  for (const name of [...TEAM_FILES].sort()) hash.update(name).update("\0").update(files[name]).update("\0");
  return hash.digest("hex");
};

/** Builds a Team definition from its already-read files; parse failures are thrown. */
export const buildAgentTeamDefinitionFromFiles = (input: {
  source: ResolvedTeamSourcePaths;
  mdContent: string;
  configContent: string;
  descriptor: DefinitionSourceDescriptor;
}): AgentTeamDefinition => {
  const { source } = input;
  const parsed = parseTeamMd(input.mdContent, source.mdPath);
  const config = readAgentTeamDefinitionConfig(JSON.parse(input.configContent));
  return new AgentTeamDefinition({
    id: getCanonicalTeamDefinitionIdFromSourcePaths(source),
    name: parsed.name,
    description: parsed.description,
    instructions: parsed.instructions,
    category: parsed.category,
    nodes: config.members.map((item) => new TeamMember(item)),
    coordinatorMemberName: config.coordinatorMemberName,
    handoffs: config.handoffs,
    avatarUrl: config.avatarUrl,
    defaultLaunchConfig: config.defaultLaunchConfig,
    ownershipScope: source.kind === "application_owned" ? "application_owned" : source.kind === "agent_org_owned" ? "agent_org_owned" : "shared",
    ownerOrgId: source.kind === "agent_org_owned" ? source.orgDefinitionId : null,
    ownerOrgName: source.kind === "agent_org_owned" ? source.orgDefinitionName : null,
    ownerApplicationId: source.kind === "application_owned" ? source.applicationId : null,
    ownerApplicationName: source.kind === "application_owned" ? source.applicationName : null,
    ownerPackageId: source.kind === "application_owned" ? source.packageId : null,
    ownerLocalApplicationId: source.kind === "application_owned" ? source.localApplicationId : null,
    revision: teamRevisionFor({ "team.md": input.mdContent, "team-config.json": input.configContent }),
    source: input.descriptor,
  });
};

/**
 * Reads one Team folder into a classified read result. Present when `team.md` or `team-config.json`
 * exists; both are required. A missing Team file next to an Org config is a family mismatch.
 */
export const readAgentTeamDefinitionNode = async (input: {
  source: ResolvedTeamSourcePaths;
  descriptor: DefinitionSourceDescriptor;
}): Promise<DefinitionReadResult<AgentTeamDefinition>> => {
  const { source } = input;
  let mdContent: string | null;
  let configContent: string | null;
  try {
    mdContent = await readOptionalText(source.mdPath);
    configContent = await readOptionalText(source.configPath);
  } catch (error) {
    return { status: "invalid", code: "DEFINITION_CONTRACT_INVALID", reason: errorMessage(error), definitionPath: source.teamDir };
  }
  if (mdContent === null && configContent === null) return { status: "absent" };
  if (mdContent === null || configContent === null) {
    const missingPath = mdContent === null ? source.mdPath : source.configPath;
    const familyMismatch = await pathExists(path.join(source.teamDir, "org-config.json"));
    return {
      status: "invalid",
      code: familyMismatch ? "DEFINITION_FAMILY_MISMATCH" : "DEFINITION_CONTRACT_INVALID",
      reason: familyMismatch
        ? `${path.basename(missingPath)} is missing, and the folder holds an AgentOrg definition instead of a Team.`
        : `${path.basename(missingPath)} is missing.`,
      definitionPath: missingPath,
    };
  }
  try {
    parseTeamMd(mdContent, source.mdPath);
  } catch (error) {
    return { status: "invalid", code: "DEFINITION_CONTRACT_INVALID", reason: errorMessage(error), definitionPath: source.mdPath };
  }
  try {
    const definition = buildAgentTeamDefinitionFromFiles({ source, mdContent, configContent, descriptor: input.descriptor });
    return {
      status: "valid",
      definition,
      fingerprint: fingerprintOf([mdContent, configContent, definition.ownerOrgName ?? null]),
    };
  } catch (error) {
    const reason = error instanceof SyntaxError ? `Invalid JSON: ${error.message}` : errorMessage(error);
    return { status: "invalid", code: "DEFINITION_CONTRACT_INVALID", reason, definitionPath: source.configPath };
  }
};
