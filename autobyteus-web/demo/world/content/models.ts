/**
 * The demo's runtimes and their sample models (autobyteus-279, UI spec UXJ-005 Settings, VIS-021): every runtime the demo
 * offers has models that say they are samples (the demo makes no model request). Names follow the approved design
 * reference (`autobyteus-web-design` 78b51f73: `prototype/ios-demo/iosDemo.ts`, R5-01).
 */
export type DemoModel = Readonly<{
  runtimeKind: string;
  identifier: string;
  name: string;
  description: string;
  /** The model's settings in the node's parameter schema (the thinking settings of the reasoning model); null for none. */
  configSchema: Record<string, unknown> | null;
  recommended: boolean;
}>;

export const DEMO_PROVIDER = { id: 'demo', name: 'Demo' } as const;

const SAMPLE = 'A sample model. Its answers are scripted.';
const THINKING_SCHEMA = {
  parameters: [{
    name: 'reasoning_effort', type: 'string', title: 'Reasoning effort', description: 'How long the sample model thinks before it answers.',
    required: false, default_value: 'medium', enum_values: ['low', 'medium', 'high'],
  }],
};

/** The runtimes the demo offers, in the order the node lists them. */
export const DEMO_RUNTIME_KINDS = ['autobyteus', 'codex_app_server', 'claude_agent_sdk'] as const;

export const DEMO_MODELS: readonly DemoModel[] = [
  { runtimeKind: 'autobyteus', identifier: 'demo/sample-model', name: 'Sample model', description: SAMPLE, configSchema: null, recommended: true },
  { runtimeKind: 'autobyteus', identifier: 'demo/sample-reasoning-model', name: 'Sample reasoning model', description: 'A sample model with thinking settings. Its answers are scripted.', configSchema: THINKING_SCHEMA, recommended: false },
  { runtimeKind: 'codex_app_server', identifier: 'demo/sample-codex-model', name: 'Sample Codex model', description: SAMPLE, configSchema: null, recommended: true },
  { runtimeKind: 'codex_app_server', identifier: 'demo/sample-codex-mini', name: 'Sample Codex mini', description: SAMPLE, configSchema: null, recommended: false },
  { runtimeKind: 'codex_app_server', identifier: 'demo/sample-codex-fast', name: 'Sample Codex fast', description: SAMPLE, configSchema: null, recommended: false },
  { runtimeKind: 'claude_agent_sdk', identifier: 'demo/sample-claude-model', name: 'Sample Claude model', description: SAMPLE, configSchema: null, recommended: true },
];

export const demoModelsOf = (runtimeKind: string): DemoModel[] => DEMO_MODELS.filter((model) => model.runtimeKind === runtimeKind);

export const demoModel = (runtimeKind: string, identifier: string): DemoModel | null =>
  DEMO_MODELS.find((model) => model.runtimeKind === runtimeKind && model.identifier === identifier) ?? null;
