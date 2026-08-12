import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { AgentFactory } from '../../../src/agent/factory/agent-factory.js';
import { AgentConfig } from '../../../src/agent/context/agent-config.js';
import { appendConfiguredSkillsCatalog } from '../../../src/agent/system-prompt/append-configured-skills-catalog.js';
import { SkillRegistry } from '../../../src/skills/registry.js';
import { BaseLLM } from '../../../src/llm/base.js';
import { LLMModel } from '../../../src/llm/models.js';
import { LLMProvider } from '../../../src/llm/providers.js';
import { LLMConfig } from '../../../src/llm/utils/llm-config.js';
import { CompleteResponse } from '../../../src/llm/utils/response-types.js';
import type { LLMUserMessage } from '../../../src/llm/user-message.js';
import type {
  CompleteResponse as CompleteResponseType,
  ChunkResponse
} from '../../../src/llm/utils/response-types.js';

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

const SKILL_BODY_SENTINEL = 'UNIQUE_JAVA_SKILL_BODY';
const SKILL_BODY_LINK = 'Read [reference.md](reference.md).';

const createTempSkillDir = () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'autobyteus-skill-'));
  const skillPath = path.join(tempDir, 'java_expert');
  fs.mkdirSync(skillPath, { recursive: true });
  fs.writeFileSync(path.join(skillPath, 'reference.md'), 'Reference', 'utf8');
  fs.writeFileSync(
    path.join(skillPath, 'SKILL.md'),
    [
      '---',
      'name: java_expert',
      'description: Java expert',
      '---',
      SKILL_BODY_SENTINEL,
      SKILL_BODY_LINK
    ].join('\n'),
    'utf8'
  );
  return { tempDir, skillPath };
};

const createDummyLLM = () => {
  const model = new LLMModel({
    name: 'dummy',
    value: 'dummy',
    canonicalName: 'dummy',
    provider: LLMProvider.OPENAI
  });
  return new DummyLLM(model, new LLMConfig());
};

const resetFactory = () => {
  (AgentFactory as any).instance = undefined;
};

const expectedSkillsBlock = (skillPath: string): string => `\n\n## Skills

### Skill Catalog

- **java_expert**: Java expert
  - **SKILL.md:** \`${path.join(skillPath, 'SKILL.md')}\`

### Rules for Using Skills

- Use a configured skill whenever it applies to the task.
- When no configured skill applies, use the best available general approach.
- When an applicable configured skill covers only part of the task, follow it for the covered part and use another available technique for the uncovered part.
- Before beginning work governed by a skill, read its \`SKILL.md\` from the exact path listed above.
- Resolve every relative path mentioned by a skill from the directory containing that skill's \`SKILL.md\`.
`;

describe('AgentFactory skill integration', () => {
  beforeEach(() => {
    SkillRegistry.getInstance().clear();
    resetFactory();
  });

  afterEach(() => {
    SkillRegistry.getInstance().clear();
    resetFactory();
  });

  it('advertises configured skill metadata and exact entry path without injecting its body', () => {
    const { tempDir, skillPath } = createTempSkillDir();
    try {
      const config = new AgentConfig(
        'TestAgent',
        'Tester',
        'Testing skills',
        createDummyLLM(),
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
        [skillPath]
      );

      const agent = new AgentFactory().createAgent(config);
      const systemPrompt = appendConfiguredSkillsCatalog('Initial prompt', agent.context);

      expect(systemPrompt).toBe(`Initial prompt${expectedSkillsBlock(skillPath)}`);
      expect(agent.context.config.skills).toEqual(['java_expert']);
      expect(agent.context.toolInstances).toEqual({});
      expect(systemPrompt).not.toContain(SKILL_BODY_SENTINEL);
      expect(systemPrompt).not.toContain(SKILL_BODY_LINK);
      expect(systemPrompt).not.toContain(
        `[reference.md](${path.join(skillPath, 'reference.md')})`
      );
      expect(systemPrompt).not.toContain('Skill Details');
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('leaves the prompt unchanged for registry-only skills with an empty configured set', () => {
    const { tempDir, skillPath } = createTempSkillDir();
    try {
      SkillRegistry.getInstance().registerSkillFromPath(skillPath);
      const config = new AgentConfig(
        'Generalist',
        'Assistant',
        'No configured skills',
        createDummyLLM(),
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
        []
      );

      const agent = new AgentFactory().createAgent(config);
      const systemPrompt = appendConfiguredSkillsCatalog('Initial', agent.context);

      expect(systemPrompt).toBe('Initial');
      expect(systemPrompt).not.toContain('## Skills');
      expect(systemPrompt).not.toContain('### Skill Catalog');
      expect(agent.context.config.skills).toEqual([]);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
