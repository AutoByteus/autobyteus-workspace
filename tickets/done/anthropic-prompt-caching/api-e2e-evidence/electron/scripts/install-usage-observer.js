() => {
  // Read-only observer: copies TOKEN_USAGE_UPDATED frames as the app reads MessageEvent.data. Does not alter data.
  if (window.__apcUsage) return { installed: 'already', count: window.__apcUsage.length };
  window.__apcUsage = [];
  const desc = Object.getOwnPropertyDescriptor(MessageEvent.prototype, 'data');
  const seen = new WeakSet();
  Object.defineProperty(MessageEvent.prototype, 'data', { configurable: true, get() {
    const value = desc.get.call(this);
    try {
      if (!seen.has(this) && typeof value === 'string' && value.includes('TOKEN_USAGE_UPDATED')) {
        seen.add(this);
        const f = JSON.parse(value); const p = f.payload || {};
        window.__apcUsage.push({ at: Date.now(), key: p.idempotency_key, turn: p.turn_id, model: p.model_identifier,
          uncached: p.standard_input_tokens ?? null, read: p.cache_read_input_tokens ?? null,
          w1h: p.cache_creation_1h_input_tokens ?? null, w5m: p.cache_creation_5m_input_tokens ?? null,
          out: p.reported_output_tokens ?? p.accounting_output_tokens ?? null, cost: p.estimated_api_total_cost ?? null, cacheState: p.cache_state });
      }
    } catch { /* observation only */ }
    return value;
  } });
  return { installed: true };
}
