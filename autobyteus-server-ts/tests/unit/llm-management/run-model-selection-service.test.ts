import { describe, expect, it, vi } from 'vitest';
import { RuntimeKind } from '../../../src/runtime-management/runtime-kind-enum.js';
import { RunModelSelectionService } from '../../../src/llm-management/services/run-model-selection-service.js';
import { AgyDiscoveryError } from '../../../src/runtime-management/antigravity-cli-capability.js';
const context = { runtimeKind: RuntimeKind.CODEX_APP_SERVER, currentModelIdentifier: 'current', workspaceRootPath: '/workspace' };
const selection = { llmModelIdentifier: 'target', llmConfig: null };
const known = (tokens: number) => ({ kind: 'known', tokens, source: 'provider' });
const harness = (current: unknown = known(128000), target: unknown = known(128000)) => {
  const catalog = { listLlmModels: vi.fn().mockResolvedValue(['current', 'target'].map(model_identifier => ({ model_identifier, config_schema: null }))) };
  const capacity = { resolveMany: vi.fn().mockResolvedValue({ current, target }) };
  return { service: new RunModelSelectionService(catalog, capacity), catalog, capacity };
};
describe('RunModelSelectionService', () => {
  it('retains only a safe AGY discovery diagnostic, distinct from a valid missing slug', async () => {
    const { service, catalog } = harness();
    const agy = { runtimeKind: RuntimeKind.ANTIGRAVITY_CLI, currentModelIdentifier: 'target', workspaceRootPath: '/workspace' };
    catalog.listLlmModels.mockRejectedValue(new AgyDiscoveryError('AGY_MODEL_DISCOVERY_TIMEOUT'));
    await expect(service.validate({ context: agy, selection })).resolves.toEqual({ kind: 'model_unavailable',
      catalogDiagnostic: { code: 'AGY_MODEL_DISCOVERY_TIMEOUT', message: 'Antigravity model discovery timed out; check the CLI and retry.' } });
    catalog.listLlmModels.mockRejectedValue(new Error('secret /private/token'));
    await expect(service.validate({ context: agy, selection })).resolves.toMatchObject({ kind: 'model_unavailable',
      catalogDiagnostic: { code: 'AGY_MODEL_DISCOVERY_FAILED' } });
    await expect(service.validate({ context, selection })).resolves.toEqual({ kind: 'model_unavailable' });
    catalog.listLlmModels.mockResolvedValue([]);
    await expect(service.validate({ context: agy, selection })).resolves.toEqual({ kind: 'model_unavailable' });
  });

  it.each([128000, 272000])('accepts a verified equal/larger context %s', async target => {
    const { service } = harness(known(128000), known(target));
    await expect(service.validate({ context, selection })).resolves.toEqual({ kind: 'valid', selection });
    expect((await service.listOptions(context)).replacements).toEqual([{ llmModelIdentifier: 'target', contextTokens: target }]);
  });
  it.each([0, -1, 128000.1, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, 127999])('rejects invalid or decreasing capacity %s', async target => {
    const { service } = harness(known(128000), known(target));
    expect((await service.validate({ context, selection })).kind).toBe('invalid');
    expect((await service.listOptions(context)).replacements).toEqual([]);
  });
  it.each(['current', 'target'])('requires verified %s metadata', async missing => {
    const { service } = harness(missing === 'current' ? { kind: 'unknown' } : known(128000), missing === 'target' ? { kind: 'unknown' } : known(128000));
    expect((await service.validate({ context, selection })).kind).toBe('invalid');
  });
  it('does not discover replacement capacity for same-model settings', async () => {
    const { service, capacity } = harness();
    capacity.resolveMany.mockRejectedValue(new Error('offline'));
    await expect(service.validate({ context, selection: { ...selection, llmModelIdentifier: 'current' } })).resolves.toMatchObject({ kind: 'valid' });
    expect(capacity.resolveMany).not.toHaveBeenCalled();
  });
  it('uses the fresh saved baseline and refreshes evidence after advisory options', async () => {
    const { service, capacity } = harness(known(128000), known(272000));
    await service.listOptions(context);
    await expect(service.validate({ context, selection })).resolves.toMatchObject({ kind: 'valid' });
    await expect(service.validate({ context: { ...context, currentModelIdentifier: 'target' }, selection: { ...selection, llmModelIdentifier: 'current' } })).resolves.toMatchObject({ kind: 'invalid' });
    capacity.resolveMany.mockResolvedValue({ current: known(128000), target: known(64000) });
    await expect(service.validate({ context, selection })).resolves.toMatchObject({ kind: 'invalid' });
    expect(capacity.resolveMany).toHaveBeenCalledTimes(4);
  });
  it('does not compare input/output budgets, tokenizer or compression settings', async () => {
    const { service, catalog } = harness();
    catalog.listLlmModels.mockResolvedValue([{ model_identifier: 'current', max_input_tokens: 100000, max_output_tokens: 8000 },
      { model_identifier: 'target', max_input_tokens: 90000, max_output_tokens: 16000 }]);
    await expect(service.validate({ context, selection })).resolves.toMatchObject({ kind: 'valid' });
  });
  it('validates the target schema without silently transferring or filtering old keys', async () => {
    const { service, catalog } = harness();
    catalog.listLlmModels.mockResolvedValue([{ model_identifier: 'current' }, { model_identifier: 'target', config_schema: {
      properties: { effort: { type: 'string', enum: ['low','high'] }, budget: { type: 'integer', minimum: 1, maximum: 10 } }, required: ['effort'] } }]);
    await expect(service.validate({ context, selection: { ...selection, llmConfig: { effort: 'ultra', budget: 0, old: true } } })).resolves.toEqual({ kind: 'invalid', errors: [
      { path: 'llmConfig.effort', message: 'Value is not one of the supported options.' },
      { path: 'llmConfig.budget', message: 'Value must be at least 1.' },
      { path: 'llmConfig.old', message: 'Setting is not supported by the selected runtime and model.' },
    ] });
    await expect(service.validate({ context, selection })).resolves.toMatchObject({ kind: 'invalid' });
  });
  it('coalesces options for different saved models in the same runtime/workspace, but not across requests', async () => {
    const { service, catalog, capacity } = harness(known(128000), known(272000));
    const contexts = [context, { ...context, currentModelIdentifier: 'target' }];
    const [small, large] = await service.listOptionsMany(contexts);
    expect(small.replacements).toEqual([{ llmModelIdentifier: 'target', contextTokens: 272000 }]);
    expect(large.replacements).toEqual([]);
    expect(catalog.listLlmModels).toHaveBeenCalledTimes(1);
    expect(capacity.resolveMany).toHaveBeenCalledTimes(1);
    await service.listOptionsMany(contexts);
    expect(capacity.resolveMany).toHaveBeenCalledTimes(2);
    await service.listOptionsMany([context, { ...context, workspaceRootPath: '/different-profile' }]);
    expect(capacity.resolveMany).toHaveBeenCalledTimes(4);
  });

});
