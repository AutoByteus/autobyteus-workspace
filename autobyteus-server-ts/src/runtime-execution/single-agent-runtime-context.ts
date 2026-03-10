import {
  SkillAccessMode,
  resolveSkillAccessMode,
} from "autobyteus-ts/agent/context/skill-access-mode.js";
import { AgentDefinitionService } from "../agent-definition/services/agent-definition-service.js";
import { SkillService } from "../skills/services/skill-service.js";
import type { ResolvedRuntimeSkill } from "./configured-runtime-skills.js";

type AgentDefinitionServiceLike = Pick<AgentDefinitionService, "getAgentDefinitionById">;
type SkillServiceLike = Pick<SkillService, "getSkill">;
type PromptLoaderLike = {
  getPromptTemplateForAgent: (agentDefinitionId: string) => Promise<string | null>;
};

const asTrimmedString = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

const buildInstructionMetadata = (instructions: string | null): Record<string, unknown> =>
  instructions
    ? {
        agentInstructions: instructions,
        memberInstructionSources: {
          agentInstructions: instructions,
        },
      }
    : {};

export const resolveConfiguredRuntimeSkills = async (options: {
  skillNames: string[];
  skillService: SkillServiceLike;
}): Promise<ResolvedRuntimeSkill[]> => {
  const configuredSkills: ResolvedRuntimeSkill[] = [];

  for (const rawSkillName of options.skillNames) {
    const skillName = asTrimmedString(rawSkillName);
    if (!skillName) {
      continue;
    }
    const skill = options.skillService.getSkill(skillName);
    if (!skill) {
      console.warn(
        `Runtime skill '${skillName}' could not be resolved via SkillService. Skipping.`,
      );
      continue;
    }
    configuredSkills.push({
      name: skill.name,
      description: skill.description,
      content: skill.content,
      rootPath: skill.rootPath,
      skillFilePath: `${skill.rootPath}/SKILL.md`,
    });
  }

  return configuredSkills;
};

export type SingleAgentRuntimeContext = {
  runtimeMetadata: Record<string, unknown>;
  configuredSkills: ResolvedRuntimeSkill[];
  skillAccessMode: SkillAccessMode;
};

export const resolveSingleAgentRuntimeContext = async (
  agentDefinitionId: string,
  options: {
    promptLoader?: PromptLoaderLike;
    agentDefinitionService?: AgentDefinitionServiceLike;
    skillService?: SkillServiceLike;
    skillAccessMode?: SkillAccessMode | null;
  } = {},
): Promise<SingleAgentRuntimeContext> => {
  const agentDefinitionService =
    options.agentDefinitionService ?? AgentDefinitionService.getInstance();
  const skillService = options.skillService ?? SkillService.getInstance();

  const [rawPromptInstructions, agentDefinition] = await Promise.all([
    options.promptLoader?.getPromptTemplateForAgent(agentDefinitionId) ?? Promise.resolve(null),
    agentDefinitionService.getAgentDefinitionById(agentDefinitionId),
  ]);

  const promptInstructions = asTrimmedString(rawPromptInstructions);
  const definitionInstructions = asTrimmedString((agentDefinition as { instructions?: unknown } | null)?.instructions);
  const fallbackInstructions = asTrimmedString(agentDefinition?.description);
  const agentInstructions = promptInstructions ?? definitionInstructions ?? fallbackInstructions;
  const configuredSkills = await resolveConfiguredRuntimeSkills({
    skillNames: agentDefinition?.skillNames ?? [],
    skillService,
  });
  const skillAccessMode = resolveSkillAccessMode(
    options.skillAccessMode ?? null,
    configuredSkills.length,
  );
  const exposedConfiguredSkills =
    skillAccessMode === SkillAccessMode.NONE ? [] : configuredSkills;

  return {
    runtimeMetadata: {
      ...buildInstructionMetadata(agentInstructions),
      skillAccessMode,
      ...(exposedConfiguredSkills.length > 0
        ? {
            configuredSkillNames: exposedConfiguredSkills.map((skill) => skill.name),
          }
        : {}),
    },
    configuredSkills: exposedConfiguredSkills,
    skillAccessMode,
  };
};
