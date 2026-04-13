## Improvements
- Added the real production compaction path in the TypeScript runtime: default `AgentFactory` wiring now performs one internal LLM-backed compaction summarization step before the next LLM leg instead of relying on test-only seams.
- Added operator-facing compaction controls in Settings and server env/config for trigger ratio, dedicated compaction model selection, effective context override, and detailed compaction diagnostics.
- Added visible compaction lifecycle status in the workspace so active agent and focused team-member views show banner updates such as queued, compacting, completed, or failed.
- Added long-running local-provider transport hardening for LM Studio and Ollama so large local prompt-processing windows no longer rely on the default idle timeout path.
- Redesigned compaction around deterministic planner/frontier/store ownership: `CompactionWindowPlanner` now plans explicit settled-vs-frontier interaction blocks, `PendingCompactionExecutor` drives pre-dispatch execution, and raw-trace prune/archive is store-owned by trace ID.
- Added schema-`3` current-only working-context snapshot rebuild behavior so stale caches are rebuilt through the same planner/frontier snapshot path instead of reusing legacy payload layouts.
- Added typed semantic-memory steady state with explicit categories (`critical_issue`, `unresolved_work`, `user_preference`, `durable_fact`, `important_artifact`), deterministic normalization, salience-first retrieval, and category-priority snapshot rendering.
- Added current-schema-only semantic-memory reset/rebuild enforcement: startup now runs `CompactedMemorySchemaGate` before restore and records manifest v2 reset metadata via `last_reset_ts`.

## Fixes
- Fixed the production gap where compaction could be requested but not fully executed through a real summarizer in the default runtime path.
- Fixed compaction failure handling so failed summarization remains non-destructive: targeted raw traces are not pruned, the active turn resolves with a recoverable error completion, and later dispatches stay gated until compaction succeeds.
- Fixed same-turn continuation planning so TOOL-origin continuation cycles persist explicit `tool_continuation` boundaries and unresolved suffixes stay raw instead of compacting prematurely.
- Fixed startup restore so stale semantic memory is no longer migrated through legacy compatibility logic; on schema mismatch the runtime clears stale semantic items, invalidates stale cached snapshots, and rebuilds from canonical sources or starts clean.
- Fixed persisted-state policy compliance by removing the prior `CompactedMemorySchemaUpgrader` path from restore/bootstrap and replacing it with current-schema-only reset semantics.
- Fixed LM Studio local requests to use the shared long-running fetch helper plus a high finite SDK timeout, and fixed Ollama to use the same shared fetch helper without widening that policy to cloud providers.

## Operator Notes
- New env-backed settings:
  - `AUTOBYTEUS_COMPACTION_TRIGGER_RATIO`
  - `AUTOBYTEUS_COMPACTION_MODEL_IDENTIFIER`
  - `AUTOBYTEUS_ACTIVE_CONTEXT_TOKENS_OVERRIDE`
  - `AUTOBYTEUS_COMPACTION_DEBUG_LOGS`
- Leaving the compaction-model override blank reuses the active run model.
- The effective-context override is useful for providers such as LM Studio when the practical context ceiling is lower than the advertised maximum.
- Detailed compaction numbers stay in logs; the workspace banner is intentionally a simple status surface.
- There is no separate timeout knob for LM Studio/Ollama transport hardening; if a local runtime still fails under large prompts, lower `AUTOBYTEUS_ACTIVE_CONTEXT_TOKENS_OVERRIDE` to the practical ceiling first.
- Existing pre-schema-`3` working-context snapshot caches still rebuild automatically through the reviewed planner/frontier path; no manual migration step is expected there.
- Existing flat or otherwise stale semantic memory is **not migrated** on startup. On schema mismatch the runtime clears `semantic.jsonl`, writes manifest schema `2` reset metadata, invalidates the cached snapshot, and then rebuilds from canonical sources or starts clean.
- Rebuilt compacted snapshots preserve bounded `[RAW_FRONTIER]` blocks and render semantic memory by category priority; retrieval ranks semantic items by salience first, then recency.

## Validation Note
- The authoritative live LM Studio evidence remains pass-clean using `gemma-4-31b-it`.
- Live-provider evidence is still based on one local LM Studio model/runtime shape rather than a broader provider matrix.
