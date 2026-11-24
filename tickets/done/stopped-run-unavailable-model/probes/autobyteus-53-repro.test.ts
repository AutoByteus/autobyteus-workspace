// TEMPORARY reproduction for autobyteus-53 (Solution Designer). Not to be committed; removed after the run.
import { describe, expect, it } from 'vitest';
import { RuntimeKind } from '../../../src/runtime-management/runtime-kind-enum.js';
import { RunModelSelectionService } from '../../../src/llm-management/services/run-model-selection-service.js';
import { NativeModelCapacityService } from '../../../src/llm-management/services/native-model-capacity.js';

// LM Studio-style offered model with a live (verified) context capacity.
const offered = (id: string, maxContextTokens: number) => ({
  model_identifier: id, config_schema: null, provider_name: 'LM Studio', display_name: id, canonical_name: id,
  resolved_model_metadata: { maxContextTokens: { value: maxContextTokens, source: { kind: 'live' } } },
  active_context_tokens: null,
});
// On-demand loader stub (constructor arg since autobyteus-500 SR-015): never 'unreadable'.
const onDemand = { loadOnDemandModel: async () => 'loaded' as any };
const catalog = (rows: any[]) => ({ runtimeModelSelectionCatalog: async () => ({ offeredModels: rows,
  findExactCurrent: (id: string) => rows.find((row) => row.model_identifier === id) ?? null }) });
// SR-001..SR-004 probe; updated 2026-11-19 for the new constructor.

describe('autobyteus-53 reproduction on current origin/personal', () => {
  const ctx = (runtimeKind: RuntimeKind) => ({ runtimeKind, currentModelIdentifier: 'qwen-removed@lmstudio', workspaceRootPath: '/w' });
  const rows = [offered('qwen-big@lmstudio', 131072), offered('qwen-small@lmstudio', 32768)];

  it('native AutoByteus run whose model is gone: chooser empty, every switch refused', async () => {
    const service = new RunModelSelectionService(catalog(rows) as any, onDemand as any, new NativeModelCapacityService());
    const options = await service.listOptions(ctx(RuntimeKind.AUTOBYTEUS));
    console.log('NATIVE options:', JSON.stringify({ currentModel: options.currentModel, replacements: options.replacements.map((r) => r.llmModelIdentifier), unavailableReason: options.unavailableReason }));
    const result = await service.validate({ context: ctx(RuntimeKind.AUTOBYTEUS), selection: { llmModelIdentifier: 'qwen-big@lmstudio', llmConfig: null } });
    console.log('NATIVE validate big:', JSON.stringify(result));
    expect(options.replacements).toEqual([]);
    expect(result.kind).toBe('invalid');
  });

  it('external runtime whose model is gone: replacements offered and accepted (control)', async () => {
    const service = new RunModelSelectionService(catalog(rows) as any, onDemand as any, new NativeModelCapacityService());
    const options = await service.listOptions(ctx(RuntimeKind.CODEX_APP_SERVER));
    const result = await service.validate({ context: ctx(RuntimeKind.CODEX_APP_SERVER), selection: { llmModelIdentifier: 'qwen-big@lmstudio', llmConfig: null } });
    console.log('EXTERNAL options:', JSON.stringify(options.replacements.map((r) => r.llmModelIdentifier)), 'validate:', result.kind);
    expect(options.replacements.length).toBe(2);
    expect(result.kind).toBe('valid');
  });

  it('native run, fresh selection after a runtime switch (currentModelIdentifier null): accepted', async () => {
    const service = new RunModelSelectionService(catalog(rows) as any, onDemand as any, new NativeModelCapacityService());
    const result = await service.validate({ context: { runtimeKind: RuntimeKind.AUTOBYTEUS, currentModelIdentifier: null, workspaceRootPath: '/w' } as any,
      selection: { llmModelIdentifier: 'qwen-small@lmstudio', llmConfig: null } });
    console.log('NATIVE fresh (runtime switch) validate:', result.kind);
    expect(result.kind).toBe('valid');
  });
});
