# Draft release notes — context-compaction-simplification-analysis

DR002: latest-base integration is conflicted; no Electron build or release from
that state. These notes remain an unverified draft.

Prepared before user verification on 2026-10-01. **Unreleased candidate, not a
version/tag/publication approval.** See `handoff-summary.md` for exact evidence
and residual limits.

## Changes

- Replace child-agent category compaction with isolated direct summarization:
  one six-section Markdown checkpoint, a replaceable prepared-content boundary,
  and at most three strategy-owned generation attempts.
- Keep pre-parent input held on failed compaction; a later user message can permit
  recovery, preserving identity/attachments and input order without replaying work.
- Use versionless current snapshots with strict current message/tool facts and
  ordinary repair. Preserve historical inspection and frozen upgrader boundaries;
  no new migration or old-compactor settings import.
- Retain confirmed terminal compaction feedback as neutral **Stopped** across
  supported standalone/Team/Org actions, without inferring native cold history.
- Remove an unsupported harness reporting flag and add source-reporting guards.
- Synchronize canonical memory, runtime, settings, tools and UI documentation.

## Known limits

F005 remains accepted known/nonblocking, not fixed (Qwen campaign stopped).
First-auto preparation/quiescence timeout CG033 remains unproved. Wider failures
and the non-green plain web typecheck are not waived. Representative DeepSeek
success is not a promise of every model's fidelity; emulator/repository/UI scopes
are distinct. No durable held-input queue across restart, native cold replay or
whole-power-loss guarantee is added. See `handoff-summary.md` for full detail.

## Operational notes

No deployment or data mutation was performed for these notes. Use coordinated
application versions, preserve existing data and migration ledgers, and do not
run old/new writers concurrently. If a rollout is later requested, define a
scoped backup/rollback and verification plan before touching deployed data; old
binaries cannot be assumed to read newly written versionless snapshots.
