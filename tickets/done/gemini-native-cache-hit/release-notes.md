# Release Notes — Truthful AGY Cache Hits and Gemini 3.1 Pro Prices

Status: prepared before user verification. Whether this ships in a release, and with which version, is decided at finalization.

## Fixed
- **Token Meter for Antigravity (AGY) runs.** AGY reports `input_tokens` without its cache reads, but AutoByteus counted them as if the reads were included. As a result, AGY runs showed a cache hit near 99%, 0 cache misses and too little input. Some AGY turns were also dropped as "regressed". Now:
  - gross input = input + cache reads;
  - cache miss = input;
  - the hit rate is on the same basis as native Gemini runs, so the two can be compared directly.

  This applies to every model run through AGY.
- **Gemini 3.1 Pro Preview prices** now match Google's official prices, per 1M tokens:
  - prompts up to 200K: input 2.00, cached input 0.20, output 12.00;
  - prompts over 200K: input 4.00, cached input 0.40, output 18.00.

  Earlier, every component was overpriced.

## Notes
- Native Gemini caching itself was not changed: its request prefix was already cache-friendly. The earlier gap against AGY came mainly from AGY's numbers being inflated.
- Existing records are not rewritten. AGY runs and 3.1 Pro costs recorded before this release keep their old values; new usage is recorded correctly. No reset or data migration is needed.
