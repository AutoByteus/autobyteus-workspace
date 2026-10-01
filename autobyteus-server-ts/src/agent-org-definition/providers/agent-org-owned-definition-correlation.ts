import path from "node:path";
import type { readAgentOrgDefinitionConfig } from "./agent-org-definition-config.js";
import { buildAgentOrgOwnedDefinitionId } from "../utils/agent-org-owned-definition-id.js";

export type AgentOrgOwnedSubject = "agent" | "agent_team";

export type AgentOrgOwnedDefinitionSourcePaths = Readonly<{
  kind: "agent_org_owned";
  subject: AgentOrgOwnedSubject;
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

type AgentOrgDefinitionConfig = ReturnType<typeof readAgentOrgDefinitionConfig>;

/** The folder that holds an Org's local definitions of one subject. */
export const agentOrgOwnedFamilyDirName = (subject: AgentOrgOwnedSubject): "agents" | "agent-teams" =>
  subject === "agent" ? "agents" : "agent-teams";

const candidateIds = (
  subject: AgentOrgOwnedSubject,
  orgDefinitionId: string,
  localDefinitionId: string,
): readonly string[] => Object.freeze([
  buildAgentOrgOwnedDefinitionId(subject, orgDefinitionId, localDefinitionId),
]);

/**
 * Correlates one Org's `org_local` members of a subject with its local definition folders
 * (AR-014). Pure: the callers read `org-config.json`, `org.md` and the folder names.
 *
 * - Only `org_local` members of the subject are considered, in config order.
 * - A member correlates with exactly one local folder whose owned id equals its `ref`. A
 *   malformed correlation (no or several matches) skips only that member.
 * - `seenDefinitionIds` holds the ids already correlated by earlier Orgs or roots for this
 *   subject; a member already seen is skipped, and so is a repeated member in this Org.
 */
export const correlateAgentOrgOwnedMembers = (input: {
  subject: AgentOrgOwnedSubject;
  orgRoot: string;
  orgDirName: string;
  config: AgentOrgDefinitionConfig;
  orgDefinitionName: string;
  localDirNames: readonly string[];
  seenDefinitionIds?: ReadonlySet<string>;
}): AgentOrgOwnedDefinitionSourcePaths[] => {
  const orgDir = path.join(input.orgRoot, input.orgDirName);
  const familyDirName = agentOrgOwnedFamilyDirName(input.subject);
  const seen = new Set(input.seenDefinitionIds ?? []);
  const output: AgentOrgOwnedDefinitionSourcePaths[] = [];
  for (const member of input.config.members) {
    if (member.refScope !== "org_local" || member.refType !== input.subject || seen.has(member.ref)) continue;
    const matches = input.localDirNames.filter((dirName) =>
      candidateIds(input.subject, input.orgDirName, dirName).includes(member.ref));
    if (matches.length !== 1) {
      // A malformed correlation makes this one reference unavailable. It must
      // not abort discovery for unrelated packages; target admission will
      // report the owning Org as unavailable when its reference cannot be
      // resolved through the exact source index.
      continue;
    }
    const localDefinitionId = matches[0]!;
    const definitionDir = path.join(orgDir, familyDirName, localDefinitionId);
    output.push(Object.freeze({
      kind: "agent_org_owned",
      subject: input.subject,
      definitionId: member.ref,
      localDefinitionId,
      orgDefinitionId: input.orgDirName,
      orgDefinitionName: input.orgDefinitionName,
      orgDir,
      definitionDir,
      mdPath: path.join(definitionDir, input.subject === "agent" ? "agent.md" : "team.md"),
      configPath: path.join(definitionDir, input.subject === "agent" ? "agent-config.json" : "team-config.json"),
      rootPath: input.orgRoot,
    }));
    seen.add(member.ref);
  }
  return output;
};
