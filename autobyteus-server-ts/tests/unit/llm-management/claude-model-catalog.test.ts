import { describe, expect, it, vi } from 'vitest';
import { ClaudeModelCatalog } from '../../../src/llm-management/services/claude-model-catalog.js';

const row = (id: string, canonical: string, alias: string | null = null, recommended = false) => ({
  model_identifier: id, canonical_name: canonical, display_name: id, provider_name: 'Anthropic',
  selection_presentation: { recommended, aliasOfModelIdentifier: alias },
});

describe('ClaudeModelCatalog normalized selection view', () => {
  it('filters only a proven redundant default while preserving exact current resolution', async () => {
    const raw = [row('default', 'claude-opus-5-5[1m]', 'opus[1m]'),
      row('opus[1m]', 'claude-opus-5-5[1m]', null, true), row('sonnet', 'claude-sonnet-5')];
    const listModels = vi.fn().mockResolvedValue(raw);
    const view = await new ClaudeModelCatalog({ listModels } as never).selectionCatalog();
    expect(view.offeredModels.map((model) => model.model_identifier)).toEqual(['opus[1m]', 'sonnet']);
    expect(view.findExactCurrent('default')).toBe(raw[0]);
    expect(view.findExactCurrent('missing')).toBeNull();
    expect(listModels).toHaveBeenCalledOnce();
  });

  it('keeps default when no distinct listed sibling is proven', async () => {
    const raw = [row('default', 'claude-opus-5-5[1m]', null, true), row('sonnet', 'claude-sonnet-5')];
    const view = await new ClaudeModelCatalog({ listModels: async () => raw } as never).selectionCatalog();
    expect(view.offeredModels.map((model) => model.model_identifier)).toEqual(['default', 'sonnet']);
  });

  it('does not fold a separate long-context ID by canonical display similarity', async () => {
    const raw = [row('default', 'claude-fable-5-1', 'fable'),
      row('fable', 'claude-fable-5-1', null, true), row('fable[1m]', 'claude-fable-5-1')];
    const view = await new ClaudeModelCatalog({ listModels: async () => raw } as never).selectionCatalog();
    expect(view.offeredModels.map((model) => model.model_identifier)).toEqual(['fable', 'fable[1m]']);
  });
});
