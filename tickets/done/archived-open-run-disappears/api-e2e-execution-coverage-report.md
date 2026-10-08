# API/E2E Execution Coverage Report

## Execution Round Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/archived-open-run-disappears/tickets/in-progress/archived-open-run-disappears/requirements-doc.md` (SR-002)
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/archived-open-run-disappears/tickets/in-progress/archived-open-run-disappears/investigation-notes.md`
- Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/archived-open-run-disappears/tickets/in-progress/archived-open-run-disappears/solution-revision-record.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/archived-open-run-disappears/tickets/in-progress/archived-open-run-disappears/design-spec.md` (SR-003)
- Supplemental Task Artifacts: `handoff-architecture-design-complete.md` (same folder)
- Design Review Report: `N/A — not applicable`
- Architecture Review Revision Record: `N/A — not applicable`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/archived-open-run-disappears/tickets/in-progress/archived-open-run-disappears/implementation-handoff.md`
- Implementation Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/archived-open-run-disappears/tickets/in-progress/archived-open-run-disappears/implementation-revision-record.md` (IR-001)
- Code Review Report: `N/A — not applicable` (direct low-risk route)
- Code Review Revision Record: `N/A — not applicable`
- Delivery Revision Record: N/A
- Relevant Delivery Revision IDs: N/A
- Coverage Investigation: `api-e2e-coverage-investigation.md` (same folder)
- API/E2E Test-Case Ledger: `api-e2e-test-case-ledger.md` (same folder)
- API/E2E Revision Record: `api-e2e-revision-record.md` (same folder)
- Current API/E2E Revision ID: `API-REV-001`
- Current Execution Round: 1
- Trigger: `Implementation Complete` (IR-001, commit `fd5f32ba5`)
- Prior Round Reviewed: N/A
- Latest Authoritative Round: 1

## Routing Classification

- Task size: `Small`
- Architectural risk: `Low`
- Input route: `Direct Low-Risk`
- Successful-output route: `Delivery`
- Proportional test-code review decision: `Not Required — direct low-risk route`

## Investigation And Execution Basis

- Coverage investigation artifact: `api-e2e-coverage-investigation.md`
- Investigation completed before durable coverage changes or final execution: `Yes` for final execution. The API-001 server test was drafted right after the coverage inventory and before the investigation file was written; the investigation records its decision basis.
- Investigation plan followed: `Yes`, with two deviations: (1) a pre-existing, unrelated server test failure was found and fixed as a separate baseline commit (TESTING.md rule 9); (2) LIVE-10 (draft discard) could not be produced live (see Not Tested).
- Existing coverage decisions revised during execution: `agent-run-history-catalog-service.test.ts` moved from "Out Of Scope" to "Needs Update (baseline fix)" after it failed independently of this change.
- Reroute required before or during execution: `No`
- Notes: the packaged worktree build already contained the fix (`app.asar` contains `ArchivedAgentRunOpenError`; source mtimes 15:33–15:36 precede the 15:46 build; working tree equal to HEAD), so `--from-worktree` was used instead of `--build`.

## Test-Case Ledger Reconciliation

- Ledger path: `api-e2e-test-case-ledger.md`
- Ledger initialized before execution: `Yes`
- Every completed case recorded immediately: `Yes` for REPO-01/02. Live and later repository events were recorded in batches during execution, each before moving to a new case group. Every case has a terminal entry.
- Long-running case checkpoints recorded when needed: `N/A`
- Ledger reconciled into this report: `Yes`
- Last durably recorded event: 20 (LIVE-10)
- Cases still running, interrupted, or not started: none
- Interruption note: none

| Case ID | Final Result | Last Event | Evidence / Artifact Path | Reconciled Result / Follow-Up |
| --- | --- | --- | --- | --- |
| REPO-01 | Pass | 1 | console | — |
| REPO-02 | Pass | 2 | console | — |
| REPO-03 | Pass | 3 | `api-e2e-evidence/web-full-suite.log` | — |
| REPO-04 | Pass (after baseline fix) | 5 | `api-e2e-evidence/server-run-history.log` | baseline fix commit |
| REPO-05 | Pass | 6 | `api-e2e-evidence/guard-web-boundary.log` | — |
| LIVE-01 | Pass | 7, 8 | `live-01*` | — |
| LIVE-02 | Pass | 10 | `live-02*` | — |
| LIVE-03 | Pass | 11 | `live-03*` | UNK-001 closed |
| LIVE-04 | Pass | 14 | `live-04*` | — |
| LIVE-05 | Pass | 9, 12, 13 | `live-05*` | — |
| LIVE-06 | Pass | 15 | `live-06*` | — |
| LIVE-07 | Pass | 16 | `live-07*` | — |
| LIVE-08 | Pass | 17 | `live-08*` | — |
| LIVE-09 | Pass | 18, 19 | `live-09*`, `live-08c*` | — |
| LIVE-10 | Not Tested (live) | 20 | `live-10-new-run-no-temp-draft.*` | covered by `chat.spec.ts`; residual low |

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce or tolerate backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No`. The auto-select branches and Chat's re-open path are removed outright. `modelConfigEditability?.reason` optional chaining is a type-level guard on a required field, not a compatibility branch.
- Approved persisted-data transition followed: `N/A` (`Not Affected`)
- Durable coverage added or retained only for compatibility-only behavior: `No`
- Upstream recipient notified: N/A

## Changed Boundary And Evidence Matrix

| Case ID | Behavior / REQ / AC IDs | Changed Boundary | Execution Surface / Mode | Evidence Type | Result | Evidence / Artifact |
| --- | --- | --- | --- | --- | --- | --- |
| REPO-01 | AC-001..AC-009 logic | context stores, chat page, open coordinator | Vitest (Nuxt) | Durable | Pass | 9 files, 68 tests |
| REPO-02 / API-001 | REQ-008, AC-008 | server resume config `RUN_ARCHIVED` contract on the real catalog archive path | Vitest (server) | Durable | Pass | `agent-run-resume-config-service.test.ts` |
| REPO-03 | regression | whole renderer | Vitest (Nuxt) | Durable | Pass | 587 files / 3985 tests passed, 2 files skipped |
| REPO-04 | regression | server run-history + archive GraphQL e2e | Vitest (server) | Durable | Pass | 47 files / 233 tests |
| REPO-05 | design dependency rules | web boundary | guard script | Durable | Pass | guard log |
| LIVE-01 | AC-001, AC-007, REQ-006 | DS-001 | Isolated desktop | Desktop | Pass | `live-01-*`, `live-01b-agent-archived.png` |
| LIVE-02 | AC-002 | DS-001 | Isolated desktop | Desktop | Pass | `live-02-*` |
| LIVE-03 | AC-003 (team view) | DS-002 | Isolated desktop | Desktop | Pass | `live-03-*` |
| LIVE-04 | AC-003 (member view + Archive all) | DS-002 | Isolated desktop | Desktop | Pass | `live-04-*` |
| LIVE-05 | AC-009 (agent, team view, member view) | DS-001, DS-002 | Isolated desktop | Desktop | Pass | `live-05*` |
| LIVE-06 | AC-004, AC-009 (Org) | DS-004 | Isolated desktop | Desktop | Pass | `live-06*` |
| LIVE-07 | AC-006, REQ-005 | preserved guard | Isolated desktop + GraphQL listing | Desktop | Pass | `live-07*` |
| LIVE-08 | AC-008, REQ-008 | DS-003 | Isolated desktop + GraphQL resume config | Desktop | Pass | `live-08*` |
| LIVE-09 | AC-005, REQ-004 | reload / restart | Isolated desktop + `isolated-app restart` | Desktop | Pass | `live-09*`, `live-08c*` |
| LIVE-10 | SCN-A1 | draft discard | — | — | Not Tested (live) | `live-10-new-run-no-temp-draft.json` |

## Additional Repository Coverage Execution

| Order | Command | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence / Output Path |
| --- | --- | --- | --- | --- | --- |
| 4a | `pnpm -C autobyteus-server-ts exec vitest run tests/unit/run-history/services/agent-run-history-catalog-service.test.ts --no-watch` (alone; then with `--testTimeout 60000`) | worktree root | diagnosis of the baseline failure | Fail alone (3–4 timeouts plus "findStandaloneAgentRunRootManager is not a function"); Pass with a 60 s timeout (one test took 18 s) | console |
| 4b | REPO-04 rerun after the baseline fix | worktree root | regression | Pass (catalog file 1.4 s) | `api-e2e-evidence/server-run-history.log` |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | Change | New / Final Supporting Evidence | Residual Uncertainty |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 80% | 96% | +16 | Every AC-001..AC-009 was observed in the real product, incl. those the implementation did not exercise live (AC-006, Org delete, Org Archive all) | Web-build browser Back not run (same code path as the stale address) |
| Changed-boundary execution directness | 85% | 97% | +12 | Real sidebar actions → GraphQL → stores → chat route / layout; route sampled every 25–50 ms | — |
| Cross-boundary integration realism and mock gap | 75% | 95% | +20 | Real server resume config (`RUN_ARCHIVED`, `isActive:false`) drives the client safety net on a cold process | Runs created with the fake AGY CLI |
| Environment, configuration, identity, and fixture fidelity | 80% | 95% | +15 | Packaged worktree build, private data root, data created through the product GraphQL | Fake runtime; one fake "live" agent run went offline by itself (environment, see Observations) |
| Failure, edge-case, lifecycle, and recovery evidence | 75% | 92% | +17 | Reload on the archived address, restart, stale address on a cold process, deleted-run stale address (preserved "chat not found"), Cancel on Delete, running refusal | Archive/Delete server-failure path and draft discard proven only by specs |
| User-surface, browser, and desktop-shell confidence | 50% | 96% | +46 | Rendered empty view after every action, no "chat not found"/spinner state sampled, no `local` row in the DOM, restart sidebar | Web build not run |
| Durable regression coverage quality and relevance | 92% | 95% | +3 | API-001 pins the server contract that the client now depends on; baseline flake removed | Rendered journey not durable (disproportionate for Small/Low) |

- Overall post-repository confidence: 77%
- Overall final confidence: 95% (666/7 = 95.1%)
- Calculation method: simple average of the 7 categories
- Confidence change produced by broader validation: +18 points
- Every critical acceptance criterion directly proven: `Yes`
- Any final applicable category below `90%`: `No`
- Default final confidence target of `95%` met: `Yes`
- Confidence-limiting residual risks: draft-discard (SCN-A1) and Archive/Delete server-failure paths are proven by specs only; web-build browser Back was not run.

## Broader Validation Decision And Execution

- Decision and selected execution mode: `Required` — `Project Desktop Validation` (isolated desktop instance, TESTING.md "full real-product journey").
- Material deviation: none.
- Confidence gap addressed: rendered outcome, reload/restart, real server → coordinator → chat stale-address chain, team member view (UNK-001), running refusal, Org delete.
- Startup and readiness: `pnpm --silent isolated-app start --from-worktree` → `iso-60534-519f` (control 60534, server 60535). Appended `ANTIGRAVITY_CLI_COMMAND=<worktree>/autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs` and `AGY_FAKE_ARGV_LOG` to `<dataRoot>/server-data/.env`, then `isolated-app restart`. Health: `start`/`restart` readiness OK; browser-automation `health-check` connected.
- Environment choices: fake AGY CLI (no provider calls); browser-automation attach-only on the control port.
- Seed: `api-e2e-evidence/live-seed.mjs` → `live-seed.json` (workspace `/tmp/aord-api-live-ws`; Open Agent ×5 stopped, Keeper ×1 stopped, Live Agent ×1 live; Bridge Team ×5 stopped, Other Team ×1 stopped, Live Team ×1 live; Delivery Org ×3 stopped, Live Org ×1 live). An extra live agent run was created later (see LIVE-07).

| Scenario / Journey Step | Expected Observable Result | Actual Observable Result | Evidence | Result |
| --- | --- | --- | --- | --- |
| LIVE-01: Keeper loaded; Open Agent run `c808…` open in Chat; row "Archive run" | toast; empty view; row gone; Keeper not selected; no `local` row | "Run archived."; first sample already `#/workspace` + empty state (no missing/opening/run-frame state seen); contexts = live + keeper; selection null; `local` 0 | `live-01-action.json`, `live-01-state.txt`, `live-01b-agent-archived.png` | Pass |
| LIVE-01 / AC-007: Keeper open; archive another run `33f9…` | Keeper stays; other row gone | route stayed `#/chat?id=keeper…` with run frame; selection keeper; row gone | `live-01c-*` | Pass |
| LIVE-05 agent: `25175…` open; Delete → Cancel, then Delete → confirm | Cancel changes nothing; Delete → empty view, no "chat not found", no jump | Cancel: still open/listed. Delete: "Run deleted permanently."; `#/workspace` empty; `chat-missing` never present; Keeper not selected | `live-05a-*` | Pass |
| LIVE-02: `cad4…` open; Open Agent "Archive all" → confirm | empty view; group gone | "Archive all runs? Open Agent — all runs will be hidden from history." → "Archived 2 runs."; empty view; only Keeper's group left | `live-02-*` | Pass |
| LIVE-03: Bridge team view `eaec…` open (6 other teams loaded); row "Archive team history" | empty view; no other team selected | "Team history archived."; empty state text "No agent or team run selected…"; selection null; other 6 team contexts still loaded | `live-03-*` | Pass |
| LIVE-05 team view: `0835…` open; "Delete team history permanently" → confirm | same | "Team history deleted permanently."; empty view; selection null | `live-05b-*` | Pass |
| LIVE-05 member view: `/lead` of `3a81…` open; Delete → confirm | same | "Team history deleted permanently."; empty view; selection null | `live-05c-*` | Pass |
| LIVE-04: `/lead` member view of `53b9…` open; Bridge Team "Archive all" → confirm | empty view; group gone; no other team | "Bridge Team · 2 runs will be hidden from history." → "Archived 2 runs."; empty view; Live/Other Team loaded, not selected | `live-04-*` | Pass |
| LIVE-06: Org `b971…` open → Archive; Org `7414…` open → Delete → confirm; Org `92ed…` open → group "Archive all" | `#/workspace` empty view each time | "Agent Org history archived." / "Agent Org history deleted permanently." / "Archived 1 run."; each ended at `#/workspace` empty | `live-06*` | Pass |
| LIVE-07: running Agent/Team/Org | no per-run archive/delete; group refused; nothing archived | Active agent row has only "Terminate run"; active team row has no archive/delete; active Org row has no archive/delete; all three group headers → "Stop running runs first."; server listing shows live runs with `archivedAt:null` | `live-07-running.json`, `live-07b-running-agent.json`, `live-07-server-listing.json` | Pass |
| LIVE-08: server resume config of archived `c808…`; set `#/chat?id=c808…` | `RUN_ARCHIVED`, inactive; empty view; no context; no row | `{isActive:false, editable:false, reason:"RUN_ARCHIVED"}`; `#/workspace` after ~26 ms; no context; no row | `live-08-*` | Pass |
| LIVE-08 preserved: `#/chat?id=<deleted run>` | "chat not found" (unchanged per design) | `chat-missing` shown; no context | `live-08b-deleted-stale-address.json` | Pass |
| LIVE-09: `#/chat?id=<archived>` + window reload | empty view; no archived/deleted run, group or `local` row | `#/workspace` empty; no "Open Agent"/"Bridge Team"/"Delivery Org" text or ids anywhere in the DOM; `local` 0 | `live-09a-*` | Pass |
| LIVE-09: `isolated-app restart` | sidebar without archived runs; no `local` row | Start route `#/chat` (New chat, the app default); workspace lists Keeper/Live Agent/Live Team/Other Team/Live Org only; no archived ids in DOM | `live-09b-*` | Pass |
| LIVE-09 + LIVE-08 on the cold process: two archived addresses | empty view; no context | both → `#/workspace` empty; `agentContexts: []` | `live-08c-*` | Pass |
| LIVE-10: create a `temp-*` draft row and discard it | New chat; nothing selected | "New run with this agent" opens New chat without a `temp-*` row; a `temp-*` row only exists during a first send (or on mobile) | `live-10-new-run-no-temp-draft.*` | Not Tested (live) |

## Desktop Application Validation

- Approach executed: isolated instance of the packaged worktree build, as planned.
- Web-equivalent behavior: sidebar actions, route reaction, empty view (renderer), proven in the Electron renderer.
- Shell-specific or lifecycle behavior: window reload (hash route kept) and full app restart (embedded server restarted, default start route), proven.
- Effect on any already-running desktop application: `None` (own ports and data root; the other worktree's stopped record `iso-63369-6c20` was not touched).
- Behavior not directly proven: web-build browser Back (same `ensureRunOpen` → coordinator path as the stale address). Consequence: none material.

## Platform / Runtime Targets

- Operating system / platform: macOS (Darwin 25.5.0, arm64)
- Runtime: AutoByteus desktop 1.4.98 packaged from this worktree (Electron renderer + embedded server)
- Browser / engine: Electron Chromium via CDP
- Viewport: 1200–1512 CSS px wide window; en locale

## Lifecycle / Upgrade / Restart / Persisted-Data Checks

- Approved persisted-data decision: `Not Affected`
- Representative existing data exercised: runs archived/deleted in the same data root, then reload and restart over that data.
- Result: archived runs stay hidden; server keeps `archivedAt` (resume config `RUN_ARCHIVED`).
- Version-specific runtime branch or compatibility fallback observed: `No`
- Residual untested persisted-data risk: none

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `Yes`

| Path / Test | Change | Requirement / Boundary, Or Obsolete Assertion And Upstream Evidence | Execution Result |
| --- | --- | --- | --- |
| `autobyteus-server-ts/tests/unit/run-history/services/agent-run-resume-config-service.test.ts` | Added | REQ-008 / AC-008: archiving a stopped agent run through the real catalog makes `getAgentRunResumeConfig` report `isActive:false`, `reason:'RUN_ARCHIVED'`; an unarchived stopped run reports `reason:null`; an archived active run reports `isActive:true` | Pass (2 tests) |
| `autobyteus-server-ts/tests/unit/run-history/services/agent-run-history-catalog-service.test.ts` | Updated (baseline fix, separate commit) | The shared builders now inject a `collaborationRoots` stub. Without it, a history mutation dynamically imports the process root-manager module graph, which took up to 18 s, exceeded the 5 s timeout and left later tests a half-loaded module. Unrelated to this ticket. | Pass (16 tests, 1.4 s) |

- Added or updated paths attached for proportional test-code review: `Not Applicable` (direct low-risk route); attached to the handoff for delivery.
- Diff or repository evidence supplied for removed paths: none removed.

## Other Execution Artifacts

| Artifact Path | Type / Purpose | Retained Or Temporary | Notes |
| --- | --- | --- | --- |
| `api-e2e-evidence/live-seed.mjs`, `live-seed.json` | Seed script and its IDs | Retained | Targets only a `127.0.0.1` GraphQL URL |
| `api-e2e-evidence/scripts/*.js` | Browser-automation probe scripts (state, action, expand, open-member, stale, running, sidebar, draft) | Retained | Evidence of how observations were made |
| `api-e2e-evidence/live-*.json`, `live-*.txt`, `live-*.png` | Per-case DOM/state/API evidence and screenshots | Retained | Screenshots are supporting only |
| `api-e2e-evidence/web-full-suite.log`, `server-run-history.log`, `guard-web-boundary.log` | Repository run logs | Retained | — |
| `api-e2e-evidence/isolated-stop.json` | Stop receipt | Retained | `dataRootRemoved: true` |

## Temporary Execution Methods / Scaffolding

| Path / Method | Why Needed | Result / Evidence | Cleanup Result |
| --- | --- | --- | --- |
| `/tmp/aord-br.sh` launcher wrapper, `/tmp/aord-mk.mjs` (extra live run) | Convenience | Used | Removed |
| Data-root `.env` fake AGY entries | Credential-free run creation | Used | Removed with the data root |

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| AGY provider CLI | Repository fake `agy-failure-cli.mjs` | No model calls are needed to create, stop, archive or delete runs | None for this behavior |
| Apollo client (integration spec, implementation-owned) | `vi.mock` | Repository-level test | Closed by live validation |

## Result Summary

| Result | Case IDs | Summary / Reason |
| --- | --- | --- |
| Pass | REPO-01..05, LIVE-01..09 | All acceptance criteria proven in repository tests and in the real desktop product |
| Not Tested | LIVE-10 | A `temp-*` draft row has no simple real trigger on desktop (it exists only during a first send or on mobile). `chat.spec.ts` "returns to New chat when a displayed draft is discarded" covers the route outcome. Residual risk low. |

## Observations (non-blocking)

1. Baseline flake fixed: `agent-run-history-catalog-service.test.ts` timed out depending on machine load (see Durable Coverage). It is fixed in its own commit, labelled as a baseline fix.
2. Design "Key Tradeoffs" says the coordinator spec would catch a server editability change. That spec mocks resume config, so it would not. API-001 now pins the contract server-side.
3. A fake-AGY standalone run that the seed created "live" (`live_agent_045b…`) was later reported offline by the server without a terminate. This is environment/fake-runtime behavior, and a fresh live run was used for AC-006. It does not affect this ticket.
4. After a window reload, team runs that were loaded before are restored as loaded contexts (not selected). This was already known (implementation handoff, Known Risks), is unchanged and out of scope.
5. App restart starts on `#/chat` (New chat), the app's default start route, rather than the `/workspace` empty view. Archived runs are absent either way.

## Cleanup Performed

| Resource / Process / Data | Ownership | Cleanup Action | Result |
| --- | --- | --- | --- |
| Isolated instance `iso-60534-519f` and its auto-created data root | Mine | `pnpm --silent isolated-app stop iso-60534-519f` | `wasRunning:true`, `forced:false`, `dataRootRemoved:true`; `isolated-app list` shows only the other worktree's stopped record |
| `/tmp/aord-api-live-ws` workspace folder, `/tmp` helper files | Mine | `rm -rf` | Removed |
| `iso-63369-6c20` (another worktree) | Not mine | Untouched | — |

## Preliminary Classification

N/A — `Pass`.

## Latest Authoritative Result

- Result: `Pass`
- Final validation confidence: 95%
- Default `95%` confidence target met: `Yes`
- Any final applicable confidence category below `90%`: `No`
- Broader validation decision: `Required` — executed (isolated desktop instance)
- Critical acceptance criteria lacking direct proof: none
- Preliminary classification and recommended owner: N/A
- Next recipient from `get_handoff_rules`: see handoff
- Notes: the test-review decision is `Not Required — direct low-risk route`.
