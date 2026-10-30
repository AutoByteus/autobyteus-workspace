# Docs Sync Report — autobyteus-343 (stored-runtime-names)

## Scope

- Ticket: `stored-runtime-names` (Project Task autobyteus-343); `task_size` Medium, `architectural_risk` High, reviewed route (architecture review ARCH-REV-001 Pass, source review CRR-001 Pass, API/E2E API-REV-001 Pass 95.3%, test-code review CRR-002 Pass)
- Trigger: code reviewer's CRR-002 Pass handoff
- Bootstrap base reference: `origin/personal` @ `e4bebdc858`
- Integrated base reference used for docs sync: `origin/personal` @ `6b34f900b6` (merge `9f8634f0fd`)
- Post-integration verification reference: `evidence/DEL-01-post-integration-checks.md`

## Why Docs Were Updated

- Summary: the stored `runtime_kind` of raw-trace manifest segments is now the `RuntimeKind` value, and a startup migration converts older manifests. The implementation already updated the three docs that named the labels (REQ-006); delivery checked them against the integrated state and added release notes carrying the rollback and limits facts the design assigned to delivery.
- Why this belongs in long-lived docs: readers of the manifest and of the runtime docs must know which spelling is stored and what the migration does and does not touch.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result | Notes |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/agent_memory.md` | owner of the manifest description | No change (already updated in the ticket) | field value, the migration `20261030_raw_trace_manifest_runtime_names`, its limits and the rollback fact are present |
| `autobyteus-server-ts/docs/modules/grok_build_runtime.md`, `antigravity_cli_runtime.md` | named the labels `GROK_BUILD`, `ANTIGRAVITY` | No change (already updated in the ticket) | now `grok_build`, `antigravity_cli` |
| `autobyteus-server-ts/docs/modules/agent_work_journal.md` | design table: "where they describe the manifest" | No change | it names the manifest's `runtime_kind` only as `null` or the journal's own runtime kind; no label spelling |
| `autobyteus-server-ts/docs/design/data_migration_guideline.md` | migration rules (checklist answered in the design) | No change | the ticket follows it; no rule changed |
| `GLOSSARY.md`, `DESIGN.md`, `TESTING.md`, `RELEASE.md` | project rules and terms | No change | a grep of the docs for the old labels next to `runtime_kind` finds none outside the migration's own description |

## Docs Updated

By delivery: none. The ticket's own doc changes (`agent_memory.md`, `grok_build_runtime.md`, `antigravity_cli_runtime.md`) stand and match the integrated code. New delivery artifact: `release-notes.md` (user-facing notes with the rollback and Memory Sync facts, ready for a stable release).

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Manifest `runtime_kind` is the `RuntimeKind` value; startup migration; limits (own runs only, imports untouched, label copies inside old trace records stay); rollback fact | see doc | design-spec, implementation-handoff | `agent_memory.md` (done in the ticket) |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| Short labels `CODEX`, `CLAUDE`, `ANTIGRAVITY`, `GROK_BUILD`, `AUTOBYTEUS` as stored manifest runtime | `RuntimeKind` values; the only copy of the old table is inside the sealed migration | `agent_memory.md`; guarded by `tests/architecture/runtime-labels-source-check.test.ts` |

## Delivery Continuation

- Result: `Pass`
- Next delivery action: archive the ticket and finalize.
- Notes: FU-001 (three test fixtures spelling a team member's `runtimeKind` as `'AUTOBYTEUS'`) stays in `follow-ups.md`. The unused `exists` helper in the startup E2E test (code reviewer's optional tidy) is also recorded there as FU-002.
