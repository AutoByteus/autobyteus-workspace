# API/E2E Execution Coverage Report

The run record and the result. The coverage investigation is the plan; `api-e2e-revision-record.md` is the history.

## Round

- Coverage investigation: `api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md`, `API-REV-001`
- Test progress log: `api-e2e-test-progress.md`
- Round and trigger: 1, implementation IR-001 complete (direct low-risk route)
- Prior round reviewed: none
- Deviations from the investigation's plan, and why: API-07 (a calibration loop with the base `readRunConfig`) was added after API-06. In API-06 no Save met the race, so 0 of 12 alone did not show that the loop can detect the defect under today's timing. The temporary observer watched the Save bar only. The "could not be refreshed" text is a separate note (`existing-run-note`), so the observer's text count is not used as evidence (see AC-001 proof).
- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/org-settings-save-stale-reread/tickets/in-progress/org-settings-save-stale-reread/evidence/`

## Routing Classification

- Task size: `Small`
- Architectural risk: `Low`
- Input route: `Direct Low-Risk`
- Successful-output route: `Delivery`
- Proportional test-code review decision: `Not Required — direct low-risk route`

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter (data, identity, locale, viewport) |
| --- | --- | --- | --- | --- |
| ENV-1 | `a4e1a89993` (code `29b51ebcef`) | macOS 26.5.2, Node v22.23.1 | `autobyteus-server-ts/dist/app.js` built from this worktree (`prebuild` + `build`, exit 0, 2026-10-24T16:34Z, `evidence/API-00-server-build.log`); probe-owned Nuxt dev; headless Google Chrome 156.0.8078.47 via playwright-core | Probe-owned temp data root, HOME and free ports; scripted AGY/Grok CLIs (no inference, no credentials); viewport 1512×952, locale en-US; temporary observer (page listeners only) in an untracked copy of `tests/e2e/` (patch `evidence/API-05-06-observer.diff`), removed afterwards |
| ENV-1-base | as ENV-1, but `autobyteus-web/stores/agentOrgContextsStore.ts` replaced by `1138e8fbef`'s for API-07 only | same | same (the store is served from source by Nuxt dev; the server is unchanged by this ticket) | Restored with `git checkout`; `git diff` empty afterwards (`evidence/API-07-base-calibration-stdout.log` last line `restored; diff lines: 0`) |

## Cases

| Case ID | Criteria (AC / Requirement IDs) | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-01 | AC-002, AC-003, REQ-001…003 | `readRunConfig` (unit) | Reused: IMP-01 | — | Pass | — | — | Ran on `29b51ebcef`; `git diff --name-only 29b51ebcef a4e1a89993` touches only ticket files |
| API-02 | REQ-003 | the new spec discriminates base from fix | Reused: IMP-00 | — | Pass (fails 4/7 on base as intended) | — | — | Same reason. I read the 7 assertions against REQ-001/REQ-002 and the design's Terminology: they assert approved behavior |
| API-03 | AC-004 (unit layer), BEH-002 | Org/Settings stores, Org stream services, editor components | Reused: IMP-02 | — | Pass | — | — | Same reason |
| API-04 | — | changed files typecheck | Reused: IMP-03 | — | Pass | — | — | Same reason |
| API-05 | AC-004; AC-001 (2 Org-root Saves) | real backend + Nuxt + Chrome: DCP-001…005, DCR-001…003 | `node tests/.e2e-ab265-observer/delegated-launch-defaults-probe.mjs --output-dir /tmp/ab265e2e/API-05/out --ledger-file /tmp/ab265e2e/API-05/ledger.md --cases DCP-001,DCP-002,DCP-003,DCP-004,DCP-005,DCR-001,DCR-002,DCR-003` (cwd `autobyteus-web`) | ENV-1 | Pass | `API-05-probe-ac004-stdout.log`, `API-05-probe-ac004-ledger.md`, `API-05-probe-ac004-evidence.json`, `API-05-observer-filtered.log`, `API-05-observer-per-save-summary.txt`, `API-05-read-vs-reload-timing.txt`, `API-05-DCP-003-org-settings-copy-saved-1280.png`, `API-05-DCR-003-copy-team-model-saved-1280.png` | `Summary: 8 Pass, 0 Fail`; evidence JSON `browserErrors: []`, cleanup `removed …/delegated-launch-defaults-XZcVmU`; per-Save summary `Save 3 [DCP-003#1] … AgentOrgRunConfig reads before the outcome: 2 … outcome: 'Saved. Changes apply when this run resumes.'`; timing: second `gql-req AgentOrgRunConfig` at `+177ms` after the reconnect | The DCP-003 Save met the race (view republished during the read) and the new re-read completed it: `Saved.` and the saved model |
| API-06 | AC-001, QR-001, REQ-001, BEH-002 | real stack: 12 Org-root Saves of a stopped copy's model in running Orgs | same probe, `--output-dir /tmp/ab265e2e/API-06/out --ledger-file /tmp/ab265e2e/API-06/ledger.md --cases DCP-003,DCR-003` ×6 | ENV-1 | Pass | `API-06-loop-stdout.log`, `API-06-loop-ledger.md`, `API-06-loop-evidence-last-iteration.json`, `API-06-observer-filtered.log`, `API-06-observer-per-save-summary.txt`, `API-06-read-vs-reload-timing.txt`, `API-06-DCP-003-org-settings-copy-saved-last-1280.png`, `API-06-DCR-003-copy-team-model-saved-last-1280.png` | 12 lines `DCP-003 Pass`/`DCR-003 Pass`, 0 `Fail`; ledger 12 × `Completed Pass`; summary totals `saves=12 reload_after_save=12 … saved_shown=12` | Each case waits for the Save bar's `Saved.` (60 s) and asserts the copy row shows the saved model. The probe's own `Summary: 2 Pass` counts unique case IDs (repeats overwrite); the ledger and stdout show all 12. No Save met the race this time (`saves_with_>=2_reads=0`): the new context was published after the read every time (timing file) |
| API-07 | AC-001 (calibration) | same 12-Save loop with the base `readRunConfig` | `git show 1138e8fbef:autobyteus-web/stores/agentOrgContextsStore.ts > autobyteus-web/stores/agentOrgContextsStore.ts`; the API-06 command into `/tmp/ab265e2e/API-07`; `git checkout -- autobyteus-web/stores/agentOrgContextsStore.ts` | ENV-1-base | Pass (calibration behaved as expected: the defect shows on base) | `API-07-base-calibration-stdout.log`, `API-07-base-calibration-ledger.md`, `API-07-base-DCP-003-could-not-be-refreshed.png`, `API-07-observer-per-save-summary.txt`, `API-07-read-vs-reload-timing.txt`, `API-07-observer-filtered.log` | 2 × `DCP-003 Fail … — Timed out waiting for saved`, 10 Pass; screenshot: "Settings were saved, but could not be refreshed. Refresh before making more changes." with **Refresh**, and the copy row still on the old model; summary `Save 5 … outcome: None`, `Save 7 … outcome: None` | Base fails 2 of 12 under today's load (2026-10-20 measurement: 4 of 12). A failed refresh never reaches `Saved.`. The note replaces the Save bar (`ExistingRunSettings.vue:28,85`; `existingRunConfigEditActions.ts:96`), so "reached `Saved.` with the saved model" is the per-Save proof of no refresh failure |

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result | For A User-Only Part |
| --- | --- | --- | --- | --- |
| AC-001 | Yes | API-06 (12/12 Saves end `Saved.` with the saved model, 0 refresh failures), API-05 (2 more Org-root Saves, one of which met the race and was completed by the re-read), API-07 (the same loop shows the defect on base: 2/12) | Proven | — |
| AC-002 | Yes | API-01 (IMP-01), API-02 (IMP-00: fails on base) | Proven | — |
| AC-003 | Yes | API-01 (IMP-01: released, binding, operation, inspection → stale with 1 read; endless republish → stale after 3 reads) | Proven | — |
| AC-004 | Yes | API-03 (IMP-02: 33 files / 359 tests), API-05 (DCP-001…005, DCR-001…003: 8 Pass); BEH-002: Org stream reconnect + snapshot after every Org-root Save (API-06 `reload_after_save=12`) | Proven | — |
| AC-005 | No (user check) | — | Only The User Can Check | It is the user's own check by definition ("The user saves a copy's model in an Org run and sees the new model without Refresh"). The same journey ran 14 times on a worktree build of the real backend in a browser (API-05/06) |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | What Supports It (Case IDs) | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 80% | 95% | Repo: API-01…03 prove AC-002/003 directly; AC-001 needed the real stack. Final: API-06 + API-05 + API-07 | The race is timing-dependent: met in 1 of 14 fix Saves today (base 2/12 today, 4/12 on 10-20) | More iterations would raise the count of race hits; unit API-01 already proves the rule deterministically |
| Changed-boundary execution directness | 85% | 95% | `readRunConfig` executed by the real Save → re-read path with the real Org stream reload (API-05/06) | — | — |
| Cross-boundary integration realism and mock gap | 70% | 95% | Unit tests mock the GraphQL read and simulate the republish; the probe uses the real HTTP read and real WebSocket reload (API-05/06/07) | — | — |
| Environment, configuration, identity, and fixture fidelity | 90% | 95% | Worktree build, probe-owned data, scripted runtimes (no inference needed for this path) | Browser probe, not the packaged desktop shell (no shell boundary changed) | — |
| Failure, edge-case, lifecycle, and recovery evidence | 90% | 90% | Target-change refusals and the 3-read bound: unit (API-01). Real stack: the race met once and handled (API-05), base failure reproduced (API-07) | A real target change landing inside the read window is not reproduced on the real stack: real use cannot place it there (investigation "Not Tested") | — |
| User-surface, browser, and desktop-shell confidence | N/A → 75% | 95% | DOM `Saved.` and row model asserted on every Save; screenshots | Desktop shell N/A (no shell boundary) | — |
| Durable regression coverage quality and relevance | 95% | 95% | `agentOrgRunConfigRead.spec.ts` (7 cases, discriminates base); probe DCP-003/DCR-003 assertions catch the visible failure (API-07) | The probe catches it only when timing hits the race | — |

- Overall post-repository confidence: 84% (applicable categories; user-surface scored 75% after repository checks: none of them touch the page)
- Overall final confidence: 94%
- Calculation method: simple average of the seven final category scores (95, 95, 95, 95, 90, 95, 95 → 94.3%)
- Every critical acceptance criterion directly proven, apart from parts only the user can check: `Yes`
- Any final applicable category below `90%`: `No`
- Default final confidence target of `95%` met: `No` (94%). The gap is the failure/edge category at 90%: a target change during a real read is proven by the unit layer only. Real use cannot produce that timing on purpose, so a real-stack attempt would be a contrived setup. No further executable surface closes it, and it does not block `Pass`: no category is below 90% and every critical AC is directly proven.
- Confidence-limiting residual risks: timing dependence of the real-stack race (1 hit in 14 fix Saves); mitigated by the deterministic unit cases and by the base calibration showing the same loop detects the defect.

## Broader Validation Decision (Mandatory)

- Decision: `Required` (executed)
- Execution mode: `Browser` (probe-owned real stack)
- Confidence gap: the race exists only between a real HTTP read and a real WebSocket reload; unit tests simulate the republish. Expected gain: AC-001 on the real stack, BEH-002 observed. Achieved.
- Browser validation needed: yes, the outcome is visible text in Settings and the race spans browser transports.
- Desktop shell: not needed, as the store runs identically in the renderer and no shell code changed.

## Desktop Application Validation

- Approach executed: browser probe (web-equivalent renderer), as planned
- Cases: API-05/06/07 web-equivalent; no shell-specific behavior in scope
- Effect on the running desktop application: `None` (the user's AutoByteus on port 29695 and `~/.autobyteus` untouched)
- Not directly proven: none in scope

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce or tolerate backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed: `No`
- Durable coverage for compatibility-only behavior: `No`

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round by API/E2E: `No`. The implementation's `autobyteus-web/stores/__tests__/agentOrgRunConfigRead.spec.ts` (added in `29b51ebcef`) was reviewed and kept.
- Added or updated paths attached for proportional test-code review: `Not Applicable`

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| Agent runtimes (AGY, Grok) | Probe-owned scripted CLIs | The path under test needs no inference | None for this change |
| GraphQL read, Org republish (unit layer only) | `vi.mock`, test-made republish | Deterministic race | Closed by API-05/06 on the real stack |

## Temporary Methods And Cleanup

| Item | Owned By This Run | Cleanup Action | Result |
| --- | --- | --- | --- |
| `autobyteus-web/tests/.e2e-ab265-observer/` (untracked probe copy + observer) | Yes | `rm -rf` | Removed; `git status` shows no such path |
| Base store swap for API-07 | Yes | `git checkout -- autobyteus-web/stores/agentOrgContextsStore.ts` | `restored; diff lines: 0` |
| Probe backends, Nuxt dev servers, headless Chrome, temp data roots (3 runs) | Yes | Probe cleanup | Each evidence JSON `cleanup` shows SIGTERM of its processes and `removed …/delegated-launch-defaults-*`; no probe processes left |
| `/tmp/ab265e2e/` (full observer logs, outputs) | Yes | Kept outside the repo as raw evidence; filtered copies committed | — |
| `autobyteus-server-ts/dist` | Yes (build output) | Left (untracked build output) | — |

## Latest Authoritative Result

- Result: `Pass`
- Criteria not proven, or parts only the user can check: AC-005 (the user's check)
- Next recipient from `get_handoff_rules`: delivery (per the rules)
- Notes: an observation outside this ticket, already the ticket for autobyteus-208: Settings names an Org copy `writer_0120` while the sidebar shows `writer 0120` (`API-05-DCP-003-org-settings-copy-saved-1280.png`).
