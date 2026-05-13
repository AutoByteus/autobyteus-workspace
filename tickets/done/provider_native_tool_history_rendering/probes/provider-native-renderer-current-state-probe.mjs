import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const distPath = process.env.AUTOBYTEUS_TS_DIST
  ?? '/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-ts/dist';
if (!fs.existsSync(distPath)) {
  throw new Error(`dist path not found: ${distPath}`);
}
const root = pathToFileURL(path.resolve(distPath) + path.sep).href;
const { Message, MessageRole, ToolCallPayload, ToolResultPayload } = await import(root + 'llm/utils/messages.js');
const { OpenAIChatRenderer } = await import(root + 'llm/prompt-renderers/openai-chat-renderer.js');
const { GeminiPromptRenderer } = await import(root + 'llm/prompt-renderers/gemini-prompt-renderer.js');
const { OllamaPromptRenderer } = await import(root + 'llm/prompt-renderers/ollama-prompt-renderer.js');
const { AnthropicPromptRenderer } = await import(root + 'llm/prompt-renderers/anthropic-prompt-renderer.js');
const { MistralPromptRenderer } = await import(root + 'llm/prompt-renderers/mistral-prompt-renderer.js');
const { OpenAIResponsesRenderer } = await import(root + 'llm/prompt-renderers/openai-responses-renderer.js');

const messages = [
  new Message(MessageRole.SYSTEM, 'system prompt'),
  new Message(MessageRole.USER, 'inspect'),
  new Message(MessageRole.ASSISTANT, {
    content: null,
    tool_payload: new ToolCallPayload([
      { id: 'call_1', name: 'run_bash', arguments: { command: 'pwd' } },
    ]),
  }),
  new Message(MessageRole.TOOL, {
    content: null,
    tool_payload: new ToolResultPayload('call_1', 'run_bash', { stdout: '/tmp\n' }),
  }),
];

const checks = {
  'openai-compatible-chat': (r) => r.some((m) => m.role === 'assistant' && Array.isArray(m.tool_calls)) && r.some((m) => m.role === 'tool' && m.tool_call_id),
  gemini: (r) => JSON.stringify(r).includes('functionCall') && JSON.stringify(r).includes('functionResponse'),
  ollama: (r) => r.some((m) => m.role === 'assistant' && Array.isArray(m.tool_calls)) && r.some((m) => m.role === 'tool' && m.tool_name),
  anthropic: (r) => JSON.stringify(r).includes('"type":"tool_use"') && JSON.stringify(r).includes('"type":"tool_result"'),
  mistral: (r) => r.some((m) => m.role === 'assistant' && Array.isArray(m.tool_calls)) && r.some((m) => m.role === 'tool' && m.tool_call_id),
  'openai-responses': (r) => JSON.stringify(r).includes('function_call_output') || JSON.stringify(r).includes('"type":"function_call"'),
};

const renderers = [
  ['openai-compatible-chat', new OpenAIChatRenderer()],
  ['gemini', new GeminiPromptRenderer()],
  ['ollama', new OllamaPromptRenderer()],
  ['anthropic', new AnthropicPromptRenderer()],
  ['mistral', new MistralPromptRenderer()],
  ['openai-responses', new OpenAIResponsesRenderer()],
];

const results = [];
for (const [provider, renderer] of renderers) {
  const rendered = await renderer.render(messages);
  const serialized = JSON.stringify(rendered);
  results.push({
    provider,
    nativeShapeObserved: checks[provider](rendered),
    containsLegacyToolCallText: serialized.includes('[TOOL_CALL]'),
    containsLegacyToolResultText: serialized.includes('[TOOL_RESULT]'),
    rendered,
  });
}

console.log(JSON.stringify({
  generatedAt: new Date().toISOString(),
  distPath,
  distGitHead: process.env.AUTOBYTEUS_TS_DIST_GIT_HEAD ?? null,
  results,
}, null, 2));
