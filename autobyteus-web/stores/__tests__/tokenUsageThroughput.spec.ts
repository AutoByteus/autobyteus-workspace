import { describe, expect, it } from 'vitest';
import { createTokenUsageThroughput } from '../tokenUsageThroughput';
import type { TokenUsageOutputThroughput } from '~/types/tokenUsageMeter';

const report = (outputThroughput: TokenUsageOutputThroughput | null, modelIdentifier: string | null = 'reported-model') => ({
  output_throughput: outputThroughput, model_identifier: modelIdentifier, model_value: 'model-value',
});

describe('newest TPS per exact AgentRun', () => {
  it('records the newest server-decided TPS with its reported model', () => {
    const meter = createTokenUsageThroughput();
    expect(meter.getRunTps('run')).toBeNull();
    meter.record('run', report({ method: 'generation', output_tokens: 1762, duration_ms: 16_940 }));
    expect(meter.getRunTps('run')).toEqual({ method: 'generation', outputTokens: 1762, durationMs: 16_940, model: 'reported-model' });
    meter.record('run', report({ method: 'end_to_end', output_tokens: 300, duration_ms: 4_000 }, null));
    expect(meter.getRunTps(' run ')).toEqual({ method: 'end_to_end', outputTokens: 300, durationMs: 4_000, model: 'model-value' });
  });

  it('keeps the shown value when a call has no TPS, and keeps runs apart', () => {
    const meter = createTokenUsageThroughput();
    meter.record('run', report({ method: 'generation', output_tokens: 1200, duration_ms: 10_000 }));
    meter.record('run', report(null));
    meter.record('run', { model_identifier: 'm', model_value: null });
    expect(meter.getRunTps('run')).toMatchObject({ outputTokens: 1200 });
    expect(meter.getRunTps('other')).toBeNull();
    expect(meter.getRunTps(null)).toBeNull();
  });
});
