# API/E2E Execution Coverage Report — `project-manager-ux`

## Execution Round Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-manager-ux/tickets/in-progress/project-manager-ux/requirements-doc.md` (SR-003)
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-manager-ux/tickets/in-progress/project-manager-ux/investigation-notes.md`
- Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-manager-ux/tickets/in-progress/project-manager-ux/solution-revision-record.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-manager-ux/tickets/in-progress/project-manager-ux/design-spec.md` (SR-005)
- Supplemental Task Artifacts: `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/project-manager-ux/ui-ux-spec.md` (+ VIS-001..018)
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-manager-ux/tickets/in-progress/project-manager-ux/design-review-report.md` (ARCH-REV-002)
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-manager-ux/tickets/in-progress/project-manager-ux/architecture-review-revision-record.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-manager-ux/tickets/in-progress/project-manager-ux/implementation-handoff.md` (IR-002)
- Implementation Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-manager-ux/tickets/in-progress/project-manager-ux/implementation-revision-record.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-manager-ux/tickets/in-progress/project-manager-ux/code-review-report.md` (CRR-003)
- Code Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-manager-ux/tickets/in-progress/project-manager-ux/code-review-revision-record.md`
- Coverage Investigation: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-manager-ux/tickets/in-progress/project-manager-ux/api-e2e-coverage-investigation.md`
- Test-Case Ledger: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-manager-ux/tickets/in-progress/project-manager-ux/api-e2e-test-case-ledger.md`
- API/E2E Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-manager-ux/tickets/in-progress/project-manager-ux/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-002`
- Current Execution Round: 2
- Trigger: CRR-003 Pass (IR-002, commit `8ef467696`)
- Prior Round Reviewed: round 1 (API-REV-001, Fail F-001)

## Routing Classification

- `Large` / `High`; input `Reviewed`; Pass → proportional test-code review (`/code_reviewer`)

## Investigation And Execution Basis

- Prior failure rechecked first: F-001 is resolved (audit and packaged build pass).
- Then:
  - the desktop real-product journey, which was blocked in round 1;
  - the full browser probe;
  - the feed suite and the Projects regression probe.
- Coverage decision revised:
  - The probe gained a dev-server warm-up. Its first round-2 run failed PMU-001..003 because a cold Nuxt dev server re-optimized dependencies and reloaded pages ("optimized dependencies changed. reloading" ×4 in `frontend.log`). The warm rerun and a forced-cold rerun with the warm-up pass 12/12.
  - The round-1 intermittent O-1 had the same 4 reloads in its `frontend.log`, so it is explained and resolved. The packaged app is unaffected (USER-JOURNEY AC-010/011 pass).
- Reroute: `No`.

## Test-Case Ledger Reconciliation

- Ledger is current; last event 23; nothing running or unstarted.

| Case ID | Final Result | Evidence | Follow-Up |
| --- | --- | --- | --- |
| RELEASE-BUILD (F-001) | Pass, resolved | `api-e2e-evidence/r2/r2-electron-build.log`, `r2-l10n-audit.log` | — |
| REPO-UNIT / CONTRACT (round 1, unaffected by IR-002) | Pass; pre-existing failures recorded | `api-e2e-evidence/*.log` | — |
| REPO-WEB (round 2) | Pass, plus 1 pre-existing failure | `r2/web.log` | — |
| FEED-* + all gated `tests/e2e/projects` | Pass (38 + 1 skipped) | `r2/server-e2e/` | — |
| USER-JOURNEY | Pass | `user-journey/journey-receipt.md` | — |
| PMU-001..012 | Pass (warm, and forced-cold with the warm-up) | `r2/pmu-full/`, `r2/pmu-full-cold-warmup/` | — |
| PMU attempt 1 (cold, no warm-up) | Harness effect; superseded | `r2/pmu-full-attempt1-cold/` | Warm-up added |
| O-1 (round 1) | Explained (same cold reloads), resolved by the warm-up | `pmu-baseline/frontend.log` | — |
| PT-E2E-001..016 | Pass | `r2/projects-feature-probe/` | — |

## Compatibility / Legacy Scope Check

- None beyond the approved tolerant reading of `recipientAddress` (Directly Usable). Real delegations persist it (`user-journey/final-state/`). No legacy retention; no compatibility-only tests.

## Changed Boundary And Evidence Matrix

| Case | AC / Boundary | Surface | Type | Result | Evidence |
| --- | --- | --- | --- | --- | --- |
| RELEASE-BUILD | REQ-010 copy via literal keys; packaging | `build:electron:mac` | Build | Pass | `r2/r2-electron-build.log` |
| FEED-CONTRACT | `/ws/projects`: `connected` on every connection, no replay, broadcast, 4401 parity with `/ws/file-explorer`; every frame valid under the strict schema | Real Studio server | Durable | Pass | `r2/server-e2e/` |
| FEED-AGENT / TEAM / ORG / TEMP / VOLUME | AC-001..008, 019..021, 023; QR-001; P-001/P-002; DS-003 parity; real start failure; 60-Task volume | same | Durable | Pass | same |
| USER-JOURNEY | SCN-002..006 with a real model in the packaged app: AC-001/002, 003, 005 (Running held ~8 s, then Idle), 008, 009, 010, 011, 012, 013, 016..019, 021, 023; AR-002 after host deletion | Isolated desktop instance | Desktop / Live | Pass | `user-journey/` |
| PMU-001..012 | All browser journeys (see TESTING.md) | Browser | Durable | Pass | `r2/pmu-full*` |
| PT-E2E-001..016 | AC-015 | Browser, 2 nodes | Durable | Pass | `r2/projects-feature-probe/` |

## Validation Confidence Scorecard

| Category | Post-Repository | Round 1 | Final (R2) | Evidence / Residual |
| --- | --- | --- | --- | --- |
| Requirement/AC proof | 70% | 85% | 96% | Every AC proven on the wire, in the browser and (most) in the real product. AC-004 "in place" is wire/browser-proven only |
| Boundary directness | 65% | 95% | 96% | Feed contract, auth, parity, packaged app |
| Integration realism | 70% | 80% | 95% | A real model in the real product; real start failure; the matrix layers use the scripted CLI |
| Environment fidelity | 80% | 90% | 95% | Worktree packaged build; private data; the browser-automation launcher substituted by an equivalent CDP attach |
| Failure/edge/lifecycle | 60% | 95% | 95% | Start failure, chat deletion, reactivation, restart, deleted host, cold dev server explained. A worker `error` status from a real provider is unexercised |
| User surface | 70% | 85% | 96% | 12 + 16 browser cases; desktop journey; O-1 explained |
| Durable regression | 65% | 95% | 96% | New server suite, probe PMU-008..012 + warm-up, script, TESTING.md |

- Overall final: **96%** (simple average 95.6). Every critical AC directly proven: `Yes`. No category below 90%. 95% target met: `Yes`.

## Broader Validation Decision And Execution

- `Required`, executed in full:
  - Live API (feed suite);
  - Browser (PMU 12/12 warm and forced-cold; PT-E2E 16/16);
  - Desktop real product with a real model (USER-JOURNEY).

| Journey Step | Expected | Actual | Evidence | Result |
| --- | --- | --- | --- | --- |
| Agent creates a Project + Tasks while the user watches | Appear live; counts follow | Card ~5 s, "2 open tasks" live | shots 01–03 | Pass |
| Agent delegates | Roots live with the worker's status; openable | Running ~8 s → Idle, both openable | 04 | Pass |
| Open the roots | Agent → worker selected; team → coordinator, team expanded | As expected | 05, 06 | Pass |
| DONE / reopen / message | Done + Offline not openable → reopened still Offline → openable, Idle | As expected | 07–09b | Pass |
| Temp task (agent delegates by description) | "1 open" live; Open lane; read-only page | As expected | 11–13 | Pass |
| Delete the chat in the left panel | Temp task leaves live; pill hidden; Project roots not openable | As expected | 14, 15 | Pass |

## Desktop Application Validation

- `iso-53469-f4cb` from this worktree's fresh packaged build; UI-only actions; Claude `claude-opus-5-5`.
- Cleanup: stopped (not forced), data root removed, ports released.
- The user's running AutoByteus app and an unrelated stopped instance record were untouched.

## Platform / Runtime Targets

- macOS arm64; Node 22.23.1; Electron (packaged 1.4.96-beta.1); headless Chrome; Claude Agent SDK runtime; scripted AGY CLI for the matrix layers.

## Lifecycle / Persisted-Data Checks

- `recipientAddress` persisted by real delegations (`/copy_writer`, `/help_review_team`).
- Restart reconnect (PMU-007).
- No migration or fallback.

## Durable Coverage Changed In The Codebase

| Path | Change | Requirement / Boundary | Result |
| --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/projects/project-change-feed.e2e.test.ts` | Added (round 1) | Feed contract/auth; AC-001..008, 019..021, 023; QR-001; DS-003; volume | Pass |
| `autobyteus-web/tests/e2e/project-manager-ux-probe.mjs` | Updated: PMU-008..012, browser-error assertions, failure console capture (round 1); **dev-server warm-up** (round 2) | AC-007, 012, 013, 020, 021, 023; RU-2, RU-4; harness robustness | 12/12 warm and forced-cold |
| `autobyteus-web/package.json` | `test:e2e:project-manager-ux` | — | — |
| `TESTING.md` | Feed E2E + probe section; warm-up note (round 2) | Docs | — |

## Temporary Execution Methods

| Method | Result | Cleanup |
| --- | --- | --- |
| Forced cold start (moved `autobyteus-web/node_modules/.cache/vite` aside) | Warm-up verified | The cache regenerated; backup deleted |
| Attach-only CDP helper (`user-journey/ui-cdp-helper.mjs`) | Drove the desktop instance | Never closes the app |

## Dependencies Mocked Or Emulated

| Dependency | Method | Limitation |
| --- | --- | --- |
| Model CLI in the matrix layers | Scripted AGY CLI | Covered by the real-model desktop journey for the main path; a provider-side `error` status is not exercised |

## Result Summary

| Result | Cases |
| --- | --- |
| Pass | All (F-001 resolved) |
| Not Tested | A real-provider worker `error` status (a forced provider fault would be contrived) |

Observations (non-blocking):
- In Server Settings, the first click on the Projects toggle did not change it; the second did. It is most likely a click before the setting's state had loaded. It is outside this change and recorded only.
- The real Manager sometimes uses `send_message_to` (a collaborator) instead of `delegate_task` for one-offs, so no Temp task appears. This is agent behavior and correct product behavior.

## Cleanup Performed

| Resource | Action | Result |
| --- | --- | --- |
| Isolated instance `iso-53469-f4cb` | `isolated-app stop` | Not forced; data root removed; ports released |
| Probe stacks (×4 PMU, ×1 PT-E2E) | Probe `finally` | Browsers closed, processes terminated, data roots removed |
| In-process servers | Test teardown | Data removed, server closed, 0 roots |
| Vite cache move | Regenerated; backup deleted | — |

## Latest Authoritative Result

- Result: `Pass`
- Final confidence: 96%; target met; no category below 90%
- Broader validation: `Required`, executed (Live API, Browser, Desktop real product)
- Critical acceptance criteria lacking direct proof: None
- Next: `/code_reviewer` proportional test-code review
- Notes: the durable test changes are uncommitted in the worktree (feed E2E, probe, `package.json`, `TESTING.md`). Implementation commits `4d469b0c5` and `8ef467696` are unchanged by API/E2E.
