import type { LLMProvider } from '../../llm/providers.js';
import type { SkillAccessMode } from './skill-access-mode.js';

export type AgentContextLike = {
  agentId: string;
  autoExecuteTools?: boolean;
  customData?: Record<string, any>;
  config?: {
    name?: string;
    skills?: string[];
    skillAccessMode?: SkillAccessMode | string;
  };
  llmInstance?: {
    model?: {
      provider?: LLMProvider;
    };
  } | null;
};
