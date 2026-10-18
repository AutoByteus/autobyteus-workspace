# Handoff — Architecture Review: Append-Only Message Logs (SR-005, re-review after implementation DI-001)

- Result: `Architecture Design Complete`
- Package identifier: `append-only-message-logs`
- Current solution revision: `SR-005` (design-only; requirements Approved at SR-004, unchanged)
- Prior review: ARCH-REV-001 (Fail, ARCH-F-001..004), `design-review-report.md` and `architecture-review-revision-record.md` in the ticket folder. Each finding is answered in design-spec → Review Response.
- Classification: `task_size = Large`, `architectural_risk = High` (design-spec "Task Size And Architectural Risk")
- Route (applied handoff rule): Large or High → independent architecture review → `/software_engineering_team/architecture_reviewer`
- Approval state: requirements `Approved` at SR-004 (earlier: SR-002) by the Solution Designer within the direction of the user's Task, user informed in this conversation 2026-10-18. No `Needs user` decision. No behavior-defining supplements.
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`); receipt and follow-ups go back there.

## Workspace

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/append-only-message-logs`, branch `codex/append-only-message-logs`
- Base: `origin/personal` @ `65cf41c6b4` (fetched 2026-10-18). Finalization target: `origin/personal`.
- Ticket folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/append-only-message-logs/tickets/in-progress/append-only-message-logs/` (not committed yet; no source changes).
- Prerequisite: Task 8641c0ac (`delegated-copy-own-run-memory`) is delivered: merge `9b5cf4025d`, finalization `f911d94e52`, beta v1.5.6-beta.1, user check DR-004. Its design is at `tickets/done/delegated-copy-own-run-memory/design-spec.md`.

## Original Request (Project Task, the user's decision of 2026-10-17)

Write each run's communication log as JSON Lines (one message per line, appended and synced), rotated like raw traces, instead of rewriting and re-validating the whole log on every message. Scope: writers and readers of all three run families, their validators, message reference and attachment lookups; a startup migration from JSON to JSON Lines with no message lost; keep 8641c0ac's model (per-run logs, receiver's log first, then the sender's, under the coordinating run's lock); rotation so no single file grows without bound. Done when: append cost = message size on a realistic large log (the user's 23 MB org log profile); old runs migrate and open with complete history; references and attachments resolve; tests, a real-app check, a beta and the user's check.

## Design In Brief

- `MessageLog` (new, `run-history/store/message-log.ts`) is the only owner of log files: `<base>_active.jsonl` + sealed `<base>_<6 digits>.jsonl`; size rotation at 4 MiB by one rename; append = one line + fsync, with the outcome mapped to the existing `RunPackageFileWriteResult` so the coordinators stay unchanged; an unfinished last line is ignored on read and repaired by the next append; read sorts by `createdAt`; no header or version on disk (DEC-007).
- Family stores and `TaskAgentMessageLogs` use it. The per-log id check is removed: the in-memory check plus fresh ids already guarantee once per log.
- The commit path validates only the new message (it validated the whole history twice per message).
- Readiness requires "the log exists" and treats leftover JSON files as retired.
- Migration `20261018_append_only_message_logs_v1`: per-run gate (the frozen own-run tree parser decides "ready"); frozen JSON reads; batch append; read-back check; delete JSON; non-terminal while any log-writing predecessor is pending; merges JSON that a retried own-run recreates. Released migrations are repointed to a frozen JSON module. Own-run's coordinating-log read falls back to a frozen JSONL line parser.

## What Changed In SR-005 (implementation Design Impact DI-001)

- Trigger: `implementation-design-impact-di-001.md` (implementation engineer, reproduced). Flat-families also continues partial-target orgs (`agent_orgs/<id>/` with retired team files after a rename without cleanup) and reads their org JSON log strictly. Their org tree reads as own-run `input`, so the gate passed and a later flat-families retry would fail forever.
- Change: the gate's ready condition adds "for an org log, its folder holds no retired team authority". The one rule is unchanged otherwise. The inventory row and fixture F-GATE-FLAT-PARTIAL-TARGET are added. No released-migration change. Index-only plans checked: no log read.
- Delta to review: design-spec Gate bullet, the flat-families inventory row, the fixture table, Review Response row DI-001. Everything else is as passed in ARCH-REV-003.

## What Changed In SR-004 (ARCH-REV-002)

- ARCH-F-005: REQ-003 now says appends and rotation never modify sealed files. DEC-008 records the one-time startup locator repair (R-C) as the bounded exception, with its size-bound and Memory Sync effects. The design's Terminology, R-C and R-6 match.
- ARCH-F-006: one gate rule in the Gate bullet and in Steps 0 and 1. Not ready (tree `not_input`, unreadable or missing) or unreadable JSON → `WAITING` while any log-writing predecessor is pending, else `PRESERVED_*`. Tree-less logs are covered.

## What Changed In SR-003

- ARCH-F-001: a full inventory of every log-touching released migration, with a mechanism per migration (design → Migration Plan → Released Migration Inventory). Migrations that act on current-shape runs (own-run, locators-v1, summary-v1) get same-ID repairs R-A..R-D. Their frozen readers read JSON when present, else the append-only files; the released validator accepts either as the message authority; locators-v1 converts `referenceFiles` in append-only files line by line. Tree converters stay behind the gate, which now reuses own-run's `input` / `not_input` / `convertibleBy` classification. Classifier users are shown unaffected (F-CLASSIFIER-SAME). REQ-007 is unchanged.
- ARCH-F-002: `create` → `writeInitial` with today's replace semantics; it refuses only when sealed files exist; four callers checked; retry test.
- ARCH-F-003: own-run's current `writeTeam` target is accepted explicitly, with a fixture. The frozen append-only reader is a full log reader under `legacy/released-run-package-shapes/`.
- ARCH-F-004: test placement stated.

## Points Where Review Was Most Useful (SR-002)

1. The migration gate and its interplay with a pending or failed `task-agent-own-run-v1` (design Migration Plan, "Reappeared JSON", "Own-run reading a converted coordinating log").
2. Removing the per-log id check (DEC-005; design Removal plan, evidence rows for the engine and adapters).
3. Append outcome mapping and tail repair (design Bounded Local Spines).
4. One-way deletion after verification (DEC-003) and the RELEASE.md rollback discrepancy (design Solution And Approval Basis, FU-4).

## Evidence

- Cost today vs append (synthesized 22 MB, 82 messages): 22.3 MB / ~150 ms vs 120 KB / ~13 ms (`probes/cost.mjs`).
- In-memory whole-list validation: 3.35 ms per message at 1,210 messages, done twice (`probes/validate-cost.mts`).
- Shape inventory of the user's logs (read-only; nothing copied, nothing written): `probes/inventory.py`, results in investigation notes → fixture map in the design.

## Open Risks And Follow-Ups

- Risks R-1..R-6 (design). Follow-ups FU-1..FU-4 (design Change Scope), sent to the Project Task Manager at receipt.

## Files

- This handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/append-only-message-logs/tickets/in-progress/append-only-message-logs/handoff-architecture-review.md`
- Requirements: `…/requirements-doc.md`
- Investigation notes: `…/investigation-notes.md`
- Design spec: `…/design-spec.md`
- Solution revision record: `…/solution-revision-record.md`
- Review artifacts: `…/design-review-report.md` (ARCH-REV-001, applied to SR-002), `…/architecture-review-revision-record.md`

## Expected Output

An architecture review report with Pass/Fail and findings, routed per the reviewer's rules. On Pass, implementation follows. On findings, they return to the Solution Designer.
