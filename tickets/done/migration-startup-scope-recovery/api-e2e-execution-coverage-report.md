# API/E2E Execution Coverage Report — MIGRATION-STARTUP-20260915-001

## Latest authoritative result
**API-REV-001 / Round 1: Pass — 95.0% validation confidence, not test pass percentage.**
2026-09-15. Small / High, reviewed route. Approved SR-010 / DS-001 / ARCH-REV-001 / IR-001 / CRR-001. Prior API result/confidence N/A. No open scoped finding or blocked critical AC. Successful output goes to Code Reviewer for separate proportional durable-test review; **Not Applicable — no API-owned durable test changes** is the proposed decision. Delivery, user verification, Git finalization and release are NOT completed by this result.

Exact implementation basis: HEAD3f853c7626851cb5d89178965534401e9e4aa5e4 PLUS actual unstaged/uncommitted 11-entry implementation manifest. All 11 hashes independently matched at intake and after execution; staging remains empty. No API production/test edits. `validation/api-native/final-manifest.json` is current fingerprint evidence. No HEAD-only acceptance claim.

## Cumulative authority
- /Users/normy/autobyteus_org/autobyteus-worktrees/migration-startup-scope-recovery/tickets/in-progress/migration-startup-scope-recovery/requirements-doc.md
- /Users/normy/autobyteus_org/autobyteus-worktrees/migration-startup-scope-recovery/tickets/in-progress/migration-startup-scope-recovery/investigation-notes.md
- /Users/normy/autobyteus_org/autobyteus-worktrees/migration-startup-scope-recovery/tickets/in-progress/migration-startup-scope-recovery/solution-revision-record.md
- /Users/normy/autobyteus_org/autobyteus-worktrees/migration-startup-scope-recovery/tickets/in-progress/migration-startup-scope-recovery/design-spec.md
- /Users/normy/autobyteus_org/autobyteus-worktrees/migration-startup-scope-recovery/tickets/in-progress/migration-startup-scope-recovery/solution-handoff.md
- /Users/normy/autobyteus_org/autobyteus-worktrees/migration-startup-scope-recovery/tickets/in-progress/migration-startup-scope-recovery/design-review-report.md
- /Users/normy/autobyteus_org/autobyteus-worktrees/migration-startup-scope-recovery/tickets/in-progress/migration-startup-scope-recovery/architecture-review-revision-record.md
- /Users/normy/autobyteus_org/autobyteus-worktrees/migration-startup-scope-recovery/tickets/in-progress/migration-startup-scope-recovery/implementation-handoff.md
- /Users/normy/autobyteus_org/autobyteus-worktrees/migration-startup-scope-recovery/tickets/in-progress/migration-startup-scope-recovery/implementation-revision-record.md
- /Users/normy/autobyteus_org/autobyteus-worktrees/migration-startup-scope-recovery/tickets/in-progress/migration-startup-scope-recovery/code-review-report.md
- /Users/normy/autobyteus_org/autobyteus-worktrees/migration-startup-scope-recovery/tickets/in-progress/migration-startup-scope-recovery/code-review-revision-record.md
- /Users/normy/autobyteus_org/autobyteus-worktrees/migration-startup-scope-recovery/tickets/in-progress/migration-startup-scope-recovery/api-e2e-coverage-investigation.md
- /Users/normy/autobyteus_org/autobyteus-worktrees/migration-startup-scope-recovery/tickets/in-progress/migration-startup-scope-recovery/api-e2e-test-case-ledger.md
- /Users/normy/autobyteus_org/autobyteus-worktrees/migration-startup-scope-recovery/tickets/in-progress/migration-startup-scope-recovery/api-e2e-revision-record.md
- Canonical execution report: /Users/normy/autobyteus_org/autobyteus-worktrees/migration-startup-scope-recovery/tickets/in-progress/migration-startup-scope-recovery/api-e2e-execution-coverage-report.md
- Relevant private historical supplement read-only: /Users/normy/autobyteus_org/autobyteus-worktrees/flat-agent-organization-model-base/.local/electron-build-20260915/migration-startup-recovery-handoff.md. Not copied or attached; not scanner/repair authority.
- Delivery report/revision: N/A — not yet applicable.

## Investigation / plan reconciliation
Investigation and ledger were written before repository/native execution. Current requirements require native normal-window-first proof; browser-only preview and the E2E profile that awaits backend readiness before opening its window cannot prove AC003.6. Existing valid durable coverage was retained without API changes. Native tests use a temporary observer/safety bootstrap around the unchanged compiled production-profile main, original Mac launcher, actual backend, preload/IPC/status/store/components and real Nuxt renderer. All acceptance actions were native UI clicks/keyboard; direct HTTP was read-only health corroboration, not command substitution.

Plan deviations were test-environment corrections, not product defects:
1. Initial resource-directory symlink caused Node entrypoint argv/import.meta path mismatch and clean exit0 instead of starting the server. Corrected by physically copying current built dist/prisma/package.json into owned resources and linking only dependencies. No production edit.
2. Corrected delayed2 attempt quit after39s during an interruption, before100s. Trigger not attributed; not counted as controlled pass. Fresh delayed3 completed N01/N02/N03.
3. Unsafe test key yielded locked vault health, not a startup fatal, per actual bootstrap contract. Preserved as supplementary observation, not a failure. Fresh deliberately non-SQLite test DB then exercised a real DATABASE_MIGRATION_FAILED structured fatal. A transient occupied-port guard refused one launch before any data/app creation; next safe launch succeeded.
All meaningful checkpoints were appended; interrupted/setup attempts remain in the ledger rather than erased. Ledger table reconciled to final cases below.

## Case matrix / exact evidence
Evidence root: /Users/normy/autobyteus_org/autobyteus-worktrees/migration-startup-scope-recovery/tickets/in-progress/migration-startup-scope-recovery/validation/api-native

|Case / AC|Mode and observed result|Final|
|---|---|---|
|R01 /003.1–5|Narrow actual owner/controller tests:2 Electron files18tests;1 renderer file3tests. Controlled transport/time clearly separated from native proof.|Pass|
|R02 /003/004|Broader10 Electron files41tests +3 renderer files8tests; Electron tsc emits current production main/preload successfully. Narrow counts included, not additive.|Pass|
|R03 /003.6/004|Current full server/shared/Prisma/assets/bootstrap build and actual Electron42.4.1 installed; isolated HOME/managed paths/default29695, no user data.|Pass|
|N01 /003.1/2/5/6|Actual window opened11:00:16.167Z before child42722 at11:00:16.194Z. One notice11:01:56.196Z (>100s). Release11:02:12.791Z; same child/generation1 authoritative health/ready11:02:17.828Z. One window-load, one child, one manager-ready. Actual Agents catalog visible without reload/restart/extra launch; notice clears.|Pass|
|N02 /003.2/4/5|Settings→Server Settings→Advanced→Server Status & Logs→Restart Server. New generation2/child43003 remained RESTARTING beyond100s with notice; normal health-check button did not settle/restart it. Release→same child ready, usable Settings, message cleared. Only2total spawned children at completion.|Pass|
|N03 /003.3/5|UI restart generation3/child43137 then controlled genuine process termination beforehealth: one terminal error, visible ApplicationError, no autochild. Ordinary Restart cleared error/notice; generation4/child43151 reached healthy usable Settings. Separate fresh invalidSQLite fixture emitted real DATABASE_MIGRATION_FAILED at11:07:18.511Z, ~1.5s after spawn; one manager-error, zero ready. No reset/replay/recovery UI action.|Pass|
|N04 /003.4/004|Actual Cmd+Q at11:07:57.634Z while child43354/gen1 pending. Quit0; child SIGTERM close11:07:57.763Z. Main43344 and child absent; port29695 empty. No manual childkill or late ready. Durable preflight/nochild/noclose/Windows/stale completion/coalescing controls supplement native Mac lifecycle.|Pass|

Native case evidence: n01-delay/ready AX and PNG, n01-before/after-state/events and n01-health.json; n02-delay/ready AX/PNG and before/after snapshots; n03-before/error/recovered-state/events, error/retry/recovered AX, fatal AX/PNG/state/events; n04-pending-ax and before/after state/events. `summary-*.json` retains exact attempt event chronology, including incomplete setup runs.

### Commands (cwd /Users/normy/autobyteus_org/autobyteus-worktrees/migration-startup-scope-recovery)
- `pnpm -C autobyteus-web test:electron --run server/__tests__/StartupDelayLifecycle.spec.ts server/__tests__/ServerStatusManager.spec.ts` →18 Pass; validation/api-narrow-electron.log.
- `pnpm -C autobyteus-web test:nuxt components/server/__tests__/StartupDelayPresentation.spec.ts --run` →3 Pass; api-narrow-renderer.log.
- `pnpm -C autobyteus-web test:electron --run server/__tests__ launch-profile/__tests__` →41 Pass; api-electron.log.
- `pnpm -C autobyteus-web test:nuxt components/server/__tests__/StartupDelayPresentation.spec.ts components/server/__tests__/ServerLoading.spec.ts components/server/__tests__/ServerMonitor.spec.ts --run` →8 Pass; api-renderer.log.
- `pnpm -C autobyteus-web exec tsc -p electron/tsconfig.json` →exit0; api-electron-build.log.
- `pnpm -C autobyteus-server-ts build` →exit0; api-server-build.log.
- `node autobyteus-web/node_modules/electron/install.js` →Electron42.4.1; api-electron-install.log.
- Actual frontend: `BACKEND_NODE_BASE_URL=http://127.0.0.1:29695 pnpm -C autobyteus-web exec nuxt dev --host 127.0.0.1 --port 50572`; api-native/frontend.log.
- Actual shell: `python3 /Users/normy/autobyteus_org/autobyteus-worktrees/migration-startup-scope-recovery/tickets/in-progress/migration-startup-scope-recovery/validation/api-native/launch.py delayed3` (also isolated fataldb/quitpending controls); exact sanitized environment/normal main in launch.py/bootstrap.cjs. No production delay/readiness flag.
- Final manifest/whitespace checks Pass. No strict test-inclusive whole-repository, frontend-wide, packaged archive or global-no-new-errors claim.

## Confidence gate
Arithmetic mean of seven applicable categories; anchors follow skill. Every critical current AC has direct native or appropriate real-owner lifecycle proof. Final finite-scope scores are95 each, not a claim of universal/platform completeness.
|Category|Postrepo|Final|Evidence / bounded residual|
|---|---:|---:|---|
|Requirement/AC proof|75|95|N01–N04 complete timeout contract; scanner/repair explicitly excluded.|
|Changed boundary directness|95|95|Actual original main/Macprocess/health/IPC/renderer, plus exact Windows override tests.|
|Cross-boundary realism|75|95|Actual backend and native transport; only elapsed-delay controlled by suspending own child, no fake health.|
|Environment/identity/fixture fidelity|75|95|Actual normal production profile/port with isolated HOME/managed paths; current compiled working source. Source-built dev renderer, not packaged archive.|
|Failure/lifecycle/recovery|90|95|Real exit/fatal/retry/Quit + durable preflight/no-close/stale/concurrency controls. Finite schedules only.|
|User-surface/desktop shell|50|95|Actual visible window-first delay, same-window automatic usable catalog; native Restart and Quit.|
|Durable regression relevance|95|95|Reviewed current policy owner/render tests independently rerun, no stale100s failure assertions restored.|
Postrepo79.3% →final95.0%. No category below90; target met. Broader validation Required and Completed, not replaced by browser preview.

## Scope, compatibility and limitations
- macOS native, Electron42.4.1, actual Nuxt app, English content/German OS accessibility, ~1152×768 capture. No actual Windows/Linux or distributable archive acceptance; Windows real override exercised with controlled IO.
- SIGSTOP/SIGCONT of the exact owned child simulated an initialization delay. This proves shell waiting policy, not real large-data migration throughput/stall detection. Approved policy permits a living unhealthy backend to remain pending indefinitely.
- Existing technical details can temporarily retain previous “Healthy: ok” diagnostic text during restart/error; authoritative status remains RESTARTING/error, and normal check updates renderer diagnostic. This pre-existing diagnostic behavior is not treated as readiness or a new timeout-policy guarantee. Monitor pending presentation also has durable real-store/component proof; the native global overlay covers it during restart.
- First-time model catalog discovery queried normal configured/default endpoints; no provider run, conversation, key change or user authentication used. Actual Agents catalog/readiness is sufficient current acceptance; no provider continuation campaign claimed.
- Legacy/compatibility removal and persisted-data review: no new compatibility/runtime fallback, no backend/migration/scanner/schema/ledger change. Current approved transition Not Affected by timeout code. Fresh disposable startup naturally ran existing migrations; no user/retained history migration or data repair certified. N03 invalid DB is synthetic test-only failure, not a migration implementation test.
- No durable API tests added/updated/removed. Temporary scripts only; existing upstream tests unchanged and fingerprints intact. Proportional test review should record Not Applicable rather than reopen source review.

## Cleanup / safety
All native test apps closed via actual Quit; all recorded main/backend PIDs absent, no listeners29695/50572 after cleanup. Nuxt exact owned PIDs34762/34761 terminated; no broad process kill. No user server/profile/conversation/auth/data action.
Own materialized resources moved to /Users/normy/autobyteus_org/autobyteus-worktrees/migration-startup-scope-recovery/.local/api-native-resources; symlink gone from web/resources. Own generated untracked SDK dist outputs removed; preexisting/other-owner artifacts preserved. Built dependencies/Electron outputs retained locally; regenerate shared outputs before later checks. Isolated test DBs AND keys, profiles/logs retained together under private `.local/api-native-*`, not copied/staged. No blanket archive of private data. Canonical selected AX/PNG/events/script evidence retained in ticket. No source change, staging, commit, push, merge, release, reset or migration replay.

## Result routing
No failure classification required. Sole successful reviewed High-risk route →Code Reviewer, separate proportional test review (Not Applicable if no durable API change), then Delivery later. Current metadata search found no AgentTeam `get_handoff_rules` or `send_message_to`; cannot call unavailable tools or claim a live rule result. Read-only local `/Users/normy/autobyteus_org/autobyteus-agents/agent-teams/software-engineering-team/team-config.json` corroborates the same High-risk Pass route. Return through the explicitly authorized existing native Code Reviewer task transport that supplied this assignment. No duplicate recipient/new task. Transport receipt appended only after confirmed tool result.

Confirmed native transport: send_message_to_thread returned threadId01a09df1-dac4-7d30-b59e-19c0cece9f2f, isError=false. Sole CodeReviewer recipient,58verified absolute references in message (no native attachment field). Not a live AgentTeam rule/transport receipt. API stage complete; no polling/duplicate handoff.
