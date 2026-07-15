# API/E2E Coverage Investigation

## Investigation Meta

- Current Investigation Round: `3`
- Trigger: round-5 workspace-separator visual candidate `c448824203a9fd4ffc97e7884a992a7c03863b6f`
- Pre-impact behavior commit: `173848dea`; round-5 checkpoint: `d22085f9c`; bootstrap base: `9fda25eac8fc70df97599758760b47f25620cec8`
- Latest Authoritative Investigation: `Round 3`
- Upstream package: current requirements, investigation notes, design, UI/UX supplement, round-5 design review, implementation handoff, and code review. Historical pre-impact handoffs, API/E2E, test-review, delivery records, and rejected-header records were read only as regression context.

## Round History

| Round | Candidate | Result / Relevance |
| --- | --- | --- |
| 1 | rejected collapsed header | Historical Fail; obsolete UI |
| 2 | manual separator at `173848dea` | Historical Pass at 97.1%; behavior baseline only |
| 3 | workspace-gray visual candidate `c44882420` | Current authoritative investigation |

## Current Requirement And Design Basis

Round 3 must directly prove the new presentation layer: a soft `#e5e7eb` one-pixel resting edge with `1px 0 3px rgb(0 0 0 / 10%)` shadow; pointer-transparent four-pixel feedback strip; transparent rest, `#9ca3af` hover/keyboard focus, `#6b7280` active with active precedence; `background-color 0.2s ease`; and inset `2px #6b7280` focus outline with no blue. Geometry is exact at 256 (edge 255..256, feedback 254..258, target 252..260) and zero (0..1, 0..4, 0..8). All manual resize, cleanup, keyboard/ARIA, native inert/AX/Tab, responsive focus, session width, manager/request/data/scroll, route/mode/non-happy, browser, and Electron-equivalent behavior from round 2 must be freshly regressed. `WorkspaceDesktopLayout.vue` is reference-only and must remain unchanged.

## Changed Surface And Boundary Classification

| Surface | Affected | Current Boundary | Existing Evidence / Live Gap | Decision |
| --- | --- | --- | --- | --- |
| Frontend presentation | Yes | Settings edge/feedback/target layers and derived offset | New unit assertions cover source/offset; browser computed states, transitions, stacking and pixels remain indirect | Fresh production browser required |
| Pointer/keyboard/accessibility | Preserved but coupled to changed layers | existing composable and semantic target | Round-2 live evidence is historical; z-order and focus styling changed | Fresh browser regression required |
| Manager/API/data | No source change | existing Settings/Token manager | Must prove visual layer does not cause refetch/remount/reset | Deterministic browser fixture |
| Browser/Electron renderer | Yes, shared renderer | Nuxt/Vue/CSS | Build/unit do not prove computed rendering | Browser plus Electron suite/generation |
| Electron shell/IPC | No | no main/preload/window source change | repository suite/generation sufficient | No live desktop launch |
| Persisted data | No | width remains mount-local | remount/session regression | Browser |
| Backend/auth/worker/external | No | unchanged | out of changed boundary | No dedicated live dependency |

## Project Execution Discovery And Fixtures

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-full-width`; web package: `autobyteus-web`.
- Commands remain `pnpm test:nuxt ... --run`, `pnpm test:nuxt --run`, `pnpm test:electron --run`, `pnpm build`, `pnpm generate:electron`, localization guard/audit, and `git diff --check`.
- There is no repository browser-E2E framework. A retained ticket Playwright Core probe will serve the successful production build from a ticket-owned SPA server on port 3317 and use Chrome 150.
- Deterministic GraphQL interception supplies 20 task rows, nested member, model aggregate, and loaded/loading/error/empty phases. No secret, account, persistent backend data, or migration is required.
- Persisted-data decision: `Not Affected`; no compatibility branch, migration, or persistence is approved.

## Existing Durable Coverage Validity

| Coverage | Decision | Reason / Action |
| --- | --- | --- |
| `useSettingsNavigationResize.spec.ts` | Still Valid, expanded by implementation | Covers feedback offsets at normal/near-zero/zero plus preserved mechanics; execute |
| `pages/__tests__/settings.spec.ts` | Still Valid, expanded by implementation | Covers layer roles/tokens/precedence/no-blue and shell behavior; execute |
| AppLeftPanel, TokenUsageStatistics, table and store specs | Still Valid | preserved regression boundary; execute |
| Round-2 browser harness/results | Replace as current evidence | Copy/adapt harness into isolated round-3 directory; do not reuse conclusions |
| WorkspaceDesktopLayout tests/source | Reference-only | verify no diff; do not create Settings coupling |

No API/E2E-owned durable test addition, update, removal, or disabling is planned. A new browser framework would be disproportionate for this bounded impact; the reproducible ticket probe supplies direct executable evidence.

## Repository And Broader Execution Plan

| Order | Scenario | Planned Evidence |
| --- | --- | --- |
| 1 | focused seven-file suite | Pass: 7 files / 42 tests |
| 2 | localization, diff, WorkspaceDesktopLayout unchanged | Pass |
| 3 | full Nuxt and Electron suites | Changed scope Pass; Nuxt baseline retained four unrelated failures with 354 files / 1,874 tests passing and one skipped; Electron 23 files / 97 tests pass, one skipped |
| 4 | browser and Electron generation | Both Pass |
| 5 | `BROWSER-R3-000/001` | Pass: exact default geometry and computed rest/hover/focus/active/transition/outline/shadow/no-blue |
| 6 | `BROWSER-R3-002` | Pass: partial/zero/restored geometry, pointer transparency, target-only hitability and no overflow |
| 7 | `BROWSER-R3-003`–`009` | Pass: cleanup, keyboard/AX/Tab, breakpoint/narrow, session/remount, manager/data/request/scroll, non-happy, routes/modes/Back |

## Post-Repository Confidence And Broader Gate

Post-repository confidence was 90.0%; current critical visual states and layer geometry still required direct execution. Broader validation completed successfully. Final confidence is `97.7%`, every category is at least 96%, and every critical criterion passed; see the canonical execution report.

## Investigation Decision

- Proceed: `Completed`
- Broader validation: `Required and completed — production browser plus Electron-equivalent checks`
- Durable API/E2E test changes: `No`
- Reroute before execution: `No`
- Evidence directory: `execution-evidence/workspace-visual-round-3/`
