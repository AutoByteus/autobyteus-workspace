# Source-Versus-Prototype Comparison Report

## Result

**Pass — accepted and user-confirmed RER-009 current-state correction.** The retained baseline plus focused `PP-GAP-009` launch correction and `PP-GAP-010` member-focus correction have no failed comparison row, failed journey checkpoint, prototype browser error, or known perceptible/behavioral discrepancy against pinned source commit `8ef282ba77705180d985e7000d801f0e0068cdc1`.

## Controlled Conditions

- Retained-suite defaults: source `http://127.0.0.1:3100`; prototype `http://127.0.0.1:3200`; mock `http://127.0.0.1:4310`
- RER-009 correction run: exact-pin source export `http://127.0.0.1:3110`; prototype `http://127.0.0.1:3210`; mock `http://127.0.0.1:4311`
- Browser: system Chromium `/usr/bin/chromium`
- Viewports: desktop `1440×900`; narrow `390×844`
- Theme/motion: light / reduced motion
- Locales: English and Simplified Chinese
- Contexts: browser/external node, Electron/internal node, Electron/external node, paired and unpaired mobile, Applications enabled/disabled, loading/error/permission scenarios
- Data/assets: same synthetic records, local Iconify collections, local Monaco assets, same source fonts/assets
- Reset: mock state and browser storage reset before each controlled row
- External network: blocked by the harness and prototype boundary

Electron conditions use the same deterministic browser-injected host bridge in the runnable source and prototype. This compares exact Electron-visible UI without bundling or starting Electron. Source file-stream observation uses a controlled in-memory browser WebSocket fixture; the prototype uses its local scripted WebSocket boundary.

## Rendered Comparison Suites

| Suite | Stable IDs | Rows | Screenshot bytes identical | Bounded rendering-noise only | Semantic/body result | Browser errors | Result |
| --- | --- | ---: | ---: | ---: | --- | --- | --- |
| Preserved routes/config/states | `ROUTE-001`–`STATE-008` | 60 | 38 | 22 | Exact | source: 3 controlled-state diagnostics; prototype: 0 | **60/60** |
| Corrected host/workspace/mobile | `HOST-001`–`MOB-014` | 48 | 33 | 15 | Exact | 0 / 0 | **48/48** |
| All-route locale/responsive | `MAT-R001-DZH`–`MAT-R041-NZH` | 123 | 48 | 75 | Exact | 0 / 0 | **123/123** |
| Correction locale/responsive | correction `DZH`/`NEN`/`NZH` IDs | 116 | 88 | 28 | Exact | 0 / 0 | **116/116** |
| RER-009 focused launched-Team state | `WKS-022` / `JRN-050-D` | 1 | 1 | 0 | Exact | 0 / 0 | **1/1** |
| RER-009 focused launched-member state | `WKS-023` / `JRN-050-E` | 1 | 1 | 0 | Exact | 0 / 0 | **1/1** |
| **Total** |  | **349** | **209** | **140** | **Exact** |  | **349/349** |

“Bounded rendering-noise only” means the screenshot is semantically identical and differs solely within the harness's tight changed-pixel/max-channel threshold after matched rendering. It is not a visual waiver. The retained source and prototype screenshots can be reviewed directly.

Machine evidence:

- `/home/autobyteus/workspace/.codex/worktrees/initial-prototype-baseline/autobyteus-web-prototype/evidence/comparison/browser-parity-results.json`
- `/home/autobyteus/workspace/.codex/worktrees/initial-prototype-baseline/autobyteus-web-prototype/evidence/correction/correction-parity-results.json`
- `/home/autobyteus/workspace/.codex/worktrees/initial-prototype-baseline/autobyteus-web-prototype/evidence/matrix/route-matrix-results.json`
- `/home/autobyteus/workspace/.codex/worktrees/initial-prototype-baseline/autobyteus-web-prototype/evidence/correction-matrix/correction-parity-results.json`
- `/home/autobyteus/workspace/.codex/worktrees/initial-prototype-baseline/autobyteus-web-prototype/evidence/gap-009/gap-009-results.json`
- `/home/autobyteus/workspace/.codex/worktrees/initial-prototype-baseline/autobyteus-web-prototype/evidence/gap-010/gap-010-results.json`

## Interaction Suites

| Suite | Stable IDs | Method | Result |
| --- | --- | --- | --- |
| Preserved journeys | `JRN-001`–`JRN-018` | Same start state and actual clicks/typing/keyboard actions; compare post-action route, body, validation, focused element, dialogs/feedback, semantic action evidence and screenshot | **18/18** |
| Correction journeys | `JRN-019`–`JRN-049` | Same method, including Electron actions, server recovery, agent/team run lifecycle, tools, CRUD, mobile and history | **31/31** |
| RER-009 Team launch/member-focus journey | `JRN-050-A`–`JRN-050-E` | Real catalog **Run**, draft navigation, workspace selection, **Run Team**, context selection, chosen-workspace Team/member projection, then real `/writer` row activation and center-workspace focus; compare each checkpoint's route/body/focus, Pinia contract, browser errors and screenshot | **5/5 checkpoints; 1/1 journey** |
| **Total** |  |  | **50/50 journeys** |

Journey evidence:

- `/home/autobyteus/workspace/.codex/worktrees/initial-prototype-baseline/autobyteus-web-prototype/evidence/interactions/browser-journey-results.json`
- `/home/autobyteus/workspace/.codex/worktrees/initial-prototype-baseline/autobyteus-web-prototype/evidence/correction-journeys/correction-journey-results.json`
- `/home/autobyteus/workspace/.codex/worktrees/initial-prototype-baseline/autobyteus-web-prototype/evidence/gap-009/gap-009-results.json`
- `/home/autobyteus/workspace/.codex/worktrees/initial-prototype-baseline/autobyteus-web-prototype/evidence/gap-010/gap-010-results.json`

## Discovery And Presentation Completeness

- `evidence/interaction-discovery/interaction-discovery.json` classifies 179 source presentation test files and 925 discoverable cases into `DISC-001`–`DISC-017`.
- `evidence/presentation-code/presentation-code-parity.json` verifies 369 retained presentation files as exact byte matches.
- Together with the route/state/matrix/journey evidence, these audits prevent sampled journeys from being misrepresented as the whole UI boundary.

## Controlled Source Diagnostics

The original 60-row suite records source-side diagnostics only for:

- `ROUTE-029`: Apollo cache-field warnings caused by the deliberately small token-statistics source fixture; the rendered source/prototype surface is exact.
- `STATE-007`: errors intentionally emitted by the requested recoverable-error scenario.
- `STATE-008`: 403/network diagnostics intentionally emitted by the permission-denied scenario.

The final 48-row correction suite and both full matrices have zero source and zero prototype browser errors. The original prototype has zero browser errors. No diagnostic corresponds to an unknown or mismatched UI outcome.

## Manual Browser-Tool Review

Browser Tool evidence includes the retained production-build reviews plus a new direct RER-009 replay at the correction dev URLs:

- Electron/internal Extensions: DOM, controls, bounds, installed/enabled status and native-only actions inspected; screenshot `/home/autobyteus/workspace/.codex/worktrees/initial-prototype-baseline/autobyteus-web-prototype/evidence/manual/canonical-review-electron-internal-extensions.png`.
- Populated team workspace: scenario/context, conversation, status, Files tree/viewer, workspace tabs and zero visible alerts inspected; screenshot `/home/autobyteus/workspace/.codex/worktrees/initial-prototype-baseline/autobyteus-web-prototype/evidence/manual/canonical-review-workspace-team.png`.
- RER-009 complete Team launch: exact source and prototype journeys were independently replayed through Browser Tool; final state/selection/draft/projection contracts match and screenshots are byte-identical at `evidence/gap-009/manual-{source,prototype}-complete-journey.png`.
- PP-GAP-010 member focus: the complete source and prototype journeys were replayed through Browser Tool through `/writer` activation; focus, projection, `aria-current`, center header and screenshots match exactly at `evidence/gap-010/manual-{source,prototype}-writer-focus.png`.

## Conclusion

All exact-fidelity obligations for the retained baseline and requested RER-009 corrections pass. There is no accepted intentional delta and no remaining discrepancy inside `PP-GAP-009` or `PP-GAP-010`. Product Prototyper direct re-inspection accepted the correction under `PPA-002`; the user confirmed the reviewed journey on 2026-08-24. The current-state package is terminally complete with no remaining discrepancy.
