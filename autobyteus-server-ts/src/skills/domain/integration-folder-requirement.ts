import fs from "node:fs";
import path from "node:path";

/**
 * The import option the Integrations page sets: the source must hold at least one integration folder (a top-level
 * folder with both `SKILL.md` and `integration.json`), and none named like an integration another source already
 * has. A plain presence rule: what an integration folder means is owned outside `skills/`.
 */
export type IntegrationFolderRequirement = Readonly<{ reservedIds: readonly string[] }>;

export type SkillSourceImportOptions = Readonly<{ requireIntegrationFolder?: IntegrationFolderRequirement }>;

export type IntegrationFolderRequirementCode = "NO_INTEGRATION_FOLDER" | "RESERVED_INTEGRATION_FOLDER";

export class IntegrationFolderRequirementError extends Error {
  constructor(readonly code: IntegrationFolderRequirementCode, readonly folderName: string | null = null) {
    super(code === "NO_INTEGRATION_FOLDER"
      ? "No integration folder in this source."
      : `An integration named '${folderName}' is already imported from another source.`);
    this.name = "IntegrationFolderRequirementError";
  }
}

/** The names of the top-level folders of `root` that hold both `SKILL.md` and `integration.json`, sorted. */
export const listIntegrationFolderNames = (root: string): string[] => {
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(root, { withFileTypes: true });
  } catch {
    return [];
  }
  return entries
    .filter((entry) => entry.isDirectory()
      && fs.existsSync(path.join(root, entry.name, "SKILL.md"))
      && fs.existsSync(path.join(root, entry.name, "integration.json")))
    .map((entry) => entry.name)
    .sort();
};

/** Refuses a source without an integration folder, or with one named like a reserved (already imported) ID. */
export const assertIntegrationFolderRequirement = (root: string, requirement: IntegrationFolderRequirement): void => {
  const folders = listIntegrationFolderNames(root);
  if (folders.length === 0) throw new IntegrationFolderRequirementError("NO_INTEGRATION_FOLDER");
  const reserved = folders.find((name) => requirement.reservedIds.includes(name));
  if (reserved) throw new IntegrationFolderRequirementError("RESERVED_INTEGRATION_FOLDER", reserved);
};
