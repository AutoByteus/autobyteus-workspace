# Delivery Round 35 Initializing Status Verification Blocker

## Resolution As Of API/E2E Round 20 / Delivery Round 38

This user-verification blocker is `Resolved / Historical` for the current delivery candidate.

Resolution path:

- Solution/design follow-up produced `round35-initializing-status-design-rework-note.md` and `round36-backend-status-source-of-truth-design-rework-note.md`.
- Implementation fixed status handling through current HEAD `f231d0e299502d98f65132efb6af274c5816736a fix(status): keep team status active for nested turns`.
- API/E2E Round 20 passed at this HEAD and rechecked the prior status blockers with real backend/frontend/browser validation.
- Delivery Round 38 refreshed latest `origin/personal`, confirmed branch state `behind 0` / `ahead 32`, reran focused backend/frontend status suites, and rebuilt Electron `1.3.16`.

The original blocker details below are retained for audit history only.

## Status

Delivery is `Blocked / user verification failed` as of `2026-05-17`.

The user tested the freshly built local Electron candidate and reported that the frontend does not show the expected `initializing` state during transition from `offline` to `running`. This is especially concerning because `origin/personal` already contains the merged `agent-initializing-status-ux` work, so the current ticket branch may have integrated that base but then made the behavior incompatible or ineffective during the larger nested-team/status/refactor work.

## Current Delivery Candidate

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/mixed-team-nested-agent-team`
- Branch: `codex/mixed-team-nested-agent-team`
- Candidate HEAD used for build: `54cacc2a59af4020d20b148e070171ddc97731e4 fix(status): remove provider lifecycle residue`
- Latest tracked base checked before and after build: `origin/personal @ 5f6e8ddec70d365dcb4021e573c37e439e3dc4fb chore(release): bump workspace release version to 1.3.16`
- Build version: `1.3.16`
- Electron artifact tested by user:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/mixed-team-nested-agent-team/autobyteus-web/electron-dist/AutoByteus_personal_macos-arm64-1.3.16.dmg`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/mixed-team-nested-agent-team/autobyteus-web/electron-dist/mac-arm64/AutoByteus.app`

## Latest-Base Integration Check

Delivery rechecked the branch after the user questioned whether latest `origin/personal` had really been integrated:

```text
HEAD=54cacc2a59af4020d20b148e070171ddc97731e4 fix(status): remove provider lifecycle residue
origin/personal=5f6e8ddec70d365dcb4021e573c37e439e3dc4fb chore(release): bump workspace release version to 1.3.16
merge-base=5f6e8ddec70d365dcb4021e573c37e439e3dc4fb chore(release): bump workspace release version to 1.3.16
origin/personal ancestor of HEAD? YES
HEAD ancestor of origin/personal? NO
left/right counts origin/personal...HEAD: 0 29
```

Conclusion: the issue is not that delivery built without latest `origin/personal`; the latest tracked personal branch is an ancestor of the candidate. The concern is that later changes on the ticket branch may have overwritten, narrowed, or made ineffective the intended initializing UX behavior from `agent-initializing-status-ux`.

## User-Observed Problem

User report, paraphrased:

- In the built Electron app, the frontend does not visibly show `initializing` between `offline` and `running`.
- Since `agent-initializing-status-ux` was merged into `origin/personal`, the user expected that behavior to exist in this worktree/build.
- The user suspects the large nested-team/refactor branch may have integration incompatibilities that require design analysis, not just a packaging rebuild.

## Preliminary Delivery Findings

Delivery did a quick source comparison and found a likely area requiring analysis.

### 1. Current branch contains latest base, but status normalization differs from `origin/personal`

`origin/personal` version of `autobyteus-web/services/runHydration/runtimeStatusNormalization.ts` contains broader startup/lifecycle token projection:

- `bootstrapping`
- `initializing`
- `starting`
- `startup`
- `uninitialized`

Those tokens normalize to `AgentStatus.Initializing` / `AgentTeamStatus.Initializing`.

The current ticket branch version intentionally narrows normalization to canonical public tokens:

- `initializing` maps to initializing
- `active` maps to running
- `terminated` maps to offline
- removed lifecycle tokens are no longer accepted in active frontend normalization

This was part of later status-cleanup work and code-review/API-E2E rounds, but it may have broken the intended UX if the backend, history, launch flow, or local submission path is still not reliably emitting/applying canonical `initializing` early enough for the user-visible transition.

### 2. The packaged app does contain initializing status support

Delivery confirmed source and package references exist for `AgentStatus.Initializing`, `AgentTeamStatus.Initializing`, startup local state helpers, backend status docs, and packaged server status code. This suggests the issue may be timing/transition logic or a missing canonical status event/local assignment, rather than a completely absent enum/build.

Relevant current files with initializing support:

- `autobyteus-web/types/agent/AgentStatus.ts`
- `autobyteus-web/types/agent/AgentTeamStatus.ts`
- `autobyteus-web/services/runStatus/agentRuntimeStatusState.ts`
- `autobyteus-web/services/runSubmission/localUserSubmission.ts`
- `autobyteus-web/stores/agentRunStore.ts`
- `autobyteus-web/stores/agentTeamRunStore.ts`
- `autobyteus-web/services/runHydration/runtimeStatusNormalization.ts`
- `autobyteus-server-ts/src/agent-execution/domain/agent-status-payload.ts`
- `autobyteus-server-ts/src/agent-team-execution/domain/team-status-aggregation.ts`

### 3. Potential conflict between design goals

There appear to be two valid design pressures that may now conflict:

1. `agent-initializing-status-ux` expected visible startup projection from offline to initializing before running.
2. Later status clean-cut work intentionally removed provider lifecycle residue and broad legacy frontend token normalization.

The intended final contract may need clarification:

- Should frontend still project startup locally as `initializing` immediately after user send/restore/launch even if backend has not emitted canonical `initializing` yet?
- Should backend always emit canonical `initializing` during startup for single-agent and team runs before `running`?
- Should run-history active rows represent newly discovered/active-but-not-yet-running work as `initializing` instead of immediately `running`?
- Are removed provider lifecycle tokens allowed only inside backend projection tests, while frontend must still display initializing via canonical events/local state?
- Did the nested-team refactor change focused-member/team startup paths so the local `applyInitializing` callback is skipped for some team/subteam targets?

## Classification

- Classification: `Design Impact / Unclear`
- Recommended recipient: `solution_designer`
- Reason: The branch is current with latest `origin/personal`, but the observed behavior suggests a possible integration/design conflict between the merged initializing UX and later status-contract cleanup/refactor. The expected final contract should be clarified before implementation changes are attempted.

## Delivery Impact

- Current Electron build `1.3.16` is no longer accepted as a final verification candidate.
- Repository finalization, ticket archiving, push/merge, release/deployment, and cleanup remain blocked.
- Delivery should resume only after the design owner classifies the intended behavior and the appropriate implementation/code-review/API-E2E loop completes.

## Requested Design Analysis

Please determine the intended final design for `initializing` visibility in the current integrated architecture:

1. For single-agent runs, when should the UI show `initializing` between `offline` and `running`?
2. For team runs and nested mixed-team members, when should aggregate team status and focused member status show `initializing`?
3. Is frontend broad alias normalization from `origin/personal` supposed to survive, or should the backend/local-submit path guarantee canonical `initializing` only?
4. Which layer should own the transition for launch/restore/recovery: frontend local optimistic state, backend WebSocket status event, run-history hydration, or a combination?
5. What implementation files likely need adjustment after the nested-team/status refactor?

## Suggested Files To Inspect

- `autobyteus-web/services/runHydration/runtimeStatusNormalization.ts`
- `autobyteus-web/services/runStatus/agentRuntimeStatusState.ts`
- `autobyteus-web/services/runSubmission/localUserSubmission.ts`
- `autobyteus-web/stores/agentRunStore.ts`
- `autobyteus-web/stores/agentTeamRunStore.ts`
- `autobyteus-web/stores/runHistoryLoadActions.ts`
- `autobyteus-web/stores/runHistoryTeamHelpers.ts`
- `autobyteus-server-ts/src/agent-execution/domain/agent-status-payload.ts`
- `autobyteus-server-ts/src/agent-execution/backends/autobyteus/events/autobyteus-status-projector.ts`
- `autobyteus-server-ts/src/agent-team-execution/domain/team-status-aggregation.ts`
- `autobyteus-server-ts/src/services/agent-streaming/agent-team-stream-handler.ts`
- `autobyteus-server-ts/tests/integration/agent/agent-status-websocket.integration.test.ts`


## Final Verification Result

- Current Round 38 Electron build accepted by user: `Yes`
- Verification reference: User message on 2026-05-17: “i tested, its working. please finalize the ticket, no need to release a new version”
- Delivery blocker status: `Resolved / Historical`
