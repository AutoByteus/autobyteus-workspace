# API/E2E Execution Coverage Report — Universal Team status

## Execution Round Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-team-aggregate-status/tickets/in-progress/delegated-team-aggregate-status/requirements-doc.md` (Approved R2 / SR-002, AP-001)
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-team-aggregate-status/tickets/in-progress/delegated-team-aggregate-status/investigation-notes.md`
- Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-team-aggregate-status/tickets/in-progress/delegated-team-aggregate-status/solution-revision-record.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-team-aggregate-status/tickets/in-progress/delegated-team-aggregate-status/design-spec.md` (SR-003)
- Supplemental Task Artifacts: architecture handoff `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-team-aggregate-status/tickets/in-progress/delegated-team-aggregate-status/handoff-architecture-design-complete.md`; two user screenshots (evidence only)
- Design Review Report: `N/A — not applicable`
- Architecture Review Revision Record: `N/A — not applicable`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-team-aggregate-status/tickets/in-progress/delegated-team-aggregate-status/implementation-handoff.md`
- Implementation Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-team-aggregate-status/tickets/in-progress/delegated-team-aggregate-status/implementation-revision-record.md` (IR-001)
- Code Review Report: `N/A — not applicable` (direct low-risk route)
- Code Review Revision Record: `N/A — not applicable`
- Delivery Revision Record: N/A
- Relevant Delivery Revision IDs: N/A
- Coverage Investigation: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-team-aggregate-status/tickets/in-progress/delegated-team-aggregate-status/api-e2e-coverage-investigation.md`
- API/E2E Test-Case Ledger: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-team-aggregate-status/tickets/in-progress/delegated-team-aggregate-status/api-e2e-test-case-ledger.md`
- API/E2E Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-team-aggregate-status/tickets/in-progress/delegated-team-aggregate-status/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- Current Execution Round: 1
- Trigger: implementation handoff IR-001 (direct Medium/Low route)
- Prior Round Reviewed: None
- Latest Authoritative Round: 1

## Routing Classification

- Task size: `Medium`
- Architectural risk: `Low`
- Input route: `Direct Low-Risk`
- Successful-output route: `Delivery`
- Proportional test-code review decision: `Not Required — direct low-risk route`

## Investigation And Execution Basis

- Coverage investigation artifact: path above
- Investigation completed before durable coverage changes or final execution: `Yes`
- Investigation plan followed: `Yes`. Deviations:
  1. The live probe's first authoritative attempt failed TS-004 on a probe-side selector. It looked up the people-group icon by `[data-team-icon]`, which the Org-internal Team row's icon does not carry (pre-existing markup). The probe now falls back to the dot's next `svg` sibling. The product DOM was already correct: the dot is immediately before the icon. The attempt-1 evidence is retained in `api-e2e-evidence/live-attempt1/`.
  2. A plain `vitest run` (not the documented `test:nuxt`) also ran the Electron specs outside their config. The documented commands are green; see the investigation's repository table.
- Existing coverage decisions revised during execution: none.
- Reroute required before or during execution: `No`
- Notes: SR-006 (open user decision on server-owned Team status) does not change the approved R2 behavior validated here.

## Test-Case Ledger Reconciliation

- Ledger path: above
- Ledger initialized before execution: `Yes` (before the authoritative live run; the repository cases were recorded after they ran, with timestamps)
- Every completed case recorded immediately: `Yes` (the probe appends each case's line as it finishes)
- Long-running case checkpoints recorded when needed: `Yes`
- Ledger reconciled into this report: `Yes`
- Last durably recorded event: TS-004 Pass (2026-10-09T19:16:03Z)
- Cases still running, interrupted, or not started: none
- Interruption, context-compression, or rerun note: the attempt-1 lines (TS-004 Fail) in the ledger point to `live/evidence.json`. That attempt's evidence was moved to `live-attempt1/` before the rerun.

| Case ID | Final Result | Last Event | Evidence / Artifact Path | Reconciled Result / Follow-Up |
| --- | --- | --- | --- | --- |
| RC-001 | Pass | Completed | `api-e2e-evidence/vitest-changed-specs.log` | — |
| RC-002 | Pass | Completed | `api-e2e-evidence/nested/evidence.json` | — |
| RC-003 | Pass | Completed | `api-e2e-evidence/group-icon/result.json` | — |
| RC-004 | Pass | Completed | `api-e2e-evidence/agy-fixture-routing.log` | — |
| RC-005 | Pass | Completed | `api-e2e-evidence/vitest-test-nuxt.log` | — |
| TS-001 | Pass | Completed (attempts 1, 2 and repeats 2–3) | `api-e2e-evidence/live/evidence.json` | — |
| TS-002 | Pass | same | same | — |
| TS-003 | Pass | same | same | — |
| TS-004 | Pass | Attempt 1 Fail (probe selector); attempt 2 and repeats Pass | `live-attempt1/`, `live/`, `live-repeat2/`, `live-repeat3/` | Probe fixed; no product issue |

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No`. The binary `TeamActivityDot` is gone from every tree row; the live TS-002 run asserts no `[data-test="team-activity-dot"]`. `hasActiveRuns` and the dead keys are removed. The remaining `TeamActivityDot`/`running/*` cluster is the listed follow-up dead code and is unmounted.
- Approved persisted-data transition followed: `N/A` (Not Affected)
- Durable coverage added or retained only for compatibility-only behavior: `No`
- Reroute classification used: N/A
- Upstream recipient notified: N/A

## Changed Boundary And Evidence Matrix

| Case ID | Behavior / Requirement / AC IDs | Changed Boundary | Execution Surface / Mode | Evidence Type | Result | Evidence / Artifact |
| --- | --- | --- | --- | --- | --- | --- |
| RC-001 | AC-001..010 (mocked inputs), AC-006 | Rule, projections, renderers | Vitest/jsdom | Durable | Pass | `vitest-changed-specs.log` |
| RC-002 | AC-009, AC-010 (controlled inputs, zh-CN, keyboard/pointer) | Rendered rows | Nuxt dev + Chrome | Durable/Browser | Pass | `nested/evidence.json` |
| RC-003 | REQ-006 (icon unchanged) | Team glyph | Nuxt dev + Chrome | Durable/Browser | Pass | `group-icon/result.json` |
| TS-001 | SCN-001; AC-001, AC-002, AC-003*, AC-004, AC-005, AC-007, AC-009, AC-010; BEH-006 | Agent-root `listTaskRows` → transient row | Built backend + Nuxt + Chrome, scripted AGY | Durable/Live/Browser | Pass | `live/evidence.json` `TS-001`, `ts001-*.png` |
| TS-002 | SCN-004/005; AC-002, AC-007, AC-008, AC-010; ASM-002; screenshot 2 | TEAMS run/group rows via history load + streams | same | Durable/Live/Browser | Pass | `TS-002`, `ts002-*.png` |
| TS-003 | SCN-002; AC-009, AC-007; REQ-002 (agents members delegated) | Team-run `teamBranchStatus`/`teamRunStatus`/group | same | Durable/Live/Browser | Pass | `TS-003`, `ts003-*.png` |
| TS-004 | SCN-003; AC-009, AC-007; BEH-006 (Org root row) | Org projection → collection | same | Durable/Live/Browser | Pass | `TS-004`, `ts004-*.png` |

\* AC-003 (starting → busy): the live scripted runtime passes through `initializing` too briefly to sample reliably. It is proven by the unit rule tests (`workspaceTeamAggregateStatus.spec.ts`, `agentOrgHistoryRows.spec.ts`, `agentRunCollaborationContext.spec.ts`). The live probe's consistency check applies the same rule (initializing → busy) to the observed member rows.

Key live observations (`live/evidence.json`):
- **TS-001.**
  - Coordinator idle + member offline → Team `idle`, `bg-green-500`, label and title "Team status: Idle", row aria-label "…, idle, …", dot before the icon.
  - Collapsed, then the delegator's `send_message_to` → `running` (`bg-blue-500 animate-pulse`) in 117 ms. The row stayed collapsed, and no GraphQL/REST request was made during the change (REQ-008).
  - Member error + coordinator running → `running`.
  - The user clicked Stop generation (coordinator → offline; AGY interrupt stops its process), with the member in error → `error` (`bg-red-500`).
  - Terminate Agent run → `offline` (`bg-gray-400`).
  - The Agent run row and member rows carry no Team dot.
- **TS-002.**
  - After a fresh load, the collapsed group with idle/busy/unstarted runs reads `running`. Runs read `idle` / `running` / `offline`, and all three show Terminate (AC-010, ASM-002).
  - The row Stop on the busy run → that run `offline`, Stop removed, group `idle`.
  - All stopped → group and runs `offline`; archive/delete shown. No binary dot.
- **TS-003.** Manager idle and the delegated coordinator running: the delegated Team row, the run row and the group row all read `running`. A Team member row has no Team dot. Terminate → delegated Team and run row `offline`.
- **TS-004.**
  - Org task Team `idle`, with the label "squad. Team status: Idle, …".
  - The Org-internal Team row has exactly one `offline` dot before its icon.
  - The Org root row has no Team dot.
  - Coordinator HOLD → `running`. Org terminate → task Team and Org-internal Team `offline`.

Every expanded check also asserted that the Team dot equals the approved rule applied to the member rows rendered under it.

## Additional Repository Coverage Execution

| Order | Command | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence / Output Path |
| --- | --- | --- | --- | --- | --- |
| 7 | `pnpm -C autobyteus-web test:e2e:team-status-live --output-dir <ticket>/api-e2e-evidence/live-repeat2` and `…/live-repeat3` | worktree root | Stability of TS-001..004 | Pass, Pass | `live-repeat2/`, `live-repeat3/`, `live-repeat{2,3}.log` |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository | Final | Change | New / Final Supporting Evidence | Residual Uncertainty |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 85% | 95% | +10 | AC-001, 002, 004, 005, 007, 008, 009 and 010 proven live. AC-003 and AC-006 are proven by unit tests (in real use, a closed copy is stopped, and starting is transient). | AC-011 belongs to the user. |
| Changed-boundary execution directness | 80% | 97% | +17 | Real renderer derivations on real `AGENT_STATUS`/lifecycle/history/collaboration events | — |
| Cross-boundary integration realism and mock gap | 70% | 95% | +25 | Only the external model CLI is scripted; server, MCP tools, WS streams and GraphQL are real | Real provider timing (not material to presentation) |
| Environment, configuration, identity, and fixture fidelity | 75% | 93% | +18 | Built backend, Nuxt dev, Chrome 154, public setup APIs | Nuxt dev rather than the packaged renderer. ASM-001 freshness for never-selected hosts and never-opened Orgs is an accepted assumption, not exercised. |
| Failure, edge-case, lifecycle, and recovery evidence | 80% | 95% | +15 | Provider error, user Stop generation, UI Stop/terminate, alive-unstarted run, multi-run group | Backend restart not exercised (not in scope; no persisted Team status) |
| User-surface, browser, and desktop-shell confidence | 70% | 95% | +25 | Real DOM: colour, pulse, label/title, position, collapsed, buttons. zh-CN and keyboard via RC-002. | Electron shell unchanged; AC-011 user verification pending |
| Durable regression coverage quality and relevance | 90% | 97% | +7 | New registered live probe (4 journeys, 3/3 stable) + fixture routing case + colocated specs | — |

- Overall post-repository confidence: 79%
- Overall final confidence: 95% (simple average 95.3%)
- Calculation method: simple average of the seven categories
- Confidence change produced by broader validation: +16 points
- Every critical acceptance criterion directly proven: `Yes` (AC-011 is explicit user verification by definition, owned by Delivery and the user)
- Any final applicable category below `90%`: `No`
- Default final confidence target of `95%` met: `Yes`
- Confidence-limiting residual risks: packaged-renderer rendering (AC-011); accepted freshness assumption ASM-001.

## Broader Validation Decision And Execution

- Decision and selected execution mode: `Required`; Browser against a built backend (web-equivalent desktop renderer)
- Material deviation from the planned mode or rationale: none
- Confidence gap actually addressed: real events → Team dot on all four root kinds, live and collapsed; real Stop/terminate; the TEAMS group across runs; no regression on agent and Org root rows.
- Startup order, commands, and readiness results:
  1. `pnpm -C autobyteus-server-ts prebuild && pnpm -C autobyteus-server-ts build` (Pass).
  2. The probe started `node dist/app.js` on a free port with a private data root: `listening`, then GraphQL OK.
  3. Nuxt dev on a free port: HTTP 200.
  4. Chrome 154.0.8037.98, headless.
- Environment choices that materially affected the run: `AGY_FAKE_CASE=linked_skills`; AGY runtime `gemini-3.8-flash-low` (scripted CLI, no inference); `autoExecuteTools: true`.
- Seed data, fixtures, identities: definitions, Project/Task and runs through public GraphQL. Turns via `/ws/<root>` and real scoped MCP tool calls. No auth.

| Scenario / Journey Step | Expected Observable Result | Actual Observable Result | Evidence | Result |
| --- | --- | --- | --- | --- |
| TS-001 idle | green, 1 dot before icon, status words | as expected | `ts001-agent-idle-expanded.png`, JSON | Pass |
| TS-001 collapsed busy | blue pulse, no expand/reload/request | as expected, 117 ms, 0 requests | `ts001-agent-busy-collapsed.png` | Pass |
| TS-001 busy+error | blue | as expected | `ts001-agent-busy-and-error.png` | Pass |
| TS-001 Stop generation | red | as expected (coordinator offline, member error) | `ts001-agent-error.png` | Pass |
| TS-001 terminate | gray | as expected | `ts001-agent-stopped.png` | Pass |
| TS-002 load | group blue (collapsed); runs green/blue/gray; Stop on all | as expected | `ts002-teams-alive.png` | Pass |
| TS-002 Stop busy | busy gray, group green, Stop gone | as expected | `ts002-teams-busy-stopped.png` | Pass |
| TS-002 all stopped | all gray; archive/delete | as expected | `ts002-teams-all-stopped.png` | Pass |
| TS-003 busy via delegated | delegated Team, run row and group blue | as expected | `ts003-team-root-busy.png` | Pass |
| TS-003 stop | gray | as expected | `ts003-team-root-stopped.png` | Pass |
| TS-004 idle/busy/stop | task Team green→blue→gray; Org-internal gray; Org root no Team dot | as expected | `ts004-org-*.png` | Pass |

## Desktop Application Validation

- Validation approach executed: web-equivalent renderer in Chrome against a built backend. No shell code changed.
- Shell-specific or lifecycle behavior: none changed.
- Effect on any already-running desktop application: `None`. The user's app and `~/.autobyteus` were not touched; only probe-owned temp data roots were used.
- Behavior not directly proven: rendering in the packaged app (AC-011 user verification on an isolated worktree build, owned by Delivery).

## Platform / Runtime Targets

- Operating system / platform: macOS (Darwin 25.5.0)
- Runtime and relevant framework versions: Node (workspace toolchain), Nuxt 3 dev, Vitest, server `dist` built from worktree HEAD `fb9580e11`, plus this round's test-only changes
- Browser / engine and version: Chrome 154.0.8037.98 headless (playwright-core)
- Device, viewport, locale: 1440×1100, `en-US` (zh-CN covered by RC-002)

## Lifecycle / Upgrade / Restart / Persisted-Data Checks

- Approved persisted-data decision: `Not Affected`
- Representative existing data exercised: N/A
- Version-specific runtime branch or compatibility fallback observed: `No`
- Residual untested persisted-data risk: none

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `Yes`

| Path / Test | Change | Requirement / Boundary | Execution Result |
| --- | --- | --- | --- |
| `autobyteus-web/tests/e2e/team-status-live-probe.mjs` | Added | SCN-001..005; AC-001, 002, 004, 005, 007, 008, 009, 010; BEH-006 | Pass (3/3 runs) |
| `autobyteus-web/package.json` (`test:e2e:team-status-live`) | Updated | Registers the probe | — |
| `autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs` | Updated | `linked_skills` `HOLD_TURN` marker (agent stays Running until stopped; not applied to tool-call messages) | Used by the probe |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/antigravity/agy-failure-cli-routing.test.ts` | Updated | New case: HOLD_TURN held, tool-call never held, invalid tool JSON → ERROR | Pass (18/18) |
| `TESTING.md` § Universal Team status (live) | Updated | Command, prerequisites, cases, proof limits | — |

- Added or updated paths attached for proportional test-code review: `Not Applicable` (direct route; attached for Delivery)
- Diff or repository evidence supplied for removed paths: none removed
- These changes are **uncommitted** in the worktree, for Delivery to integrate. Stage paths explicitly. `autobyteus-application-backend-sdk/dist/` and `autobyteus-application-sdk-contracts/dist/` are untracked build output from `prebuild` and must not be staged.

## Other Execution Artifacts

| Artifact Path | Type / Purpose | Retained Or Temporary | Notes |
| --- | --- | --- | --- |
| `tickets/in-progress/delegated-team-aggregate-status/api-e2e-evidence/live/` | Authoritative live evidence (JSON, 14 screenshots, backend/frontend logs) | Retained | |
| `…/api-e2e-evidence/live-attempt1/` | Attempt-1 evidence (TS-004 probe-selector failure) | Retained | Explains the ledger's Fail line |
| `…/api-e2e-evidence/live-repeat2/`, `live-repeat3/` | Stability repeats | Retained | |
| `…/api-e2e-evidence/nested/`, `group-icon/` | Existing probes | Retained | |
| `…/api-e2e-evidence/*.log` | Command logs | Retained | `vitest-full-web.log` is the non-documented runner attempt |
| `/tmp/tsl-dev1`, `/tmp/tsl-dev2` | Probe-authoring runs | Temporary | Not evidence |

## Temporary Execution Methods / Scaffolding

None remaining. The authoring runs used the same durable probe.

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| LLM provider / AGY CLI | Repository scripted CLI (`linked_skills` + `HOLD_TURN`) | Deterministic statuses; no paid inference | Real-provider timing is not material to a presentation rule |
| Packaged Electron shell | Not used (Nuxt dev in Chrome) | No shell change; AC-011 covers the packaged app | Packaged rendering left to user verification |

## Result Summary

| Result | Case IDs | Summary / Reason |
| --- | --- | --- |
| Pass | RC-001..RC-005, TS-001..TS-004 | All required behavior proven; the live probe is stable over 3 runs |
| Not Tested | AC-011 | Explicit user verification, owned by Delivery and the user |
| Out Of Scope | `team-activity-presentation-probe.mjs` running surface; `running/*` cluster | Listed follow-up dead-code removal |

## Cleanup Performed

| Resource / Process / Data | Ownership | Cleanup Action | Result |
| --- | --- | --- | --- |
| Backend process groups (5 runs) | Probe-owned | SIGTERM process group | Terminated (exit 0) each run |
| Nuxt process groups | Probe-owned | SIGTERM process group | Terminated each run |
| Chrome | Probe-owned | `browser.close()` | Closed |
| Data roots `$TMPDIR/team-status-live-*` | Probe-owned | `rm -rf` | Removed (0 remaining) |
| Existing probes' Nuxt/Chrome/ports | Probe-owned | Probe cleanup | Released (`portsReleased: true`) |
| User app / `~/.autobyteus` | Not owned | Untouched | — |

## Preliminary Classification

N/A. No failure is attributable to implementation, design or requirements. The single attempt-1 failure was a probe-side selector issue, fixed within API/E2E ownership.

## Latest Authoritative Result

- Result: `Pass`
- Final validation confidence: 95%
- Default `95%` confidence target met: `Yes`
- Any final applicable confidence category below `90%`: `No`
- Broader validation decision: `Required`, executed (Browser against a built backend)
- Critical acceptance criteria lacking direct proof: none (AC-011 is user verification by definition)
- Preliminary classification and recommended owner: N/A
- Next recipient from `get_handoff_rules`: Delivery (per the returned rule)
- Notes for Delivery:
  1. AC-011 explicit user verification on an isolated worktree build (`pnpm --silent isolated-app start --build`), never the installed app.
  2. Docs sync passages listed in the design spec.
  3. Integrate this round's uncommitted test-only changes (listed above).
  4. `origin/personal` drift touches `tests/e2e/task-closure-tree-probe.mjs` (not modified here).
  5. Follow-up (outside this ticket): the open SR-006/ASM-001 user decisions and the `running/*` + `TeamActivityDot` dead-code removal.
