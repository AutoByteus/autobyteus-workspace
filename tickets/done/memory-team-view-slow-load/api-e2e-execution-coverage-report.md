# API/E2E Execution Coverage Report

## Execution Round Meta

- Upstream package: the same absolute paths as `api-e2e-coverage-investigation.md` → Investigation Meta. That is requirements (SR-004), investigation notes, solution revision record, design spec (SR-004), design review report (ARCH-REV-004), architecture review revision record, implementation handoff (IR-002), implementation revision record, code review report (CRR-005) and code review revision record. Supplements: none. Product Design: `N/A — not applicable`.
- Coverage Investigation: `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-team-view-slow-load/tickets/in-progress/memory-team-view-slow-load/api-e2e-coverage-investigation.md`
- API/E2E Test-Case Ledger: `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-team-view-slow-load/tickets/in-progress/memory-team-view-slow-load/api-e2e-test-case-ledger.md`
- API/E2E Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-team-view-slow-load/tickets/in-progress/memory-team-view-slow-load/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- Current Execution Round: 2. This is the first completed round; round 1 on `bd8450984` was stopped without a verdict.
- Trigger: `/code_reviewer` CRR-005 Pass, merge commit `7c2553f48`
- Prior Round Reviewed: round 1 (stopped). F-001 was superseded by REQ-012; O-001 is resolved here.
- Latest Authoritative Round: 2

## Routing Classification

- `Large` / `High`; route `Reviewed`; successful output → `Code Review`; proportional test-code review `Required`.

## Investigation And Execution Basis

- Investigation completed before durable changes and final execution: `Yes`. The plan was followed. Three environment constraints were discovered and handled; see the investigation's "Project Execution Discovery".
- Coverage decisions revised: the embedded tab was replaced by headless Chromium, because the tab is hidden and so throttled. Failure paths were added to raise the edge-case score.

## Test-Case Ledger Reconciliation

- Ledger initialized before execution: `Yes`. Every completed case was recorded immediately: `Yes`. Reconciled: `Yes`. Last event: 29.

| Case ID | Final Result | Evidence |
| --- | --- | --- |
| R-01 memory GraphQL e2e | Pass (15/15) | ledger 14 |
| R-02 server suites | Pass (4 pre-existing failures only) | `r2/r02.log` |
| R-03 typecheck | Pass | `r2/r03.log` |
| R-04 web memory specs | Pass (12/54) | ledger 17 |
| L-01 live timing | Pass | `r2/f-*.json` |
| O-001 old vs new built server | Pass (resolved) | `r2/o2-*.json`, `r2/n2-*.json`, `r2/equiv-all.py` |
| L-02 real-data content, REQ-012, AC-014 | Pass | `r2/req012.mjs`, `r2/f-orgruns-1.json` |
| B-01 teams journey | Pass | `r2/journeys-result.json` |
| B-02 orgs journey | Pass | `r2/journeys-result.json`, `r2/org-run-*.png` |
| B-03 sources journeys | Pass | `r2/journeys-result.json` |
| F-01…F-03 failure paths | Pass | `r2/failures-result.json`, `r2/failures-final.png` |

Evidence directory: `/tmp/api-e2e-memory-team-view/r2/`.

## Compatibility / Legacy Scope Check

- Compatibility introduced or tolerated upstream: `No`. Compatibility or legacy behavior observed in the implementation: `No`. The persisted-data decision `Not Affected` is followed: `Yes`. No copy file changed after startup and queries, given a DB with migration records. No compatibility-only durable coverage.

## Changed Boundary And Evidence Matrix

| Scenario | Req / AC | Boundary | Mode | Type | Result | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| Team list, SE runs, org list timing | AC-001, 002, 007, QR-001 | Built backend over HTTP | curl ×3 | Live | Pass: teams 0.20–0.26 s; SE runs 0.18–0.21 s; orgs 0.021–0.029 s; org runs 0.014–0.016 s | `r2/f-*.json` |
| Team content equivalence vs `origin/personal` | AC-005, REQ-004 | Built servers, the same copy + DB clone | Old `6f7b5e371` vs new `7c2553f48`, full outputs | Live | Pass: 16 teams / 491 runs / SE 371 identical; all 16 teams' runs identical apart from 1 REQ-010 `agentRunId` (`evidence-driven-delivery-team`: `investigator_2b05…` → `investigator_1f26…`); 16 search + paging probes identical | `r2/equiv-all.py` |
| O-001 admission counts | O-001 | Built servers | Same | Live | Resolved: identical (see Findings) | ledger 19–20 |
| Org cards | AC-007 | Backend + UI | curl + browser | Live/Browser | Pass: autobyteus-org 6 runs / 7 members; software-development-department 2/7; nested-classroom-test 9/3; northstar 3/26 | `r2/f-orgs-1.json` |
| Every run with memory in its structure | REQ-012, AC-014 | Catalog + sources on real data | Independent tree-vs-disk check | Live | Pass: teams 491 runs, 2160 CONFIGURED + 1 TASK_AGENT; orgs 20 runs, 77 CONFIGURED + 22 TASK_TEAM_MEMBER + 1 TASK_AGENT; 0 missing, 0 extra | `r2/req012.mjs` |
| AC-014 run `nested_classroom_test_org_d46808bf…` | AC-014 (by the REQ-012 rule) | API + UI | Browser DOM + API | Browser | Pass: `Teacher`; task group `StudentStudyGroup · Task team · 2026-09-21 14:32:53Z` (`…07a46eff…`) → `student_one_64a6…`, `student_two_d684…`. The configured students have no memory folders, so correctly there is no configured group. `student_one` opens `student_one_64a6…` memory | `r2/org-run-d46808bf.png` |
| Repeated same-address task teams | REQ-012 (group by `teamRunId`) | UI | Browser | Browser | Pass: run `…fc1a7779` shows the configured group + 4 separate task groups, each with its own start time | `r2/org-run-fc1a7779.png` |
| One request per click; no sources off home; loading first | AC-004, AC-012, REQ-002/003/011 | Route sync, stores, Apollo | Browser request log (Playwright) + DOM state log | Browser | Pass: team, org and agent cards, Next, search, member, inspector Back: exactly 1 memory request each; URL change 20–35 ms; "Loading runs…" first, never "No runs match"; 0 stale runs | `r2/journeys-result.json` |
| Home refreshes sources in the background; new import appears | AC-013 | Home view | Browser | Browser | Pass: home = list + `ListMemoryExplorerSources` in parallel. A source created while on a detail view appears in the selector on returning home, without a reload | same |
| Unknown imported source | REQ-011, AC-012 alternate | Route sync | Browser | Browser | Pass: detail route → 1 awaited sources request, then fall back to Local + 1 data request. Home route → fall back to Local | same |
| Imported source | AC-007 alternate | UI + API | Browser | Browser | Pass: read-only badge; "No agent org memories yet."; imported teams list | same |
| Names, breadcrumbs, Back | AC-009, 010, REQ-007 | UI | Browser | Browser | Pass: 0 empty names of 115; `Agent Teams / Software Engineering Team / <run> / solution_designer`; `Agent Orgs / Nested Classroom Test Org / <run> / StudentStudyGroup/student_one`; `…/product_design_prototyping_team/product_prototyper`; Back returns to the detail with search kept | same |
| Error with Retry; failed sources refresh | AC-004, AC-013 alternates | UI | Browser, GraphQL failures injected with `route.fulfill(500)` | Browser | Pass: team/org runs failure → error + Retry (no empty state, no stale runs); Retry → 1 request, data shown. Sources failure on home → list loads, previous options kept, error text shown | `r2/failures-result.json` |
| GraphQL contract (teams + orgs + member views, structure fields, imported empty) | AC-003, 005…011, 014 | In-process schema | vitest | Durable | Pass 8/8 | e2e file |

## Validation Confidence Scorecard

| Category | Post-Repo | Final | Change | New / Final Evidence | Residual Uncertainty |
| --- | --- | --- | --- | --- | --- |
| Requirement and AC proof | 85% | 97% | +12 | Every AC-001…AC-014 is proven live or durably; AC-014 judged by the REQ-012 rule | AC-013 import emulated by source-directory creation, not a real sync import |
| Changed-boundary directness | 85% | 97% | +12 | Built backend over HTTP + real Nuxt/Apollo client | — |
| Integration realism / mock gap | 80% | 95% | +15 | Real frontend→backend sequencing; failures injected at the network edge only | Headless Chromium rather than the Electron window |
| Environment / fixture fidelity | 80% | 96% | +16 | Full live-memory snapshot + `production.db` clone (migration state as the live app); sanitized env | — |
| Failure / edge / recovery | 88% | 95% | +7 | Live error + Retry, failed sources refresh, unknown source, imported empty; durable corrupt / non-admitted / mismatch / unknown member | Nested team run ID fallback is unit-only (unreachable for admitted Team V2 roots) |
| User surface / browser / desktop shell | 70% | 95% | +25 | Visible headless page: rendering, trees, breadcrumbs, timing; the shell is unchanged | Packaged Electron app not run |
| Durable regression quality | 93% | 95% | +2 | e2e now also opens a task-team member's memory | — |

- Overall post-repository 83% → **final 95.7%** (simple average of 7 categories).
- Every critical AC directly proven: `Yes`. No category below 90%. The 95% target is met: `Yes`.

## Broader Validation Decision And Execution

- `Required`; executed as Live API + Browser via the project's `pnpm dev`, with the environment constraints below.
- Startup:
  - `env -i PATH HOME pnpm dev`, then readiness via `DEV_SERVER_READY` / `DEV_WEB_READY`.
  - Old server: `env -i … DATABASE_URL=<clone> node dist/app.js --port 8010`, then readiness via `/rest/health`.
  - The data root was seeded with a `cp -cRp` clone of the live memory (snapshot 2026-09-25T13:15:56Z) and a `cp -c` clone of `production.db`.

## Desktop Application Validation

- Web-equivalent renderer validated in a headless Chromium page. The Electron shell has no changed files (`git diff 6f7b5e371 HEAD` has 0 `electron` paths). The user's running app was not used for validation. The incident exception is recorded below.
- The embedded browser tab is hidden (`visibilityState: hidden`). There, navigation waits 0.3–1.9 s app-wide, including on `/settings` and `/agents`, because of hidden-tab frame and timer throttling. In the visible headless page the same navigation takes 20–35 ms. So this is a tooling artifact, not a product finding.

## Platform / Runtime Targets

- macOS (Darwin 25.5.0, arm64); Node 22.21.1 (pnpm dev) and 22.23.1; Nuxt 3 dev; Chromium headless shell (playwright-core 1.58.2); viewport 1400×1000; locale en-US.

## Lifecycle / Persisted-Data Checks

- `Not Affected` is confirmed: 0 files changed in either server's copy after startup and all queries (DB clone with migration records). No version branch or compatibility fallback.

## Findings And Observations

- **O-001, resolved (not a defect).** On a fresh dev DB, server startup re-runs the upstream app-data migrations on the memory copy. That rewrote 146 `team_communication_messages.json` files plus run metadata, and admission dropped to 391 team runs (SE 302/307). With the production DB's migration state, both old and new servers admit 491 runs, byte-identically. The 302 in round 1 and in the implementer's seeded dev copy had the same cause.
- **Upstream observation, outside this package (separate-ticket candidate).** Re-running app-data migrations on already-migrated memory, as happens with a fresh data dir plus copied memory, leaves 100 team roots non-admitted. This likely affects anyone who restores or copies memory into a fresh install.
- CR-005 and CR-006 (Low, from code review) are unchanged. The AC-014 example text correction is with the Solution Designer.

## Environment Incidents (disclosed)

1. **Misdirected read-only queries to the user's live app.**
   - A helper used `${PORT:-8000}`, and the inherited shell has `PORT=29695`.
   - One batch went to the live AutoByteus app: 3× team list, 3× SE runs, 3× org list and 3× org runs (both rejected by the old schema), plus 1× sources. All were read-only and under 1 s.
   - The results were discarded (`r2/misdirected-live-app/`), and the helper was fixed to require `GQL_PORT`.
2. **Old comparison server connected to the user's production DB.**
   - Started at 13:19:54Z and stopped at 13:21:10Z. It inherited `DATABASE_URL` → `~/.autobyteus/server-data/db/production.db`.
   - Evidence of no writes:
     - "No pending migrations to apply".
     - App-data migrations were skipped, and its memory copy was unchanged.
     - `production.db` mtime stayed 13:14:46Z, before the start, with no WAL/journal file.
     - No agent runs were started; the startup tasks were definition and model cache loading plus an MCP config load (0 configs).
   - Rerun with `env -i` and DB clones.

## Tests Implemented Or Updated

| Path | Change | Requirement | Result |
| --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/memory/memory-collaboration-graphql.e2e.test.ts` | Updated: the org member view test also opens the task-team member `gql-org-a-1-task-team-designer` and asserts its own memory; header comment covers REQ-012/AC-014. The rest of the file is as committed in `7c2553f48` (originally API/E2E-authored in round 1, "excludes" → "includes" by the implementer per the design) | REQ-012, AC-009, AC-011, AC-014 | 8/8 pass |

## Tests Removed

None.

## Durable Coverage Changed In The Codebase

- `Yes` (uncommitted working-tree change): the path above. Attached for proportional test-code review. Removed: none.

## Temporary Execution Methods

| Path | Purpose | Cleanup |
| --- | --- | --- |
| `/tmp/api-e2e-memory-team-view/r2/{gql.sh,equiv-all.py,req012.mjs,journeys.mjs,failures.mjs,shot.mjs}` | Timing, equivalence, REQ-012 check, browser journeys | Retained as evidence (outside the repo) |
| Temporary `git worktree` of `6f7b5e371` | Old built server | Removed |

## Dependencies Mocked Or Emulated

| Dependency | Method | Limitation |
| --- | --- | --- |
| Backend failures (F-cases) | Playwright `route.fulfill(500)` | The failure is emulated at HTTP; the real failure modes produce the same client error path |
| Memory-sync import (AC-013) | Created `imports/<id>/source-node.json` | Same presence condition as a real import |

## Result Summary

| Result | Scenarios | Summary |
| --- | --- | --- |
| Pass | R-01…R-04, L-01, O-001, L-02, B-01…B-03, F-01…F-03 | All AC-001…AC-014 proven; confidence 95.7% |

## Cleanup Performed

| Resource | Action | Result |
| --- | --- | --- |
| `pnpm dev` stacks (3 starts), old server :8010, headless browsers | SIGINT / browser close | Ports 8000/3000/8010 free; no owned processes |
| Old-code worktree | `git worktree remove --force` + prune | Removed |
| Memory copies, snapshot, `production.db` clones, `<worktree>/.autobyteus/development` | `rm -rf` | Removed |
| Embedded browser tabs | Closed | Done |
| User's live memory dir and app | Only read (apart from incident 1's read-only queries) | Untouched |

## Preliminary Classification

N/A (`Pass`).

## Recommended Recipient

`/code_reviewer`: proportional test-code review of the updated e2e file.

## Latest Authoritative Result

- Result: **Pass**
- Final validation confidence: **95.7%**; 95% target met: `Yes`; no category below 90%.
- Broader validation: `Required`, executed (Live API + Browser).
- Critical ACs lacking direct proof: none.
- Next recipient: `/code_reviewer` (proportional test-code review).
