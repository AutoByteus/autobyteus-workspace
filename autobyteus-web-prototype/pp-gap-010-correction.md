# PP-GAP-010 Focused Baseline Correction

## Identity And Status

- Package: `initial-prototype-baseline`
- Request: `Current-Experience Bootstrap Correction`
- Current requirements revision: `RER-009` (approved source pin established under `RER-002`)
- Approved source authority: `8ef282ba77705180d985e7000d801f0e0068cdc1`
- Prototype root: `/home/autobyteus/workspace/.codex/worktrees/initial-prototype-baseline/autobyteus-web-prototype`
- Result: **Completed correction candidate at Bootstrapper return; subsequently accepted under `PPA-002` and user-confirmed on 2026-08-24.**
- Scope: only the missing `JRN-050-E` member-focus checkpoint; the accepted source pin and earlier passing evidence were preserved.

## Gap And Root Cause

After the existing `JRN-050-D` Team launch, the `/writer` left-tree member row was present and clickable but did not focus the writer. The prototype action interceptor treated the composite local `runHistory.selectTreeRun` flow and its local focus/projection actions as external operations. The deterministic Team fixture also stored focus in a non-reactive lexical variable, so the center Team workspace could remain on researcher even after the internal focus value changed.

## Lightweight Correction

The correction adds no backend, Electron runtime, service protocol, persistence, credentials, customer data, or production write:

1. `runHistory.selectTreeRun`, `focusTeamMemberAndEnsureHydrated`, and `applyRunNavigationTeamFocus` are explicitly retained as safe local UI-state actions.
2. The synthetic Team fixture stores `focusedAgentRunId` as reactive prototype-native view state so the selected row and center Team workspace update together.
3. `prototype/scripts/validate-gap-010.mjs` replays the complete real UI journey and adds terminal checkpoint `JRN-050-E`.

The visible transition remains the exact pinned-source flow: activate `/writer` → focus `/writer` and `team-member-writer-created` → set the writer row `aria-current=true` → show `writer` in the center Team workspace header.

## Stable Inventory And Evidence

- `WKS-023`: launched Team with `/writer` focused in the left tree and center Team workspace.
- `JRN-050-E`: activate the `/writer` stable member row after `JRN-050-D`.

Machine evidence:

- `/home/autobyteus/workspace/.codex/worktrees/initial-prototype-baseline/autobyteus-web-prototype/evidence/gap-010/gap-010-results.json`
- `/home/autobyteus/workspace/.codex/worktrees/initial-prototype-baseline/autobyteus-web-prototype/evidence/gap-010/gap-010-summary.json`

Result: **5/5 `JRN-050-A`–`E` checkpoints pass**. Every checkpoint has exact semantic state, exact Pinia contract, byte-identical source/prototype screenshots, and zero browser errors. `JRN-050-E` proves:

- `focusedMemberAddress=/writer`;
- `focusedAgentRunId=team-member-writer-created`;
- projected `focusedAgentRunId=team-member-writer-created`;
- writer row `aria-current=true`;
- center Team workspace header `writer`.

Automated final screenshot SHA-256 for both source and prototype: `2c3abd02848b1c2305f6b20db3a7565136c01a47875815dea13831ae09adf031`.

## Direct Browser Tool Replay

The complete source and prototype journey was also replayed independently through Browser Tool. Terminal state was exact in both runtimes, and the screenshots are byte-identical:

- `/home/autobyteus/workspace/.codex/worktrees/initial-prototype-baseline/autobyteus-web-prototype/evidence/gap-010/manual-source-writer-focus.png`
- `/home/autobyteus/workspace/.codex/worktrees/initial-prototype-baseline/autobyteus-web-prototype/evidence/gap-010/manual-prototype-writer-focus.png`
- `/home/autobyteus/workspace/.codex/worktrees/initial-prototype-baseline/autobyteus-web-prototype/evidence/gap-010/direct-browser-tool-replay.txt`

Both manual screenshots SHA-256: `7d3cde0c06f3004e0d8657afb17b081ad27d220bf9816a610a976999f0df0a9f`.

After the source observer and mock node were stopped, Browser Tool repeated the journey against the prototype alone at `http://127.0.0.1:3210`; writer selection/header focus still passed with no visible alert. The review runtime is therefore independent of the correction evidence processes.

## Validation

| Command | Result |
| --- | --- |
| `corepack pnpm typecheck` | Pass |
| `corepack pnpm lint` | Pass |
| `corepack pnpm test` | 2 files / 8 tests pass |
| `corepack pnpm validate:boundaries` | 13/13 pass |
| `NUXT_IGNORE_LOCK=1 corepack pnpm build` | Pass; node-server output |
| `CORRECTION_JOURNEY_IDS=JRN-023,JRN-045,JRN-049 corepack pnpm validate:correction-journeys` | 3/3 adjacent Team/mobile focus journeys pass |
| `corepack pnpm validate:gap-010` | 5/5 exact checkpoints; zero browser errors |
| `corepack pnpm validate:gap-010-package` | 25/25 package-consistency checks pass |

## Scope And Ownership

The approved pin was not refreshed. The selected source worktree, `personal`, and `origin/personal` were not edited, merged, or pushed. Historical passing evidence was preserved. During the Bootstrapper correction, no final reference screenshot was recaptured and `ui-ux-spec.md` was not modified. This report was returned as parity evidence rather than a self-approval claim.

## Product Prototyper Disposition

On `2026-08-24`, the Product Prototyper directly replayed the complete journey,
including Team disclosure collapse/expand and both `/writer` and coordinator
`/researcher` selection. The correction was accepted under `PPA-002` with no
remaining discrepancy ID. The user then reviewed the same runnable journey and
responded **“done. i checked. thanks”** immediately after the explicit approval
request. The current-state correction is therefore accepted and user-confirmed;
this does not authorize any future-state or production-runtime change.
