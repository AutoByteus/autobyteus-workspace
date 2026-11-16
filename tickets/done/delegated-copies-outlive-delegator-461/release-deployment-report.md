# Delivery / Release / Deployment Report

## Release / Publication / Deployment Scope

Deliver `codex/delegated-copies-outlive-delegator-461` (Project Task `autobyteus-461`; `task_size` `Large`, `architectural_risk` `High`, route `Reviewed`) into `origin/personal`. **Status (2026-11-17): integration done (IR-041, `339602ff36`, base `1e8b6e5d0a` still current); verification complete from the evidence; docs sync `Updated` after the docs Local Fix (IR-042/043, CRR-065); ticket archived to `tickets/done/delegated-copies-outlive-delegator-461`. Finalization and the beta follow; their results are in `delivery-revision-record.md` DR-001 and the terminal message.** The first pass's integration block below is kept as history.

## Project Release Guide (second pass)

- `RELEASE.md` at the ticket branch (base `1e8b6e5d0a` plus this ticket's step, `6ec89d2007`).
- Deviations: none planned.
- Guide change made by this ticket: record the shipped migrations in the registry-order test before tagging (the data migration guideline's new rule).

## Verification (second pass)

- Evidence judged: `Sufficient`
- Evidence relied on: `api-e2e-execution-coverage-report.md` API-REV-021 Acceptance-Criteria Proof (restored at delivery's request, `890877e700`), final confidence 95% (target 95%); `evidence/api-e2e/API-r21-ac-proof-extract.txt`, `API-r21-runs.txt`, `API-r20-runs.txt`, `API-r19-runs.txt`; raw round-21 logs `/tmp/api461/r21/e01.clean.log`, `msp-merged2.log`.
- Integrated-state rerun: the full server E2E folder on `339602ff36`: `Test Files 193 passed | 75 skipped (268)`, `Tests 886 passed | 343 skipped (1229)`, 0 failed (raw log); type gates at baseline.

| Acceptance-Criteria ID | Cases And Files Checked | What You Saw | Judgement |
| --- | --- | --- | --- |
| AC-001 | LIVE-1/2 (r21, live DeepSeek), FOLLOW-A/T, stories §5.1; desktop J1 (r20) | Extract `== delegated-run-outlives-delegator-live`: LIVE-1 ✓, LIVE-2 ✓, `Tests 2 passed`; R21 §7; R20 line 44 J1 `Pass` | Proven |
| AC-002 | Stories §5.1/5.2 (S7, S18, U4, U10), FOLLOW-A/T | `== collaboration-contract-stories` 3 ✓ (§5.1 S0…S27, §5.2 U0…U11, §5.3 O0…O8); `== delegator-view-follows-child` 3 ✓ | Proven |
| AC-003 | FOLLOW-A/T, S4/S11/S12, SDV (r19), J4 (r20) | as above; R19 line 25 `SDV 7/7`; R20 line 51–52 J4 `Pass` | Proven |
| AC-004 | Stories S5/S6/S8/S9/S13, DRO-1 | `== delegated-runs-own-runs-startup`: DRO-1 ✓, DRO-3 ✓ | Proven |
| AC-005 | S10/S11/S14/S19, reactivation, closure, FENCE | `== task-reactivation-root-visibility` 6 ✓, `== task-closure-root-visibility` 3 ✓, `== closed-task-input-fence` 3 ✓ | Proven |
| AC-006 | FOLLOW-T, §5.2/§5.3 stories, LE-T1/O1 (r20), TS (r19) | stories ✓; R19 `TS 7/7` | Proven |
| AC-007 | MSP-56…58 (r21), OST, SDV (r19), J1 (r20) | `msp-merged2.log`: MSP-53…58 `Pass`, `mobile-shell probe: Pass`; `== own-stream-turns-read-once` 2 ✓ | Proven |
| AC-008 | S26/S27, RC-44, TAU-3, PLN-09 (r19) | `== remote-delegation-two-server` 6 ✓; `== task-agent-own-run-startup` 3 ✓ | Proven |
| AC-009 | DRO-1/3, USR-5, UC-2, RC-13, J4 | DRO-1/3 ✓, `== unclean-shutdown-delegated-team-restore` USR-5 ✓; notice text below API/E2E level (recorded) | Proven |
| AC-010 | DCM-001…010, RS-03, MSR, J1 | `== delegated-copy-model-change` 11 ✓ | Proven |
| AC-011 | RC-05 (`delegatedFrom` asserted), RC-43/46, RTP (r19) | `== remote-delegation-two-server` ✓ | Proven |
| AC-012 | Full server folder 886/886, `application-reload-repair` RE-01…05, composer 12/12 | `== application-reload-repair` 5 ✓; raw log totals | Proven |
| AC-013 | `task-copy-idle-lifetime`, SEV-E2E-004; approval edge at unit level (the criterion's verification is "Server tests") | `== task-copy-idle-lifetime` ✓ | Proven |
| AC-014 | DRO, TAU, OT, UC, collaborators, team-run-v1 on the built server | migration suites ✓ in the extract and the raw log | Proven |
| AC-015 | Document review (delivery) | `collaboration_model.md` §5 rows CM-7 ("every delegated run, local or remote, is a root of its own …") and CM-8 (469, 461, migration `20261111_delegated_runs_own_runs_v1`); `GLOSSARY.md` carries the delegation words. The module docs' staleness is the separate docs-sync finding, not these two documents | Proven |
| AC-016 | RC-43/45/46, RTP-01…09 (r19) | `== remote-delegation-two-server` ✓; R19 `remote-runs-in-tree ×2 Pass` | Proven |
| AC-017 | S17, RC-45; TS, SDV, PMU (r19); RSM (r20); MSP (r18); J1/J2 | stories ✓; R19 line 25 `TS 7/7`, `PMU 25/25`, `RSM 7/7` | Proven |

- Pre-merge proof (rounds 18–20) holds on the merged state: the merge kept both sides in the five conflict files (CRR-062) and the full server folder reran on it.
- Accepted residuals: AC-009's notice text and AC-013's approval edge proven below API/E2E level; AC-014 not run on an isolated desktop instance (the built server it embeds was); Grok not covered (FU-035, the user's decision); RRT-05 single flicker in round 20 not reproduced (0/15 in round 21 across base and branch).
- More evidence requested: the per-criterion proof table (API/E2E, `890877e700`), received and checked.
- User check needed: `No`.
- Re-verification after the docs fix: not needed when it changes docs only; a code change goes back through the route.

## Project Release Guide

- Release guide path and revision: `RELEASE.md` at `origin/personal` `1e8b6e5d0a` (to be read again in the worktree once the base is integrated)
- Deviations from the guide and why: `None`

## Initial Delivery Integration Refresh

- Bootstrap base reference: merge base `3d738de6e6`
- Latest tracked remote base reference checked: `origin/personal` `1e8b6e5d0a` (2026-11-16)
- Base advanced since bootstrap or previous refresh: `Yes`, 50 commits. Merged tickets: `autobyteus-workspace-6` (context-file large video upload, per-type size limits), `autobyteus-workspace-7` (Memory Sync carries large files in staged pieces), `autobyteus-workspace-9` (web typecheck gate)
- New base commits integrated into the ticket branch: `No` (blocked)
- Local checkpoint commit result: `Completed`: `3750e52c57` commits the review documents that were untracked (`api-e2e-test-review-report.md`, `architecture-review-revision-record.md`, `code-review-report.md`, `code-review-revision-record.md`, `design-review-report.md`)
- Integration method: `Merge` (`git merge --no-ff --no-commit origin/personal`)
- Integration result: `Blocked`: 5 conflicts; the merge was aborted, so the branch is clean at `3750e52c57`
- Post-integration executable checks rerun: `No` (not reached)
- Delivery edits started only after integrated state was current: `Yes` (none started)
- Handoff state current with latest tracked remote base: `No`

### Conflicts

| File | Kind | What the two sides did |
| --- | --- | --- |
| `autobyteus-server-ts/tests/integration/api/rest/context-files.integration.test.ts` | Content, 1 hunk | 461: `registerContextFileRoutes(scope, noDelegations())` and its own multipart limits. Base: plain `multipart` and `registerContextFileRoutes` registered directly, with the size limits now inside the route |
| `autobyteus-server-ts/tests/unit/projects/project-task-context-store.test.ts` | Content, 1 hunk (imports) | 461: `withTaskRunResources`. Base: `UnsupportedContextFileTypeError`, `defaultContextFileSizeLimits` |
| `autobyteus-web/tests/e2e/composer-context-file-removal-probe.mjs` | Content, 4 hunks | Both sides changed the probe |
| `autobyteus-web/tests/e2e/mobile-shell-probe.mjs` | Content, 1 hunk (imports) | 461: `runStoppedDelegatorCases` (MSP-53…55). Base: `runContextFileSizeCases` |
| `autobyteus-server-ts/tests/unit/memory-sync/memory-sync-task-agent-layout.test.ts` | Modify/delete | 461 deleted it (`92d6c4dc43`, removed hosting machinery); base `3a78c3eee2` changed one line |

### Why delivery does not resolve it

- The conflicts are in tests, but `autobyteus-server-ts/src/api/rest/context-files.ts` auto-merged two real changes in the same routes. 461 changed the `registerContextFileRoutes(app, tree)` signature and owner resolution through `DelegatedChildLocations`. The base added `resolveContextFileSizeLimits()`, the `/context-files/size-limits` route and `request.file({ limits: { fileSize: contextFileUploadCapBytes(limits) } })`. Whether the merged route keeps both behaviors is an implementation judgement, not a mechanical merge.
- Base `autobyteus-workspace-7` changed `memory-sync-service.ts` (177 lines) to carry large files in pieces. 461 changed where delegated runs live. The merged state has to keep Memory Sync working with 461's layout.
- Base `autobyteus-workspace-9` added a web typecheck gate, which the merged web code must pass.
- Other files changed on both sides auto-merged (26 non-ticket paths in total, including `build-studio-server.ts`, `project-task-service.ts`, `autobyteus-web/generated/graphql.ts`, and the docs `GLOSSARY.md`, `agent_memory.md`, `projects.md`, web `agent_execution_architecture.md` and `memory.md`). These need the implementation's checks on the merged state.
- The skill rule: a refresh that creates conflicts or changes effective behavior blocks delivery and is routed, not resolved in delivery.

## Release Decision

- Decision: `Beta`, once delivery's gates pass (verification from the evidence, finalization, the checks before tagging)
- Decided by: the user, 2026-11-16, given in advance while delivery was blocked: "if everything is fine for this ticket, please release a new beta"
- Prepared 2026-11-16: `claude`, `codex`, `grok`, `gitleaks` and `gh` are on `PATH`; the latest tag is `v1.5.13-beta.6`, so the next beta would be `v1.5.13-beta.7` (to be confirmed at tagging). At release: the migration registry-order test's released set (code reviewer's note), and the `## What you need to do` sections of every ticket since `v1.5.13-beta.6`, including autobyteus-469's no-going-back warning

## Escalation / Reroute

- Classification: `Local Fix` (integration of the latest base into the ticket branch)
- Recommended recipient: `/software_engineering_team/implementation_engineer`
- Why final handoff could not complete: the latest base conflicts with the ticket branch in five tests, and overlaps it in context-file upload routes, Memory Sync and web typecheck. The merged state needs reconciliation and checks before delivery can verify it. Then the normal route follows, which re-validates whatever the merge changes.

## Docs sync notes kept for later

- `autobyteus-web/docs/agent_teams.md:315` still describes `follows_team` (removed by CR-461-089). Delivery fixes it in docs sync after integration.

## Final Status

- Verification complete: `No`
- Repository finalization complete: `No`
- Unresolved blocker: integration conflicts with `origin/personal` `1e8b6e5d0a` (above)
- Successful terminal package eligible for return: `No`

## Repository Finalization (second pass)

- Ticket branch `codex/delegated-copies-outlive-delegator-461` at `c8073f6e06`, pushed. Secret Gate: one `generic-api-key` finding in round-1 test evidence (`evidence/api-e2e/API-E02-contract-stories-5.2.txt:234`): the collaboration contract fixture's run ID `upscaler_55b2` (`tests/fixtures/collaboration-contract/contract-states.json`), confirmed by shape and source; the exact value allowlisted for the generic rule (`.gitleaks.toml`, `c8073f6e06`). A first entry aimed at the wrong token on that line was dropped before any push. Then PASS on the range and on the merged state.
- Merged `--no-ff` from `finalize/delegated-copies-outlive-delegator-461` as `d5d4fc7c81` (first parent `1e8b6e5d0a`, unchanged at the push; tree identical to the ticket branch); pushed `1e8b6e5d0a..d5d4fc7c81`.

## Beta Release (in progress)

- Release decision: `Beta` (the user, 2026-11-16). Version `1.5.13-beta.7` (`scripts/release_versions.py next-beta`).
- Shipped migrations recorded (RELEASE.md "Cutting The Release"): `RELEASED` in `app-data-migration-registry-order.test.ts` set to the 45 migrations of beta.7 (the 35 of beta.6 plus `20261111_delegated_runs_own_runs_v1` and nine `20261114_*`); 3/3 pass; `d978347600` on the finalize branch, not yet pushed.
- Checks before tagging on `d978347600`: licensing exit 0; hygiene exit 0; Secret Gate `v1.5.13-beta.6..HEAD` PASS; `pnpm install --frozen-lockfile` exit 0; `pnpm -C autobyteus-server-ts prebuild` exit 0; **`python3 scripts/release_smoke.py`: FAIL**:

| Runtime | Scenario | Result | Reason |
| --- | --- | --- | --- |
| claude | new run + restore, linked workspace | PASS | |
| claude | brand-new team member | FAIL | `SESSION_NOT_READY` ("Session is not ready yet. Retry after CONNECTED message.") |
| claude | different same-named skill | PASS | |
| codex | new run + restore, linked workspace | PASS | |
| codex | brand-new team member | FAIL | `SESSION_NOT_READY` |
| codex | different same-named skill | PASS | |
| grok | new run + restore, linked workspace | FAIL | 429 free-usage exhausted (quota) |
| grok | brand-new team member | FAIL | `SESSION_NOT_READY` |
| grok | different same-named skill | FAIL | 429 free-usage exhausted (quota) |
| antigravity | brand-new run / team member, linked workspace | PASS / PASS | |
| autobyteus | brand-new run / team member, linked workspace | PASS / PASS | |

Models: claude `haiku`, codex `gpt-5.6-luna`, grok `grok-4.7`. Logs kept at `/tmp/smoke461-evidence/`.

| Failed check | Classification | Log lines | Action | Result |
| --- | --- | --- | --- | --- |
| `workspace-skill-links-live` "brand-new team member" (claude, codex, grok) | **Ours** (same error on three runtimes before any model call, 807 ms; the test sends on the Team socket before `CONNECTED`, and `api/websocket/agent.ts:53-61` refuses that; 461 rewrote the Team stream session's open, `team-view-session.ts`) | `live.log` 298–322, 446–470, 580–600, 682 | Handed to API/E2E (RELEASE.md Recovery "Ours"): reproduce locally from a fresh start, compare with base `1e8b6e5d0a`, classify, local check | Open |
| grok "new run + restore", "different same-named skill" | Quota (RELEASE.md: a runtime that cannot run) | summary table | Wait for Grok's 24 h reset, or the user waives Grok for this release | Open: asked the user |

- No tag. Nothing published.
