import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { AgentFactory } from '../../../src/agent/factory/agent-factory.js';
import { AgentConfig } from '../../../src/agent/context/agent-config.js';
import { AgentStatus } from '../../../src/agent/status/status-enum.js';
import { AgentInputUserMessage } from '../../../src/agent/message/agent-input-user-message.js';
import { EventType } from '../../../src/events/event-types.js';
import { BaseLLM } from '../../../src/llm/base.js';
import { LLMModel } from '../../../src/llm/models.js';
import { LLMProvider } from '../../../src/llm/providers.js';
import { LLMConfig } from '../../../src/llm/utils/llm-config.js';
import { CompleteResponse, ChunkResponse } from '../../../src/llm/utils/response-types.js';
import { Message } from '../../../src/llm/utils/messages.js';
import { registerWriteFileTool } from '../../../src/tools/file/write-file.js';
import { BaseTool } from '../../../src/tools/base-tool.js';
import { ParameterSchema, ParameterDefinition, ParameterType } from '../../../src/utils/parameter-schema.js';
import { SkillRegistry } from '../../../src/skills/registry.js';
import { createLmstudioLLM, hasLmstudioConfig } from '../helpers/lmstudio-llm-helper.js';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const waitForFile = async (filePath: string, timeoutMs = 20000, intervalMs = 100): Promise<boolean> => {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (fsSync.existsSync(filePath)) {
      return true;
    }
    await delay(intervalMs);
  }
  return false;
};

const waitForCondition = async (
  predicate: () => boolean,
  timeoutMs = 10000,
  intervalMs = 25
): Promise<boolean> => {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (predicate()) {
      return true;
    }
    await delay(intervalMs);
  }
  return false;
};

const waitForStatus = async (
  agentId: string,
  getStatus: () => AgentStatus,
  timeoutMs = 8000,
  intervalMs = 25
): Promise<boolean> => {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const status = getStatus();
    if (status === AgentStatus.IDLE || status === AgentStatus.ERROR) {
      return true;
    }
    await delay(intervalMs);
  }
  console.warn(`Agent '${agentId}' did not reach IDLE/ERROR within ${timeoutMs}ms.`);
  return false;
};

const resetFactory = () => {
  (AgentFactory as any).instance = undefined;
};

class ScriptedXmlLLM extends BaseLLM {
  readonly requests: Array<Array<Record<string, unknown>>> = [];
  private responseIndex = 0;

  constructor(private readonly responses: string[]) {
    super(
      new LLMModel({
        name: 'scripted-xml',
        value: 'scripted-xml',
        canonicalName: 'scripted-xml',
        provider: LLMProvider.OPENAI
      }),
      new LLMConfig()
    );
  }

  private nextResponse(): string {
    if (this.responseIndex >= this.responses.length) {
      throw new Error(`Unexpected LLM request ${this.responseIndex + 1}.`);
    }
    const response = this.responses[this.responseIndex];
    this.responseIndex += 1;
    return response;
  }

  protected async _sendMessagesToLLM(
    _messages: Message[],
    _kwargs: Record<string, unknown>
  ): Promise<CompleteResponse> {
    return new CompleteResponse({ content: this.nextResponse() });
  }

  protected async *_streamMessagesToLLM(
    messages: Message[],
    _kwargs: Record<string, unknown>
  ): AsyncGenerator<ChunkResponse, void, unknown> {
    this.requests.push(messages.map((message) => message.toDict()));
    yield new ChunkResponse({ content: this.nextResponse(), is_complete: true });
  }
}

type ConcatenateAudiosArgs = {
  audio_paths: string[];
  output_audio_path: string;
};

type WriteMarkupArgs = {
  markup: string;
  output_path: string;
};

class TestConcatenateAudiosTool extends BaseTool<{ agentId?: string }, ConcatenateAudiosArgs, string> {
  static getName(): string {
    return 'video_editing_concatenate_audios';
  }

  static getDescription(): string {
    return 'Concatenates fixture audio track contents into a single output file.';
  }

  static getArgumentSchema(): ParameterSchema {
    return new ParameterSchema([
      new ParameterDefinition({
        name: 'audio_paths',
        type: ParameterType.ARRAY,
        description: 'Absolute paths to the input audio track fixtures.',
        required: true,
        arrayItemSchema: ParameterType.STRING
      }),
      new ParameterDefinition({
        name: 'output_audio_path',
        type: ParameterType.STRING,
        description: 'Absolute path to the concatenated output track fixture.',
        required: true
      })
    ]);
  }

  protected async _execute(_context: { agentId?: string }, args?: ConcatenateAudiosArgs): Promise<string> {
    if (!args) {
      throw new Error('Expected concatenate audio arguments.');
    }

    const segments = await Promise.all(
      args.audio_paths.map(async (audioPath) => (await fs.readFile(audioPath, 'utf8')).trim())
    );
    await fs.writeFile(args.output_audio_path, segments.join('\n'), 'utf8');
    return args.output_audio_path;
  }
}

class TestWriteMarkupTool extends BaseTool<{ agentId?: string }, WriteMarkupArgs, string> {
  static getName(): string {
    return 'write_markup_fixture';
  }

  static getDescription(): string {
    return 'Writes schema-coerced XML markup to a fixture output file.';
  }

  static getArgumentSchema(): ParameterSchema {
    return new ParameterSchema([
      new ParameterDefinition({
        name: 'markup',
        type: ParameterType.STRING,
        description: 'Markup content to persist verbatim.',
        required: true
      }),
      new ParameterDefinition({
        name: 'output_path',
        type: ParameterType.STRING,
        description: 'Absolute output path for the markup fixture.',
        required: true
      })
    ]);
  }

  protected async _execute(_context: { agentId?: string }, args?: WriteMarkupArgs): Promise<string> {
    if (!args) {
      throw new Error('Expected write markup arguments.');
    }

    await fs.writeFile(args.output_path, args.markup, 'utf8');
    return args.output_path;
  }
}

const runIntegration = hasLmstudioConfig() ? describe : describe.skip;

describe('Agent single-flow integration (XML, deterministic)', () => {
  let tempDir: string;
  let originalParserEnv: string | undefined;

  beforeEach(async () => {
    originalParserEnv = process.env.AUTOBYTEUS_STREAM_PARSER;
    process.env.AUTOBYTEUS_STREAM_PARSER = 'xml';
    SkillRegistry.getInstance().clear();
    resetFactory();
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'autobyteus-agent-xml-array-'));
  });

  afterEach(async () => {
    if (originalParserEnv === undefined) {
      delete process.env.AUTOBYTEUS_STREAM_PARSER;
    } else {
      process.env.AUTOBYTEUS_STREAM_PARSER = originalParserEnv;
    }
    SkillRegistry.getInstance().clear();
    resetFactory();
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('executes an XML array tool call end-to-end for a single agent', async () => {
    const workspace = tempDir;
    const tool = new TestConcatenateAudiosTool();
    const inputFiles = await Promise.all(
      ['step_1.wav', 'step_2.wav', 'step_3.wav'].map(async (fileName, index) => {
        const filePath = path.join(workspace, fileName);
        await fs.writeFile(filePath, `audio-segment-${index + 1}`, 'utf8');
        return filePath;
      })
    );
    const outputPath = path.join(workspace, 'main_voiceover_track.wav');
    const xmlToolCall = [
      '<tool name="video_editing_concatenate_audios">',
      '  <arguments>',
      '    <arg name="audio_paths">',
      ...inputFiles.map((audioPath) => `      <item>${audioPath}</item>`),
      '    </arg>',
      `    <arg name="output_audio_path">${outputPath}</arg>`,
      '  </arguments>',
      '</tool>'
    ].join('\n');

    const llm = new ScriptedXmlLLM([xmlToolCall, 'Concatenation complete.']);
    const config = new AgentConfig(
      'SingleAgentXmlArray',
      'Tester',
      'Single agent XML array end-to-end flow',
      llm,
      'Use the XML tool format when invoking tools.',
      [tool],
      true,
      null,
      null,
      null,
      null,
      null,
      workspace,
      null
    );

    const factory = new AgentFactory();
    const agent = factory.createAgent(config);
    const observedEvents: EventType[] = [];
    const notifier = agent.context.statusManager?.notifier ?? null;
    const toolSucceededListener = () => {
      observedEvents.push(EventType.AGENT_TOOL_EXECUTION_SUCCEEDED);
    };
    const assistantCompleteListener = () => {
      observedEvents.push(EventType.AGENT_DATA_ASSISTANT_COMPLETE_RESPONSE);
    };
    const turnCompletedListener = () => {
      observedEvents.push(EventType.AGENT_TURN_COMPLETED);
    };

    notifier?.subscribe(EventType.AGENT_TOOL_EXECUTION_SUCCEEDED, toolSucceededListener);
    notifier?.subscribe(EventType.AGENT_DATA_ASSISTANT_COMPLETE_RESPONSE, assistantCompleteListener);
    notifier?.subscribe(EventType.AGENT_TURN_COMPLETED, turnCompletedListener);

    try {
      agent.start();
      const ready = await waitForStatus(agent.agentId, () => agent.context.currentStatus);
      expect(ready).toBe(true);

      await agent.postUserMessage(
        new AgentInputUserMessage(
          `Use the video_editing_concatenate_audios tool to concatenate ${inputFiles.length} files into ` +
            `"${outputPath}" using the exact input paths I provided.`
        )
      );

      const created = await waitForFile(outputPath, 10000, 50);
      expect(created).toBe(true);

      const settled = await waitForStatus(agent.agentId, () => agent.context.currentStatus, 10000, 25);
      expect(settled).toBe(true);
      expect(agent.context.currentStatus).toBe(AgentStatus.IDLE);

      const completed = await waitForCondition(
        () => llm.requests.length === 2 && agent.context.state.activeTurn === null,
        10000,
        25
      );
      expect(completed).toBe(true);

      const outputContent = await fs.readFile(outputPath, 'utf8');
      expect(outputContent).toBe('audio-segment-1\naudio-segment-2\naudio-segment-3');

      expect(llm.requests).toHaveLength(2);
      const toolResultMessage = llm.requests[1].find((message) => {
        const payload = (message as { tool_payload?: Record<string, unknown> | null }).tool_payload;
        return (
          payload?.tool_name === 'video_editing_concatenate_audios' &&
          payload?.tool_result === outputPath
        );
      });
      expect(toolResultMessage).toBeDefined();

      const toolSucceededIndex = observedEvents.findIndex(
        (event) => event === EventType.AGENT_TOOL_EXECUTION_SUCCEEDED
      );
      const assistantCompleteAfterToolIndex = observedEvents.findIndex(
        (event, index) =>
          index > toolSucceededIndex && event === EventType.AGENT_DATA_ASSISTANT_COMPLETE_RESPONSE
      );
      const turnCompletedAfterAssistantIndex = observedEvents.findIndex(
        (event, index) => index > assistantCompleteAfterToolIndex && event === EventType.AGENT_TURN_COMPLETED
      );

      expect(toolSucceededIndex).toBeGreaterThanOrEqual(0);
      expect(assistantCompleteAfterToolIndex).toBeGreaterThan(toolSucceededIndex);
      expect(turnCompletedAfterAssistantIndex).toBeGreaterThan(assistantCompleteAfterToolIndex);
    } finally {
      notifier?.unsubscribe(EventType.AGENT_TOOL_EXECUTION_SUCCEEDED, toolSucceededListener);
      notifier?.unsubscribe(EventType.AGENT_DATA_ASSISTANT_COMPLETE_RESPONSE, assistantCompleteListener);
      notifier?.unsubscribe(EventType.AGENT_TURN_COMPLETED, turnCompletedListener);
      if (agent.isRunning) {
        await agent.stop(5);
      }
      await llm.cleanup();
    }
  });

  it('preserves nested XML strings for local tools through schema-aware coercion', async () => {
    const workspace = tempDir;
    const tool = new TestWriteMarkupTool();
    const outputPath = path.join(workspace, 'markup.xml');
    const markup = '<root><item>1</item><item>2</item></root>';
    const xmlToolCall = [
      '<tool name="write_markup_fixture">',
      '  <arguments>',
      `    <arg name="markup">${markup}</arg>`,
      `    <arg name="output_path">${outputPath}</arg>`,
      '  </arguments>',
      '</tool>'
    ].join('\n');

    const llm = new ScriptedXmlLLM([xmlToolCall, 'Markup written.']);
    const config = new AgentConfig(
      'SingleAgentXmlMarkup',
      'Tester',
      'Single agent XML markup flow',
      llm,
      'Use the XML tool format when invoking tools.',
      [tool],
      true,
      null,
      null,
      null,
      null,
      null,
      workspace,
      null
    );

    const agent = new AgentFactory().createAgent(config);

    try {
      agent.start();
      const ready = await waitForStatus(agent.agentId, () => agent.context.currentStatus);
      expect(ready).toBe(true);

      await agent.postUserMessage(
        new AgentInputUserMessage(
          `Use the write_markup_fixture tool to store the markup at "${outputPath}" exactly as XML content.`
        )
      );

      const created = await waitForFile(outputPath, 10000, 50);
      expect(created).toBe(true);

      const completed = await waitForCondition(
        () => llm.requests.length === 2 && agent.context.state.activeTurn === null,
        10000,
        25
      );
      expect(completed).toBe(true);
      expect(agent.context.currentStatus).toBe(AgentStatus.IDLE);

      const content = await fs.readFile(outputPath, 'utf8');
      expect(content).toBe(markup);

      const toolResultMessage = llm.requests[1].find((message) => {
        const payload = (message as { tool_payload?: Record<string, unknown> | null }).tool_payload;
        return payload?.tool_name === 'write_markup_fixture' && payload?.tool_result === outputPath;
      });
      expect(toolResultMessage).toBeDefined();
    } finally {
      if (agent.isRunning) {
        await agent.stop(5);
      }
      await llm.cleanup();
    }
  });
});

runIntegration('Agent single-flow integration (LM Studio, XML)', () => {
  let tempDir: string;
  let originalParserEnv: string | undefined;

  beforeEach(async () => {
    originalParserEnv = process.env.AUTOBYTEUS_STREAM_PARSER;
    process.env.AUTOBYTEUS_STREAM_PARSER = 'xml';
    SkillRegistry.getInstance().clear();
    resetFactory();
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'autobyteus-agent-'));
  });

  afterEach(async () => {
    if (originalParserEnv === undefined) {
      delete process.env.AUTOBYTEUS_STREAM_PARSER;
    } else {
      process.env.AUTOBYTEUS_STREAM_PARSER = originalParserEnv;
    }
    SkillRegistry.getInstance().clear();
    resetFactory();
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('executes a tool call end-to-end using XML tool format', async () => {
    const workspace = tempDir;
    const tool = registerWriteFileTool();
    const toolArgs = { path: path.join(workspace, 'poem.txt'), content: 'Roses are red.' };

    const llm = await createLmstudioLLM({ temperature: 0 });
    if (!llm) return;

    const systemPrompt =
      'You MUST use the provided XML tool format. Respond with a single XML tool call only.';

    const config = new AgentConfig(
      'SingleAgentXml',
      'Tester',
      'Single agent end-to-end flow (XML)',
      llm,
      systemPrompt,
      [tool],
      true,
      null,
      null,
      null,
      null,
      null,
      workspace,
      null
    );

    const factory = new AgentFactory();
    const agent = factory.createAgent(config);

    try {
      agent.start();
      const ready = await waitForStatus(agent.agentId, () => agent.context.currentStatus);
      expect(ready).toBe(true);

      await agent.postUserMessage(
        new AgentInputUserMessage(
          `Use the write_file tool to write "${toolArgs.content}" to "${toolArgs.path}". ` +
            `Use that exact absolute path and return only the XML tool call and nothing else.`
        )
      );

      const filePath = toolArgs.path;
      const created = await waitForFile(filePath, 20000, 100);
      expect(created).toBe(true);

      const content = await fs.readFile(filePath, 'utf8');
      expect(content.trim()).toBe(toolArgs.content);
    } finally {
      if (agent.isRunning) {
        await agent.stop(5);
      }
      await llm.cleanup();
    }
  }, 120000);
});
