# Handoff Summary — stored-runtime-names (autobyteus-343: one spelling for the stored runtime name)

## Ticket

- Package: `stored-runtime-names`; Project Task `autobyteus-343`
- Classification: `task_size=Medium`, `architectural_risk=High`; route: reviewed. Architecture review ARCH-REV-001 Pass; source review CRR-001 Pass (no findings); API/E2E API-REV-001 Pass (95.3%); test-code review CRR-002 Pass (no findings).
- Archived ticket folder: `tickets/done/stored-runtime-names/` on `personal`

## What Changed

- Compaction in every runtime (Claude, Codex, Grok, Antigravity, native AutoByteus) now stores the `RuntimeKind` value (`codex_app_server`, `claude_agent_sdk`, `antigravity_cli`, `grok_build`, `autobyteus`) as a segment's `runtime_kind` in `raw_traces_manifest.json`; a payload whose runtime is not a `RuntimeKind` is not recorded as a boundary.
- Startup app-data migration `20261030_raw_trace_manifest_runtime_names` converts the older short labels (`CODEX`, `CLAUDE`, `ANTIGRAVITY`, `GROK_BUILD`, `AUTOBYTEUS`) of this node's own runs (`agents/*`, `agent_teams/*/*`, `agent_orgs/*/*/*`) once. Other keys, order and values stay; unusable manifests are kept byte-identical and reported (status `SUCCEEDED_WITH_WARNINGS`); a failed write is `FAILED` and retried on the next start; a leftover temp file is removed; a second start does nothing. Imports (Memory Sync copies) are never touched.
- Guard: `tests/architecture/runtime-labels-source-check.test.ts` fails if a label table or mapping appears outside the migration.
- Docs: `agent_memory.md`, `grok_build_runtime.md`, `antigravity_cli_runtime.md` (done in the ticket; checked by delivery).

## Integration

- Merge of `origin/personal` @ `6b34f900b6` (20 commits: Docker node in-place update, release scripts, remote-access policy; none touch migrations, memory or compaction) → `9f8634f0fd`; no conflicts.
- Post-integration checks all Pass (`evidence/DEL-01-post-integration-checks.md`): typecheck; migration/architecture/memory/backend/streaming suites 2076 passed (identical to API-01); library memory suite 312 passed; server build; built-server migration startup E2E and Memory Sync E2E (3 passed).

## Verification

- Judged from the evidence; no user check needed. Every critical AC is directly proven (API-02/03 on the built server with mutation checks, API-04/05/08 writers with scripted AGY, Grok replay and live Grok, API-06 two real server processes for Memory Sync, IMP-04 825 real-shaped manifests: migrated 825, 0 failed, second run migrated 0). Details: `release-deployment-report.md`.
- One thing only the user can see: the conversion on his own real node at his first start after updating (TESTING.md forbids running it there; his backup is his choice, DEC-3).

## Release

- `No release`: not requested and `RELEASE.md` makes none the default. `release-notes.md` is ready for a stable release (rollback works; entries an older build writes after a rollback keep the old spelling; Memory Sync imports keep theirs until their own node refreshes them). A beta or stable release is available on request.
- One-time effects after the update, accepted by the design: Memory Sync uploads each converted manifest once; memory search runs one journal pass per converted run.

## For The Solution Designer

- Follow-ups FU-001 (three team-member `runtimeKind` fixtures still `'AUTOBYTEUS'`) and FU-002 (unused `exists` helper in the startup E2E test), none sent.
- Not tested: live AGY compaction; Claude, Codex and native compaction through a running server (converter/library level only); kill-mid-migration on the built server; a real `GROK_BUILD` manifest. The first live Grok run timed out before any compaction event for a reason nobody isolated; the rerun passed.
- The live Grok runs added sessions to Grok's own history (TESTING.md).
