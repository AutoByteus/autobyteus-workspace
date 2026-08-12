# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/design-spec.md`
- Supplemental Task Artifacts: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/agent-team-addressing-handoff-contract.md`; `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/team-run-canonical-identity-refactor.md`; `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/nested-classroom-live-validation-contract.md`; `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/agent-team-collaboration-system-instruction.md` (SR-014 cumulative visibility only; unimplemented and outside this round)
- Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/solution-revision-record.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/design-review-report.md`
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/architecture-review-revision-record.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/implementation-handoff.md`
- Implementation Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/implementation-revision-record.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/code-review-report.md`
- Code Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/code-review-revision-record.md`
- Delivery Revision Record (lineage context only): `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/delivery-revision-record.md`
- Relevant Delivery Revision IDs: `DR-003`, `DR-004`; `DR-004` was resolved by `SR-012` / `ARCH-REV-007` / `IR-005` and is not a current API/E2E blocker.
- API/E2E Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-028` (`Fail`; API-F-019 capability is resolved, while a real Codex bound task-Team tool call exposes API-F-020).
- Current Investigation Round: `28` (CRR-061 capability-focused Local Fix, current repository/build revalidation, and checked safe-target real provider execution).
- Trigger: `CRR-061` reclassifies API-F-019 provider call omission as nonblocking model behavior and requires a deterministic actual-bound capability probe plus completion of current safe provider/browser coverage; CRR-060 remains the source Pass.
- Prior Investigation Reviewed: round 4 / `API-REV-004`, which proves `SR-006` only. It is historical context, not SR-012 evidence.
- Latest Authoritative Investigation: this file. API-REV-028 is the latest completed Fail result; API-REV-027 and earlier rounds are historical evidence only.
- User execution clarification (2026-08-09): real provider testing is mandatory. Use the repository `pnpm secrets:import` flow to import `/Users/normy/.autobyteus/server-data/.env` into an absolute disposable test environment before the live matrix; never print secret values or mutate the user's operational environment.
- User real-browser clarification (2026-08-09): do not limit validation to repository/API probes. Through the real frontend, create standalone Agents and AgentTeams, launch and interact with them, and verify the Agent/Team hierarchy, runtime selection, execution, messaging/task/history-visible behavior, and absence of material browser errors for AutoByteus, Codex App Server, and Claude Agent SDK. This is additive to the imported nested-classroom three-runtime contract, not a replacement for it.

## API-REV-022 CRR-047 Post-Fix Coverage Investigation

This section is recorded before any API-REV-022 durable coverage edit/removal, final execution, live environment setup, or failure reroute. API-REV-021 remains a completed `Fail / 64%`; this new round resumes its preserved plan without rewriting history.

### Rework and retained-state boundary

- Current HEAD: `d21fdeb2717e932d1af591a9396862016117a744`; IR-026 source commit `0dff80aa2ba22542f04c179d97ba4329a27ab0d2`.
- `CRR-047`: source Pass `9.6/10`; `CR-F-025` / `API-F-014` resolved in source through strict serialized execution-address decoding/canonical verification, current-root/exact-node/run binding, and fail-closed omission. No route/path/name fallback exists.
- Retained API-REV-021 proof: IR-025 task visibility `33/33`, server task delegation `17/17`, and exact retained dirty selection `160/160`; preserved incomplete durable delta `1 added / 30 updated / 0 removed`. The package is unreviewed and must become fully current/green before proportional review.
- Protected state remains: user-held `127.0.0.1:60004` PID `71461` and `127.0.0.1:31004` PID `73207`; operational database `/Users/normy/.autobyteus/server-data/db/production.db`; delivery stash/backup/artifacts. None may be touched.

### Coverage validity and execution decisions

| Surface | Decision | API-REV-022 action |
| --- | --- | --- |
| `API-F-014` exact sender presentation | `Mandatory First Rerun` | Rerun the unchanged API/E2E-owned current AgentTeamEventMonitor selection; require persistent names and omit invalid execution keys. Reviewer probe is source evidence only. |
| Preserved `1 added / 30 updated` durable delta | `Preserve / Revalidate` | Rerun exact current package after IR-026; finish every remaining stale fixture. Publish exact final inventory and patch. |
| Remaining latest-base 75-file discovery | `Mixed / Complete Adjudication` | Convert only proven pre-canonical/missing-root fixtures; remove/replace only with explicit investigation rationale. Any valid current behavior failure reroutes. |
| Server/provider/migration/build boundaries | `Fresh Recheck Required` | Run affected server/rooted task/provider/migration selection, production TypeScript, `build:full`, and Nuxt production build. |
| AutoByteus/Codex/Claude browser/provider matrix | `Mandatory Fresh Safe Execution` | Use the checked disposable target launcher, configuration-only exact target preflight, exact runtime `.env`, real TTY `pnpm secrets:import` from `/Users/normy/.autobyteus/server-data/.env`, post-listen PID/lsof exact-path guard, isolated frontend/browser, and fresh provider rows. |
| User-requested real Agent/Team UI behavior | `Mandatory` | Create and exercise standalone Agents and test-owned/imported nested AgentTeams for all runtimes; verify hierarchy, task details/count, task Agent/task-Team rows, selection, task lifecycle, refresh/restore/cleanup, messages, history/navigation, and browser errors. |
| Operational DB/user-stack safety | `Fail-Closed Gate` | Exclude ambient database selectors, never inspect/target operational DB, and verify protected listeners before/after. Any mismatch is immediate Fail. |

### Order and pass gate

1. Rerun API-F-014 and stop/reroute on any valid failure.
2. Complete current durable fixture adjudication in bounded selections and run the entire 75-file/broader web scope without orphaned processes.
3. Run affected server/migration/provider checks and both production builds.
4. Materialize a new disposable runtime, import real secrets only into its exact vault/database, launch via checked wrappers, and verify the open database path.
5. Execute fresh browser/provider rows for AutoByteus, Codex, and Claude, including standalone Agent and nested Team/task journeys.
6. Clean only owned resources, publish evidence/inventory/reports, and return all durable deltas for proportional review.

Initial confidence: `70%`. Source correction and retained direct evidence are strong, but the cumulative durable package is incomplete/unreviewed and fresh builds plus all three safe real browser/provider rows remain outstanding. Pass requires overall confidence >=95%, every category >=90%, every critical scenario direct, exact safe-target proof, all providers, and zero protected-state contact.

## API-REV-021 CRR-045 Post-Fix Coverage Investigation

This section is recorded before any API-REV-021 durable coverage edit/removal, final execution, live environment setup, or failure reroute. It resumes the incomplete API-REV-020 plan without rewriting that completed Fail result.

### Rework and retained-state boundary

- Current HEAD: `462db859d863670b37e78971ac8938e05b7b5a53`; IR-025 source commit `51db105d95a4425665c81c3c22ad541ae1ceda2c`.
- `CRR-045`: source Pass `9.5/10`; `CR-F-024` / `API-F-013` resolved in source. The exact `/Teacher` delegator address now crosses the authoritative task record/event/projection spine. Live task visibility validates exact sender/target/root/scope/run identity, and persisted coordinator-ingress hydration pairs by exact task ID, target kind, and task run address.
- API-REV-020 retained result: `Fail / 61%`. Its checked recent-`RUNNING` migration lifecycle and server build passed; its incomplete API/E2E-owned durable delta is `1 added / 24 updated / 0 removed`; fresh three-runtime rows were not tested.
- No retained API/E2E dirty path is assumed green or reviewed. IR-025's implementation-owned focused tests are source-review evidence only.
- Protected state remains: user-held `127.0.0.1:60004` PID `71461` and `127.0.0.1:31004` PID `73207`; operational database `/Users/normy/.autobyteus/server-data/db/production.db`; delivery stash/backup/artifacts. None may be touched.

### Coverage validity decisions before resumed execution

| Surface | Decision | Basis | API-REV-021 action |
| --- | --- | --- | --- |
| API-F-013 exact delegator-focus component and entry-owner coverage | `Still Valid / Mandatory First Rerun` | API-REV-020's exact converted overview failed on a reachable user flow. IR-025 adds exact sender flow and coordinator-ingress continuity. | Rerun the unchanged API/E2E overview and task-entry tests together with implementation-owned source tests. Require count/details/auto-open before refresh, no disappearance/duplication after exact record hydration, invalid identity rejection, and no persistent substitution. |
| API-REV-020 `1 added / 24 updated` dirty coverage | `Unreviewed / Preserve / Revalidate` | The delta converted old/missing-root fixtures but halted before complete broader adjudication. | Run one exact complete dirty-path selection, correct only proven stale fixtures, publish a new exact inventory/patch, and do not treat excluded or non-green files as maintained. |
| Latest-base 75-file web discovery selection | `Mixed / Needs Current Validity Completion` | Prior run had 23 failed files, primarily deleted owner and pre-canonical/missing-root fixtures. A failure becomes product evidence only after its expectation is confirmed against current requirements. | Rerun after the retained delta and IR-025; update/replace/remove remaining stale fixtures without runtime compatibility. Any new current behavior failure reroutes immediately. |
| Checked recent-`RUNNING` readable migration lifecycle | `Still Valid / Prior Round Direct Proof` | API-REV-020 directly passed after CRR-042 and IR-025 does not touch startup/migration. | Integrity-check retained evidence and rerun only if relevant source/build state or launcher changes; current server build/typecheck still required. |
| Integrated server/rooted task/provider boundaries | `Fresh Recheck Required` | IR-025 changes server task lifecycle event payload plus frontend admission/projection. | Run focused server task event/service, rooted task routing/lifecycle/provider parity, production build TypeScript, full build/bootstrap, and current migration selection. |
| Real browser/provider standalone and nested-classroom journeys | `Mandatory Fresh Execution` | IR-025 component proof cannot establish WebSocket timing, record refresh continuity, browser rendering, hierarchy/navigation, or provider parity. | Use a newly materialized disposable runtime/database/vault with `test-runtime-bootstrap.mjs`; configuration-only exact target preflight; real TTY `pnpm secrets:import` from `/Users/normy/.autobyteus/server-data/.env`; PID lsof exact-path guard; fresh AutoByteus, Codex, Claude rows. |
| Operational DB and user-stack safety | `Mandatory Fail-Closed Gate` | API-REV-014/API-REV-018 incidents remain active. | Exclude ambient `DATABASE_URL` and `DATABASE_URL_TEST`; require exact disposable absolute SQLite target before any database-capable child; never inspect or target the operational DB; verify user listeners/PIDs before/after. Any mismatch is immediate Fail. |

### Execution order and pass gate

1. Rerun API-F-013 focused current-contract coverage and stop/reroute if it is not clean.
2. Execute every retained dirty path, finish stale fixture adjudication, and run the proportionate 75-file/broader current web selection.
3. Run affected server task/provider/migration selections, production build TypeScript, `build:full`, and Nuxt production build.
4. Create a fresh owned test runtime with configuration-only target proof, Prisma preparation, real secret-vault import, checked server/frontend launch, lsof target verification, and isolated browser context.
5. Through the real frontend/public API, create and test standalone Agents and imported/test-owned AgentTeams for AutoByteus `gpt-5.6-luna`, Codex App Server `gpt-5.6-luna` medium, and authenticated Claude. Require exact delegator focus, `0 -> 1 task`, visible details/task Agent/task Team rows, exact selection, pre/post record-refresh continuity, active/awaiting-review/accepted, submit/review, refresh/restore, terminal cleanup, history/navigation/mobile-equivalent behavior, and no material browser errors.
6. Clean only owned resources, publish exact evidence/inventory, reassess confidence, and return every durable delta through proportional review.

Initial confidence: `64%`. Source review directly resolves the known cause and prior safe-process proof is strong, but the retained dirty suite is not yet green/reviewed and no fresh real provider/browser row exists. Pass requires all critical scenarios direct, overall confidence >=95%, every applicable category >=90%, exact safe-target proof, all three providers, and no operational/user-stack contact.

### Final API-REV-021 investigation update

API-REV-021 is complete as `Fail / 64%` and routes `API-F-014` for focused failure-origin review.

- The first mandatory IR-025 recheck passes: exact delegated-task visibility coverage is green (`7 files / 33 tests`), and the maintained server delegation service passes (`1 file / 17 tests`) on explicit test-owned SQLite.
- The exact retained API/E2E dirty selection passes `24 files / 160 tests`. A first attempt used the unavailable macOS `mapfile` command and accidentally launched an unfiltered suite; it is explicitly non-authoritative, was terminated, and touched no server, database, vault, or user-held stack.
- Six additional stale frontend fixtures were converted to the exact current rooted/execution-address contracts. Five files pass (`38 tests` across the six-file selection); one valid current-contract assertion fails.
- `API-F-014`: `getInterAgentSenderNameById` treats each serialized `agentExecutionsByKey` key as a logical member address. The rooted node lookup therefore misses and the fallback displays JSON suffixes such as `Professor\",\"taskAgentRunId\":null}` instead of `Professor`. This violates the R-039/UC-021/AC-036 current projection/presentation boundary.
- Failure evidence: `api-e2e-evidence-sr015/api-rev-021/api-f014-inter-agent-sender-label-failure-analysis.md`; raw test evidence: `repository/web-broad-failures-batch1-after.log`; source/contract audit: `repository/api-f014-failure-origin-audit.log`.
- The preserved incomplete durable delta is now `1 added / 30 updated / 0 removed`. It is not submitted for proportional successful-test review because the overall round failed; exact inventory and patch are in `api-rev-021/investigation/`.
- Execution stopped before remaining stale-fixture maintenance, final builds, safe vault import, and real AutoByteus/Codex/Claude browser/provider rows. Provider execution cannot close a known deterministic user-visible identity failure.
- No API-REV-021 server, frontend, database, vault, secret import, provider call, or browser context was created. The user-held `60004/31004` stack is intact. The operational database was neither targeted nor inspected, and both incident disclosures remain preserved.

Final confidence scorecard: requirement proof `60%`; direct changed-boundary execution `75%`; cross-boundary realism `50%`; environment/configuration/identity fidelity `90%`; failure/lifecycle evidence `72%`; user-surface/browser confidence `30%`; durable coverage quality `70%`. Arithmetic mean `63.9%`, reported as `64%`. Broader validation remains `Required`, halted on the current deterministic failure.

## API-REV-020 CRR-042 Fresh Post-Integration Coverage Investigation

This section is recorded before any API-REV-020 durable coverage edit, removal, final execution, or failure reroute.

### Integrated change and mandatory revalidation boundary

- Current HEAD: `619a442eebe7c6a1fce8d38d03ed2e7a7c71ed07`; IR-023 source commit `812fbb05d62ad383af2e7695d4646fa8a73d22ce`; latest-base merge `af9286bc47c1a06946d3773b9bfc8a339f075e2f`.
- `CRR-042`: source Pass, `9.4/10`; `CR-F-023` is resolved in source. One `runPending()` remains, canonical migration requires exact `SUCCEEDED`, readable migration accepts only `SUCCEEDED|SUCCEEDED_WITH_WARNINGS`, readable/runner failures exit `1` before bootstrap/listen, and no fallback or compatibility branch exists.
- `API-REV-019 / CRR-040`: successful pre-refresh environment and durable-test proof. It cannot substitute for post-merge execution, but its fail-closed launcher method and both operational incident disclosures remain mandatory safety inputs.
- User-held stack: `127.0.0.1:60004` PID `71461` and `127.0.0.1:31004` PID `73207`. It is user-owned and must not be stopped, restarted, repointed, or used as the authoritative fresh environment.

### Initial coverage inventory and validity decisions

| Coverage / surface | Initial validity decision | Evidence / stale assertion | API-REV-020 action |
| --- | --- | --- | --- |
| `tests/e2e/secret-management/custom-provider-readable-id-startup-migration.e2e.test.ts` | `Still Valid / Required Fresh Execution` | Retained E2E is byte-unchanged by IR-023 and owns the real recent-`RUNNING` process exit, exact marker, no-listen, and later ordinary stale retry convergence. It was not run by implementation or reviewer. | Execute through the checked disposable-target launcher with ambient DB selectors excluded, exact runtime `.env` preflight, and PID/port/target guards. A skip is not a pass. |
| `tests/unit/server-runtime-app-data-migration-gate.test.ts` | `Still Valid / Recheck` | Current 8-case unit directly proves canonical/readable status policy and no-effect process completion. | Re-run with production typecheck/build; use as deterministic support, not a substitute for the real process E2E. |
| Current focused Team/task web selection | `Mixed` | `teamTaskExecutionEventRouter`, `TeamStreamingService.execution-address`, and `localUserSubmission` pass. `teamTaskTeamExecutionProjection` imports deleted `workspaceTeamExecutionDisplayRows`; `teamStreamMemberContextResolver` constructs a context without current `rootTeam`. | Update only stale durable fixtures/imports to the current `runHistoryTeamExecutionRows` and rooted `AgentTeamContext` contract; retain strict identity and no fallback. |
| Latest-base history/navigation selection | `Needs Update` for four files; `Still Valid` for message projector | `useWorkspaceHistorySelectionActions` omits `focusedExecutionAddress/rootTeam`; `useWorkspaceHistoryTreeState` mocks a removed route-key lookup instead of current execution-address ancestry; `runHistoryNavigationProjection` omits current root coordinator/topology; `WorkspaceHistoryWorkspaceSection` uses pre-root tree shapes. | Rebuild fixtures from current rooted metadata/context/address owners and assert exact execution-address selection/ancestry, transient rows, status/activity patching, cleanup, and keyboard/click behavior. Do not restore deleted production owners or route-key fallback. |
| Broader task UI/history/navigation/mobile coverage | `Investigate Before Maintenance` | Latest-base merge changed the navigation/read-model owners. Additional specs still construct `memberRouteKey/memberPath` or missing-root fixtures; some occurrences are valid transport/display contracts outside SR-015, others are stale AgentTeam execution identities. | Discover by import/type/selection evidence, classify each occurrence against its current owner, and run proportionate expanded selections. Update/remove only proven stale durable coverage. |
| Integrated server/provider/rooted Team/task execution | `Fresh Recheck Required` | IR-022/023 local evidence is implementation-scoped. Pre-refresh API-REV-019 real rows are historical. | Run current server selections, migration/provider boundaries, task lifecycle/routing/streaming, and build/typecheck. |
| Real browser/provider journeys | `Fresh Recheck Required` | Latest-base integration changed task UI/history/navigation/mobile owners. Historical screenshots cannot prove the integrated bundle. | Use an independently disposable database, vault, app-data root, server/frontend ports, and browser context. Import `/Users/normy/.autobyteus/server-data/.env` using the exact target. Execute fresh AutoByteus, Codex, and Claude standalone Agent plus nested-classroom/test-owned task Team journeys, including task count/details, task Agent/task Team hierarchy, exact selection, lifecycle, refresh/restore, terminal cleanup, history/navigation, and browser errors. |
| Operational database safety | `Mandatory Fail-Closed Gate` | API-REV-014 mutated the operational DB; API-REV-018 inherited it on a raw start. No automatic rollback or repair is authorized. | Use only `test-runtime-bootstrap.mjs` or equally checked wrappers. Prove sanitized child env, exact materialized target, configuration-only resolution before DB init, post-listen lsof exact path, cleanup, and unchanged user-held stack. Never inspect or target the operational DB. |

### Planned order and pass gate

1. Finish discovery against current types/owners and publish an exact existing-coverage disposition before edits.
2. Apply bounded durable test-only maintenance where current approved behavior is clear; any ambiguity routes upstream rather than introducing compatibility.
3. Run narrow corrected web selections, expanded task/history/navigation/mobile selections, current server startup/migration/task/provider selections, production typecheck, and isolated production builds.
4. Prepare a fresh disposable DB/vault through configuration-only target proof, Prisma, and real TTY `pnpm secrets:import`; execute the retained recent-`RUNNING` lifecycle and retry convergence.
5. Run fresh integrated browser/provider journeys on all three runtimes, correlate DOM/API/log evidence, and clean only owned resources.
6. Reassess confidence, complete API-REV-020 artifacts, and route every repository-resident durable delta through proportional code review before delivery.

Initial confidence: `38%`. Source review and pre-refresh evidence are strong, but the real post-integration startup lifecycle, current broader web coverage, and fresh integrated three-runtime browser rows are all outstanding. API-REV-020 cannot pass unless every critical row is direct, overall confidence is at least `95%`, no applicable category is below `90%`, the operational target is never referenced, and the user-held stack remains untouched.

### Final API-REV-020 investigation update — halted on `API-F-013`

- **Safe startup lifecycle passed:** the retained real recent-`RUNNING` readable-provider migration E2E passed through the checked disposable-target launcher (`1/1`). It proved exit `1`, the exact marker, no listen, and ordinary stale retry convergence. `build:full` including sanitized bootstrap also passed.
- **Current fixture maintenance:** API-REV-020 added one reusable rooted Team fixture and updated 24 web tests away from deleted owners, missing-root contexts, and pre-canonical execution identities. The initial maintained selection passed `25 files / 162 tests`; three additional current component files passed `18/18`. The complete current delta is preserved, not presented as a successful package.
- **Broader discovery:** the fresh 75-file web selection executed `464` tests and exposed many latest-base stale fixtures. Those remain coverage-maintenance work, not accepted product failures.
- **Critical current-contract failure:** after converting `TeamOverviewPanel.spec.ts` without weakening its longstanding task visibility assertions, the current exact rooted scenario fails `4/8`: a distinct live task-Agent projection under a stable focused Agent produces `Tasks0 tasks`, does not auto-open, and does not reopen for a new task. `TeamWorkspaceView.spec.ts` passes `12/12` in the same command.
- **Preliminary cause:** `TeamOverviewPanel.vue` always passes the stable `focusedExecutionAddress` into `deriveDelegatedTaskEntries`. Unpaired live task nodes are then retained only when their complete execution address equals the focus. A valid task Agent has a non-null `taskAgentRunId`, so it cannot equal the persistent Agent focus and is filtered out before the count/signature is computed. There is no production-file API/E2E diff.
- **Requirement effect:** this contradicts `R-039`, `UC-021`, and `AC-036` task observation/selection behavior and reproduces the `0 tasks` portion of the user's retained real screenshot. Strict current task identity must remain; a correction must not merge or substitute the persistent node.
- **Routing decision:** API-REV-020 is `Fail`, preliminary `Local Fix` owned by frontend implementation, pending `code_reviewer` failure-origin confirmation. Durable maintenance and broader execution stop here. Fresh AutoByteus/Codex/Claude browser/provider rows are `Not Tested`, because a critical deterministic current-contract failure already blocks Pass.
- **Safety:** the user-held `60004/31004` processes remain on PIDs `71461/73207`. API-REV-020 did not start a live environment, target or inspect the operational database, import secrets, or mutate user-owned state. API-REV-014 and API-REV-018 incident disclosures remain active.

Final confidence scorecard: requirement proof `55%`; changed-boundary directness `70%`; cross-boundary realism `45%`; environment/configuration/identity fidelity `90%`; failure/lifecycle/recovery `70%`; user-surface/browser confidence `30%`; durable coverage quality `65%`. Arithmetic mean `60.7%`, reported as `61%`. Critical task visibility fails and three-runtime browser evidence is unexecuted, so the result cannot pass regardless of arithmetic.

Authoritative failure analysis: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/api-e2e-evidence-sr015/api-rev-020/team-overview-task-visibility-failure-analysis.md`.

## API-REV-019 CRR-039 Fail-Closed Environment Correction Investigation

This section is recorded before any API-REV-019 support-code edit, final execution, or result reroute. API-REV-019 will not change product source or the six pending durable frontend paths unless the environment correction exposes a distinct validity issue.

### Prior result and exact correction boundary

- `API-REV-018`: overall `Fail / 91%`; product/runtime `Pass`; environment safety `Fail`.
- `CRR-039`: `Fail — Local Fix`; owner `api_e2e_engineer`; finding `CR-F-022` / `API-ENV-F-018-001`.
- Failure origin: direct `node dist/app.js` inherited ambient `DATABASE_URL`. `--data-dir` does not override explicit process environment configuration. The checked-in safe owner already exists in `test-support/live-e2e/test-runtime-bootstrap.mjs`.
- Product state: unchanged at HEAD `33b9b1e28e1c7f666dffdbcd349d394b2bfef875`. CRR-039 explicitly retains API-REV-018's six clean real browser/provider rows and resolution of `API-F-011` / `API-F-012` if relevant state remains unchanged.

### Coverage and execution decisions

| Surface | API-REV-019 validity decision | Required action |
| --- | --- | --- |
| `startBuiltTestServer` and `createSanitizedTestEnvironment` | `Still Valid / Required Owner` | Use the checked-in wrapper, never a raw server launch. Exercise it against a fresh owned runtime root/database. |
| Pre-spawn environment | `Add Executable Evidence` | With ambient database variables present or possible, prove the actual child environment contains neither `DATABASE_URL` nor `DATABASE_URL_TEST`. Record presence booleans only, never inherited values. |
| Materialized runtime `.env` | `Add Executable Evidence` | Parse the fixed assignment and require one exact absolute disposable SQLite URL. Fail before spawn on mismatch, duplicate, missing, non-file, or unsafe path. |
| Configuration-only target resolution | `Add Executable Evidence` | In a sanitized child that imports only built `AppConfig`, initialize against the owned runtime root, assert the exact operational database URL, and prove the database file remains absent before/after. No Prisma/client/server initialization is allowed in this preflight. |
| Schema and secret preparation | `Fresh Safe Execution` | After the preflight, run Prisma migration and actual `pnpm secrets:import` only with the exact disposable target and sanitized environment. Do not capture secret values. |
| Post-listen target | `Fresh Safe Execution` | Start through `startBuiltTestServer`; after listen and before GraphQL mutation, require PID `lsof` to contain the exact owned database and contain no operational path. Then run a public GraphQL health query and stop cleanly. |
| API-REV-018 product/browser evidence | `Retain / Reissue` | Verify production/test source hashes and HEAD are unchanged. Retain the six fresh AutoByteus/Codex/Claude browser rows rather than spending provider calls to repeat an unchanged product boundary. |
| Six pending durable frontend paths | `Still Valid / Recheck` | Rerun the exact focused/affected web selections. No new durable support delta is planned. Return the cumulative six-path package for proportional review only after overall Pass. |
| Operational database incidents | `Preserve / No Action` | Keep API-REV-014 and API-REV-018 disclosures. Do not inspect, copy, repair, roll back, delete, or otherwise act on the operational database. |

### Pass gate and planned confidence

API-REV-019 may pass only if every pre-spawn assertion passes before any database-capable child, the fresh imported secret target is exact, post-listen `lsof` confirms only the owned database, the safe server health check and cleanup pass, current product/durable hashes remain unchanged, and the focused/affected durable selections remain green. Any operational target reference is an immediate Fail and stop. The user-held `60004/31004` stack must remain untouched.

Initial confidence: `74%`. Product confidence remains high from API-REV-018, but environment confidence remains below the pass floor until the new preflight and fresh safe server setup complete.

### Final API-REV-019 investigation update

The CRR-039 correction plan is complete and passes without a product-source or new durable-coverage change.

- **Pre-spawn target proof:** while the parent shell still had an ambient `DATABASE_URL`, `createSanitizedTestEnvironment()` produced the actual child-environment shape with neither `DATABASE_URL` nor `DATABASE_URL_TEST`. `materializeTestRuntime()` wrote exactly one absolute disposable URL for `sr015-api-rev-019-20260810-1.db`. A separate sanitized, configuration-only built `AppConfig` child resolved the same absolute file path while that database was absent before and after, proving target selection without Prisma or database initialization. The first temporary assertion compared equivalent `file:///...` and normalized `file:/...` spellings lexically; it failed closed before database creation and was corrected to compare resolved file paths. Both attempts are retained.
- **Fresh database and vault:** Prisma schema migration and the real TTY `pnpm secrets:import` used only the exact disposable database. The importer configured nine identifiers from `/Users/normy/.autobyteus/server-data/.env` without logging values. A read-only dry-run after import reported `READY`, nine `SKIP_CONFIGURED`, and zero blocked/replaced entries.
- **Safe server start and secondary target guard:** the built server was started only through `test-support/live-e2e/test-runtime-bootstrap.mjs` `startBuiltTestServer` on `127.0.0.1:60019`. After listen, PID `46829` had the exact disposable database open and no `/Users/normy/.autobyteus/server-data/db/production.db` reference. Public GraphQL returned all three runtimes enabled. The owned server stopped cleanly and port `60019` closed.
- **Retained product proof:** HEAD remains `33b9b1e28e1c7f666dffdbcd349d394b2bfef875`; relevant production source has no worktree delta; all six pending durable path hashes match the API-REV-018 baseline; and all `110` API-REV-018 evidence-manifest entries verify. CRR-039 permits retaining the unchanged six real browser/provider rows, so no provider calls were repeated merely to correct the launcher environment.
- **Fresh repository recheck:** exact task DTO/tree/component coverage passes `5 files / 26 tests`; affected web coverage passes `7 / 60`; launcher/cadence coverage passes `2 / 43`. The real import commands rebuilt the production server and repeated the sanitized bootstrap smoke successfully. One initially malformed web command inserted an extra `--` and entered the known non-clean whole-web suite; it is explicitly non-authoritative, and the exact intended selections were immediately rerun cleanly.
- **Cleanup:** the checked `removeOwnedTestRuntime` boundary removed only API-REV-019's disposable runtime root, database, adjacent vault key, and journal files. Owned ports `60019/31019` are closed. The user-held `60004/31004` stack remains on PIDs `71461/73207` and was not stopped, restarted, repointed, or mutated.
- **Operational incident preservation:** API-REV-014's production-database mutation and API-REV-018's inherited-target incident remain disclosed. API-REV-019 did not inspect, repair, copy, delete, roll back, or otherwise act on the operational database.
- **Durable coverage disposition:** API-REV-019 adds, updates, and removes no new repository-resident durable coverage. The unchanged cumulative pending package remains the `3 added / 3 updated / 0 removed` web paths created in API-REV-018; the new 61-row inventory and exact six-file patch return through proportional review now that the overall API/E2E result passes.

Final confidence scorecard: requirement proof `98%`; direct changed-boundary execution `98%`; cross-boundary realism `97%`; environment/configuration/identity/fixture fidelity `98%`; failure/lifecycle/recovery `96%`; user-surface/browser confidence `98%`; durable coverage quality `96%`. Arithmetic mean `97.3%`, reported as `97%`. No category is below `90%`; every critical acceptance criterion is directly proven. Broader validation decision: `Required and completed` through the fresh fail-closed environment startup, while the unchanged product/browser/provider result is retained with hash verification.

## API-REV-018 IR-021 Post-Fix Visible Delegated-Task Coverage Investigation

This section was written before any API-REV-018 repository-resident durable coverage edit, removal, final execution, or failure reroute. The user-held stack on `127.0.0.1:60004` / `127.0.0.1:31004` remains user-owned and must not be stopped, repointed, or used as the authoritative clean post-fix environment. A separate isolated database, application-data root, vault, server port, frontend port, and browser context are required.

### Upstream and prior-failure recheck

- `CRR-038` is an implementation-source Pass, not downstream proof. It reports exact DTO projection of Apollo metadata, strict surplus-field rejection, one recursive task-execution tree, distinct task Agent/task AgentTeam nodes, exact focus, persisted non-terminal restore, and terminal subtree cleanup.
- `API-REV-017` is the required first recheck: the same captured Apollo task records must no longer normalize to zero; the real Team panel must show task count/content/status; and the hierarchy must show task execution rows distinct from persistent members.
- `API-REV-016` backend/provider task lifecycle and CRR-036 durable review remain valid historical evidence, but neither substitutes for new user-surface execution after IR-021.

### Current coverage inventory and validity decisions

| Coverage / required surface | Initial validity decision | Current evidence / gap | API-REV-018 action |
| --- | --- | --- | --- |
| `taskDelegationGraphqlDtoProjection.ts` through `taskDelegationHydrationService.ts` | `Add Durable Coverage` | IR-021 and CRR-038 used temporary probes. No repository test imports the new DTO projector. Existing Team task fixtures call the Pinia store directly with plain manually shaped objects, so they still bypass Apollo `__typename`. | Add one current-contract durable test using the captured real three-record Apollo shape. Prove projection of record/taskRun/update addresses, successful store hydration, expected-only `__typename` removal, and rejection of `memberPath` or unknown surplus metadata. |
| `teamTaskExecutionTree.ts`, event router, task-Agent/task-Team projectors | `Add / Replace Durable Coverage` | Current production source is new, but the existing `teamTaskTeamExecutionProjection.spec.ts` and `teamTaskExecutionEventRouter.spec.ts` still build removed `memberPath`, `memberRouteKey`, and old snake-case task payloads. They are stale and cannot be accepted as IR-021 authority. | Add current exact-address tree coverage for a direct task Agent, an outer task Team, a two-level nested task Team chain, full child execution addresses/contexts, persistent-tree immutability, exact focus, event detail/status/timeline, and terminal subtree cleanup. Reclassify obsolete specs explicitly before changing/removing them. |
| Persisted refresh/restore | `Add Durable Coverage` | `teamTaskExecutionRestore.ts` is new and has no direct current test. | Prove non-terminal active/awaiting-review records restore exact projections after hydration/refresh, accepted records do not restore, nested chains restore parent-before-child, and duplicate restore is idempotent. |
| Team task panel and workspace transient rows | `Needs Current Integration Coverage` | Existing component specs contain useful UI assertions but are manually seeded with removed route/path fields. They missed API-F-011/API-F-012. | Add or update a boundary-level current component/store integration test that starts from Apollo DTOs/current `AgentTeamContext`, asserts human count, details, task Agent and nested task-Team rows, exact selection/focus/open/history identity, status transitions, refresh/restore, and cleanup without persistent-node mutation. |
| Real browser AutoByteus / Codex / Claude rows | `Add Fresh Real Validation` | Pre-fix rows settle tasks but do not prove IR-021 rendering. Reviewer explicitly requires all three current real browser rows. | Use a fresh disposable isolated environment and actual `pnpm secrets:import` from `/Users/normy/.autobyteus/server-data/.env`. For each runtime, create a fresh imported nested-classroom Team, prove active and awaiting-review/accepted task count/details, visible nested task-Team row/children and exact selection, refresh/restore behavior where feasible, terminal cleanup, final lifecycle, and provider result. Include at least one visible direct task-Agent journey in the matrix (AutoByteus minimum) with exact task Agent execution selection. |
| Backend/runtime regression selection | `Still Valid / Proportionate Recheck` | IR-021 changes web production only, but real task events and persisted records originate at server boundaries. | Re-run the directly affected server task delegation/streaming selections from API-REV-016, current web focused/affected suites, production server typecheck, Nuxt production build, and exact current source audits. Do not mechanically rerun unrelated historical whole-suite failures as acceptance authority. |
| Strict current identity / no fallback | `Mandatory audit` | The fix must strip only expected GraphQL metadata; no route/path fallback or persistent-node substitution is allowed. | Audit production/tests for new legacy fields, verify surplus-field rejection, compare persistent tree before/after task projection/cleanup, and require exact four-field serialized execution addresses in DOM selection and command/focus behavior. |
| Operational database safety | `Mandatory` | The historical API-REV-014 mutation remains disclosed. The current user-held manual stack is isolated but shared. | Use an independently disposable DB/root/vault and fail closed on exact target mismatch. Never target, open, modify, copy, or roll back `/Users/normy/.autobyteus/server-data/db/production.db`. Preserve the historical disclosure. |

### Initial confidence and broader-validation gate

| Confidence category | Initial score | Reason |
| --- | ---: | --- |
| Requirement and acceptance-criteria proof | 30% | Both critical user-visible scenarios failed in API-REV-017; source review alone does not close them. |
| Changed-boundary execution directness | 45% | Reviewer temporary probes exercise source, but no API/E2E-owned current durable or browser execution exists post-fix. |
| Cross-boundary integration realism and mock gap | 25% | The original defect existed specifically across GraphQL/Apollo/Pinia/streaming/DOM seams omitted by mocks. |
| Environment, configuration, identity, and fixture fidelity | 50% | A valid isolated recipe exists, but the post-fix environment has not yet been created. |
| Failure, edge-case, lifecycle, and recovery evidence | 30% | Active/awaiting/accepted, refresh/restore, nested chains, and terminal cleanup are pending. |
| User-surface, browser, and desktop-shell confidence | 20% | The latest completed real-browser result is Fail. |
| Durable regression coverage quality and relevance | 20% | Current repository tests do not yet own the two fixed seams. |

- Initial overall confidence: `31%` rounded simple average.
- Broader validation decision: `Required`.
- Selected execution mode: current durable web boundary tests, directly affected server regression, independent isolated built server + Nuxt frontend, and real Chrome/provider journeys for AutoByteus, Codex, and Claude.
- Pass gate: API-F-011 and API-F-012 must both be resolved in the real browser; every critical row must show truthful visible state and exact identity; all three provider rows must complete; no applicable confidence category may remain below 90%; every durable delta must return for proportional review.

### Final API-REV-018 investigation update

The coverage plan is complete. Product behavior passes, but the round is classified overall `Fail / 91%` because environment safety failed before the accepted isolated executions.

- Durable coverage decision: `3 added / 3 updated / 0 removed`. The Apollo DTO/hydration test uses the captured three-record response and proves expected-only `__typename` removal plus strict rejection of `memberPath`. Current event/tree/UI coverage proves distinct task Agent and nested task AgentTeam identities, exact selection, details/timeline, active/awaiting/accepted transitions, persisted restore, idempotence, terminal cleanup, and persistent-tree immutability. Exact current-round and cumulative paths are in `api-e2e-evidence-sr015/api-rev-018/cumulative-durable-coverage-inventory.tsv`.
- Repository execution: focused web `5 files / 26 tests`; affected web `7 / 60`; retained server `48 / 331`; cadence/harness `2 / 43`; production TypeScript, full server build/bootstrap, and Nuxt production build all pass.
- Real browser/provider execution: AutoByteus, Codex App Server, and Claude Agent SDK each pass a fresh test-owned nested task-Team/task-Agent journey with visible count, details, exact task Agent selection, exact task-Team selection, refresh/restore, accepted transitions, and terminal cleanup. Each runtime also passes a fresh staged nested-classroom task-Team UI row. All accepted row browser error counts are zero.
- `API-F-011` and `API-F-012`: resolved downstream. The former is covered through the real GraphQL/Apollo DTO seam; the latter is covered through WebSocket/projected tree/DOM/task detail selection and persisted restore.
- Fixture correction: the imported nested-classroom `student_one` does not expose `delegate_task`; the exploratory request for nested Agent delegation was invalid and is not counted. A test-owned Team with Supervisor -> WorkGroup -> Lead/Worker performs that missing nested-task UI scenario without changing source fixtures.
- Environment preparation: the real TTY `pnpm secrets:import` configured nine secret identifiers from `/Users/normy/.autobyteus/server-data/.env` in the exact disposable SQLite target without capturing values. The accepted server opened only `sr015-api-rev-018-20260810-1.db`.
- Critical environment-safety failure: the first attempted isolated start inherited an ambient `DATABASE_URL` and reached `/Users/normy/.autobyteus/server-data/db/production.db`. Prisma reported no pending schema migrations. The canonical app-data migration then recorded a failed attempt with 203 failed items and startup halted. No rollback, repair, deletion, or row inspection was attempted. This violates the mandatory no-target safety gate and blocks an overall Pass even though every accepted product row is isolated and passes.
- Cleanup: all owned TeamRuns are inactive; ports `60018/31018` are closed; user-held `60004/31004` remain open; the isolated failure root/database is preserved; source fixture hash remains exact and its Git status is clean.
- Final routing: `code_reviewer` for focused origin review of the environment-safety failure and proportional review of the six-file durable coverage delta. Delivery remains blocked.

Final evidence root: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/api-e2e-evidence-sr015/api-rev-018`.

## API-REV-017 Real-Browser Delegated-Task Visibility Investigation

This section was written before any API-REV-017 repository-resident durable coverage edit, removal, final execution, or failure reroute. No production or durable test file is changed in this round. The prior real-provider rows proved task execution and settlement through backend projections, but they did not semantically assert the visible delegated-task list or transient task execution rows. The user's screenshot makes that omission material rather than residual.

### Requirement and boundary map

| Required behavior / boundary | Initial validity decision | Current evidence and risk | API-REV-017 action |
| --- | --- | --- | --- |
| R-039 / UC-021 / AC-036: production frontend observes delegated tasks and concrete task Agent/AgentTeam executions using canonical execution state | `Fail / Reproduce` | User screenshot shows a successful `delegate_task`, active `task_0003`, persistent Team hierarchy only, and `Tasks 0 tasks`. This is a critical user-surface criterion; API-REV-016 browser screenshots did not assert it. | Reproduce through the running real Nuxt frontend with a fresh imported nested-classroom TeamRun, approve real tools, sample task header/entries/transient rows, and correlate with GraphQL/server state. |
| `getTaskDelegationRecords` -> Apollo -> `taskDelegationStore` -> Team panel | `Needs Boundary Probe` | Current store normalization strictly parses nested `TeamExecutionAddress` values. Existing component/unit fixtures use plain objects and may omit Apollo cache metadata. | Capture actual Apollo response counts and compare plain current records with the same records decorated as Apollo returns them. |
| Task delegation WebSocket event -> task execution projection -> workspace Team tree | `Needs Boundary Probe` | Current projection files contain task-context helpers, but repository coverage is stale at the old route/path shape or does not assert the current browser tree. | Inspect current projection ownership and correlate visible DOM with real events/context warnings. Do not assume a task runtime exists visibly merely because the server started it. |
| Backend task ledger/lifecycle and real provider execution | `Still Valid / Recheck Only` | API-REV-016 proved real task-team execution across providers, but backend success cannot substitute for the missing frontend criterion. | Query the user's exact root TeamRun and the fresh reproduction root to separate missing data from frontend projection loss. |
| Existing broad `TeamStreamingService.spec.ts`, projection fixtures, Team overview/task-entry tests | `Inadequate / Stale Boundary` | The older broad streaming suite is already classified non-authoritative; current task list fixtures are manually shaped and do not cross Apollo serialization; old task projection specs still construct removed path/route fields. | Do not count them as proof. A future implementation round must add current-contract coverage at the real normalization/projection boundary. |

### Planned execution and stop condition

1. Preserve the already running user-requested manual stack on `127.0.0.1:60004` / `127.0.0.1:31004`; it uses the isolated `manual-user-20260810-2` root/database populated by the real `pnpm secrets:import` flow. Do not stop it while the user is testing.
2. Query the user's exact root TeamRun through public GraphQL and verify whether task records and task-Team run identities exist.
3. Create one fresh nested-classroom TeamRun through the real frontend on AutoByteus `gpt-5.6-luna`, invoke and approve `delegate_task`, and sample the visible Tasks count, task summary rows, transient execution rows, Apollo result counts, browser warnings, and screenshot.
4. Use a temporary executable normalization probe only; delete it immediately and make no durable edit before failure-origin review.
5. If a real task record exists but the UI still shows zero / no execution row, record `Fail`, lower the user-surface and durable-coverage confidence categories below 50%, and reroute the cumulative package to `code_reviewer` for focused failure-origin review.

### Initial broader-validation decision

- Decision: `Required`.
- Residual risk: critical visible delegated-task behavior is directly contradicted by the user and was not asserted in the preceding browser matrix.
- Expected evidence gain: determine whether the defect is missing server lifecycle data, GraphQL/Apollo normalization loss, streaming projection loss, or only presentation state.
- Selected mode: real Chrome against the isolated running Nuxt/server stack plus public GraphQL correlation and one deleted-after-use normalization probe.
- Pass gate: impossible unless an active delegated task appears with its details and its task Agent/AgentTeam execution is visibly selectable. Backend success alone cannot satisfy this gate.

### Final API-REV-017 investigation update

The user report is reproduced and the pass gate fails.

- User root `nested_classroom_test_team_2e9666611150438f83f3a45fddf2e8b8`: public `getTaskDelegationRecords` returns three accepted records, `task_0001` through `task_0003`, each with its full description, exact rooted sender/receiver, distinct task-Team run chain, task-run start time, and two submission/review updates. The user's `0 tasks` display is therefore not caused by a missing backend ledger record.
- Fresh browser root: real Chrome launched a new imported nested-classroom Team on AutoByteus `gpt-5.6-luna`, sent a one-task prompt, approved the real tool, and observed a successful `delegate_task`. For every sample from second 1 through 17, the semantic header remained `Tasks 0 tasks`, task summary row count remained `0`, and transient execution row count remained `0`. Raw task-query result counts progressed `[0, 3, 1]`, proving the browser received records while rendering none. Console warnings included `No member context found for message, skipping` four times.
- Exact data-loss seam (`API-F-011`): `taskDelegationStore.normalizeTaskDelegationRecord` sends GraphQL response address objects to `parseTeamExecutionAddress`; that parser rejects any object whose key count is not exactly four. Apollo's real current response includes `__typename` on every nested address. A deleted-after-use Vitest probe passes two controls: the plain current record normalizes non-null, while the same record with Apollo `__typename` normalizes to null. The store then filters the null record, deterministically producing the visible `0 tasks` state.
- Missing execution projection (`API-F-012`): the workspace renders a transient row only for a node with `isTaskExecution`. Current task-Team event routing creates at most an AgentContext keyed by the task execution address and returns `handled`; `ensureTaskTeamExecutionProjection` returns the persistent structural Team node without cloning it or marking it as a task execution. Its projection-update/detail mutators have no production consumer outside their own definitions. The browser and user screenshots both show only persistent hierarchy, consistent with this current source path.
- Existing coverage gap: manually shaped task-list fixtures omit Apollo metadata, and old task projection specs still use removed `memberPath` / `memberRouteKey` / `task_team_run_id` payloads. They are not current browser-boundary proof and did not prevent either defect.
- Environment safety: the running manual server has the isolated `manual-user-20260810-2` application-data root and SQLite database open. Its open-file audit contains zero references to `/Users/normy/.autobyteus/server-data/db/production.db`. The historical API-REV-014 operational mutation remains disclosed and untouched.
- Durable coverage delta in API-REV-017: `0 added / 0 updated / 0 removed`. The temporary probe was deleted and cleanup verified.
- Final outcome: `Fail / 72%`. R-039 / UC-021 / AC-036 are critically failing. `API-F-011` and `API-F-012` require focused failure-origin review; preliminary ownership is bounded frontend implementation plus current-contract durable frontend coverage.

Final evidence root: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/api-e2e-evidence-sr015/api-rev-017`.

## API-REV-016 Fresh Integrated-State Coverage Investigation

This section was written before any API-REV-016 repository-resident durable coverage edit, removal, final execution, or failure reroute. Initial evidence: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/api-e2e-evidence-sr015/api-rev-016/initial-integrated-inventory.log` (SHA-256 `ecd860162a61d9e07a766ec475ad515f9ab4fa4426d725d91a18d45c706c27dc`).

| Existing coverage / required integrated surface | Initial validity decision | Current evidence and risk | API-REV-016 action |
| --- | --- | --- | --- |
| `tests/integration/agent-memory/cross-runtime-memory-persistence.integration.test.ts` | `Needs Update` | The suite is requirement-relevant, but one of sixteen cases constructs removed flat `TeamRunConfig`, `MixedTeamRunContext`, and member-context fields and bypasses the exact schema-v3 rooted fixture. IR-020 reports 15/16 with this sole stale setup failure. | Reproduce first, then retarget only the stale mixed-Claude member-memory case to current rooted `rootTeam`, exact `TeamExecutionAddress`, current AgentRun identity, and current member-context builder boundary while preserving the real memory-directory assertion. |
| API-REV-015 exact cumulative inventory (`53` retained durable paths plus recorded restored dispositions) | `Still Valid / Recheck` | CRR-033 accepted the corrected test code, but all execution predates latest-base integration and IR-020. Test existence and historical results are not current proof. | Re-resolve every retained path against current HEAD, execute all existing server/web test paths, validate the two live-E2E support files and their isolation guard, and publish a new exact cumulative inventory including any round-16 delta. |
| Team WebSocket send, tool approval, and interrupt command selection | `Add / Expand Durable Coverage` pending inventory | CRR-035 proves the production boundary with temporary probes, including persistent, direct task Agent, outer task Team, nested task Team, and invalid chains. Temporary probes do not provide durable regression authority for the public streaming seams. | Inspect current streaming-handler/backend tests. Maintain the smallest boundary-appropriate durable selection that proves the complete unchanged execution address for send/approval/interrupt, exact active-chain routing, leaf revalidation, rejection before effect, and zero persistent fallback. Do not duplicate lower-level proof already durable. |
| IR-018 same-task-Team peer message routing | `Still Valid / Recheck` | API-REV-014 and current source review prove exact peer routing, but pre-integration runtime evidence is historical. | Re-run durable manager/delivery coverage and require fresh real task-peer/submit/review success in every runtime row. |
| Latest-base streaming cadence/coalescing and live harness suites | `Still Valid / Recheck` | IR-020 reports 43/43 implementation-scoped passes; API/E2E must independently execute and preserve exact DB target mismatch rejection. | Run the two guarded suites, syntax/propagation audits, exact disposable database acceptance, distinct safe test-database mismatch rejection, and source-path integrity checks. |
| Migration, provider-instruction, frontend streaming/state, production typecheck/build/bootstrap | `Still Valid / Recheck` | Maintained paths were accepted before integration. The merge can change generated, schema, streaming, and lifecycle seams. | Execute the maintained focused selections, current migration boundary tests, affected web tests, production typecheck, full build/bootstrap, and proportionate broad suites. Classify unrelated whole-suite baseline failures honestly. |
| Imported nested-classroom AutoByteus/Codex/Claude matrix plus standalone Agent and AgentTeam frontend journeys | `Add Fresh Real Validation` | User requires real browser testing for every runtime. Pre-integration rows cannot substitute. | Create a new isolated application-data root, exact disposable SQLite database and vault; run `pnpm secrets:import` from `/Users/normy/.autobyteus/server-data/.env` without printing values; fail closed on target mismatch; use fresh server/frontend ports and fresh runs. Through the real frontend, prove standalone Agent creation/execution and imported nested-classroom persistent/task-Team send, approval, interrupt, peer, submit/review, history/state, termination/restore for AutoByteus `gpt-5.6-luna`, Codex App Server `gpt-5.6-luna` with medium reasoning, and authenticated Claude. |
| Operational database disclosure | `Mandatory disclosure / Out of execution scope` | API-REV-014 accidentally applied migration `20260801090000_token_usage_member_display_name` and wrote a failed canonical migration record with 203 failures to `/Users/normy/.autobyteus/server-data/db/production.db`. No rollback was attempted. | Never reference, target, open, mutate, copy, or automatically roll back that database in API-REV-016. Record the disclosure unchanged in final artifacts. All accepted evidence must identify the owned disposable DB and target guard. |

### Initial broader-validation gate

Broader validation is **Required**. The changed boundary is a browser/WebSocket-to-TeamRun command selector with task-chain identity, provider runtime behavior, streaming cadence, approval/interrupt lifecycle, and persisted task/history effects. Repository-only and temporary reviewer probes cannot satisfy the user-required current integrated real-provider journeys. A missing credential/runtime/model, inability to import secrets into the exact isolated vault, or database-target mismatch is a `Blocked`/`Fail` condition, never a passing skip.

### Final API-REV-016 investigation update

Every planned coverage decision above is now adjudicated:

- The stale cross-runtime memory fixture was reproduced at `15/16`, updated to exact rooted schema-v3 input, and now passes `16/16`.
- The complete Team command selector has durable current owners at both server streaming and frontend serialization boundaries. Persistent, direct task Agent, outer task Team, nested task Team, invalid/stale, cadence, coalescing, approval, and interrupt cases pass.
- The exact current retained server selection passes `48 files / 331 tests` with zero skips. Current cadence/harness passes `2 / 43`; exact affected web passes `3 / 50`; production typecheck, full build/bootstrap, both built routing probes, removal/registry, launcher/DB guard, and diff audits pass.
- The exact cumulative inventory contains `56` rows: all `53` prior current-delta dispositions plus three newly maintained paths. `54` present paths were revalidated and the two approved removed token-owner tests remain absent. Current API-REV-016 durable delta is `1 added / 3 updated / 0 removed`.
- A real TTY `pnpm secrets:import` configured nine identifiers in the exact disposable SQLite target. Public `LOCAL_PATH` package import discovered the staged nested classroom. Secret values were not retained.
- Through the actual frontend, fresh standalone Agents passed on AutoByteus `gpt-5.6-luna`, Codex `gpt-5.6-luna` medium, and authenticated Claude `sonnet` medium. Fresh imported Team rows on all three runtimes passed rooted topology, intrinsic rules, persistent nested routing, same-task-Team peer routing, exact submission, accepted review, final response, and cleanup; AutoByteus additionally passed terminate/restore/topology/terminate.
- Initial browser automation was not accepted merely because prompt tokens were visible. Public projection reinspection excluded incomplete initial Codex/Claude runs, and fresh authoritative reruns were completed. Claude needed browser-delivered recovery after a task notification collided with an active turn and after a peer replied without recording the requested tool delivery; final public message/task projections prove exact completion. This remains `API-OBS-016-001`, a non-blocking provider timing/recovery observation.
- The unchanged old broad frontend `TeamStreamingService.spec.ts` remains a non-clean, pre-current baseline and is not acceptance authority. Prior whole-server/web non-clean baselines also remain honestly classified rather than converted into Pass. The current proportionate selection and direct real matrix are authoritative.
- Cleanup removed the disposable stage/root/database/vault files and stopped ports/processes. The source fixture is clean. The operational database was never targeted this round.

Final confidence is `95%`; all categories are at least 90%, every critical criterion is proven, and the result is `Pass`. Because four repository-resident durable coverage files changed, the mandatory next route is proportional `code_reviewer` review before delivery.

## Current Requirement And Design Basis

SR-015, including the implemented SR-014 exact collaboration-instruction copy and cumulative SR-013/SR-012 identity and persisted-transition requirements, is authoritative. The validation basis remains R-001–R-048 and AC-001–AC-044. This post-fix round first rechecks BEH-002/BEH-003/BEH-011/BEH-012 and AC-027–AC-030/AC-043 at the child resolved-delivery and task-Team ingress boundaries, then completes the already-required migration/provider/API/frontend/live matrix.

The TeamRun transition now has two non-overlapping record/write owners and one shared migration-only flat decoder. Fresh flat input runs stable `20260517...` to predecessor and then pending `20260801...` to v3. A terminal-success/warning stable record is never reset or rerun; pending `20260801...` converts a predecessor directly or decodes residual/repaired flat input in memory and writes only final v3. `Program Manager` / `program_manager` and `QA Specialist` / `qa_specialist` are the normative safe display/structural divergence. Structural contradictions fail before backup or mutation; canonical retry, v3 idempotence, exact-success startup gating, and strict current readers remain required.

The implementation must have one strict `AgentTeamAddress` authority and one schema-v3 rooted TeamRun snapshot (`rootTeam`) with kind-specific run identifiers. Persistent and restored children share that immutable root tree and absolute addresses; task AgentTeams materialize distinct typed executions without a second local address language. Cross-process/runtime identity is exactly `TeamExecutionAddress {rootTeamRunId,taskTeamRunIds,memberAddress,taskAgentRunId}`. Public message and delegation selectors use only `recipient_address`; `get_handoff_rules` and `send_message_to` are intrinsic to Team-bound Agents and preserve the exact LLM-facing instruction/result contract. Nested managers forward unchanged delivery intent toward the root; only the root resolves/materializes a destination.

The rollout includes an ordered, blocking migration of framework-owned TeamRun metadata, communication/task structured files, token usage, external-channel bindings, and physical application databases. The normal runtime must remain current-schema-only. Existing memory/context directory bytes remain directly usable through renamed, storage-owned `ancestorTeamRunIds` derivation rather than logical-address path rewriting.

Server, GraphQL/REST/WebSocket, application contracts, generated/vendor artifacts, and frontend state must consume canonical address/execution shapes. Application backend-definition and frontend SDK semantic contracts are exact V5; application manifest V4, backend bundle V1, and iframe transport V4 remain intentionally unchanged. V4 SDK bundles must be rejected/quarantined before execution with actionable observed/required-version diagnostics, while application database discovery/migration remains independent of bundle admission. Frontend Team state uses one `rootTeam` projection, derives `memberNodesByAddress`, and keys/focuses concrete execution state by canonical serialized execution addresses.

Finally, the user-required imported nested-classroom scenario must pass independently with fresh TeamRuns on AutoByteus `gpt-5.6-luna`, Codex App Server `gpt-5.6-luna` plus `reasoning_effort: \"medium\"`, and an authenticated catalog-exposed Claude Agent SDK model. An unavailable runtime/model/credential or skipped row is Blocked/Fail evidence, not Pass.

## API-REV-012 Current-State Coverage Addendum

This addendum was written before any round-12 durable coverage edit, removal, final execution, or failure reroute. Static inventory evidence is `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/api-e2e-evidence-sr015/sr015-initial-coverage-investigation.log`.

| Existing Coverage / Required Surface | Initial Validity Decision | Reason | Round-12 Action |
| --- | --- | --- | --- |
| `tests/unit/app-data-migrations/token-usage-execution-address-backfill-migration.test.ts` | `Replace` at the current owner boundary | It imports the deleted historical migration owner/database interface. Its direct/task-Agent/task-Team/idempotence/no-guess assertions remain requirement-valid, but current SR-015 authority is the planner + migrator + transactional store composed by `TeamCanonicalIdentityMigration`. | Preserve the useful scenarios while retargeting to `TokenUsageCanonicalExecutionAddressMigrator`, `PrismaTokenUsageCanonicalExecutionAddressMigrationStore`, and aggregate execution. Add plan-before-mutation and exact-current behavior. |
| `tests/e2e/token-usage/token-usage-execution-address-backfill-graphql.e2e.test.ts` | `Replace` | It constructs and exposes terminal historical `20260703...` as a current runnable definition, writes stale task-record/address shapes, and expects old `{segments}` projections. That owner and output are invalid current authority. | Rewrite around terminal historical record preservation plus pending canonical aggregate execution, current task records/addresses, exact GraphQL/current store projection, and truthful migration status. |
| Token legacy path/route cleanup unit and startup E2E | `Needs Update` | Cleanup remains required but its prerequisite is now exact success of `20260801...`, never the historical token record. | Retarget dependencies/fixtures and prove cleanup does not run before canonical success, does run after success, and startup remains gated. |
| Existing TeamRun two-ID integration and canonical startup gate | `Still Valid` | API-REV-011 already resolved `API-F-006`; SR-015 preserves these owners and extends the canonical aggregate with token conversion. | Recheck unchanged, then add aggregate token failure/open sequencing without weakening existing TeamRun cases. |
| Provider instruction composition units | `Needs Update / Expand` | SR-014 supplies one exact renderer copy for AutoByteus, Codex, and Claude. Reviewer parity probes are temporary source evidence, not durable downstream authority. | Add/maintain exact rendered-copy, exact member-address substitution, system/developer placement, intrinsic tool exposure, standalone exclusion, and three-provider parity coverage. |
| Remaining prior six migration files / ten failures | `Needs Individual Adjudication` | API-REV-011 stopped before validity maintenance. They include pre-current expectations that cannot be treated as implementation failures or mechanically accepted. | Run sequentially, classify each against SR-015/current owners, update/replace only requirement-valid coverage, and retain failure evidence. |
| Current integration/API/E2E/frontend/build/broader selections | `Still Required` | They were Not Tested after API-F-007. | Execute affected and proportionate broader deterministic coverage, including server API/E2E, web store/handler/component suites, production typecheck/build, current-authority audits, and honest whole-suite baseline classification. |
| Imported nested-classroom AutoByteus/Codex/Claude matrix | `Add Real Validation` | Explicit R-044–R-048 / AC-040–AC-044 contract; mocks/skips cannot satisfy it. | Create an isolated persistent test runtime, dry-run then non-dry-run `pnpm secrets:import` into the exact test SQLite DB, import the staged fixture, launch fresh row-specific TeamRuns, and collect redacted runtime/tool/instruction/message/task/history evidence for every row. |
| Real frontend Agent and AgentTeam creation across all runtimes | `Add Real Browser Validation` | User explicitly requires proof that the frontend still creates and runs Agents/Teams, not only backend fixtures. | Through the project browser path, create at least one standalone Agent and one AgentTeam per runtime, select the exact required models/configs, launch fresh executions, send prompts, observe hierarchy/member states/messages/task/history-visible behavior, correlate with server logs, and capture DOM/screenshot evidence. Use isolated test-owned data and clean up owned runs/state. |

Round-12 durable coverage may be added/updated/removed only after this addendum. No existing file will be removed without recording its replacement or no-replacement rationale. Browser/API temporary orchestration belongs in retained evidence unless the repository already has an appropriate deterministic durable harness.

### API-REV-012 Repository Evidence Update

- `API-F-007` is downstream-resolved at the current SR-015 owner. The replacement canonical token suite passes `5/5`: direct, task-Agent, legacy input, and two-level nested task-AgentTeam reconstruction; complete planning before mutation; strict task-index failure before token scan/write; real Prisma rollback/read-back verification on a forced later-row failure; stable repair/retry; exact-current idempotence; and aggregate TeamRun/task prerequisite failure before token migration. Evidence: `api-e2e-evidence-sr015/token-canonical-focused.log`.
- The replacement GraphQL migration journey passes `1/1` against a real temporary Prisma database. It preserves a terminal historical `20260703...` record, runs the pending canonical aggregate, persists exact current direct/task-Agent/task-AgentTeam execution addresses, exposes current hierarchy/aggregates through GraphQL, and proves the historical ID is absent from the current registry. Evidence: `api-e2e-evidence-sr015/token-canonical-graphql.log`.
- The prior six migration files were individually adjudicated rather than accepted mechanically. Their requirement-valid scenarios remain, but fixtures/assertions needed current schema-v3 TeamRun metadata, exact `TeamExecutionAddress`, exact canonical cleanup prerequisite, and registry positions shifted by the canonical aggregate. All maintained files plus the canonical token suite pass sequentially: `7 files / 29 tests`. Evidence: `api-e2e-evidence-sr015/migration-seven-after-maintenance.log`.
- Provider instruction coverage was maintained at the SR-014 exact-copy boundary. One new provider-parity suite compares AutoByteus, Codex, and Claude seams against the shared renderer, proves exactly one block with the caller address, excludes removed authority, and excludes the block from standalone inputs. The existing composer and provider bootstrap/factory fixtures were updated from pre-SR-014 prose/current-context gaps. Result: `5 files / 21 tests`. Evidence: `api-e2e-evidence-sr015/provider-instruction-after-maintenance.log`.
- Durable replacement rationale: the two deleted `token-usage-execution-address-backfill*` tests protected a removed current owner and legacy `{segments}` output. Their behavior is replaced, not discarded, by `token-usage-canonical-execution-address-migration.test.ts` and `token-usage-canonical-execution-address-graphql.e2e.test.ts` at the current aggregate/planner/store/GraphQL boundaries.

## API-REV-015 CRR-032 Coverage-Package Reinvestigation And Correction Plan

This addendum was written before any round-15 durable test edit, restoration, removal, or final execution. CRR-032's product/runtime conclusion is explicitly preserved: the 35/35 affected selection and real AutoByteus/Codex/Claude task-Team peer/submit/review journeys remain valid evidence for API-F-010. This round corrects only the durable coverage package and its reporting.

| Coverage path / group | Initial validity decision | Evidence and current defect | Round-15 action before reissue |
| --- | --- | --- | --- |
| Seven changed capability-gated runtime E2Es under `autobyteus-server-ts/tests/e2e/runtime` | `Needs Update` | The suites retain useful full-stack/runtime scenarios, but their create-run `memberConfigs` use removed `memberName`/`memberRouteKey` fields instead of exact `memberAddress`; the nested suite also decodes schema-v2 `memberPath` / `{segments}` shapes. A capability skip is truthful for unavailable live providers, but stale setup is not maintained current coverage. | Retarget create-run fixtures and local result types/assertions to current schema-v3 `memberAddress` and serialized execution-address shapes. Run a current-contract static/TypeScript audit plus the seven-file Vitest selection, preserving truthful runtime skips rather than claiming skipped scenarios executed. |
| Duplicate `xml-patch-prompt-tool-parsing-state.test.{js,ts}` edits | `Out Of Scope / Restore` | Both files are deliberately excluded by server Vitest and import a deleted source owner. The ticket-only `recipient_name` to `recipient_address` text edit does not create executable evidence and duplicates unrelated obsolete coverage. | Restore both files exactly to artifact HEAD so they leave the cumulative ticket delta. Do not count them as maintained or passing coverage; record hash/diff proof. |
| `test-support/live-e2e/live-e2e-harness.ts` and `test-support/live-e2e/run-live-e2e.mjs` | `Needs Update / API-E2E Owned` | The API/E2E round introduced explicit `AUTOBYTEUS_TEST_DATABASE_URL` propagation/verification after an operational-database collision. The safety behavior is requirement-relevant and must remain visible, but API-REV-014 omitted it from the durable delta and lacked focused post-change proof. | Own both edits as API/E2E harness maintenance. Add/run a focused isolated harness validation that proves an explicit disposable DB is accepted and a mismatched DB fails closed before live operations; audit launcher propagation without reading or writing the operational database. |
| Two changed web streaming tests | `Still Valid / Include` | Both passed 34/34 and cover current `recipient_address` streaming/tool lifecycle projection, but the prior inventory was server-only. | Include them explicitly in the cumulative inventory and preserve their focused execution evidence. |
| All remaining server durable coverage delta | `Still Valid, subject to exact inventory recheck` | API-REV-014 directly executed the current active server selection, but its declared count included one non-test fixture, two excluded obsolete tests, and seven skipped suites with stale setup. | Regenerate one exact cumulative inventory from Git state across server tests/fixture, web tests, and live support; distinguish executable pass, truthful skip, support validation, restored/out-of-delta, and removed/replaced paths. Re-run every active executable changed server test and reconcile counts exactly. |

### Round-15 Evidence And Routing Gate

- Evidence root: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/api-e2e-evidence-sr015/api-rev-015`.
- `TR-F-002` is resolved only if all seven live-runtime files use current input/result contracts, the two XML-patch files have zero ticket diff, and no excluded/deleted-source test is counted as an executable pass.
- `TR-F-003` is resolved only if the exact inventory includes server, both web paths, both live-E2E support paths, and removed/replaced paths; the harness has direct isolation proof; and the operational database mutation remains disclosed without attempted automatic rollback.
- Final execution remains staged from focused current-contract/harness checks to the exact cumulative active test list, affected web tests, production typecheck/build, and hygiene/audit checks. The already-successful real three-runtime rows are retained rather than repeated unless the bounded correction changes runtime behavior (it must not).
- Any final `Pass` returns the full cumulative artifact and durable path package to `code_reviewer` for proportional re-review before delivery.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| Canonical logical address and recipient expression | Changed / old authority removed | BEH-001–BEH-003, BEH-012; R-001–R-016, R-028–R-032, R-038, R-043; AC-001–AC-013, AC-023–AC-025, AC-029, AC-035 | Replace bare-name, `recipient_name`, route-key, path, and fallback assertions with strict absolute/relative `recipient_address` proof and negative grammar cases. |
| Rooted TeamRun metadata and runtime | Changed | BEH-004, BEH-008, BEH-013; R-017–R-020, R-032–R-035; AC-014–AC-018, AC-026–AC-028, AC-031, AC-037 | Add/maintain schema-v3 root/nested create, persistent child, task child, restore, typed-ID, address-index, snapshot/handoff, and contradiction-rejection coverage. |
| Root-private delivery and task ingress | Changed | BEH-002–BEH-007; IR-006; CRR-010 | Add durable nested persistent/task-child forwarding to `/root-agent`, cross-branch/Team ingress, exact once delivery, root foreign-ID rejection, current-local task mapping, submit/review, interrupt/restore coverage. |
| Intrinsic collaboration protocol/provider projections | Changed | BEH-001, BEH-009; R-011–R-013, R-021, R-047; AC-012–AC-013, AC-019–AC-020, AC-043 | Maintain AutoByteus/Codex/Claude tool exposure, filesystem-like instruction, exact minimal handoff result, accepted/rejected transport parity, and real provider lifecycle proof. |
| Execution/history/event/token identity | Changed | BEH-014; R-036–R-038, R-041–R-043; AC-028–AC-030, AC-033, AC-035–AC-039 | Update typed public/current payload tests without rewriting opaque historical provider arguments; prove exact serialization, task chains, websocket/history/token projections, and strict legacy-field removal. |
| Persisted data transition | Corrected, blocking two-ID chain | BEH-015; SR-013; R-041–R-043; AC-031–AC-034, AC-037, AC-039 | Add durable fresh-flat, terminal-success predecessor, terminal-warning residual-flat, backup/atomicity, unsafe byte-stability, repair/retry, idempotence, exact startup-gate, and independent physical application-DB discovery coverage. |
| Application V5 SDK/admission | Changed / V4 current support removed | BEH-016; SR-012; R-038, R-041–R-043; AC-033, AC-035–AC-039 | Current-path fixtures must use V5. Retain V4 only as explicit rejection/incompatibility inputs. Prove manifest/bundle/loaded-definition admission, diagnostic/quarantine, artifact parity, and database independence. |
| Frontend rooted/execution state | Changed | BEH-016; R-039, R-043; AC-036, AC-039 | Add/update store, hydration, stream, command/history/memory/token/focus, collision, and no-fallback coverage for `rootTeam`, `memberNodesByAddress`, and execution-address keys. |
| Physical memory/context lineage | Renamed/encapsulated, bytes preserved | BEH-017; R-040–R-043; AC-034, AC-038–AC-039 | Prove existing directories/locators remain usable and distinguish physical `ancestorTeamRunIds` from logical/current API identity. |
| Imported nested-classroom live matrix | Added mandatory validation | BEH-018; R-044–R-048; AC-040–AC-044; live contract | Execute all three live rows through supported import/launch surfaces with isolated secrets/data, redacted evidence, fresh IDs, full behavior spine, and cleanup. |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available Before Round 5 | Material Risk Not Exercised Yet | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | Address grammar/resolution, rooted planner/index, delivery, task identities/lifecycle, migration | IR-006 source checks and temporary probes; dirty prior tests are not yet authoritative | Current durable validity, migration recovery, task/persistent collision and nested forwarding | Focused unit/integration plus lifecycle |
| API / transport / contract | Yes | GraphQL, WebSocket, REST/external, provider tool/result payloads, app SDK | Prior SR-006 E2E and dirty renamed fixtures | Current exact schema, strict rejection, live public import/launch, API-to-runtime composition | Repository API/E2E plus Live API |
| Frontend component / state | Yes | Rooted projection, address index, execution-address keys/focus | Two dirty stream-handler tests plus implementation checks | Full store/hydration/command/history/memory/token/collision behavior and built artifact | Frontend unit/integration and browser/API only if repository evidence cannot close gap |
| Browser integration / user journey | Yes, contract changed | Web client consumes new server/API state | Implementation rendered empty/error state only | A live hierarchy/task/history UI was not exercised | Browser if a stable project-supported fixture can materially add proof; not a substitute for mandatory live API rows |
| Authentication / session / permissions | Yes for live external runtimes | Secret-store import and authenticated model catalog | Repository secret importer and capability-gated harness | Credential presence/model exposure and provider authorization are unknown | Isolated secret import plus live catalog/preflight |
| Desktop renderer / web-equivalent UI | Indirectly | Web-equivalent Team projection and commands | Same production web code | Shell not required for contract; rendered journey may remain uncertain | Browser preferred if needed |
| Desktop shell / Electron-specific integration | No material SR-012 shell boundary identified | No preload/IPC/window/package-shell semantic change | N/A | None material | None; do not launch desktop app merely for web-equivalent behavior |
| Process / lifecycle | Yes | Blocking migration before listen; provider sessions; create/task/terminate/restore | Build/bootstrap smoke and IR-006 built probe | Full migration gate, fresh provider sessions, cleanup/restore | Lifecycle + live API |
| Persisted-data transition | Yes | File/database migrations plus unchanged physical memory directories | Narrow temporary implementation SQLite proof only | Broad durable fixtures, contradiction/rollback/idempotence, catalog-independent app DBs, restart gate | Durable migration integration + isolated lifecycle |
| Worker / queue / distributed coordination | Yes, bounded | Root/child manager forwarding across nested execution boundaries | IR-006 built probe | Durable runtime composition and real provider callback/tool lifecycle | Integration/E2E and live provider rows |
| External integration | Yes | AutoByteus, Codex App Server, Claude Agent SDK runtimes/models | Adapter-level prior coverage only | Mandatory authenticated real runtime/model matrix | Live API, three fresh isolated rows |

## Project Execution Discovery

- Assigned worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs`
- Reviewed HEAD at round-11 investigation start: `fb6b997272d90469c3c17912995c88c5caeea728`; reviewed IR-013 source commit: `6a920d45e54981735c25146e0ab76ab7e0917c4c`.
- Stack: pnpm workspace; Node.js/TypeScript; Fastify/Mercurius GraphQL; Prisma/SQLite; Vitest; Nuxt/Vue web; provider processes for Codex App Server and Claude Agent SDK.
- Conflicting, missing, or unclear project instructions: none for deterministic repository commands. Exact live harness orchestration is to be derived from the existing real-E2E runner and public import/TeamRun APIs; the ticket contract overrides generic skip-as-capability behavior for its three mandatory rows.
- Required environment variables or secrets available: `Unclear` until isolated import and live preflight. Secret values will never be printed or attached.
- Protected/non-owned state: delivery stash/backup, delivery-owned documentation/artifacts, the user's normal `~/.autobyteus` data, and `/Users/normy/autobyteus_org/autobyteus-private-agents` are not to be edited, reset, dropped, reused as a target, or deleted.

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `autobyteus-server-ts/AGENTS.md` | Closest server test instruction | Use `pnpm -C autobyteus-server-ts exec vitest run <paths> --no-watch`; run narrow checks before broad. |
| root and server `package.json` | Authoritative scripts | `pnpm test:e2e`, `pnpm test:e2e:real:preflight`, `pnpm test:e2e:real`, `pnpm secrets:import -- ...`; server `build:full` and build-config TypeScript checks. |
| `autobyteus-server-ts/README.md` and test README/config | Runtime/test environment | Use project-owned `.env.test`, temp roots/databases, supported GraphQL/service harness, and explicit capability reporting. |
| `nested-classroom-live-validation-contract.md` | Mandatory SR-012 live contract | Read-only source fixture; staged `LOCAL_PATH` import; exact overlays; fresh row per runtime; isolated secret DB; exact models/config; no skipped Pass; redacted evidence and cleanup. |
| `autobyteus-server-ts/vitest.config.ts`, test setup, `.env.test` | Deterministic runner isolation | Respect test hooks, SQLite/temp directories, and existing finalizers; do not collide with shared user state. |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Focused and affected server coverage | `autobyteus-server-ts` | `pnpm exec vitest run <paths> --no-watch` | Test-owned Prisma/SQLite/temp roots | Suite collection and exit status | Project hooks/finalizers |
| Frontend coverage | `autobyteus-web` | package-defined Vitest command for selected/current suites | No shared user data | Suite exit status | Runner exit |
| Production compile/build | server/workspace as scripted | build-config `tsc`; server `pnpm run build:full`; relevant SDK/web builds | Build artifacts remain inside assigned worktree | Exit 0 plus bootstrap smoke/artifact audits | No long-running process |
| Deterministic repository E2E | worktree root | `pnpm test:e2e` | In-process/public surfaces with test-owned data | Exit status and per-suite evidence | Existing finalizers |
| Live runtime preflight | worktree root | `pnpm test:e2e:real:preflight` plus targeted catalog/capability checks | This cannot convert missing mandatory rows to a passing skip | Exact runtime/model/credential availability | Stop only owned processes |
| Isolated live environment | worktree root/server | `pnpm secrets:import -- --source \"<real-home>/.autobyteus/server-data/.env\" --database-url \"file:<absolute-test-db>\"`; project-supported server/harness | Disposable absolute DB/app-data/HOME; no secret output; source resolved before HOME change | Import exit, secret identifier presence, API/catalog readiness | Terminate owned runs/processes; remove staged/test-owned data after evidence |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Migration legacy fixtures | Test-created JSON/SQLite/application DB inputs | Never point at user data; validate backups/transactions/failure details | Test cleanup; retain redacted logs only |
| Nested classroom package | Copy source fixture into test-owned `agent-teams/nested-classroom-test`; apply only contract-authorized overlay; import with `LOCAL_PATH` | Source package remains byte-for-byte untouched; record staged digest/diff | Remove staged copy after evidence unless preserving a redacted failing fixture |
| Provider secrets | Repository secret importer into disposable absolute DB | Record names/presence only, never values; no overwrite of normal database | Delete disposable DB/app root after run |
| Runtime rows | Fresh root TeamRun and provider session for each required row | No run/session/history reuse; exact required models/config | Terminate root/task/provider processes and remove isolated state |

## Persisted Data Transition Coverage Basis

- Approved decision: `Migration Required` for framework-owned structured identity data; `Directly Usable — No Migration` for physical Agent memory/context directories and locator bytes.
- Design/implementation references: R-040–R-043; AC-031–AC-034, AC-037–AC-039; `team-run-canonical-identity-refactor.md` sections covering cases 10.9–10.13; implementation handoff `Persisted Data Transition` and `Legacy / Compatibility Removal Check`.
- Representative existing-data setup: legacy TeamRun metadata with consistent and contradictory parallel identities; communication/task structured JSON; token-use SQLite legacy columns/payloads; external binding payloads; multiple application platform DBs including a V4/quarantined bundle; existing memory directory/context locator layout.
- Evidence planned: validate transformed schema-v3 root tree, typed IDs and canonical execution address; preservation of non-identity content; per-file/database backup or transaction; atomicity; actionable contradiction/failure; idempotent rerun; startup blocking on incomplete required migration; physical application DB discovery without admitted-bundle dependency; strict current readers rejecting old shapes; unchanged memory/context relative paths.
- Migration completion/recovery scenarios: clean multi-store conversion; catalog-independent application DB enumeration; contradictory metadata failure without partial replacement; SQLite rollback/failure gate; idempotent rerun; current-only read/write after successful bootstrap.
- Upstream ambiguity/reroute required: none identified.

## Existing Durable Coverage Inventory And Initial Validity Decisions

The worktree contains 44 already-dirty durable test files (42 server, 2 web) that predate this investigation. IR-005/IR-006 explicitly disclaims ownership of those edits. Static inspection shows predominantly mechanical field/class/version renames; their dirty state is not accepted as SR-012 authority until each assertion is checked against the current contract. No add/remove is present at investigation start.

| Path / Scenario Family | Current Assertion Or Intent | Related Requirement / Design | Initial Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `tests/unit/agent-collaboration/collaboration-logical-address.test.ts` | Address parsing/resolution | R-001–R-010, R-032; AC-001–AC-010 | Needs Update | Core scenario remains required, but strict canonical/relative rules and negative cases must match the new sole authority | Validate and maintain first |
| `tests/unit/agent-team-execution/{inter-agent-message-*,member-run-instruction-composer,mixed-*,send-message-to-tool-argument-parser,team-logical-placement-resolver,team-member-delivery-coordinator}.test.ts` | Collaboration intent, placement, provider instruction, nested delivery | R-011–R-016, R-028–R-035, R-043; AC-011–AC-013, AC-023–AC-029 | Needs Update; resolver scenario maintained and failed | Mechanical renames include invalid bare names and `allowedRecipientAddresss`; the maintained resolver now proves the current root index but production reports `COLLABORATION_TARGET_NOT_FOUND` when an Agent occurs before the final segment, contrary to the approved `COLLABORATION_TRAVERSAL_INVALID` code | Reroute `SR012-ADDR-001` before continuing broader maintenance |
| `tests/unit/agent-team-execution/{task-delegation-service,task-delegation-target-mapper,team-manager-member-interrupt}.test.ts` and task tool tests | Agent/Team delegation and lifecycle | R-014–R-016, R-034–R-037; AC-012, AC-025, AC-027–AC-030 | Needs Update | Target shape remains valuable; bare names/parallel identity fixtures are suspect | Convert to canonical recipient/execution addresses and current task IDs |
| AutoByteus/Codex/Claude backend converter/bootstrap/tool-use/history tests | Provider-native tool/result/history projection | R-011–R-013, R-021, R-036, R-043, R-047; AC-012–AC-013, AC-019–AC-020, AC-043 | Needs Update / split validity | Current generated tool calls must use `recipient_address`; opaque recorded historical provider arguments are content and must not be blindly rewritten | Preserve opaque trace fixtures where intentional; update only current contract assertions |
| Agent memory recorder and run-history projection tests | Memory/event/history persistence/projection | R-036, R-040–R-043; AC-030, AC-034, AC-038–AC-039 | Needs Update / split validity | Current selectors change; physical paths and opaque payloads are preserved | Separate logical identity assertions from storage/history-content preservation |
| Application bundle/loader/host and four backend integration tests | Manifest/bundle/loaded backend contract admission and execution | R-038, R-041–R-043; AC-033, AC-035, AC-037, AC-039 | Needs Update | Current-path `definitionContractVersion` was mechanically changed to V5, but manifest/envelope versions and explicit V4 rejection roles must be adjudicated exactly | Make current fixtures V5; retain V4 only as explicit rejection; assert diagnostics and no execution |
| `autobyteus-web` streaming handler tests | Tool lifecycle and stream identity | R-036, R-039, R-043; AC-036, AC-039 | Needs Update | Two mechanical payload renames do not prove rooted store/index/focus or collision behavior | Correct payload fixtures and add broader frontend state coverage where missing |
| Nine server runtime/API E2E files (`external-channel`, `run-history`, `runtime/*`) | Public/runtime message, task, nested Team, history behavior | R-001–R-043; AC-001–AC-039 | Needs Update | Valuable end-to-end seams, but current dirty values include bare addresses and old state shapes | Update after direct unit/integration semantics are fixed; run deterministically |
| `tests/integration/agent-team-execution/task-delegation-tool-lifecycle.integration.test.ts` | Tool-driven delegation lifecycle | R-034–R-037, R-043; AC-027–AC-030, AC-039 | Needs Update | Previously known stale address fields; dirty mechanical change not enough | Rebuild fixture around strict recipient/execution identity and task Team lifecycle |
| `tests/integration/api/runtime-selection-top-level.integration.test.ts` | API runtime selection | R-021, R-038, R-046; AC-019, AC-035, AC-041 | Needs Update | Previously known stale fields and current contract/model configuration need adjudication | Update current API fixture and assertions |
| Existing TeamRun manager/service/restore, websocket, token, external binding, application-storage tests not currently dirty | Lifecycle and cross-boundary preservation | R-033–R-043; AC-026–AC-039 | Unclear pending focused inventory | Names/assertions may encode removed path/route/generic IDs even when git-clean | Inventory before inclusion; update/replace only if affected |
| Existing token/app-data migration tests | Older migration orchestration and stores | R-041–R-043; AC-031–AC-034, AC-037, AC-039 | Still Valid as framework harness, insufficient for SR-013 | Orchestration behavior remains useful, but most files do not directly prove the corrected two-ID TeamRun lifecycle | Retain and adjudicate sequentially after the TeamRun gate |
| `tests/unit/app-data-migrations/team-run-metadata-member-tree-migration.test.ts` | Stable pending flat-to-predecessor conversion, backup, idempotence, and unsafe-topology failure | R-041–R-042; AC-031, AC-037; DS-009A–D | Still Valid; recheck required | IR-013 restores the migration-only decoder and stable predecessor writer while preserving structural rejection. The file remains narrow prerequisite evidence rather than final-v3 proof. | Re-run unchanged with runner coverage; retain all four expectations |
| `tests/integration/app-data-migrations/team-run-metadata-member-tree-history.integration.test.ts` | Combined prerequisite plus current history/index use | R-041–R-042; AC-031, AC-037; DS-009A–D | Needs Update / Replace in place | Pre-SR-013 sequencing omits `20260801...`, runs index/current readers against predecessor data, constructs a supposed current value through the strict v3 writer using predecessor fields, and manually retries only the stable ID. Its real Program Manager/program_manager fixture remains authoritative, but its sequencing/current-writer assertions are stale. | Rewrite as explicit two-ID lifecycle coverage; retain the real fixture and remove no requirement |
| No dedicated durable canonical TeamRun two-ID lifecycle suite | Fresh flat, terminal predecessor/residual flat, final backup/atomicity, repair/retry, current-v3 idempotence | SR-013; R-041–R-042; AC-031, AC-037; DS-009A–D | Add Durable Coverage | IR-013/CRR-023 evidence is temporary; repository coverage must prove record-state lifecycle and final-v3 mutation directly | Use the rewritten historical integration plus existing runner and startup-gate units |
| `tests/unit/app-data-migrations/token-usage-execution-address-backfill-migration.test.ts` | Direct/task-Agent/task-Team historical token attribution and legacy-column authority audit | R-036, R-041, R-043; AC-029, AC-032, AC-039 | Needs Update; preserve task-Team correction authority | Expected output still uses removed `{segments}` shape and one audit path names a deleted builder, but the task-Team reconstruction intent remains required. Current source removed task-record indexing and ignores `memoryDir`, so correction must retain a current-shape assertion that a historical task Team root becomes `{rootTeamRunId,taskTeamRunIds,memberAddress,taskAgentRunId}`. | Correct only target shapes/audit inventory, rerun focused, and treat any lost task-Team reconstruction as a source failure |
| `tests/unit/server-runtime-app-data-migration-gate.test.ts` | Canonical migration failure/missing/runner rejection, unrelated warning policy, and successful start | R-042; AC-037; IR-011; CRR-020 | Updated / Still Valid | Corrected fixture uses the owner-exported canonical ID, proves canonical failure and missing status block, runner rejection blocks, and canonical success plus unrelated warning starts once | Retain and rerun with the two-ID suite; `API-F-005` remains resolved unless regression appears |
| Existing explicit legacy V4 rejection/incompatibility fixtures | Negative admission | R-042–R-043; AC-037, AC-039 | Still Valid if explicitly labeled rejection | Requirements preserve V4 only at incompatibility input boundaries | Retain; ensure observed/required/actionable assertions |
| Existing physical memory/context locator tests | Stable bytes and locations | R-040, R-043; AC-034, AC-038–AC-039 | Still Valid / may need naming update | Physical directories are intentionally preserved | Maintain direct-use evidence without logical-route fallback |
| Generic XML-patch parser JS/TS tests mechanically renamed | Parser behavior unrelated to project identity | No direct SR-012 behavior unless fixture is a current tool call | Out Of Scope unless fixture protects current `send_message_to` parsing | Dirty diff appears payload-only and duplicated | Revert unrelated opaque/example change if it is not a current collaboration contract assertion |

## Stale Or Obsolete Coverage Decisions

No durable file is authorized for deletion at the initial investigation stage. The following assertions are provisionally obsolete and must be removed or replaced inside maintained scenarios after direct inspection:

| Path / Scenario | Obsolete Assertion | Why It Is Obsolete | Upstream Evidence | Replacement Coverage | No-Replacement Rationale |
| --- | --- | --- | --- | --- | --- |
| Mixed delivery/instruction tests | `allowedRecipientNames` or mechanically invented `allowedRecipientAddresss` capability/list | Public callers provide strict `recipient_address`; runtime must not publish a parallel finite name authority | R-011–R-013, R-032, R-043; AC-011–AC-013, AC-029, AC-039 | Strict address expression parsing/resolution, placement, and exact errors | N/A |
| Message/task tests | Bare non-relative targets such as `coordinator`, `code_reviewer`, `Student`, or `pong` treated as valid logical addresses | Non-root logical addresses are absolute `/...` or caller-relative `./...`/`../...`; flat-name fallback is removed | Addressing contract; R-001–R-010, R-043; AC-001–AC-010, AC-039 | Exact absolute/relative positive and malformed/out-of-root/foreign-root negative cases | N/A |
| Current application execution fixtures | V4 backend-definition/frontend SDK accepted on normal path | SR-012 requires exact V5 admission; V4 is rejection/quarantine-only | R-038, R-042–R-043; AC-035, AC-037, AC-039 | V5 normal path plus explicit V4 rejection with actionable diagnostics | N/A |
| Current API/runtime fixtures | Parallel `memberPath`, `memberRouteKey`, coordinator route, generic run ID, local task route fields | Canonical address/execution identity is sole current authority | R-032–R-039, R-043; AC-026–AC-030, AC-035–AC-039 | Root tree/address index/typed IDs/`TeamExecutionAddress` assertions | N/A |
| Provider/history raw payload fixtures, if merely mechanically renamed | Rewriting already-recorded opaque arguments to pretend historical content migrated | Opaque provider trace arguments remain history content, not routing identity | BEH-017; R-040, R-043; AC-038–AC-039 | Preserve raw content; assert current projections route by canonical execution identity separately | N/A |

## Durable Coverage To Add

| Scenario ID | Behavior / Boundary | Requirement / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| `SR012-ADDR-001` | Strict canonical/relative address parsing, derivation, serialization, no fallback | R-001–R-010, R-032, R-043; AC-001–AC-010, AC-029, AC-039 | Existing address/resolver unit files, plus new focused file only if separation is needed | Sole identity authority needs exhaustive deterministic proof |
| `SR012-ROOT-001` | Schema-v3 rooted compile/create/persistent child/task child/restore, typed IDs, immutable shared snapshot/index | R-033–R-035; AC-026–AC-028, AC-031, AC-037 | Team topology/run-manager/service unit/integration coverage | Prior evidence targets SR-006 model |
| `SR012-DELIVERY-001` | Nested persistent/task child forwards unchanged intent to root; root resolves `/root-agent`; foreign root rejected; exactly once | IR-006; R-028–R-036; AC-023–AC-030 | `mixed-team-manager.test.ts` and delivery integration/E2E | CRR-010 probe is temporary implementation evidence only |
| `SR012-TASK-001` | Team ingress through coordinator, current-local parent-first mapping, submit/review, interrupt, restore, distinct typed task execution | R-014–R-016, R-034–R-037; AC-012, AC-025, AC-027–AC-030 | Task service/tool lifecycle unit/integration/E2E | Critical lifecycle crosses multiple owners |
| `SR013-MIG-CHAIN-001` | Fresh real flat fixture runs stable predecessor then canonical v3, preserving display-only input until final omission | SR-013; R-041–R-042; AC-031, AC-037; DS-009A | Rewritten historical integration suite | The prior combined test stopped before the final-v3 owner |
| `SR013-MIG-CHAIN-002` | Terminal-success predecessor and terminal-warning residual flat skip stable ID while pending canonical converts to final v3 | SR-013; R-041–R-042; AC-031, AC-037; DS-009B | Rewritten historical integration suite | Supported completed-record histories cannot be inferred from fresh migration |
| `SR013-MIG-SAFETY-001` | Unsafe structural input is byte-stable with no backup/replacement; repair retries non-terminal canonical; v3 rerun is idempotent | SR-013; R-041–R-042; AC-031, AC-037; DS-009C–D | Rewritten historical integration plus existing runner unit | Failure atomicity and executable pre-listen recovery are critical |
| `SR012-MIG-001` | Remaining composite file/DB migration, backup/transaction, contradiction, idempotence, blocking failure gate | R-041–R-043; AC-031–AC-034, AC-037, AC-039 | Existing/new app-data migration unit/integration suites | Two-ID TeamRun coverage is the first sub-gate; other stores remain outstanding |
| `SR012-MIG-002` | Application DB discovery independent of admitted bundle catalog, including V4/quarantined bundle data | SR-012; R-041–R-043; AC-037, AC-039 | New application migration integration scenario | Explicit DR-004/SR-012 risk |
| `SR012-APP-001` | Exact V5 manifest/bundle/loaded-definition admission, V4 actionable quarantine, no execution, artifact parity | R-038, R-042–R-043; AC-035, AC-037, AC-039 | Existing application unit/integration plus targeted artifact audit | Mechanical version edits are insufficient |
| `SR012-API-001` | GraphQL/WebSocket/external/history/token current exact rooted/execution shapes and legacy absence | R-036–R-039, R-043; AC-030, AC-033, AC-035–AC-039 | Existing API/E2E suites plus focused schema tests | Project boundaries must reject parallel identity |
| `SR012-WEB-001` | `rootTeam`, derived address index, execution-address state/focus, same logical address persistent/task collision | R-039, R-043; AC-036, AC-039 | Frontend stores/composables/stream tests | No current authoritative comprehensive frontend coverage identified |
| `SR012-MEM-001` | Existing memory/context bytes remain directly usable via physical `ancestorTeamRunIds` | R-040, R-043; AC-034, AC-038–AC-039 | Existing memory integration plus focused direct-use fixture | Migration must not rewrite physical lineage |
| `SR012-LIVE-001` | Imported nested classroom on all three required live runtimes/models | R-044–R-048; AC-040–AC-044; live contract | Project-supported real E2E harness; durable if repository pattern supports it, otherwise temporary orchestrator with retained redacted evidence | Critical user acceptance cannot be proven by mocks or skips |

## Durable Coverage To Update

| Scenario ID | Existing Path / Scenario | Required Update | Requirement / Design Evidence | Notes |
| --- | --- | --- | --- | --- |
| `SR012-UPD-001` | 42 currently dirty server test files listed by `git status` | Replace mechanical renames with requirement-valid addresses, typed identities, rooted fixtures, V5/current vs explicit V4-negative roles; preserve opaque history content where required | R-001–R-043; AC-001–AC-039 | Final inventory will enumerate every actually retained delta |
| `SR012-UPD-002` | Two dirty web stream-handler specs | Use current execution-address payload/state meaning; remove legacy fallback assumptions | R-036, R-039, R-043; AC-036, AC-039 | Extend to store/index/focus/collision paths if absent |
| `SR012-UPD-003` | Relevant currently clean TeamRun/API/application/migration/memory/frontend tests | Update only after focused validity inspection demonstrates an affected assertion or fixture | R-032–R-043; AC-026–AC-039 | Avoid broad mechanical churn |
| `SR013-UPD-001` | `tests/integration/app-data-migrations/team-run-metadata-member-tree-history.integration.test.ts` | Replace pre-SR-013 prerequisite-only/current-reader sequencing with explicit stable-plus-canonical lifecycle scenarios, reusing the real display-divergent fixture | SR-013; R-041–R-042; AC-031, AC-037; DS-009A–D | Deliberate validity correction, not mechanical expectation churn |

## Durable Coverage To Remove

No entire file is approved for removal initially. Obsolete individual assertions/fixtures identified above will be replaced in-place. Any later file deletion will first be recorded here with replacement coverage or explicit no-replacement rationale.

## Repository Coverage Execution Plan And Results

This table preserves the staged cumulative execution history. API-REV-010 stopped after `API-F-006` at 54%. Round 11 began only after the fresh SR-013 validity update, resolved `API-F-006` downstream, and stopped at `API-F-007`; no CRR-023 reviewer probe is counted as downstream execution.

| Order | Command / Mode | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence / Output Path |
| --- | --- | --- | --- | --- | --- |
| 1a | `pnpm exec vitest run` on 10 initial collaboration/task files | `autobyteus-server-ts`; exact paths; `--no-watch` | Validity discovery of old fixtures | Fail as expected from stale fixtures: 46 failed / 9 passed across 10 files | `api-e2e-evidence-sr012/discovery-collaboration.log` |
| 1b | `pnpm exec vitest run tests/unit/agent-collaboration/collaboration-logical-address.test.ts tests/unit/agent-team-execution/team-logical-placement-resolver.test.ts --no-watch` | `autobyteus-server-ts` | Current strict address structure plus exact missing-segment/traversal codes | Fail: 13 passed / 1 failed; exact Agent-before-final-segment code mismatch | `api-e2e-evidence-sr012/address-resolver-current-contract.log` |
| 1c | Contract/source/durable-expectation audit and `git diff --check` | Worktree | Establish whether the one semantic failure is stale coverage or implementation behavior | Pass audit; confirms contract line 628, source lines 32–37, zero current resolver emission of traversal code, clean test diff | `api-e2e-evidence-sr012/traversal-failure-analysis.log` |
| 2a | Unchanged two-file address/resolver recheck | `autobyteus-server-ts`; `--no-watch` | Independent `API-F-001` / CR-F-005 recheck | Pass: 2 files / 14 tests | `api-e2e-evidence-sr012/address-resolver-crr012-recheck.log` |
| 2b | Exact 27-file dirty unit discovery | `autobyteus-server-ts`; `--no-watch` | Classify remaining stale/mechanical fixtures before maintenance | Fail: 16 files / 78 tests, primarily stale schema-v2/current-V4 fixtures; not automatically implementation defects | `api-e2e-evidence-sr012/dirty-unit-discovery-after-crr012.log` |
| 2c | Maintained current intent, instruction, send-message parity, and AutoByteus task context | `autobyteus-server-ts`; `--no-watch` | Canonical caller projection through native AutoByteus context and task tool consumer | Fail: other 3 files / 13 tests pass; AutoByteus task context 1 pass / 3 fail (`API-F-002`) | `api-e2e-evidence-sr012/autobyteus-task-context-failure-focused.log`; `autobyteus-task-context-failure-final.log` |
| 2d | Unchanged maintained AutoByteus native task context | `autobyteus-server-ts`; `--no-watch` | Recheck `API-F-002` producer/consumer contract after IR-008/CRR-014 | Pass: 1 file / 4 tests; `API-F-002` resolved | `api-e2e-evidence-sr012/autobyteus-task-context-crr014-recheck.log` |
| 2e | Exact 27-path dirty-unit discovery after CRR-014 | `autobyteus-server-ts`; `--no-watch` | Reclassify current fixture/assertion failures before maintenance | 13 files / 157 tests pass; 12 files / 65 tests fail | `api-e2e-evidence-sr012/dirty-unit-round7-initial.log` |
| 2f | Current-only unit maintenance through application V5, provider context, task target, message, nested-Team, delivery, and manager lifecycle seams | `autobyteus-server-ts`; `--no-watch` | Replace stale schema-v2/V4 fixtures while retaining current lifecycle authority | 53 finalized assertions pass; manager lifecycle 5/6 pass and exposes `API-F-003`; one separately edited factory file remains unfinalized | `api-e2e-evidence-sr012/mixed-team-termination-lifecycle-failure-final.log`; supporting focused command output retained in turn evidence |
| 2g | Retarget termination/no-new-work coverage to `TeamRun` / `MixedTeamRunBackend` and cover all five task operations with zero manager/registry invocation | `autobyteus-server-ts`; `--no-watch` | Resolve CRR-015 API/E2E Local Fix without weakening lifecycle behavior | Pass: 1 file / 6 tests; all five supported operations return `RUN_NOT_FOUND` and invoke no registry while termination is pending | `api-e2e-evidence-sr012/team-run-termination-lifecycle-crr015-recheck.log` |
| 2h | Exact 25-file current dirty-unit set after round-8 maintenance | `autobyteus-server-ts`; `--no-watch` | Recheck all currently maintained unit seams and isolate the next semantic failure | Fail: 24 files / 224 tests pass; `task-delegation-service.test.ts` has 2 failures (`API-F-004`) | `api-e2e-evidence-sr012/dirty-unit-round8-final-halted.log`; `task-agent-nested-delegation-failure-final.log`; `task-agent-nested-delegation-failure-analysis.log` |
| 2i | Unchanged three-file `API-F-004` trigger and exact current dirty-unit set after CRR-017 | `autobyteus-server-ts`; `--no-watch` | Independently recheck IR-009 and establish the round-9 unit baseline before further maintenance | Pass: 3 files / 32 tests, then 25 files / 226 tests | `api-e2e-evidence-sr012/task-agent-nested-delegation-crr017-recheck.log`; `dirty-unit-round9-baseline.log` |
| 2j | Exact six-file dirty integration set after validity maintenance | `autobyteus-server-ts`; `--no-watch` | Tool/router/records/REST task lifecycle, top-level GraphQL/WebSocket runtime selection and restore, application V5 worker/host capabilities and transports | Pass: 6 files / 17 tests | `api-e2e-evidence-sr012/dirty-integration-round9-final.log`; focused lifecycle/runtime/application logs |
| 3a | Existing migration unit/integration discovery selection (17 files / 73 tests) | `autobyteus-server-ts`; isolated project test DB/temp roots | Identify current migration harness validity before maintenance | Non-clean discovery: 9 files / 18 tests failed; most failures are stale pre-canonical expectations/order/fixtures and are not accepted as implementation defects | `api-e2e-evidence-sr012/migration-round9-initial.log` |
| 3b | Corrected durable required-migration startup gate plus source/contract audit | `autobyteus-server-ts`; `pnpm exec vitest run tests/unit/server-runtime-app-data-migration-gate.test.ts --no-watch` | R-042 / AC-037: no bootstrap/listen after a required failure; successful migration starts once | **Fail (`API-F-005`)**: 1 success-path test passes; both required-failure cases call `app.listen({host:"127.0.0.1",port:0})` once | `api-e2e-evidence-sr012/startup-required-migration-gate-round9-failure.log`; `startup-required-migration-gate-round9-analysis.log` |
| 3c | Corrected canonical-only startup gate recheck after IR-011/CRR-020 | `autobyteus-server-ts`; focused 4-test file | Canonical failure/missing/runner exception block; canonical success plus unrelated warning starts once | Pass: 1 file / 4 tests; `API-F-005` resolved | `api-e2e-evidence-sr012/startup-canonical-migration-gate-crr020-recheck.log` |
| 3d | Sequential rerun of the nine previously failing migration files | `autobyteus-server-ts`; one Vitest process per file | Remove concurrency as an explanation and classify all 18 remaining failures | Non-clean: all 18 reproduce sequentially; validity analysis halted on first critical source defect | `api-e2e-evidence-sr012/migration-round10-sequential-discovery.log` |
| 3e | Focused legacy-flat prerequisite migration plus source/design/base audit | `autobyteus-server-ts`; 4-test file | R-041/R-042/design 12.2 ordered safe conversion/backup and unsafe failure | **Fail (`API-F-006`)**: 1 pass / 3 failures; skip-only checkpoint reports safe/unsafe flat data as success without conversion | `api-e2e-evidence-sr012/legacy-flat-prerequisite-round10-failure.log`; `legacy-flat-prerequisite-round10-analysis.log` |
| 3f | Fresh SR-013 static coverage investigation | Worktree; no test execution | Adjudicate prior prerequisite unit, combined history integration, runner, canonical migration, and startup gate against two-ID ownership | Complete: prerequisite/startup units remain valid; combined integration needs a deliberate in-place rewrite; canonical two-ID lifecycle lacks durable proof | `api-e2e-evidence-sr013/sr013-initial-coverage-investigation.log` |
| 3g | Unchanged prerequisite + runner + corrected startup gate | `autobyteus-server-ts`; exact three files; `--no-watch` | Stable writer/terminal-record policy and canonical block/open gate | Pass: 3 files / 14 tests | `api-e2e-evidence-sr013/prerequisite-runner-startup.log` |
| 3h | Rewritten two-ID historical integration | `autobyteus-server-ts`; exact integration file; `--no-watch` | Fresh flat, terminal-success predecessor, terminal-warning residual flat, unsafe byte stability/no backup, final backup/atomicity/idempotence, repair/retry | Pass: 1 file / 4 tests; `API-F-006` resolved downstream | `api-e2e-evidence-sr013/teamrun-two-id-lifecycle.log` |
| 3i | Sequential migration validity maintenance | `autobyteus-server-ts`; one Vitest process per prior failing file | Adjudicate/rewrite the remaining pre-SR-013 failures without hiding failures through concurrency | Halted at 3k; remaining six files / 10 failures not maintained | Not produced; initial discovery is 3j |
| 3j | Initial sequential rerun of the remaining seven migration files | `autobyteus-server-ts`; one Vitest process per file | Reconfirm and classify the 15 remaining failures after the SR-013 TeamRun gate | Non-clean: all 15 reproduce. Token usage mixes stale `{segments}`/deleted-path assertions with a still-required task-Team correction scenario; other files await maintenance | `api-e2e-evidence-sr013/migration-sequential-maintenance-initial.log` |
| 3k | Bounded token-usage fixture correction and focused rerun | `autobyteus-server-ts`; exact one file; `--no-watch` | AC-029/AC-032 exact current output plus historical task-Team root/chain reconstruction | **Fail (`API-F-007`)**: 3/4 pass; historical task-Team row remains rooted at `taskTeamRun1`, proving root/chain/member-prefix reconstruction was removed | `api-e2e-evidence-sr013/token-usage-address-focused.log`; `token-usage-address-failure-analysis.log` |
| 4 | Focused integration/API/E2E suites | Server package/root | Runtime composition, GraphQL/WebSocket/external/history/task/memory | Not Tested; halted at `API-F-007` | Not produced |
| 5 | Production TypeScript/build and SDK/application/web artifact checks | Workspace packages | Current contracts build; generated/vendor/importable parity; sanitized bootstrap | Not Tested; halted at `API-F-007` | Not produced |
| 6 | Proportionate broader deterministic repository suites, then whole-server/web baseline where supported | Workspace packages | Regression detection and independent classification of known non-clean baseline | Not Tested; halted at `API-F-007` | Not produced |
| 7 | Static forbidden-field/V4-current-authority/diff audits | Worktree | No compatibility authority; opaque/migration/incompatibility allowlists explicit | Not Tested; halted at `API-F-007` | Not produced |
| 8 | Isolated real-E2E preflight and three-row nested-classroom live matrix | Disposable app root/DB/staged package; exact contract | All R-044–R-048 / AC-040–AC-044 live behavior | Not Tested; halted before isolated `pnpm secrets:import`; no row is a passing skip | Not produced |
| 9a | Fresh SR-015/current-state coverage investigation | Worktree; no durable edits or execution | Adjudicate old token owner, canonical aggregate/store, cleanup, exact provider instruction, remaining deterministic, live, and browser coverage | Complete; API-REV-012 plan established | `api-e2e-evidence-sr015/sr015-initial-coverage-investigation.log` |
| 9b | Focused `API-F-007` canonical planner/migrator/store/aggregate recheck after bounded durable maintenance | `autobyteus-server-ts`; project Prisma/temp roots | Exact direct/task-Agent/nested-task-Team reconstruction, terminal historical record, one transaction, rollback/verification, retry/idempotence, cleanup/gate | Planned | `api-e2e-evidence-sr015/token-canonical-focused.log` and related logs |
| 9c | Remaining migration validity maintenance and sequential final selection | `autobyteus-server-ts`; one process per file followed by final selection | Resolve the six-file/ten-failure checkpoint without concurrency masking | Planned | `api-e2e-evidence-sr015/migration-maintenance-final.log` |
| 9d | Affected server integration/API/E2E, web, production typecheck/build, and broader deterministic coverage | Workspace packages; documented commands | Current runtime/API/frontend/application/provider composition and regression baseline | Planned | `api-e2e-evidence-sr015/deterministic-final/` |
| 9e | Isolated secrets import, preflight, imported nested-classroom three-runtime matrix | Exact disposable SQLite DB/app root/staged package | Mandatory AutoByteus/Codex/Claude live behavior | Planned; missing capability is Blocked/Fail | `api-e2e-evidence-sr015/live/` |
| 9f | Real browser frontend Agent/AgentTeam creation and execution for all three runtimes | Project browser development path against the same isolated server | User-requested creation, runtime/model configuration, launch, hierarchy, interaction, message/task/history surface, console/network health | Planned | `api-e2e-evidence-sr015/browser/` |

## Post-Repository Confidence Scorecard (Mandatory)

API-REV-011 completed as `Fail / 61%`. That remains the latest completed scorecard and is the round-12 starting point, not a current Pass. API-REV-012 scores will be recomputed after repository and broader execution; no confidence is awarded merely for CRR-027 reviewer probes.

| Confidence Category | API-REV-011 Final | What Supports The Result | Residual Failure Or Uncertainty | Additional Validation That Could Improve It |
| --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 66% | `API-F-001`–`API-F-006` resolved; SR-013 two-ID lifecycle and canonical startup policy pass | R-036/R-041 and AC-029/AC-032 task-Team token reconstruction fails; remaining migration/frontend/API/live criteria incomplete | Correct `API-F-007`, then resume the remaining plan |
| Changed-boundary execution directness | 72% | Exact prerequisite, runner, startup, two-ID historical integration, and token migration paths execute | Six migration files and later changed surfaces remain unmaintained/unexecuted | Fix and rerun the token seam, then complete the migration and boundary selections |
| Cross-boundary integration realism and mock gap | 58% | Real filesystem migration chain, Prisma-backed token migration, task/API/worker/startup seams execute | Token migration no longer crosses into task-delegation records; final API/E2E and real providers absent | Restore the required task-record join, then migration integration and live matrix |
| Environment, configuration, identity, and fixture fidelity | 55% | Real Program Manager/program_manager history fixture, project SQLite, current task records, and temp roots execute | Token task-Team identity is reconstructed incorrectly; isolated live environment was not allocated after halt | Correct identity reconstruction, finish fixtures, then perform the exact secrets-import live setup |
| Failure, edge-case, lifecycle, and recovery evidence | 62% | Unsafe byte stability/no backup, terminal success/warning, final backup/atomicity, repair/retry, and v3 idempotence pass | Task-Team token migration loses root/chain/member prefix; remaining migration failures are not adjudicated | Fix `API-F-007` and continue sequential recovery/negative coverage |
| User-surface, browser, and desktop-shell confidence | 30% | Affected web handler discovery passed; no shell boundary is material | Rooted focus/collision/rendered journey incomplete | Finish frontend; browser only for residual material gap |
| Durable regression coverage quality and relevance | 82% | Current startup gate, rewritten two-ID lifecycle, and corrected exact token-address fixtures directly test approved behavior and exposed the regression | Remaining six migration files and gated API/E2E/frontend/live coverage are incomplete | Preserve this coverage, correct source, and finish maintenance/broad reruns |

- Current overall confidence: `61%` (arithmetic mean, rounded).
- Every critical acceptance criterion directly proven: `No`; R-036/R-041 and AC-029/AC-032 currently fail at token task-Team reconstruction, and the remaining matrix is incomplete.
- Any applicable category below 90%: `Yes`; all seven.
- Default clean-confidence target of 95% met: `No`.
- Material residual risks: migrated task-Team token usage can be attributed to the task TeamRun as a false root and lose its task chain/nested member prefix; six migration files / 10 failures and all later/provider/live evidence remain incomplete.

## Broader Validation Decision

- Decision: `Required`.
- Selected execution modes: repository API/E2E, lifecycle/migration, isolated Live API/provider execution, and targeted browser validation only if frontend repository proof leaves a material user-surface gap.
- Specific confidence gap: the approved contract explicitly requires public import/launch and real provider tool/prompt/task lifecycles on three runtimes, plus blocking multi-store migration and frontend/backend integration that mocked unit tests cannot fully prove.
- Why selected modes improve confidence: they cross the actual package-import, persistence, startup, GraphQL/runtime, provider-process, and task/restore boundaries with exact row configurations and isolated credentials.
- Expected confidence after selected validation: at least 95% overall, no category below 90%, only if every critical deterministic and live scenario passes.
- Browser rationale: web-equivalent frontend behavior should first be proven through its repository store/component/integration suites. Browser execution is conditional because it cannot replace the mandatory live API/provider matrix, and no material Electron-shell change is in scope.
- If Blocked later: record the exact missing runtime/model/credential after safe isolated preflight/import/setup. A skipped row cannot yield Pass.

## Desktop Application Validation Decision

- Desktop framework / shell: Electron wrapper around the production web renderer, but no material SR-012 preload/IPC/window/shell boundary was identified.
- Web-equivalent behavior: rooted Team projection, focus, stream, history, task, memory, and token state.
- Shell-specific behavior: none required by SR-012 acceptance criteria.
- Chosen validation: frontend repository suites first; project browser path only if a material rendered-state gap remains. Do not disrupt the user's running application.
- Behavior not directly proven initially: live rendered hierarchy/task/history workflow; confidence remains low until repository/frontend evidence and broader-decision reassessment.

## Live Environment And Fixture Plan

- Use the user-confirmed assignment source `/Users/normy/.autobyteus/server-data/.env`; import it only through the repository `pnpm secrets:import` flow after allocating the disposable target environment.
- Allocate an absolute disposable test database and application-data root under a test-owned temporary directory.
- Import secrets with the exact repository command; retain only exit status and non-secret identifier/presence evidence.
- Copy `/Users/normy/autobyteus_org/autobyteus-private-agents/agent-teams/nested-classroom-test` into a test-owned package root, apply only the two exact handoff overlays and obsolete task-example replacement, record digest/redacted staged diff, and verify source digest remains unchanged.
- Import using supported `LOCAL_PATH`, preferably GraphQL `importAgentPackage`, then discover the staged Team definition.
- For each row, launch a fresh root TeamRun with all persistent/task members on the row's exact runtime/model configuration; record effective non-secret configuration and fresh typed IDs.
- Assert addresses `/`, `/Teacher`, `/StudentStudyGroup`, `/StudentStudyGroup/student_one`, `/StudentStudyGroup/student_two`; intrinsic tools/instruction; exact minimal handoffs; Team coordinator delivery exactly once; nested relative/root-absolute delivery; Team task entry/submit/review; persistent/task identity separation; terminate/restore where supported.
- Required rows: AutoByteus `gpt-5.6-luna`; Codex App Server `gpt-5.6-luna` with medium reasoning; authenticated catalog-exposed Claude Agent SDK model.
- Evidence: timestamps/durations, commands/test IDs, staged digest, run/task IDs, effective configs, address/execution observations, tool/prompt/result shapes, message/task/restore outcomes, redacted logs.
- Cleanup: terminate all owned root/task/provider processes, remove staged package/test database/app root after evidence, and verify the source package and user's normal operational data are unchanged.

## Temporary Executable Validation Plan

| Scenario ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| `SR012-TMP-001` | Startup-level process probe with test-owned corrupted/legacy store if existing migration tests cannot invoke the real gate | Server refuses to listen and reports the failing item without partial mutation | Process orchestration may be environment-heavy; core migration transformations/recovery should remain durable |
| `SR012-TMP-002` | Exact built-artifact audit/probe | Built/runtime V5/current identity equals source contracts and rejects V4 | Static/generated artifact parity is better retained as reproducible evidence command unless project has an established durable audit suite |
| `SR012-LIVE-001` | Existing real-E2E harness extended/orchestrated for isolated staged package and three providers | Mandatory live matrix | Keep durable only if repository's real-E2E structure supports deterministic configuration without embedding local paths/credentials; otherwise retain test-owned harness/logs as temporary evidence |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Remaining six migration files / 10 failures plus final E2E/frontend/build/broader execution | API-REV-011 halted at `API-F-007`; API-REV-012 is now authorized to resume | Later behavior remains unproven until commands finish | Execute 9b–9d; no success is inferred from source review |
| Three live provider rows | API-REV-011 did not reach environment allocation/import | Critical AC-040–AC-044 remains unproven | Execute 9e using repository `pnpm secrets:import`; unavailable capability/credential is Blocked/Fail, never a passing skip |
| Real frontend Agent and AgentTeam creation across all three runtimes | Newly explicit user requirement; not covered by prior API-only plans | Frontend create/configure/launch/hierarchy/interaction regressions could remain invisible | Execute 9f against the isolated server, correlate browser and server evidence, and preserve screenshots/DOM/results |

## Ambiguities Or Reroute Triggers

| Issue | Classification | Evidence | Recommended Recipient |
| --- | --- | --- | --- |
| `API-F-001`: `TeamRecipientResolver` returned `COLLABORATION_TARGET_NOT_FOUND` for `/product_manager/child`, although `/product_manager` is an Agent before the final segment and the approved table requires `COLLABORATION_TRAVERSAL_INVALID` | `Local Fix` — resolved by IR-007 / CRR-012 and independently rechecked | Contract line 628; API-REV-005 evidence; IR-007; CRR-012; `address-resolver-crr012-recheck.log` (14/14) | None |
| `API-F-002`: `buildAutoByteusManagedTeamContext` omitted the exact `{rootTeamRunId,memberAddress}` `addressing` projection while `buildTaskDelegationToolContextFromNativeContext` required it; factory-injected Team-bound native task operations therefore failed before routing | `Local Fix` — resolved upstream by IR-008 / CRR-014; independent API/E2E recheck is the first round-7 command | R-029; AC-023; UC-016; API-REV-006 evidence; IR-008; CRR-014 | None unless the unchanged recheck regresses |
| `API-F-003`: termination/no-new-work assertion directly invoked private `MixedTeamManager.startTaskAgentInstance`, bypassing the authoritative `TeamRun` / `MixedTeamRunBackend` active-lifecycle gate | `Local Fix` — API/E2E stale test boundary confirmed by CRR-015; preserve the expectation across all five supported operations at the production boundary | CRR-015; `CR-PREM-002`; built reachability probe SHA-256 `2ce151643409ae9f4ff24bdac5ad1a8128ccdcd6b003cf72229f6cee48c57eb6` | Resolved in round 8; no recipient |
| `API-F-004`: active task-Agent `delegate_task` was rejected before activation because `TaskDelegationTargetMapper` compared the exact task `caller.agentRunId` with the immutable persistent node AgentRun ID | `Local Fix` — resolved by IR-009 / CRR-017 and independently rechecked without changing the triggering tests | R-027; prior failure logs; `task-agent-nested-delegation-crr017-recheck.log` (3 files / 32 tests); `dirty-unit-round9-baseline.log` (25 files / 226 tests); current tool-lifecycle integration nested task-Agent scenario | None |
| `API-F-005`: canonical migration failure/runner exception previously reached listen | Resolved by IR-010/IR-011, CRR-020, and corrected 4/4 durable recheck | R-042; AC-037; `startup-canonical-migration-gate-crr020-recheck.log` | None |
| `API-F-006`: legacy-flat prerequisite/two-ID transition failed under API-REV-010 | Resolved by SR-013 / ARCH-REV-008 / IR-013 / CRR-023 and API-REV-011 downstream proof | R-041–R-042; AC-031, AC-037; `prerequisite-runner-startup.log` (14/14); `teamrun-two-id-lifecycle.log` (4/4) | None |
| `API-F-007`: token migration left a historical task-Team row rooted at `taskTeamRun1` rather than reconstructing `rootA`, `[taskTeamRun1]`, and `/StudentStudyGroup/student_one` | Source-resolved by IR-014/IR-015 and CRR-027; API/E2E resolution pending | R-036/R-041; AC-029/AC-032; prior focused 3/4 log; current planner/index/migrator/store/aggregate | Recheck through maintained canonical-owner durable coverage before closing |

## Investigation Decision

- Proceed To Further API/E2E Execution: `Yes`; CRR-027 is a source Pass and authorizes API-REV-012 to resume from the 61% checkpoint.
- Repository-Resident Durable Coverage Expected: `Yes` — replace/retarget old token-owner tests at the canonical aggregate/planner/migrator/store boundary and maintain any remaining stale migration/provider-instruction coverage. Record the final added/updated/removed inventory after execution. Do not edit production source in this stage.
- Starting confidence: prior completed API-REV-011 `61%`; API-REV-012 final confidence is pending repository and broader execution.
- Broader validation decision: `Required`, including the imported three-runtime live matrix and the newly explicit real-browser frontend Agent/AgentTeam creation/execution matrix for AutoByteus, Codex, and Claude.
- Reroute Required Before Further Validation Execution: `No` at investigation start. Any critical repository/live/browser failure will be classified and routed or reported as Blocked under the skill.
- Recommended Recipient: none until API-REV-012 completes, fails, or becomes genuinely blocked.
- Notes: `API-F-001`–`API-F-006` remain resolved. `API-F-007` is source-resolved but not downstream-closed. Real testing must use an isolated exact SQLite target prepared by `pnpm secrets:import`; neither the user's operational database nor a passing skip is allowed. SR-014 exact instruction parity is now in scope across deterministic, live, and browser evidence.

## API-REV-012 Final Evidence And Decision

The round-12 investigation was completed before durable edits and remained authoritative as evidence changed. The execution result is `Fail / 84%`.

### Final validity decisions

- The historical token-usage owner tests were `Stale / Replace`, not mechanically updated. They were removed and replaced by current canonical planner/migrator/transactional-store/aggregate unit and GraphQL coverage. Replacement evidence passes 5/5 plus 1/1.
- The six individually adjudicated migration fixtures were `Needs Update`; after current schema-v3/dependency maintenance, the seven-file selection passes 29/29.
- Existing provider bootstrap/composer fixtures were `Needs Update`, and one three-provider parity suite was `Add Durable Coverage`; the resulting five-file selection passes 21/21.
- The live harness database hard-code was `Needs Update`; it now accepts and verifies the exact disposable test database rather than silently using the tracked `.env.test` default.
- The imported nested-classroom scenario was `Add Real Validation` and remains authoritative. It exposed implementation behavior not covered by the focused repository selection; it must not be weakened or removed.
- Whole-server and whole-web baselines remain `Non-clean / individually adjudicate after source fix`, not accepted as current authority and not counted as a pass.

### Real execution conclusions

1. The secret vault was made ready for the exact disposable database through the repository importer. Evidence: `api-e2e-evidence-sr015/live/secrets-import-result.log` and `secrets-import-postcheck.log`.
2. Browser-created standalone Agents pass on AutoByteus `gpt-5.6-luna`, Codex App Server `gpt-5.6-luna`, and authenticated Claude `sonnet`. Evidence: `api-e2e-evidence-sr015/live/browser/standalone-agent-three-runtime.json` plus screenshots.
3. Public package import and rooted metadata pass for the staged fixture, exact handoff overlays, root/nested coordinators, and all five canonical addresses.
4. `get_handoff_rules` passes its exact minimal ordered result.
5. `API-F-008` fails persistent Team-recipient delivery: `./StudentStudyGroup` resolves to `/StudentStudyGroup/student_one`, but its persistent `agentRunId` is subsequently interpreted as a task AgentRun, returning `TASK_AGENT_RUN_NOT_FOUND` and persisting no communication record.
6. `API-F-009` fails task-Team activation: the valid Team target is rejected because the task registry looks up a Team at the coordinator Agent address, returning `status:not_started` and persisting no task record.
7. Termination/restoration independently passes and preserves the root topology and handoff snapshot.
8. The AutoByteus Team row is `Fail`; the Codex and Claude Team rows are `Not Tested after common critical root-boundary failure`. The three-row matrix is not a pass.

### Outcome routing

- Result: `Fail`.
- Preliminary failure origin: implementation for `API-F-008` and `API-F-009`, subject to `code_reviewer` focused origin review.
- Secondary origin question: browser Activity renders the two rejected structured results as `SUCCESS`; classify whether the native tool/result projection or UI status mapping must change.
- Do not request compatibility fallback, alternate identity, redundant routing coordinates, or weakened test assertions.
- Resume after source correction by rerunning the exact AutoByteus trigger first, then complete fresh Codex and Claude nested-classroom Team rows and final focused/broader validation.
- Authoritative analysis: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/api-e2e-evidence-sr015/live/nested-classroom-live-failure-analysis.md`.

## API-REV-013 Post-IR-017 Coverage Investigation And Execution Plan

This section was written on 2026-08-09 before any API-REV-013 durable edit, removal, final execution, or failure reroute. Static inventory evidence is `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/api-e2e-evidence-sr015/api-rev-013-initial-coverage-investigation.log`.

### Prior-result recheck and changed boundaries

- Prior completed result: `API-REV-012` — `Fail / 84%`.
- Source authorization: `IR-017` / `b877d343b30fe01bd2f39546c0e8279adbd00dff`; `CRR-029` Pass.
- Required rechecks: `API-F-008` persistent nested Team delivery and `API-F-009` task-Team activation.
- Changed production boundaries: resolved delivery now crosses `TeamRun` / backend / child manager as one complete request; final persistent/task handles validate exact kind, address, task identity, and AgentRun. Task-Team registry now looks up the Team at `request.teamNode.address` and validates its coordinator and ordered execution chain.
- No frontend Activity semantic change is approved or expected. A completed tool invocation may remain visually successful while its structured collaboration operation is rejected; API-REV-013 does not invent a new badge contract.

### Current coverage validity decisions

| Coverage / Surface | API-REV-013 Decision | Reason | Required Action |
| --- | --- | --- | --- |
| `tests/unit/agent-team-execution/mixed-sub-team-member-handle.test.ts` | `Needs Update` | Its child TeamRun fake still exposes/asserts raw `postMessage`. IR-017 deliberately replaces that lossy boundary with `deliverResolvedInterAgentMessage`. The useful exact target/run/trace/one-delivery assertions remain valid. | Retarget only the child fake and assertions to the complete resolved request. Add fail-closed identity evidence if it fits this owner; do not weaken the prior scenario. |
| `tests/unit/agent-team-execution/task-delegation-service.test.ts` | `Still Valid / Recheck` | CRR-029's 17/17 result is source-review evidence only. The service still owns direct-child policy, task identities, and pre-mutation admission. | Rerun unchanged with the current task-Team registry seam. |
| Existing mixed manager, child handle, delivery-coordinator, and task lifecycle selections | `Still Valid / Recheck` | These are the nearest durable regression owners for API-F-008/API-F-009 and their adjacent persistent/task identity invariants. | Execute narrow affected selection after the bounded fake maintenance, then the cumulative changed-server selection. |
| API-REV-012 canonical token/migration/provider durable delta | `Still Valid / Recheck` | IR-017 changes only routing/activation source. Prior passing evidence remains relevant but is not post-fix regression proof. | Rerun the focused current selections and include them in the final cumulative durable inventory. |
| API-REV-012 isolated live harness and staged fixture overlay | `Still Valid` | They use public import, exact disposable database injection, and the user-approved fixture/overlay. No secret or source fixture was mutated. | Allocate a new API-REV-013 disposable root/database, run actual `pnpm secrets:import`, stage/import the same deterministic fixture, and verify hashes again. |
| AutoByteus imported nested-classroom row | `Required Recheck` | This is the exact real trigger for API-F-008/API-F-009. Reviewer built probes cannot replace it. | Launch a fresh root TeamRun on AutoByteus `gpt-5.6-luna`; prove exact handoffs, one persistent child delivery, task-Team creation/submit/review, histories, and lifecycle. |
| Codex and Claude imported nested-classroom rows | `Required Fresh Validation` | They were explicitly Not Tested in API-REV-012 and cannot inherit the AutoByteus result. | Run fresh root TeamRuns for Codex `gpt-5.6-luna` / medium and authenticated catalog-exposed Claude, using all members on the row runtime. Missing capability/credential is Blocked/Fail, never a passing skip. |
| Standalone Agent browser matrix | `Still Valid / Regression Smoke Optional` | API-REV-012 directly passed all three runtimes through the browser, and IR-017 changes Team-only routing. | Preserve prior direct evidence. Rerun only if fresh setup or provider behavior calls it into question; do not let it substitute for Team rows. |
| Whole-server and whole-web baselines | `Non-clean / Proportionate Recheck` | API-REV-012 recorded large unrelated non-clean baselines. Their existence is not acceptance, but another undifferentiated full run has low diagnostic value. | Execute production typecheck/build, cumulative changed-server selection, affected frontend handler suites, and targeted API/E2E/runtime selections. Reuse the prior whole-suite classification unless a changed-surface failure requires broader expansion. |

### Planned execution order

1. Run the current affected child/task selection before edits to reproduce any stale fake failure.
2. Apply the bounded durable child-fake correction, then rerun the affected unit/integration/API/E2E selections.
3. Recheck canonical token, maintained migration, provider-instruction, production typecheck, full build, and current cumulative changed-server coverage.
4. Allocate a new isolated API-REV-013 application-data root and SQLite database on ports 60002/31002; actual-import `/Users/normy/.autobyteus/server-data/.env` through `pnpm secrets:import`; record identifier/status evidence only.
5. Stage and publicly import the nested-classroom fixture with the approved overlays, preserving source hashes.
6. Through the real frontend and built server, execute fresh AutoByteus, Codex, and Claude Team rows. For every row capture effective runtime/model, root/member/task run identities, exact handoffs, persistent nested delivery exactly once, task-Team start/submit/review, history-visible outcomes, lifecycle, browser screenshots, and correlated server evidence.
7. Reassess confidence. Any critical failure is recorded and routed to `code_reviewer`; an eventual Pass with any repository-resident durable delta returns for proportional test-code review.

### Starting confidence and broader-validation decision

- Starting confidence: `84%`, inherited only as the prior completed API-REV-012 result.
- Current result: pending; no IR-017 reviewer probe is counted as API/E2E completion.
- Broader validation: `Required` because two prior critical defects were found only through the real imported Team journey, and two mandatory provider rows remain unexecuted.
- Pass gate: every critical row directly passes, overall confidence is at least 95%, no category is below 90%, no current changed-surface deterministic failure remains, and the cumulative durable delta has a successful proportional code-review pass.

### API-REV-013 initial affected-selection validity update

The pre-maintenance five-file selection (`api-e2e-evidence-sr015/api-rev-013/affected-initial.log`) passed 31/33 and failed only two now-adjudicated stale fixtures:

- `mixed-sub-team-member-handle.test.ts` is confirmed `Needs Update`: its fake lacks `deliverResolvedInterAgentMessage` and still asserts the removed raw `postMessage(message,target,runId)` child boundary. Retain the exact canonical request/run/trace expectation and assert the unchanged resolved request/callback crosses the child boundary once.
- `mixed-team-manager.test.ts` is newly classified `Needs Update`: its task-Team lifecycle fixture places `receiver.memberAddress` at Team `/BuildSquad`, while the approved/current activation request enters through exact configured coordinator `/BuildSquad/review_lead`. Retarget the positive fixture to the coordinator and add one bounded no-start assertion for a mismatched receiver so the new fail-closed seam is durable.
- The unchanged task-delegation service (17/17), task lifecycle integration (6/6), and delivery coordinator (2/2) remain `Still Valid`.

Both failures are API/E2E-owned stale fixtures, not implementation defects. This decision is recorded before the bounded edits below.


## API-REV-013 Final Evidence And Decision

API-REV-013 completes as `Fail / 90%`. The investigation was written before the current-round durable edits, final execution, or reroute and remained authoritative as evidence changed.

### Durable coverage decisions and results

- `mixed-sub-team-member-handle.test.ts` was updated only at the approved child resolved-delivery boundary: the fake now receives the complete immutable `ResolvedInterAgentMessageDeliveryRequest` plus the one callback, and raw `postMessage` is not an authority.
- `mixed-team-manager.test.ts` was corrected to use the configured task-Team coordinator as receiver and now includes a no-start mismatched Team-address case.
- Current-round durable delta: `0 added / 2 updated / 0 removed`; cumulative dirty server-test delta remains `4 added / 52 updated / 2 removed`. No production source was edited by API/E2E.
- Affected post-maintenance coverage passes `5 files / 34 tests`; canonical migration/provider coverage passes `14 files / 55 tests`; the exact changed-server test selection passes `46 files` with `297 passed / 20 skipped tests`; affected web coverage passes `2 files / 34 tests`; production typecheck and `build:full` pass.
- The previously recorded non-clean whole-server and whole-web baselines remain honestly classified as non-clean/unrelated rather than converted into acceptance. The proportionate current selection is the new post-IR-017 evidence.

### Real environment and browser result

- Actual `pnpm secrets:import` configured 9 identifiers in the exact disposable database; dry-run postcheck reports `READY`, 9 `SKIP_CONFIGURED`, and 0 blocked. No value was recorded.
- Public `LOCAL_PATH` package import passes against a newly staged package whose per-file hashes match the prior approved overlay; source fixture and source `.env` hashes remain unchanged.
- Fresh AutoByteus `gpt-5.6-luna` root TeamRun `nested_classroom_test_team_20ce2140b0124e5abb2e3bf4ee04d12c` passes rooted schema/coordinators, exact handoff projection, persistent root-to-child-Team delivery, nested relative peer delivery, nested absolute-root reply, task-Team creation, exact task coordinator ingress, and distinct persistent/task coordinator AgentRun identities. Thus API-F-008/API-F-009 are downstream-resolved.
- `API-F-010` then fails AC-028/AC-030/AC-043. Active task coordinator AgentRun `student_one_e1e50...` sends `./student_two`; the tool reports `DELIVERED`, but the persisted receiver loses task TeamRun `team_local_team_nested_classroom_test_student_st_5c812d9dde5444e69a635bec25f001c2`, uses an empty task chain, and starts persistent peer AgentRun `student_two_c238...`. The task remains active with no submission/review.
- Codex and Claude imported Team rows are `Not Tested after common critical task-Team routing failure`, not skips or passes. Prior real standalone browser Agent rows across all three runtimes remain passing but do not satisfy the Team matrix.

### Confidence scorecard

| Category | Final | Evidence and gap |
| --- | ---: | --- |
| Requirement and acceptance-criteria proof | 80% | Prior migration/provider/standalone coverage plus current persistent and task-Team ingress rechecks pass; exact task-run peer messaging and submit/review fail, and two Team rows remain unexecuted. |
| Changed-boundary execution directness | 95% | Current durable selections plus a real built-server/Nuxt/provider execution directly exercise IR-017 and the newly failing root materializer. |
| Cross-boundary integration realism and mock gap | 90% | Real package import, Prisma, WebSocket, browser, provider, persistent child, and task-Team runtime were correlated; provider-specific Team parity remains incomplete after the shared failure. |
| Environment, configuration, identity, and fixture fidelity | 98% | Exact isolated DB/root, actual importer, unchanged source, public import, Luna configuration, fresh typed IDs, and preserved evidence. |
| Failure, edge-case, lifecycle, and recovery evidence | 90% | Deterministic negatives, accepted-but-misrouted projection, active task state, and root termination are direct; submit/review/restore with completed work cannot execute. |
| User-surface, browser, and desktop-shell confidence | 82% | Real frontend creates/runs the imported Team and prior standalone Agents pass all runtimes; the task journey visibly cannot finish and two Team rows remain untested. Electron-shell-only behavior is not material. |
| Durable regression coverage quality and relevance | 92% | Current routing/migration/provider selections are focused and clean; the newly exposed same-task peer route lacks a passing implementation regression until source correction. |

Arithmetic mean: `89.6%`, reported as `90%`. The critical failed acceptance criteria override the score.

### Outcome routing

- Result: `Fail`.
- New failure: `API-F-010` / `SR015-LIVE-TASKTEAM-002`.
- Preliminary origin: shared root recipient materialization drops the sender's active task-Team chain and always selects persistent runtime identity; exact owner remains subject to `code_reviewer` focused failure-origin review.
- Durable coverage changed this round, but successful proportional test-code review remains deferred because the overall result is Fail. Preserve both updated tests; do not weaken the real scenario.
- Resume only after focused origin review and source correction. Add/maintain a task-Team same-execution relative-peer regression, rerun the exact AutoByteus trigger, then complete fresh Codex and Claude rows.
- Authoritative failure analysis: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/api-e2e-evidence-sr015/api-rev-013/live/nested-classroom-live-failure-analysis.md`.


## API-REV-014 Post-IR-018 Coverage Investigation And Execution Plan

This section was written on 2026-08-09 before any API-REV-014 durable edit, removal, final execution, or failure reroute. Static inventory evidence is `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/api-e2e-evidence-sr015/api-rev-014/initial-coverage-investigation.log`.

### Prior-result recheck and changed boundaries

- Prior completed result: `API-REV-013` — `Fail / 90%`. It is chronological evidence and will not be rewritten.
- Source authorization: `IR-018` / `035fba611e6895187f7f6d4644993e22efd8c38c`; `CRR-031` Pass.
- Required recheck: `API-F-010` / `SR015-LIVE-TASKTEAM-002`, exact active task-Team peer messaging followed by task-result submission and root review.
- Changed production boundaries: the root manager now validates every nonempty sender task-Team chain through `TaskTeamMessageExecutionResolver`, materializes an in-scope peer from the exact active task TeamRun with the complete ordered chain and exact task-scoped AgentRun, then delivers through the authoritative TeamRun boundary. A target outside the proven task Team retains ordinary persistent routing only after complete task-scope proof.
- Existing real proof retained but not re-counted as post-fix evidence: API-REV-013 persistent nested delivery, task-Team ingress, isolated vault/package import, and the pre-fix API-F-010 record. Fresh runtime rows are still required.

### Current coverage validity decisions

| Coverage / Surface | API-REV-014 Decision | Reason | Required Action |
| --- | --- | --- | --- |
| `tests/unit/agent-team-execution/mixed-sub-team-member-handle.test.ts` | `Still Valid / Preserve` | API-REV-013 corrected the child fake to forward the complete resolved request/callback. IR-018 depends on that exact boundary and CRR-031 confirms it remains valid. | Preserve unchanged and rerun. Do not restore raw `postMessage` authority. |
| `tests/unit/agent-team-execution/mixed-team-manager.test.ts` existing API-REV-013 corrections | `Still Valid / Preserve` | Exact coordinator ingress plus wrong-receiver no-start coverage remains authoritative for API-F-009. | Preserve both corrections and rerun. |
| `tests/unit/agent-team-execution/mixed-team-manager.test.ts` task peer route | `Add Durable Coverage` | The file currently covers persistent Team materialization and task-Team activation, but it does not durably prove API-F-010's exact same-task-Team peer materialization, full chain, task-scoped AgentRun, one TeamRun delivery/event, and zero persistent fallback. | Add one bounded positive same-task-Team peer scenario plus proportionate fail-closed assertions if naturally owned by the same fixture. No production edit. |
| `tests/unit/agent-team-execution/team-member-delivery-coordinator.test.ts` | `Still Valid / Recheck` | It owns one normalization/trace/event path. It need not duplicate active-directory admission but must remain clean after the route abstraction. | Rerun unchanged unless the bounded manager scenario exposes a stale seam. |
| Task active-run directory, manager, child handle, and task lifecycle selections | `Still Valid / Recheck` | These are the nearest deterministic owners for chain identity, child delivery, activation, and settlement. | Execute narrow affected coverage before and after maintenance, then cumulative changed-server coverage. |
| Canonical token/migration/provider-instruction durable delta | `Still Valid / Recheck` | IR-018 is routing-only, but these current SR-015 changes remain in the cumulative package. | Rerun the focused canonical selection and include all paths in the final inventory. |
| AutoByteus imported nested-classroom row | `Required Fresh Recheck` | It is the exact real API-F-010 trigger and must prove peer reply, exact task chain/run, `submit_task_result`, and accepted `review_task_result`. | Use a new isolated vault/root/database, actual importer, public package import, fresh browser-created AutoByteus Luna TeamRun, and correlated GraphQL/WebSocket/server evidence. |
| Codex and Claude imported nested-classroom rows | `Required Fresh Validation` | They remain Not Tested as Team rows. Shared implementation source does not substitute for provider execution. | Run fresh imported Team rows for Codex Luna/medium and authenticated catalog-exposed Claude; missing capability/credential is Blocked/Fail, never a passing skip. |
| Frontend standalone Agent matrix | `Still Valid / Targeted Smoke` | API-REV-012 directly passed browser creation/execution for all three runtimes and IR-018 is Team-only. | Preserve the direct prior evidence; run fresh browser frontend/Team interactions for all three runtimes and repeat standalone smoke only if catalog/setup behavior signals regression. |
| Whole-server and whole-web baselines | `Non-clean / Proportionate Recheck` | Prior whole-suite failures were individually classified outside the collaboration changes. A blind full rerun would not replace changed-boundary proof. | Run production typecheck/build, affected unit/integration/API/E2E, cumulative dirty test selection, and affected web suites; expand only on a changed-surface signal. |

### Planned execution order

1. Execute the current affected routing selection before maintenance and record the baseline.
2. Add bounded durable same-task-Team peer coverage at the root manager/active TeamRun boundary while preserving both API-REV-013 fixture corrections; rerun affected and cumulative deterministic coverage.
3. Recheck canonical migration/token/provider coverage, production typecheck, `build:full`, affected frontend suites, and current-authority audits.
4. Allocate a new API-REV-014 application-data root and exact SQLite database on owned ports; use an actual TTY `pnpm secrets:import` from `/Users/normy/.autobyteus/server-data/.env`, record identifiers/status only, then verify `READY`, runtime catalogs, and source hashes.
5. Stage and publicly import the approved nested-classroom package without mutating the source fixture.
6. Through the real frontend and built server, execute fresh AutoByteus, Codex, and Claude Team rows. Capture exact runtime/model/config, root/member/task identities, handoffs, persistent nested delivery, task-Team same-peer routing, reply, submit/review, history-visible state, lifecycle, browser state/screenshots, and correlated server evidence.
7. Reassess confidence, update canonical reports, append exactly one API-REV-014 completed entry, clean owned processes/data as appropriate, and route a Pass with the cumulative durable delta for proportional test review or a critical failure for focused origin review.

### Starting confidence and broader-validation decision

- Starting confidence: `90%`, inherited only as the prior completed API-REV-013 result.
- Current result: pending. CRR-031's source probes are not counted as completed API/E2E proof.
- Broader validation: `Required`; the prior defect existed only in the real imported task-Team journey, and two required provider Team rows remain unexecuted.
- Pass gate: exact AutoByteus/Codex/Claude Team rows all pass; task peer reply plus submit/review is directly observed with exact current identities; every critical acceptance criterion is proven; overall confidence is at least 95% with no category below 90%; current deterministic checks are clean; and the cumulative durable test delta is returned for proportional review.

## API-REV-014 Final Evidence And Decision

API-REV-014 completes as `Pass / 96%`. The investigation above was written before the current-round durable edit and final execution and remained authoritative as evidence accumulated.

### Final coverage decisions

- The API-REV-013 `mixed-sub-team-member-handle.test.ts` complete child resolved-delivery correction remains valid and unchanged.
- The API-REV-013 exact task coordinator ingress and wrong-receiver no-start assertions in `mixed-team-manager.test.ts` remain valid.
- `mixed-team-manager.test.ts` now also owns one bounded exact same-task-Team peer scenario. It proves the full task chain, exact task-scoped peer AgentRun, one child TeamRun delivery, one root event, and zero persistent fallback.
- No durable test file was removed or weakened in this round. Current-round delta is `0 added / 1 updated / 0 removed`; cumulative dirty server-test delta is `4 added / 52 updated / 2 removed`.
- Existing canonical migration/token/provider-instruction and affected frontend coverage remains valid and passes its final selections.
- Prior whole-server/web broad failures remain a classified non-clean baseline, not passing authority. The accidental whole-web invocation was stopped and the exact affected web command passed.
- The prior browser standalone-Agent matrix remains valid because IR-018 is Team-only. Fresh browser AgentTeam creation and interaction nevertheless ran on every required runtime.

### Final execution evidence

| Coverage / Surface | Final Result | Evidence |
| --- | --- | --- |
| Affected task routing/lifecycle | Pass: 5 files / 35 tests | `api-rev-014/affected-final.log` |
| Canonical migration/token/provider | Pass: 14 files / 55 tests | `api-rev-014/canonical-migration-provider-final.log` |
| Cumulative changed server tests | Pass: 46 files / 7 skipped; 298 tests / 20 declared skips | `api-rev-014/changed-server-tests-final.log` |
| Production typecheck/build | Pass | `api-rev-014/production-typecheck.log`; `api-rev-014/build-full.log` |
| Affected frontend | Pass: 2 files / 34 tests | `api-rev-014/web-affected-final.log` |
| Actual isolated `pnpm secrets:import` | Pass: `READY`, nine configured IDs, zero blocked | `api-rev-014/live/secrets-import-result.log`; postcheck |
| Public staged package import/catalog | Pass | `api-rev-014/live/runtime-catalog-and-package-import.json` |
| AutoByteus Luna imported Team | Pass | `api-rev-014/live/nested-classroom-autobyteus-postfix.json` |
| Codex Luna explicit medium imported Team | Pass | `api-rev-014/live/nested-classroom-codex-postfix.json` |
| Claude authenticated `sonnet` imported Team | Pass | `api-rev-014/live/nested-classroom-claude-postfix.json` |
| Terminate/restore/final inactive lifecycle | Pass | `api-rev-014/live/autobyteus-terminate-restore-lifecycle.json` |
| Browser configuration/creation/interaction | Pass on all three rows | `api-rev-014/live/browser/`; browser resource audit |

### Prior failure resolution

| Prior Scenario / Failure | Previous Classification | Current Resolution | Evidence |
| --- | --- | --- | --- |
| `API-F-010` / `CR-F-018` | Task-Team peer accepted but substituted persistent execution, preventing submission/review | Resolved by IR-018 / CRR-031 and downstream real execution. AutoByteus, Codex, and Claude each preserve the exact task TeamRun on both peer messages, use distinct task AgentRuns, submit the exact result, and reach accepted review. | `live/nested-classroom-live-matrix-summary.json`; three structured row files |
| `API-F-008` / `API-F-009` | Previously resolved persistent child delivery and task-Team activation defects | Remain resolved in every fresh live row and current deterministic selection. | Same matrix and affected evidence |
| `API-F-001`–`API-F-007` | Resolved implementation or stale-coverage findings | Remain resolved; canonical, migration, provider, and changed-server selections pass. | Current final deterministic evidence plus prior canonical records |

### Environment and cleanup disclosure

The first server-start attempt incorrectly inherited the user's operational `DATABASE_URL` despite a test `--data-dir`. Before containment it applied one pending Prisma migration and wrote a failed canonical migration result with 203 failures to `/Users/normy/.autobyteus/server-data/db/production.db`. No risky rollback was attempted. All accepted live evidence was then produced only after explicitly sourcing the test-owned environment and verifying the exact disposable datasource. This is recorded as an API/E2E setup defect and lowers environment confidence; it is not hidden or counted as a product pass. Evidence is `live/server-environment-collision.log` and `live/server-environment-collision-analysis.md`.

After final evidence capture, every run was inactive, owned browser/server/frontend processes stopped, ports closed, disposable app-data/database/vault/staged package removed, and source `.env` plus source fixture hashes remained unchanged. The operational database side effect was intentionally not automatically reversed.

### Final confidence and routing

- Requirement and acceptance proof: `98%`.
- Changed-boundary directness: `98%`.
- Cross-boundary realism: `98%`.
- Environment/configuration/identity fidelity: `90%` because of the disclosed initial operational-DB collision.
- Failure/lifecycle/recovery evidence: `96%`.
- User-surface/browser confidence: `97%`.
- Durable regression coverage quality: `98%`.
- Overall confidence: `96%` (arithmetic mean 96.4%, rounded).
- Every critical criterion proven: `Yes`.
- Applicable category below 90%: `No`.
- Overall result: `Pass`.
- Open implementation/API/E2E failure ID: `None`.
- Required next route: `code_reviewer`, because repository-resident durable coverage changed. The cumulative package, coverage investigation, execution report, revision record, changed durable tests, and evidence must receive proportional test-code review before delivery.

## API-REV-015 CRR-032 Final Coverage-Package Decision

API-REV-015 completes the pre-edit round-15 plan above as `Pass / 96%`. It reissues the cumulative durable-coverage package only; CRR-032 explicitly preserved API-REV-014's successful product/runtime result, the real three-provider matrix, and resolution of API-F-010.

### TR-F-002 adjudication and correction

- The seven capability-gated runtime E2Es were individually classified `Replace / Restore`. Their only ticket diffs mechanically changed the collaboration tool argument while their launch/query/socket setup remained pre-current (`memberName` / `memberRouteKey` create inputs, and in the nested suite schema-v2 path/segment shapes). They were restored byte-for-byte to artifact HEAD and are not represented as maintained, executed, skipped-pass, or current-contract evidence in this ticket. Current durable unit/integration/API coverage plus API-REV-014's real imported AutoByteus/Codex/Claude Team matrix replace their intended changed-boundary evidence.
- Both duplicate XML-patch prompt tests were classified `Out Of Scope / Restore`. They are Vitest-excluded and import a deleted owner, so their mechanical ticket edits were restored byte-for-byte to artifact HEAD and are not counted.
- Restoration verification covers all nine paths with zero ticket diff and SHA-256 evidence in `api-e2e-evidence-sr015/api-rev-015/restored-stale-paths-final.log`.
- The corrected active server selection contains exactly 46 executable changed test files plus one shared fixture. All 46 files pass, 298/298 tests pass, and there are zero skipped files/tests in the maintained selection. Evidence: `api-e2e-evidence-sr015/api-rev-015/changed-server-tests-final.log`.

### TR-F-003 inventory, ownership, and isolation correction

- One exact cumulative disposition inventory now spans the server, the two web tests, both durable live-E2E support files, both removed/replaced tests, and the nine restored/out-of-delta paths: `api-e2e-evidence-sr015/api-rev-015/cumulative-durable-coverage-inventory.tsv`.
- Current delta: `53` paths = `4 added / 47 updated / 2 removed`. Component split: `49 server`, `2 web`, `2 live-E2E support`. The inventory also records `9` restored paths as explicitly outside the current delta, for `62` total disposition rows.
- API/E2E owns `test-support/live-e2e/live-e2e-harness.ts` and `test-support/live-e2e/run-live-e2e.mjs` in this cumulative maintenance package. The changes propagate the exact launched disposable SQLite target and make the in-process harness reject any target mismatch before scenario execution.
- Focused isolation proof passed against an owned disposable runtime/database: an exact explicit database was accepted (`1` preflight file passed), a second safe but mismatched test database failed closed with `LIVE_E2E_DATABASE_TARGET_MISMATCH`, no operational database was referenced, and all owned runtime/database artifacts were removed. Evidence: `api-e2e-evidence-sr015/api-rev-015/live-harness-isolation-final.log`.
- The affected web tests remain valid and pass `2 files / 34 tests`. Production TypeScript, full build/bootstrap smoke, launcher syntax/propagation audit, and diff hygiene pass.

### Final broader-validation and confidence decision

- No live product rerun was required for this bounded correction. Restoring obsolete skipped/excluded edits and adding harness safety proof cannot change the production/runtime behavior already proven by API-REV-014. The prior real browser/imported nested-classroom AutoByteus `gpt-5.6-luna`, Codex `gpt-5.6-luna` with medium reasoning, and authenticated Claude `sonnet` rows remain direct evidence and were explicitly preserved by CRR-032.
- The repository importer statement is precise: `pnpm secrets:import` made the vault `READY` for the exact disposable test runtime/database used in API-REV-014 because the imported source and target configuration were valid. It does not make every environment's vault ready automatically; readiness is scoped to the selected application-data root/database and must be confirmed by the post-import status check.
- The disclosed mutation to `/Users/normy/.autobyteus/server-data/db/production.db` remains visible. No automatic rollback was attempted. This local-fix execution used only test-owned SQLite paths and did not reference that operational database.
- Final confidence remains `96%`: every critical acceptance path retains direct real evidence, the corrected maintained durable selection is fully executable, and database-target isolation now has direct fail-closed proof. No category is below 90% and no API/E2E or test-review finding remains open pending proportional re-review.
- Routing: return API-REV-015 and the exact cumulative durable path package to `code_reviewer`; delivery remains gated on a proportional test-code Pass.

### Final API-REV-022 investigation update

API-REV-022 is complete as `Fail / 84%` and routes `API-F-015` for focused failure-origin review.

- `API-F-014` remains resolved in deterministic coverage: the exact CRR-047 sender-mapping selection passes `4/4`.
- Durable current-contract maintenance is complete and green: `42 changed web test files / 297 tests` pass, with one added reusable current Team fixture. The preserved cumulative delta is `1 added / 42 updated / 0 removed`; exact inventory and patch are under `api-rev-022/investigation/`. It is not submitted for proportional successful-test review while the overall round is failed.
- Server affected coverage passes `8 files / 52 tests`; production server typecheck, server `build:full`/sanitized bootstrap smoke, and Nuxt production build pass.
- The checked live environment passed every safety gate: ambient database selectors excluded, exact disposable `.env` preflight, actual TTY secret import into the disposable vault/database, checked server launch, PID exact-path lsof proof, separate frontend/browser, and owned cleanup. The home-folder operational database was never targeted or inspected.
- Fresh AutoByteus `gpt-5.6-luna` directly passes imported nested-Team routing, task count/details, active/awaiting-review/accepted, task-Team peer request/reply, exact submit/review, refresh-retained task record, and terminal transient cleanup.
- `API-F-015`: real inter-Agent messages are persisted with exact rooted sender/receiver addresses but never project into the addressed conversation. Browser DOM contains zero inter-Agent inline elements before and after refresh and logs `No member context found for message, skipping`. Current source emits `receiver_address`; the frontend exact resolver and its passing mock expect `execution_address`. The producer/consumer mismatch is a preliminary implementation `Local Fix`.
- The failure package is `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/api-e2e-evidence-sr015/api-rev-022/api-f015-live-inter-agent-projection-failure-analysis.md`.
- Codex, Claude, and fresh standalone Agent rows are `Not Tested` in this round. Execution stopped at the first critical common frontend failure; no provider skip is reported as a pass.
- All owned runs/processes/runtime/database/vault/staging were terminated or removed. The source fixture is hash-unchanged. No user application process was stopped or repointed. Historical API-REV-014/API-REV-018 operational-database disclosures remain preserved.

Final scorecard: requirement proof `75%`; changed-boundary directness `86%`; integration realism `80%`; environment/identity/fixture fidelity `98%`; lifecycle/recovery `92%`; user-surface/browser `68%`; durable coverage quality `90%`. Arithmetic mean `84.1%`, reported as `84%`. A critical user-visible assertion fails, so the round cannot Pass regardless of score.

## API-REV-023 Post-IR-027 Coverage Investigation (Pre-edit Baseline)

### Trigger, state, and prior-result handling

- Trigger: `CRR-049` Pass for `IR-027` at HEAD `03c22efb9d4bf178339cddba26b10f42a5fc99a7`, related to `SR-015` / `ARCH-REV-009`.
- Prior authoritative API/E2E result: `API-REV-022 Fail / 84%`. Its safe-target AutoByteus task-UI journey remains useful historical evidence, but neither that row nor its provider omissions can be promoted into the current result.
- Source-reviewed correction: exact Team `MEMBER_INPUT_MESSAGE.execution_address` now carries the unchanged recipient execution address; the Team-only synthetic `INTER_AGENT_MESSAGE` producer and unit-only assertion were removed. Genuine global Agent `INTER_AGENT_MESSAGE` remains outside this Team transport correction.
- Current coverage round: `API-REV-023`. This investigation entry is written before the current-round durable edit and before final execution, as required.

### Failure re-adjudication and durable coverage decisions

| Path / assertion | Current decision | Reason and replacement evidence |
| --- | --- | --- |
| `autobyteus-web/services/agentStreaming/__tests__/TeamStreamingService.spec.ts` synthetic Team `INTER_AGENT_MESSAGE` assertion | `Stale / Replace` | It asserts the deleted Team-only synthetic transport and purple `inter_agent_message` segment. The approved mixed-Team transport is the recipient-visible exact `MEMBER_INPUT_MESSAGE` user/input transcript plus the separate `TEAM_COMMUNICATION_MESSAGE` projection. Replace only this scenario with persistent and nonempty task-Team exact recipient assertions, plus fail-closed missing identity/no fallback. |
| Same file's `TEAM_COMMUNICATION_MESSAGE` store assertion | `Still Valid / Retain` | It independently proves the side-panel communication projection and must not be conflated with the recipient transcript. |
| Global Agent `INTER_AGENT_MESSAGE` coverage | `Still Valid / Out of this Team edit` | CRR-049 explicitly preserves genuine global Agent support. No global Agent test will be weakened or removed. |
| Existing 41 other modified web tests and added `test-support/currentTeamTestFixtures.ts` | `Still Valid / Re-run` | They are the preserved current-root/task UI/history/navigation/mobile fixture package from API-REV-022 and passed 297 tests before IR-027. They require a fresh current-HEAD execution rather than inferred carry-forward. |
| Server mapper tests | `Still Valid / Re-run` | The maintained mapper test directly covers unchanged persistent and nonempty task-Team address identity. Add no redundant server test unless new execution evidence reveals a real gap. |

No production code change is authorized in this round. The expected durable delta remains the existing `1 added / 42 updated / 0 removed` package unless the bounded stale Team transport assertion produces an additional path disposition; edits within the already-modified `TeamStreamingService.spec.ts` do not change the path count.

### Requirement-to-evidence plan

1. **Exact recipient transcript:** emit current `MEMBER_INPUT_MESSAGE` payloads for a persistent member and a member under a nonempty ordered task-Team chain. Assert the standard user/input transcript appears only in the addressed execution context, preserves message identity/origin, and does not substitute the persistent execution.
2. **Strict identity / no fallback:** a missing exact `execution_address`, even if legacy/alternate recipient data is present, must be dropped with no conversation mutation.
3. **Separate Team communication:** retain direct `TEAM_COMMUNICATION_MESSAGE` projection proof for exact rooted sender/receiver addresses and message content.
4. **Current durable package:** execute the exact 42 changed web test files plus the added fixture dependency, then affected server mapper/collaboration selections, production TypeScript, server `build:full`/sanitized bootstrap, and Nuxt production build.
5. **Real AutoByteus first:** through a newly created checked disposable database/vault and browser stack, publicly import the nested classroom, execute the AutoByteus `gpt-5.6-luna` row, and directly inspect the recipient conversation for the sender-attributed user/input transcript while also proving Team communication, task count/details, exact task Agent/task-Team rows, active/awaiting-review/accepted transitions, refresh/restore, terminal cleanup, and same-task-Team peer/submit/review.
6. **Provider parity:** only after the common AutoByteus path passes, execute fresh Codex App Server `gpt-5.6-luna` with medium reasoning and authenticated Claude rows through the same imported Team/browser journey. Missing credentials/capability is `Blocked/Fail`, not a passing skip.
7. **Standalone Agent smoke:** after the required Team matrix, run fresh public standalone Agent creation/interaction on each available runtime when the same safe environment remains healthy, because the user explicitly requested all runtime Agent and AgentTeam browser validation.

### Mandatory environment safety plan

- Never target, open, inspect, copy, migrate, repair, roll back, delete, or otherwise act on `/Users/normy/.autobyteus/server-data/db/production.db`.
- Use only a new disposable absolute SQLite target and runtime root. Sanitize both `DATABASE_URL` and `DATABASE_URL_TEST` before child spawn; materialize an exact runtime `.env`; run configuration-only target preflight before database initialization; and use `test-support/live-e2e/test-runtime-bootstrap.mjs` `startBuiltTestServer` plus PID `lsof` exact-path verification after listen.
- Use an actual TTY `pnpm secrets:import` from `/Users/normy/.autobyteus/server-data/.env` only into that disposable target, without reading or printing secret values; require explicit vault `READY` evidence for the disposable environment.
- Use ports distinct from protected `60004/31004`, never stop/repoint that stack, and clean only processes/data created by API-REV-023.
- Preserve both historical operational-database incident disclosures. The user's statement that they repaired their database does not authorize inspection or mutation.

### Starting confidence and broader-validation decision

- Starting confidence: `84%`, inherited only as API-REV-022's completed failure score; CRR-049 source proof does not by itself raise API/E2E confidence.
- Broader validation: `Required`. The corrected boundary is a streamed frontend/backend identity projection and the prior contradiction occurred only in a real browser/provider journey.
- Pass gate: exact deterministic transcript/projection coverage passes; the complete current durable package and builds pass; safe environment guards pass; AutoByteus, Codex, and Claude imported Team rows all pass with exact recipient transcript and task lifecycle; every critical criterion has direct proof; overall confidence is at least 95% with no category below 90%; and the durable delta returns through proportional code review.

## API-REV-024 Fresh SR-018 Coverage Investigation (Pre-edit Baseline)

### Trigger and authority reset

- Trigger: `CRR-053` cumulative source Pass for `SR-018` / `ARCH-REV-011` / `IR-030` at HEAD `209daad0c74eeb78cc3631b26bdd53f197c10d56`.
- Prior completed authority remains `API-REV-022 Fail / 84%`. The pre-pause `API-REV-023` investigation, durable edit, and deterministic logs are explicitly non-authoritative and cannot be reused as SR-018 proof. No API-REV-023 result was completed or appended to the revision record; the fresh round is identified as `API-REV-024` to avoid ambiguous reuse.
- The current investigation entry is written before any SR-018 durable test change, removal, final execution, or failure reroute. Preserved dirty tests are inputs to re-adjudicate, not assumed authority.
- CRR-053 resolves `CR-F-028`, `CR-F-029`, and `CR-F-030` in source. It proves source readiness, not release readiness. The exact delayed task-Team parent-binding restore path and normal parent-before-child server snapshot sequence require durable and realistic downstream execution.

### Changed surfaces and boundary classification

| Surface | SR-018 boundary requiring evidence |
| --- | --- |
| Shared Team stream contract | Exact strict runtime schemas; snake-case Team DTOs; exhaustive server mapping and browser admission; `CONNECTED` handshake and root lifecycle separation; zero alias/surplus-field compatibility. |
| Server task execution | Activation prepare/start/commit-or-abort barrier; parent activation before held child events; exact Agent/task-Team identities; no synthetic task-instance/context/result run identities; failure cleanup. |
| Frontend aggregate | Immutable topology plus private five-variant `TeamExecutionState`; exact focus/navigation queries; one task projection index; no public raw-map/key authority; atomic snapshot reconciliation and cleanup. |
| Restore/reconnect | A valid nonterminal direct task-Agent child under a task Team is retained before its exact `task_team_agent` binding, remains unmaterialized, and materializes atomically with the exact parent after the binding; foreign/terminal contradictions do not mutate prior state. |
| API/GraphQL | Current task records require non-null exact `taskRun.address`, exact root/target ingress, immutable base identity, monotonic updates, all-or-nothing collection admission, and append-only reconciliation. |
| User/browser | Persistent/task Agent/task Team/nested task rows, task details/status/timeline, exact focus/open/history, member-input transcript, Team communication, refresh/restore, terminal cleanup, desktop and mobile projections. |
| Runtime/provider | Fresh imported nested-classroom TeamRuns on AutoByteus, Codex App Server, and authenticated Claude, plus standalone Agent creation/interaction across all available runtimes requested by the user. |
| Persistence/migration | Released Team/history/communication/task/token/external transition and exact startup gates on disposable data only; application predecessor data is discard/rebuild and must not acquire a compatibility reader/migration. |
| Application producer | Persistent/task/task-Team/nested-task Agent application producer address is exact at construction and current V5 path; no consumer-side repair or predecessor fallback. |

### Preserved dirty coverage adjudication

| Coverage group | Initial decision | Required action |
| --- | --- | --- |
| Preserved API/E2E package: 42 modified web specs plus `autobyteus-web/test-support/currentTeamTestFixtures.ts` | `Unclear / Re-investigate` | SR-018 replaced the public frontend execution representation. Execute a discovery selection, then retain only assertions expressed through current aggregate/query/public UI boundaries. Update or replace pre-SR-018 fixtures; do not restore deleted raw-map/key/projection modules. |
| Pre-pause `TeamStreamingService.spec.ts` member-input scenarios | `Needs Update / Revalidate` | The semantic replacement from synthetic Team `INTER_AGENT_MESSAGE` to exact `MEMBER_INPUT_MESSAGE` remains requirement-aligned, but its fixture and assertions must be moved to the strict SR-018 contract/aggregate and rerun fresh. Pre-pause 11/11 is not counted. |
| `teamTaskTeamExecutionProjection.spec.ts` and `teamTaskExecutionEventRouter.spec.ts` | `Stale / Replace or Remove` | They import deleted pre-SR-018 modules (`teamTaskExecutionTree`, `teamTaskExecutionRestore`, `teamTaskTeamExecutionProjection`, `teamTaskExecutionEventRouter`). They cannot remain maintained authority. Replace useful scenarios at `TeamExecutionState`, `teamTaskSnapshotReconciler`, strict stream admission, and rendered-query boundaries; otherwise remove with explicit replacement mapping. |
| New SR-018 aggregate/restore cases | `Add Durable Coverage` | Add focused durable coverage for all-or-nothing record admission, delayed parent-binding child restore, exact parent/foreign/terminal behavior, materialization/cleanup, focus/navigation reactivity, and retained terminal history invariants. |
| Server strict contract/activation/status/provider cases | `Use maintained tests plus broaden` | Discover current tests under the shared contract/server scopes, run current exact selections, and add coverage only if an acceptance-critical gap remains. No redundant implementation probe is counted as durable evidence. |
| Historical operational database evidence | `Disclosure only` | Preserve both incidents. The user's repair statement does not authorize inspection. No operational database path may be queried, opened, copied, migrated, or modified. |
| Delivery-owned ticket deletions/stash/backup and unrelated worktree state | `Out of API/E2E ownership` | Preserve untouched and exclude from durable coverage inventory/diff decisions. |

### Planned repository execution

1. Run pre-maintenance discovery against the exact preserved web paths and all tests importing deleted SR-017 projection owners; classify each failure as stale coverage, valid product failure, or unrelated baseline before editing.
2. Replace/remove obsolete projection tests with bounded SR-018 aggregate/restore/strict-stream tests. Retain the exact member-input transcript plus separate Team communication contract, current task UI/history/navigation/mobile tests, and no-fallback assertions.
3. Execute narrow aggregate/restore/stream suites, all maintained dirty web coverage, current server contract/activation/restore/provider/migration selections, shared-contract tests, production TypeScript, server `build:full`/sanitized bootstrap, Nuxt production build, diff/legacy-source audits, and explicit durable inventory.
4. If deterministic evidence is clean, run a real checked disposable restore/reconnect lifecycle that persists an active task Team with a nested direct task Agent, restarts/reopens the root, observes parent-before-child binding/materialization, exact focus/history, and terminal cleanup.
5. Through a fresh browser stack, publicly import the staged nested-classroom package and execute AutoByteus first, then Codex `gpt-5.6-luna` with medium reasoning and authenticated Claude. Directly observe exact persistent and task-Team recipient transcripts, Team communications, active/awaiting-review/accepted, transient task executions, peer message/reply, submit/review, refresh/restore, and cleanup.
6. While the same safe environment is healthy, create and interact with standalone Agents on every available runtime as explicitly requested by the user; classify any unavailable credential/capability as Blocked/Fail, not a passing skip.
7. Reassess confidence, write the canonical execution report, append exactly one completed `API-REV-024` entry, clean only owned resources, and return any durable delta through proportional code review.

### Mandatory safe-target controls

- Use a new absolute SQLite target under `autobyteus-server-ts/db/` and a new runtime root under `autobyteus-server-ts/tests/.tmp/`.
- Before spawn, prove child environment omission of ambient `DATABASE_URL` and `DATABASE_URL_TEST`; prove the materialized `.env` names the exact disposable database; and run configuration-only resolution while the database is absent.
- Import `/Users/normy/.autobyteus/server-data/.env` only via an actual TTY `pnpm secrets:import` into that exact disposable target. Do not read or print secret values; require value-free `READY` status evidence scoped to this target.
- Launch only through `test-support/live-e2e/test-runtime-bootstrap.mjs` `startBuiltTestServer` (or a proven equivalent checked wrapper), then require PID `lsof` exact disposable-path verification and explicit absence of the operational path.
- Never inspect or act on `/Users/normy/.autobyteus/server-data/db/production.db`. Preserve both incident disclosures without automatic rollback.
- Use ports distinct from protected `127.0.0.1:60004` / `31004`; do not stop, repoint, or mutate that stack. Preserve delivery stash/backup and unrelated dirty files.

### Starting confidence and broader-validation gate

- Starting SR-018 confidence: `0%` until current deterministic execution begins. Historical/pre-pause passes are useful for planning only and are not counted.
- Broader validation: `Required`; SR-018 changes streaming, restore, projection, task lifecycle, application producer, and browser presentation boundaries that mocks alone cannot close.
- Pass gate: every critical SR-018 acceptance criterion has direct current evidence; exact durable selections and builds pass; the checked restore/reconnect lifecycle passes; all mandatory AutoByteus/Codex/Claude browser-provider Team rows pass; user-requested standalone runtime rows are completed or truthfully block the result; overall confidence is at least 95% with no category below 90%; no material failure remains; cleanup is verified; and every durable delta receives proportional review.

### API-REV-024 execution update — Fail / API-F-016

The fresh investigation proceeded through current-aggregate fixture maintenance and a first broader maintained-web discovery, then stopped on a direct current product failure.

#### Durable validity decisions revised during execution

| Path / scenario | Final API-REV-024 decision | Evidence / replacement |
| --- | --- | --- |
| `services/agentStreaming/__tests__/teamTaskExecutionEventRouter.spec.ts` | `Stale / Remove` | Imported the deleted pre-SR-018 router. Replaced by `services/teamExecution/__tests__/teamExecutionState.task-lifecycle.spec.ts`, current `TeamStreamingService.spec.ts`, and aggregate UI tests. |
| `components/workspace/team/__tests__/TeamDelegatedTasksSection.current-contract.spec.ts` | `Stale duplicate / Remove` | Imported the deleted router and mutated the removed task store boundary. Its task Agent/AgentTeam count/details/selection assertions are maintained in the rewritten `TeamDelegatedTasksSection.spec.ts` plus the aggregate lifecycle suite. |
| `components/workspace/team/__tests__/TeamOverviewPanel.current-task-visibility.spec.ts` | `Stale duplicate / Remove` | Imported the deleted router and removed public context fields. Current task count/auto-open/focus is covered by `TeamOverviewPanel.spec.ts` plus aggregate lifecycle coverage. |
| `utils/__tests__/teamDelegatedTaskLiveVisibility.spec.ts` | `Stale / Remove` | Imported two deleted task projection owners and asserted removed public maps. Visibility, delayed materialization, focus, lifecycle, and cleanup are covered at the current aggregate/component boundaries. |
| `services/runOpen/__tests__/teamRunOpenCoordinator.primeOwnership.spec.ts` | `Stale duplicate / Remove` | Imported deleted `teamMemberMetadataNodes`. Final-prime/open behavior remains assigned to the current hydration/open coordinator suites, which still require completion after rework. |
| Current aggregate focused selection | `Updated / Pass` | `10 files / 61 tests` pass for strict stream admission, task Agent/task-Team materialization, delayed binding restore, atomic rejection, lifecycle cleanup, exact focus, task panel, desktop workspace, and mobile artifact/focus surfaces. Evidence: `repository/current-aggregate-focused-round2.log`. |
| Broader maintained web selection | `Mixed / Incomplete` | Discovery returned `24 failed / 24 passed` files and `82 failed / 222 passed` tests. Most failures are stale pre-SR-018 fixtures and remain API/E2E maintenance; one direct current source failure is `API-F-016`. Evidence: `repository/current-maintained-web-round1.log`. |
| `components/mobile/__tests__/MobileTeamMessages.spec.ts` | `Still Valid / Product Fail` | The test builds a current aggregate and exact rooted message projection. Structured reference rendering passes, but opening the viewer loses the root TeamRun ID because production reads a removed context field. |

#### Failure and routing

- `API-F-016` / `API-MOBILE-REFERENCE-024-001`: expected exact viewer identity `team-1:message-1:ref-1:0`; observed `:message-1:ref-1:0`.
- Preliminary owner: `implementation_engineer` (`Local Fix`). Production `MobileTeamMessages.vue` reads removed `activeTeamContext.teamRunId` instead of the canonical `activeTeamContext.executions.getRootTeamRunId()`.
- Failure package: `api-e2e-evidence-sr018/api-rev-024/failure/api-f016-mobile-team-reference-failure-analysis.md` plus focused log and source audit.
- Broader validation decision: `Required but halted`. No server, browser, provider, vault, migration, or database execution began after this common frontend failure. AutoByteus, Codex, Claude, restore/restart, and standalone rows are `Not Tested`, not skips or passes.
- Safety: the operational database was not inspected or targeted; the protected `60004/31004` stack and delivery stash/backup were untouched.

#### API-REV-024 final confidence

| Category | Score | Basis / gap |
| --- | ---: | --- |
| Requirement and acceptance-criteria proof | 52% | Core aggregate unit/component scenarios pass, but mobile reference identity fails and many required/browser/provider criteria are not yet executed. |
| Changed-boundary execution directness | 72% | Direct aggregate and strict stream tests pass; full current server/frontend integration remains incomplete. |
| Cross-boundary integration realism and mock gap | 35% | No fresh safe browser/provider execution occurred. |
| Environment, configuration, identity, and fixture fidelity | 90% | Repository tests use current exact identities; live environment was intentionally not started. Safety controls were honored. |
| Failure, edge-case, lifecycle, and recovery evidence | 58% | Delayed restore and atomic rejection pass durably; process/provider restart and broader recovery are outstanding. |
| User-surface, browser, and desktop-shell confidence | 35% | One direct mobile component failure; no fresh browser row. |
| Durable regression coverage quality and relevance | 55% | Current aggregate selection is green, but the cumulative preserved package remains mixed/incomplete and unreviewed. |

Overall confidence: `57%` (arithmetic mean 56.7%, rounded). Critical acceptance coverage is incomplete and one valid user-facing scenario fails, so API-REV-024 is `Fail` regardless of score. Route to `code_reviewer` for focused failure-origin review; do not perform proportional successful-test review yet.

## API-REV-025 Post-CRR-055 Resumption Investigation (Pre-execution Update)

### Trigger and prior-result handling

- Trigger: `CRR-055` Pass for `SR-018` / `ARCH-REV-011` / `IR-031` at HEAD `f7e825cc64a862555b0e26ea529599fe85d2f8b5`.
- `API-REV-024 Fail / 57%` remains a completed historical result. This continuation will be recorded as `API-REV-025` when it reaches its next completed result; the prior `61/61` sub-selection and reviewer `2/2` mobile recheck are inputs, not a final API/E2E Pass.
- This investigation update precedes new post-fix durable edits, final execution, or live-environment setup.
- `CR-F-031` / `API-F-016` is resolved in source only. API/E2E must independently rerun the exact current component path and then exercise real mobile/browser content retrieval through the canonical root TeamRun identity.

### Current durable package re-adjudication

| Current cumulative group | Decision at resumption | Required evidence before final result |
| --- | --- | --- |
| `2` added current helper/aggregate paths | `Needs Revalidation` | Execute direct aggregate, delayed restore, exact focus, lifecycle, and consumer selections; verify helper produces unique canonical topology and exact Agent focus for every retained caller. |
| `44` modified current web test/helper paths | `Needs Update / Revalidate` | Run the entire maintained selection. Classify each failure against SR-018; correct only stale fixtures/assertions, and reroute any valid production failure. No pre-SR-018 public maps, raw keys, flat TeamRun IDs, or deleted owners may be restored. |
| `5` removed deleted-owner tests | `Stale / Remove, decision retained` | Confirm replacement coverage remains present and green at the aggregate, strict stream, hydration/open, and rendered component boundaries. Do not count removed files as passes. |
| `MobileTeamMessages.spec.ts` | `Still Valid / Revalidate` | Require exact `team-1:message-1:ref-1:0` viewer identity plus close-back behavior after IR-031. |
| Server contract/activation/migration/provider coverage | `Still Valid / Broaden` | Execute current rooted Team/task, stream DTO, startup/migration, provider instruction, application producer, and lifecycle selections plus production typecheck/build/bootstrap. |
| Browser/provider/restore matrix | `Required` | Use only the checked disposable-target launcher. Run real reference content, restore/reconnect, standalone runtimes, and imported nested-classroom AutoByteus/Codex/Claude rows. |

### Execution order and stop conditions

1. Rerun `API-F-016`, then the exact 10-file aggregate selection and all 46 retained added/modified durable paths.
2. Fix only test-owned stale fixture construction after validating each failed assertion against SR-018. A current product failure stops the round and routes through `code_reviewer`.
3. Run current server affected/broader selections, production TypeScript, server `build:full` with sanitized bootstrap, and Nuxt production build.
4. Only after deterministic coverage is clean, materialize a new disposable runtime root/database; prove ambient database variables are absent, `.env` and configuration-only resolution point to the exact absent disposable target, then import secrets through the repository command without printing values.
5. Start only with `test-support/live-e2e/test-runtime-bootstrap.mjs` (or an independently proven fail-closed wrapper), verify the listening PID opens the exact disposable database path, and use ports other than `60004/31004`.
6. Execute real mobile/browser reference retrieval, restore/reconnect, standalone runtime rows, then imported nested-classroom AutoByteus, Codex `gpt-5.6-luna` medium, and authenticated Claude rows. Missing credentials/capability is `Blocked/Fail`, never a passing skip.
7. Clean only owned disposable processes/data, reassess confidence, update canonical artifacts, and return every durable add/update/remove through proportional code review after an overall Pass.

### Safety restatement

- Never inspect, open, target, copy, migrate, repair, roll back, delete, or otherwise act on `/Users/normy/.autobyteus/server-data/db/production.db`.
- Do not stop, repoint, reuse, or mutate the protected user stack at `127.0.0.1:60004` / `31004`.
- Preserve both historical operational-database incident disclosures, the delivery stash/backup, and unrelated dirty ticket paths.
- No post-CRR-055 server, browser, provider, vault, migration, or database action has occurred at this pre-execution checkpoint.

### Resumption confidence

- Starting post-fix confidence remains `57%`: source review removes the known implementation blocker but cannot raise API/E2E confidence before independent execution.
- Broader validation remains `Required` because SR-018 crosses strict streaming, restore, persisted task projection, frontend navigation, mobile content retrieval, and live provider boundaries.

### API-REV-025 repository discovery update — server durable maintenance required

- The exact post-fix mobile component now passes `1 file / 2 tests`; the 10-file current aggregate selection passes `61/61`; the complete retained current web selection passes `44 files / 312 tests`; and the Nuxt production build passes.
- Server production TypeScript and `build:full`/sanitized bootstrap pass with `DATABASE_URL` and `DATABASE_URL_TEST` explicitly absent.
- The first cumulative ticket-affected server selection intentionally ran all `82` present changed test files through the repository Vitest global setup. The setup proved its target as `autobyteus-server-ts/tests/.tmp/autobyteus-server-test.db`; it did not use the operational database.
- Broad result: `36 failed / 38 passed / 7 skipped` files, `132 failed / 315 passed / 20 skipped` tests, plus one worker-start error after the prolonged run. This is discovery evidence, not acceptance evidence.
- Failure-origin sampling shows a dominant stale-fixture pattern rather than one inferred product regression: `20` failures construct `MemberTeamContext` without its exact execution address, `19` read a removed topology/address field, `8` read removed identity objects, several assert pre-SR-018 result/projection shapes, and four files import production owners that no longer exist. The exact file list is `api-e2e-evidence-sr018/api-rev-025/investigation/server-affected-failure-inventory.txt`.
- Current coverage decision: each of the 36 files is `Needs Update`, `Stale / Remove`, or `Unclear` pending bounded inspection. No live server/browser/provider execution may begin until this current-contract maintenance is complete and a clean affected server rerun exists. No failed stale assertion is being treated as implementation authority.

### API-REV-025 execution update — deterministic coverage green; real Team launch fails

#### Completed durable adjudication and repository execution

- The complete maintained web selection now passes `44 files / 312 tests`, including the exact IR-031 mobile reference identity and the current aggregate/task lifecycle package.
- The retained ticket-affected server selection now passes `74 files / 523 tests`; `7` additional capability-gated files declare `20` skips and are not counted as provider evidence. The required real provider rows were selected to replace that gap.
- Server production TypeScript passes. Server `build:full`, including sanitized bootstrap smoke, passes. Nuxt production build passes.
- The whole-server diagnostic baseline remains non-clean at `110 failed / 443 passed / 32 skipped` files and `300 failed / 2642 passed / 114 skipped` tests. Its failures span broad stale/unrelated repository fixtures and are not represented as acceptance. The exact current ticket selection above is the authoritative deterministic result for this round.
- The exact cumulative durable package is `88` paths: `2 added / 80 updated / 6 removed`, split across `37` server and `51` web paths. All present paths are current and green in their affected selection; the six removed tests imported deleted owners or asserted superseded pre-SR-018 boundaries and have current replacements. This package is preserved but is not submitted for successful proportional review while the overall result is Fail.
- Exact inventory: `api-e2e-evidence-sr018/api-rev-025/investigation/cumulative-durable-coverage-inventory.tsv`.
- Exact patch: `api-e2e-evidence-sr018/api-rev-025/investigation/cumulative-durable-diff.patch`.

#### Safe live setup result

- A configuration-only preflight proved ambient `DATABASE_URL` and `DATABASE_URL_TEST` were excluded, the materialized runtime `.env` named the exact absent disposable SQLite target, and configuration resolved that target without initialization.
- Prisma migrations and the user-requested actual TTY `pnpm secrets:import` targeted only `api-rev-025-live-20260812-1.db`. Nine configured identifiers were imported without printing values; a postcheck reported nine `SKIP_CONFIGURED` results and `READY`.
- The server started only through the checked `startBuiltTestServer` boundary. PID `2246` opened exactly the disposable database and zero operational database paths. The staged nested-classroom package was imported through public GraphQL and the current AutoByteus/Codex/Claude model catalog was proven.

#### `API-F-017` / `API-LIVE-025-TEAM-LAUNCH-001`

- Decision: `Still Valid / Product Fail`.
- Expected: clicking **Run** on the real imported `Nested Classroom Test Team` opens `/workspace` with the Team runtime/model form.
- Observed: after navigation, the real Nuxt frontend renders Error 500: `DataCloneError: Failed to execute 'structuredClone' on 'Window': #<Object> could not be cloned.` The stack reaches `cloneConfig` -> `freezeConfig` -> `createDraft` -> `setTemplate` in `teamRunConfigStore.ts`, called by the real `prepareTeamRun` card action. `#team-run-runtime-kind` never renders and no TeamRun/provider execution begins.
- The initial browser attempt was discarded after a transient Vite dependency optimization reload. The frontend was restarted, and the authoritative second attempt reproduced the product failure with no resource-load console error.
- Preliminary classification: implementation `Local Fix`; recommended owner `implementation_engineer`, subject to focused `code_reviewer` failure-origin review. Existing store units use plain fixtures and do not exercise the real Pinia-reactive definition passed from the Team card.
- Full analysis: `api-e2e-evidence-sr018/api-rev-025/failure/api-f017-team-launch-reactive-clone-failure-analysis.md`.
- Stop decision: fail fast. AutoByteus task lifecycle, Codex, Claude, standalone Agent, and real mobile reference rows remain `Not Tested`, not skips or passes, because the common existing-Team launch surface is broken.

#### Cleanup and safety

- The owned server/frontend were stopped and ports `60225/31225` closed. Checked cleanup removed the disposable runtime and database. Source fixture hashes match before/after.
- `/Users/normy/.autobyteus/server-data/db/production.db` was not inspected, opened, copied, targeted, migrated, repaired, rolled back, deleted, or otherwise acted on.
- Protected `60004/31004` listeners were already absent after the reported power loss and remained absent; API/E2E did not stop, repoint, reuse, or mutate them.
- Both historical operational-database incident disclosures remain preserved.

#### Final confidence for API-REV-025

| Category | Score | Basis / gap |
| --- | ---: | --- |
| Requirement and acceptance-criteria proof | 78% | Current deterministic Team/task/mobile contracts are green, but the real existing-Team launch fails and provider/mobile journeys cannot complete. |
| Changed-boundary execution directness | 80% | Direct affected tests, builds, real public import, and real Run-card click executed; provider work is blocked by the launch failure. |
| Cross-boundary integration realism and mock gap | 50% | The real browser/server boundary exposed the failure before any provider TeamRun could start. |
| Environment, configuration, identity, and fixture fidelity | 98% | Checked disposable target, actual secrets import, PID lsof, public import, exact catalog, and cleanup all pass safely. |
| Failure, edge-case, lifecycle, and recovery evidence | 75% | Strong deterministic lifecycle/restore coverage; live provider lifecycle/refresh/terminal behavior is not completed. |
| User-surface, browser, and desktop-shell confidence | 45% | Real Chrome directly proves a critical Error 500 in the primary Team Run flow. |
| Durable regression coverage quality and relevance | 88% | Present 82 durable files pass their affected selections with explicit six-file removal decisions; the large package remains unreviewed and whole-server baseline is non-clean. |

Overall confidence: `73%` (514 / 7 = 73.4%, rounded). A critical user acceptance path fails, so the result is `Fail` regardless of score. Route to `code_reviewer` for focused failure-origin review, not proportional successful-test review.

## API-REV-026 Post-CRR-057 Resumption Investigation (Pre-execution Update)

### Trigger and authority

- Trigger: `CRR-057` Pass for `SR-018` / `ARCH-REV-011` / `IR-032` at artifact HEAD `324c91788bb524101cc4d4df6a1571d5ffa7d786` and production source commit `f3be139ea498e9e4e8b620f19d12beabcc105b81`.
- Prior completed result: `API-REV-025 Fail / 73%`; its deterministic, safe-target, failure, cleanup, and durable-inventory evidence is historical input, not current post-fix proof.
- `API-F-017` / `CR-F-032` is resolved in source only. API/E2E must prove the real existing-Team Run action, and must also exercise `CR-F-033`'s typed immutable form edit path rather than accepting source review as runtime proof.
- This investigation update is written before API-REV-026 durable test edits, final execution, or live environment materialization.

### Current coverage validity decisions

| Coverage / boundary | Decision | Required action |
| --- | --- | --- |
| `autobyteus-web/stores/__tests__/teamRunConfigStore.spec.ts` | `Needs Update` | Four assertions call removed `updateConfig`. Convert them to exact `applyConfigEdit` variants and preserve immutable replacement, workspace metadata, inherited member config, validation, attachment, and readiness intent. Do not restore a generic partial update action. |
| `TeamRunConfigForm.spec.ts`, `RunConfigPanel.spec.ts` and mobile setup/launch specs | `Needs Revalidation / Possibly Update` | Execute against the read-only snapshot and closed `TeamLaunchConfigEdit` emission. Any direct prop/store mutation expectation is stale and must be replaced at the same boundary. |
| API-REV-025 complete 44-file maintained web selection | `Needs Revalidation` | Re-run after IR-032 because seven production launch paths changed and the old selection predates the typed edit owner. |
| API-REV-025 exact server ticket selection | `Still Valid / Revalidate proportionately` | IR-032 is frontend-local, but rerun the exact current selection plus server production typecheck/build/bootstrap before final result. Capability-gated skips remain non-authoritative and require real rows. |
| `API-LIVE-025-TEAM-LAUNCH-001` | `Still Valid / Mandatory first browser recheck` | Click Run on the real imported Team, prove runtime/model controls render, select each provider configuration through the real form, and prove no clone/frozen-prop error. |
| Imported nested-classroom Team matrix | `Required` | Fresh AutoByteus `gpt-5.6-luna`, Codex App Server `gpt-5.6-luna` medium, and authenticated Claude rows; prove task Agent/task Team visibility, exact task lifecycle, peer/root communication, refresh/restore, and cleanup. |
| Standalone Agent matrix | `Required` | Fresh real Agent launch/input/response/termination on AutoByteus, Codex, and Claude through the browser/frontend. |
| Real mobile reference content | `Required` | Produce a real Team communication reference, pair/select the exact current Team/mobile focus, open content with exact root TeamRun ID, and close back. |
| API-REV-025 `2 added / 80 updated / 6 removed` durable package | `Preserve / Extend / Reinventory` | Re-adjudicate any IR-032-affected paths, publish an exact cumulative inventory and patch, and return it for proportional review only after overall Pass. |

### Planned execution and stop conditions

1. Update only stale API/E2E-owned test calls to the exact current typed edit contract, then run launch store/form/panel/mobile focused coverage.
2. Run the complete current web selection, exact server selection, production builds/typecheck/bootstrap, and current migration/provider/lifecycle coverage.
3. If deterministic coverage is green, create a fresh disposable absolute SQLite target and runtime root. Prove ambient database selectors absent, configuration-only exact target resolution, real `pnpm secrets:import` target readiness, and PID lsof exact-path safety.
4. Import a fresh staged nested-classroom package through the public API. Start the current frontend on owned ports.
5. Recheck the exact real Team Run click before provider prompts. Any clone, frozen-prop, launch readiness, selection, or form failure stops and routes as a product failure.
6. If common launch passes, execute fresh AutoByteus, Codex, Claude Team rows; standalone Agent rows; refresh/reconnect; and real mobile reference content.
7. Clean only owned processes/data, reassess confidence, update canonical artifacts/revision record, and route through `code_reviewer` according to the result.

### Safety constraints

- Never inspect, open, target, copy, migrate, repair, roll back, delete, or otherwise act on `/Users/normy/.autobyteus/server-data/db/production.db`.
- Use only the checked disposable-target launcher with both `DATABASE_URL` and `DATABASE_URL_TEST` absent from child commands.
- Do not stop, repoint, reuse, or mutate protected `127.0.0.1:60004` / `31004` state. If absent after power loss, record absence and leave it absent.
- Preserve both historical operational-database incident disclosures, delivery stash/backup, and unrelated dirty ticket paths.

Starting API-REV-026 confidence remains `73%`. Source correction does not raise downstream confidence until the real existing-Team launch and required runtime matrix pass.

### API-REV-026 execution update — immutable launch draft passes; real Team launch reaches a missing action

#### Durable coverage and repository results

- The three IR-032-affected launch/edit specifications were adjudicated before edits. `teamRunConfigStore.spec.ts` now uses the closed `applyConfigEdit` union and directly proves immutable replacement plus inherited-only LLM pruning. `TeamRunConfigForm.spec.ts` now asserts emitted typed edits and immutable props. `RunConfigPanel.spec.ts` was moved from the removed `updateConfig` mock to `applyConfigEdit`; its remaining fake `createRunFromTemplate` action became failure-origin evidence rather than product authority.
- Exact launch/edit coverage passes `3 files / 38 tests`; launch-default/mobile/boundary coverage passes `5 files / 41 tests`; the complete current maintained web selection passes `48 files / 343 tests`.
- The retained ticket server selection passes `74 files / 523 tests`; `7` capability-gated files declare `20` skips and are not counted as live provider proof. Server production TypeScript, server `build:full` with sanitized bootstrap, and the Nuxt production build all pass.
- The cumulative durable package is now `90` paths: `2 added / 82 updated / 6 removed`, split across `37 server / 53 web`. All `84` present paths are current and green in their selected suites. The exact inventory, complete 90-path patch, patch audit, and diff hygiene are under `api-e2e-evidence-sr018/api-rev-026/investigation/` and `repository/durable-diff-check.log`. The package remains unreviewed because an overall Fail routes first to failure-origin review.

#### Safe live setup and `API-F-017` resolution

- A fresh configuration-only preflight proved ambient `DATABASE_URL` and `DATABASE_URL_TEST` absent, exact resolution to the absent disposable `api-rev-026-live-20260812-1.db`, and no operational target match.
- Prisma deployed all 20 migrations only to that disposable target. Actual TTY `pnpm secrets:import` imported nine configured identifiers from `/Users/normy/.autobyteus/server-data/.env` without recording secret values. The checked `startBuiltTestServer` launcher started port `60226`; PID `lsof` proved the exact disposable database and no operational path.
- The staged nested-classroom package imported through public GraphQL and the current AutoByteus/Codex/Claude runtime/model catalog passed preflight. Real Chrome could click the imported Team's **Run** action, reach `/workspace`, render the Team launch controls, select AutoByteus `gpt-5.6-luna`, enable auto approval, and click **Run Team** without `DataCloneError`.
- Therefore `API-F-017` / `CR-F-032` is resolved downstream. `CR-F-033`'s typed immutable edit owner also passes its direct durable coverage and real form interaction.

#### `API-F-018` / `API-LIVE-026-TEAM-LAUNCH-001`

- Decision: `Product Fail / preliminary implementation Local Fix`.
- Expected: pressing **Run Team** enters the Team chat, creates the root TeamRun, and exposes the message input so the provider matrix can proceed.
- Observed: Nuxt renders Error 500: `teamContextsStore.createRunFromTemplate is not a function`; no root TeamRun or provider call occurs, and the browser times out waiting for `Type a message...`.
- Current production `RunConfigPanel.vue` calls `teamContextsStore.createRunFromTemplate()`, but `agentTeamContextsStore.ts` exposes no such action. The actual current launch owner is `agentTeamRunStore.launchDraft(...)` through `sendMessageToFocusedMember(...)`. The passing `RunConfigPanel.spec.ts` invents and asserts the nonexistent action in its store fake, so it did not execute the real store seam.
- This is the exact current Team launch acceptance path required by CRR-057. Although the stale call predates IR-032, the observed failure is a current product defect rather than a test, environment, credential, or provider failure.
- Full analysis: `api-e2e-evidence-sr018/api-rev-026/failure/api-f018-team-launch-missing-action-failure-analysis.md`.
- Stop decision: fail fast on the broken common launch boundary. Fresh Codex, Claude, standalone Agent, restore/reconnect, task lifecycle, and real mobile reference rows are `Not Tested`, not skips or passes.

#### Cleanup, safety, and confidence

- Owned `60226/31226` processes were stopped, both ports closed, and the disposable runtime/database/vault material removed. Source fixture hashes match before and after.
- The operational database was not inspected, opened, copied, targeted, migrated, repaired, rolled back, deleted, or otherwise acted on. Protected `60004/31004` were absent and untouched. Both historical incident disclosures remain preserved.

| Category | Score | Basis / gap |
| --- | ---: | --- |
| Requirement and acceptance-criteria proof | 68% | IR-032 and current deterministic contracts pass, but the primary Team launch still cannot create a run. |
| Changed-boundary execution directness | 85% | Direct store/form/panel/mobile coverage plus the real Run/Run Team clicks exercise the changed surface. |
| Cross-boundary integration realism and mock gap | 65% | Real browser/server execution exposes the store-seam defect; provider and downstream TeamRun boundaries remain unreachable. |
| Environment, configuration, identity, and fixture fidelity | 98% | Exact disposable target, actual vault import, PID lsof, public import, catalog proof, and cleanup all pass safely. |
| Failure, edge-case, lifecycle, and recovery evidence | 60% | Deterministic lifecycle/restore coverage is strong, but no fresh real run lifecycle can start. |
| User-surface, browser, and desktop-shell confidence | 55% | Real Chrome proves the launch form fix and then a critical Error 500 at the submit action; Electron shell behavior is not claimed. |
| Durable regression coverage quality and relevance | 86% | Ninety-path inventory is exact and all present selected paths pass, but the fake store seam requires correction and the package is not reviewed. |

Overall confidence: `74%` (`517 / 7 = 73.9%`, rounded). The critical launch failure overrides the score. Broader validation was `Required` and began safely, but remaining rows halted as `Not Tested`. Route `API-F-018` to `code_reviewer` for focused failure-origin review.

### API-REV-026 post-CRR-060 resumption investigation — IR-034 current combined state

#### Trigger and authority

- Trigger: `CRR-060` Pass for `IR-034` at current HEAD `649e244418fd6a4a21626ea4be5f7b0bab859412`; source commit `8d312409d463e81fe428a6be276385b12d5e9d8e`.
- Prior completed downstream authority remains `API-REV-026 Fail / 74%` until this rerun completes. A completed new result will be recorded chronologically rather than rewriting API-REV-026.
- `CR-F-034` / `API-F-018` is source-resolved by the single `agentTeamRunStore.launchDraft` owner. `CR-F-035` is source-resolved by `activeTeamContext.topology.getConfigurationView()`. Both require independent current durable and real browser proof.
- This investigation update is written before post-CRR-060 durable edits or final execution.

#### Current validity decisions before edits

| Coverage / boundary | Decision | Required action |
| --- | --- | --- |
| `RunConfigPanel.spec.ts` Team launch mock | `Stale / Needs Update` | Remove fabricated `teamContextState.createRunFromTemplate`; mock and assert the canonical `agentTeamRunStore.launchDraft` action with the exact selected immutable draft. Preserve Agent `createRunFromTemplate`, which is a separate current owner. |
| `RunConfigPanel.spec.ts` selected-Team context | `Stale / Needs Update` | Replace fabricated `activeTeamContext.config` with a real current `{topology, executions}` context built by `buildTestTeamContext`; assert the identical frozen `topology.getConfigurationView()` reaches `TeamRunConfigForm` with `readOnly=true` and ignores edit events. |
| `RunConfigPanel.spec.ts` new-workspace Team launch | `Needs Update / Same boundary` | Preserve workspace creation and metadata assertions, but prove subsequent canonical `launchDraft` call rather than a registry allocation seam. |
| Preserved 90-path cumulative durable package | `Preserve / Revalidate / Reinventory` | Start from `2 added / 82 updated / 6 removed`; update only current stale seams, rerun all present current selections, then publish an exact new inventory and patch. |
| Exact existing-Team launch | `Still Valid / Mandatory first live recheck` | Publicly import the staged Team, open the current launch form, submit **Run Team**, prove a root TeamRun and message input, and correlate browser/API/server evidence. |
| Selected active Team **Edit config** | `Add/revalidate direct durable and real browser evidence` | After a real TeamRun exists, open Edit config, prove the topology-derived configuration matches the launched values, is read-only, and returns to events without mutation. |
| AutoByteus/Codex/Claude imported nested-Team matrix | `Required` | Execute fresh rows with exact model/runtime settings and task Agent/task-Team visibility, lifecycle, peer/root communication, refresh/restore, terminal cleanup. Missing capability/credential is Blocked/Fail, never a pass skip. |
| Standalone Agent, reconnect/restore, mobile reference content | `Required` | Execute after the common launch path passes; use real frontend/browser boundaries and exact current identities. |

#### Planned safe execution and stop rules

1. Currentize the single stale `RunConfigPanel.spec.ts` seam and run the exact component/store/launch selection first.
2. Rerun the full current maintained web selection, retained server selection, production typecheck/build/bootstrap, Nuxt build, and exact cumulative diff hygiene.
3. Materialize a fresh absent disposable SQLite database/runtime; sanitize both ambient database variables; prove configuration-only exact target; apply migrations and use actual TTY `pnpm secrets:import` from the requested source only into that target.
4. Start only through the checked disposable-target launcher; after listen, verify the PID opens exactly the disposable database and no operational path. Use new owned ports and do not touch protected `60004/31004`.
5. Import staged current fixtures through public APIs. Run the existing-Team launch first, then selected active Team Edit config. Any current product failure stops and routes through focused failure-origin review.
6. If the common path passes, run fresh AutoByteus, Codex, Claude nested-Team rows, standalone Agent rows, restore/reconnect, and real mobile reference content. Preserve semantic DOM/API/log evidence and truthfully report any missing dependency.
7. Stop and remove only owned resources, update canonical artifacts and revision history, and return any durable delta through code review.

#### Safety

- Never inspect, open, target, copy, migrate, repair, roll back, delete, or otherwise act on `/Users/normy/.autobyteus/server-data/db/production.db`.
- Preserve both historical operational-database incident disclosures; no implication is drawn from the user's separate repair.
- Do not stop, repoint, reuse, or mutate protected `127.0.0.1:60004` / `31004`; both are currently absent.
- Preserve delivery stash/backup and unrelated dirty paths.

Starting confidence remains `74%` because source readiness cannot close the real downstream launch, provider, restore, or mobile gaps without fresh execution.

### API-REV-027 completion update — current Team launch and task UI pass; mandatory live task-peer exchange fails

#### Durable and repository evidence

- `RunConfigPanel.spec.ts` now uses the real current `{topology, executions}` Team context and canonical `agentTeamRunStore.launchDraft` owner; the fabricated flat config and `createRunFromTemplate` Team seams are gone. Its exact `16/16` recheck passes.
- The complete current maintained web selection passes `48 files / 343 tests`. The retained server selection passes `74 files / 523 tests`; seven capability-gated files and twenty declared skips are not counted as provider proof. Server production TypeScript, server `build:full` with sanitized bootstrap, Nuxt production build, and cumulative durable diff hygiene pass.
- The cumulative durable package remains exactly `90` paths: `2 added / 82 updated / 6 removed`, split `37 server / 53 web`. All 84 present paths pass their selected current suites. Exact inventory and current 90-path patch are under `api-e2e-evidence-sr018/api-rev-027/investigation/`. Because the overall result is Fail, this package remains pending rather than entering proportional successful-test review.

#### Safe environment and prior-failure resolution

- A fresh configuration-only preflight excluded `DATABASE_URL` and `DATABASE_URL_TEST`, resolved the exact absent disposable SQLite target, and did not initialize it. All migrations and actual interactive `pnpm secrets:import` targeted only that disposable database. The checked launcher and PID lsof proved the exact target and no operational path.
- Public fixture import and current runtime/model catalog passed. Real Chrome launched the existing imported Team successfully with AutoByteus and Codex. Both created fresh exact rooted TeamRuns and completed visible delegated task-Team lifecycle, task details, active/awaiting-review/accepted transitions, refresh retention, terminal cleanup, and termination.
- `API-F-018` / `CR-F-034` is therefore resolved downstream. The real browser no longer calls the absent Team context-registry action; the canonical launch owner succeeds.

#### `API-F-019` / `API-LIVE-027-TASK-PEER-001`

- Decision: `Fail / failure origin unclear; focused review required`.
- Expected: task-scoped `/StudentStudyGroup/student_one` sends the exact requested peer token to `./student_two`, waits for the same-chain reply, then submits the exact result.
- Observed: both AutoByteus and Codex create the exact nonempty task-Team chain and complete exact submit/review, but public communication records contain zero task-scoped peer messages or replies. The staged coordinator instruction explicitly forbids bypassing the requested exchange.
- This is not a skip, credential failure, database issue, mock gap, or locator-only result. It is a missing mandatory real effect across two runtimes. Full evidence: `api-e2e-evidence-sr018/api-rev-027/failure-api-f019-task-team-peer-live-analysis.md`.
- Stop decision: Claude, standalone Agent, selected-active-Team read-only config browser inspection, restore beyond page refresh, and real mobile reference content are `Not Tested`. Do not infer Pass from deterministic coverage.

#### Cleanup, safety, and confidence

- Owned server/frontend stopped; `60227/31227` closed; owned runtime/database/vault/staged copy removed; private source fixture unchanged.
- The operational database was not inspected or acted on. Protected `60004/31004` were absent and untouched. Both historical incident disclosures remain preserved.

| Category | Score | Basis / gap |
| --- | ---: | --- |
| Requirement and acceptance-criteria proof | 80% | Launch and task UI/lifecycle are direct, but the mandatory peer exchange fails and remaining rows halt. |
| Changed-boundary execution directness | 92% | Current seam tests, builds, and two real provider Team launches directly exercise the corrected launch boundary. |
| Cross-boundary integration realism and mock gap | 85% | Real browser/provider/API correlation exposes the missing peer effect; Claude/standalone/mobile remain unexecuted. |
| Environment, configuration, identity, and fixture fidelity | 98% | Exact disposable target, real vault import, PID proof, public import, source integrity, and cleanup pass. |
| Failure, edge-case, lifecycle, and recovery evidence | 78% | Two-provider lifecycle and refresh pass, but required peer sequencing and broader recovery rows are incomplete. |
| User-surface, browser, and desktop-shell confidence | 82% | Real Chrome proves visible Team/task lifecycle; mobile and standalone UI rows halt. Electron shell behavior is not claimed. |
| Durable regression coverage quality and relevance | 88% | Exact 90-path package is current/green in selected suites but remains unreviewed after overall Fail. |

Overall confidence: `86%` (`603 / 7 = 86.1%`, rounded). A critical live contract fails, so the result is `Fail` regardless of score. Route to `code_reviewer` for focused failure-origin review.

## API-REV-028 CRR-061 Capability-Focused Local-Fix Investigation (Pre-execution)

This section is authoritative for the resumed round and is recorded before any API-REV-028 durable edit, deterministic capability execution, safe live environment materialization, or final execution. API-REV-027 remains the prior completed `Fail / 86%`; its omitted model-elected peer calls are reclassified below rather than silently rewritten.

### Trigger, premise, and user clarification

- Current HEAD: `649e244418fd6a4a21626ea4be5f7b0bab859412`.
- Trigger: `CRR-061` (`Fail — API/E2E Local Fix`) while `CRR-060` remains the authoritative source Pass. `CR-F-036` / `API-F-019` is not a source/design failure.
- Approved premise `CR-PREM-032`: natural-language applicability and tool-call election remain Agent/LLM decisions under `BEH-005` / `DS-010`. The AutoByteus and Codex models completing their tasks without electing the requested peer call are nonblocking behavioral observations, not evidence of missing or broken product capability.
- The missing proof is narrower and deterministic: API-REV-027 did not invoke the current post-SR-018 task-scoped `send_message_to` request/reply boundary from the actual bound production tool adapter/session.
- User clarification (2026-08-12): functionality, not probabilistic business-prompt obedience, is the acceptance concern. The user additionally authorizes stronger `student_one` instructions in the test-specific nested-classroom fixture. API/E2E will apply that authorization only to a test-owned staged copy, preserve the original source hash, and retain the exact staged overlay. The stronger prompt is behavioral/live evidence only and does not replace the deterministic capability probe.

### Coverage validity decisions

| Coverage / boundary | Decision | API-REV-028 action |
| --- | --- | --- |
| API-REV-027 AutoByteus/Codex omitted peer calls | `Reclassify: Nonblocking Model Behavior Observation` | Preserve the evidence and note that exact task submit/review/Team/UI functionality passed. Do not require product orchestration to force a model tool call or prevent submission. |
| Current provider/tool exposure selection | `Still Valid / Fresh Recheck` | Re-run the CRR-061 5-file/31-test selection proving MemberTeamContext, intrinsic exposure, provider-neutral instruction parity, AutoByteus/MCP bindings, and exact task-Team routing mechanics. |
| Post-SR-018 task-scoped request/reply capability | `Not Tested / Critical Additive Probe` | Create a real active task Team through production TeamRun/manager boundaries. Invoke `send_message_to` from the actual bound `student_one` production AutoByteus adapter/session to `./student_two`, then invoke the reverse reply from `student_two` through its bound production seam. Require accepted once-only delivery, no persistent fallback, and public communication records with exact root, identical nonempty ordered task-Team chain, concrete task-scoped AgentRuns, exact content, and reverse direction. Prefer a temporary executable probe unless investigation shows a maintainable durable boundary gap. |
| Test-owned nested-classroom `student_one` instructions | `Staged Overlay Authorized / Behavioral Aid` | Copy the private test fixture to the owned runtime, strengthen only staged `student_one/agent.md` to explicitly require send/wait-before-submit, retain source before/after SHA-256 equality and exact overlay. Never edit the source package. |
| AutoByteus / Codex / Claude catalog and instruction exposure | `Mandatory` | Retain API-REV-027 catalog evidence and execute fresh exact exposure/current-instruction checks for all three runtime configurations. A missing credential/capability is Fail/Blocked, never a passing skip. |
| Claude imported Team row | `Not Tested in API-REV-027 / Must Complete` | Launch a fresh authenticated Claude row on the checked disposable target and execute the supported imported-Team/task lifecycle with the strengthened staged instructions. |
| AutoByteus and Codex imported Team rows | `Partially Proven / Fresh Current Rerun` | Their launch/task UI/submit/review/refresh/cleanup passed. Rerun with the staged prompt clarification and record task peer election as an observation, not a pass predicate; deterministic capability proof is the authority. |
| Standalone Agent matrix | `Not Tested / Must Complete` | Through the real frontend, create/launch/interact with standalone AutoByteus, Codex, and Claude Agents and verify runtime/model, input/output, history/open/terminate behavior, and material browser/server errors. |
| Selected-active-Team configuration | `Not Tested / Must Complete` | Open the real running Team configuration and prove the topology-derived launch configuration is correct and read-only without mutation. |
| Restore/reconnect and mobile reference path | `Not Tested / Must Complete` | Exercise fresh root reconnect/restore, retained task/history/navigation state as supported, responsive mobile Team reference-content selection/close-back, and exact root identity. |
| Cumulative durable package | `Preserve / Revalidate / Pending Review` | Preserve exact `90` paths (`2 added / 82 updated / 6 removed`). No durable change is planned for the temporary capability probe unless execution exposes a maintainable regression gap. If any path changes, rebuild exact inventory/patch and return it for proportional review. |
| Operational database and protected stack | `Fail-Closed` | Use only `test-runtime-bootstrap.mjs`/equivalent checked disposable launcher, exclude ambient database variables, prove exact runtime `.env` and configuration-only target before initialization, import secrets only into the absolute disposable database, verify PID lsof, and never inspect or act on the operational database. Do not touch `60004/31004`. |

### Planned execution order and stop/routing rules

1. Re-run the 31-test capability/exposure selection and inspect the exact production adapter construction seams.
2. Implement a temporary, evidence-retained current-boundary probe that starts a real active task Team and invokes the bound `student_one -> student_two -> student_one` tool path without relying on LLM election. Verify public Team communication projections/records, exact addresses/run identities, once-only content, and zero persistent fallback.
3. Revalidate the current 90-path package and production builds when needed to ensure no drift from API-REV-027.
4. Materialize a new absent disposable database/runtime, perform configuration-only target proof, migrations and interactive secret import only into that target, then launch through the checked server wrapper with PID lsof verification.
5. Copy and strengthen only the staged nested-classroom `student_one` instructions; retain exact source-integrity and overlay evidence. Execute fresh AutoByteus, Codex, and authenticated Claude imported-Team rows. The peer tool-call election is recorded as model behavior; capability Pass comes from step 2.
6. Complete standalone Agent rows, real selected-active-Team read-only config, reconnect/restore, and mobile reference-content path.
7. Clean only owned resources, update canonical investigation/report/revision record and evidence manifest, and route either an overall Pass for proportional test review or an exact capability rejection for focused source-origin review.

Starting confidence: `86%`. API-REV-027 directly proved both corrected Team launch and substantial real task/UI lifecycle behavior, and CRR-061 removes the invalid deterministic-business predicate. Confidence remains below Pass until the actual bound task-scoped request/reply capability and every prior Not Tested row are executed safely. The clean target remains overall `>=95%`, no applicable category below `90%`, direct proof of every critical capability, all three providers, exact cleanup, and no operational/protected-state contact.


### API-REV-028 completion update — deterministic capability passes; real Codex bound task-Team call fails

#### Coverage and repository results

- `API-F-019` / `CR-F-036` is resolved as directed by CRR-061. A temporary current-boundary probe created a real active task Team, invoked `send_message_to` from the actual bound AutoByteus `student_one` production tool adapter to `./student_two`, invoked the reverse reply through `student_two`'s actual MCP catalog/session/executor seam, and verified exactly two public communication records. Both records carry the same exact root, identical nonempty ordered task-Team chain, concrete task-scoped AgentRuns, exact content, and no persistent substitution/fallback. Result: `1 file / 1 test` Pass. The temporary repository test was removed after an evidence copy was retained.
- The CRR-061 provider/tool exposure selection passes `5 files / 31 tests`. The current maintained web selection passes `48 files / 343 tests`; the retained server selection passes `74 files / 523 tests` with `7` capability-gated files / `20` declared skips explicitly excluded from live proof. Server production TypeScript, server `build:full` plus sanitized bootstrap, and Nuxt production build pass.
- API-REV-028 made no repository-resident durable coverage edit, addition, or removal. The cumulative unreviewed API/E2E package remains exactly the API-REV-027 `90` paths: `2 added / 82 updated / 6 removed` (`37 server / 53 web`). Exact unchanged inventory/patch hashes are retained under `api-e2e-evidence-sr018/api-rev-028/investigation/`.
- An initially malformed broad web shell command was stopped and replaced by the exact selected command; it is not counted as evidence. An ignored server ticket tree removed by an execution-hygiene mistake was restored byte-identically from the sibling source tree and verified by the exact `80`-file manifest hash. Neither incident changed the cumulative durable package.

#### Checked disposable environment and staged prompt

- Configuration-only preflight excluded child `DATABASE_URL` and `DATABASE_URL_TEST`, proved the exact absent disposable target, and performed no database initialization. Prisma migration and actual interactive `pnpm secrets:import` from `/Users/normy/.autobyteus/server-data/.env` targeted only the disposable database. No secret values were recorded.
- The checked launcher started only the owned `60228` server; PID lsof proved the exact disposable database path and no operational path. The owned frontend used `31228`. The user-authorized stronger `student_one/agent.md` instruction was applied only to a staged runtime copy; before/after/final source fixture hashes match and the exact overlay is retained.
- The operational database was not inspected, opened, targeted, copied, migrated, repaired, rolled back, or deleted. Protected `60004/31004` were absent and untouched. Both historical incident disclosures remain preserved.

#### `API-F-020` / `API-LIVE-028-CODEX-TASK-PEER-BOUND-001`

- Decision: `Fail`; preliminary implementation/source origin, pending focused `code_reviewer` review.
- Expected: the real active Codex task-Team `student_one` bound session sends exact `TASK_PEER_CODEX` to `./student_two`; the request is delivered once within the same exact nonempty task-Team chain and receives the reverse same-scope reply.
- Observed: the stronger staged instruction caused Codex to invoke the real production `send_message_to` tool with exact arguments. The bound session returned `TOOL_EXECUTION_FAILED`: `Team execution is invalid: task TeamRun 'team_local_team_nested_classroom_test_student_st_83bff45debba4967abefd82deff5277f' has a foreign, reordered, truncated, wrong-parent, or wrong-Team binding.`
- Public GraphQL records independently prove the active root `nested_classroom_test_team_3dd794cd902b4177841607a68c41cfcd`, exact task-Team chain, and coordinator receiver `/StudentStudyGroup/student_one`. The task remains active with no submit/review. This is not probabilistic call omission: the actual bound provider session called the tool and the product rejected it.
- Evidence: `api-e2e-evidence-sr018/api-rev-028/failure-api-f020-codex-bound-task-peer-routing-analysis.md`; `capability/api-f020-codex-task-peer-bound-session-trace.json`; `capability/api-f020-codex-public-records.json`; `live/browser/codex-browser-row.json`.

#### Remaining rows, cleanup, and confidence

- AutoByteus again exercised fresh imported-Team/task UI/lifecycle behavior. Its omission of the voluntary peer call is retained only as nonblocking model/prompt behavior because the deterministic current-boundary capability passed.
- Authenticated Claude Team, standalone Agent matrix, selected-active-Team configuration browser inspection, and real mobile reference content are `Not Tested` after fail-fast on API-F-020. They are not passing skips.
- Owned processes stopped; owned ports `60228/31228` closed; disposable runtime/database/vault and temporary repository probe were removed; private source fixture is unchanged. Cleanup proof: `api-e2e-evidence-sr018/api-rev-028/environment/final-cleanup-verification.log`.

| Category | Score | Basis / gap |
| --- | ---: | --- |
| Requirement and acceptance-criteria proof | 80% | API-F-019 capability is direct, but the real Codex current-bound session fails and remaining rows halt. |
| Changed-boundary execution directness | 96% | Actual bound AutoByteus/MCP seams and a real Codex session exercise the exact boundary. |
| Cross-boundary integration realism and mock gap | 92% | Real browser/provider/API evidence exposes a production binding rejection; Claude/standalone/mobile remain unexecuted. |
| Environment, configuration, identity, and fixture fidelity | 98% | Exact disposable target, real vault import, PID proof, public import, source integrity, and cleanup pass. |
| Failure, edge-case, lifecycle, and recovery evidence | 88% | Exact rejection and fail-before-delivery evidence are strong; remaining provider/recovery rows halt. |
| User-surface, browser, and desktop-shell confidence | 76% | Real Chrome proves substantial Team/task behavior, but the Codex task cannot finish and mobile/standalone are Not Tested. No Electron-shell claim. |
| Durable regression coverage quality and relevance | 88% | Exact green 90-path selected package remains unreviewed; the temporary probe is evidence, not durable coverage. |

Overall confidence: `88%` (`618 / 7 = 88.3%`, rounded). Critical API-F-020 blocks Pass regardless of score. Route the complete failure package to `code_reviewer` for focused failure-origin review, not proportional successful-test review.

## API-REV-029 IR-035 Post-Fix Coverage Investigation (Pre-execution)

This section is recorded before any API-REV-029 durable edit/removal, deterministic execution, live environment materialization, or final execution. API-REV-028 remains the prior completed `Fail / 88%`; it is not overwritten by the post-fix round.

### Trigger and current authority

- Current HEAD: `41d31e695ca55bc68f60b21e87ed890632929edf`; source commit `c2da87da0781fda4e58b269a0dd4d83aad3f60d8`.
- Trigger: `CRR-063 Pass / 9.4`; `IR-035` resolves `CR-F-037` / `API-F-020` in source by separating logical placement validation in the containing persistent/current Team index from fresh concrete task TeamRun validation in the active child's materialized index.
- Prior completed result: API-REV-028 `Fail / 88%`. Its pre-fix Codex rejection is historical failure evidence only.
- Required rerun: lifecycle-faithful first-level and nested task-Team request/reply at the real bound provider seams; current repository/build proof; safe AutoByteus/Codex/Claude imported-Team rows; standalone Agents; selected-active-Team config; restore/reconnect; real mobile reference content.

### Coverage validity and maintenance decisions

| Coverage / boundary | Decision | API-REV-029 action |
| --- | --- | --- |
| API-REV-028 temporary capability probe | `Needs Update / Temporary Probe` | Correct the masking `taskScopedRoot=true` fixture so the parent retains persistent topology and the child uses a fresh task TeamRun. Exercise exact first-level request/reply and add nested task-Team request/reply through actual bound AutoByteus and MCP seams. Retain an evidence copy and remove the temporary repository file after execution. |
| API-F-020 real Codex session | `Mandatory First Live Rerun` | Reuse the user-authorized staged `student_one` instruction only in a disposable copied fixture. Require the real Codex task-scoped `send_message_to` invocation to pass and produce exact current public same-chain records; no persistent fallback. |
| Provider/tool exposure and affected resolver selection | `Still Valid / Fresh Recheck` | Run affected resolver/manager/task service coverage and the current provider exposure selection. Reviewer evidence is source readiness, not downstream acceptance. |
| Cumulative durable package | `Preserve / Revalidate / Pending Review` | Starting package remains exactly `90` paths (`2 added / 82 updated / 6 removed`; `37 server / 53 web`). No durable change is planned unless a maintainable current coverage gap remains after the lifecycle-faithful temporary proof. Rebuild exact inventory/patch on any change. |
| Current maintained web/server and builds | `Fresh Recheck Required` | Run exact current maintained web and retained server selections, server production TypeScript/build/bootstrap, Nuxt production build, and diff hygiene. |
| Imported AutoByteus/Codex/Claude Team matrix | `Mandatory` | Fresh checked disposable target. Verify exact runtime/model config, Team launch, rooted topology, task Team/task Agent UI, request/reply capability where elected/forced by test-only staged prompt, submit/review, refresh/restore, terminal cleanup, and no material browser errors. Model omission alone remains an observation; actual rejection is a failure. |
| Standalone Agents | `Mandatory` | Create/launch/interact through the real frontend for AutoByteus, Codex, and Claude. Verify model/runtime selection, response, history/open/termination, and material browser/server errors. |
| Selected-active-Team configuration | `Mandatory` | Inspect the real running Team config action and require the topology-derived configuration, read-only state, and no mutation/fallback owner. |
| Mobile reference path | `Mandatory` | Exercise the responsive real browser route for exact Team reference selection/content/close-back using canonical root identity. |
| Safe environment / operational database | `Fail-Closed` | Use the checked disposable-target launcher, exclude ambient database selectors, configuration-only target proof before initialization, actual interactive secrets import only into the disposable target, PID lsof after listen, and exact owned cleanup. Never inspect or act on the operational database; preserve both historical incident disclosures and protected-state constraints. |

### Planned execution and stop rules

1. Create and run the lifecycle-faithful temporary first-level+nested bound request/reply probe. If it fails, preserve exact evidence and reroute immediately.
2. Run affected resolver/provider selections and current repository/build checks. Any validated current-contract failure is classified before continuation.
3. Materialize a new absent disposable database/runtime, prove the exact target configuration-only, migrate/import secrets only there, start with the checked wrapper, and prove the PID-opened path.
4. Copy the test-only nested-classroom fixture into the owned runtime and apply the stronger `student_one` instruction only to the staged copy, retaining source-integrity and overlay evidence.
5. Rerun Codex first because it triggered API-F-020, then AutoByteus and authenticated Claude. Complete standalone Agent, selected-Team config, restore/reconnect, and mobile reference paths if the common boundary passes.
6. Clean only owned resources, update canonical artifacts and API-REV-029, and route an overall Pass plus cumulative durable package for proportional review, or an exact failure package for focused origin review.

Starting confidence: `88%`. Source and independent review close the known local invariant in isolation, but critical post-fix real provider evidence and several prior Not Tested rows remain mandatory. Pass still requires overall `>=95%`, every applicable category `>=90%`, exact safe-target proof, and no critical missing/failing scenario.

## API-REV-029 Completion Update — API-F-020 resolves; standalone first-send live projection fails

### Coverage maintenance and deterministic results

- The lifecycle-masking test was corrected before final execution: the direct same-task-Team scenario in `autobyteus-server-ts/tests/unit/agent-team-execution/mixed-team-manager.test.ts` now retains persistent parent topology and independently uses the fresh child task TeamRun. The affected durable selection passes `2 files / 25 tests`.
- A temporary lifecycle-faithful capability probe passes `1 file / 2 tests`: exact first-level and two-level nested task-Team request/reply through the actual bound AutoByteus and MCP seams, persistent/fresh TeamRun separation at every level, exact ordered chains, once-only public records, and zero persistent fallback. Its evidence copy is retained and the temporary repository file was removed.
- Current tool/provider exposure passes `5 files / 31 tests`; maintained web passes `48 files / 343 tests`; retained server passes `74 files / 523 tests` with seven capability-gated files / twenty declared skips excluded from provider proof. Server production TypeScript, `build:full`/sanitized bootstrap, and Nuxt production build pass.
- The cumulative durable package remains `90` paths (`2 added / 82 updated / 6 removed`); API-REV-029 updates one already-counted server test path. The package remains unreviewed because the overall result is Fail.

### API-F-020 downstream resolution and real three-runtime Team evidence

- Checked disposable setup, migrations, actual interactive secrets import, PID lsof, public staged-package import, source integrity, and cleanup all pass. The initial frontend command used non-authoritative environment names, rendered `Bound backend is not ready`, and created no run/provider call; it was stopped and replaced with the authoritative `BACKEND_NODE_BASE_URL` binding before counted execution.
- Real Chrome imported-Team rows pass for AutoByteus `gpt-5.6-luna`, Codex App Server `gpt-5.6-luna` medium, and authenticated Claude Sonnet. Each fresh row proves exact rooted topology, exact nonempty task-Team address, one delegated task, exact submission and accepted review, persistent reply, exact task-scoped peer request/reply, reference delivery, refresh/history retention, terminal transient cleanup, exact runtime selection, and clean termination.
- The real post-fix Codex request/reply directly resolves `API-F-020` / `CR-F-037`; it no longer returns the pre-fix binding rejection. AutoByteus and Claude also produce exact same-chain peer records.
- An earlier authenticated Claude Haiku row sent the exact task-scoped request but did not elect the reverse reply, so it remained active and was terminated. This is retained as a nonblocking model/prompt-behavior observation under `CR-PREM-032`; the fresh Claude Sonnet row completes the full product journey.

### API-F-021 / API-LIVE-029-STANDALONE-FIRST-SEND-001

- Decision: **Fail; preliminary implementation-source origin at the standalone first-send/live conversation projection boundary**.
- Expected: first send promotes the immutable standalone launch draft and renders the real provider assistant response live, with reload/restore retaining it.
- Observed: AutoByteus first send created a fresh exact run and the public current run projection persisted assistant content `STANDALONE_AUTOBYTEUS_OK`. The still-live browser showed an assistant avatar/bubble with no text, and the exact visible token remained absent for 240 seconds. After reload and historical selection, the same token rendered immediately.
- This is not a provider, credential, prompt, database, persistence, console-error, or locator-only failure. The backend projection is exact and restore succeeds; the live first-send surface is missing the already-completed assistant content.
- Full analysis: `api-e2e-evidence-sr018/api-rev-029/failure-api-f021-standalone-first-send-live-projection-analysis.md`.
- Fresh Codex/Claude standalone rows, selected-active-Team config browser inspection, and real mobile reference-content execution are `Not Tested` after fail-fast. They are not passing skips.

### Safety, cleanup, and confidence

- Owned `60229/31229` processes stopped; ports are closed. Owned runtime/database/vault/staged copy and temporary repository probe were removed. Private source fixture hashes match.
- The operational database was not inspected, opened, targeted, copied, migrated, repaired, rolled back, deleted, or otherwise acted on. Protected `60004/31004` were absent and untouched. Both historical incident disclosures, delivery stash, and backup remain preserved.

| Category | Score | Basis / gap |
| --- | ---: | --- |
| Requirement and acceptance-criteria proof | 84% | API-F-020 and all three real Team/provider rows pass, but ordinary standalone live assistant presentation fails and later required rows halt. |
| Changed-boundary execution directness | 96% | Lifecycle-faithful nested capability plus real AutoByteus/Codex/Claude task-Team requests directly exercise IR-035. |
| Cross-boundary integration realism and mock gap | 95% | Real Chrome/provider/API evidence spans all Team runtimes and exposes a distinct standalone frontend failure. |
| Environment, configuration, identity, and fixture fidelity | 99% | Exact disposable target, actual vault import, PID proof, public import, source integrity, and exact cleanup pass. |
| Failure, edge-case, lifecycle, and recovery evidence | 92% | Nested exact-chain/no-fallback and Team refresh/cleanup pass; standalone live-vs-restored divergence is directly isolated. |
| User-surface, browser, and desktop-shell confidence | 75% | Three Team browser rows pass, but the ordinary Agent live response is blank and mobile/remaining standalone rows halt. No Electron-shell claim. |
| Durable regression coverage quality and relevance | 90% | Current selected suites are green and the lifecycle fixture is corrected; the 90-path cumulative package remains unreviewed. |

Overall confidence: **90%** (`631 / 7 = 90.1%`, rounded). The critical standalone user-surface failure blocks Pass regardless of score. Route the complete package to `code_reviewer` for focused failure-origin review of `API-F-021`, not proportional successful-test review.

## API-REV-030 IR-036 Post-Fix Coverage Investigation (Pre-execution)

This section is recorded before any API-REV-030 durable coverage edit/removal, final deterministic execution, or live environment materialization. API-REV-029 remains the prior completed `Fail / 90%`; CRR-065 source readiness does not overwrite it.

### Trigger and authoritative state

- Current HEAD: `67551df6ba020b86c65b4716335d90f28d40f72e`; source commit `1af1ce098ace0051a291a266622a695a3929367c`.
- Trigger: `CRR-065 Pass / 9.4`; IR-036 resolves `CR-F-038` / `API-F-021` in source by keeping one truthful structural cadence/coalescing buffer and applying exact standalone or strict Team serialization only at the owning egress boundary.
- Prior failure to recheck first: `API-LIVE-029-STANDALONE-FIRST-SEND-001`, where the real AutoByteus response was persisted but blank live until refresh.
- Remaining required rows: fresh standalone AutoByteus, Codex, and Claude first-send/live/restore; selected-active-Team read-only topology configuration; real responsive/mobile Team reference content; current deterministic/build coverage; and exact cleanup.

### Coverage validity and maintenance decisions

| Coverage / boundary | Decision | API-REV-030 action |
| --- | --- | --- |
| `agent-stream-websocket-egress.test.ts` content/cadence cases | `Still Valid / Mandatory Fresh Recheck` | Retain the exact shared cadence/coalescing selection and require all current standalone content cases plus strict Team handler coverage to pass. |
| Incomplete-status case in `agent-stream-websocket-egress.test.ts` | `Needs Update` | The expectation is useful, but its inputs use retired pre-SR-018 Team execution identity. Reconstruct an exact current rooted Team execution address/config fixture while preserving the intended incomplete-status boundary assertion. Do not weaken strict parsing or add runtime compatibility. |
| API-REV-029 affected Team/provider proof | `Still Valid / Targeted Recheck` | Preserve API-F-020 resolution. IR-036 changes shared egress, so rerun the handler/cadence boundary and retain current Team serializer coverage; do not repeat the full imported-Team matrix unless the shared boundary or live rows contradict it. |
| Standalone real provider matrix | `Mandatory Fresh Execution` | Through the real browser and checked disposable server, run first-send/live/restore for AutoByteus `gpt-5.6-luna`, Codex App Server `gpt-5.6-luna` medium, and authenticated Claude. Correlate exact visible content with public persisted projection and require no refresh for the live assertion. |
| Selected-active-Team configuration | `Mandatory` | Open a real active imported Team and verify the Edit/config action exposes the topology-owned configuration in read-only mode without an empty or mutable compatibility owner. |
| Mobile Team reference content | `Mandatory` | Use a real responsive browser viewport and a real Team communication reference to verify exact root-scoped content, selection, and close-back behavior. |
| Cumulative durable package | `Preserve / Currentize / Pending Review` | Start from `90` paths (`2 added / 82 updated / 6 removed`). The stale egress fixture is an additional already-tracked durable update only if the current-contract correction changes it. Rebuild one exact server+web inventory and patch after final execution. |
| Environment and operational-data safety | `Fail-Closed` | Use only `test-runtime-bootstrap.mjs` or its checked equivalent; delete ambient database selectors from the child environment; prove the materialized runtime `.env` and configuration-only resolved path before initialization; require an initially absent absolute SQLite target; import secrets only into the disposable database; verify PID `lsof` after listen; and never inspect or act on the operational database. Preserve both incident disclosures and leave protected `60004/31004`, delivery stash, and backup untouched. |

### Planned execution and stop rules

1. Reproduce the sole stale egress assertion, inspect the exact current identity constructors, and update only that fixture while preserving the status behavior. Run the complete egress suite and standalone/Team handler selection.
2. Re-run current cumulative maintained server/web selections as proportionate, server production TypeScript and `build:full`/sanitized bootstrap, and Nuxt production build.
3. Materialize a new checked absent disposable target, perform configuration-only fail-closed proof, apply migrations and interactive `secrets:import` only there, start the built server through the checked launcher, and prove its exact open database path before browser execution.
4. Run standalone AutoByteus first because it triggered API-F-021. If it passes live plus persisted/restore correlation, run standalone Codex and Claude, then selected-active-Team configuration and real mobile reference content. Any exact current product failure halts subsequent lower-priority rows and routes with preserved evidence.
5. Terminate owned runs/processes and remove only owned runtime/database/vault/browser state. Verify protected ports and private fixtures are unchanged.
6. Publish API-REV-030 as the new completed result. On Pass, return every cumulative durable path plus exact inventory/patch for proportional review; on Fail, return the focused failure package instead.

Starting confidence: `90%`. IR-036 and CRR-065 directly resolve the known serializer defect in source, but browser-visible post-fix proof and the previously Not Tested standalone/config/mobile rows are still mandatory. A clean Pass still requires overall `>=95%`, no applicable category below `90%`, no critical missing/failing scenario, and exact safe-target/cleanup evidence.

## API-REV-030 Completion Update — API-F-021 resolves; mobile restored Team communication is empty

### Durable coverage adjudication

- The sole stale incomplete-status assertion in `autobyteus-server-ts/tests/unit/services/agent-streaming/agent-stream-websocket-egress.test.ts` was currentized to a rooted exact task-Team execution address while intentionally omitting only `agent_run_id`. The product expectation was not weakened and no compatibility input was restored.
- Exact egress plus standalone/Team handlers pass `3 files / 67 tests`.
- The cumulative unreviewed durable package is now exactly `91` paths: `2 added / 83 updated / 6 removed`, split `38 server / 53 web`. API-REV-030 contributes `0 added / 1 updated / 0 removed`; inventory, path list, and full patch are under `api-e2e-evidence-sr018/api-rev-030/investigation/`.

### Repository and broader execution decisions

- The current exact server selection passes `76 files / 573 tests`; seven files / twenty declared capability skips are excluded from live/provider claims.
- The current maintained web selection passes `48 files / 343 tests`.
- Server production TypeScript, server `build:full` including sanitized bootstrap, and Nuxt production build pass.
- An accidental non-authoritative whole-server launch caused by unavailable macOS Bash `mapfile` was stopped and excluded; it did not access an operational database.
- A fresh checked disposable target on `60230/31230` passed absent-target/config-only/PID-lsof proof, migration, interactive secrets import, staged public fixture import, private-fixture integrity, and cleanup.

### API-F-021 downstream resolution

Fresh real Google Chrome standalone first-send/live/persist/restore rows pass for:

- AutoByteus `gpt-5.6-luna`;
- Codex App Server `gpt-5.6-luna` with `medium` reasoning;
- authenticated Claude Sonnet.

Every row rendered the exact real-provider assistant token before refresh, persisted it exactly once, restored the same run/content after refresh/history selection, emitted no console errors, and terminated cleanly. `API-F-021` / `CR-F-038` is therefore resolved downstream.

### Selected Team configuration

A real AutoByteus imported Team was launched and restored. Its selected-Team Edit action passed: topology-derived runtime `autobyteus`, read-only notice, disabled runtime/auto-approve inputs, and no Run Team action. This closes the API-REV-029 selected-config Not Tested row.

### API-F-022 / API-MOBILE-REFERENCE-030-001

- Decision: **Fail; preliminary frontend implementation origin at persisted Team-communication GraphQL DTO/hydration**, subject to focused `code_reviewer` origin review.
- Exact root: `nested_classroom_test_team_eeceab75d5cb483cab682be1841176c8`.
- The real server inserted two exact communication projection records for this root, including one message with `referenceCount=1`. The desktop runner had already proved the exact reference path and exact reply before proceeding.
- A freshly paired real mobile browser selected the correct Team and focused `Teacher`, but showed `Messages · 0` and `No team messages yet for the focused member.` The reference row/content/close-back path was therefore unreachable. An active-run attempt failed identically.
- Current source directly passes Apollo communication DTOs to the strict domain parser, which rejects surplus fields; the adjacent task path has an exact Apollo metadata projector while Team communication does not. This is a strong preliminary mechanism, not a final source-ownership ruling.
- Full analysis: `api-e2e-evidence-sr018/api-rev-030/failure-api-f022-mobile-team-communication-restore-analysis.md`.

### Cleanup and stop result

Owned processes stopped and `60230/31230` are closed. The owned disposable runtime/database/vault were removed and private fixture hashes match. No action was taken on the operational database or protected `60004/31004`; both incident disclosures, delivery stash, and backup remain preserved.

API-REV-030 overall result: **Fail / 93%**. The mobile communication/reference failure is critical and blocks Pass regardless of the otherwise high evidence coverage. Route to `code_reviewer` for focused failure-origin review, not proportional successful-test review.

## API-REV-031 IR-037 Post-Fix Coverage Investigation (Pre-execution)

This section currentizes the API/E2E plan before any IR-037 durable coverage addition/update/removal, final repository execution, or live environment materialization. API-REV-030 remains the prior completed `Fail / 93%`; CRR-067 source readiness does not overwrite it.

### Trigger and authoritative state

- Current HEAD: `66cfe11e9057b0276c95cb5e9a01784d74b07499`; source commit `c13eb75b34e9bee60dfa556c067572f8715c6e00`.
- Trigger: `CRR-067 Pass / 9.4`; IR-037 resolves `CR-F-039` / `API-F-022` in source with one exact run-hydration-owned Apollo DTO projector.
- Prior failure to recheck first: `API-MOBILE-REFERENCE-030-001`, where exact server communication/reference records existed but active and persisted mobile Team views showed `Messages · 0`.
- Prior API-REV-030 proof retained but not promoted automatically: three real standalone providers, selected-active-Team read-only configuration, current egress/handler suites, production builds, and safe-target controls.

### Current coverage validity and maintenance decisions

| Coverage / boundary | Decision | API-REV-031 action |
| --- | --- | --- |
| `teamCommunicationStore.spec.ts` and `MobileTeamMessages.spec.ts` | `Still Valid / Insufficient Alone` | Retain and rerun. They prove current domain/store/component behavior after domain admission, but bypass the actual Apollo service seam that failed. |
| CRR-067 removed-after-use reviewer probe | `Temporary Evidence / Not Durable Authority` | Do not count as maintained coverage. Add durable actual-service-seam coverage in `services/runHydration/__tests__` using the real hydration service, real Pinia communication store, Apollo-shaped DTOs, and exact collection rejection. |
| Exact Apollo communication projection | `Add Durable Coverage` | Prove a persistent message and ordered task-Team message with structured reference fields project into exact frozen/current four-key addresses, with no `__typename` residue. |
| Invalid GraphQL shape | `Add Durable Coverage` | Prove one surplus/wrong-discriminator row rejects the complete collection at the service seam and leaves the root projection empty; do not admit partial rows or relax the domain parser. |
| API-REV-030 egress fixture and handler selection | `Still Valid / Targeted Recheck` | Retain the current egress fixture and rerun the affected shared egress/Team handler selection because it remains in the cumulative durable package. |
| Real active and persisted paired-mobile Team reference | `Mandatory Fresh Execution` | On a new checked disposable target, create a real imported AutoByteus Team communication with one reference and exact reply; require both active and post-termination/reload mobile views to show the correct message count, open exact path/content, close back, and retain exact root/focus. |
| Desktop Team communication after clean reload | `Mandatory Focused Recheck` | Because the failed boundary is shared hydration, explicitly open the restored desktop Team communication panel and require the referenced message, exact file content, and back/close behavior rather than treating main conversation restore as equivalent. |
| Standalone AutoByteus/Codex/Claude rows | `Still Valid / No Source Intersection` | IR-037 changes only Team communication GraphQL restore. Retain API-REV-030 real provider proof; do not spend new provider calls unless the shared target/build state contradicts it. |
| Imported-Team/provider matrix | `Targeted Current Recheck` | Execute real AutoByteus active/persisted communication/reference because it exercises the fix. Retain API-REV-029 current exact Codex/Claude Team collaboration lifecycle proof; the IR-037 boundary is provider-neutral persisted GraphQL hydration and is directly covered by the actual-service seam plus real AutoByteus browser journey. |
| Selected-active-Team config | `Still Valid / Targeted Recheck` | Preserve API-REV-030 real evidence and recheck the same Team during the focused browser journey if the action remains available. |
| Cumulative durable package | `Preserve / Expand / Pending Review` | Start from `91` paths (`2 added / 83 updated / 6 removed`). The new actual-service seam will be a third added path unless an existing current seam is the narrower durable owner. Rebuild an exact server+web inventory/patch after execution. |
| Environment and operational-data safety | `Fail-Closed` | Use the checked disposable launcher; sanitize child database selectors; prove exact absent target/config-only resolution/PID lsof; import secrets only into that disposable database; preserve source fixture integrity; never inspect or act on the operational database; leave protected `60004/31004`, delivery stash, and backup untouched. |

### Planned execution and stop rules

1. Add the narrow actual hydration-service seam tests, then run them with the retained communication store/mobile selections. A current-contract failure stops for classification.
2. Run the affected egress/communication/server/web selections and production builds required to detect integration drift.
3. Create a new absent disposable runtime/database, prove exact configuration before initialization, migrate/import secrets only there, start via the checked launcher, and prove the PID-opened target.
4. Run the real AutoByteus desktop plus paired-mobile active reference journey, terminate/reload, then run the persisted mobile and desktop Team communication/reference journey. Require exact count/path/content/back behavior and no console errors.
5. Stop and remove only owned resources; verify source-fixture integrity and protected-state non-action.
6. Publish API-REV-031. Only an overall Pass returns the cumulative durable package for proportional test-code review; an exact failure returns to focused origin review.

Starting confidence: `93%`. IR-037 and CRR-067 directly address the inferred mechanism, but the previously failing active/persisted mobile surface and the shared desktop restore panel require fresh downstream proof. Pass still requires overall `>=95%`, every applicable category `>=90%`, no critical missing/failing scenario, and exact safe-target/cleanup evidence.

## API-REV-031 Completion Update — shared Team communication hydration passes on desktop and mobile

### Durable coverage adjudication

- Added `autobyteus-web/services/runHydration/__tests__/teamCommunicationHydrationService.spec.ts` at the actual hydration-service/real Pinia store seam.
- It proves exact Apollo DTO projection for both persistent and ordered nested task-Team addresses, structured reference retention, removal of expected Apollo discriminators, exact four-key canonical addresses, and whole-collection rejection when one row contains a retired surplus identity field.
- The new seam passes `2/2`; the service + retained store + mobile component selection passes `11/11`; the current web selection passes `49 files / 345 tests`.
- The cumulative package is exactly `92` paths: `3 added / 83 updated / 6 removed`, split `38 server / 54 web`. It remains pending proportional review until this successful handoff.

### Repository and build evidence

- Current retained server coverage passes `76 files / 573 tests`; seven files / twenty declared capability skips are excluded from real-provider claims.
- Server production TypeScript and `build:full`, including the sanitized no-`DATABASE_URL` bootstrap smoke, pass.
- Nuxt production build passes and prerenders fifteen routes.
- The API-REV-030 shared egress correction remains in the passing current selection. IR-037 introduces no intersecting standalone/provider source change.

### Safe real-system result

- A new absent disposable runtime/database on `60231/31231` passed exact configuration-only target proof, ambient database-selector removal, migration, interactive `pnpm secrets:import` into that disposable vault only, checked built-server startup, PID `lsof`, staged test-fixture import, source-fixture integrity, and exact cleanup.
- The first frontend binding attempt used obsolete `NUXT_PUBLIC_*` names and was excluded before Team creation. It was stopped and corrected to the current `BACKEND_NODE_BASE_URL` contract; a clean diagnostic proved every HTTP/WebSocket endpoint bound to the owned `60231` server with zero failed requests.
- Two temporary live-probe predicates were also corrected without product or durable-test changes: the first incorrectly required exactly one reference-bearing projection even though the truthful reply also carried the reference; the second sampled the mobile summary before detail hydration. Both executions already showed two exact mobile rows/path/content, and the final fresh execution passed directly.

### API-F-022 downstream resolution

Fresh real Google Chrome execution against imported Nested Classroom and AutoByteus `gpt-5.6-luna` passed on exact root `nested_classroom_test_team_eeeb98d0f6134d70a50eb512a9563ed5`:

- the server persisted two exact rooted communication records and the exact reply once;
- active desktop Team Messages showed both rows and opened exact reference path/content, then restored message detail;
- active paired mobile showed `Messages · 2`, two message rows, exact reference path/content, and close-back;
- selected active Team configuration remained topology-derived and read-only;
- after clean termination/reload, the exact latest terminal root produced the same two records on desktop and mobile, with exact reference open/content/back;
- browser console errors: zero.

`API-F-022` / `CR-F-039` / `API-MOBILE-REFERENCE-030-001` is resolved downstream. Because the fixed boundary is shared, this round explicitly proves both desktop and mobile rather than labeling the prior symptom mobile-only.

### Retained provider/runtime evidence decision

- Fresh AutoByteus imported-Team browser proof directly exercises IR-037.
- API-REV-030 fresh standalone AutoByteus/Codex/Claude live/persist/restore rows remain authoritative because IR-037 changes only provider-neutral Team communication DTO hydration.
- API-REV-029 exact imported-Team AutoByteus/Codex/Claude nested collaboration rows likewise remain authoritative; the current actual-service seam and fresh AutoByteus browser journey close the only changed provider-neutral restore boundary.

### Cleanup, confidence, and outcome

Owned Team runs/processes stopped; `60231/31231` are closed; the owned runtime/database/vault were removed; private test-fixture hashes are unchanged. The operational database and protected `60004/31004` stack were not inspected or acted on. Delivery stash and backup remain untouched.

Final confidence: **98%**. Every applicable category is at least `96%`, every critical current behavior is directly proven, and no material API/E2E failure remains. API-REV-031 result: **Pass**. Return the `92`-path cumulative durable package to `code_reviewer` for proportional test-code review before delivery.

## API-REV-032 CRR-068 Durable-Test Local-Fix Investigation (Pre-execution)

This section currentizes the coverage decision before the CRR-068 durable-test edits and focused execution. API-REV-031 remains the authoritative product/API result at `Pass / 98%`; this round does not reopen its real browser/provider evidence or CRR-067's source result.

### Trigger and bounded scope

- Current HEAD remains `66cfe11e9057b0276c95cb5e9a01784d74b07499`.
- Trigger: `CRR-068 Fail — Local Fix`, findings `TR-F-004` and `TR-F-005`, confined to three repository-resident server unit-test fixtures.
- Package accounting remains sound at `92` durable paths (`3 added / 83 updated / 6 removed`; `38 server / 54 web`). The reviewer found no active `.skip`, `.only`, or `.todo`, and did not reopen `API-F-022` or the API-REV-031 system evidence.
- Broader validation decision: **Not Required**. CRR-068 explicitly requires only focused repository re-execution and forbids repeating live provider/browser work solely for this fixture cleanup. No server, frontend, browser, provider, vault, migration, or database action is planned.

### Coverage validity decisions

| Durable boundary | Decision | API-REV-032 action |
| --- | --- | --- |
| `autobyteus-agent-run-backend-factory.test.ts` task-scoped context fixture | `Needs Update` | Remove the deleted `TaskAgentInstanceIdentity` import and synthetic instance wrapper. Preserve the current exact member execution address while supplying only the actual task Agent run ID and root-scoped task ID facts consumed by the production context. |
| `mixed-team-manager.test.ts` task-Team lifecycle fixture | `Needs Update` | Remove the deleted `TaskTeamInstanceIdentity` import and synthetic instance wrapper. Preserve the current actual task TeamRun ID, task ID, exact rooted execution address, lifecycle, and no-fallback assertions. |
| `agent-stream-websocket-egress.test.ts` generic standalone identity-isolation case | `Stale / Remove Case` | Delete the assertion that manufactures retired route keys and task instance IDs through generic standalone egress. Its supported standalone exact-repeat/payload-transition responsibility is already covered by the adjacent `agent_id` status case; current Team identity isolation remains covered by the strict Team handler using `agent_execution` plus exact `TeamExecutionAddress`. Do not restore compatibility payloads. |
| `agent-team-stream-handler.test.ts` exact Team status identity | `Still Valid / Replacement Evidence` | Rerun unchanged with the three corrected files to prove strict current Team serialization/deduplication remains green. |
| API-REV-031 browser/provider/system evidence | `Still Valid / Retain` | Preserve without rerun because no production source, browser test, harness, environment, or live fixture changes in this round. |

### Focused execution and stop rules

1. Apply only the three bounded test corrections above.
2. Run the four-file Vitest selection covering both corrected identity fixtures, generic standalone egress, and strict Team egress/handler identity.
3. Run static deleted-symbol/retired-field and relative-import checks for the corrected paths plus `git diff --check`.
4. Rebuild the exact cumulative inventory and full patch under `api-rev-032`, update the canonical investigation/execution/revision artifacts, and return the unchanged 92-path package for proportional re-review.

Starting confidence remains **98%** because product/runtime evidence is unchanged. A completed Pass requires the focused test selection and static audits to be clean, with no production or environment action.

## API-REV-032 Completion Update — TR-F-004 and TR-F-005 corrected

### Final durable decisions and execution

- `autobyteus-agent-run-backend-factory.test.ts` now supplies only the actual task Agent run ID and task ID to the current exact member context. The deleted `TaskAgentInstanceIdentity` import, synthetic instance wrapper, and fabricated instance ID are absent.
- `mixed-team-manager.test.ts` now uses only the current task TeamRun ID and task ID throughout its exact lifecycle/routing assertions. The deleted `TaskTeamInstanceIdentity` import, synthetic wrapper, fabricated instance ID, parent copy, and timestamp are absent.
- The generic standalone egress case that manufactured route keys and task instance IDs was removed as stale. The adjacent supported standalone exact-repeat/payload-transition assertion remains, and unchanged strict Team handler coverage proves `agent_execution` plus exact `TeamExecutionAddress` identity.
- Focused Vitest result: **4 files / 65 tests passed**.
- Static result: zero deleted instance symbols or synthetic instance wrappers in the two corrected identity fixtures; zero retired route/instance fields in the standalone egress fixture; all `86` active cumulative durable paths have resolvable relative imports; focused diff hygiene passes.
- Cumulative inventory/patch result: exactly `92` paths (`3 added / 83 updated / 6 removed`; `38 server / 54 web`), exact inventory/patch path match, zero status mismatches, and reverse application passes.

### Broader-validation and safety disposition

Broader validation was **Not Required** and was not repeated. API-REV-031's real active/persisted desktop/mobile Team reference evidence and retained AutoByteus/Codex/Claude matrix remain unchanged because API-REV-032 changes test fixtures only. No production source, browser, provider, server, frontend, vault, checked launcher, or live fixture was touched. The focused Vitest global setup used only the repository test database at `autobyteus-server-ts/tests/.tmp/autobyteus-server-test.db`; it did not target or inspect the operational database.

Both historical incident disclosures, the protected `60004/31004` stack, delivery stash, backup, and no-rollback state remain preserved.

API-REV-032 result: **Pass / 98%**. `TR-F-004` and `TR-F-005` are resolved in the durable package. Return the complete `92`-path package to `code_reviewer` for proportional re-review; delivery remains blocked until that review passes.
