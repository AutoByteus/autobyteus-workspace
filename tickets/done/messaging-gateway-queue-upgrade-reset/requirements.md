# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Design-ready

## Goal / Problem Statement

After upgrading the desktop/server product and managed messaging gateway, Telegram inbound delivery can stop because the new gateway tries to read old persisted reliability queue state containing an unsupported inbox status such as `COMPLETED_ROUTED`.

The product should not require users to manually delete gateway runtime queue files after upgrade. The gateway should treat incompatible reliability queue files as disposable internal runtime state, quarantine/reset them safely, and continue processing new inbound and outbound messaging work under the current contracts.

## Investigation Findings

Initial evidence from the user's local runtime:

- Gateway stderr repeatedly logged `Unsupported inbound inbox status: COMPLETED_ROUTED`.
- The old backup queue file at `$HOME/.autobyteus/server-data/extensions/messaging-gateway/runtime-data/reliability-queue/inbox/inbound-inbox.json.backup-20260426-122727` has `version: 1` with 85 records, including 28 records with `COMPLETED_ROUTED`.
- Current source no longer permits `COMPLETED_ROUTED`; `FileInboxStore.parseStatus` accepts `COMPLETED_ACCEPTED`, `COMPLETED_UNBOUND`, `COMPLETED_DUPLICATE`, `BLOCKED`, `DEAD_LETTER`, and active retry statuses only.
- Manual cleanup of the stale `inbound-inbox.json` and stale lock allowed new Telegram messages to process again.

Design investigation updates:

- `FileInboxStore` and `FileOutboxStore` both lazily parse strict JSON file state and currently throw on unsupported versions, unsupported statuses, invalid JSON, or invalid record structure.
- `createGatewayApp` stores reliability data under `runtimeDataRoot/reliability-queue/{inbox,outbox}` and queue owner locks under `runtimeDataRoot/reliability-queue/locks`.
- `GatewayRuntimeLifecycle` acquires queue locks before workers start; the lock lifecycle is already a separate ownership boundary and should not be reset by data-file quarantine.
- The bug exposed a larger architecture issue: inbound and outbound file stores duplicate queue data-file lifecycle work (lazy load, JSON parsing boundary, missing-file initialization, atomic persistence) and have no governing owner for invalid transient queue state.
- Recovery should be owned by a reusable queue data-file lifecycle owner under `infrastructure/queue`; inbox/outbox stores should keep record schema/status authority and delegate common load/persist/quarantine mechanics to that owner.
- The same invalid-state quarantine/reset guard should apply to outbound outbox state for consistency because the outbox file has the same strict lazy-load failure shape.

## Recommendations

Implement gateway-owned upgrade resilience for reliability queue state:

- Do not reintroduce `COMPLETED_ROUTED` as a supported business status.
- Do not reintroduce old `ROUTED` server-ingress success disposition support.
- Add a clean queue data-file lifecycle boundary around file-backed reliability queue files.
- Centralize common file lifecycle mechanics (load, missing-file initialization, invalid-state quarantine/reset, atomic persist) instead of duplicating them inside each queue-specific store.
- On incompatible/invalid persisted queue state, quarantine the offending queue data file and initialize a fresh empty queue state.
- Preserve gateway config, bindings, secrets, provider session/auth state, and queue owner lock lifecycle.
- Log a clear operator-visible reason, queue name, original file path, and quarantine path.

## Scope Classification (`Small`/`Medium`/`Large`)

Small to Medium

## In-Scope Use Cases

- UC-001: A user upgrades from a gateway version whose inbound inbox contains `COMPLETED_ROUTED`; the upgraded gateway starts successfully, quarantines/resets incompatible transient queue state, and processes new inbound messages.
- UC-002: A gateway inbox file has an unsupported status, unsupported file version, invalid JSON, or structurally invalid records; the gateway does not keep crashing on startup/worker loops and records clear diagnostic information.
- UC-003: Valid current-version reliability queue files continue to load normally with no quarantine/reset.
- UC-004: A gateway outbound outbox file has unsupported version/status or invalid structure; the same queue-owned quarantine/reset behavior prevents outbound worker loops from being wedged by invalid transient outbox state.
- UC-005: The implementation refactors the exposed queue data-file lifecycle duplication into one reusable owner so future queue file state changes do not require parallel, inconsistent patches in inbox and outbox stores.

## Out of Scope

- Backward-compatible support for the legacy `ROUTED` wire disposition or `COMPLETED_ROUTED` inbox status.
- Mapping old records into new semantic statuses.
- Server external-channel open-session delivery behavior.
- Streamed text duplication fixes; those were handled by the previous merged ticket.
- Telegram binding recreation or user config cleanup.
- Queue owner lock redesign, lock version migration, or forced removal of active lock ownership files.
- Adding new health/status API fields for quarantine events; operator visibility through logs and preserved quarantine files is sufficient for this ticket.

## Functional Requirements

- FR-001: The gateway must detect incompatible file-backed reliability queue state during first queue-file load and recover by quarantining/resetting transient queue data instead of repeatedly failing.
- FR-002: The gateway must preserve configuration, bindings, secrets, provider session/auth state, and non-queue runtime data when quarantining/resetting reliability queue data.
- FR-003: The gateway must not treat `COMPLETED_ROUTED` as a valid current status or add legacy status/disposition compatibility branches.
- FR-004: The gateway must log the queue name, reason, original file path, and quarantine file path when it quarantines an incompatible queue data file.
- FR-005: Valid current queue files must continue to load without quarantine.
- FR-006: The implementation must include regression tests for unsupported inbound status, unsupported file version or invalid schema/JSON, valid current queue preservation, and the shared outbound invalid-state guard.
- FR-007: Queue-data quarantine must not delete or rewrite queue owner lock files; lock ownership remains governed by the existing `FileQueueOwnerLock` lifecycle.
- FR-008: The implementation must establish a reusable queue data-file lifecycle owner under `autobyteus-message-gateway/src/infrastructure/queue` that centralizes common load, invalid-state quarantine/reset, and atomic persistence mechanics for inbox and outbox stores without owning inbox/outbox record schema or legacy status mapping.

## Acceptance Criteria

- AC-001: Given an existing `inbound-inbox.json` with `version: 1` and a record status `COMPLETED_ROUTED`, gateway queue initialization/access quarantines the file and creates a fresh empty inbox rather than throwing repeatedly.
- AC-002: After quarantine/reset, a new inbound envelope can be enqueued and forwarded using the current `ACCEPTED -> COMPLETED_ACCEPTED` contract.
- AC-003: The quarantined file remains available on disk with the original contents and a timestamped/collision-resistant name for diagnostics.
- AC-004: Existing valid current inbound and outbound queue files load unchanged and tests confirm no unnecessary quarantine.
- AC-005: Source grep confirms active gateway source still has no supported `COMPLETED_ROUTED` status or old `ROUTED` success disposition path.
- AC-006: No server-side external-channel behavior is changed for this ticket.
- AC-007: Given an existing invalid `outbound-outbox.json` with unsupported version/status or invalid structure, gateway queue access quarantines the file and creates a fresh empty outbox rather than wedging the outbound sender loop.
- AC-008: Existing lock files under `reliability-queue/locks` are not deleted by queue-data quarantine; current lock acquire/heartbeat/release behavior remains the owner of lock state.
- AC-009: Inbound and outbound file stores delegate common queue data-file lifecycle behavior to a shared queue infrastructure owner instead of carrying separate quarantine/reset implementations, while still owning their own record/status parsers.

## Constraints / Dependencies

- Dedicated worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-gateway-queue-upgrade-reset`
- Branch: `codex/messaging-gateway-queue-upgrade-reset`
- Base: `origin/personal @ 814a80bb` (`docs(ticket): record stream output dedupe finalization`)
- Gateway source: `autobyteus-message-gateway`
- Runtime evidence path: `$HOME/.autobyteus/server-data/extensions/messaging-gateway/runtime-data/reliability-queue/inbox`

## Assumptions

- Gateway reliability queue files are internal transient runtime state, not user-authored configuration.
- Quarantining old queue state is acceptable because the queue contains transport reliability records while user bindings/config live elsewhere.
- Resetting invalid queue files may drop pending retry/dead-letter work from active processing, but the original file remains preserved for diagnostics.
- The clean design should be upgrade-resilient without preserving old status semantics.

## Risks / Open Questions

- Risk: Quarantining a whole queue file because one record is invalid can pause/restart active pending work from that file. Mitigation: preserve the original file and log the reason/path clearly.
- Risk: If invalid lock files also appear, this ticket does not recover them. Mitigation: lock lifecycle remains a separate owner; no evidence currently requires lock schema recovery.
- Risk: Recovery currently occurs on first queue access rather than an explicit startup preflight. This is acceptable because both worker loops and inbound enqueue paths access the queues immediately in normal operation, but implementation should ensure the first access recovers without surfacing repeated loop errors.

## Requirement-To-Use-Case Coverage

| Requirement | UC-001 | UC-002 | UC-003 | UC-004 | UC-005 |
| --- | --- | --- | --- | --- | --- |
| FR-001 | Yes | Yes | No | Yes | Yes |
| FR-002 | Yes | Yes | Yes | Yes | No |
| FR-003 | Yes | Yes | Yes | Yes | Yes |
| FR-004 | Yes | Yes | No | Yes | No |
| FR-005 | No | No | Yes | No | Yes |
| FR-006 | Yes | Yes | Yes | Yes | Yes |
| FR-007 | Yes | Yes | Yes | Yes | No |
| FR-008 | Yes | Yes | Yes | Yes | Yes |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance Criterion | Scenario Intent |
| --- | --- |
| AC-001 | Reproduces the user's upgrade breakage and verifies automatic recovery. |
| AC-002 | Confirms the user-visible inbound path resumes after recovery under the current gateway/server contract. |
| AC-003 | Preserves diagnostic evidence instead of deleting transient queue state silently. |
| AC-004 | Prevents destructive behavior on healthy current queues. |
| AC-005 | Enforces no legacy behavior retention. |
| AC-006 | Keeps this ticket scoped to gateway queue upgrade resilience. |
| AC-007 | Applies the same queue-owned resilience to the outbox's identical lazy strict-parse failure shape. |
| AC-008 | Keeps queue lock ownership isolated from queue data-file quarantine. |
| AC-009 | Ensures the fix improves the exposed architecture instead of applying parallel mechanical patches. |

## Approval Status

Approved for design by the user's 2026-04-27 instruction to analyze the bootstrapped ticket and continue/start work. Requirements were refined from `Draft` to `Design-ready` after current-state code investigation.
