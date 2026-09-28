# API/E2E Execution Coverage Report — chat-interface-entry

## Execution Round Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-interface-entry/tickets/in-progress/chat-interface-entry/requirements-doc.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-interface-entry/tickets/in-progress/chat-interface-entry/investigation-notes.md`
- Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-interface-entry/tickets/in-progress/chat-interface-entry/solution-revision-record.md` (SR-010)
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-interface-entry/tickets/in-progress/chat-interface-entry/design-spec.md` (SR-010: D-01..D-15)
- Supplemental Task Artifacts: `/Users/normy/autobyteus_org/autobyteus-web-prototype/tickets/done/chat-interface-entry/ui-ux-spec.md` (R2), `…/visual-references/`, `…/ui-behavior-test-matrix.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-interface-entry/tickets/in-progress/chat-interface-entry/design-review-report.md` (ARCH-REV-006)
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-interface-entry/tickets/in-progress/chat-interface-entry/architecture-review-revision-record.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-interface-entry/tickets/in-progress/chat-interface-entry/implementation-handoff.md` (IR-003)
- Implementation Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-interface-entry/tickets/in-progress/chat-interface-entry/implementation-revision-record.md`
- Implementation evidence: `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-interface-entry/tickets/in-progress/chat-interface-entry/implementation-evidence/README.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-interface-entry/tickets/in-progress/chat-interface-entry/code-review-report.md` (CRR-003 Pass)
- Code Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-interface-entry/tickets/in-progress/chat-interface-entry/code-review-revision-record.md`
- Delivery Revision Record: N/A — not a delivery re-entry
- Coverage Investigation: `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-interface-entry/tickets/in-progress/chat-interface-entry/api-e2e-coverage-investigation.md`
- API/E2E Test-Case Ledger: `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-interface-entry/tickets/in-progress/chat-interface-entry/api-e2e-test-case-ledger.md`
- API/E2E Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-interface-entry/tickets/in-progress/chat-interface-entry/api-e2e-revision-record.md`
- Evidence: `…/api-e2e-evidence/` (round 1) and `…/api-e2e-evidence/round2/` (this round)
- Current API/E2E Revision ID: `API-REV-002`
- Current Execution Round: 2
- Trigger: `code_reviewer` CRR-003 Pass; code at `e5eac067d` (IR-002 `da1033860`, IR-003 `5f11d52f6`)
- Prior Round Reviewed: round 1 (API-REV-001, Fail 88%: F-01, F-02, F-03)
- Latest Authoritative Round: 2

## Routing Classification

- Task size `Large`; architectural risk `High`; input route `Reviewed`; successful-output route `Code Review`
- Proportional test-code review decision: `Required` (durable test code changed)

## Investigation And Execution Basis

- Investigation updated before execution (round 2 delta section): `Yes`
- Plan followed: `Yes`. The prior failures were rechecked first, then full regression was run.
- Reroute required: `No`

## Test-Case Ledger Reconciliation

- Ledger: round 1 Seq 1–33 and round 2 Seq 34–45, each recorded immediately. Nothing is interrupted or unstarted. Reconciled: `Yes`.

| Case ID | Round 2 Result | Last Event | Evidence | Note |
| --- | --- | --- | --- | --- |
| CE-01 server suites/build | Pass | Seq 34 | `round2/server-*.log` | 7 unchanged baseline failures |
| CE-02 web suite | Pass | Seq 35 | `round2/web-full.log` | 4 unchanged baseline files (reproduced on base in round 1) |
| CE-03 Electron suite | Pass | Seq 35 | `round2/web-electron.log` | — |
| CE-04 real catalog | Pass | Seq 43 | `round2/real-catalog-all-installed.json` | Now with request strength |
| CE-05..CE-16 (probe C01–C13) | Pass | Seq 37 | `round2/probe-codex/` | Full regression |
| CE-08 / F-01 (probe C05) | Pass | Seq 37 | `round2/probe-codex/C05-live-locked-footer.png` | Resolved |
| CE-09 / F-02 (probe C07 ×14; d14 stale, stale-resume) | Pass | Seq 37, 41 | `round2/probe-codex/`, `round2/d14-*` | Resolved |
| CE-18 / F-03 (probe C14/C15 on Codex, Claude, Grok; C14 on AGY; d15 matrix) | Pass | Seq 37–40, 42 | `round2/probe-*`, `round2/d15/` | Resolved |
| CE-17 ALL_INSTALLED per runtime | Pass (round 1 Codex/Claude/AGY/AutoByteus; round 2 Codex/Claude/Grok via C04) | Seq 25, 37–40 | — | — |
| CE-19 packaged Electron | Pass (round 1; no relevant code changed since) | Seq 29 | `electron-*.log`, `explore/electron-landing.png` | — |
| CE-20 voice | Mic presence Pass (round 1); dictation Not Tested | Seq 30 | — | Residual |

## Compatibility / Legacy Scope Check

- Backward compatibility introduced or tolerated: `No`. The D-15 strong path keeps the existing fail-fast unchanged by design, and D-14 replaces the SR-008 guard as a clean cut (confirmed by code review).
- Legacy retention observed: `No`
- Approved persisted-data transition followed: `Yes`. An `agent-config.json` without `skillScope` reads as `CONFIGURED` (probe C01, every runtime run).
- Compatibility-only durable coverage: `No`

## Changed Boundary And Evidence Matrix

| Scenario | Behavior / Req / AC | Surface | Evidence Type | Result | Evidence |
| --- | --- | --- | --- | --- | --- |
| C01 | REQ-007, D-10, persisted data | Owned server + GraphQL | Durable/Live | Pass | `round2/probe-codex/` |
| C02 | AC-001, AC-017, REQ-004, REQ-014 | Chrome 1440×900 | Durable/Browser | Pass | `C02-new-chat-1440.png` |
| C03 | AC-003..AC-007 menus | Chrome | Durable/Browser | Pass (Codex, Claude, AGY, Grok) | `round2/probe-*` |
| C04 | AC-002, AC-006, AC-016, D-13, REQ-007 | Chrome + runtime | Durable/Live | Pass (Codex, Claude, Grok) | `round2/probe-*` |
| C05 | AC-009, REQ-011, UIS-004, VIS-015 (F-01) | Chrome + Codex | Durable/Live | Pass | `C05-live-locked-footer.png` |
| C06 | AC-009, D-08 | Chrome + Codex + GraphQL | Durable/Live | Pass | evidence JSON |
| C07 ×14 | D-04 alternate, D-13, D-14 (F-02), AC-003, AC-012 | Chrome (fault injected) + Codex | Durable/Live | 14/14 Pass | evidence JSON |
| d14 `stale`, `stale-resume` | D-14 (F-02) deterministic | Implementer probe, rerun by me | Temporary/Live | Pass, 0 closes | `round2/d14-*` |
| C08 | REQ-017, AC-014, D-05 | Chrome + Codex | Durable/Live | Pass | evidence JSON |
| C09 | AC-007 | Chrome | Durable/Browser | Pass | evidence JSON |
| C10 | AC-008, AC-011, D-06 | Chrome + Codex + GraphQL | Durable/Live | Pass | `C10-team-view.png` |
| C11 | RSK-005, AC-010, AC-013 | Chrome + org run | Durable/Browser | Pass | evidence JSON |
| C12 | AC-015, QR-003 | Chrome 390×844 | Durable/Browser | Pass | `C12-narrow-model-sheet.png` |
| C14 | D-15 Rule 1 / V-D (F-03) | Chrome + runtime | Durable/Live | Pass (Codex, Claude, Grok, AGY) | `round2/probe-*` |
| C15 | D-15 Rule 2 V-B, V-A, V-E | Chrome + runtime | Durable/Live | Pass (Codex, Claude, Grok) | `round2/probe-*` |
| d15 matrix | D-15 V-A..V-E incl. V-C, real same-name pairs | Implementer probe, rerun by me | Temporary/Live | 13/13 Pass | `round2/d15/` |
| C13 | REQ-007, D-10 restart lifecycle | Owned server restarts | Durable/Lifecycle | Pass | `backend-restart-*.log` |
| Real catalog | RSK-003, D-15 on AGY | Built server modules | Temporary | Pass | `round2/real-catalog-all-installed.json` |
| Packaged app | REQ-007, REQ-020, AC-011 mic | Packaged Electron (round 1) | Desktop | Pass | round-1 evidence |

## Validation Confidence Scorecard

| Confidence Category | Post-Repository (R2) | Final (R2) | Change vs R1 final | Supporting Evidence | Residual Uncertainty |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 85% | 96% | +11 | Every AC exercised live, including the fixed AC-009 lock presentation, D-04 alternate and D-15 | Voice dictation (mic presence only) |
| Changed-boundary execution directness | 80% | 97% | +2 | The fixed code paths (`chatRunModelControls`, `agentRunStore` marker, reconcile, D-15 materializers) are driven through the real UI and servers | — |
| Cross-boundary integration realism and mock gap | 75% | 97% | +2 | Five runtimes live (Codex, Claude, AGY, Grok; AutoByteus in round 1); real 78-skill catalog | Only the `PrepareAgentRun` fault is injected; the deterministic D-14 stale snapshot is injected at the network boundary (implementer probe) |
| Environment, configuration, identity, and fixture fidelity | 85% | 95% | +3 | Sanitized owned env; fresh roots; real same-name pairs (d15) plus a shadowing fixture | — |
| Failure, edge-case, lifecycle, and recovery evidence | 75% | 94% | +19 | F-02 deterministic fail→pass evidence plus 14/14 volume; D-15 fail-fast strong paths; restart lifecycle | The D-14 marker has no timeout (design-approved, C-08); the Windows re-point fallback is unit-only |
| User-surface, browser, and desktop-shell confidence | 75% | 93% | +11 | VIS-001/003/010/013/015/017/023/024/025 compared; 390×844; packaged landing (round 1, shell code unchanged) | Not every VIS reference was compared pixel-wise; icons load at runtime (existing Iconify pattern) |
| Durable regression coverage quality and relevance | 85% | 96% | +4 | Probe now covers C01–C15 with `--repeat` and a runtime selector | — |

- Overall post-repository confidence (round 2): 80%. Overall final confidence: **95%** (simple average, 95.4).
- Every critical acceptance criterion directly proven: `Yes`
- Final categories below 90%: `No`
- 95% target met: `Yes`
- Confidence-limiting residual risks: voice dictation not automatable; the D-14 marker has no timeout (accepted); the Windows re-point fallback is unit-only.

## Broader Validation Decision And Execution

- Decision: `Required`, executed. Modes: Browser (Playwright/Chrome, owned real backend, real runtimes); Lifecycle (owned server restarts); packaged Electron evidence carried over from round 1 (no shell, seeding or page changes since, per `git diff 797d49d6a..HEAD`).
- Startup and environment: as in round 1. Every owned process ran under a sanitized env (the shell inherits the user's AutoByteus environment). Probe-owned roots were created under `$TMPDIR` and removed.
- The implementer's probes (`d14-reconcile-probe.mjs`, `d15-skill-strength-probe.mjs`) were audited before running. They copy from user skill repos read-only and write only to owned temp roots.

| Journey | Expected | Actual | Result |
| --- | --- | --- | --- |
| Live chat opened fresh (F-01) | Model and thinking locked | 🔒 `gpt-5.5 · Codex`, 🔒 `Medium`; `aria-disabled`; tooltip | Pass |
| Resend after a failed first send ×14 (F-02) | Permanent URL, reply streams, chat kept | 14/14 | Pass |
| Stale snapshot on first send / Offline resume (F-02) | No close of P | 0 closes; reply streamed | Pass |
| Daily Assistant in a folder with a user-owned same-named skill, on Codex/Claude/Grok/AGY (F-03) | Starts; folder untouched; configured agent fails fast | As expected; `skipped-workspace-owned` logged | Pass |
| Configured agent next to a live Daily Assistant (V-B) | Launch succeeds; link re-pointed; weak run stays active | `yielded-to-configured`; link → private source; weak run active | Pass |
| Daily Assistant next to a live configured agent (V-A) | Starts; link unchanged | `skipped-held-by-other-run` | Pass |
| All runs terminated (V-E) | Link kept while the strong holder lives; removed at the end | As expected | Pass |

## Platform / Runtime Targets

macOS Darwin 25.5 arm64; Node v22.21.1; Chrome headless via playwright-core; runtimes: Codex App Server (gpt-5.5/5.6-*), Claude Agent SDK (sonnet), Antigravity CLI (claude-sonnet-4-6), Grok Build (default model), AutoByteus via LM Studio (round 1). Viewports 1440×900 and 390×844.

## Lifecycle / Persisted-Data Checks

- `Directly Usable — No Migration` confirmed again (C01 on every runtime run).
- Daily Assistant restart lifecycle (C13) passes; packaged seeding and relaunch preservation passed in round 1 (code unchanged).
- Version-specific fallbacks: `No`.

## Tests Implemented Or Updated

| Path | Change | Requirement / Boundary | Result |
| --- | --- | --- | --- |
| `autobyteus-web/tests/e2e/chat-entry-live-probe.mjs` | Added (round 1), updated (round 2: `--repeat`, C14, C15, `probe-shadow-owner` fixture, runtime skill-dir maps, disposition matcher) | Live Chat journeys C01–C15; D-13, D-08, D-14 path, D-15 Rules 1/2, RSK-005, seed lifecycle | All pass (Codex full; Claude/Grok/AGY subsets) |
| `autobyteus-web/package.json` script `test:e2e:chat-entry-live` | Added | Entry point | — |
| `autobyteus-web/components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.regressions.spec.ts` | Updated (CR-001: removed stale `createDraftRun` mock) | Removal plan | 2 unchanged baseline failures, 1 pass |

## Tests Removed As Stale Or Obsolete

None.

## Durable Coverage Changed In The Codebase

- Yes. Paths: the three above. They are uncommitted in the worktree and are attached for proportional test-code review. Removed paths: none.

## Other Execution Artifacts / Temporary Scaffolding

| Path | Purpose | Retained |
| --- | --- | --- |
| `api-e2e-evidence/probes/real-catalog-all-installed-probe.mjs` (updated with `requestStrength`) | RSK-003 real catalog and AGY weak/strong collision | Evidence (machine-specific catalog) |
| `api-e2e-evidence/probes/*` (round-1 exploration) | Exploration and isolation | Evidence |
| `api-e2e-evidence/round2/*` | Round-2 logs, evidence JSON, screenshots | Evidence |

## Dependencies Mocked Or Emulated

| Dependency | Method | Limitation |
| --- | --- | --- |
| `PrepareAgentRun` failure (C07) | One-time Playwright GraphQL error response | Network-level emulation |
| Stale history snapshot (d14 probe) | Implementer probe serves an inactive snapshot to the triggered refresh | Deterministic injection of the natural race |
| Voice dictation | Not emulated | Not proven |

## Result Summary

| Result | Scenarios | Summary |
| --- | --- | --- |
| Pass | C01–C15, C07 ×14, d14 stale/stale-resume, d15 matrix, real catalog, repository suites | All prior failures resolved; no regressions |
| Not Tested | Voice dictation | No automatable microphone audio (mic presence verified in round 1) |

## Prior Failure Resolution

| Prior Finding | Resolution | Evidence |
| --- | --- | --- |
| F-01 (Local Fix) | Resolved: the locked thinking control is shown on a fresh live chat | C05 Pass; screenshot |
| F-02 (Unclear → CR-003, D-14) | Resolved: 14/14 resend journeys; deterministic stale first-send and stale-resume pass with 0 closes | C07 ×14; `round2/d14-*` |
| F-03 (Design Impact → CR-004, D-15) | Resolved: Daily Assistant starts next to user-owned or configured-held skill paths on all workspace-link runtimes and AGY; configured strong paths unchanged | C14/C15 on 4 runtimes; `round2/d15/`; real catalog |

## Cleanup Performed

| Resource | Action | Result |
| --- | --- | --- |
| Probe-owned temp roots and processes (Codex, Claude, AGY, Grok runs; d14 ×2; d15) | Probe cleanup | None left (checked `$TMPDIR`, `/tmp`, process list) |
| Real-catalog collision workspace | `rm -rf` | Done |
| User's AutoByteus app (pid 99100, :29695), `~/.autobyteus`, skill repositories | Not touched | Running; unchanged |

## Observations (non-blocking)

- Icons are loaded at runtime through `@iconify/vue` (existing app-wide pattern), so first-use icons (check, search, arrow) can appear a moment later.
- In VIS-010 send appears enabled while `/sk` is typed. Send state is not listed as normative for VIS-010, and the send rule (`hasSendableDraft`) is as designed.
- Delivery note C-12 (from code review): after merging `origin/personal`, `tests/e2e/runtime/agy-native-image-codex-skill.e2e.test.ts` needs `skillRequestStrength` to type-check.

## Recommended Recipient

`/software_engineering_team/code_reviewer` — proportional test-code review.

## Latest Authoritative Result

- Result: `Pass`
- Final validation confidence: 95%
- Default 95% target met: `Yes`
- Final categories below 90%: `No`
- Broader validation decision: `Required` — executed
- Critical acceptance criteria lacking direct proof: none (voice dictation is non-critical; mic presence proven)
- Required next recipient: `code_reviewer` for proportional test-code review
