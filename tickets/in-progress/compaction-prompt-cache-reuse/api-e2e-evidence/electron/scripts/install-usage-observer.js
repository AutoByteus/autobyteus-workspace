() => {
  // Read-only observer: copies TOKEN_USAGE_UPDATED and COMPACTION_* frames as the app reads MessageEvent.data. Does not alter data.
  if (window.__apcFrames) return { installed: 'already', count: window.__apcFrames.length };
  window.__apcFrames = [];
  const desc = Object.getOwnPropertyDescriptor(MessageEvent.prototype, 'data');
  const seen = new WeakSet();
  Object.defineProperty(MessageEvent.prototype, 'data', { configurable: true, get() {
    const value = desc.get.call(this);
    try {
      if (!seen.has(this) && typeof value === 'string' && (value.includes('TOKEN_USAGE_UPDATED') || value.includes('"COMPACTION_'))) {
        seen.add(this);
        const f = JSON.parse(value); const p = f.payload || {};
        window.__apcFrames.push({ at: Date.now(), type: f.type, ingestion: p.ingestion_kind ?? null, callId: p.llm_call_id ?? null,
          uncached: p.standard_input_tokens ?? null, read: p.cache_read_input_tokens ?? null, w1h: p.cache_creation_1h_input_tokens ?? null,
          out: p.reported_output_tokens ?? null, cost: p.estimated_api_total_cost ?? null, latestPrompt: p.latest_prompt_tokens ?? null,
          phase: p.phase ?? null, invocation: p.compaction_invocation_id ?? null, completion: p.completion_status ?? null, error: p.error_message ?? null });
      }
    } catch { /* observation only */ }
    return value;
  } });
  return { installed: true };
}
