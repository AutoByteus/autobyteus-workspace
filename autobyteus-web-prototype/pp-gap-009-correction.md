# PP-GAP-009 Focused Baseline Correction

## Outcome

- Package: `initial-prototype-baseline`
- Mode: `Correction`
- Requirements revision: `RER-009`
- Source authority: `8ef282ba77705180d985e7000d801f0e0068cdc1`
- Prototype root: `/home/autobyteus/workspace/autobyteus-workspace/autobyteus-web-prototype`
- Branch: `codex/initial-prototype-baseline`
- Result: **Completed correction candidate at Bootstrapper return; subsequently accepted under `PPA-002` and user-confirmed on 2026-08-24.**
- Unresolved IDs within the requested correction: **none**

No whole-baseline refresh, future-state design, Electron/runtime implementation, production integration, or change to the approved source frontend was performed. Historical Product Prototyper artifacts and final reference screenshots were preserved and were not regenerated.

## Gap And Root Cause

`PP-GAP-009` required a controlled complete journey:

`Agent Teams card Run -> workspace Team draft -> chosen workspace -> Run Team -> selected Team under that workspace in the left tree with members`.

Two prototype adapter defects blocked that source-supported journey:

1. The snapshot overlay cloned Pinia `Map` values as plain objects. `teamRunConfig.inFlightDrafts` therefore failed before navigation with `inFlightDrafts.keys is not a function`.
2. The generic integration interceptor replaced `agentTeamRun.launchDraft` with an inert result. Even after navigation it could not create, select, or project the deterministic Team context.

The source-observation fixture also needed one correction-only filesystem workspace projection and a deterministic created-run resume tree so the pinned source and prototype could execute the same controlled journey.

## Focused Implementation

| Boundary | Correction |
| --- | --- |
| Snapshot hydration | Recursive local clone now preserves `Map`, `Set`, and `Date`; required Team draft/context maps are repaired defensively after patching. |
| Team launch adapter | `agentTeamRun.launchDraft` now applies one deterministic local scenario, resolves the exact launched context, removes the launched draft, and returns the source-shaped run/context result. |
| Visible launch state | `workspace_team_launch` creates one synthetic active Team run, selected coordinator, two offline member rows, empty new-run content, and immediate chosen-workspace left-tree projection. |
| Controlled source fixture | `team_launch` exposes an empty initial history, filesystem workspace, successful `CreateAgentTeamRun`, and exact created-run resume execution tree. |
| Terminal evidence | `prototype/scripts/validate-gap-009.mjs` enforces four stable checkpoints, exact route/body/focus/Pinia contract, source/prototype browser errors, and screenshot comparison. |

All records are synthetic (`team-run-created-fixture`, `team-member-researcher-created`, `team-member-writer-created`, `/synthetic/prototype-workspace`). No model, server, filesystem, GraphQL, WebSocket, Electron, credential, customer-data, or production write boundary is used by the independently runnable prototype.

## Stable Inventory And Evidence

- `WKS-022`: launched Team selected and projected under the chosen workspace with `researcher` and `writer` member rows.
- `JRN-050`: complete four-checkpoint launch journey.
  - `JRN-050-A`: Agent Teams catalog Run entry.
  - `JRN-050-B`: workspace Team draft after card Run.
  - `JRN-050-C`: chosen-workspace, launch-ready draft.
  - `JRN-050-D`: launched Team selected/projected in the chosen workspace tree.

Machine results: `/home/autobyteus/workspace/autobyteus-workspace/autobyteus-web-prototype/evidence/gap-009/gap-009-summary.json` and `gap-009-results.json`.

Result: **4/4 checkpoints pass**. Each checkpoint has exact semantic state, exact Pinia contract, **byte-identical source/prototype screenshots**, and zero source/prototype browser errors. The final contract proves:

- route `/workspace`;
- selection `{ kind: "team_run", rootTeamRunId: "team-run-created-fixture" }`;
- draft count `0`;
- one registered created Team context;
- chosen workspace `/synthetic/prototype-workspace`;
- Team row `Product Review Team`;
- member rows `/researcher` and `/writer`.

A direct Browser Tool replay independently exercised the same complete source and prototype journey. Final screenshots are byte-identical SHA-256 `bcb83aeea621dbf184691e1a57c02a1415854422cd6ca635e6b06ad0774e0fb4`:

- `/home/autobyteus/workspace/autobyteus-workspace/autobyteus-web-prototype/evidence/gap-009/manual-source-complete-journey.png`
- `/home/autobyteus/workspace/autobyteus-workspace/autobyteus-web-prototype/evidence/gap-009/manual-prototype-complete-journey.png`

Direct replay state record: `/home/autobyteus/workspace/autobyteus-workspace/autobyteus-web-prototype/evidence/gap-009/direct-browser-tool-replay.txt`.

## Validation

| Validation | Result |
| --- | --- |
| `corepack pnpm typecheck` | Pass |
| `corepack pnpm lint` | Pass |
| `corepack pnpm test` | 2 files / 8 tests pass, including correction fixture contract |
| `corepack pnpm validate:boundaries` | 13/13 pass |
| `NUXT_IGNORE_LOCK=1 corepack pnpm build` | Pass; production node-server output |
| `JOURNEY_IDS=JRN-005 corepack pnpm validate:browser` | Pass; adjacent Team catalog navigation regression |
| `CORRECTION_JOURNEY_IDS=JRN-023,JRN-049 corepack pnpm validate:correction-journeys` | 2/2 pass; existing active/history Team workspace regressions |
| `corepack pnpm validate:gap-009` | 4/4 checkpoints pass; journey contract true; zero browser errors |
| `corepack pnpm validate:gap-009-package` | 20/20 package-consistency checks pass |
| Direct Browser Tool replay | Source and prototype state contract exact; final screenshot bytes exact |

Exact logs are indexed in `evidence-index.md`. The initial build attempt was intentionally rerun with `NUXT_IGNORE_LOCK=1` because the corrected prototype dev server was already running at `3210`; the final build log is successful.

## Scope And Product Prototyper Disposition

The correction remains only in the specified task worktree on
`codex/initial-prototype-baseline`. The selected source tree was not edited,
reset, merged, or pushed, and `personal`/`origin/personal` were not modified.
On `2026-08-24`, the Product Prototyper directly replayed and accepted this
launch correction together with the `PP-GAP-010` member-focus completion under
`PPA-002`; the user then confirmed the corrected journey. No future-state or
production-runtime scope was authorized.
