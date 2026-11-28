import { createHash } from "node:crypto";
import path from "node:path";
import { AgentOrgDefinition, AgentOrgMember } from "../domain/agent-org-definition.js";
import { parseOrgMd } from "../utils/org-md-parser.js";
import { readAgentOrgDefinitionConfig } from "./agent-org-definition-config.js";
import type { DefinitionSourceDescriptor } from "../../collaboration-definition-admission/domain/definition-source-descriptor.js";
import type { DefinitionReadResult } from "../../agent-package-definitions/domain/agent-package-definition-types.js";
import { errorMessage, fingerprintOf, pathExists, readOptionalText } from "../../agent-package-definitions/domain/definition-files.js";
import { readPackageAvatar } from "../../agent-package-definitions/domain/definition-avatar-file.js";

const ORG_FILES = ["org.md", "org-config.json"] as const;

/** The AgentOrg revision used for optimistic concurrency: a hash of its two definition files. */
export const orgRevisionFor = (files: Readonly<Record<(typeof ORG_FILES)[number], string>>): string => {
  const hash = createHash("sha256");
  for (const name of [...ORG_FILES].sort()) hash.update(name).update("\0").update(files[name]).update("\0");
  return hash.digest("hex");
};

/** Builds an AgentOrg definition from its already-read files; parse failures are thrown. */
export const buildAgentOrgDefinitionFromFiles = (input: {
  definitionId: string;
  mdPath: string;
  mdContent: string;
  configContent: string;
  descriptor: DefinitionSourceDescriptor;
}): AgentOrgDefinition => {
  const authored = parseOrgMd(input.mdContent, input.mdPath);
  const config = readAgentOrgDefinitionConfig(JSON.parse(input.configContent));
  return new AgentOrgDefinition({
    id: input.definitionId,
    name: authored.name,
    description: authored.description,
    category: authored.category,
    instructions: authored.instructions,
    members: config.members.map((member) => new AgentOrgMember(member)),
    handoffs: config.handoffs,
    avatarUrl: config.avatarUrl,
    defaultLaunchConfig: config.defaultLaunchConfig,
    revision: orgRevisionFor({ "org.md": input.mdContent, "org-config.json": input.configContent }),
    source: input.descriptor,
  });
};

/**
 * Reads one AgentOrg folder into a classified read result. Present when `org.md` or `org-config.json`
 * exists; both are required. A missing Org file next to a Team config is a family mismatch.
 */
export const readAgentOrgDefinitionNode = async (input: {
  definitionId: string;
  orgDir: string;
  descriptor: DefinitionSourceDescriptor;
}): Promise<DefinitionReadResult<AgentOrgDefinition>> => {
  const mdPath = path.join(input.orgDir, "org.md");
  const configPath = path.join(input.orgDir, "org-config.json");
  let mdContent: string | null;
  let configContent: string | null;
  try {
    mdContent = await readOptionalText(mdPath);
    configContent = await readOptionalText(configPath);
  } catch (error) {
    return { status: "invalid", code: "DEFINITION_CONTRACT_INVALID", reason: errorMessage(error), definitionPath: input.orgDir };
  }
  if (mdContent === null && configContent === null) return { status: "absent" };
  if (mdContent === null || configContent === null) {
    const missingPath = mdContent === null ? mdPath : configPath;
    const familyMismatch = await pathExists(path.join(input.orgDir, "team-config.json"));
    return {
      status: "invalid",
      code: familyMismatch ? "DEFINITION_FAMILY_MISMATCH" : "DEFINITION_CONTRACT_INVALID",
      reason: familyMismatch
        ? `${path.basename(missingPath)} is missing, and the folder holds a Team definition instead of an AgentOrg.`
        : `${path.basename(missingPath)} is missing.`,
      definitionPath: missingPath,
    };
  }
  try {
    parseOrgMd(mdContent, mdPath);
  } catch (error) {
    return { status: "invalid", code: "DEFINITION_CONTRACT_INVALID", reason: errorMessage(error), definitionPath: mdPath };
  }
  let definition: AgentOrgDefinition;
  try {
    definition = buildAgentOrgDefinitionFromFiles({
      definitionId: input.definitionId, mdPath, mdContent, configContent, descriptor: input.descriptor,
    });
  } catch (error) {
    const reason = error instanceof SyntaxError ? `Invalid JSON: ${error.message}` : errorMessage(error);
    return { status: "invalid", code: "DEFINITION_CONTRACT_INVALID", reason, definitionPath: configPath };
  }
  // Its picture travels with the folder (autobyteus-669 S-1); a changed or added picture reloads it like org.md.
  definition.packageAvatar = await readPackageAvatar(input.orgDir);
  return { status: "valid", definition, fingerprint: fingerprintOf([mdContent, configContent, definition.packageAvatar?.hash ?? null]) };
};
