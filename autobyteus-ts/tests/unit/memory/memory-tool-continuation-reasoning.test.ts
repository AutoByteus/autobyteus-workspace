import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { LLMRequestAssembler } from '../../../src/agent/llm-request-assembler.js';
import { ToolResultEvent } from '../../../src/agent/events/agent-events.js';
import { ToolInvocation } from '../../../src/agent/tool-invocation.js';
import { DeepSeekChatRenderer } from '../../../src/llm/prompt-renderers/deepseek-chat-renderer.js';
import { OpenAIChatRenderer } from '../../../src/llm/prompt-renderers/openai-chat-renderer.js';
import { MessageRole, ToolCallPayload } from '../../../src/llm/utils/messages.js';
import { MemoryManager } from '../../../src/memory/memory-manager.js';
import { FileMemoryStore } from '../../../src/memory/store/file-store.js';

const makeTempDir = () => fs.mkdtempSync(path.join(os.tmpdir(), 'memory-tool-continuation-reasoning-'));

describe('memory-to-render tool continuation reasoning spine', () => {
  it('preserves assistant content and reasoning while default and DeepSeek renderers gate emission', async () => {
    const tempDir = makeTempDir();
    try {
      const store = new FileMemoryStore(tempDir, 'agent_reasoning_continuation');
      const manager = new MemoryManager({ store });
      const turnId = manager.startTurn();
      const invocation = new ToolInvocation('run_bash', { command: 'pwd' }, 'call_1', turnId);

      manager.ingestToolIntents([invocation], turnId, {
        assistantContent: 'I will inspect the current directory.',
        assistantReasoning: 'Need the workspace path before answering.'
      });
      manager.ingestToolResult(
        new ToolResultEvent('run_bash', { stdout: '/tmp/project\n' }, 'call_1', undefined, { command: 'pwd' }, turnId),
        turnId
      );

      const snapshotMessages = manager.getWorkingContextMessages();
      expect(snapshotMessages).toHaveLength(2);
      expect(snapshotMessages[0].role).toBe(MessageRole.ASSISTANT);
      expect(snapshotMessages[0].content).toBe('I will inspect the current directory.');
      expect(snapshotMessages[0].reasoning_content).toBe('Need the workspace path before answering.');
      expect(snapshotMessages[0].tool_payload).toBeInstanceOf(ToolCallPayload);

      const defaultRequest = await new LLMRequestAssembler(
        manager,
        new OpenAIChatRenderer()
      ).prepareToolContinuationRequest(turnId);
      const defaultRendered = defaultRequest.renderedPayload as any[];

      expect(defaultRendered[0]).toMatchObject({
        role: 'assistant',
        content: 'I will inspect the current directory.',
        tool_calls: [
          {
            id: 'call_1',
            type: 'function',
            function: {
              name: 'run_bash',
              arguments: JSON.stringify({ command: 'pwd' })
            }
          }
        ]
      });
      expect(defaultRendered[0]).not.toHaveProperty('reasoning_content');

      const deepSeekRequest = await new LLMRequestAssembler(
        manager,
        new DeepSeekChatRenderer()
      ).prepareToolContinuationRequest(turnId);
      const deepSeekRendered = deepSeekRequest.renderedPayload as any[];

      expect(deepSeekRendered[0]).toMatchObject({
        role: 'assistant',
        content: 'I will inspect the current directory.',
        reasoning_content: 'Need the workspace path before answering.',
        tool_calls: [
          {
            id: 'call_1',
            type: 'function',
            function: {
              name: 'run_bash',
              arguments: JSON.stringify({ command: 'pwd' })
            }
          }
        ]
      });
      expect(deepSeekRendered[1]).toMatchObject({
        role: 'tool',
        tool_call_id: 'call_1',
        content: JSON.stringify({ stdout: '/tmp/project\n' })
      });
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
