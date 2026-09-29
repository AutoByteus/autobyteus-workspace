# API/E2E Test-Case Ledger — chat-composer-polish

## Ledger Meta

- Assigned worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/thinking-selector-auto-enable` (`3c7ad1ad0`)
- Coverage investigation: `/Users/normy/autobyteus_org/autobyteus-worktrees/thinking-selector-auto-enable/tickets/in-progress/chat-composer-polish/api-e2e-coverage-investigation.md`
- Execution coverage report: `/Users/normy/autobyteus_org/autobyteus-worktrees/thinking-selector-auto-enable/tickets/in-progress/chat-composer-polish/api-e2e-execution-coverage-report.md`
- API/E2E revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/thinking-selector-auto-enable/tickets/in-progress/chat-composer-polish/api-e2e-revision-record.md`
- Ledger scope and reason: two repository runs plus seven browser journeys, including real runtime launches (multi-case, interruption-prone)
- Last updated: 2026-09-29

## Planned Cases

| Case ID | Case / Journey | Req / AC IDs | Boundary / Execution Surface | Planned Command Or Entry Point | Planned Order | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| R1 | Focused vitest | all | Repository | `vitest run components/chat utils/... components/workspace/config components/launch-config stores/__tests__` | 1 | |
| R2 | Full `test:nuxt` | regression | Repository | `vitest run` | 2 | Compare the failure set with the IE baseline |
| T01 | Claude SDK merged menu (desktop) | AC-001, 004, 005; REQ-001a, 002, 003; QR-002 | Browser | `pnpm -C autobyteus-web test:e2e:chat-composer-polish` | 3 | |
| T02 | Launch at High → recorded `llmConfig` | AC-001, REQ-001 | Browser → GraphQL | same | 4 | real Claude SDK run |
| T03 | Launch at Off → run-settings Advanced effort auto-enables → save | AC-010, REQ-008 | Browser → GraphQL | same | 5 | real Claude SDK run |
| T04 | Non-switch schema parameters mode | AC-006 | Browser | same | 6 | depends on catalog availability |
| T05 | Workspace search (desktop, 14 workspaces) | AC-007, 008; REQ-005, 006, 009; QR-001 | Browser | same | 7 | |
| T06 | Layout geometry at 1440×1000, 1280×700 | AC-009, REQ-007 | Browser | same | 8 | |
| T07 | Narrow bottom-sheet smoke | REQ-001a, 005 | Browser | same | 9 | |

## Execution Events

| Sequence | Case ID | Timestamp | Event | Command / Entry Point / Material Configuration | Expected Observable Result | Observed Result Or Checkpoint | Result | Evidence / Artifact Path | Next Action / Unresolved Issue |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | R1 | 2026-09-29 19:41 | Completed | focused vitest (86 files) | All changed-area specs pass | 807/807 tests passed. 1 file failed to load: `stores/__tests__/applicationHostStore.spec.ts` cannot resolve `@autobyteus/application-sdk-contracts`, one of the IE's listed pre-existing failures and unrelated | Pass | `api-e2e-evidence/R1-focused-vitest.log` | R2 |
| 2 | R2 | 2026-09-29 19:42 | Started | full `vitest run` (background) | Only pre-existing failures | running | — | `api-e2e-evidence/R2-full-test-nuxt.log` | — |
| 3 | R2 | 2026-09-29 19:47 | Completed | full `vitest run` | Only pre-existing failures | 3357 passed, 8 failed in 11 files. There are 10 of the IE's 11 baseline files. `UserMessageStoredUploadNames` passed this time. `electron/extensions/managedExtensionService.spec.ts` failed (`status 'error'`) but passes in isolation (15 files / 90 tests incl. `components/conversation` rerun) → load-flaky; electron extension code is untouched. The font-size audit flags only `settings/token-usage/*`. No failure touches a changed file. | Pass (no regression) | `api-e2e-evidence/R2-full-test-nuxt.log` | Browser probe |
| 4 | T01–T07 | 2026-09-29 19:49 | Started | `node tests/e2e/chat-composer-polish-probe.mjs --output-dir ../tickets/in-progress/chat-composer-polish/api-e2e-evidence/probe` (first pass: T01,T04–T07) | See plan | running | — | `api-e2e-evidence/probe/` | — |
| 5 | T01–T07 | 19:49 | Checkpoint | first pass | backend healthy | Setup blocked: backend `ERR_MODULE_NOT_FOUND` for `@autobyteus/application-sdk-contracts/dist/index.js` (worktree package never built; same cause as the pre-existing application spec failures). Fixed in the environment with `pnpm -C autobyteus-application-sdk-contracts build`. | — | `probe/backend.log` (first attempt, overwritten) | Rerun |
| 6 | T01, T04 | 19:50 | Checkpoint | first pass after build | — | Probe defects, not product: (a) this app's Tailwind `gray-300` is `rgb(179,179,179)`, not the default value hard-coded in the probe; (b) the draft read used `pinia.state` but `draft` is a store computed. Fixed the probe to assert the `text-gray-300` class + colour change and to read `pinia._s.get('chatDraft').draft`. T05, T06, T07 passed in this pass. | — | — | Rerun T01, T04 |
| 7 | T01, T04 | 19:51 | Completed | `--cases T01,T04` | merged menu / parameters mode | Both Pass (Claude SDK `claude-fable-5`, efforts low…max; Codex `gpt-5.5` parameters mode) | Pass | probe evidence json | Full run |
| 8 | T06 | 19:53 | Checkpoint | full run 1 (all Pass) | — | Supporting screenshot showed no thinking trigger immediately after a fresh page load with the last-used Claude model preselected. The source (`chatDraftModelControls.ts`, unchanged) takes the schema from the async runtime catalog. Added a wait and a settle-time record to T06 before measuring. | — | — | Rerun |
| 9 | T01–T07 | 19:54 | Completed | full run 2 | all Pass | All Pass. T06 `thinkingTriggerSettledMs` 1788 / 2298, so the missing trigger is catalog-load timing (existing behavior, not a defect). | Pass | probe evidence json | Check T03 screenshot |
| 10 | T03 | 19:55 | Checkpoint | review of supporting screenshot | toggle rendered On | Screenshot showed the Thinking toggle grey while the class assertion and the saved config said On. Suspected capture during the 200 ms transition. Strengthened T03: wait 600 ms, assert the computed background + knob offset, and assert Save is enabled before saving. | — | — | Final run |
| 11 | R1–R2, T01–T07 | 19:56 | Completed | final authoritative run: `node tests/e2e/chat-composer-polish-probe.mjs --output-dir ../tickets/in-progress/chat-composer-polish/api-e2e-evidence/probe` | all Pass | T01 Pass 7.2s; T02 Pass (recorded `{thinking_enabled:true, reasoning_effort:'high'}`, runtime replied); T03 Pass (recorded Off `{false,'medium'}` → toggle rendered Off (knob 0, `rgb(204,204,204)`) → effort high → rendered On (knob 20, `rgb(37,99,235)`), Save enabled → saved `{true,'high'}`); T04 Pass; T05 Pass; T06 Pass (1440×1000: 60px bias, +40px vs 14vh, centre −10px; 1280×700: 42px, +28px, centre −1px, no overlap/overflow, menus inside the viewport); T07 Pass. `browserErrors: []`. | Pass | `api-e2e-evidence/probe/chat-composer-polish-evidence.json`, screenshots | Cleanup |
| 12 | Cleanup | 19:57 | Completed | — | nothing owned left | Probe stopped the backend + Nuxt (SIGTERM) and removed the temp roots. The probe terminated both runs. `ps` shows no owned processes, and no `chat-composer-polish-*` temp dirs remain. Removed the `autobyteus-application-sdk-contracts/dist/` built for the run (untracked). | Pass | — | Report |

## Re-entry And Reconciliation

- Last durably recorded event: 12
- Last completed case and result: all R1, R2, T01–T07 Pass
- Cases still running, interrupted, or not started: none
- Next case or recovery action: none
- Interruption, context-compression, or rerun note: the reruns above were probe/environment corrections. No product case failed.
- Reconciled into execution coverage report: `Yes` (the report's "Test-Case Ledger Reconciliation" section)
