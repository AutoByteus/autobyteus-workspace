# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-team-view-slow-load/tickets/in-progress/memory-team-view-slow-load/requirements-doc.md` (SR-004, approved "go" 2026-09-25)
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-team-view-slow-load/tickets/in-progress/memory-team-view-slow-load/investigation-notes.md`
- Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-team-view-slow-load/tickets/in-progress/memory-team-view-slow-load/solution-revision-record.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-team-view-slow-load/tickets/in-progress/memory-team-view-slow-load/design-spec.md` (SR-004 Revision authoritative)
- Supplemental Task Artifacts: None. Product Design: `N/A — not applicable`.
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-team-view-slow-load/tickets/in-progress/memory-team-view-slow-load/design-review-report.md` (ARCH-REV-004 Pass)
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-team-view-slow-load/tickets/in-progress/memory-team-view-slow-load/architecture-review-revision-record.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-team-view-slow-load/tickets/in-progress/memory-team-view-slow-load/implementation-handoff.md` (IR-002)
- Implementation Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-team-view-slow-load/tickets/in-progress/memory-team-view-slow-load/implementation-revision-record.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-team-view-slow-load/tickets/in-progress/memory-team-view-slow-load/code-review-report.md` (CRR-005 Pass)
- Code Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-team-view-slow-load/tickets/in-progress/memory-team-view-slow-load/code-review-revision-record.md`
- Delivery Revision Record: N/A
- API/E2E Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-team-view-slow-load/tickets/in-progress/memory-team-view-slow-load/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- API/E2E Test-Case Ledger: `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-team-view-slow-load/tickets/in-progress/memory-team-view-slow-load/api-e2e-test-case-ledger.md`
- Current Investigation Round: 2. This is the first completed round; round 1 on `bd8450984` was stopped without a verdict and superseded by SR-004.
- Trigger: `/code_reviewer` Implementation Review Pass, CRR-005, merge commit `7c2553f48` (parents `bd8450984`, `origin/personal` @ `6f7b5e371`)
- Prior Investigation Reviewed: round 1 (stopped). F-001 was superseded by REQ-012; O-001 was carried forward.
- Latest Authoritative Investigation: Round 2

## Routing Classification

- Task size `Large`; architectural risk `High`; input route `Reviewed`; successful-output route `Code Review`.
- Proportional test-code review decision: `Required` (durable e2e file updated).

## Current Requirement And Design Basis

The requirements are REQ-001…REQ-012 and AC-001…AC-014 (SR-004). Beyond the round-1 basis, this round must also prove:

- **REQ-011 / AC-012 / AC-013:** the sources list is requested only on the Memory home view (background) or once, awaited, for an unknown imported source. Detail and inspector navigation send exactly one request and show "Loading runs…" first.
- **REQ-012 / AC-014:** every agent run with memory in the execution tree is shown in its structure (configured teams, task agents, task teams, nested teams), grouped by `teamRunId`. Each row opens its own run. Judge AC-014 by the REQ-012 rule, not the literal example rows (CRR-005, handoff Known Risks).
- **AC-005:** the baseline is now `origin/personal` @ `6f7b5e371`.
- **O-001:** admission counts, old vs new built server on the same copy.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001/002 performance | Changed | REQ-001, AC-001/002 | Live timing on the built backend |
| BEH-005 team content | Preserved (except REQ-009/010/012) | REQ-004, AC-005 | Old-vs-new built-server equivalence on the same data |
| BEH-006/007 Agent Orgs | Added | REQ-006…008 | GraphQL e2e + live + browser |
| BEH-010 all runs in structure | Added | REQ-012, AC-014 | Independent real-data check + browser + e2e |
| Route-owned fetching and sources ownership | Changed | REQ-002/003/011, AC-004/012/013 | Browser request counting and render-state order |
| Org history owner (merge) | Changed | Design Delta 3 | e2e (org index names/summaries) + live |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence | Material Risk Not Exercised By It | Broader Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | Catalog, sources, location services (`executionKind`, `groupPath`) | Unit (admitted fixtures) | Real volume; real task-team shapes | Live API on real data |
| API / transport / contract | Yes | Additive GraphQL fields and org queries | `memory-collaboration-graphql.e2e.test.ts` | — | Live curl |
| Frontend component / state | Yes | Stores, tree component, route sync | Web specs (12 files / 54 tests) | Real request sequencing and render order | Browser |
| Browser user journey | Yes | `pages/memory.vue` | Page spec (recording client) | Real Apollo/network | Browser (headless Chromium) |
| Desktop shell | No | No `electron/**` file in `git diff 6f7b5e371 HEAD` | — | — | None |
| Persisted data | No (`Not Affected`) | Read-only | Upstream no-writes test | Server startup writes | Copy-modification check |
| Authentication, workers, external | No | — | — | — | — |

## Project Execution Discovery

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-team-view-slow-load`
- Instructions:
  - `autobyteus-server-ts/AGENTS.md`: vitest `--no-watch`.
  - `autobyteus-web/AGENTS.md`: `pnpm test:nuxt … --run`; never `git add .`.
  - Root `package.json`: `pnpm dev`.
  - `scripts/development/development-runtime.mjs`: backend :8000, web :3000, data root `<worktree>/.autobyteus/development/server-data`.
- **Environment constraints learned this round:**
  1. The agent shell inherits the user's AutoByteus app environment: `PORT=29695`, `DATABASE_URL` → `~/.autobyteus/server-data/db/production.db`, and many `AUTOBYTEUS_*` paths. Server starts must use `env -i PATH=… HOME=…` with explicit variables. dotenv does not override inherited variables.
  2. A fresh dev DB makes server startup re-run the upstream app-data migrations on the memory copy. That rewrote 146 `team_communication_messages.json` files plus run metadata, and 100 fewer team roots were admitted. A faithful run needs a `cp -c` clone of `production.db`, which already holds the migration records, as the live app has.
  3. The embedded `open_tab` browser tab is hidden (`visibilityState: hidden`), so frame and timer throttling distorts navigation timing. Use headless Chromium (Playwright, `playwright-core` 1.58.2 + cached `chromium_headless_shell`) for UI timing and journeys.

| Component | Working Directory | Start | Readiness | Stop |
| --- | --- | --- | --- | --- |
| New stack | worktree | `env -i … pnpm dev` | `DEV_SERVER_READY` / `DEV_WEB_READY` | SIGINT `run-dev.mjs` |
| Old server `6f7b5e371` (O-001 only) | temporary `git worktree` under `/tmp/api-e2e-memory-team-view/r2/old` (deps `cp -cR`, `tsc` build) | `env -i … DATABASE_URL=<clone> node dist/app.js --port 8010 --data-dir <tmp>` | `/rest/health` | SIGINT; worktree removed |

| Data Need | Mechanism | Safety | Cleanup |
| --- | --- | --- | --- |
| Real memory (543 team roots, 23 org roots at 13:15:56Z) | `cp -cRp` APFS clone of `~/.autobyteus/server-data/memory` | The live dir is only read | Deleted |
| Migration-state fidelity | `cp -c` clone of `production.db` per server | Clone only; stays on the machine | Deleted |
| AC-013 new source | `imports/api-e2e-new-source/source-node.json` created in the dev copy | Copy only | Deleted |

## Persisted Data Transition Coverage Basis

- Decision `Not Affected`. Evidence: 0 files changed in either server's memory copy after startup and all explorer queries, when the DB clone carries the migration records. The upstream no-writes explorer test is kept.

## Existing Durable Coverage Inventory

| Path | Intent | Req / AC | Validity | Action |
| --- | --- | --- | --- | --- |
| `server/tests/e2e/memory/memory-collaboration-graphql.e2e.test.ts` | Team/org list, runs, member views; structure fields; admitted fixtures | AC-003, 005…011, 014 | Still Valid (updated upstream from "excludes" to "includes … under their task group") | **Updated**: task-team member memory view assertion (REQ-012 "every agent row opens exactly that run") |
| `server/tests/e2e/memory/memory-{explorer,view}-graphql.e2e.test.ts` | Agents | Preserved | Still Valid | Run |
| `server/tests/unit/agent-memory/*`, `agent-org-execution/*`, `api/graphql/types/*`, `run-history/*` | Catalog, sources, structure, location, mismatch, no writes | AC-003, 006, 011, 014 | Still Valid | Run |
| `web/pages/__tests__/memory.spec.ts`, stores, components | AC-012/013 request counting, loading-first, tree rendering | AC-004, 009, 010, 012, 013, 014 | Still Valid | Run |

## Durable Coverage Changes

- Update: `autobyteus-server-ts/tests/e2e/memory/memory-collaboration-graphql.e2e.test.ts`. Adds an assertion that `getAgentOrgMemberRunMemoryView` for the task-team member `gql-org-a-1-task-team-designer` returns that run's own memory (REQ-012 / AC-014), plus a header comment update. No other changes, and no removals.
- Not durable, with reasons: the real-data checks depend on the user's private memory, and the browser journeys run against real data. This repo has no browser-E2E harness for the memory feature; request ownership is asserted durably in the page and store specs.

## Repository Coverage Execution Plan And Results

| Order | Command | Result | Evidence |
| --- | --- | --- | --- |
| 1 | `pnpm exec vitest run tests/e2e/memory/memory-{collaboration,explorer,view}-graphql.e2e.test.ts --no-watch` | Pass 15/15 | ledger 14 |
| 2 | `pnpm exec vitest run tests/unit/agent-memory tests/unit/agent-org-execution tests/unit/api/graphql/types tests/unit/skill-improvement tests/unit/application-orchestration tests/unit/run-history tests/integration/agent-memory --no-watch` | 492/496; 4 pre-existing failures | `/tmp/api-e2e-memory-team-view/r2/r02.log` |
| 3 | `tsc -p tsconfig.build.json --noEmit`; `tsc -p tsconfig.json` (e2e file) | 0 / 0 errors | `r2/r03.log` |
| 4 | `pnpm test:nuxt components/memory pages/__tests__/memory.spec.ts tests/stores/memoryExplorerStore.test.ts tests/stores/memoryInspectorStore.test.ts localization/messages/__tests__/zhCnGlossaryConsistency.spec.ts --run` | 12 files / 54 tests pass | ledger 17 |

## Post-Repository Confidence Scorecard

| Category | Score | Support | Remaining Uncertainty | Improvement |
| --- | --- | --- | --- | --- |
| Requirement and AC proof | 85% | Durable tests for AC-003, 005…014 | AC-001/002/007 timing, O-001 and AC-012/013 on a real surface not yet run | Live timing, old-vs-new servers, browser |
| Changed-boundary directness | 85% | Real schema in-process | No HTTP/UI | Built backend + browser |
| Integration realism | 80% | Page specs use recording mocks | Real Apollo/route sequencing | Browser |
| Environment / fixture fidelity | 80% | Admitted fixtures | Real task-team shapes, real admission | Real data copy |
| Failure / edge | 88% | Corrupt, non-admitted, mismatch, unknown member | Live error/Retry, source-refresh failure | Browser with injected failures |
| User surface | 70% | Component specs | No real rendering | Browser |
| Durable regression | 93% | e2e + unit + page specs | — | — |

- Overall post-repository confidence: 83%. Several categories are below 90%, so broader validation is `Required`.

## Broader Validation Decision

- Decision: `Required`. Modes: Live API (built backend; old-vs-new built servers for O-001 and AC-005), then Browser (headless Chromium via the project's `pnpm dev`).
- Desktop: the Electron shell is unchanged (no `electron/**` in the package diff). The renderer is web-equivalent, so the browser covers the "manual Electron check". The packaged app was not run, because the user's app on :29695 must not be disturbed.

## Temporary Executable Validation

| Scenario | Method | Why Not Durable |
| --- | --- | --- |
| L-01, O-001, L-02 | curl / `r2/equiv-all.py` / `r2/req012.mjs` against servers on the copy | Private data |
| B-01…B-03, F-01…F-03 | `r2/journeys.mjs`, `r2/failures.mjs` (Playwright) | Real data; no memory browser harness in the repo |

## Not Tested / Deferred

| Behavior | Reason | Risk |
| --- | --- | --- |
| Packaged Electron app | No shell change; the user's app must not be disturbed | Negligible |
| Actual memory-sync import while the page is open (AC-013) | Emulated by creating an import source directory (the same condition `MemoryImportStore.sourceExists` checks) | Low |
| REQ-005 nested team run ID through the server | Cannot occur for admitted stored Team V2 roots (no configured nested teams); unit-covered | Low |

## Ambiguities Or Reroute Triggers

- AC-014 example rows vs data: judged by the REQ-012 rule, as CRR-005 directs. The example-text correction is with the Solution Designer. It is not a reroute.
- Upstream observation (outside the package): re-running app-data migrations on already-migrated memory (fresh DB + copied memory) rewrites 146 team communication files, and 100 team roots then fail readiness admission. This is a separate-ticket candidate, not a finding against this package.

## Investigation Decision

- Proceed: `Yes` (completed). Durable coverage updated: `Yes`. Final result: see the execution report (`Pass`, 95.7%).
