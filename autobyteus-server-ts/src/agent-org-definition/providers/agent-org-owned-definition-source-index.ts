import fs from "node:fs/promises";
import path from "node:path";
import { readAgentOrgDefinitionConfig } from "./agent-org-definition-config.js";
import { parseOrgMd } from "../utils/org-md-parser.js";
import { buildAgentOrgOwnedDefinitionId } from "../utils/agent-org-owned-definition-id.js";

export type AgentOrgOwnedDefinitionSourcePaths = Readonly<{
  kind: "agent_org_owned";
  subject: "agent" | "agent_team";
  definitionId: string;
  localDefinitionId: string;
  orgDefinitionId: string;
  orgDefinitionName: string;
  orgDir: string;
  definitionDir: string;
  mdPath: string;
  configPath: string;
  rootPath: string;
}>;

const candidateIds = (
  subject: "agent" | "agent_team",
  orgDefinitionId: string,
  localDefinitionId: string,
): readonly string[] => Object.freeze([
  buildAgentOrgOwnedDefinitionId(subject, orgDefinitionId, localDefinitionId),
]);

/**
 * Builds exact identity-to-physical-source correlations from current Org packages.
 * The requested identity is never parsed to infer its owning Org or local path.
 */
export const listAgentOrgOwnedDefinitionSources = async (input: {
  subject: "agent" | "agent_team";
  orgRoots: readonly string[];
}): Promise<readonly AgentOrgOwnedDefinitionSourcePaths[]> => {
  const output: AgentOrgOwnedDefinitionSourcePaths[] = [];
  const seen = new Set<string>();
  for (const orgRoot of input.orgRoots) {
    const orgEntries = await fs.readdir(orgRoot, { withFileTypes: true }).catch(() => []);
    for (const orgEntry of orgEntries.sort((left, right) => left.name.localeCompare(right.name))) {
      if (!orgEntry.isDirectory() || orgEntry.name.startsWith("_")) continue;
      const orgDir = path.join(orgRoot, orgEntry.name);
      let config: ReturnType<typeof readAgentOrgDefinitionConfig>;
      let orgDefinitionName: string;
      try {
        config = readAgentOrgDefinitionConfig(JSON.parse(await fs.readFile(path.join(orgDir, "org-config.json"), "utf8")));
        orgDefinitionName = parseOrgMd(await fs.readFile(path.join(orgDir, "org.md"), "utf8"), path.join(orgDir, "org.md")).name;
      } catch {
        continue;
      }
      const familyDirName = input.subject === "agent" ? "agents" : "agent-teams";
      const localEntries = await fs.readdir(path.join(orgDir, familyDirName), { withFileTypes: true }).catch(() => []);
      for (const member of config.members) {
        if (member.refScope !== "org_local" || member.refType !== input.subject || seen.has(member.ref)) continue;
        const matches = localEntries.filter((entry) => entry.isDirectory()
          && candidateIds(input.subject, orgEntry.name, entry.name).includes(member.ref));
        if (matches.length !== 1) {
          // A malformed correlation makes this one reference unavailable. It must
          // not abort discovery for unrelated packages; target admission will
          // report the owning Org as unavailable when its reference cannot be
          // resolved through the exact source index.
          continue;
        }
        const localDefinitionId = matches[0]!.name;
        const definitionDir = path.join(orgDir, familyDirName, localDefinitionId);
        output.push(Object.freeze({
          kind: "agent_org_owned",
          subject: input.subject,
          definitionId: member.ref,
          localDefinitionId,
          orgDefinitionId: orgEntry.name,
          orgDefinitionName,
          orgDir,
          definitionDir,
          mdPath: path.join(definitionDir, input.subject === "agent" ? "agent.md" : "team.md"),
          configPath: path.join(definitionDir, input.subject === "agent" ? "agent-config.json" : "team-config.json"),
          rootPath: orgRoot,
        }));
        seen.add(member.ref);
      }
    }
  }
  return Object.freeze(output);
};

export const findAgentOrgOwnedDefinitionSource = async (input: {
  definitionId: string;
  subject: "agent" | "agent_team";
  orgRoots: readonly string[];
}): Promise<AgentOrgOwnedDefinitionSourcePaths | null> => {
  const requestedId = input.definitionId.trim();
  if (!requestedId) return null;
  return (await listAgentOrgOwnedDefinitionSources(input)).find((source) => source.definitionId === requestedId) ?? null;
};
