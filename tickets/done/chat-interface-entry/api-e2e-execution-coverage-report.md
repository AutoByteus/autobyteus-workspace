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
- Current API/E2E Revision ID: `API-REV-003`
- Current Execution Round: 3
- Trigger: `code_reviewer` CRR-005 Pass; code at `e9f2ce399` (IR-004 `9d65adf6e`, D-16) on delivery's merge `7aa53519b` + `4b440e719`
- Prior Round Reviewed: round 2 (API-REV-002, Pass 95%); round 1 (API-REV-001, Fail 88%)
- Latest Authoritative Round: 3 (the "Round 3" section below; earlier sections describe round 2 and remain valid for the unchanged scope, re-run on the merged HEAD in round 3)

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

## Round 3 (API-REV-003) — D-16 Chat model labels, merged HEAD

### Evidence Matrix

| Scenario | Behavior / Req / AC | Surface | Evidence Type | Result | Evidence |
| --- | --- | --- | --- | --- | --- |
| Repository suites | all | vitest (server targeted, web under `LANG=en_US.UTF-8`, Electron) | Durable | Pass (server 811 + 7 baseline; web 3347 + 4 baseline files; Electron 177) | `round3/*.log` |
| C16 V-L1 | AC-018 Claude rows | Chrome + real Claude catalog | Durable/Live | Pass: `opus` → `claude-opus-5-5`, secondary "Opus 5.5 · For complex work and everyday tasks", Recommended, listed first; all 10 rows match the oracle | `round3/probe-c16*/` |
| C16 V-L2 | AC-018 persisted Offline chat | Chrome + Claude run, terminate, reload | Durable/Live | Pass: trigger `claude-opus-5-5`; fixed list follows the policy, recommended first; fixed-list search `Opus 5.5` finds it | `C16-claude-offline-fixed.png` |
| C16 V-L3 | AC-018 Codex | Chrome + Codex catalog | Durable/Live | Pass: display names (`GPT-5.5 (default reasoning: medium)` …), one line, title = full text | `C16-narrow-codex-labels.png` |
| C16 V-L4 | AC-018 AutoByteus | Chrome + AutoByteus catalog | Durable/Live | Pass: identifiers (OPENAI_COMPATIBLE/QWEN display names per the shared rule) | evidence JSON |
| C16 search | AC-018 | Chrome | Durable/Live | Pass: `opus-5-5`, `Opus 5.5`, `opus`, `gpt-6` (all 6 Codex gpt-6 models) | evidence JSON |
| C16 V-L5 parity | AC-018, REQ-017 | Chrome: Agents → Run form (Claude SDK) vs Chat | Durable/Live | Pass: identical labels, badges and order (10/10) | evidence JSON |
| Gear editor V-L5 | AC-018, REQ-017 | Repository fixture probe `existing-run-model-config-probe.mjs` + `RuntimeModelConfigFields.spec.ts` | Durable | Pass (API-E2E-004-A..F) | `round3/existing-run-model-config/` |
| C16 narrow | AC-018, QR-003 | Chrome 390×844 | Durable/Browser | Pass: no overflow, rows single-line | `C16-narrow-codex-labels.png` |
| C04 trigger | AC-016 + AC-018 | Chrome on Codex, Claude, Grok | Durable/Live | Pass: `GPT-5.5 (default reasoning: medium) · Codex`, `claude-opus-5-5 · Claude SDK`, `Grok 4.7 · Grok Build` | `round3/probe-*` |
| Full regression C01–C16 (C07 ×5) | all prior ACs | Chrome + Codex on merged HEAD | Durable/Live | Pass (C04 re-run after the probe's settle-wait fix) | `round3/probe-codex/`, `round3/probe-c04/` |

### Observation O-1 (non-blocking)

On a fresh New chat the footer trigger first shows the raw identifier of the last-used model, then switches to the policy label when that runtime's catalog arrives: Codex `gpt-5.5` → display name after ~0.6 s, Grok ~1.7 s, Claude `opus` → `claude-opus-5-5` after ~1.6–3.0 s (~2.0 s at 390 px). The steady state meets AC-018; the transient is a catalog-loading fallback (D-16 prefers the catalog record "when present"). It is the same bare `opus` UVF-001 reported, but only for the first seconds after a fresh load. Recorded for the reviewer/designer; not classified as a failure.

### Scorecard (round 3)

| Category | Final | Note |
| --- | --- | --- |
| Requirement and acceptance-criteria proof | 96% | AC-018 V-L1..V-L5 proven live against an independent oracle; prior ACs re-run on merged HEAD |
| Changed-boundary execution directness | 97% | Real catalogs, real UI, launch-form parity |
| Cross-boundary integration realism | 97% | Codex, Claude, Grok live; AutoByteus catalog |
| Environment / fixture fidelity | 95% | Sanitized owned envs; real runtime catalogs |
| Failure / lifecycle | 94% | Unchanged from round 2 (C07 ×5 re-run on merged HEAD) |
| User surface / browser / desktop | 93% | O-1 transient; packaged app evidence from round 1 (shell unchanged) |
| Durable regression quality | 96% | C16 added; C04/selector maintained |

- Overall final confidence: **95%**. No category below 90%. Every critical AC directly proven.

### Durable Coverage Changed (round 3)

- `autobyteus-web/tests/e2e/chat-entry-live-probe.mjs` — `MODEL_ROW` exact option-row selector; `pickModel` returns the row label; C04 trigger check uses the policy label with a settle wait and records timing; new C16 (AC-018).
- No other test file changed this round. Removed paths: none.

### Cleanup

No owned roots or probe processes remain. The user's app was not touched (it is running with a new pid after a user restart).

### Round 3 Result

- Result: `Pass`; final confidence 95%; broader validation `Required` — executed (browser + live runtimes); recommended recipient `code_reviewer` for proportional test-code review of the probe changes.

## Round 4 (API-REV-004) — Real desktop app (isolated instance)

At the user's direction the real desktop app was validated directly: this ticket's app was built and launched as an isolated instance (`pnpm --dir <worktree> isolated-app start --build`; own data root, own ports, production settings excluded), driven through the browser-automation CLI in attach-only mode on control port 9333 (clicks and typing via `run-script` + `__abDemo`; screenshots and two MP4 recordings as supporting evidence), and stopped afterwards. HEAD `3c062a180` contains `origin/personal` `8778420fc` (only the docs-only `f2924a2b0` is newer).

| Case | Proves | Result | Evidence |
| --- | --- | --- | --- |
| DT-00 | Isolation: fresh data root, only built-ins visible, Daily Assistant seeded ALL_INSTALLED | Pass | `round4-desktop/isolated-start.json` |
| DT-01 | Desktop lands on `#/chat`; Chat first; defaults (AC-001, AC-017) | Pass | `DT01-landing.png` |
| DT-02 | AC-018 labels in the packaged app (Claude canonical + Recommended first; Codex display names) | Pass | `DT02-*` |
| DT-03 | Tag → send → streamed reply, D-13 permanent id, chips, last-used label (AC-002, AC-006, AC-016) | Pass | `DT03-chat-reply.png` |
| DT-04 | Live lock (model + thinking), tree terminate, Offline runtime-fixed save (AC-009, D-08) | Pass | `DT04-offline-saved.png` |
| DT-05 | Desktop restart: Daily Assistant edit preserved; chat reopened from the tree with chips and saved model; resume on the saved model | Pass | `DT05-*.png` |
| Recordings | Supporting video of DT-01..DT-04 and DT-05 | — | `desktop-chat-journey.mp4` (202 s), `desktop-after-restart.mp4` (37 s) |

Observations (non-blocking):
- **O-2:** the Chat `/` skill list is loaded once per app session (`useChatComposerOptions` fetches only while the store is empty). A skill added outside the Skills page (another client, files dropped into a skill root) is missing from `/` until the Skills page is visited or the app restarts; the runtime still receives it (ALL_INSTALLED is resolved at run start). `location.reload()` does not reload this renderer, so a reload is not a user remedy either.
- **O-3:** at the desktop default width (1200 px) a long Codex label (`GPT-5.6-Luna (default reasoning: …`) also truncates the runtime badge in the footer trigger to "Co…"; the full text stays in the tooltip.
- O-1 (identifier before the catalog loads) was not observable after the desktop restart: the label had already settled when sampled.

Result: `Pass`. The desktop evidence replaces the earlier packaged-harness evidence for launch, seeding, restart persistence and the core Chat journeys. Final confidence stays **95%**; the user-surface/desktop category rises to 95%. Cleanup: instance stopped gracefully, ports released, data root removed, the user's AutoByteus untouched.

## Round 5 (API-REV-005) — D-17 (R3) run view, real desktop app (superseded by Round 6)

HEAD `e9ede7d83` (IR-005 `1f5fd8004`, IR-006 `59a20f21b`). Repository: web 3374 passed + same 4 baseline files; Electron 187 passed; server unchanged since `3c062a180` (rebuilt).

| Scenario | Proves | Result | Evidence |
| --- | --- | --- | --- |
| Prior UF-01 | Chat header over the centre column; full-height right column from the top (= Team) | Resolved — probe C17 geometry Chat = Team at 1440×900 (column x 990–1440, y 0–900; header right 988); desktop DT-21 | `round5/probe-codex-full/C17-*.png`, `round5-desktop/DT11-chat-run-view.png` |
| Prior UF-02 | Strip Files/Terminal open exactly those tabs (Chat and Team) | Resolved — C17 and desktop DT-25 | `DT14-chat-strip.png` |
| C05 / DT-22 | ⚙ locked while live (lock note, model disabled, Save disabled) | Pass (see UF-03) | `C05-run-settings-live-locked.png`, `DT12-run-settings-live.png` |
| C06 / DT-23 | D-08 via ⚙: Offline save → reload → save → resume on the saved model; relocks | Pass | evidence JSON, `DT13-*.png` |
| C07, C08 | Failed-then-resent temp chat and catalog draft send through the product box; D-13 | Pass | evidence JSON |
| C11 | Shared right panel open by default; RSK-005 | Pass | evidence JSON |
| C12 | 390×844 New chat + narrow chat run view (VIS-027) | Pass | `C12-narrow-*.png` |
| C16 | AC-018 labels; Offline Claude ⚙ labels (Provider / canonical), recommended first; launch-form parity | Pass | evidence JSON |
| C17 | Frame geometry, default tabs (Activity / Team), strip exact tabs, shared collapse, reopen keeps its tab | Pass | `C17-*.png` |
| C18 | Draft ⚙ (catalog draft, failed first send): local edit, no server call before send, send uses it | Pass | evidence JSON |
| C19 | CR-005: ⚙ stays with its run (New chat success/failure, Team quick path); header ＋ preset | Pass | evidence JSON |
| C01–C04, C09, C10, C13–C15 | Regression (seed, landing, menus, tags, D-15, team quick path, restart) | Pass | evidence JSON |
| **C20 / DT-24** | **D-15: configured agent with an unresolved configured skill next to a live Daily Assistant chat** | **Fail (UF-04)** | `round5/probe-codex-full/C20-failure.png`, `round5-desktop/isolated-instance.log` |
| DT-20 | Test data imported via Settings → Agent Packages | Pass | `DT10-package-imported.png` |
| DT-26 | Header ＋ on a DA chat → preset New chat | Pass | `DT15-plus-preset.png` |

### Findings

| ID | Severity | Finding | Evidence | Basis | Preliminary classification |
| --- | --- | --- | --- | --- | --- |
| UF-04 | Medium | A configured (strong) agent whose configured skill is **unresolved** (named skill bundled in another agent's folder) fails to start when a live Daily Assistant (ALL_INSTALLED, weak) chat in the same workspace has linked that skill name: `Workspace skill path collision for Codex skill '<name>': path '<ws>/.codex/skills/<name>' already points to live target '<source>'`. Without the live DA chat the same launch starts (desktop DT-24, relaunch after terminating the DA chat → `DESK-TEAM-OK`). Reproduced durably by C20 (`probe-borrower` with `probe-bundled`) | C20 details/log; `isolated-instance.log` L373–374 | D-15 promise "configured launches never regress because an ALL_INSTALLED chat is live" (REQ-017/AC-014); D-15 kept `reconcile-unresolved` unchanged and did not cover a weak holder | `Unclear` — Local Fix in the shared materializer's unresolved-reconcile path vs. a D-15 Design Impact (the rule for unresolved strong requests vs. weak holders is not specified) |
| UF-03 | Low | Live ⚙ on a fresh chat started with default thinking (`llmConfig: null`) shows Thinking / Reasoning Effort / Fast mode as "Not recorded for this historical run"; VIS-026 shows the (disabled) thinking values. Offline the same editor shows real values (Thinking on, medium) | `DT12-run-settings-live.png`, `DT13-run-settings-offline.png` | R3 VIS-026, REQ-011 | `Local Fix` (misleading wording/values for a new live chat; pre-existing editor rule surfaced by Chat's `llmConfig: null`) |

Observations (non-blocking, unchanged, with delivery): O-1..O-3. O-2 was seen again: after importing a package the `/` list shows the new skills only after visiting Skills. On the first probe screenshot the live ⚙ briefly showed "Runtime is not available in current capabilities." / "Loading model options…" before settling (transient).

### Scorecard (round 5)

| Category | Final |
| --- | --- |
| Requirement / AC proof | 88% (REQ-017 regression UF-04) |
| Changed-boundary directness | 97% |
| Integration realism | 96% |
| Environment / fixture fidelity | 96% (imported package test data in the desktop app) |
| Failure / lifecycle | 88% (UF-04) |
| User surface / browser / desktop | 93% (UF-03) |
| Durable regression quality | 96% |

- Overall: **93%**; categories below 90%: requirement proof, failure/lifecycle.

### Durable Coverage Changed (round 5)

- `autobyteus-web/tests/e2e/chat-entry-live-probe.mjs` — D-17 rewrite and C17–C20 (20 cases).

### Result

- Result: `Fail` (UF-04 blocking; UF-03 Low). Recommended recipient: `/software_engineering_team/code_reviewer` (failure-origin review).
- Cleanup: probe roots/processes removed; isolated instance stopped (graceful, ports released, data root removed). The user's AutoByteus untouched.

## Round 7 (API-REV-007) — UF-05 fix (IR-010 / CR-010) (latest authoritative)

- Trigger: CRR-015 Pass. The IR-010 fix (`a98a15d05`) moves `ToastContainer` from `z-[100]` to `z-[10000]` and adds `data-testid="toast-container"` and the `ToastContainer.spec.ts` guard. HEAD `e58fb160a`. Classification Large/High.

| Scenario | Proves | Result | Evidence |
| --- | --- | --- | --- |
| Prior UF-05: C22e rerun (Claude, `--owned-codex-home`) | Adding the owned Codex default folder through Skills → Sources shows "Ignored 1 skill from the Codex default folder…". The element at the toast's centre belongs to the toast layer (z 10000) while the Sources dialog (z 1000) is still open; the tier-1 copy is used; issue `shadowed_runtime_default` | **Resolved** — `toastOnTop: true`, `sourcesDialogOpen: true` | `round7/probe-claude/C22e-tier4-toast.png`, evidence JSON |
| Light regression, other pop-ups and toasts (Claude) | C21 banner; C22 conflict pop-ups (1100) over Sources and create dialogs, package import/reload; C03 model/skill/target menus; C12 narrow bottom sheet; C19 ⚙ and ＋; C04/C08 sends | Pass | `round7/probe-claude*` |
| Full regression (Codex `gpt-5.5`) | C01–C23 including the strengthened C22e and C23 org skills | 23/23 Pass | `round7/probe-codex-full/` |
| Web full (`LANG=en_US.UTF-8`) | Includes the new `ToastContainer.spec.ts` (2/2) | 3404 passed; the same baseline files as round 6 | `round7/web-full.log` |

Probe maintenance found during the partial Claude runs (test code only, no product finding):
- C04 sampled the workspace skills folder at its first entry; with the round-6 org fixture there are more links, written one by one. It now waits for the tagged `probe-bundled` link.
- C12 and C19 depend on state from C04 and C08. `--cases` now adds prerequisite producer cases (C03 model, C04 tagged run, C08 catalog run, C10 team run) and logs them. The expansion was unit-checked.

Desktop not rebuilt for IR-010: the change is one CSS layer value in a web component, verified in the browser at the Electron renderer's default layering. A desktop tier-4 repro would need a write into the user's `~/.codex/skills`.

### Scorecard (round 7)

| Category | Final |
| --- | --- |
| Requirement / AC proof | 96% |
| Changed-boundary directness | 97% |
| Integration realism | 96% (Grok/AutoByteus not rerun) |
| Environment / fixture fidelity | 96% |
| Failure / lifecycle | 96% |
| User surface / browser / desktop | 95% |
| Durable regression quality | 97% |

- Overall: **95%**; no category below 90%.

### Durable Coverage Changed (cumulative, uncommitted, for test-code review)

- Added: `autobyteus-server-ts/tests/e2e/skills/skill-name-catalog-graphql.e2e.test.ts`.
- Updated: `autobyteus-web/tests/e2e/chat-entry-live-probe.mjs` (C05 D-18; C15 replaced; C20 rewritten; new C21, C22 incl. the C22e layering assertion, C23; `--owned-codex-home`; org fixture; C04 exposure wait; `--cases` prerequisites).
- Updated (RD-01 stub fixes): `autobyteus-server-ts/tests/integration/agent-execution/{agent-run-manager.memory-layout.real,agent-run-prompt-fallback,autobyteus-agent-run-backend-factory}.integration.test.ts` and `…/compaction/{compaction-agent-parent-fallback,recursive-memory-compactor-leaf}.integration.test.ts`.
- Removed: no files. Removed test logic: the old C15 (D-15 Rule 2 dispositions `yielded-to-configured` / `skipped-held-by-other-run`, retired by D-19).
- Not durable (ticket evidence): `api-e2e-evidence/probes/d19-codex-duplicate-noauth.mjs`, `api-e2e-evidence/test-data/*`.

### Result

- Result: `Pass`, 95%. UF-05 resolved; no open findings. Observations O-1..O-7 unchanged (non-blocking). Recommended recipient: `/software_engineering_team/code_reviewer` (proportional test-code review, Large/High).

## Round 6 (API-REV-006) — D-18, D-19 one skill per name, DEC-017a Agent Org skills (superseded by Round 7)

- Triggers: CRR-011 (IR-007 D-18, IR-008 D-19) and CRR-013 (IR-009, DEC-017a). HEAD `a65f58463`. Classification Large/High.
- Environment: every owned process started under a sanitized env; owned temp roots; the user's AutoByteus (29695), `~/.autobyteus` and all skill repos untouched. Runtime default folder tests use an owned `CODEX_HOME` holding skills only; no credential was copied or linked (real `~/.codex/auth.json` size/mtime verified unchanged).

### Repository

| Suite | Result |
| --- | --- |
| Server targeted (skills, agent-definition, agent-org-definition/execution, built-in-agents, agent-execution, agent-packages, api; e2e skills, agent-definitions, agent-org-runs; integration agent-execution, skills) | 1381 passed; 22 failed, all pre-existing: rerun on a merge-base worktree (`f2924a2b0`) with identical failures (agent-packages-graphql ×2, json-file-persistence, agent-run-service ×6, codex-command-failure-transport, agent-run-provisioning, codex-tool-log-correlation ×4, package-root-summary, workspace-converter ×2, studio-application-api-services, memory-view-member-resolver ×2, agent-org-run-config) |
| New `tests/e2e/skills/skill-name-catalog-graphql.e2e.test.ts` | 9/9 (with `skills-graphql` 14/14); type-clean |
| Web full (`LANG=en_US.UTF-8`) | 3402 passed; 4 known baseline files (TreePanel regressions ×2, StartupDelayLifecycle, org-definition-navigation, font-size audit); `platformServerEnvironment` ×2 fail only under the web-root runner and pass in the canonical Electron runner (unchanged files) |
| Electron (`test:electron`) | 187 passed, 1 skipped |

Test drift found and fixed (RD-01): widening the server run to `tests/integration/agent-execution` exposed 8 ticket-caused failures (`this.skillService.hasEffectiveSkills is not a function`). Five integration files stub `SkillService` as `{ getSkill }`; since step 1 (`770b14651`) the AutoByteus factory calls `hasEffectiveSkills`. The stubs gain `hasEffectiveSkills: () => false` (they model "no skills"); all 14 tests in those files pass.

### Live (browser → Nuxt dev → real backend → real runtime)

| Scenario | Proves | Codex | Claude | AGY |
| --- | --- | --- | --- | --- |
| Prior UF-04: C20 V-F under D-19 | Configured agent naming a skill bundled elsewhere starts next to a live DA chat; both share the catalog copy's link; no unresolved warning, no removed D-15 disposition | Pass | Pass | n/a (no workspace link) |
| Prior UF-03: C05 D-18 | Fresh default-thinking chat records `llmConfig` = catalog `configSchema` defaults (Codex `{reasoning_effort: medium}`, Claude Sonnet `{thinking_enabled: false, reasoning_effort: medium}`; Haiku has no schema → `null`); live ⚙ shows the values disabled, never "Not recorded" | Pass | Pass | — |
| C15 D-19 / AR-013 | Configured agent with an on-disk private duplicate answers with the catalog copy's marker (ALPHA-OK, not SHADOW-OK), shares the DA link, no Rule 2/3 disposition, private copy byte-identical, link removed after both end | Pass | Pass | — |
| C21 AC-021 | Out-of-band duplicate → amber banner "Some skills share a name…"; details list used and ignored paths | Pass | Pass | — |
| C22 AC-020 | Pop-up "Duplicate skill names" with both paths for Add Folder, Create Skill (dialog keeps the name), package import, package reload (R-3: registration kept, banner lists the pulled copy); nothing changes | Pass | Pass | — |
| C22e tier 4 | Adding the (owned) Codex default folder that duplicates a skills-folder copy is accepted; toast "Ignored 1 skill from the Codex default folder…"; issue `shadowed_runtime_default`; tier-1 copy used | — | Pass — **see UF-05** | — |
| C23 DEC-017a | Org skills (org agent, org team shared, org team-local) on the Skills page and in DA `/`; org agent and team-local agent reply with their own skills' markers; links → org folders | Pass | Pass | Pass (capsule copies; replies) |
| C01–C14, C16–C19, C13 | Full regression (seed, landing, menus, tags, D-08/D-13/D-14, team quick path, labels, D-17 frame/⚙, CR-005, restart) | 23/23 Pass | — | — |
| Codex path match (no credentials) | K0 catalog precedence; K1 stale `CODEX_HOME/skills/desk-alpha` → `codex-runtime-duplicate` logged, link → package copy; K2 used copy in CODEX_HOME → `reconcile-discoverable`, no link, no log | Pass (on `10556948f` and `a65f58463`) | | |

Not run: Grok and the AutoByteus native runtime (the user stopped both runs in this round). The implementer's IR-008/IR-009 evidence covers Grok; AutoByteus org skills are unit-covered only.

### Desktop (isolated instance `iso-9333-ec39`, built from this worktree, driven over port 9333)

`isolated-app start --build` compiled the app bundle (16:55, contains IR-009) but failed at DMG packaging (`hdiutil resize` error 35, "resource temporarily unavailable", a macOS environment issue). The instance was started from that fresh bundle with `--from-worktree`. Test data created on disk under `api-e2e-evidence/test-data/` (`README-d19.md`) and imported through the UI.

| ID | Scenario | Result | Evidence |
| --- | --- | --- | --- |
| DT-40 | Import desk package (Settings → Agent Packages) | Pass | recording |
| DT-41 | Import `chat-entry-dup-package` → pop-up (desk-alpha existing vs new), not registered | Pass | `DT41-dup-package-conflict.png` |
| DT-42 | Import `chat-entry-org-package` | Pass | `DT42-org-package-imported.png` |
| DT-43 | Import `chat-entry-org-dup-package` → pop-up (org path vs incoming org path), not registered | Pass | `DT43-org-dup-package-conflict.png` |
| DT-44 | Skills page lists desk and org skills | Pass | `DT44-skills-page-org-skills.png` |
| DT-45 | Sources → Add Folder `chat-entry-dup-skill-folder` → pop-up; folder not added | Pass | `DT45-add-folder-conflict.png` |
| DT-46 | Create Skill `desk-writer-skill` → pop-up lists the org path; dialog keeps the name | Pass | `DT46-create-skill-conflict.png` |
| DT-47 | R-3: clean package imported from an owned working copy, out-of-band duplicate, Reload → pop-up; registration kept | Pass | `DT47-reload-conflict.png` |
| DT-48 | Banner lists desk-alpha used / pulled copy ignored | Pass | `DT48-skills-banner.png` |
| DT-49 | DA chat (Codex) follows desk-alpha → DESK-ALPHA-OK (catalog copy, not the ignored copy) | Pass | `DT49-da-desk-alpha.png` |
| DT-50 | D-18 live ⚙: medium, all selects and switches `disabled`, no "Not recorded"; "Runtime is not available" not present after 6 s | Pass | `DT50-live-run-settings-d18.png` |
| DT-51 | UF-04 on desktop: @Desk Team from Chat while the DA chat is live → lead replies DESK-TEAM-OK; no collision in the instance log | Pass | `DT51-team-next-to-live-da.png` |
| DT-52 | DA `/` list shows the org skills | Pass | — |
| DT-53..56 | Desk Org run from the Agent Orgs page (Codex, GPT-5.5): desk writer → DESK-WRITER-OK; desk crew coordinator (team-local) → DESK-MEMBER-OK and DESK-CREW-SHARED-OK | Pass | `DT55-org-writer-reply.png`, `DT56-org-team-member-replies.png` |
| — | Tier-4 toast on desktop | Not feasible: the desktop server uses the real `~/.codex/skills` (no loadable skills); creating one would write into the user's folder. Covered by C22e | — |

Stopped: recording `desktop-r6-journey.mp4`; `isolated-app stop` graceful, ports released, data root removed; owned reload working copy removed.

### Findings

| ID | Severity | Finding | Evidence | Basis | Classification |
| --- | --- | --- | --- | --- | --- |
| UF-05 | Low | The tier-4 notice toast ("Ignored N skills from the Codex default folder…") renders beneath the Manage Skill Sources dialog overlay: `ToastContainer` is `z-[100]`, the Sources `.dialog-overlay` is `z-index: 1000` (the conflict pop-up was raised to 1100, the toast was not). Adding a runtime default folder, the main tier-4 flow (AF-36 layout), happens inside that dialog, so the notice appears dimmed behind the overlay and auto-dismisses after 6 s | `round6/probe-claude/C22e-tier4-toast.png`, `round6/probe-claude-ir9/C22e-tier4-toast.png` | AC-020 / REQ-023 tier-4 notice | `Local Fix` |

Observations (non-blocking): O-1..O-3 unchanged. **O-4** the ⚙ thinking switches are `disabled` but keep active styling (pre-existing `ModelConfigBasic`, unchanged by the ticket). **O-5** the Agent Orgs list is stale after a package import until Reload (same class as O-2). **O-6** a package containing only `agent-orgs/` is rejected by the pre-existing shape rule ("must contain … 'agents', 'agent-teams', or 'applications'"), so an org-only package cannot be imported; real org repos also carry `agents/`. **O-7** "Successfully added source. Found 1 skills." counts copies the catalog ignores (pre-existing wording). **C-22** (held): no `agent-orgs/<org>/agents/<a>/skills` folder exists today in `autobyteus-agents` (3 orgs) or `autobyteus-private-agents` (1 org).

### Scorecard (round 6)

| Category | Final |
| --- | --- |
| Requirement / AC proof | 96% |
| Changed-boundary directness | 97% |
| Integration realism | 96% (Grok/AutoByteus not run this round) |
| Environment / fixture fidelity | 96% |
| Failure / lifecycle | 96% |
| User surface / browser / desktop | 91% (UF-05) |
| Durable regression quality | 97% |

- Overall: **94%**; no category below 90%.

### Durable Coverage Changed (round 6)

- Added `autobyteus-server-ts/tests/e2e/skills/skill-name-catalog-graphql.e2e.test.ts` (9 cases: AC-019, AR-013, AC-020 ×5 incl. GitHub import/update, DEC-017a ×2).
- Updated `autobyteus-web/tests/e2e/chat-entry-live-probe.mjs`: C05 D-18; C15 replaced (D-19); C20 rewritten (V-F under D-19); new C21, C22, C23; `--owned-codex-home`; org fixture.
- Fixed stale stubs (RD-01) in five `autobyteus-server-ts/tests/integration/agent-execution/**` files.
- Temporary: `api-e2e-evidence/probes/d19-codex-duplicate-noauth.mjs`.

### Result

- Result: `Fail` — one Low `Local Fix` (UF-05). Prior UF-04 and UF-03 are resolved. Recommended recipient: `/software_engineering_team/code_reviewer`. (UF-05 resolved in Round 7.)

## User Review Findings After API-REV-004 (resolved in round 5)

Raised by the user on the isolated desktop instance `iso-9333-b35d` after the API-REV-004 pass; confirmed by API/E2E. Routed at the user's request to `/software_engineering_team/solution_designer`. Status: **pending R3** — at the user's direction the Solution Designer sent the Product Prototyper a Result Correction request for R3 (`product-design-revision-request-r3-handoff.md`; `solution-designer-result-uvf-002.md`). No layout fix is routed against R2; the Solution Designer will integrate the user-confirmed R3 and route the implementation. API/E2E revalidates both items against R3.

| ID | Finding | Evidence | Basis |
| --- | --- | --- | --- |
| UF-01 | Chat run view layout differs from the Team/Org views: the chat header spans the full window width and the right tool strip/panel sits below it, instead of a full-height right column (three-column layout). Header right edge 1273 px = window width; tool shell starts at y = 56 | `round4-desktop/USER-Q1-chat-strip-collapsed.png`, `USER-Q1-chat-panel-open.png` | R2 VIS-018/VIS-019 show the full-height right column (implementation deviates); user wants Chat consistent with the Team/Org layout. Likely cause: `ChatRunView.vue` renders `ChatRunHeader` above `WorkspaceToolShell` |
| UF-02 | Clicking a strip icon (Files, Terminal) opens the panel on Activity instead of the clicked tab | `round4-desktop/USER-Q1-strip-files-click.png` | UIS-009, TR-013, CHK-015. Pending R3. Team-view comparison (shared panel, pre-existing or not) not yet run: waiting for the user's test-data direction |

Missed earlier: the round-1..4 visual comparisons checked the normative content lists of each reference, not the column structure; the strip-tab behavior was not asserted. Status: the latest API/E2E result is no longer a clean pass for AC-015 / UIS-009 until these are resolved or re-scoped by the Solution Designer.

## Latest Authoritative Result (round 2 — superseded by the Round 3 Result above)

- Result: `Pass`
- Final validation confidence: 95%
- Default 95% target met: `Yes`
- Final categories below 90%: `No`
- Broader validation decision: `Required` — executed
- Critical acceptance criteria lacking direct proof: none (voice dictation is non-critical; mic presence proven)
- Required next recipient: `code_reviewer` for proportional test-code review
