# Pruned by delivery (DR-001, 2026-10-07)

This is a copy of the temporary GROK_HOME used by the E2E-L2 minimal live probe. Only the evidence-relevant files are kept:
- `logs/unified.jsonl`, which holds the 429 `subscription:free-usage-exhausted` evidence
- `sessions/`
- `memtrace/`
- `config.toml`

Before commit, delivery removed:
- Grok CLI vendor content: `bundled/`, `docs/`, `README.md`
- The CLI identity and caches: `agent_id`, `models_cache.json`, `settings_cache.json`, `worktrees.db`
- Lock and metadata files

No `auth.json` or credential was present. The two `access_token` strings found by a secret scan were placeholders (`eyJhbGciOi...`) in Grok's bundled docs, which are now removed.
