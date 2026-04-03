import type { AgentRunContext } from "../../../domain/agent-run-context.js";
import type { CodexAgentRunContext } from "./codex-agent-run-context.js";
import type { CodexDynamicToolRegistration } from "../codex-dynamic-tool.js";
import type { ConfiguredAgentToolExposure } from "../../../shared/configured-agent-tool-exposure.js";

const renderMarkdownInstructionSection = (
  title: string,
  content: string | null | undefined,
): string | null => {
  const normalized = typeof content === "string" ? content.trim() : "";
  if (!normalized) {
    return null;
  }
  return `## ${title}\n${normalized}`;
};

export const renderMarkdownInstructionSections = (
  sections: Array<{ title: string; content: string | null | undefined }>,
): string | null => {
  const rendered = sections
    .map((section) => renderMarkdownInstructionSection(section.title, section.content))
    .filter((section): section is string => Boolean(section));
  return rendered.length > 0 ? rendered.join("\n\n") : null;
};

export type CodexThreadBootstrapPreparation = {
  baseInstructions: string | null;
  developerInstructions: string | null;
  dynamicToolRegistrations: CodexDynamicToolRegistration[] | null;
};

export interface CodexThreadBootstrapStrategy {
  appliesTo(
    runContext: AgentRunContext<CodexAgentRunContext | null>,
  ): boolean;
  prepare(input: {
    runContext: AgentRunContext<CodexAgentRunContext | null>;
    agentInstruction: string | null;
    configuredToolExposure: ConfiguredAgentToolExposure;
  }): Promise<CodexThreadBootstrapPreparation> | CodexThreadBootstrapPreparation;
}

export class DefaultCodexThreadBootstrapStrategy implements CodexThreadBootstrapStrategy {
  appliesTo(): boolean {
    return true;
  }

  prepare(input: {
    agentInstruction: string | null;
    configuredToolExposure: ConfiguredAgentToolExposure;
  }): CodexThreadBootstrapPreparation {
    return {
      baseInstructions: renderMarkdownInstructionSections([
        {
          title: "Agent Instruction",
          content: input.agentInstruction,
        },
      ]),
      developerInstructions: null,
      dynamicToolRegistrations: null,
    };
  }
}
