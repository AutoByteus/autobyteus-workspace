// Throwaway prove-first probe (autobyteus-337): the cost of the per-call agent-definition re-read, and that
// shared and team-local agents resolve through getAgentDefinitionById + resolveConfiguredSkillBindingsForAgent.
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { it, expect } from "vitest";
import { AgentDefinitionService } from "../../src/agent-definition/services/agent-definition-service.js";
import { buildTeamLocalAgentDefinitionId } from "../../src/agent-team-definition/utils/team-local-definition-id.js";
import { appConfigProvider } from "../../src/config/app-config-provider.js";
import { SkillService } from "../../src/skills/services/skill-service.js";

const time = async (label: string, n: number, fn: () => Promise<unknown> | unknown) => {
  await fn();
  const start = process.hrtime.bigint();
  for (let i = 0; i < n; i += 1) await fn();
  const meanMs = Number(process.hrtime.bigint() - start) / 1e6 / n;
  console.log(`PROBE ${label}: mean ${meanMs.toFixed(3)} ms over ${n} calls`);
  return meanMs;
};

it("measures the per-call definition read and resolves shared and team-local agents", async () => {
  const service = new AgentDefinitionService();
  const unique = randomUUID();
  const shared = await service.createAgentDefinition({ name: `Probe ${unique}`, role: "Test", description: "probe",
    instructions: "probe", skillNames: ["probe-skill"] } as never);
  const teamId = `team-${unique}`; const localId = `local-${unique}`;
  const teamDir = path.join(appConfigProvider.config.getAppDataDir(), "agent-teams", teamId);
  const localDir = path.join(teamDir, "agents", localId);
  await fs.mkdir(localDir, { recursive: true });
  await fs.writeFile(path.join(teamDir, "team.md"), `---\nname: Team ${unique}\ndescription: probe\n---\n\nprobe\n`);
  await fs.writeFile(path.join(localDir, "agent.md"), `---\nname: Local ${unique}\ndescription: probe\n---\n\nprobe\n`);
  await fs.writeFile(path.join(localDir, "agent-config.json"), JSON.stringify({ toolNames: [], skillNames: ["probe-skill"] }));
  try {
    await service.reloadAgentPackageDefinitions();
    const localDefinitionId = buildTeamLocalAgentDefinitionId(teamId, localId);
    const sharedDef = await service.getAgentDefinitionById(shared.id!);
    const localDef = await service.getAgentDefinitionById(localDefinitionId);
    console.log(`PROBE shared skillNames=${JSON.stringify(sharedDef?.skillNames)} team-local id=${localDefinitionId} skillNames=${JSON.stringify(localDef?.skillNames)} scope=${localDef?.skillScope}`);
    expect(sharedDef?.skillNames).toEqual(["probe-skill"]);
    expect(localDef?.skillNames).toEqual(["probe-skill"]);
    const skills = new SkillService();
    const bindings = skills.resolveConfiguredSkillBindingsForAgent(localDef);
    console.log(`PROBE team-local bindings=${JSON.stringify(bindings.map((b) => b.kind))}`);
    await time("getAgentDefinitionById(shared)", 500, () => service.getAgentDefinitionById(shared.id!));
    await time("getAgentDefinitionById(team-local)", 500, () => service.getAgentDefinitionById(localDefinitionId));
    await time("SkillService.getDisabledSkills", 500, () => skills.getDisabledSkills());
    await time("resolveConfiguredSkillBindingsForAgent (full check, whole catalog scan)", 50, () => skills.resolveConfiguredSkillBindingsForAgent(localDef));
  } finally {
    await fs.rm(teamDir, { recursive: true, force: true });
    await service.deleteAgentDefinition(shared.id!).catch(() => undefined);
  }
});
