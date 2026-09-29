import fs from "node:fs";
import path from "node:path";
import { buildAgentOrgOwnedDefinitionId } from "../../src/agent-org-definition/utils/agent-org-owned-definition-id.js";

/**
 * Writes an Agent Org package under `orgRoot/<orgId>` (D-19 fixtures): `org.md`, `org-config.json`
 * with `org_local` members for the given local agents and teams, and their folders.
 */
export const writeAgentOrg = (orgRoot: string, orgId: string, local: {
  agents?: string[];
  teams?: string[];
  extraMembers?: Array<Record<string, unknown>>;
}): string => {
  const orgDir = path.join(orgRoot, orgId);
  fs.mkdirSync(orgDir, { recursive: true });
  const member = (refType: "agent" | "agent_team", localId: string) => ({
    memberName: localId.replace(/[^a-z0-9_]/gi, "_"),
    ref: buildAgentOrgOwnedDefinitionId(refType, orgId, localId),
    refType,
    refScope: "org_local",
  });
  const members = [
    ...(local.agents ?? []).map((id) => member("agent", id)),
    ...(local.teams ?? []).map((id) => member("agent_team", id)),
    ...(local.extraMembers ?? []),
  ];
  fs.writeFileSync(path.join(orgDir, "org-config.json"), JSON.stringify({ avatarUrl: null, members, handoffs: [], defaultLaunchConfig: null }, null, 2));
  fs.writeFileSync(path.join(orgDir, "org.md"), `---\nname: ${orgId} org\ndescription: Fixture org\ncategory: test\n---\n\nFixture.\n`);
  for (const id of local.agents ?? []) fs.mkdirSync(path.join(orgDir, "agents", id), { recursive: true });
  for (const id of local.teams ?? []) fs.mkdirSync(path.join(orgDir, "agent-teams", id), { recursive: true });
  return orgDir;
};

export const writeSkillFolder = (skillDir: string, name: string, body = "Body"): string => {
  fs.mkdirSync(skillDir, { recursive: true });
  fs.writeFileSync(path.join(skillDir, "SKILL.md"), `---\nname: ${name}\ndescription: ${name} description\n---\n\n${body}\n`, "utf-8");
  return skillDir;
};
