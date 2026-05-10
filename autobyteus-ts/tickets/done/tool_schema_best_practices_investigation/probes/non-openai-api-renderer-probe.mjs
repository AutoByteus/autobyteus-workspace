const root = 'file:///Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-ts-tool-schema-best-practices/autobyteus-ts/dist/';
const { Message, MessageRole, ToolCallPayload, ToolResultPayload } = await import(root + 'llm/utils/messages.js');
const { OpenAIChatRenderer } = await import(root + 'llm/prompt-renderers/openai-chat-renderer.js');
const { GeminiPromptRenderer } = await import(root + 'llm/prompt-renderers/gemini-prompt-renderer.js');
const { OllamaPromptRenderer } = await import(root + 'llm/prompt-renderers/ollama-prompt-renderer.js');
const { AnthropicPromptRenderer } = await import(root + 'llm/prompt-renderers/anthropic-prompt-renderer.js');
const { MistralPromptRenderer } = await import(root + 'llm/prompt-renderers/mistral-prompt-renderer.js');
const { OpenAIResponsesRenderer } = await import(root + 'llm/prompt-renderers/openai-responses-renderer.js');

const messages = [
  new Message(MessageRole.USER, 'inspect'),
  new Message(MessageRole.ASSISTANT, {
    content: null,
    tool_payload: new ToolCallPayload([
      { id: 'call_1', name: 'run_bash', arguments: { command: 'pwd' } },
    ]),
  }),
  new Message(MessageRole.TOOL, {
    tool_payload: new ToolResultPayload('call_1', 'run_bash', { stdout: '/tmp\n' }),
  }),
];

const providers = [
  {
    provider: 'openai-compatible-chat',
    renderer: new OpenAIChatRenderer(),
    expectedNativeShape: 'assistant.tool_calls followed by role=tool/tool_call_id',
    isNativeShape: (rendered) => rendered.some((m) => m.role === 'assistant' && Array.isArray(m.tool_calls)) && rendered.some((m) => m.role === 'tool' && m.tool_call_id),
  },
  {
    provider: 'gemini',
    renderer: new GeminiPromptRenderer(),
    expectedNativeShape: 'model part=functionCall followed by functionResponse part (role user/tool depending SDK case)',
    isNativeShape: (rendered) => JSON.stringify(rendered).includes('functionCall') && JSON.stringify(rendered).includes('functionResponse'),
  },
  {
    provider: 'ollama',
    renderer: new OllamaPromptRenderer(),
    expectedNativeShape: 'assistant.tool_calls followed by role=tool/tool_name/content',
    isNativeShape: (rendered) => rendered.some((m) => m.role === 'assistant' && Array.isArray(m.tool_calls)) && rendered.some((m) => m.role === 'tool' && m.tool_name),
  },
  {
    provider: 'anthropic',
    renderer: new AnthropicPromptRenderer(),
    expectedNativeShape: 'assistant content block type=tool_use followed by user content block type=tool_result',
    isNativeShape: (rendered) => JSON.stringify(rendered).includes('"type":"tool_use"') && JSON.stringify(rendered).includes('"type":"tool_result"'),
  },
  {
    provider: 'mistral',
    renderer: new MistralPromptRenderer(),
    expectedNativeShape: 'assistant.tool_calls followed by role=tool/name/tool_call_id/content',
    isNativeShape: (rendered) => rendered.some((m) => m.role === 'assistant' && Array.isArray(m.tool_calls)) && rendered.some((m) => m.role === 'tool' && m.tool_call_id),
  },
  {
    provider: 'openai-responses',
    renderer: new OpenAIResponsesRenderer(),
    expectedNativeShape: 'Responses input items: function_call output item preserved then function_call_output item with call_id/output',
    isNativeShape: (rendered) => JSON.stringify(rendered).includes('function_call_output') || JSON.stringify(rendered).includes('"type":"function_call"'),
  },
];

const results = [];
for (const provider of providers) {
  const rendered = await provider.renderer.render(messages);
  const serialized = JSON.stringify(rendered);
  results.push({
    provider: provider.provider,
    expectedNativeShape: provider.expectedNativeShape,
    nativeShapeObserved: provider.isNativeShape(rendered),
    containsLegacyToolCallText: serialized.includes('[TOOL_CALL]'),
    containsLegacyToolResultText: serialized.includes('[TOOL_RESULT]'),
    rendered,
  });
}

console.log(JSON.stringify({
  probe: 'non-openai-api-renderer-probe',
  generatedAt: new Date().toISOString(),
  summary: results.map(({ provider, nativeShapeObserved, containsLegacyToolCallText, containsLegacyToolResultText }) => ({
    provider,
    nativeShapeObserved,
    containsLegacyToolCallText,
    containsLegacyToolResultText,
  })),
  results,
}, null, 2));
