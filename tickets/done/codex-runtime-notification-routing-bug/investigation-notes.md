# Investigation Notes

## Investigation Status

- Bootstrap Status: Complete; existing dedicated task worktree/branch reused.
- Current Status: Root cause localized; requirements refined by user; design updated for architecture review.
- Investigation Goal: Reproduce and localize the Codex-runtime-only unscoped notification routing errors shown in the Electron team chat screenshots.
- Scope Classification (`Small`/`Medium`/`Large`): Medium
- Scope Classification Rationale: Likely spans runtime notification ingestion, team-thread routing, and UI-visible chat event creation; expected localized fix but architecture boundary must be verified.
- Scope Summary: Prevent unscoped/global Codex app server notifications from being inserted as team chat error cards when multiple team threads are active, while preserving targetable turn/team notification routing.
- Primary Questions To Resolve:
  - Where is `did not include enough thread or turn identity to route among` emitted?
  - Which subsystem owns Codex app server notification ingestion and route classification?
  - How do Claude and AutoByteus runtimes avoid surfacing equivalent global notifications in team chats?
  - Can the bug be reproduced with seeded team data and a local Electron/web flow?

## Request Context

User reports a definite bug when running the Electron app built from `/Users/normy/autobyteus_org/autobyteus-worktrees/mixed-team-manager-simplification-analysis`. The bug happens only with Codex as runtime. Claude runtime and AutoByteus runtime reportedly do not show the bug. User suggests reading the README, starting server/frontend, using seed scripts to see one agent team, selecting Codex GPT 5.5 runtime, and reproducing the bug.

Reference screenshots:
- `/Users/normy/.autobyteus/server-data/memory/agent_teams/team_software-engineering-team_fef700b5/solution_designer_22df63e9023df081/context_files/ctx_ad538acfd8b1__image.png`
- `/Users/normy/.autobyteus/server-data/memory/agent_teams/team_software-engineering-team_fef700b5/solution_designer_22df63e9023df081/context_files/ctx_343119a96e0f__image.png`

Observed screenshot text:
- `Codex app server notification 'account/rateLimits/updated' did not include enough thread or turn identity to route among 2 active team threads.`
- `Codex app server notification 'mcpServer/startupStatus/updated' did not include enough thread or turn identity to route among 2 active team threads.`

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): Git
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/mixed-team-manager-simplification-analysis`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/mixed-team-manager-simplification-analysis/tickets/done/codex-runtime-notification-routing-bug`
- Current Branch: `codex/mixed-team-manager-simplification-analysis`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/mixed-team-manager-simplification-analysis`
- Bootstrap Base Branch: `codex/mixed-team-manager-simplification-analysis` (user clarified on 2026-06-08 that the existing ticket branch is the base branch for this bug work, not the remote default branch)
- Remote Refresh Result: `git fetch origin --prune` succeeded with no output on 2026-06-08.
- Task Branch: `codex/mixed-team-manager-simplification-analysis` tracking `origin/codex/mixed-team-manager-simplification-analysis`
- Expected Base Branch (if known): `codex/mixed-team-manager-simplification-analysis`
- Expected Finalization Target (if known): Not specified; downstream implementation should preserve this work as based on the ticket branch `codex/mixed-team-manager-simplification-analysis`.
- Bootstrap Blockers: None.
- Notes For Downstream Agents: Existing worktree is the user-specified ticket branch/worktree; user clarified this ticket branch is the base branch. If a separate implementation branch is created, create it from `codex/mixed-team-manager-simplification-analysis`, not from `personal`.

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-06-08 | Command | `git -C /Users/normy/autobyteus_org/autobyteus-worktrees/mixed-team-manager-simplification-analysis status --short --branch` | Verify branch/worktree state | Current branch is `codex/mixed-team-manager-simplification-analysis` tracking `origin/codex/mixed-team-manager-simplification-analysis`; no modified files before artifact creation. | No |
| 2026-06-08 | Command | `git -C /Users/normy/autobyteus_org/autobyteus-worktrees/mixed-team-manager-simplification-analysis fetch origin --prune` | Refresh tracked refs before investigation | Succeeded with no output. | No |
| 2026-06-08 | Command | `git remote show origin` | Identify remote default branch during bootstrap | Remote HEAD is `personal`, but user later clarified the ticket branch is the base branch for this task. | No |
| 2026-06-08 | Data | User screenshots at provided context-file paths | Capture reported visible behavior | Error cards are inserted into team member chats for unscoped Codex app server notifications when two active team threads exist. | Trace emitting code and reproduce. |
| 2026-06-08 | Other | User clarification in chat: "you should base your branch on top of the ticket branch ... the ticket branch is the base branch" | Correct bootstrap/base-branch assumption | Base branch for this bug work is `codex/mixed-team-manager-simplification-analysis`; do not base downstream work on remote default `personal` directly. | No |

| 2026-06-08 | Command | `git diff --stat origin/personal..HEAD -- autobyteus-server-ts/src/agent-execution/backends/codex ...` | Compare regression delta for Codex runtime paths while keeping ticket branch as base | Relevant ticket-branch deltas include `codex-client-thread-router.ts`, new `codex-team-thread-cohort-coordinator.ts`, `codex-thread-manager.ts`, and new `team-runtime-cohort-identity.ts`. | No |
| 2026-06-08 | Code | `git diff --unified=80 origin/personal..HEAD -- autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-client-thread-router.ts` | Identify router behavior change | Ticket branch adds `emitAmbiguousMessageError(...)` and calls it whenever no registration is delivered for notifications/server requests. The emitted error text exactly matches the screenshots. | No |
| 2026-06-08 | Code | `git show origin/personal:autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-client-thread-router.ts` | Compare previous behavior | `origin/personal` routed matching thread/turn messages but did not emit runtime/chat errors when shared-client messages were unrouteable among multiple registrations. | No |
| 2026-06-08 | Code | `autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session-manager.ts` and `.../claude-team-session-cohort-coordinator.ts` | Owns Claude per-run sessions and records team cohort membership | Ticket branch does not change `ClaudeSdkClient` reuse; it only registers/unregisters sessions with a cohort registry. | No analogous provider-client mischange found; cohort completeness can be reviewed separately. |
| 2026-06-08 | Code | `autobyteus-server-ts/tests/unit/agent-execution/backends/codex/thread/codex-client-thread-router.test.ts` | Check existing router test coverage | Existing current-branch test asserts `mcp/startupComplete` is not broadcast, but the fake thread has no `emitRuntimeError`, so it does not catch the user-visible ambiguous-error side effect. It also does not cover actual observed methods `mcpServer/startupStatus/updated` and `account/rateLimits/updated`. | Yes |
| 2026-06-08 | Trace | `pnpm -C autobyteus-server-ts exec vitest run --root ../tickets/done/codex-runtime-notification-routing-bug --config vitest.probe.config.ts --no-watch` | Build focused proof without needing full Electron/Codex credentials | Probe passed and demonstrates current branch emits `CODEX_AMBIGUOUS_TEAM_THREAD_EVENT` to both registered threads for unscoped `mcpServer/startupStatus/updated` when two threads share one client. | Convert into durable regression test under `autobyteus-server-ts/tests/unit/...` during implementation. |
| 2026-06-08 | Code | `git blame -L 40,65 -- codex-client-thread-router.ts`; `git show 244e1060`; `tickets/done/remove-native-autobyteus-agent-team/design-spec.md` Round 5 | Identify why `emitAmbiguousMessageError(...)` was added | Added in commit `244e1060 chore(ticket): checkpoint remove native team candidate`, alongside same-runtime Codex/Claude cohort work. Design notes emphasize exact-run delivery and avoiding ambiguous routing/false success. Inference: the ambiguity error was intended as a guardrail for route-required thread/turn events in shared same-runtime clients, not for client-global telemetry. | No |
| 2026-06-08 | Other | User clarification: global/unrouteable Codex notifications should be skipped or only logged because some notifications are not useful and are not errors | Lock intended behavior for global telemetry | Known client-global Codex telemetry must not call `emitRuntimeError(...)`, must not change agent status to error, and must not create chat-visible events. Default behavior should skip; optional diagnostic logging is acceptable. | No |
| 2026-06-08 | Doc | `tickets/in-progress/agent-skill-runtime-support-investigation/proposed-design.md` and `requirements.md` | Verify prior Codex client-boundary contract | Prior Codex work explicitly selected one app-server client per canonical `cwd` / workspace path, rejected one-client-per-session/thread as unnecessary overhead, and rejected one global client across unrelated workspaces. | No |
| 2026-06-08 | Doc | `tickets/done/remove-native-autobyteus-agent-team/round4-design-impact-rework.md` | Find rationale for current ticket client scope changes | Round 4 wanted explicit provider same-runtime cohort ownership after all-Codex/all-Claude live failures and says hidden `memberTeamContext ? null : agent-run:<runId>` sharing was not clean enough. It does not establish that the Codex app-server client/process key itself should stop being canonical-`cwd` scoped. | Yes |
| 2026-06-08 | Code | `autobyteus-server-ts/tests/unit/agent-execution/backends/codex/thread/codex-thread-manager.test.ts` | Check current encoded behavior | Current test intentionally asserts same-workspace standalone runs use different scope keys (`codex:agent-run:<runId>`) and same-team members use `codex:team:<teamRunId>:workspace:<cwd>`. This contradicts prior canonical-`cwd` client reuse if interpreted as actual app-server client/process identity. | Yes |
| 2026-06-08 | Code | `git diff origin/personal..HEAD -- autobyteus-server-ts/src/runtime-management/codex/client/codex-app-server-client-manager.ts` | Verify whether `CodexAppServerClientManager` changed | The manager itself changed from `normalizeClientKey(cwd) => path.resolve(cwd)` to `normalizeClientKey(cwd, scopeKey) => path.resolve(cwd) + "\0" + scopeKey`, enabling multiple app-server clients for the same canonical `cwd`. No commit message/design note found that gives a Codex protocol requirement for this lower-level key change. | Yes |
| 2026-06-08 | Command | `git diff --stat origin/personal..HEAD -- autobyteus-server-ts/src/agent-execution/backends/claude autobyteus-server-ts/src/runtime-management/claude ...` | Audit whether Claude has an analogous provider-client boundary regression | No diff in `autobyteus-server-ts/src/runtime-management/claude/client/claude-sdk-client.ts`; Claude changes are session/cohort registration, team MCP/tooling, and active-query cleanup. | No |
| 2026-06-08 | Code | `git diff origin/personal..HEAD -- claude-session-manager.ts claude-team-session-cohort-coordinator.ts claude-session.ts` | Inspect Claude same-runtime cohort changes | `ClaudeSessionManager` still uses a single injected `ClaudeSdkClient = getClaudeSdkClient()` and per-run `ClaudeSession` objects. New `ClaudeTeamSessionCohortCoordinator` only registers/unregisters run ids by cohort key; it does not create scoped SDK clients or change provider-client reuse. | No |
| 2026-06-08 | Command | `rg -n "listCohortRunIds|resolveCohortKey|registerSession|unregisterSession" autobyteus-server-ts/src ...` | Check whether Claude cohort owner is active routing/cleanup owner or registry-only | Current code only calls `registerSession(...)` and `unregisterSession(...)`; `listCohortRunIds(...)` and `resolveCohortKey(...)` are not used in production code. This suggests Claude cohort work is incomplete/registry-only, but not a client-boundary performance regression. | Yes |
| 2026-06-08 | Test | `pnpm -C autobyteus-server-ts exec vitest run tests/unit/agent-execution/backends/claude/session/claude-session-manager.test.ts --no-watch` | Validate focused Claude session manager tests after audit | Passed 7 tests. Confirms current unit coverage is green but does not prove cohort owner completeness. | No |

| 2026-06-08 | Doc/Design Rule | Reloaded `solution-designer/design-principles.md` removal guidance after user asked why Claude cohort cleanup was optional | Confirm cleanup posture | Principles say removal is first-class, empty indirection should be removed, and clean-cut replacement is preferred over carrying old paths. Since the Claude cohort registry has no consumer and `TeamRuntimeCohortIdentity` would only support that registry after Codex cleanup, the design should remove both in scope rather than flag them optional. | Design/requirements updated and architecture review resent. |
| 2026-06-08 | Code | Added-file simplification audit: `claude-team-session-cohort-coordinator.ts`, `team-runtime-cohort-identity.ts`, mixed-team delivery/task-agent additions, AutoByteus extraction files | Check whether other ticket-branch additions look superficial like Codex cohort | One similar candidate found: Claude cohort coordinator is registry-only; production code only calls `registerSession`/`unregisterSession`, while `listCohortRunIds` and `resolveCohortKey` are unused. After Codex cohort removal, `TeamRuntimeCohortIdentity` only exists to support this Claude no-op registry. Other added mixed-team/send-message/task-agent files have active call sites and concrete delivery/tooling responsibilities, so they are not obviously superficial from this audit. | Include as in-scope no-behavior cleanup unless architecture finds a hidden consumer. |
| 2026-06-08 | Other | User question: after proposed design, is `TeamRuntimeCohortIdentity` useful if `origin/personal` worked without it? | Clarify abstraction value after design | For Codex, no useful responsibility remains after restoring canonical-`cwd` client reuse; `CodexTeamThreadCohortCoordinator` should be deleted if it only generated the wrong client scope key. Claude registry-only cleanup remains separate/non-behavioral unless architecture approves. | Reflected in design spec. |
| 2026-06-08 | Other | User clarification: “whether those ambiguous thing are really error? ... from codex perspective, they are not errors ... they are global events ... useful” | Clarify business semantics of router ambiguity | Router ambiguity is an AutoByteus delivery classification, not a Codex protocol/business error. Known global events are valid global signals; even unknown no-route diagnostics should not be broadcast as per-thread runtime errors by default. | Update requirements/design and resend architecture review package. |
| 2026-06-08 | Doc | `solution-designer/design-principles.md` and `references/design-examples.md` | Apply team design guidance before writing design | Relevant principles: spine-first design, authoritative boundary rule, empty indirection trigger, clean-cut removal, and simple owner/file responsibility mapping. Runtime-flow examples guided keeping the router as the bounded local event-dispatch owner rather than adding UI workarounds. | No |
| 2026-06-08 | Code | `autobyteus-server-ts/src/runtime-management/codex/client/codex-app-server-client-manager.ts`; `.../codex-thread-manager.ts`; `.../codex-client-thread-router.ts`; `.../codex-thread-cleanup.ts`; relevant tests | Refresh current-state design read after user approved direction | Confirmed the concrete implementation seams: manager API carries `scopeKey`; thread manager computes/passes scope keys into acquire/release/cleanup; router owns active client registrations and ambiguity emission; tests currently encode scoped-client behavior. | No |

## Current Behavior / Current Flow

- Current entrypoint or first observable boundary: `CodexAppServerClient` receives JSON-RPC notifications from the Codex app-server process and exposes them through `onNotification(...)` to `CodexClientThreadRouter`.
- Current execution flow: `Codex app-server process -> CodexAppServerClient.onNotification -> CodexClientThreadRouter.handleAppServerNotification -> isAppServerMessageForThread(...) -> no delivery for unscoped global notifications when registrations.length > 1 -> emitAmbiguousMessageError(...) -> CodexThread.emitRuntimeError(...) -> CodexThreadEventName.ERROR -> CodexAgentRunBackend -> AgentRunEvent.ERROR -> team chat error card`.
- Ownership or boundary observations: `CodexClientThreadRouter` is the authoritative shared-client demultiplexer for Codex thread traffic. It currently lacks an explicit notification-scope classifier, so client-global account/MCP telemetry is handled by the same ambiguity branch as turn/thread-scoped events that are missing identity.
- Current behavior summary: In Codex runtime team runs with multiple active Codex threads sharing one client, unscoped global notifications such as `mcpServer/startupStatus/updated` and `account/rateLimits/updated` are not delivered to a thread, then are converted into user-visible runtime errors for every registered thread.

## Design Health Assessment Evidence

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Bug Fix
- Candidate root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Missing Invariant
- Refactor posture evidence summary: A narrow refactor is needed inside the existing router owner: add an explicit notification/request route-scope classification invariant before no-delivery ambiguity handling. Do not revert the same-team shared-client cohort refactor.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| User screenshots | The visible error text exactly matches `emitAmbiguousMessageError(...)` in `codex-client-thread-router.ts`. | Confirms the UI cards originate from the Codex shared-client router, not frontend rendering or Claude/AutoByteus paths. | No |
| Current-vs-origin comparison | `origin/personal` did not emit errors for no-delivery shared-client notifications; ticket branch adds the no-delivery ambiguity error. | Regression is introduced by the ticket-branch router behavior, while the fix must still preserve the ticket branch as base. | No |
| Focused probe | A two-thread shared-client fake reproduces `CODEX_AMBIGUOUS_TEAM_THREAD_EVENT` for unscoped `mcpServer/startupStatus/updated`. | Electron reproduction is not strictly required to identify the backend root cause; durable unit coverage should be added. | No |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-server-ts/src/runtime-management/codex/client/codex-app-server-client-manager.ts` | Owns Codex app-server client/process reuse and ref counting | Ticket branch changed key from canonical `cwd` to `cwd + scopeKey`, creating multiple app-server clients for the same workspace. | Suspect performance/contract regression; restore canonical-`cwd` key unless concrete Codex reason is proven. |
| `autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-client-thread-router.ts` | Shared-client notification/request/close demultiplexer for Codex threads | Added `emitAmbiguousMessageError(...)` in ticket branch and invokes it on no delivery; no global-notification classifier exists. | Primary fix owner. Add classification before routing ambiguity handling. |
| `autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread-manager.ts` | Creates/restores Codex threads and registers them with the router | Ticket branch passes `threadClientScopeKey(...)` into `CodexAppServerClientManager`, causing same-`cwd` standalone runs and different team runs to use distinct app-server clients. | Likely wrong layer for cohort identity; restore canonical-`cwd` client reuse unless a concrete Codex requirement is found. |
| `autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-team-thread-cohort-coordinator.ts` | Resolves same-runtime team cohort identity | New on ticket branch; builds team/workspace/run scope keys currently used as Codex client keys. | Cohort identity may be useful for routing/cleanup, but should sit above the Codex app-server client/process key. |
| `autobyteus-server-ts/src/agent-execution/domain/team-runtime-cohort-identity.ts` | Shared cohort identity builder for Codex/Claude same-runtime team grouping | New on ticket branch; returns team/workspace-scoped keys for team runs and agent-run keys for standalone runs. | Keep if needed for provider cohort ownership, but do not use it to override Codex client/process reuse without proof. |
| `autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session-manager.ts` and `.../claude-team-session-cohort-coordinator.ts` | Owns Claude per-run sessions and records team cohort membership | Ticket branch does not change `ClaudeSdkClient` reuse; it only registers/unregisters sessions with a cohort registry. | No analogous provider-client mischange found; cohort completeness can be reviewed separately. |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/codex/thread/codex-client-thread-router.test.ts` | Current router unit coverage | Existing global startup test does not assert absence of runtime errors and uses `mcp/startupComplete`, not the observed Codex methods. | Must add regression tests for `mcpServer/startupStatus/updated` and `account/rateLimits/updated` with `emitRuntimeError` spies. |

## Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-06-08 | Probe | `tickets/done/codex-runtime-notification-routing-bug/probes/codex-client-thread-router-current-bug.probe.test.ts` run via `pnpm -C autobyteus-server-ts exec vitest run --root ../tickets/done/codex-runtime-notification-routing-bug --config vitest.probe.config.ts --no-watch` | Passing probe demonstrates the current branch emits `CODEX_AMBIGUOUS_TEAM_THREAD_EVENT` to both registered threads for unscoped `mcpServer/startupStatus/updated` with two active registrations. | Backend root cause reproduced without full Electron; turn this into durable tests during implementation. |

## External / Public Source Findings

- Public API / spec / issue / upstream source: None used yet.
- Version / tag / commit / freshness: N/A.
- Relevant contract, behavior, or constraint learned: N/A.
- Why it matters: N/A.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: Pending README/code investigation.
- Required config, feature flags, env vars, or accounts: Likely Codex runtime credentials/config.
- External repos, samples, or artifacts cloned/downloaded for investigation: None.
- Setup commands that materially affected the investigation: None beyond git bootstrap.
- Cleanup notes for temporary investigation-only setup: None.

## Findings From Code / Docs / Data / Logs

Pending.



### Intent Inference For `emitAmbiguousMessageError(...)`

`emitAmbiguousMessageError(...)` was added in commit `244e1060 chore(ticket): checkpoint remove native team candidate`, the same checkpoint that introduced provider same-runtime cohort coordination and exact-run delivery support. Nearby design artifacts state that exact-run addressing must compose with same-runtime Codex/Claude cohorts and avoid ambiguous routing/false-success behavior. The likely intent was therefore valid: when a shared Codex app-server client has multiple active team threads, a route-required notification/request that lacks thread/turn identity should not be silently dropped or broadcast to the wrong run.

The bug is that this guardrail was applied to all no-delivery app-server notifications, including client-global telemetry such as `mcpServer/startupStatus/updated` and `account/rateLimits/updated`, which are not supposed to have thread/turn identity. User clarified on 2026-06-08 that these global/unrouteable telemetry notifications should be skipped by default or only logged diagnostically; they are not runtime errors and should not become chat-visible content.

### Root-Cause Finding: Codex Global Notifications Are Misclassified As Ambiguous Thread Events

The user-visible error originates in `autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-client-thread-router.ts`. The ticket branch adds `emitAmbiguousMessageError(...)`, which sends `CODEX_AMBIGUOUS_TEAM_THREAD_EVENT` through `CodexThread.emitRuntimeError(...)` whenever a notification/server request is not delivered to any registered thread and more than one thread is registered on the shared Codex client.

This is too broad for Codex app-server notifications because some methods are client-global telemetry, not thread/turn events. The screenshots show exactly those global methods:

- `mcpServer/startupStatus/updated` — app-server/MCP runtime startup telemetry; observed historical raw event fixtures show no `threadId` or `turnId`.
- `account/rateLimits/updated` — account/rate-limit telemetry; observed historical raw event fixtures show no `threadId` or `turnId`.

Comparison with `origin/personal` confirms the regression mechanism: the old router simply skipped no-match notifications. The ticket branch added the user-visible ambiguity error but did not first classify whether the method is supposed to be thread-scoped. Multiple Codex threads sharing one workspace client is valid and should be supported, but it should come from canonical-`cwd` client reuse rather than a team/run scope key.

Existing current-branch router coverage misses this because the fake thread in the global-notification test lacks `emitRuntimeError`, so the test can pass while the real UI still receives error events.



### Codex Client Scope Concern: Current Ticket May Violate Prior `cwd` Boundary

Earlier Codex runtime work explicitly chose one Codex app-server client/process per canonical workspace/worktree path. The stated rationale was:

- one global client across unrelated workspaces is too coarse;
- one client per session/thread is unnecessary overhead because one app-server connection can host multiple threads for the same workspace;
- the best-fit operational boundary is canonical `cwd`.

The current ticket branch introduces a `scopeKey` into `CodexThreadManager` such that same-workspace standalone runs use separate `codex:agent-run:<runId>` client keys and same-team runs use `codex:team:<teamRunId>:workspace:<cwd>` client keys. Local design notes justify an explicit provider cohort owner for same-runtime team routing/cleanup, but I did not find a Codex-specific contract reason that the underlying app-server client/process key must change away from canonical `cwd`.

Current interpretation after user clarification: Codex does not need a separate cohort abstraction for this ticket. Keep `CodexAppServerClientManager` reuse keyed by canonical `cwd`; let `CodexClientThreadRouter` own the active per-client thread registration set; remove `CodexTeamThreadCohortCoordinator` if its only remaining job is to build the wrong client scope key.



### Claude Audit: No Analogous Provider-Client Boundary Mischange Found

Claude changes on the ticket branch do not mirror the Codex `CodexAppServerClientManager` key regression. `autobyteus-server-ts/src/runtime-management/claude/client/claude-sdk-client.ts` has no diff from `origin/personal`, and `ClaudeSessionManager` still owns one injected `ClaudeSdkClient` from `getClaudeSdkClient()` plus per-run `ClaudeSession` instances. The new `ClaudeTeamSessionCohortCoordinator` records run ids under a cohort key and is registered/unregistered by `ClaudeSessionManager`, but it does not create per-run/per-team SDK clients.

Therefore the performance-risk client-boundary concern appears Codex-specific. Claude still has a possible completeness/design concern: the cohort coordinator currently looks registry-only because `listCohortRunIds(...)` and `resolveCohortKey(...)` are not used in production code, despite design notes saying the Claude cohort should own bounded cleanup. That should be reviewed separately if same-runtime Claude cleanup problems persist, but it is not the same as the Codex app-server client/process reuse regression.

### No Concrete Reason Found For Changing `CodexAppServerClientManager` Key Semantics

The ticket branch changed `CodexAppServerClientManager` itself from a pure canonical-`cwd` key to a composite `cwd + scopeKey` key. This enables one app-server client per standalone run or per team run even when the `cwd` is identical.

The only rationale found in local design artifacts is a higher-level one: same-runtime provider cohorts needed explicit ownership for routing, exact-run delivery, and cleanup after all-Codex/all-Claude team failures. That rationale supports an explicit cohort owner, but it does not prove that the lower-level Codex app-server client/process manager should stop following the previous canonical-`cwd` boundary.

Current conclusion for design: treat the `scopeKey` change in `CodexAppServerClientManager` as suspect. The target should restore or preserve `cwd`-scoped app-server client reuse and keep team/run cohort identity in the router/cohort owner above it, unless implementation investigation uncovers a concrete Codex app-server contract that requires separate processes per standalone run/team.

### Product Decision: Global Codex Telemetry Is Non-Error, Non-Chat Content

User clarified on 2026-06-08 that unrouteable/global Codex app-server notifications should continue to be skipped or only logged, because AutoByteus does not need every Codex app-server telemetry notification. Known global telemetry must not call `CodexThread.emitRuntimeError(...)`, must not set member status to `ERROR`, and must not create team chat/conversation events.

Default recommended behavior: skip at the router boundary. If diagnostics are useful, log only through existing debug/raw-event logging (for example under `RUNTIME_RAW_EVENT_DEBUG`) rather than normal user-visible runtime events.


### Additional Simplification Audit

After the Codex cohort/client-scope simplification, the only other obviously superficial abstraction found in the same area is the Claude cohort registry:

- `autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-team-session-cohort-coordinator.ts` is used only by `ClaudeSessionManager` for `registerSession(...)` and `unregisterSession(...)`.
- Its read methods `listCohortRunIds(...)` and `resolveCohortKey(...)` are not used in production code.
- After Codex no longer uses `TeamRuntimeCohortIdentity`, that shared identity helper only exists to feed the Claude registry.

This makes the Claude cohort pair a no-behavior cleanup that should be included in this ticket: remove the Claude coordinator and delete `team-runtime-cohort-identity.ts` entirely. That should not change `ClaudeSdkClient` lifecycle or user-visible Claude behavior because the registry currently has no consumer.

Other added files reviewed at a high level, including mixed-team delivery/resolver files, task-agent directory/recovery cache, send-message contract/target selector, and AutoByteus tool/context extraction files, have active call sites and concrete delivery/tooling responsibilities. They may still be improvable, but they are not obviously empty abstractions like the cohort files.

## Constraints / Dependencies / Compatibility Facts

- Must preserve current Claude and AutoByteus runtime behavior.
- Must account for multiple simultaneously active team threads.
- Must not require global account/MCP telemetry notifications to carry team-thread or turn identity.

## Open Unknowns / Risks

- Whether local reproduction needs private Codex account state or a desktop packaging mode.
- Whether the unscoped notification should be ignored entirely or surfaced elsewhere as diagnostics.

## Notes For Architect Reviewer

Design should stay intentionally small but decisive: restore the Codex app-server client manager to canonical-`cwd` reuse, keep active-thread routing in `CodexClientThreadRouter`, classify known client-global telemetry before no-route diagnostics, ensure router diagnostics are server-side/non-user-visible rather than per-thread runtime errors, remove empty Codex and Claude cohort abstractions including `TeamRuntimeCohortIdentity`, and leave Claude `ClaudeSdkClient`/session behavior unchanged. User approved this direction on 2026-06-08.
