# Investigation Notes

## Investigation Status

- Bootstrap Status: Complete
- Current Status: Requirements refined to design-ready; deeper design investigation complete; design spec revised after user clarification to address the exposed queue data-file lifecycle architecture issue, not only the symptom.
- Investigation Goal: Design and implement gateway-owned upgrade resilience for incompatible transient reliability queue state, without reintroducing legacy `COMPLETED_ROUTED` behavior.
- Scope Classification (`Small`/`Medium`/`Large`): Small to Medium
- Scope Classification Rationale: The code change should remain localized to the message gateway file-backed queue stores plus a shared queue data-file lifecycle owner and tests, but it touches a startup/worker reliability path and must preserve clean ownership around locks, stores, logging, and no-legacy semantics.
- Scope Summary: Handle the first observed problem and the architectural weakness it exposed: after upgrade, old gateway `inbound-inbox.json` with `COMPLETED_ROUTED` caused the upgraded gateway to fail and stop processing new Telegram messages because queue file lifecycle and invalid-state recovery have no shared owner. Exclude streamed-output duplication and open-session server logic. Refactor common queue data-file lifecycle mechanics and extend the invalid-state guard to outbound outbox files because they share the same strict lazy-load failure shape.
- Primary Questions Resolved:
  - Detection/recovery should happen at the file-backed queue state boundary: inbox/outbox stores own parsing/current schema, while a shared queue data-file lifecycle owner owns loading, missing-file initialization, quarantine naming/rename/log payload, reset persistence, and atomic persistence.
  - Quarantine only the offending queue data file (`inbound-inbox.json` or `outbound-outbox.json`), not the entire queue root and not lock files.
  - Apply the same guard to outbound outbox for consistent reliability queue resilience.
  - Tests should prove legacy inbound status recovery, invalid version/schema/JSON recovery, valid current preservation, outbound guard behavior, current `ACCEPTED -> COMPLETED_ACCEPTED`, and active source grep with no legacy source support.

## Request Context

The user observed two issues while testing Telegram external-channel delivery after an upgrade. The streamed-output duplication has already been handled in a separate ticket merged to `origin/personal`. This new ticket covers the first issue: after upgrading, the gateway could not process new Telegram messages because old persisted gateway reliability queue state contained an unsupported `COMPLETED_ROUTED` inbound inbox status.

The user explicitly prefers no legacy compatibility. The desired direction is not to support old statuses forever, but to treat incompatible reliability queue state as transient internal data that should be quarantined/reset safely on upgrade. The user also clarified that this ticket should improve the architecture exposed by the bug rather than apply a mechanical symptom patch.

On 2026-04-27 the user pointed to the bootstrapped ticket artifacts and instructed: analyze them and continue/start work. This was treated as approval to refine the existing draft requirements into a design-ready basis.

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): Git
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-gateway-queue-upgrade-reset`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-gateway-queue-upgrade-reset/tickets/done/messaging-gateway-queue-upgrade-reset`
- Current Branch: `codex/messaging-gateway-queue-upgrade-reset`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-gateway-queue-upgrade-reset`
- Bootstrap Base Branch: `origin/personal`
- Remote Refresh Result: `git fetch origin --prune` succeeded on 2026-04-27.
- Task Branch: `codex/messaging-gateway-queue-upgrade-reset`
- Expected Base Branch (if known): `origin/personal`
- Expected Finalization Target (if known): `personal`
- Bootstrap Blockers: None
- Notes For Downstream Agents: Do not modify the user's shared `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo` checkout; it has unrelated untracked `docs/future-features/` content. Use the dedicated worktree above.

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-04-27 | Command | `git -C /Users/normy/autobyteus_org/autobyteus-workspace-superrepo fetch origin --prune` | Refresh base branch before creating ticket worktree | `origin/personal` stayed at `814a80bb docs(ticket): record stream output dedupe finalization`. | No |
| 2026-04-27 | Command | `git worktree add -b codex/messaging-gateway-queue-upgrade-reset /Users/normy/autobyteus_org/autobyteus-worktrees/messaging-gateway-queue-upgrade-reset origin/personal` | Create dedicated ticket workspace | Worktree created on branch `codex/messaging-gateway-queue-upgrade-reset`. | No |
| 2026-04-27 | Command | `git status --short --branch` in `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-gateway-queue-upgrade-reset` | Verify current ticket workspace before continuing | Branch is `codex/messaging-gateway-queue-upgrade-reset...origin/personal`; only ticket artifacts are untracked. | No |
| 2026-04-27 | Command | `rg -n "COMPLETED_ROUTED|COMPLETED_ACCEPTED|inbound-inbox|Unsupported inbound inbox|reliability-queue|DEAD_LETTER" .` | Locate current gateway queue code and prior docs | Active gateway code accepts current `COMPLETED_ACCEPTED` statuses; prior tickets document removal of `COMPLETED_ROUTED`. | Inspect file-store ownership deeply. |
| 2026-04-27 | Code | `autobyteus-message-gateway/src/infrastructure/inbox/file-inbox-store.ts` | Inspect current inbound inbox persistence and parse behavior | `loadState` lazily parses `inbound-inbox.json`; any unsupported status/version/schema/JSON error throws. `parseStatus` rejects `COMPLETED_ROUTED`. | Design quarantine boundary around invalid file state. |
| 2026-04-27 | Code | `autobyteus-message-gateway/src/domain/models/inbox-store.ts` | Inspect current status contract | Current statuses include `COMPLETED_ACCEPTED`, `COMPLETED_UNBOUND`, `COMPLETED_DUPLICATE`, `BLOCKED`, retry statuses, but not `COMPLETED_ROUTED`. | No legacy status should be re-added. |
| 2026-04-27 | Code | `autobyteus-message-gateway/src/infrastructure/outbox/file-outbox-store.ts` | Inspect outbound outbox persistence symmetry | `loadState` lazily parses `outbound-outbox.json` and throws on unsupported version/status/schema/JSON; failure shape matches inbox store. | Include shared invalid-state guard for outbox. |
| 2026-04-27 | Design Feedback | User clarification after initial design handoff | Confirm design should address the architecture issue exposed by the bug, not only patch the status failure | Revise target design from a quarantine helper to a reusable queue data-file lifecycle owner that centralizes load/reset/persist mechanics while leaving record schemas in inbox/outbox stores. | No |
| 2026-04-27 | Code | `autobyteus-message-gateway/src/bootstrap/create-gateway-app.ts` | Inspect queue root construction and gateway wiring | Gateway creates `FileInboxStore(path.join(queueRootDir, "inbox"))`, `FileOutboxStore(path.join(queueRootDir, "outbox"))`, and locks under `path.join(queueRootDir, "locks")`. | Store-level recovery should preserve queue root/locks and config. |
| 2026-04-27 | Code | `autobyteus-message-gateway/src/bootstrap/gateway-runtime-lifecycle.ts` | Inspect startup/worker lifecycle | Runtime acquires inbox/outbox locks before starting workers; worker loops catch errors and set reliability status. Recovery in store load should prevent repeated loop errors. | Do not mix data quarantine into lifecycle lock owner. |
| 2026-04-27 | Code | `autobyteus-message-gateway/src/infrastructure/queue/file-queue-owner-lock.ts` | Inspect queue lock ownership and stale claim handling | Locks live separately as `*.lock.json` and `*.claim.json`, with acquire/heartbeat/release and lease expiry. | Queue data quarantine should not delete lock files. |
| 2026-04-27 | Code | `autobyteus-message-gateway/src/application/services/inbound-inbox-service.ts` | Inspect current inbound completion mapping | `ACCEPTED` maps to `COMPLETED_ACCEPTED`; no old `ROUTED` mapping remains. | Use current completion contract in tests. |
| 2026-04-27 | Code | `autobyteus-message-gateway/src/infrastructure/server-api/autobyteus-server-client.ts` | Verify server ingress disposition parser | Parser accepts only `ACCEPTED | UNBOUND | DUPLICATE`; active source grep found no `ROUTED`/`COMPLETED_ROUTED` in gateway `src`. | Keep legacy grep validation scoped to source, because tests may include legacy fixtures. |
| 2026-04-27 | Test | `autobyteus-message-gateway/tests/unit/infrastructure/inbox/file-inbox-store.test.ts`; `tests/integration/infrastructure/inbox/file-inbox-store.integration.test.ts` | Locate existing inbox store coverage | Existing tests cover upsert, lease, persistence, and valid rehydrate; no invalid-state recovery coverage yet. | Add unit/integration tests. |
| 2026-04-27 | Test | `autobyteus-message-gateway/tests/unit/infrastructure/outbox/file-outbox-store.test.ts`; `tests/integration/infrastructure/outbox/file-outbox-store.integration.test.ts` | Locate existing outbox store coverage | Existing tests cover upsert, lease, persistence, and valid rehydrate; no invalid-state recovery coverage yet. | Add invalid-state guard tests. |
| 2026-04-27 | Test | `autobyteus-message-gateway/tests/integration/application/services/inbound-forwarder-worker.integration.test.ts` | Locate current `ACCEPTED -> COMPLETED_ACCEPTED` executable path | Existing integration test enqueues a file-backed inbox record, runs `InboundForwarderWorker`, and verifies `COMPLETED_ACCEPTED`. | Extend or add related test after quarantine reset. |
| 2026-04-27 | Log | `$HOME/.autobyteus/server-data/logs/messaging-gateway/stderr.log` via `rg -n "Unsupported inbound inbox status: COMPLETED_ROUTED"` | Capture observed failure evidence | Many repeated lines reported unsupported inbound inbox status. | Use as reproduction basis; do not depend on live log in tests. |
| 2026-04-27 | Data | `$HOME/.autobyteus/server-data/extensions/messaging-gateway/runtime-data/reliability-queue/inbox/inbound-inbox.json.backup-20260426-122727` | Confirm stale queue contents | Backup has `version: 1`, 85 records, including 28 `COMPLETED_ROUTED`, 26 `COMPLETED_DUPLICATE`, 16 `DEAD_LETTER`, 15 `COMPLETED_UNBOUND`. | Use a small fixture in tests; do not depend on local user file. |
| 2026-04-27 | Command | `rg -n "COMPLETED_ROUTED|\\bROUTED\\b" autobyteus-message-gateway/src || true` | Verify active source legacy absence before design | No active gateway source matches. | Repeat after implementation, expecting source remains clean. |

## Current Behavior / Current Flow

- Current entrypoint or first observable boundary: Managed gateway starts and constructs reliability queue stores under `runtimeDataRoot/reliability-queue`.
- Current execution flow: Telegram inbound update -> provider adapter -> inbound message service -> inbound inbox store -> inbound forwarder worker -> server ingress endpoint -> inbox completion status.
- Current outbox flow: server callback route -> outbound outbox store -> outbound sender worker -> provider adapter -> outbox completion/dead-letter status.
- Queue lock flow: runtime lifecycle -> acquire inbox lock + outbox lock under `reliability-queue/locks` -> start workers/session supervisors -> heartbeat locks -> stop/release locks on shutdown.
- Ownership or boundary observations: `FileInboxStore` and `FileOutboxStore` currently own file parsing/persistence and throw on unsupported persisted state. No queue-data invalid-state recovery owner exists. `FileQueueOwnerLock` owns lock lifecycle separately.
- Current behavior summary: An old `inbound-inbox.json` with `COMPLETED_ROUTED` can cause repeated gateway failures after upgrade until the user manually deletes/quarantines the queue file and stale locks. The design should automate the data-file quarantine/reset but leave lock ownership to the existing lock lifecycle.

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-message-gateway/src/infrastructure/inbox/file-inbox-store.ts` | File-backed inbound inbox store | Parses and persists `inbound-inbox.json`; rejects unsupported statuses and invalid schema. | Store remains the authority for inbound queue file schema and should trigger recovery when parse fails. |
| `autobyteus-message-gateway/src/infrastructure/outbox/file-outbox-store.ts` | File-backed outbound outbox store | Parses and persists `outbound-outbox.json`; same strict lazy-load failure shape as inbox. | Add the same invalid-state guard through the shared queue data-file lifecycle owner. |
| `autobyteus-message-gateway/src/infrastructure/queue/file-queue-owner-lock.ts` | File-backed queue ownership locks | Lock files are under `reliability-queue/locks` and have separate acquire/heartbeat/release semantics. | Do not reset/delete locks from queue data recovery. |
| `autobyteus-message-gateway/src/infrastructure/queue/file-queue-state-store.ts` (proposed) | N/A | No current shared queue data-file lifecycle owner exists; inbox/outbox duplicate lazy-load, missing-file empty state, atomic persist, and would otherwise duplicate quarantine/reset. | New queue concern should own file lifecycle, invalid-state quarantine/reset mechanics, and atomic persistence while accepting queue-specific parser/empty-state callbacks. |
| `autobyteus-message-gateway/src/domain/models/inbox-store.ts` | Current inbound inbox status/domain contract | No `COMPLETED_ROUTED` in current status union. | Must remain clean; do not add legacy status. |
| `autobyteus-message-gateway/src/domain/models/outbox-store.ts` | Current outbound outbox status/domain contract | Current statuses are `PENDING`, `SENDING`, `SENT`, `FAILED_RETRY`, `DEAD_LETTER`. | No special legacy branch required. |
| `autobyteus-message-gateway/src/bootstrap/create-gateway-app.ts` | Gateway app wiring and queue root setup | Constructs stores and locks under the reliability queue root. | Update store construction only as needed for explicit quarantine logger/config; no bootstrap catch-all recovery blob. |
| `autobyteus-message-gateway/src/application/services/inbound-inbox-service.ts` | Inbound inbox business operations | Maps current server dispositions into current completion statuses. | Should not own file incompatibility parsing/recovery. |
| `autobyteus-message-gateway/src/application/services/outbound-outbox-service.ts` | Outbound outbox business operations | Wraps current outbox state transitions and replay. | Should not own file incompatibility parsing/recovery. |
| `autobyteus-message-gateway/src/application/services/inbound-forwarder-worker.ts` | Worker loop over pending inbound records | Catches loop errors and records reliability status. | Store recovery should prevent invalid file state from surfacing repeatedly here. |
| `autobyteus-message-gateway/src/application/services/outbound-sender-worker.ts` | Worker loop over pending outbound records | Same loop error pattern as inbound worker. | Outbox recovery should prevent invalid file state from wedging this loop. |

## Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-04-27 | Log probe | `rg -n "Unsupported inbound inbox status: COMPLETED_ROUTED" $HOME/.autobyteus/server-data/logs/messaging-gateway/stderr.log` | Many repeated lines reporting unsupported inbound inbox status. | The gateway retried/faulted repeatedly on the same incompatible queue file. |
| 2026-04-27 | Data probe | Python status count on local backup `inbound-inbox.json.backup-20260426-122727` | 28 records had `COMPLETED_ROUTED`. | A fixture with one such record can reproduce parse failure. |
| 2026-04-27 | Static probe | `rg -n "COMPLETED_ROUTED|\\bROUTED\\b" autobyteus-message-gateway/src || true` | No active source matches. | Design can enforce no source-level legacy compatibility; tests may contain legacy fixture strings. |

## External / Public Source Findings

- Public API / spec / issue / upstream source: None used.
- Version / tag / commit / freshness: N/A.
- Relevant contract, behavior, or constraint learned: N/A.
- Why it matters: This is local gateway runtime state and repository behavior.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: Temp reliability queue directories with:
  - `inbound-inbox.json` containing one unsupported `COMPLETED_ROUTED` record.
  - `inbound-inbox.json` or `outbound-outbox.json` containing invalid JSON, unsupported version, unsupported status, or structurally invalid records.
  - Valid current inbox/outbox files for preservation checks.
- Required config, feature flags, env vars, or accounts: None for unit/integration tests; live Telegram not required for core reproduction.
- External repos, samples, or artifacts cloned/downloaded for investigation: None.
- Setup commands that materially affected the investigation: Created/reused dedicated worktree only.
- Cleanup notes for temporary investigation-only setup: Do not modify the user's current live gateway queue during implementation/testing; use temp directories/fixtures.

## Findings From Code / Docs / Data / Logs

- The previous open-session delivery ticket intentionally replaced `ROUTED`/`COMPLETED_ROUTED` with current `ACCEPTED`/`COMPLETED_ACCEPTED` semantics.
- Current active gateway source no longer references `COMPLETED_ROUTED` or `ROUTED` in `src`.
- `FileInboxStore.parseStatus` throws on unsupported statuses, so one stale record can prevent the entire inbox store from loading.
- `FileOutboxStore` has the same strict lazy-load shape and should receive the same invalid-state guard for consistency.
- The larger architecture issue is duplicated file queue lifecycle ownership across inbox/outbox stores with no shared place to define invalid-state behavior.
- The user's manual cleanup worked because it removed invalid transient inbox data and stale lock state; the target design automates invalid queue data-file quarantine/reset through a shared lifecycle owner while preserving lock lifecycle ownership.

## Constraints / Dependencies / Compatibility Facts

- No legacy status compatibility should be added.
- The reliability queue is transient internal runtime state; config/bindings/secrets are not in the inbox/outbox files and should not be changed.
- Any quarantine/reset behavior must be visible in logs so operators can diagnose dropped pending/dead-letter queue records.
- Queue owner lock files are owned by `FileQueueOwnerLock` and should not be reset by this queue data-file recovery.

## Decisions / Open Unknowns Resolved

| Question | Decision | Rationale |
| --- | --- | --- |
| Store-level vs bootstrap-level detection | Store-level detection through a shared queue data-file lifecycle owner | Inbox/outbox stores own schema parsing and see invalid files on first load; bootstrap should not become a catch-all queue recovery coordinator. |
| Quarantine one file vs whole queue root | Quarantine only the invalid data file | Preserves config/session data and avoids deleting lock files owned by runtime lifecycle. |
| Include outbound outbox | Yes | Outbox has the same strict lazy-load failure shape; the shared lifecycle owner avoids fragmented duplicated recovery logic. |
| Quarantine helper only vs lifecycle owner | Lifecycle owner | The bug exposed missing ownership for queue data-file lifecycle, not only missing rename mechanics. Centralizing load/init/quarantine/reset/persist is the architectural cleanup. |
| Surface in health/status endpoint | No for this ticket | Requirements ask for operator-visible logging and preserved quarantine file; status API additions are broader UX/API scope. |
| Legacy status mapping | Rejected | User asked not to keep legacy compatibility; clean replacement is quarantine/reset. |

## Open Risks

- A malformed file with pending records will be reset after quarantine, so pending work is not replayed automatically. This is intentionally accepted as transient state cleanup; the full original file remains available for diagnostics.
- If a lock file itself is malformed or actively held by a stale owner, this ticket will not recover it. Existing lock lease behavior remains the boundary unless a later ticket scopes lock-state recovery.
- If implementation logs too little detail, operators may not understand why pending queue records disappeared. Tests should assert quarantine path/result, and code review should inspect the warning payload.

## Notes For Architect Reviewer

This ticket should be judged as upgrade resilience for disposable gateway reliability queue state, not backward compatibility. The design should keep current status models clean, preserve queue lock ownership, establish a shared queue data-file lifecycle owner for the duplicated file-store lifecycle/recovery behavior, and ensure invalid old queue files cannot brick the gateway after upgrade.
