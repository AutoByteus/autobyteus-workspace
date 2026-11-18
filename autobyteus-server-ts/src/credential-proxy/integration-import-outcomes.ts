import path from "node:path";
import { parseGitHubSkillRepository } from "../integrations/github/github-repository-source.js";
import { IntegrationFolderRequirementError } from "../skills/domain/integration-folder-requirement.js";
import { SkillNameConflictError } from "../skills/domain/skill-name-conflict-error.js";
import { IntegrationConnectionError } from "./integration-connection-service.js";

export type IntegrationSourceKind = "LOCAL_PATH" | "GITHUB_REPOSITORY";

export type IntegrationCatalogErrorCode =
  | "NOT_A_LINK_OR_PATH"
  | "ALREADY_IMPORTED"
  | "DIRECTORY_NOT_FOUND"
  | "SKILL_NAME_CONFLICT"
  | "NO_INTEGRATIONS_FOUND"
  | "INTEGRATION_ALREADY_IMPORTED"
  | "GITHUB_UNREACHABLE"
  | "IMPORT_FAILED"
  | "SOURCE_NOT_FOUND"
  | "UPDATE_FAILED"
  | "REMOVE_FAILED";

/** A refused or failed catalog operation; `details` carries what the page shows (kind, path, skill, reason…). */
export class IntegrationCatalogError extends Error {
  constructor(
    readonly code: IntegrationCatalogErrorCode,
    message: string,
    readonly details: Readonly<Record<string, string>> = {},
  ) {
    super(message);
    this.name = "IntegrationCatalogError";
  }
}

export type ImportTarget =
  | Readonly<{ kind: "GITHUB_REPOSITORY"; url: string }>
  | Readonly<{ kind: "LOCAL_PATH"; path: string }>;

/**
 * What an Import text means (DS-002's first rows): a GitHub repository link the skill-source parser accepts, an
 * absolute (or `~`) folder path, or neither (`NOT_A_LINK_OR_PATH`).
 */
export const classifyImportLocation = (location: string, homeDir: () => string): ImportTarget => {
  const text = location.trim();
  const notALinkOrPath = () => new IntegrationCatalogError("NOT_A_LINK_OR_PATH",
    "Enter a GitHub repository link or the full path of a folder.");
  if (/^https?:\/\//i.test(text)) {
    try {
      parseGitHubSkillRepository(text);
    } catch {
      throw notALinkOrPath();
    }
    return { kind: "GITHUB_REPOSITORY", url: text };
  }
  if (text === "~" || text.startsWith("~/") || text.startsWith("~\\")) {
    return { kind: "LOCAL_PATH", path: path.join(homeDir(), text.slice(1)) };
  }
  if (path.isAbsolute(text)) return { kind: "LOCAL_PATH", path: text };
  throw notALinkOrPath();
};

const reasonOf = (message: string): string => message.replace(/\.$/, "");

/**
 * The skill-source importer's outcome as a coded refusal (DS-002's mapping table). `existingSourceOf` names the source
 * that already has an integration ID, for `INTEGRATION_ALREADY_IMPORTED`.
 */
export const importOutcomeError = (
  error: unknown,
  kind: IntegrationSourceKind,
  existingSourceOf: (integrationId: string) => string | null,
): Error => {
  if (error instanceof IntegrationCatalogError) return error;
  if (error instanceof IntegrationFolderRequirementError) {
    if (error.code === "NO_INTEGRATION_FOLDER") {
      return new IntegrationCatalogError("NO_INTEGRATIONS_FOUND", "No integrations in this source.", { kind });
    }
    return new IntegrationCatalogError("INTEGRATION_ALREADY_IMPORTED", error.message, {
      id: error.folderName ?? "", existingSource: (error.folderName && existingSourceOf(error.folderName)) ?? "",
    });
  }
  if (error instanceof SkillNameConflictError) {
    return new IntegrationCatalogError("SKILL_NAME_CONFLICT", error.message, { skill: error.conflicts[0]?.name ?? "" });
  }
  const message = error instanceof Error ? error.message : String(error);
  if (kind === "LOCAL_PATH") {
    const missing = /^(?:Directory not found|Path is not a directory): (.*)$/.exec(message);
    if (missing) return new IntegrationCatalogError("DIRECTORY_NOT_FOUND", message, { path: missing[1]! });
    if (message === "Skill source already exists" || message === "Path is already the default skill directory") {
      return new IntegrationCatalogError("ALREADY_IMPORTED", "This folder is already imported.", { kind });
    }
    return new IntegrationCatalogError("IMPORT_FAILED", message);
  }
  if (message.startsWith("No valid skills found") || message.startsWith("Removal incomplete")) {
    return new IntegrationCatalogError("IMPORT_FAILED", message);
  }
  // Everything else on a GitHub import is the repository's metadata or download: GitHub couldn't be reached.
  return new IntegrationCatalogError("GITHUB_UNREACHABLE", message, { reason: reasonOf(message) });
};

/** An update's or removal's failure: a refused disconnect or a skill-source rule, else GitHub unreachable (update). */
export const sourceChangeError = (error: unknown, code: "UPDATE_FAILED" | "REMOVE_FAILED", reachesGitHub: boolean): Error => {
  if (error instanceof IntegrationCatalogError) return error;
  const message = error instanceof Error ? error.message : String(error);
  if (error instanceof IntegrationConnectionError || error instanceof SkillNameConflictError || !reachesGitHub
    || message.startsWith("Update contains no valid skills") || message.startsWith("Removal incomplete")) {
    return new IntegrationCatalogError(code, message, { reason: reasonOf(message) });
  }
  return new IntegrationCatalogError("GITHUB_UNREACHABLE", message, { reason: reasonOf(message) });
};
