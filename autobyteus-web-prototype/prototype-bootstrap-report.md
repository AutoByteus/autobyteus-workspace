# Prototype Bootstrap Report

## Status

- Status: **Completed correction — accepted by Product Prototyper (`PPA-002`) and user-confirmed**
- Request type: `Current-Experience Bootstrap Correction`
- Package: `initial-prototype-baseline`
- Current requirements revision: `RER-009` (baseline pin established under `RER-002`)
- Source pin: `8ef282ba77705180d985e7000d801f0e0068cdc1`
- Requested blocker: `PP-GAP-010` (prior `PP-GAP-009` correction preserved)
- Failed, missing, unknown, or unsubstantiated IDs inside the requested correction: **none**
- Acceptance state: Product Prototyper direct inspection accepted `PP-GAP-009` and `PP-GAP-010`; the user confirmed the corrected journey on 2026-08-24.
- Prohibited actions preserved: no whole-baseline refresh, source edit, Electron/runtime implementation, production integration, final-reference recapture, or `ui-ux-spec.md` change.

## Source And Prototype Identity

| Item | Value |
| --- | --- |
| Selected frontend repository | `/home/autobyteus/workspace/.codex/worktrees/initial-prototype-baseline/autobyteus-web` |
| Governing source | `origin/personal`, fetched at bootstrap kickoff on 2026-08-22 |
| Exact approved source commit | `8ef282ba77705180d985e7000d801f0e0068cdc1` |
| Correction source observation | exact `git archive` export of the approved pin; source dev URL `http://127.0.0.1:3110` |
| Controlled source node | `http://127.0.0.1:4311` (synthetic, loopback only) |
| Prototype root | `/home/autobyteus/workspace/.codex/worktrees/initial-prototype-baseline/autobyteus-web-prototype` |
| Prototype correction review URL | `http://127.0.0.1:3210` |
| Review command | `corepack pnpm dev --port 3210` |
| Technology | Nuxt 3, Vue 3, TypeScript, Pinia, Tailwind, pinned source presentation conventions |

The selected source worktree has advanced beyond the approved pin, so correction comparison deliberately ran from an exact read-only export of commit `8ef282b...` rather than treating current source HEAD as authority. Neither the source worktree nor `personal`/`origin/personal` was edited, reset, merged, or pushed.

## Complete Current-Experience Coverage

| Evidence class | Stable inventory | Result |
| --- | --- | --- |
| Preserved route/configuration/state frames | `ROUTE-001`–`ROUTE-041`, `CFG-001`–`CFG-011`, `STATE-001`–`STATE-008` (60) | **60/60 pass** |
| Existing corrected host/lifecycle/workspace/mobile frames | `HOST-001`–`HOST-008`, `STATE-009`–`STATE-013`, `WKS-001`–`WKS-021`, `MOB-001`–`MOB-014` (48) | **48/48 pass** |
| Focused RER-009 workspace states | `WKS-022` (launched Team projected) and `WKS-023` (`/writer` selected/focused) | **2/2 pass; byte-exact** |
| Locale/responsive matrix | 123 all-route plus 116 correction permutations | **239/239 pass** |
| Preserved interactions | `JRN-001`–`JRN-018` | **18/18 pass** |
| Existing correction interactions | `JRN-019`–`JRN-049` | **31/31 pass** |
| Focused launch/member-focus interaction | `JRN-050-A`–`JRN-050-E` | **5/5 checkpoints pass; one complete journey** |
| Retained source presentation files | components, pages, layouts, styles, localization, display assets | **369/369 exact byte matches** |
| Interaction discovery | `DISC-001`–`DISC-017` | **179 source files / 925 cases classified** |

Every prior passing row is preserved. The current correction adds only the controlled member-focus state/checkpoint needed to close `PP-GAP-010`.

## PP-GAP-009 Correction

### Root causes

1. Prototype snapshot cloning converted Pinia `Map` values into plain objects, causing Team-card **Run** to fail before `/workspace` with `inFlightDrafts.keys is not a function`.
2. The integration interceptor treated `agentTeamRun.launchDraft` as a generic no-op, so it could not create/select/project the launched Team context.
3. The source-observation fixture lacked a correction-only filesystem workspace and created-run resume tree for a controlled pinned-source replay.

### Lightweight correction

The solution keeps the exact retained frontend and replaces only the missing runtime behavior with deterministic local state:

- preserve `Map`, `Set`, and `Date` during snapshot clone and defensively repair Team maps;
- intercept only `agentTeamRun.launchDraft` to apply `workspace_team_launch`, remove the exact draft, and return the exact synthetic context;
- create one selected synthetic Team run (`team-run-created-fixture`) with `/researcher` and `/writer` members;
- immediately project that Team under `/synthetic/prototype-workspace` in the real left-tree UI;
- add source-only `team_launch` fixtures for successful create/resume and empty pre-launch history;
- add terminal validator `prototype/scripts/validate-gap-009.mjs`.

No backend, Electron, model, provider, filesystem, terminal, WebSocket, authentication, persistence, production credential, customer data, or production write is present. Full root-cause and evidence detail is in `pp-gap-009-correction.md`.

## PP-GAP-010 Correction

The retained UI's `/writer` member row was rendered and clickable, but the prototype interceptor replaced the composite local selection flow before it could invoke member focus. After enabling only the exact local `runHistory` selection/focus/projection actions, the synthetic Team fixture also needed reactive focused-member state so the left-tree selection and center Team workspace updated together.

The correction therefore retains three pure UI-state actions (`selectTreeRun`, `focusTeamMemberAndEnsureHydrated`, `applyRunNavigationTeamFocus`) and stores the synthetic focused agent ID in reactive prototype-native view state. It adds no production capability. Full detail is in `pp-gap-010-correction.md`.

## Matched Browser Evidence

`JRN-050` executes the real UI in both pinned source and prototype under matched Chromium, `1440×900`, English, light theme, reduced motion, local assets, identical fixture data, and blocked non-loopback network:

| Checkpoint | Observable contract | Result |
| --- | --- | --- |
| `JRN-050-A` | Agent Teams card exposes runnable Team entry | semantic, state, screenshot exact |
| `JRN-050-B` | activating **Run** reaches `/workspace` with valid Team draft | semantic, state, screenshot exact |
| `JRN-050-C` | chosen synthetic workspace enables **Run Team** | semantic, state, screenshot exact |
| `JRN-050-D` / `WKS-022` | draft removed; created Team selected; Team and both members appear under chosen workspace | semantic, state, screenshot exact |
| `JRN-050-E` / `WKS-023` | activating `/writer` focuses `team-member-writer-created`, selects the writer row, and updates the center Team workspace header | semantic, state, screenshot exact |

Machine summary: `evidence/gap-010/gap-010-summary.json` — **5/5 pass**, zero source browser errors, zero prototype browser errors, terminal journey contract true. `gap-010-results.json` maps every checkpoint to both runnable source and prototype evidence; the earlier four-checkpoint `gap-009` evidence remains preserved.

A separate direct Browser Tool replay confirmed the complete journey through `/writer` activation and exact final Pinia/DOM contract in both runtimes. The final source and prototype screenshots are byte-identical SHA-256 `7d3cde0c06f3004e0d8657afb17b081ad27d220bf9816a610a976999f0df0a9f`.

## Validation

| Validation | Result / evidence |
| --- | --- |
| `corepack pnpm typecheck` | Pass — `evidence/validation/pp-gap-010-typecheck.txt` |
| `corepack pnpm lint` | Pass — `evidence/validation/pp-gap-010-lint.txt` |
| `corepack pnpm test` | 2 files / 8 tests pass — `evidence/validation/pp-gap-010-test.txt` |
| `corepack pnpm validate:boundaries` | 13/13 pass — `evidence/validation/pp-gap-010-boundaries.txt` |
| `NUXT_IGNORE_LOCK=1 corepack pnpm build` | Pass, node-server output — `evidence/validation/pp-gap-010-build.txt` |
| `JOURNEY_IDS=JRN-005 corepack pnpm validate:browser` | Adjacent Team catalog regression pass |
| `CORRECTION_JOURNEY_IDS=JRN-023,JRN-045,JRN-049 corepack pnpm validate:correction-journeys` | Existing Team workspace, mobile focus, and reopened-history regressions 3/3 pass |
| `corepack pnpm validate:gap-009` | `JRN-050-A`–`D` 4/4 pass; screenshots byte-exact; zero browser errors |
| `corepack pnpm validate:gap-009-package` | 20/20 artifact, status, path, isolation, evidence, Product-owned-file and Git-scope consistency checks pass |
| `corepack pnpm validate:gap-010` | `JRN-050-A`–`E` 5/5 pass; screenshots byte-exact; zero browser errors |
| `corepack pnpm validate:gap-010-package` | 25/25 current artifact, status, path, source-pin, focus contract, isolation, Product-owned-file and Git-scope consistency checks pass |
| Direct Browser Tool replay | Complete source and prototype journey through writer focus passes; final screenshots byte-exact |

The initial build command detected the intentionally running prototype dev server. It was rerun with Nuxt's `NUXT_IGNORE_LOCK=1`; the durable final build log is successful. Existing non-blocking pinned-source unit-harness findings remain unchanged and outside this focused correction.

## Durable Artifacts

- Correction report: `/home/autobyteus/workspace/.codex/worktrees/initial-prototype-baseline/autobyteus-web-prototype/pp-gap-009-correction.md`
- Current correction report: `/home/autobyteus/workspace/.codex/worktrees/initial-prototype-baseline/autobyteus-web-prototype/pp-gap-010-correction.md`
- Inventory: `/home/autobyteus/workspace/.codex/worktrees/initial-prototype-baseline/autobyteus-web-prototype/parity-inventory.md`
- Comparison report: `/home/autobyteus/workspace/.codex/worktrees/initial-prototype-baseline/autobyteus-web-prototype/comparison-report.md`
- Evidence index: `/home/autobyteus/workspace/.codex/worktrees/initial-prototype-baseline/autobyteus-web-prototype/evidence-index.md`
- Scenarios: `/home/autobyteus/workspace/.codex/worktrees/initial-prototype-baseline/autobyteus-web-prototype/prototype-scenarios.md`
- Runbook: `/home/autobyteus/workspace/.codex/worktrees/initial-prototype-baseline/autobyteus-web-prototype/prototype-runbook.md`
- Mock boundary: `/home/autobyteus/workspace/.codex/worktrees/initial-prototype-baseline/autobyteus-web-prototype/mock-boundaries.md`
- Machine evidence: `/home/autobyteus/workspace/.codex/worktrees/initial-prototype-baseline/autobyteus-web-prototype/evidence/gap-009`
- Current machine evidence: `/home/autobyteus/workspace/.codex/worktrees/initial-prototype-baseline/autobyteus-web-prototype/evidence/gap-010`

## Quality-Gate Conclusion

`PP-GAP-010` is corrected without expanding implementation scope: the real retained UI now completes the exact pinned-source catalog-to-workspace-to-left-tree-to-member-focus journey through deterministic synthetic state. All five controlled checkpoints and the independent Browser Tool replay pass with byte-identical source/prototype visuals and exact route/state/focus semantics. No requested correction ID remains failed, missing, unknown, or unsubstantiated. The package was directly accepted by Product Prototyper under `PPA-002` and user-confirmed on 2026-08-24. No RER-009 correction ID remains open.
