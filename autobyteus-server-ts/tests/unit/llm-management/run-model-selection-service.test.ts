import { describe, expect, it, vi } from 'vitest';
import { RuntimeKind } from '../../../src/runtime-management/runtime-kind-enum.js';
import { RunModelSelectionService } from '../../../src/llm-management/services/run-model-selection-service.js';
import { AgyDiscoveryError } from '../../../src/runtime-management/antigravity-cli-capability.js';

const context = { runtimeKind: RuntimeKind.CODEX_APP_SERVER, currentModelIdentifier: 'current', workspaceRootPath: '/workspace' };
const selection = { llmModelIdentifier: 'target', llmConfig: null };
const harness = (current: number | null = 128000, target: number | null = 128000) => {
  const catalog = { listLlmModels: vi.fn().mockResolvedValue(['current', 'target'].map(model_identifier => ({ model_identifier, config_schema: null }))) };
  const nativeCapacity = { resolveMany: vi.fn().mockReturnValue({ current, target }) };
  return { service: new RunModelSelectionService(catalog, nativeCapacity), catalog, nativeCapacity };
};

describe('RunModelSelectionService', () => {
  it('retains only a safe AGY discovery diagnostic, distinct from a missing slug', async () => {
    const { service, catalog } = harness();
    const agy = { ...context, runtimeKind: RuntimeKind.ANTIGRAVITY_CLI };
    catalog.listLlmModels.mockRejectedValue(new AgyDiscoveryError('AGY_MODEL_DISCOVERY_TIMEOUT'));
    await expect(service.validate({ context: agy, selection })).resolves.toEqual({ kind: 'model_unavailable',
      catalogDiagnostic: { code: 'AGY_MODEL_DISCOVERY_TIMEOUT', message: 'Antigravity model discovery timed out; check the CLI and retry.' } });
    catalog.listLlmModels.mockRejectedValue(new Error('secret /private/token'));
    await expect(service.validate({ context: agy, selection })).resolves.toMatchObject({ kind: 'model_unavailable',
      catalogDiagnostic: { code: 'AGY_MODEL_DISCOVERY_FAILED' } });
    await expect(service.validate({ context, selection })).resolves.toEqual({ kind: 'model_unavailable' });
    expect((await service.listOptions(context)).unavailableReason).toContain('catalog is unavailable');
    catalog.listLlmModels.mockResolvedValue([]);
    await expect(service.validate({ context: agy, selection })).resolves.toEqual({ kind: 'model_unavailable' });
  });

  it.each([RuntimeKind.CLAUDE_AGENT_SDK, RuntimeKind.CODEX_APP_SERVER, RuntimeKind.ANTIGRAVITY_CLI])(
    'offers and accepts any current %s catalog replacement without reading capacity', async runtimeKind => {
      const { service, nativeCapacity } = harness(null, null);
      const scoped = { ...context, runtimeKind };
      expect((await service.listOptions(scoped)).replacements).toEqual([{ llmModelIdentifier: 'target' }]);
      await expect(service.validate({ context: scoped, selection })).resolves.toEqual({ kind: 'valid', selection });
      expect(nativeCapacity.resolveMany).not.toHaveBeenCalled();
    });

  it.each([128000, 272000])('accepts native verified equal/larger context %s', async target => {
    const { service } = harness(128000, target);
    const native = { ...context, runtimeKind: RuntimeKind.AUTOBYTEUS };
    await expect(service.validate({ context: native, selection })).resolves.toEqual({ kind: 'valid', selection });
    expect((await service.listOptions(native)).replacements).toEqual([{ llmModelIdentifier: 'target' }]);
  });
  it.each([null, 127999])('rejects native unknown or decreasing target %s', async target => {
    const { service } = harness(128000, target);
    const native = { ...context, runtimeKind: RuntimeKind.AUTOBYTEUS };
    expect((await service.validate({ context: native, selection })).kind).toBe('invalid');
    expect((await service.listOptions(native)).replacements).toEqual([]);
  });
  it('keeps native same-model settings editable without capacity evidence', async () => {
    const { service, nativeCapacity } = harness(null, null);
    const native = { ...context, runtimeKind: RuntimeKind.AUTOBYTEUS };
    await expect(service.validate({ context: native, selection: { ...selection, llmModelIdentifier: 'current' } })).resolves.toMatchObject({ kind: 'valid' });
    expect(nativeCapacity.resolveMany).not.toHaveBeenCalled();
  });
  it('uses fresh catalog and saved baseline on Save, not earlier option evidence', async () => {
    const { service, catalog, nativeCapacity } = harness(128000, 272000);
    const native = { ...context, runtimeKind: RuntimeKind.AUTOBYTEUS };
    await service.listOptions(native);
    await expect(service.validate({ context: native, selection })).resolves.toMatchObject({ kind: 'valid' });
    nativeCapacity.resolveMany.mockReturnValue({ current: 128000, target: 64000 });
    await expect(service.validate({ context: native, selection })).resolves.toMatchObject({ kind: 'invalid' });
    catalog.listLlmModels.mockResolvedValue([{ model_identifier: 'current', config_schema: null }]);
    await expect(service.validate({ context, selection })).resolves.toEqual({ kind: 'model_unavailable' });
    expect(catalog.listLlmModels).toHaveBeenCalledTimes(4);
  });
  it('validates target schema for external models', async () => {
    const { service, catalog } = harness();
    catalog.listLlmModels.mockResolvedValue([{ model_identifier: 'current' }, { model_identifier: 'target', config_schema: {
      properties: { effort: { type: 'string', enum: ['low','high'] } }, required: ['effort'] } }]);
    await expect(service.validate({ context, selection: { ...selection, llmConfig: { effort: 'ultra', old: true } } })).resolves.toEqual({ kind: 'invalid', errors: [
      { path: 'llmConfig.effort', message: 'Value is not one of the supported options.' },
      { path: 'llmConfig.old', message: 'Setting is not supported by the selected runtime and model.' },
    ] });
  });
  it('validates mixed-runtime scopes independently against fresh catalog evidence', async () => {
    const { service, catalog, nativeCapacity } = harness(128000, 64000);
    const native = { ...context, runtimeKind: RuntimeKind.AUTOBYTEUS };
    const results = await service.validateMany([
      { context, selection },
      { context: native, selection },
    ]);
    expect(results.map((result) => result.kind)).toEqual(['valid', 'invalid']);
    expect(catalog.listLlmModels).toHaveBeenCalledTimes(2);
    expect(nativeCapacity.resolveMany).toHaveBeenCalledTimes(1);
  });

  it('coalesces catalog reads across configured scopes only within a request', async () => {
    const { service, catalog, nativeCapacity } = harness(128000, 272000);
    const contexts = [context, { ...context, currentModelIdentifier: 'target' }];
    const [first, second] = await service.listOptionsMany(contexts);
    expect(first.replacements).toEqual([{ llmModelIdentifier: 'target' }]);
    expect(second.replacements).toEqual([{ llmModelIdentifier: 'current' }]);
    expect(catalog.listLlmModels).toHaveBeenCalledTimes(1);
    expect(nativeCapacity.resolveMany).not.toHaveBeenCalled();
    await service.listOptionsMany(contexts);
    expect(catalog.listLlmModels).toHaveBeenCalledTimes(2);
    await service.listOptionsMany([context, { ...context, workspaceRootPath: '/different-profile' }]);
    expect(catalog.listLlmModels).toHaveBeenCalledTimes(4);
  });
});
