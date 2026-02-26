import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { AgentFactory } from '../../../src/agent/factory/agent-factory.js';
import { AgentConfig } from '../../../src/agent/context/agent-config.js';
import { SkillRegistry } from '../../../src/skills/registry.js';
import { BaseLLM } from '../../../src/llm/base.js';
import { LLMModel } from '../../../src/llm/models.js';
import { LLMProvider } from '../../../src/llm/providers.js';
import { LLMConfig } from '../../../src/llm/utils/llm-config.js';
import { CompleteResponse } from '../../../src/llm/utils/response-types.js';
import type { LLMUserMessage } from '../../../src/llm/user-message.js';
import type { CompleteResponse as CompleteResponseType, ChunkResponse } from '../../../src/llm/utils/response-types.js';

class DummyLLM extends BaseLLM {
  protected async _sendMessagesToLLM(_messages: any[]): Promise<CompleteResponseType> {
    return new CompleteResponse({ content: 'ok' });
  }

  protected async *_streamMessagesToLLM(
    _userMessage: LLMUserMessage
  ): AsyncGenerator<ChunkResponse, void, unknown> {
    yield { content: 'ok', is_complete: true } as ChunkResponse;
  }
}

const createTempSkillDir = () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'autobyteus-skill-'));
  const skillPath = path.join(tempDir, 'java_expert');
  fs.mkdirSync(skillPath, { recursive: true });
  const skillFile = path.join(skillPath, 'SKILL.md');
  fs.writeFileSync(
    skillFile,
    ['---', 'name: java_expert', 'description: Java expert', '---', 'Java Map Body'].join('\n'),
    'utf8'
  );
  return { tempDir, skillPath };
};

const resetFactory = () => {
  (AgentFactory as any).instance = undefined;
};

describe('AgentFactory skill integration', () => {
  beforeEach(() => {
    SkillRegistry.getInstance().clear();
    resetFactory();
  });

  afterEach(() => {
    SkillRegistry.getInstance().clear();
    resetFactory();
  });

  it('injects preloaded skill details when skill path is provided', () => {
    const { tempDir, skillPath } = createTempSkillDir();
    try {
      const model = new LLMModel({
        name: 'dummy',
        value: 'dummy',
        canonicalName: 'dummy',
        provider: LLMProvider.OPENAI
      });
      const llm = new DummyLLM(model, new LLMConfig());
      const config = new AgentConfig(
        'TestAgent',
        'Tester',
        'Testing skills',
        llm,
        null,
        [],
        true,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        [skillPath]
      );

      const factory = new AgentFactory();
      const agent = factory.createAgent(config);

      let systemPrompt = 'Initial prompt';
      for (const processor of agent.context.config.systemPromptProcessors) {
        systemPrompt = processor.process(systemPrompt, {}, agent.agentId, agent.context);
      }

      expect(systemPrompt).toContain('## Agent Skills');
      expect(systemPrompt).toContain('### Skill Catalog');
      expect(systemPrompt).toContain('Java Map Body');
      expect(systemPrompt).toContain(`**Root Path:** \`${skillPath}\``);
      expect(systemPrompt).toContain('Path Resolution Required for Skill Files');
      expect(agent.context.config.skills).toContain('java_expert');
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('injects catalog entries for discovered skills without preloading content', () => {
    const { tempDir, skillPath } = createTempSkillDir();
    try {
      SkillRegistry.getInstance().registerSkillFromPath(skillPath);

      const model = new LLMModel({
        name: 'dummy',
        value: 'dummy',
        canonicalName: 'dummy',
        provider: LLMProvider.OPENAI
      });
      const llm = new DummyLLM(model, new LLMConfig());
      const config = new AgentConfig(
        'Generalist',
        'Assistant',
        'No preloaded skills',
        llm,
        null,
        [],
        true,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        []
      );

      const factory = new AgentFactory();
      const agent = factory.createAgent(config);

      let systemPrompt = 'Initial';
      for (const processor of agent.context.config.systemPromptProcessors) {
        systemPrompt = processor.process(systemPrompt, {}, agent.agentId, agent.context);
      }

      expect(systemPrompt).toContain('### Skill Catalog');
      expect(systemPrompt).toContain('**java_expert**: Java expert');
      expect(systemPrompt).not.toContain('Java Map Body');
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
