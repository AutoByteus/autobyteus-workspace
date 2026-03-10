import { describe, expect, it, vi } from "vitest";
import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import { resolveSingleAgentRuntimeContext } from "../../../src/runtime-execution/single-agent-runtime-context.js";

describe("single-agent-runtime-context", () => {
  it("resolves prompt instructions, selected skills, and lean runtime metadata", async () => {
    const promptLoader = {
      getPromptTemplateForAgent: vi.fn().mockResolvedValue("Use tools when needed."),
    };
    const agentDefinitionService = {
      getAgentDefinitionById: vi.fn().mockResolvedValue({
        description: "Fallback description",
        skillNames: ["code-review", "missing-skill"],
      }),
    };
    const skillService = {
      getSkill: vi.fn((skillName: string) =>
        skillName === "code-review"
          ? {
              name: "code-review",
              description: "Review code carefully.",
              content: "Always verify edge cases before approving changes.",
              rootPath: "/skills/code-review",
            }
          : null,
      ),
    };

    const context = await resolveSingleAgentRuntimeContext("agent-1", {
      promptLoader: promptLoader as any,
      agentDefinitionService: agentDefinitionService as any,
      skillService: skillService as any,
      skillAccessMode: null,
    });

    expect(context.skillAccessMode).toBe(SkillAccessMode.PRELOADED_ONLY);
    expect(context.configuredSkills).toEqual([
      {
        name: "code-review",
        description: "Review code carefully.",
        content: "Always verify edge cases before approving changes.",
        rootPath: "/skills/code-review",
        skillFilePath: "/skills/code-review/SKILL.md",
      },
    ]);
    expect(context.runtimeMetadata).toEqual({
      agentInstructions: "Use tools when needed.",
      memberInstructionSources: {
        agentInstructions: "Use tools when needed.",
      },
      skillAccessMode: SkillAccessMode.PRELOADED_ONLY,
      configuredSkillNames: ["code-review"],
    });
  });

  it("falls back to description and suppresses selected skills for NONE", async () => {
    const context = await resolveSingleAgentRuntimeContext("agent-2", {
      promptLoader: {
        getPromptTemplateForAgent: vi.fn().mockResolvedValue(null),
      } as any,
      agentDefinitionService: {
        getAgentDefinitionById: vi.fn().mockResolvedValue({
          description: "Fallback description",
          skillNames: ["code-review"],
        }),
      } as any,
      skillService: {
        getSkill: vi.fn().mockReturnValue({
          name: "code-review",
          description: "Review code carefully.",
          content: "Always verify edge cases before approving changes.",
          rootPath: "/skills/code-review",
        }),
      } as any,
      skillAccessMode: SkillAccessMode.NONE,
    });

    expect(context.skillAccessMode).toBe(SkillAccessMode.NONE);
    expect(context.configuredSkills).toEqual([]);
    expect(context.runtimeMetadata).toEqual({
      agentInstructions: "Fallback description",
      memberInstructionSources: {
        agentInstructions: "Fallback description",
      },
      skillAccessMode: SkillAccessMode.NONE,
    });
  });
});
