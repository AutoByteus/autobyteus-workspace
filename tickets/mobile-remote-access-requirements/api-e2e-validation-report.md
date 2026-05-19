# API, E2E, And Executable Validation Report

## Validation Round Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/mobile-remote-access-requirements/tickets/mobile-remote-access-requirements/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/mobile-remote-access-requirements/tickets/mobile-remote-access-requirements/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/mobile-remote-access-requirements/tickets/mobile-remote-access-requirements/design-spec.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/mobile-remote-access-requirements/tickets/mobile-remote-access-requirements/design-review-report.md`
- UX Addendum: `/Users/normy/autobyteus_org/autobyteus-worktrees/mobile-remote-access-requirements/tickets/mobile-remote-access-requirements/mobile-ux-redesign-addendum.md`
- Experience Story: `/Users/normy/autobyteus_org/autobyteus-worktrees/mobile-remote-access-requirements/ui-prototypes/mobile-pwa-navigation/experience-story.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/mobile-remote-access-requirements/tickets/mobile-remote-access-requirements/implementation-handoff.md`
- Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/mobile-remote-access-requirements/tickets/mobile-remote-access-requirements/review-report.md`
- Current Validation Round: 10
- Trigger: Code review Round 10 pass after CR-MRA-007 Local Fix, followed by the user's explicit instruction to run real mobile agent execution using Codex runtime and GPT-5.5 instead of Anthropic/default runtime.
- Prior Round Reviewed: Round 4 browser validation plus code-review Round 10 requested focus.
- Latest Authoritative Round: 10 plus solution-design branch-currency correction
- Latest Authoritative Result: **Superseded stale-base failure — revalidate on refreshed branch.** Round 10 correctly proved the command-identity symptom was not mobile-only; subsequent solution-design refresh against latest `origin/personal` `98cfdc24` found the shared single-agent command-identity and ACK rejection fix already present on base. No separate command-identity ticket remains. The mobile branch has now merged latest `origin/personal` (`98cfdc24`) and API/E2E should re-run real Codex/GPT-5.5 single-agent validation on this refreshed branch.

## Round History

| Round | Trigger | Prior Unresolved Failures Rechecked | New Failures Found | Result | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Code review Round 2 pass after Local Fix | N/A | Backend-generated `/mobile?pairing=...` routed to desktop shell; unsupported route double-based. | Fail | No | Pairing/static-base blocker. |
| 2 | Code review Round 4 pass after Round 1 fixes | MRA-E2E-003, MRA-E2E-016 | None blocking. | Pass | No | Remote Access bootstrap/static/auth spine passed. |
| 3 | Mobile UX Redesign Local Fix validation plus user clarification that mobile must support desktop-web-equivalent journeys | Prior route/auth blockers | Yes: unreadable real-data rows, no complete new-run launch, placeholder file preview/attach, Activity no-op/limited behavior, broader functional parity requirement gap. | Fail | No | Routed to solution design. |
| 4 | Code review Round 8 pass after functional-parity rework and CR-MRA-006 | Round 3 findings MRA-E2E-025..030 | UX/design frictions only; provider-key runtime errors clarified by user as expected when runtime is not configured. | Fail / Design Impact | No | Functional paths mostly existed, but UX refinement was requested. |
| 10 | Code review Round 10 pass after CR-MRA-007 and user instruction to test real Codex/GPT-5.5 mobile execution | Round 4 UX/functionality paths; CR-MRA-007 composite status | Yes, on stale branch: shared single-agent command identity was missing. Latest-base refresh found this already fixed on `origin/personal` `98cfdc24`. | **Superseded / branch refresh required** | **Yes** | Not mobile-only and not a backend runtime/provider issue; do not fix inside the mobile ticket. Latest base has been merged; revalidate. |


## User Scope Clarification And Latest-Base Correction After Round 10 Handoff

After the initial Round 10 handoff, the user asked whether the command-identity symptom was mobile-only or a general backend/platform issue and clarified that a general issue should not be fixed inside this mobile UX ticket. Runtime evidence showed it was **not mobile-only** and **not a backend runtime/provider bug**: the backend accepted the same mobile-created Codex/GPT-5.5 run when command identity was present. Solution design then checked latest `origin/personal` `98cfdc24` and found the shared frontend fix already present. Current posture: no separate command-identity ticket remains; latest base has been merged into the mobile branch and real single-agent execution should be revalidated there.


## Solution-Design Latest-Base Integrated Check (2026-05-19)

After committing the mobile ticket work, solution design merged latest `origin/personal` `98cfdc24` into `codex/mobile-remote-access-requirements` via merge commit `26a17e0a`, then recorded final docs at `29266b9b`. Current branch relation is ahead 8 / behind 0 and `origin/personal` is an ancestor of HEAD.

Post-merge checks passed:

- `git diff --check`;
- obsolete command-identity ticket/dependency path and active-doc reference checks;
- focused web Vitest covering shared single-agent command identity, run submission, mobile shell/refinement/context-selection, mobile routes, middleware, and feature gates — 10 files / 57 tests;
- backend Remote Access unit Vitest — 5 files / 27 tests;
- `pnpm -C autobyteus-web build:mobile-web`.

Evidence file: `/Users/normy/autobyteus_org/autobyteus-worktrees/mobile-remote-access-requirements/tickets/mobile-remote-access-requirements/validation-evidence/round10-latest-base-refresh-solution-design-checks.log`.

Remaining API/E2E action: rerun real mobile Codex/GPT-5.5 single-agent launch/send on this integrated branch. The stale command-identity ticket remains removed and should not be reimplemented as a mobile local fix.

## Validation Basis

Validated against:

- AC-MRA-020 through AC-MRA-024: phone-first shell, Home status/action/recent work, one-task-at-a-time mobile work shell, stale `/mobile/workspace` handling, and desktop `/workspace` no regression.
- AC-MRA-025 through AC-MRA-031: readable real-data rows, existing and new run journeys, files, attachments, Activity/team/tool history, and no enabled no-op controls.
- AC-MRA-032 through AC-MRA-036: legacy compressed-mobile removal, desktop journey protection, authoritative shared-owner reuse, and shared-state refactor safety.
- Code review Round 10 focus: CR-MRA-007 composite status behavior, existing-run continuation, new agent/team setup/launch, file preview/attach/send, composer context tray, Activity/team/tool history, desktop `/workspace` no-regression.
- User clarification: runtime/API-key errors after launch are not mobile problems when the selected runtime/provider is not configured.
- User runtime instruction: real mobile agent execution validation must use Codex runtime and `gpt-5.5`, not Anthropic/default runtime.

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No`
- Durable validation added or retained only for compatibility-only behavior: `No`
- If compatibility-related invalid scope was observed, reroute classification used: N/A
- Upstream recipient notified: N/A

No compressed desktop mobile shell, default desktop left tree, stacked desktop top tabs, or mobile compatibility wrapper was observed in `/mobile`. Desktop `/workspace` still rendered the desktop shell outside mobile runtime.

## Validation Surfaces / Modes

- Focused repository tests after code review.
- Static mobile build.
- GraphQL/runtime model probe against the live local backend.
- Direct browser testing using the Browser tool against current worktree mobile PWA at `http://127.0.0.1:3030/mobile`.
- 390x844 mobile viewport with device scale factor 3.
- Real local backend data from `http://127.0.0.1:29695` for GraphQL/workspace/file/run APIs.
- Temporary direct WebSocket probes against the same mobile-created Codex run to isolate whether the failure was backend/runtime or frontend command payload.

## Platform / Runtime Targets

- Host: macOS laptop, timezone Europe/Berlin.
- Validation date: 2026-05-19.
- Browser: Codex in-app browser, mobile viewport 390x844.
- Frontend target: current worktree Nuxt dev server at `http://127.0.0.1:3030`.
- Backend target: user's local AutoByteus backend at `http://127.0.0.1:29695`.
- Real execution runtime required by user: `codex_app_server` with model `gpt-5.5`.
- Codex model availability probe: OpenAI provider under `codex_app_server` had `apiKeyConfigured=true` and included `gpt-5.5`.

## Lifecycle / Upgrade / Restart / Migration Checks

No native installer/updater/restart/migration scenario was introduced by the Round 10 rework. Round 10 focused on live mobile UX, route gates, status reachability, shared selection isolation, file/activity journeys, and runtime execution boundaries.

## Coverage Matrix

| Scenario ID | Requirement / Risk | Mode | Result | Evidence |
| --- | --- | --- | --- | --- |
| MRA-E2E-001 | Mobile static assets build under `/mobile/` base | `pnpm -C autobyteus-web build:mobile-web` | Pass | `round10-mobile-web-build.log` |
| MRA-E2E-007..013 | Remote Access route/auth/server utility regressions | Focused backend/web tests | Pass | `round10-remote-access-unit-vitest.log`, `round10-remote-access-web-vitest.log` |
| MRA-E2E-016 | Stale `/mobile/workspace` mobile route does not expose desktop workspace UI | Browser | Pass | `round10-mobile-workspace-unsupported.png` |
| MRA-E2E-020 / CR-MRA-007 | Status endpoint unavailable while authorized catalog/work data succeeds shows reachable/unknown status, not true offline | Browser | Pass | `round10-mobile-home-mixed-status-real-data.png` |
| MRA-E2E-020B / CR-MRA-007 | Later true current-cycle network/catalog failure clears stale reachability and shows true offline | Browser | Pass | `round10-mobile-home-true-offline-after-current-failure.png` |
| MRA-E2E-021 | Existing agent/team run continuation with visible conversation/composer | Browser | Pass | `round10-mobile-existing-run-chat.png` |
| MRA-E2E-022 | One task surface at a time, bottom nav only | Browser | Pass | Chat/Runs/Files/Activity surfaces were navigated one at a time. |
| MRA-E2E-024 / 033 | Desktop `/workspace` no-regression | Browser spot-check | Pass | `round10-desktop-workspace-no-mobile-shell.png` |
| MRA-E2E-025 | Real-data mobile rows readable at 390x844 with long names | Browser | Pass | Home/recent rows remained readable in Round 10 browser pass. |
| MRA-E2E-026 | New single-agent mobile launch using requested Codex runtime and GPT-5.5 | Browser + WebSocket isolation probe | Superseded stale-base fail / revalidate on refreshed branch | Mobile Run Setup selected Codex/workspace/prompt and created run `b0d24431-207a-4833-87d7-4caf2bcb6c8b` with observed config `{ runtimeKind: codex_app_server, llmModelIdentifier: gpt-5.5 }`, but the mobile first message did not execute. Direct WebSocket command without identity reproduced backend rejection: `INVALID_COMMAND_ID`. Direct WebSocket command with identity was accepted and streamed a Codex/GPT-5.5 response visible in mobile. `round10-browser-validation-notes.json`, `round10-codex-direct-websocket-probe.log`, `round10-codex-direct-websocket-with-identity.log`, `round10-mobile-codex-gpt55-response-after-identity-probe.png` |
| MRA-E2E-027 | New team-run setup/launch path | Browser route check; focused tests | Partial Pass / Not re-forced with Codex after MRA-E2E-026 blocker | Prior Round 10 browser setup showed team launch route reaches Chat and runtime errors are surfaced after launch when provider config fails. Team streaming already carries command identity; full real Codex team response should be revalidated after branch refresh. `round10-mobile-team-provider-error-visible.png` |
| MRA-E2E-028 | Mobile Files preview supported text/code/markdown through authorized file APIs | Browser | Pass | `README.md` preview rendered real content. `round10-mobile-file-preview-attach.png` |
| MRA-E2E-029 | Attach file/context visibly to Chat or next launch | Browser | Pass for preview/attach/tray; live send with attachment not forced after launch blocker | Attach showed `Attached · 1` and `1 file attached to Chat context`. `round10-mobile-file-preview-attach.png` |
| MRA-E2E-030 | Activity shows task plan/team messages/tool history/unsupported terminal notice | Browser | Pass | Activity filters/digest/error rows rendered. `round10-mobile-activity-filtered-errors.png` |
| MRA-E2E-031 | Enabled mobile controls complete action or are disabled/explained | Browser | Superseded stale-base hidden rejection; revalidate on refreshed branch | The stale-branch launch button completed local UI transition while the backend rejected the WebSocket command; latest base has shared ACK rejection handling, so revalidate on the merged branch. |
| MRA-E2E-036 / CR-MRA-006 | Shared selection isolation prevents stale run state in non-run mobile contexts | Focused tests + browser routes | Pass | `round10-focused-mobile-vitest.log`, `round10-shared-selection-run-open-vitest.log` |

## Test Scope

Completed:

- `pnpm -C autobyteus-web exec nuxi prepare` — pass.
- Focused mobile/route/feature-gate Vitest — pass, 7 files / 29 tests.
- Shared selection/run-open Vitest — pass, 5 files / 28 tests.
- Remote Access backend unit Vitest — pass, 5 files / 27 tests.
- Remote Access web/session/auth utility Vitest — pass, 6 files / 21 tests.
- `pnpm -C autobyteus-web build:mobile-web` — pass.
- `NODE_OPTIONS=--max-old-space-size=8192 pnpm -C autobyteus-web exec nuxi typecheck` — fails only on unrelated repo-wide baseline errors; changed mobile/rework path grep had no hits.
- `git diff --check` — pass.
- Browser mobile validation of Home, composite status, Continue latest run, Chat, Activity, Files preview/attach, new agent setup/launch, `/mobile/workspace`, and desktop `/workspace`.
- Codex runtime/model GraphQL probe for `codex_app_server` + `gpt-5.5`.
- Direct WebSocket isolation probes against the mobile-created Codex run.

Not fully forced:

- I did not add or update repository-resident durable validation code in API/E2E.
- Full real Codex team response was not forced after the single-agent `SEND_MESSAGE` identity blocker was isolated; team stream implementation already includes identity and should be revalidated after the single-agent local fix.
- Live send with a file attachment was not forced after the stale-branch command rejection; preview/attach/tray behavior was validated and send should be rechecked after branch refresh.

## Validation Setup / Environment

Validation server command:

```bash
BACKEND_NODE_BASE_URL=http://127.0.0.1:29695 pnpm -C autobyteus-web exec nuxi dev --host 127.0.0.1 --port 3030
```

Browser target:

```text
http://127.0.0.1:3030/mobile
```

Live backend Remote Access REST probe result:

```text
GET  /rest/remote-access/status            -> 404
PUT  /rest/remote-access/settings          -> 404
POST /rest/remote-access/pairing-sessions  -> 404
```

Because the currently running local backend did not expose the Round 10 Remote Access pairing/status REST endpoints, the browser was paired by a temporary localStorage mobile-session fixture. GraphQL/workspace/file/run flows still exercised real local backend data.

Codex model probe result:

```text
runtimeKind=codex_app_server
provider=OPENAI apiKeyConfigured=True
models include: gpt-5.2, gpt-5.3-codex, gpt-5.3-codex-spark, gpt-5.4, gpt-5.4-mini, gpt-5.5
gpt-5.5_available: True
```

## Tests Implemented Or Updated

None by API/E2E. No repository-resident durable validation code was added or updated during this validation round.

## Durable Validation Added To The Codebase

- Repository-resident durable validation added or updated this round: `No`
- Paths added or updated: N/A
- If `Yes`, returned through `code_reviewer` before delivery: N/A
- Post-validation code review artifact: N/A

## Other Validation Artifacts

Round 10 evidence:

- `/Users/normy/autobyteus_org/autobyteus-worktrees/mobile-remote-access-requirements/tickets/mobile-remote-access-requirements/validation-evidence/round10-command-log.txt`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/mobile-remote-access-requirements/tickets/mobile-remote-access-requirements/validation-evidence/round10-nuxi-prepare.log`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/mobile-remote-access-requirements/tickets/mobile-remote-access-requirements/validation-evidence/round10-focused-mobile-vitest.log`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/mobile-remote-access-requirements/tickets/mobile-remote-access-requirements/validation-evidence/round10-shared-selection-run-open-vitest.log`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/mobile-remote-access-requirements/tickets/mobile-remote-access-requirements/validation-evidence/round10-remote-access-unit-vitest.log`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/mobile-remote-access-requirements/tickets/mobile-remote-access-requirements/validation-evidence/round10-remote-access-web-vitest.log`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/mobile-remote-access-requirements/tickets/mobile-remote-access-requirements/validation-evidence/round10-mobile-web-build.log`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/mobile-remote-access-requirements/tickets/mobile-remote-access-requirements/validation-evidence/round10-nuxi-typecheck-baseline.log`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/mobile-remote-access-requirements/tickets/mobile-remote-access-requirements/validation-evidence/round10-typecheck-changed-path-grep.log`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/mobile-remote-access-requirements/tickets/mobile-remote-access-requirements/validation-evidence/round10-git-diff-check.log`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/mobile-remote-access-requirements/tickets/mobile-remote-access-requirements/validation-evidence/round10-local-backend-pairing-probe.log`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/mobile-remote-access-requirements/tickets/mobile-remote-access-requirements/validation-evidence/round10-codex-runtime-model-probe.log`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/mobile-remote-access-requirements/tickets/mobile-remote-access-requirements/validation-evidence/round10-browser-validation-notes.json`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/mobile-remote-access-requirements/tickets/mobile-remote-access-requirements/validation-evidence/round10-codex-direct-websocket-probe.log`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/mobile-remote-access-requirements/tickets/mobile-remote-access-requirements/validation-evidence/round10-codex-direct-websocket-with-identity.log`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/mobile-remote-access-requirements/tickets/mobile-remote-access-requirements/validation-evidence/round10-mobile-home-mixed-status-real-data.png`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/mobile-remote-access-requirements/tickets/mobile-remote-access-requirements/validation-evidence/round10-mobile-home-true-offline-after-current-failure.png`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/mobile-remote-access-requirements/tickets/mobile-remote-access-requirements/validation-evidence/round10-mobile-existing-run-chat.png`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/mobile-remote-access-requirements/tickets/mobile-remote-access-requirements/validation-evidence/round10-mobile-activity-filtered-errors.png`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/mobile-remote-access-requirements/tickets/mobile-remote-access-requirements/validation-evidence/round10-mobile-file-preview-attach.png`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/mobile-remote-access-requirements/tickets/mobile-remote-access-requirements/validation-evidence/round10-mobile-agent-run-setup-ready.png`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/mobile-remote-access-requirements/tickets/mobile-remote-access-requirements/validation-evidence/round10-mobile-agent-provider-error-visible.png`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/mobile-remote-access-requirements/tickets/mobile-remote-access-requirements/validation-evidence/round10-mobile-team-provider-error-visible.png`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/mobile-remote-access-requirements/tickets/mobile-remote-access-requirements/validation-evidence/round10-mobile-codex-gpt55-response-after-identity-probe.png`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/mobile-remote-access-requirements/tickets/mobile-remote-access-requirements/validation-evidence/round10-desktop-workspace-no-mobile-shell.png`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/mobile-remote-access-requirements/tickets/mobile-remote-access-requirements/validation-evidence/round10-mobile-workspace-unsupported.png`

## Temporary Validation Methods / Scaffolding

- Temporary current-branch Nuxt dev server on port 3030.
- Temporary browser localStorage mobile-session fixture.
- Browser-only Pinia `defaultLaunchConfig` fixture for the Codex agent definition to simulate the requested desktop default `{ runtimeKind: codex_app_server, llmModelIdentifier: gpt-5.5 }` because mobile Run Setup exposes only “Existing desktop defaults” and no visible runtime/model selector. This did **not** change repository code or backend definition data.
- Temporary direct WebSocket probes in `/tmp` to isolate backend command acceptance and real Codex/GPT-5.5 response behavior.
- Generated `autobyteus-web/dist/` and `autobyteus-web/dist-mobile/` from mobile build.

## Dependencies Mocked Or Emulated

- Pairing/session persistence was emulated by a browser-local mobile session fixture because the running local backend did not expose the Remote Access pairing/status routes.
- GraphQL/workspace/file/run APIs were not mocked; they used the user's local backend data.
- Codex/GPT-5.5 runtime/model availability and response were not mocked. The direct WebSocket identity probe used the real backend and real Codex app-server path.

## Prior Failure Resolution Check (Mandatory On Round >1)

| Prior Round | Scenario / Failure Reference | Previous Classification | Current Resolution | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| 3 | MRA-E2E-025 — real-data rows unreadable | Design Impact / Local Fix candidate | Resolved / Pass | Round 10 browser Home/recent rows | Vertical row layout remains readable. |
| 3 | MRA-E2E-026 — no complete new agent/team launch path | Requirement Gap / Design Impact | Superseded stale-base fail / revalidate | `round10-codex-direct-websocket-probe.log` | UI path exists and run is created/configured; stale-base single-agent command rejection is already fixed on latest `origin/personal`, so revalidate after merge. |
| 3 | MRA-E2E-027 — file preview/attach placeholder | Requirement Gap / Design Impact | Resolved / Pass for preview/attach | `round10-mobile-file-preview-attach.png` | Live send with attachment waits for single-agent send fix. |
| 3 | MRA-E2E-028 — Activity/team messages/tool history incomplete/no-op | Requirement Gap / Design Impact | Resolved / Pass | `round10-mobile-activity-filtered-errors.png` | Activity/filter/tool rows render. |
| 4 | UX-MRA-040 — status mismatch messaging | Design Impact | Resolved for CR-MRA-007 target | `round10-mobile-home-mixed-status-real-data.png`, `round10-mobile-home-true-offline-after-current-failure.png` | Current-cycle status behavior is correct. |
| 7 / CR-MRA-006 | Stale shared run selection leaked into non-run mobile contexts | Local Fix | Resolved / Pass | `round10-focused-mobile-vitest.log`, `round10-shared-selection-run-open-vitest.log` | Focused regression coverage passed. |
| 9 / CR-MRA-007 | Stale authorized reachability could mask true current-cycle status/catalog failure | Local Fix | Resolved / Pass | Round 10 composite status browser evidence | Mixed status and later true failure both behaved correctly. |

## Scenarios Checked

- Mobile Home in paired-node fixture with real local backend data.
- Mixed current-cycle status: status endpoint unavailable, catalog/work data authorized.
- Later true network/catalog failure after a prior reachable state.
- Existing team-run continuation from Home.
- Bottom navigation one-task-at-a-time behavior for Chat, Runs, Files, Activity.
- Activity digest/filter/detail rows.
- File preview and attach to active Chat context.
- New agent Run Setup and launch using Codex/GPT-5.5 default fixture.
- Direct backend WebSocket command acceptance/rejection for the mobile-created Codex run.
- Desktop `/workspace` no-regression.
- Stale `/mobile/workspace` unsupported redirect/notice.
- Existing route, auth, remote access, shared selection, and build checks.

## Passed

- Focused mobile/route/feature-gate Vitest passed.
- Shared selection/run-open Vitest passed.
- Remote Access backend unit and web/session/auth utility tests passed.
- Mobile static build passed.
- CR-MRA-007 composite status is resolved: reachable work data with missing status endpoint renders `Node reachable · Phone Access status unavailable`; later true current-cycle failure renders true Offline/Cannot reach desktop.
- Home, existing-run continuation, one-task bottom nav, Activity, Files preview/attach, `/mobile/workspace`, and desktop `/workspace` behaved as expected in browser testing.
- Codex App Server + `gpt-5.5` was available through the live local backend (`OPENAI apiKeyConfigured=True`).
- The backend/runtime successfully streamed a real Codex/GPT-5.5 response on the mobile-created run when the WebSocket `SEND_MESSAGE` included command identity. Latest `origin/personal` now provides that identity in the shared single-agent path.
- Missing provider/API-key runtime errors from prior default-runtime launches are not treated as mobile problems per user clarification.

## Superseded Stale-Base Finding

### Round 10 command-identity finding — already fixed on latest base

**Classification:** Shared frontend behavior discovered by mobile validation; not mobile-only; superseded by latest-base refresh. It is not a mobile-component local fix and no separate command-identity ticket remains.

**Historical observed behavior:** the stale branch could create a mobile Codex/GPT-5.5 run, but the first single-agent WebSocket command was rejected without command identity. A direct WebSocket probe with identity against the same mobile-created run was accepted and streamed a response, proving the backend/runtime path worked.

**Latest-base correction:** solution-design inspection and focused tests on latest `origin/personal` `98cfdc24` found identity-bearing `AgentStreamingService.sendMessage(...)`, stable command identity generation in `agentRunStore`, and shared ACK rejection handling already present.

**Current impact:** no separate shared/platform ticket is needed. The mobile branch now includes latest `origin/personal` and API/E2E should re-run real Codex/GPT-5.5 single-agent launch/send, including send-with-attachment, on the refreshed branch.

## Not Tested / Out Of Scope

- Full real Codex team run response after the stale single-agent blocker was isolated. Team streaming appears to have the required identity plumbing and should be included in the next API/E2E pass after branch refresh.
- Native installer/updater/restart/migration flows.
- Public remote-device network conditions outside the local browser/backend setup.

## Blocked

- Delivery should not proceed from the stale Round 10 validation result alone.
- The command-identity failure is superseded by latest-base refresh; the branch now includes `origin/personal` `98cfdc24`; API/E2E must revalidate real mobile single-agent execution on this integrated state.

## Cleanup Performed

- No repository-resident validation code was added.
- Temporary WebSocket probe scripts were kept only in `/tmp` and are not repository artifacts.
- Removed generated `autobyteus-web/dist/` and `autobyteus-web/dist-mobile/` after `build:mobile-web`.
- Cleared the browser local mobile-session fixture from validation tabs.
- Closed Round 10 validation browser tabs and stopped the temporary Nuxt dev server on port 3030.

## Classification

- `Superseded stale-base validation finding`: the command-identity symptom is not mobile-only and latest `origin/personal` already contains the shared fix. Do not implement it inside the mobile UX ticket; merge latest base and revalidate.

## Recommended Recipient

`implementation_engineer` after branch refresh, then `code_reviewer`/`api_e2e_engineer` for normal review and revalidation on the merged branch.

## Evidence / Notes

Key evidence proving the blocker and isolating root cause:

- `round10-browser-validation-notes.json` — summarizes the mobile Codex/GPT-5.5 launch, run id, observed config, and classification.
- `round10-codex-runtime-model-probe.log` — confirms live backend exposes `codex_app_server` / OpenAI / `gpt-5.5` with API key configured.
- `round10-codex-direct-websocket-probe.log` — reproduces backend rejection of a no-identity `SEND_MESSAGE` on the mobile-created run.
- `round10-codex-direct-websocket-with-identity.log` — proves the same run and runtime respond when `command identity` / `dedupe identity` are present.
- `round10-mobile-codex-gpt55-response-after-identity-probe.png` — shows the mobile Chat rendering the real Codex/GPT-5.5 response after the accepted identity-bearing probe.

## Latest Authoritative Result

- Result: **Superseded stale-base failure / branch refresh required before final validation**
- Notes: Do not count default-runtime Anthropic API-key errors as mobile problems. The prior command-identity finding was not mobile-only and latest `origin/personal` already contains the shared fix. Do not implement a mobile-only fix; merge latest `origin/personal` and revalidate real mobile single-agent execution.
