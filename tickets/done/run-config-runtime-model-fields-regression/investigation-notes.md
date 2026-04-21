# Run Config Runtime/Model Fields Regression Investigation Notes

## Investigation Status

- Bootstrap Status: Completed
- Current Status: Root cause confirmed, design passed architecture review, ticket resumed for implementation handoff
- Investigation Goal: Confirm the regression path, capture the real current owners/boundaries, and preserve enough evidence for implementation without rediscovery
- Scope Classification (`Small`/`Medium`/`Large`): `Medium`
- Scope Classification Rationale: The regression is user-visible and high-severity, but the affected area is bounded to a small set of shared Vue components and targeted tests
- Scope Summary: Application launch/setup work introduced shared field-visibility policy into a component also used by normal platform run configuration; omitted boolean prop semantics then hid runtime/model fields in agent/team run forms
- Primary Questions To Resolve:
  - Which shared UI boundary actually introduced the regression?
  - Did the regression come from backend orchestration or from front-end field-policy leakage?
  - Which existing owners should retain platform run-config semantics versus application launch/setup semantics?
  - What durable validation already exists or needs to be tightened for the regression path?

## Request Context

- Another solution engineer previously bootstrapped this ticket package under the dedicated worktree ticket folder.
- On `2026-04-21`, the user asked to pick up the existing in-progress ticket at `/Users/normy/autobyteus_org/autobyteus-worktrees/run-config-runtime-model-fields-regression/tickets/done/run-config-runtime-model-fields-regression` and continue driving it.
- The design package already existed and the architecture review report already recorded a `Pass`, so this resumed investigation focused on verifying the authoritative workspace context and preserving the bootstrap/design evidence for downstream implementation.

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): `Git`
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/run-config-runtime-model-fields-regression`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/run-config-runtime-model-fields-regression/tickets/done/run-config-runtime-model-fields-regression`
- Current Branch: `codex/run-config-runtime-model-fields-regression`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/run-config-runtime-model-fields-regression`
- Bootstrap Base Branch: `origin/personal`
- Remote Refresh Result: Not rerun during resumed pickup because the dedicated task worktree already existed and points at the current tracked base
- Task Branch: `codex/run-config-runtime-model-fields-regression`
- Expected Base Branch (if known): `personal`
- Expected Finalization Target (if known): `personal`
- Bootstrap Blockers: None
- Notes For Downstream Agents:
  - The dedicated ticket worktree already exists and is the authoritative workspace for any implementation.
  - `HEAD` currently matches merge-base `a327c68c17bddcc9d58a2a974d8f6ea24eb0b75f` with `personal`, so code changes for the fix have not started yet in this worktree.
  - The ticket artifacts live under the worktree-local `tickets/in-progress/...` folder and should remain the authoritative design package.

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-04-21 | Doc | `tickets/done/run-config-runtime-model-fields-regression/requirements.md` | Review existing requirements basis | Requirements captured the regression scope and durability goals but needed resumed-status preservation | No |
| 2026-04-21 | Doc | `tickets/done/run-config-runtime-model-fields-regression/investigation-notes.md` | Review prior evidence before resuming | Prior notes captured root cause but lacked explicit resumed bootstrap/worktree context | No |
| 2026-04-21 | Doc | `tickets/done/run-config-runtime-model-fields-regression/design-spec.md` | Confirm approved design target before handoff | Design restores platform/application boundary and limits sharing below field-policy ownership | No |
| 2026-04-21 | Doc | `tickets/done/run-config-runtime-model-fields-regression/design-review-report.md` | Confirm whether architecture review had already completed | Round 1 review decision is `Pass`; recommended recipient is `implementation_engineer` | No |
| 2026-04-21 | Code | `autobyteus-web/components/workspace/config/AgentRunConfigForm.vue` | Verify the normal platform run-config caller | Still consumes `RuntimeModelConfigFields.vue`; platform run forms remain the correct owner boundary for normal runtime/model visibility | No |
| 2026-04-21 | Code | `autobyteus-web/components/workspace/config/TeamRunConfigForm.vue` | Verify the team run caller | Same shared dependency and same regression exposure as the agent form | No |
| 2026-04-21 | Code | `autobyteus-web/components/launch-config/RuntimeModelConfigFields.vue` | Inspect the shared component that introduced the regression | Added app-specific `show*` visibility props and `v-if` guards that changed old caller behavior | No |
| 2026-04-21 | Code | `autobyteus-web/components/applications/ApplicationLaunchSetupPanel.vue` | Verify the application-owned caller behavior | Explicitly passes the new visibility props, which is why application setup still works while platform callers regress | No |
| 2026-04-21 | Code | `autobyteus-web/components/workspace/config/__tests__/AgentRunConfigForm.spec.ts` | Check durable validation coverage | Existing tests already express the expected runtime/model visibility and currently fail on the regressed branch | No |
| 2026-04-21 | Code | `autobyteus-web/components/workspace/config/__tests__/TeamRunConfigForm.spec.ts` | Check durable validation coverage | Existing tests also cover the team form regression path and currently fail | No |
| 2026-04-21 | Command | `cd /Users/normy/autobyteus_org/autobyteus-worktrees/run-config-runtime-model-fields-regression && pwd && git rev-parse --is-inside-work-tree && git branch --show-current && git status --short && git worktree list` | Verify the authoritative task workspace and branch before resuming | Confirmed dedicated worktree/branch reuse and that the ticket artifact folder is present under this worktree | No |
| 2026-04-21 | Command | `cd /Users/normy/autobyteus_org/autobyteus-worktrees/run-config-runtime-model-fields-regression && git rev-parse --abbrev-ref --symbolic-full-name @{upstream} && git symbolic-ref --short refs/remotes/origin/HEAD && git merge-base HEAD personal && git rev-parse HEAD` | Capture base/finalization context for downstream handoff | Upstream is `origin/personal`; origin HEAD is `origin/personal`; current `HEAD` still equals the merge base with `personal` | No |
| 2026-04-21 | Trace | `pnpm vitest run components/workspace/config/__tests__/AgentRunConfigForm.spec.ts components/workspace/config/__tests__/TeamRunConfigForm.spec.ts --reporter=dot` | Reproduce the bug through targeted executable validation | 10 failing tests; failures show missing runtime/model selectors such as `select#agent-run-runtime-kind` and `select#team-run-runtime-kind` | Yes, rerun after implementation |

## Current Behavior / Current Flow

- Current entrypoint or first observable boundary:
  - `AgentRunConfigForm.vue` and `TeamRunConfigForm.vue` render shared launch-config fields for the normal platform run configuration flow.
- Current execution flow:
  - Platform run form -> `RuntimeModelConfigFields.vue` -> runtime/model/model-config field rendering
  - Application setup panel -> `RuntimeModelConfigFields.vue` with explicit `show*` props -> app-specific limited field rendering
- Ownership or boundary observations:
  - Platform run forms are the correct top-level owners of normal runtime/model field-presence semantics.
  - `ApplicationLaunchSetupPanel.vue` is the correct top-level owner of application-specific launch/setup semantics.
  - `RuntimeModelConfigFields.vue` became a mixed boundary by owning field-presence policy for both surfaces.
- Current behavior summary:
  - The shared component now hides runtime/model/model-config sections for omitted callers, which breaks the platform run forms while leaving the app-specific caller working.

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-web/components/workspace/config/AgentRunConfigForm.vue` | Platform agent run configuration surface | Still delegates runtime/model fields to the shared wrapper | Agent run visibility must remain owned by the platform run-form boundary |
| `autobyteus-web/components/workspace/config/TeamRunConfigForm.vue` | Platform team run configuration surface | Same shared dependency and same missing field symptoms | Team run visibility must remain owned by the platform run-form boundary |
| `autobyteus-web/components/launch-config/RuntimeModelConfigFields.vue` | Shared runtime/model field wrapper | Owns cross-surface visibility policy via app-specific props | Must be hardened back to stable run/definition semantics or reduced to lower-level primitives |
| `autobyteus-web/components/applications/ApplicationLaunchSetupPanel.vue` | Application-owned launch/setup surface | Passes explicit visibility toggles for limited app setup behavior | Application-specific field policy should stay here or in an app-owned child component |
| `autobyteus-web/components/workspace/config/__tests__/AgentRunConfigForm.spec.ts` | Agent run form validation | Fails because runtime/model selectors disappeared | Keep as durable regression coverage |
| `autobyteus-web/components/workspace/config/__tests__/TeamRunConfigForm.spec.ts` | Team run form validation | Fails for the same reason on team run config | Keep as durable regression coverage |

## Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-04-21 | Test | `pnpm vitest run components/workspace/config/__tests__/AgentRunConfigForm.spec.ts components/workspace/config/__tests__/TeamRunConfigForm.spec.ts --reporter=dot` | 10 tests fail because runtime/model selectors are missing in both agent and team run forms | The regression is still active in repository state and should be fixed against these tests |
| 2026-04-21 | Probe | Review of `ApplicationLaunchSetupPanel.vue` prop passing into `RuntimeModelConfigFields.vue` | Application setup explicitly passes visibility flags and therefore avoids the omitted-boolean regression | Confirms the bug is a boundary leak from mixed shared UI policy, not a global runtime failure |
| 2026-04-21 | Probe | Worktree and branch verification commands | Dedicated worktree exists, is on `codex/run-config-runtime-model-fields-regression`, and is still clean aside from the local ticket artifact folder | Implementation can begin directly in this worktree without additional bootstrap |

## External / Public Source Findings

- None needed. The issue is fully explainable from local code, repository history, and local test evidence.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures:
  - Local Vitest execution only for the targeted web component tests.
- Required config, feature flags, env vars, or accounts:
  - None identified for the focused regression reproduction.
- External repos, samples, or artifacts cloned/downloaded for investigation:
  - None.
- Setup commands that materially affected the investigation:
  - `cd /Users/normy/autobyteus_org/autobyteus-worktrees/run-config-runtime-model-fields-regression`
  - `pnpm vitest run components/workspace/config/__tests__/AgentRunConfigForm.spec.ts components/workspace/config/__tests__/TeamRunConfigForm.spec.ts --reporter=dot`
- Cleanup notes for temporary investigation-only setup:
  - None.

## Findings From Code / Docs / Data / Logs

- The regression was introduced by a UI component API change rather than a backend/runtime contract change.
- App-specific visibility policy was injected into a component still used by normal platform run forms.
- Omitted boolean prop semantics in the Vue layer made the default behavior unsafe for older callers.
- Existing targeted tests already represent the expected platform behavior and currently expose the regression.
- The design package already passed architecture review, so the next meaningful step is implementation against the dedicated worktree.

## Constraints / Dependencies / Compatibility Facts

- The fix should avoid compatibility wrappers or dual-path field-policy behavior that preserve the mixed boundary.
- Agent/team run forms and application setup may still share lower-level runtime/model UI primitives if that reuse stays below the field-presence policy boundary.
- Any retained shared visibility API must be explicitly default-tested; otherwise the same omitted-boolean regression class can recur.

## Open Unknowns / Risks

- The exact extraction boundary for lower-level shared primitives remains an implementation choice, but the top-level ownership split is fixed by the approved design.
- A minimal hotfix-only approach would restore selectors quickly but could leave the underlying mixed boundary intact if the implementation stops too early.

## Notes For Architect Reviewer

- Architecture review already completed successfully in `design-review-report.md` Round 1 with decision `Pass`.
- No new design questions were introduced during the resumed pickup; the update here is primarily to preserve the resumed bootstrap context and implementation-ready evidence trail.
