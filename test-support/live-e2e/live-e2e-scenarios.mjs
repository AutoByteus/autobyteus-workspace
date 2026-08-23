export const liveE2eScenarios = Object.freeze({
  'openai.llm': Object.freeze({
    operation: 'llm',
    providerId: 'OPENAI',
    requiredSecretId: 'provider.openai.api-key',
    model: 'gpt-5.4-mini',
  }),
  'openai.agent-flow': Object.freeze({
    operation: 'agent-flow',
    providerId: 'OPENAI',
    requiredSecretId: 'provider.openai.api-key',
    model: 'gpt-5.4-mini',
  }),
  'deepseek.llm': Object.freeze({
    operation: 'llm',
    providerId: 'DEEPSEEK',
    requiredSecretId: 'provider.deepseek.api-key',
    model: 'deepseek-v4-flash',
  }),
  'deepseek.agent-flow': Object.freeze({
    operation: 'agent-flow',
    providerId: 'DEEPSEEK',
    requiredSecretId: 'provider.deepseek.api-key',
    model: 'deepseek-v4-flash',
  }),
  'deepseek.compaction-agent-flow': Object.freeze({
    operation: 'compaction-agent-flow',
    providerId: 'DEEPSEEK',
    requiredSecretId: 'provider.deepseek.api-key',
    model: 'deepseek-v4-flash',
  }),
  'lmstudio.qwen36.compaction-agent-flow': Object.freeze({
    operation: 'compaction-agent-flow',
    providerId: 'LMSTUDIO',
    requiredSecretId: null,
    model: 'qwen/qwen3.6-35b-a3b',
  }),
  'serper.search': Object.freeze({
    operation: 'search',
    providerId: 'serper',
    requiredSecretId: 'search.serper.api-key',
  }),
  'openai.audio': Object.freeze({
    operation: 'audio',
    providerId: 'OPENAI',
    requiredSecretId: 'provider.openai.api-key',
    model: 'gpt-4o-mini-tts',
  }),
  'openai.image': Object.freeze({
    operation: 'image',
    providerId: 'OPENAI',
    requiredSecretId: 'provider.openai.api-key',
    model: 'gpt-image-2',
  }),
  'gemini.vertex-express.llm': Object.freeze({
    operation: 'llm',
    providerId: 'GEMINI',
    requiredSecretId: 'provider.google.vertex-express.api-key',
    geminiMode: 'VERTEX_EXPRESS',
    model: 'gemini-3.7-flash',
  }),
  'gemini.vertex-express.audio': Object.freeze({
    operation: 'audio',
    providerId: 'GEMINI',
    requiredSecretId: 'provider.google.vertex-express.api-key',
    geminiMode: 'VERTEX_EXPRESS',
    model: 'gemini-3.1-flash-tts-preview',
  }),
  'gemini.vertex-express.image': Object.freeze({
    operation: 'image',
    providerId: 'GEMINI',
    requiredSecretId: 'provider.google.vertex-express.api-key',
    geminiMode: 'VERTEX_EXPRESS',
    model: 'gemini-3-pro-image',
  }),
  'gemini.ai-studio.llm': Object.freeze({
    operation: 'llm',
    providerId: 'GEMINI',
    requiredSecretId: 'provider.google.ai-studio.api-key',
    geminiMode: 'AI_STUDIO',
    model: 'gemini-3.7-flash',
  }),
  'anthropic.llm': Object.freeze({
    operation: 'llm',
    providerId: 'ANTHROPIC',
    requiredSecretId: 'provider.anthropic.api-key',
    model: 'claude-sonnet-4.6',
  }),
  'anthropic.claude-agent-sdk-api-key': Object.freeze({
    operation: 'claude-api-key',
    providerId: 'ANTHROPIC',
    requiredSecretId: 'provider.anthropic.api-key',
    model: 'claude-sonnet-4-6',
  }),
  'autobyteus.remote-llm': Object.freeze({
    operation: 'autobyteus-llm',
    providerId: 'AUTOBYTEUS',
    requiredSecretId: 'provider.autobyteus.api-key',
    hosts: Object.freeze(['https://api.autobyteus.com']),
  }),
  'autobyteus.remote-audio': Object.freeze({
    operation: 'autobyteus-audio',
    providerId: 'AUTOBYTEUS',
    requiredSecretId: 'provider.autobyteus.api-key',
    hosts: Object.freeze(['https://api.autobyteus.com']),
  }),
  'autobyteus.remote-image': Object.freeze({
    operation: 'autobyteus-image',
    providerId: 'AUTOBYTEUS',
    requiredSecretId: 'provider.autobyteus.api-key',
    hosts: Object.freeze(['https://api.autobyteus.com']),
  }),
});

export const selectedLiveE2eScenarioIds = () => {
  const raw = process.env.AUTOBYTEUS_LIVE_E2E_SCENARIOS?.trim();
  if (!raw) return Object.keys(liveE2eScenarios);
  const requested = raw.split(',').map((entry) => entry.trim()).filter(Boolean);
  const unknown = requested.filter((id) => !liveE2eScenarios[id]);
  if (unknown.length > 0) {
    throw new Error(`LIVE_E2E_SCENARIO_UNKNOWN:${unknown.join(',')}`);
  }
  return requested;
};
