# Prototype Evidence Index

Package `initial-prototype-baseline`, current requirements revision `RER-009`
(baseline pin established under `RER-002`; prior reviewed evidence preserved), pinned source
`8ef282ba77705180d985e7000d801f0e0068cdc1`. Current status: completed `PP-GAP-009` correction candidate pending Product Prototyper re-inspection.

## Canonical Reports

| Artifact | Purpose |
| --- | --- |
| `/home/autobyteus/workspace/.codex/worktrees/initial-prototype-baseline/autobyteus-web-prototype/prototype-bootstrap-report.md` | Completion status, correction trace, implementation and quality gate |
| `/home/autobyteus/workspace/.codex/worktrees/initial-prototype-baseline/autobyteus-web-prototype/pp-gap-009-correction.md` | Focused RER-009 root cause, implementation, stable IDs, exact evidence, validation and scope record |
| `/home/autobyteus/workspace/.codex/worktrees/initial-prototype-baseline/autobyteus-web-prototype/parity-inventory.md` | Stable row/journey inventory and exact evidence mapping |
| `/home/autobyteus/workspace/.codex/worktrees/initial-prototype-baseline/autobyteus-web-prototype/comparison-report.md` | Controlled comparison conditions, totals and conclusion |
| `/home/autobyteus/workspace/.codex/worktrees/initial-prototype-baseline/autobyteus-web-prototype/prototype-scenarios.md` | Deterministic scenario/context catalog |
| `/home/autobyteus/workspace/.codex/worktrees/initial-prototype-baseline/autobyteus-web-prototype/prototype-runbook.md` | Install, run, select/reset and reproduce instructions |
| `/home/autobyteus/workspace/.codex/worktrees/initial-prototype-baseline/autobyteus-web-prototype/mock-boundaries.md` | Production-capability boundary and local simulation record |
| `/home/autobyteus/workspace/.codex/worktrees/initial-prototype-baseline/autobyteus-web-prototype/product-prototyper-baseline-review.md` | Historical Product Prototyper review/acceptance record through PPA-001; terminal status later reopened by RER-009 |
| `/home/autobyteus/workspace/.codex/worktrees/initial-prototype-baseline/autobyteus-web-prototype/ui-ux-spec.md` | Preserved historical Product Prototyper-owned current-state supplement; not modified by RER-009 |
| `/home/autobyteus/workspace/.codex/worktrees/initial-prototype-baseline/autobyteus-web-prototype/final-reference-screenshots/README.md` | Post-confirmation normative visual inventory `VIS-001`–`VIS-015` |
| `/home/autobyteus/workspace/.codex/worktrees/initial-prototype-baseline/autobyteus-web-prototype/final-reference-screenshots/manifest.json` | Final capture routes, scenarios, contexts, viewports, hashes and browser-boundary results |
| `/home/autobyteus/workspace/.codex/worktrees/initial-prototype-baseline/autobyteus-web-prototype/repository-placement-correction.md` | Cumulative RER-004/RER-007 owning-repository placement, integrity and provenance record |

## Rendered Parity Evidence

| Suite | Source screenshots | Prototype screenshots | Row-level JSON | Summary |
| --- | --- | --- | --- | --- |
| 60 preserved rows | `evidence/source/screenshots` | `evidence/prototype/screenshots` | `evidence/comparison/browser-parity-results.json` | `evidence/comparison/browser-parity-summary.json` |
| 48 correction rows | `evidence/source/correction` | `evidence/prototype/correction` | `evidence/correction/correction-parity-results.json` | `evidence/correction/correction-parity-summary.json` |
| 123 all-route matrix rows | `evidence/source/matrix` | `evidence/prototype/matrix` | `evidence/matrix/route-matrix-results.json` | `evidence/matrix/route-matrix-summary.json` |
| 116 correction matrix rows | `evidence/source/correction-matrix` | `evidence/prototype/correction-matrix` | `evidence/correction-matrix/correction-parity-results.json` | `evidence/correction-matrix/correction-parity-summary.json` |

The JSON preserves exact requested/actual route, scenario, context, viewport, locale, screenshot hashes, body text/hashes, rendered semantics/controls, browser errors and perceptual comparison metrics for every row.

## Interaction Evidence

| Suite | Source screenshots | Prototype screenshots | JSON | Summary |
| --- | --- | --- | --- | --- |
| `JRN-001`–`JRN-018` | `evidence/source/journeys` | `evidence/prototype/journeys` | `evidence/interactions/browser-journey-results.json` | `evidence/interactions/browser-journey-summary.json` |
| `JRN-019`–`JRN-049` | `evidence/source/correction-journeys` | `evidence/prototype/correction-journeys` | `evidence/correction-journeys/correction-journey-results.json` | `evidence/correction-journeys/correction-journey-summary.json` |
| `JRN-050-A`–`JRN-050-D` | `evidence/gap-009/source` | `evidence/gap-009/prototype` | `evidence/gap-009/gap-009-results.json` | `evidence/gap-009/gap-009-summary.json` |

Each record contains the post-interaction route, body, dialogs, focused element, action-specific evidence, screenshot hashes and browser diagnostics.

## Discovery And Exact-Presentation Evidence

| Artifact | Result |
| --- | --- |
| `evidence/interaction-discovery/interaction-discovery.md` | Human-readable `DISC-001`–`DISC-017` classification |
| `evidence/interaction-discovery/interaction-discovery.json` | All 179 source test files and 925 discovered cases |
| `evidence/presentation-code/presentation-code-parity-summary.json` | 369/369 retained presentation files exact |
| `evidence/presentation-code/presentation-code-parity.json` | Per-file source/prototype hashes and paths |

## Validation Logs

| Artifact | Result |
| --- | --- |
| `evidence/validation/final-static-and-unit-validation.txt` | typecheck, lint, 7 prototype tests, 13 boundary checks, presentation and interaction audits pass |
| `evidence/validation/build.txt` | final production build passes; warnings retained |
| `evidence/validation/browser-parity-final.txt` | 60/60 preserved rendered rows pass |
| `evidence/validation/correction-parity-final.txt` | 48/48 correction rows pass |
| `evidence/validation/route-matrix-final.txt` | 123/123 route matrix rows pass |
| `evidence/validation/correction-matrix-final.txt` | 116/116 correction matrix rows pass |
| `evidence/validation/browser-journeys-final.txt` | 18/18 preserved journeys pass |
| `evidence/validation/correction-journeys-final.txt` | 31/31 correction journeys pass |
| `evidence/validation/document-consistency.txt` | Canonical links, totals, stable IDs, status and prohibited-artifact checks pass |
| `evidence/validation/source-presentation-tests.txt` | pinned source suite: 177/179 files, 968/970 tests pass |
| `evidence/validation/source-presentation-failing-tests-rerun.txt` | two pinned-source harness failures reproduced alone |
| `evidence/validation/product-prototyper-final-validation.txt` | Post-confirmation typecheck, lint, unit, boundary, presentation and production-build checks pass |
| `evidence/validation/final-reference-capture.txt` | `VIS-001`–`VIS-015` captured successfully |
| `evidence/validation/product-prototyper-final-package-consistency.txt` | 73/73 final package, approval, evidence, local-asset and screenshot-hash checks pass |
| `evidence/validation/pp-gap-009-typecheck.txt` | RER-009 typecheck passes |
| `evidence/validation/pp-gap-009-lint.txt` | RER-009 lint passes |
| `evidence/validation/pp-gap-009-test.txt` | 2 files / 8 tests pass, including Team-launch fixture contract |
| `evidence/validation/pp-gap-009-boundaries.txt` | 13/13 isolation checks pass |
| `evidence/validation/pp-gap-009-build.txt` | Final RER-009 production build passes |
| `evidence/validation/pp-gap-009-browser-regression.txt` | Adjacent `JRN-005` Team catalog navigation passes |
| `evidence/validation/pp-gap-009-correction-regression.txt` | Existing `JRN-023` and `JRN-049` Team workspace journeys pass |
| `evidence/validation/pp-gap-009-gap-009.txt` | `JRN-050-A`–`D` 4/4 pass with terminal journey contract |
| `evidence/validation/pp-gap-009-package.txt` | 20/20 current-root, source-pin, status, inventory, evidence, isolation, Product-owned-file and Git-scope checks pass |
| `evidence/repository-placement/pre-relocation-file-inventory.json` | SHA-256 inventory of all 1,924 approved files before relocation/path rewriting |
| `evidence/repository-placement/path-rewrite-summary.json` | Active-root rewrite counts and zero-stale-path result |
| `evidence/repository-placement/hash-preservation-summary.json` | 808/808 approved evidence/reference image hashes and 15/15 final-reference hashes preserved |
| `evidence/repository-placement/correction-validation.txt` | RER-004 typecheck, lint, tests, boundaries, audits and production build from corrected root |
| `evidence/repository-placement/final-reference-recapture.txt` | Corrected-root post-relocation final reference recapture |
| `evidence/repository-placement/repository-placement-validation.txt` | Repository top-level, branch, index mode, preserved image hashes and active-path checks |
| `evidence/repository-placement/stale-path-search.txt` | Standalone stale-root scan result |
| `evidence/repository-placement/git-ownership-proof.txt` | Corrected Git top-level, branch, index modes and clean-status evidence |
| `evidence/repository-placement/rer-007-pre-move-file-inventory.json` | SHA-256 inventory of all 1,934 approved files immediately before the root move |
| `evidence/repository-placement/rer-007-sibling-tree-baseline.json` | Baseline Git-tree IDs for the five unrelated sibling prototypes |
| `evidence/repository-placement/rer-007-validation.txt` | Root-placement typecheck, lint, tests, boundaries, audits, final-package and production-build results |
| `evidence/repository-placement/rer-007-final-reference-capture.txt` | Repository-root browser recapture of all normative references |
| `evidence/repository-placement/rer-007-repository-placement-validation.txt` | 40/40 root/top-level/index, stale-path, file/hash and sibling-tree checks pass |
| `evidence/repository-placement/rer-007-proof.json` | Machine-readable preservation, ownership, stale-reference and sibling-tree proof |

## Manual Browser-Tool Evidence

- `/home/autobyteus/workspace/.codex/worktrees/initial-prototype-baseline/autobyteus-web-prototype/evidence/manual/canonical-review-electron-internal-extensions.png`
- `/home/autobyteus/workspace/.codex/worktrees/initial-prototype-baseline/autobyteus-web-prototype/evidence/manual/canonical-review-workspace-team.png`
- `/home/autobyteus/workspace/.codex/worktrees/initial-prototype-baseline/autobyteus-web-prototype/evidence/manual/canonical-review-agents.png`
- `/home/autobyteus/workspace/.codex/worktrees/initial-prototype-baseline/autobyteus-web-prototype/evidence/gap-009/manual-source-complete-journey.png`
- `/home/autobyteus/workspace/.codex/worktrees/initial-prototype-baseline/autobyteus-web-prototype/evidence/gap-009/manual-prototype-complete-journey.png`
- `/home/autobyteus/workspace/.codex/worktrees/initial-prototype-baseline/autobyteus-web-prototype/evidence/gap-009/direct-browser-tool-replay.txt`

## Historical Review Evidence

- `evidence/product-prototyper-review/direct-browser-probe.txt`
- `evidence/product-prototyper-review/electron-internal-context-fallback-extensions.png`

These two files substantiate the original rejected baseline and are not current evidence. The corrected `HOST-*` rows and manual Electron screenshot demonstrate that the fallback no longer occurs.

Bootstrap screenshots remain current-state parity evidence. Historical Product Prototyper artifacts record the prior 2026-08-22 review, but RER-009 reopened terminal completeness for `PP-GAP-009`. The focused correction evidence above—not the historical final references—substantiates the new journey. No final reference or `ui-ux-spec.md` artifact was regenerated; renewed Product Prototyper inspection and user review remain pending.
