import fs from "node:fs";
import fsPromises from "node:fs/promises";
import path from "node:path";
import { readAgentOrgDefinitionConfig } from "./agent-org-definition-config.js";
import { parseOrgMd } from "../utils/org-md-parser.js";
import {
  agentOrgOwnedFamilyDirName,
  correlateAgentOrgOwnedMembers,
  type AgentOrgOwnedDefinitionSourcePaths,
  type AgentOrgOwnedSubject,
} from "./agent-org-owned-definition-correlation.js";

export type { AgentOrgOwnedDefinitionSourcePaths } from "./agent-org-owned-definition-correlation.js";

type OrgSourceQuery = { subject: AgentOrgOwnedSubject; orgRoots: readonly string[] };
type OrgFiles = { config: ReturnType<typeof readAgentOrgDefinitionConfig>; orgDefinitionName: string };
type DirEntry = { name: string; isDirectory(): boolean };

const sortedOrgDirNames = (entries: readonly DirEntry[]): string[] => entries
  .filter((entry) => entry.isDirectory() && !entry.name.startsWith("_"))
  .map((entry) => entry.name)
  .sort((left, right) => left.localeCompare(right));

const localDirNames = (entries: readonly DirEntry[]): string[] =>
  entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);

const parseOrgFiles = (configText: string, orgMdText: string, orgMdPath: string): OrgFiles => ({
  config: readAgentOrgDefinitionConfig(JSON.parse(configText)),
  orgDefinitionName: parseOrgMd(orgMdText, orgMdPath).name,
});

/** Correlates one Org and records its ids so later Orgs and roots skip them. */
const correlateOrg = (query: OrgSourceQuery, orgRoot: string, orgDirName: string, files: OrgFiles,
  entries: readonly DirEntry[], seen: Set<string>): AgentOrgOwnedDefinitionSourcePaths[] => {
  const sources = correlateAgentOrgOwnedMembers({
    subject: query.subject, orgRoot, orgDirName, config: files.config,
    orgDefinitionName: files.orgDefinitionName, localDirNames: localDirNames(entries), seenDefinitionIds: seen,
  });
  for (const source of sources) seen.add(source.definitionId);
  return sources;
};

/**
 * Builds exact identity-to-physical-source correlations from current Org packages.
 * The requested identity is never parsed to infer its owning Org or local path.
 * Serves the definition providers and admission (non-blocking I/O).
 */
export const listAgentOrgOwnedDefinitionSources = async (
  input: OrgSourceQuery,
): Promise<readonly AgentOrgOwnedDefinitionSourcePaths[]> => {
  const output: AgentOrgOwnedDefinitionSourcePaths[] = [];
  const seen = new Set<string>();
  for (const orgRoot of input.orgRoots) {
    const orgEntries = await fsPromises.readdir(orgRoot, { withFileTypes: true }).catch(() => []);
    for (const orgDirName of sortedOrgDirNames(orgEntries)) {
      const orgDir = path.join(orgRoot, orgDirName);
      let files: OrgFiles;
      try {
        files = parseOrgFiles(
          await fsPromises.readFile(path.join(orgDir, "org-config.json"), "utf8"),
          await fsPromises.readFile(path.join(orgDir, "org.md"), "utf8"),
          path.join(orgDir, "org.md"),
        );
      } catch {
        continue;
      }
      const entries = await fsPromises.readdir(path.join(orgDir, agentOrgOwnedFamilyDirName(input.subject)), { withFileTypes: true })
        .catch(() => []);
      output.push(...correlateOrg(input, orgRoot, orgDirName, files, entries, seen));
    }
  }
  return Object.freeze(output);
};

/** The same correlation with synchronous I/O, for the skill catalog (D-19), which is synchronous. */
export const listAgentOrgOwnedDefinitionSourcesSync = (
  input: OrgSourceQuery,
): readonly AgentOrgOwnedDefinitionSourcePaths[] => {
  const readdir = (directory: string): fs.Dirent[] => {
    try {
      return fs.readdirSync(directory, { withFileTypes: true });
    } catch {
      return [];
    }
  };
  const output: AgentOrgOwnedDefinitionSourcePaths[] = [];
  const seen = new Set<string>();
  for (const orgRoot of input.orgRoots) {
    for (const orgDirName of sortedOrgDirNames(readdir(orgRoot))) {
      const orgDir = path.join(orgRoot, orgDirName);
      let files: OrgFiles;
      try {
        files = parseOrgFiles(
          fs.readFileSync(path.join(orgDir, "org-config.json"), "utf8"),
          fs.readFileSync(path.join(orgDir, "org.md"), "utf8"),
          path.join(orgDir, "org.md"),
        );
      } catch {
        continue;
      }
      const entries = readdir(path.join(orgDir, agentOrgOwnedFamilyDirName(input.subject)));
      output.push(...correlateOrg(input, orgRoot, orgDirName, files, entries, seen));
    }
  }
  return Object.freeze(output);
};

export const findAgentOrgOwnedDefinitionSource = async (input: {
  definitionId: string;
  subject: AgentOrgOwnedSubject;
  orgRoots: readonly string[];
}): Promise<AgentOrgOwnedDefinitionSourcePaths | null> => {
  const requestedId = input.definitionId.trim();
  if (!requestedId) return null;
  return (await listAgentOrgOwnedDefinitionSources(input)).find((source) => source.definitionId === requestedId) ?? null;
};
