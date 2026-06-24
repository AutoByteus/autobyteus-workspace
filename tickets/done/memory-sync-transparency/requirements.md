# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Design-ready

## Goal / Problem Statement

Improve transparency for the Memory Sync source actions in the Nodes → Memory Sync UI. Users can configure a Docker/remote node, test a hub connection, and run a sync successfully, but the UI currently gives little or no visible feedback after `Test connection` or `Sync now`, leaving users unable to tell whether the action started, succeeded, failed, what was synced, or where to look for details.

Clarified scope from user follow-up: most necessary configuration and last-success information is already present, including source enabled, background sync enabled, and interval. The improvement should stay focused and lightweight: show only current sync job state (`Current job: idle` / `Current job: syncing…`), last sync result/timestamp, make `Sync now` visibly enter a spinner/`Syncing…` state, and show `Test connection` result next to the `Test connection` control/card rather than as disconnected page-level feedback. Design-review clarification: polling/status refresh must not overwrite in-progress form edits or pasted draft tokens; blank-token connection testing must use the fully persisted saved source configuration rather than mixing draft URL/source id with saved token; and last sync error must take precedence over an older success timestamp.

## Investigation Findings

User-observed behavior:

- A remote Docker node (`http://localhost:8001`) can be registered in Manage Nodes and appears `ready`.
- On the remote node Memory Sync tab, source settings include source node id, display name, hub base URL, token, interval, background sync, `Test connection`, and `Sync now`.
- The card shows only coarse `Job state: idle`; user reports no visible feedback when `Test connection` is clicked and no visible progress/result when `Sync now` is clicked, even though memory is synchronized.
- The hub/imported side can later show an imported source with file count, size, and import timestamp, proving the operation succeeded but only after checking elsewhere.

Confirmed current-code findings:

- Frontend `MemorySyncCard.vue` renders `store.error` and `store.info` near the top of the whole Memory Sync card, above the Hub panel. When a user is focused on the lower Source panel, feedback from `Test connection` can be off-screen and visually disconnected from the action.
- `Test connection` has no in-flight button state, no inline result next to the source actions, and its returned structured result is reduced to a generic `store.info` string.
- `Test connection` passes `sourceForm.hubToken`; `syncForms()` intentionally clears `sourceForm.hubToken` after loading/saving status because the saved token is redacted. Therefore a user who already saved the source token and clicks `Test connection` without re-pasting the plaintext token sends an empty token, while `Sync now` uses the saved backend token and can succeed. This likely explains why sync works but test feedback seems missing or confusing.
- `Sync now` does have a transient `store.syncing` state and a returned `lastSyncResult`, but the result is client-local only. It disappears on reload/navigation and background sync has no comparable visible summary.
- Backend source state persists only `lastJobState`, `lastSuccessfulSyncAt`, `lastError`, and tracked files. It does not persist last run metrics, trigger (`manual`/`background`), started/finished timestamps per visible operation, or test-connection results.
- User clarified that a large redesign is not needed: the existing source configuration, source-enabled checkbox, background-sync checkbox, interval, and last-success fields are useful. The UI should not duplicate background enabled/interval text. The main transparency gap is generic live sync-state feedback (`idle` vs `syncing…`) and local placement of test/sync feedback.
- `startMemorySync` is a synchronous GraphQL mutation that waits for the sync run to finish. The backend writes `running` into source state during the run, but the UI does not poll while the mutation is pending, so the persisted `running` state usually is not visible from the same click. Architecture review also noted that any mounted polling must avoid the current deep status watcher pattern because it would reset editable fields and clear `sourceForm.hubToken` on each poll.

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Behavior Change / UX Feature
- Initial design issue signal (`Yes`/`No`/`Unclear`): Yes
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Missing Invariant plus Boundary/Ownership issue
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Likely Needed for source operation status ownership; small frontend-only improvement possible as phase 1.
- Evidence basis: Current UI action feedback is generic/off-screen/transient; test connection uses draft plaintext token only while sync uses persisted backend token; raw `jobState` conflates current and last states; current deep status watcher would clobber unsaved form edits if polling is added.
- Requirement or scope impact: Requirements must include inline action feedback, saved-config fallback semantics for connection testing, current-vs-last sync precedence, and form-preserving status refresh semantics.

## Recommendations

Recommended direction after scope refinement:

0. **Keep the existing card layout mostly intact**: do not replace useful existing fields and do not duplicate source-enabled/background-enabled/interval details already visible in the form. Add a compact operation-feedback strip directly under the action buttons.
1. **Inline Source Operation Status**: Replace ambiguous `Job state: success` with two clear lines: `Current job: idle` or `Current job: syncing…`, and `Last sync: success · <timestamp>` or an error message when the last sync failed. Do not distinguish manual versus background in the label unless needed for diagnostics; the user mainly needs to know whether sync is running.
2. **Fix test-token semantics**: `Test connection` should test the fully persisted saved source configuration when the token field is blank and a saved token exists. It must not mix unsaved draft hub URL/source id with the saved token. If the user pastes a draft token, test the full draft input. The UI should label this clearly.
3. **Add explicit in-flight states without clobbering forms**: Add `testingConnection` and richer `syncing` state. Disable duplicate clicks and show spinner/text in the clicked button plus inline status. Status refresh/polling must not rehydrate editable forms or clear a pasted draft token.
4. **Persist only the minimal sync status needed**: expose current running/not-running state and last sync result/timestamp; trigger type (`manual`/`background`) and detailed metrics are not required for the primary UI.
5. **Expose minimal structured status through GraphQL**: extend `MemorySyncSourceStateGql` only as needed for `currentJobState` and `lastSyncResult` if the existing `lastJobState` cannot represent that cleanly.
6. **Keep global alerts only for page-level errors**: action-specific feedback should stay next to the action. Global `store.error/info` should not be the main success/failure surface for Source actions.

## Scope Classification (`Small`/`Medium`/`Large`)

Medium.

## In-Scope Use Cases

- UC-001: User tests connection from a source node to its configured hub and sees an immediate, accurate result.
- UC-002: User clicks `Sync now` and immediately sees the button change to spinner/`Syncing…` plus `Current job: syncing…`.
- UC-003: User returns to the Memory Sync tab after an operation and can see `Current job: idle` plus `Last sync: success · <timestamp>` or an error message when the last sync failed.
- UC-004: User understands whether sync is currently idle or running without caring whether the run was manual or background.
- UC-005: User can safely test the saved source configuration without needing the plaintext token to still be visible in the password field.
- UC-006: User can see whether any sync job is currently running, without needing to know whether it was manual or background.

## Out of Scope

- Changing the core memory sync data format or semantic merge/import behavior.
- Building full sync conflict resolution UI unless current implementation already produces such data cheaply.
- Reworking multi-node registration beyond the transparency needed for memory sync.
- Long-running distributed tracing infrastructure beyond this feature's local operation visibility.
- Displaying secrets or revealing hub tokens after save.

## Functional Requirements

- REQ-001: The Memory Sync Source panel must display immediate inline pending/running feedback when `Test connection` or `Sync now` is clicked, without requiring a full page redesign.
- REQ-002: The Memory Sync Source panel must display success results for test connection with at least target hub, source node id, timestamp, auth/hub-enabled indicators when available, and a human-readable success message.
- REQ-003: The Memory Sync Source panel must display failure results for test connection with a human-readable error, timestamp, endpoint/source context, and no token exposure.
- REQ-004: When a saved hub token exists and the token input is blank, `Test connection` must test the fully persisted saved source configuration rather than sending an empty token or mixing unsaved draft URL/source id with the saved token.
- REQ-005: When the user enters a draft hub token, `Test connection` must test the draft hub URL/source id/token input together and make that behavior clear.
- REQ-006: The Memory Sync Source panel must display sync completion as `Last sync: success · <timestamp>` after a successful sync.
- REQ-007: The Memory Sync Source panel must display sync failure as `Last sync: error` with a short human-readable error when available.
- REQ-008: The Memory Sync Source panel must separate configuration saved state from operation result state so saving settings, testing connection, manual sync, and background sync do not overwrite each other's feedback ambiguously.
- REQ-009: The UI must prevent duplicate concurrent clicks for the same action while an operation is in flight, without blocking unrelated safe actions unless necessary.
- REQ-010: Last operation results must remain visible after completion until superseded or refreshed; when the latest sync failed, the error result must take precedence over any older `lastSuccessfulSyncAt` timestamp.
- REQ-011: The Memory Sync Source panel must keep existing background/source configuration fields as-is and add only clear live job transparency: `Current job: idle` or `Current job: syncing…`, plus `Last sync: success · <timestamp>` or an error message when the latest sync failed. The primary UI must not require or emphasize manual/background trigger labels.
- REQ-012: Existing memory sync behavior that already synchronizes data must remain functionally intact.
- REQ-013: Status refresh or polling while the Memory Sync card is open must not overwrite unsaved Source form edits or clear a pasted draft token.

## Acceptance Criteria

- AC-001: After clicking `Test connection`, the source action area visibly enters a testing state within one UI update cycle.
- AC-002: If a saved token exists and the password input is blank, clicking `Test connection` sends a saved-config request that tests persisted hub URL, persisted source node id, and persisted saved token; unsaved draft URL/source edits are not mixed into that request.
- AC-003: If connection succeeds, the UI shows an inline success state with timestamp, hub endpoint/source id, and no token exposure.
- AC-004: If connection fails, the UI shows an inline failure state with readable error information and does not silently return to idle.
- AC-005: After clicking `Sync now`, the button visibly changes to a disabled spinner/`Syncing…` state within one UI update cycle and the source action area shows a running state.
- AC-006: When sync succeeds, the UI shows `Current job: idle` and `Last sync: success · <timestamp>` without requiring navigation to the Memory page.
- AC-007: When sync fails after an earlier success, the UI shows `Current job: idle` and `Last sync: error` with readable error information when available, not the stale prior success timestamp.
- AC-008: While sync is in flight, repeated `Sync now` clicks are disabled or coalesced and cannot start duplicate visible operations.
- AC-009: Sync running state is distinguishable from the last completed sync result.
- AC-010: Reloading or reopening the Memory Sync tab after a completed operation still shows the durable last connection/sync result if the backend has persisted it.
- AC-011: The UI does not duplicate source-enabled/background-enabled/interval text that is already visible in the form.
- AC-012: When any sync job is running, the UI shows generic `Current job: syncing…` without requiring the user to understand manual/background job origins.
- AC-013: Existing imported memory remains selectable/read-only in the Memory page after a successful sync.
- AC-014: If polling/status refresh fires while the user is editing Source fields or has pasted a draft token, the unsaved values remain intact.
- AC-015: If the user edits hub URL/source id but leaves token blank with a saved token configured, Test connection clearly tests saved settings rather than the unsaved draft fields.
- AC-016: The design identifies required API/result shape changes, frontend state changes, and coverage needs.

## Constraints / Dependencies

- Must work with embedded/local and Docker/remote node deployments.
- Must not expose hub tokens or secret-bearing headers in success/error/details UI.
- Must preserve existing authenticated memory sync behavior.
- Must accommodate async/background sync and quick/manual sync flows.
- Backend source state is stored under the app data dir and keyed by hub URL/source node id; any schema change needs a safe normalization/default path.

## Assumptions

- The backend can safely test the fully persisted saved source configuration when the frontend requests a saved-settings test.
- Existing source state (`lastJobState`, `lastSuccessfulSyncAt`, `lastError`) is enough for the approved first sync-result display once the UI applies the correct precedence rules.

## Risks / Open Questions

- Unsaved hub URL/source id changes are not tested with a saved token; users must save first or paste a draft token to test draft input.
- Connection-test result history is not required; inline current-session feedback is enough for this ticket.
- How should stale `running` states be recovered after process crash during sync?

## Requirement-To-Use-Case Coverage

- UC-001: REQ-001, REQ-002, REQ-003, REQ-004, REQ-005, REQ-008
- UC-002: REQ-001, REQ-006, REQ-007, REQ-008, REQ-009, REQ-013
- UC-003: REQ-010, REQ-011
- UC-004: REQ-008, REQ-010
- UC-005: REQ-004, REQ-005, REQ-013
- UC-006: REQ-008, REQ-010, REQ-011

## Acceptance-Criteria-To-Scenario Intent

- AC-001/AC-002/AC-003/AC-004 cover test connection happy/error and saved-token paths.
- AC-005/AC-006/AC-007/AC-008 cover sync execution, duplicate prevention, and result visibility.
- AC-009 covers separation of current running state from last completed result.
- AC-010 covers durable result visibility.
- AC-011/AC-012 cover non-duplicative configuration display and generic running-state transparency.
- AC-013 covers existing synchronized-data availability.
- AC-014 covers form preservation during polling/status refresh.
- AC-015 covers saved-config fallback identity when draft fields differ.
- AC-016 covers implementation design readiness.

## Approval Status

Approved by user on 2026-06-24 in conversation: requirement narrowed to minimal UI transparency — inline Test connection feedback, Sync now spinner/`Syncing…`, `Current job: idle/syncing…`, and `Last sync success timestamp or latest sync error message`, without duplicating existing source/background/interval fields or manual/background wording. Architecture-review clarifications on 2026-06-24 refine implementation semantics without expanding product scope: status refresh must preserve form drafts, blank-token test uses persisted saved config, and latest error takes precedence over stale success.
