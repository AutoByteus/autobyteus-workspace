import { expect, it } from 'vitest';
import { nativeModelCapacity } from '../../../src/llm-management/services/native-model-capacity.js';

it('requires verified positive native capacity rather than inferred identity or input/compaction budgets', () => {
  expect(nativeModelCapacity({ max_context_tokens: 200000, max_input_tokens: 100000, resolved_model_metadata: null } as any)).toBeNull();
  expect(nativeModelCapacity({ active_context_tokens: 100000, resolved_model_metadata: { maxContextTokens: { value: 200000, source: { kind: 'live' } } } } as any)).toBe(100000);
  expect(nativeModelCapacity({ active_context_tokens: 0, resolved_model_metadata: { maxContextTokens: { value: 200000, source: { kind: 'live' } } } } as any)).toBeNull();
  expect(nativeModelCapacity({ active_context_tokens: 300000, resolved_model_metadata: { maxContextTokens: { value: 200000, source: { kind: 'static_definition' } } } } as any)).toBeNull();
});
