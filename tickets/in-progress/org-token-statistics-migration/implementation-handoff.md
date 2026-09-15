# Implementation Handoff — ORG-TOKEN-MIGRATION-20260915-001

## Upstream Artifact Package
- Requirements authority: approved SR-003; /Users/normy/autobyteus_org/autobyteus-worktrees/org-token-statistics-migration/tickets/in-progress/org-token-statistics-migration/requirements-doc.md.
- Canonical investigation, including INV-006 withdrawal: /Users/normy/autobyteus_org/autobyteus-worktrees/org-token-statistics-migration/tickets/in-progress/org-token-statistics-migration/investigation-notes.md.
- Cumulative solution history SR-001–004: /Users/normy/autobyteus_org/autobyteus-worktrees/org-token-statistics-migration/tickets/in-progress/org-token-statistics-migration/solution-revision-record.md.
- Completed design DS-001 / SR-004: /Users/normy/autobyteus_org/autobyteus-worktrees/org-token-statistics-migration/tickets/in-progress/org-token-statistics-migration/design-spec.md.
- Historical, non-normative intake supplement: /Users/normy/autobyteus_org/autobyteus-worktrees/org-token-statistics-migration/tickets/in-progress/org-token-statistics-migration/intake-analysis-reference.md.
- Incoming package: /Users/normy/autobyteus_org/autobyteus-worktrees/org-token-statistics-migration/tickets/in-progress/org-token-statistics-migration/solution-handoff.md.
- Independent architecture review: Pass, no findings, ARCH-REV-001; /Users/normy/autobyteus_org/autobyteus-worktrees/org-token-statistics-migration/tickets/in-progress/org-token-statistics-migration/design-review-report.md and /Users/normy/autobyteus_org/autobyteus-worktrees/org-token-statistics-migration/tickets/in-progress/org-token-statistics-migration/architecture-review-revision-record.md.
- Product/UI supplements: N/A — not applicable. Rework trigger: N/A — initial reviewed package.

## Current Implementation Summary
**Implementation Complete — ready for independent Code Review; not API/E2E or delivery sign-off.**
Initial implementation cycle, IR-001: /Users/normy/autobyteus_org/autobyteus-worktrees/org-token-statistics-migration/tickets/in-progress/org-token-statistics-migration/implementation-revision-record.md.
Related SR-001–004 (current requirements SR-003); ARCH-REV-001; CRR/API-REV/DR: N/A — not yet performed. Triggering finding IDs: N/A.

Extended the same unreleased `20260901_agent_org_flat_team_families_v1` definition. One metadata plan now governs all history work; the independent token transition corrects exact selected ownership inside per-root transactions. Source authorities remain until target validation, SQL, indexes and candidate dependencies finish. Org restore now checks current token readiness through TokenUsageRunStore before scope construction.

Worktree: /Users/normy/autobyteus_org/autobyteus-worktrees/org-token-statistics-migration; branch `codex/org-token-statistics-migration`; pinned base `d60f74c21e4e4cf5ee23b97cb51cfa42bed3b009`. Source commit: eb306a0916b48e3251f6a2d8176703f9ebf9e1dd. Eventual integration target **requirements/flat-agent-organization-model, NOT personal**. No push, merge, release, live-profile operation or real ledger reset performed.

## Routing Classification
- Task size: **Medium**; architectural risk: **High** — confirmed from DS-001 Task size and architectural risk.
- Evidence: 11 production files, bounded existing migration/token/Org lifecycle ownership; exact persistent attribution and cross-store retry boundaries remain High risk. No public schema/UI or general runner change.
- Selected route: **Code Review**, confirmed by the handoff-rule lookup recorded below.
- Lightweight direct-route self-review: Not Applicable (independent source review required). Implementation self-check completed; no independent review claimed.
- New design impact or escalation trigger: None identified.

## Reviewed Behavior Implementation Trace
All source paths below are under `/Users/normy/autobyteus_org/autobyteus-worktrees/org-token-statistics-migration/autobyteus-server-ts/src`.

| Behavior | Approved change / preserved outcome | Actual production path | Implementation result |
| --- | --- | --- | --- |
| BEH-001 / REQ-001,003 | Same migration; preserved history and usage | Registry orders existing token prerequisite chain before family; family planner → locator → target authorities/rename → token transition/repository → selected index transition → source retirement | Implemented; isolated real SQLite and actual-file checks pass. Full continuation remains downstream. |
| BEH-002 / REQ-002 | Independent remaining source work; history no-op when empty | `agent-org-token-attribution-transition.ts` discovers non-null claims separately; exact current Org metadata proves ownership without history traversal; planner classifies source-root, partial-target and index-only | Token-only rerun has no content traversal/index writes. SQL can proceed for current Orgs even when history-index planning reports failure. Runner unchanged. |
| BEH-003 / REQ-003 | Native flat Team/Agent/valid Org unchanged | Metadata classification excludes flat configured Team, including delegated task Teams; exact SQL root and Agent index membership; pure current invariant | Negative SQL controls unchanged; no fabricated rows; settled task/direct/task-Team records included without runtime launch. |
| BEH-004 / REQ-004 | Repeat-safe truthful completion and runtime safety | Root transaction validates source tuple and all claimants, updates three fields, rereads all columns; Org-index-before-Team-index; dependency propagation and final marker retirement; restore → TokenUsageRunStore assertion → scopeBuilder | SQL failure/rollback, authority, locator, rename, index, retirement and cyclic dependency failure/retry checks pass. Existing event rejection/fail-stop and ledger skip semantics unchanged. |
| BEH-005 / REQ-005 | Candidate-only history I/O | `agent-org-history-candidate-plan.ts` supplies selected plans to locator, runtime, cleanup and `agent-org-history-index-transition.ts`; exact lazy referenced-Org metadata lookup only | Instrumented excluded histories add zero content I/O; unrelated Org/index rows preserved without global validation/pruning. Separate startup readiness scan unchanged. |

## Key Files / Ownership
- `app-data-migrations/app-data-migration-registry.ts`: existing prerequisite chain order only.
- Existing family folder `app-data-migrations/migrations/agent-org-flat-team-families-v1/`:
  - `agent-org-flat-team-families-v1-app-data-migration.ts`: phase sequencing, dependency failure propagation and final source retirement.
  - `agent-org-history-candidate-plan.ts`: metadata-only selected source classification and index snapshots; no sidecar/content discovery.
  - `agent-org-context-file-locator-transition.ts`: candidate preflight, ownership proof, typed locator commits/rereads and dependency inventory; removed independent global inventory/current-catalog dependency.
  - `agent-org-history-index-transition.ts`: selected keyed updates; Org write/reread before Team write/reread; duplicate index identities diagnosed rather than silently discarded.
  - `agent-org-token-attribution-transition.ts`: independent source claim selection and strict Org Agent index proof.
  - `agent-org-token-attribution-repository.ts`: migration-only parameterized SQL and per-root transactions; three-field updates and exact allowed-difference rereads.
- `token-usage/domain/agent-org-token-attribution.ts`: pure current neutral attribution invariant.
- `token-usage/providers/token-usage-run-store.ts`: read-only current restore assertion and precise `AGENT_ORG_TOKEN_OWNERSHIP_NOT_READY` guidance.
- `token-usage/repositories/sql/token-usage-run-repository.ts`: exact batched attribution reads. Reads raw attribution fields rather than the full codec, which can normalize invalid status values; no repair or historical decoding added.
- `agent-org-execution/services/agent-org-run-manager.ts`: injected token boundary after current package load/repair, before materialization; inspection/fresh create unchanged.

## Important Assumptions / Known Risks
- The operational cutover has no concurrent old/new profile writers. SQLite and files are not one transaction; source evidence and retry are essential.
- Successful ledger entries remain skipped. No successful-ledger recheck, revision marker, reset hook, new migration identity or developer-build branch exists.
- Real user profile is untouched. Later operational validation requires separate approval, stopped writers and matching consistent DB/memory backups.
- No global cross-cohort link repair is promised. Candidate-contained links have exact proof; excluded histories are not searched. New supported contrary behavior must return upstream, not trigger a global scanner or runtime fallback.
- Independent source review and executable validation remain required. Local tests do **not** demonstrate a real restored provider response or complete UI token presentation.

## Task Design Health Assessment Implementation Check
Bug Fix + approved scoped scanning correction; Missing Invariant at cutover and duplicated inventory. Refactor Needed Now, locally: **matched**. Planner/index/SQL extraction replaced broad inventory and delayed retirement instead of adding compatibility branches. No Design Impact route needed.

## Legacy / Compatibility Removal Check
- Backward-compatibility mechanisms introduced: **None**. Historical source knowledge remains migration-only.
- Replaced in-scope old behavior retained: **No**. Removed standalone/flat-member/global-Org locator inventory and global Org-index reconstruction/pruning.
- Dead replaced paths removed: **Yes**; no runner hook or alternate migration added.
- Shared structures tight: **Yes**; discriminated history plans and a small current attribution predicate, no runtime migration types.
- Shared design guidance reapplied: **Yes**. Restore calls TokenUsageRunStore only, never migration SQL.
- Source guardrails: **Yes**. Largest changed source: 258 non-empty lines (Org manager). Family orchestrator diff >220 lines was the planned extraction/refactor signal; it is now 205 non-empty lines, with planner/index/token responsibilities extracted. All changed source files below 500.

## Persisted Data Transition Check
**Migration Required**, DS-001 Persisted-data decision and steps 1–11. Implemented without deviation to approved transition policy. No public database schema change.
`(R, single, {single,R})` → `(null, unknown, {unknown})`; no upsert/refold/reprice. Every other persisted column stays identical, including 64-bit accounting, costs, revision/timestamps, snapshot/deduplication JSON bytes; other identity dimensions preserved semantically. Neutral/absent records are zero-write. Unexpected claimants and contradictory selected-member attribution roll back the entire root. Analytics facets are not rewritten.

## Environment / Local Implementation Checks
Node v22.23.1; pnpm 10.28.2. Dependencies installed from frozen lockfile in this worktree; no lockfile/package edits. Shared builds and Prisma generation completed. Initial filtered install omitted the backend SDK dependencies; adding its workspace filter resolved that setup issue.
- Source-only compiler check: `pnpm exec tsc -p tsconfig.build.json --noEmit` — **Pass**.
- `pnpm exec vitest run tests/unit/app-data-migrations tests/unit/token-usage tests/unit/agent-org-execution --no-watch` — **359 tests / 66 files pass** (final log below).
- `git diff --check` — **Pass**.
- Full default `tsc -p tsconfig.json --noEmit` — **not passing**: existing unchanged config declares rootDir `src` while including `tests`, producing TS6059. Not patched outside scope; source compiler check above is the successful scoped check. No full repository typecheck/build pass claimed.
- New tests explicitly inject disposable SQLite databases and memory roots. Existing suite setup resets only this worktree's `tests/.tmp/autobyteus-server-test.db`.
- Earlier local runs caught invalid synthetic JSONL/task-status fixtures; corrected test fixtures now pass. No failing local behavior is being deferred as a pass.

Evidence: /Users/normy/autobyteus_org/autobyteus-worktrees/org-token-statistics-migration/tickets/in-progress/org-token-statistics-migration/implementation-checks.md; final raw local log: /Users/normy/autobyteus_org/autobyteus-worktrees/org-token-statistics-migration/tickets/in-progress/org-token-statistics-migration/implementation-local-checks.log.

## Frontend Rendered-Result Check
**Not Applicable** — backend migration and restore admission only. No rendered UI changed; UI/provider continuation proof remains downstream.

## Downstream Coverage / Executable Validation Still Required
AC-001–008 remain the downstream acceptance matrix, not certified by this handoff.
1. Execute the full isolated legacy token materialization → existing family migration → real Org restore → user continuation/provider response → token event/presentation path, with nonzero historic usage. Local restore test intentionally stops at an injected scope-builder sentinel; local accumulator/adapter checks separately prove duplicate/advancing attribution, not end-to-end continuation.
2. Repeat for no-history/stale-token source through ordinary migration entry; preserve successful-ledger skip semantics and no-history I/O.
3. Confirm duplicate and advancing cumulative events, exact historical totals/costs/checkpoint preservation, settled task participants, absent-row and native-family controls through executable product paths.
4. Independently assess interruption/component recovery and performance scope. Local instrumentation is migration-only, not a startup speed claim. Exact referenced-current-Org lazy metadata lookup and SQL source-batch boundary coverage warrant proportionate downstream tests.
5. Real-profile repair/reset, deployment, integration and final user verification are Delivery-owned and not authorized by this implementation handoff.

## Final Handoff Rule Result
get_handoff_rules returned: implementation complete + architectural_risk=High + implementation-scoped checks complete → **/code_reviewer**. This initial-completion rule is the single applicable most-specific rule. Local Fix, Low-risk direct validation and upstream-gap conditions do not match. Send this cumulative package only to /code_reviewer; no duplicate forwarding.
