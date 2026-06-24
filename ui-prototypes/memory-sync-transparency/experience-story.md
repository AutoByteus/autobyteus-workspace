# Experience Story: Memory Sync Transparency

## 1) Product Story

A user manages one or more AutoByteus nodes and wants to know whether a Docker/remote node is currently syncing memory to a hub. The existing card already shows source enabled, background sync enabled, interval, hub URL, token status, and last success information. Success for this refinement means the card adds only the missing live feedback: `Current job: idle` or `Current job: syncing…`, `Last sync: success · <timestamp>` or the latest sync error, and local `Test connection` feedback beside the test button, while preserving any unsaved form edits during status refresh.

## 2) Main Journey

1. The user opens **Nodes → Memory Sync** for a configured source node. The system keeps the existing Source card layout and shows source id, hub URL, token redaction, source checkbox, background sync checkbox, interval, current job, and last sync on `screen_id: memory_sync_source_card`.
2. The user clicks `Test connection`. If the token field is blank, the system tests the persisted saved source settings and labels the result as saved-settings feedback; unsaved URL/source edits are not mixed into that request. If the user pasted a draft token, the system tests the draft URL/source/token together. The button/adjacent inline message enters `Testing…`, then shows success/failure directly next to the same action on `screen_id: memory_sync_source_card`.
3. The user clicks `Sync now`. The button immediately becomes disabled with a spinner and `Syncing…`; the job line changes to `Current job: syncing…` on `screen_id: sync_job_inline_running`.
4. When sync finishes, the button returns to `Sync now`, `Current job` returns to `idle`, and `Last sync` updates to success timestamp or latest error on `screen_id: memory_sync_source_card`; a latest error is shown even if an older success timestamp still exists.
5. If background sync starts while the card is visible, the same generic job line shows `Current job: syncing…`; the UI does not need to label it as manual/background for the primary user journey.

## 3) Cognitive Load Criteria

- Learning order: show “what is connected and is it healthy?” before raw settings; users should not have to infer health from form fields.
- Connection strategy: keep existing configuration where it is; add only local action feedback for **Connection test** and generic **Sync job** state.
- Chunking limit: add one compact operation-feedback strip under the existing buttons; avoid introducing a large new dashboard unless later requested.
- Interference control: do not duplicate checkbox/interval information, do not force users to distinguish manual versus background job labels, and do not let status refresh overwrite unsaved Source form edits or pasted tokens.
- Progression policy: keep the current form fields first; add live action feedback only where the user clicks.

## 4) Screen Stories

### screen_id: memory_sync_source_card

- User arrives from: Nodes navigation → Memory Sync tab for the current node.
- User sees:
  - The existing source fields: source node id, display name, hub URL, redacted token, background sync checkbox, interval.
  - A compact **Connection test** result beside or immediately below the `Test connection` button.
  - The `Sync now` button changing to disabled spinner/`Syncing…` during a manual sync.
  - A compact job-state line: `Current job: idle` or `Current job: syncing…`.
  - A compact last-result line: `Last sync: success · <timestamp>` or the latest sync error.
- User can do:
  - `action_test_connection`: test current saved/draft connection.
  - `action_sync_now`: start sync now.
  - `action_save_source_settings`: save source configuration.
  - `action_toggle_background_sync`: enable/disable interval-based sync using the existing checkbox.
- System behavior:
  - when `action_test_connection` with blank token -> inline `Testing saved settings…` state -> update connection lane -> stay on `memory_sync_source_card`.
  - when `action_test_connection` with draft token -> inline `Testing draft token…` state -> update connection lane -> stay on `memory_sync_source_card`.
  - when `action_sync_now` -> button changes to spinner/`Syncing…` -> go to `sync_job_inline_running` state.
  - when `action_save_source_settings` -> show save state only in configuration section -> refresh dashboard status.
- Cognitive objective: help the user know that their click started real work without inspecting logs or waiting for a later timestamp change.
- Cognition controls:
  - chunking: one inline test result and two sync lines only.
  - progressive disclosure: no activity log in the primary design.
  - clarity guardrails: no token value is shown; display only “token configured” or “token missing”.
- States to prototype: default, loading, saved, connection-success, connection-error, sync-success, sync-error, background-enabled, background-disabled.

### screen_id: sync_job_inline_running

- User arrives from: `memory_sync_source_card` after `action_sync_now`, or while any sync job is currently running.
- User sees:
  - A compact inline job indicator: `Current job: syncing…`.
  - Disabled duplicate `Sync now` button with spinner/`Syncing…` while work is in flight.
- User can do:
  - Wait for the current sync to finish.
- System behavior:
  - when job completes -> set `Current job: idle` and update `Last sync: success · <timestamp>` or an error message when the last sync failed -> return to `memory_sync_source_card`.
- Cognitive objective: prevent the user from thinking nothing happened after pressing `Sync now`.
- Cognition controls:
  - chunking: one active job banner, not multiple competing alerts.
  - progressive disclosure: do not show detailed counts in the primary design.
  - clarity guardrails: do not expose manual/background distinctions unless needed for an error/debug detail.
- States to prototype: running, success, error, stale-running-after-reload.

## 5) Alternate And Error Paths

- If no source token is configured, show “Hub token missing. Paste a token or save source settings before testing/syncing.” Recovery: user enters token and saves or tests draft token.
- If token input is blank but a saved token exists, `Test connection` uses the fully persisted saved source configuration and labels the test as “Testing saved settings”. Unsaved URL/source edits are not included. Recovery: save settings first or paste a draft token to test a draft configuration.
- If user entered a draft token, `Test connection` uses the draft URL/source id/token together and labels the test as “Testing draft token”. Recovery: save token/settings if test succeeds.
- If hub URL is unreachable, show connection failure in the **Connection test** lane with the tested URL and a Docker/LAN hint. Recovery: edit hub URL or choose URL candidate.
- If backend reports stale `running` after reload, show `Current job: syncing…`; if a later refresh reports error, latest error takes precedence over any older success timestamp.
- If sync succeeds quickly, still show the spinner/`Syncing…` state long enough for the user to perceive that the click started work.
- If status refresh occurs while the user is editing fields or has pasted a token, the edits remain intact.

## 6) Transition Index

| transition_id | trigger | from_screen | to_screen | expected_feedback |
| --- | --- | --- | --- | --- |
| TR-001 | Open Memory Sync tab | Nodes page | memory_sync_source_card | Dashboard loads source/hub summary and operation lanes. |
| TR-002 | `action_test_connection` | memory_sync_source_card | memory_sync_source_card | Button says `Testing…`; connection lane updates to success/error with timestamp. |
| TR-003 | `action_sync_now` | memory_sync_source_card | sync_job_inline_running | Button says `Syncing…`; running job banner appears. |
| TR-004 | Sync completes | sync_job_inline_running | memory_sync_source_card | `Current job` returns to idle and `Last sync` shows result/timestamp. |
| TR-005 | Background job starts | memory_sync_source_card | sync_job_inline_running | Generic `Current job: syncing…` appears. |
| TR-006 | Background job completes | sync_job_inline_running | memory_sync_source_card | `Current job` returns to idle and `Last sync` shows result/timestamp. |
| TR-007 | `action_save_source_settings` | memory_sync_source_card | memory_sync_source_card | Configuration section shows saved; sync/test feedback remains separate. |

## 7) Blocking Questions

- None. Saved-token fallback uses persisted saved settings; testing an unsaved URL/source change requires saving first or pasting a draft token.
