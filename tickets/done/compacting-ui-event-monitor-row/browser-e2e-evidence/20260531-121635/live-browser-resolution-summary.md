# Live Browser Resolution Summary: CUI-E2E-009

Date: 2026-05-31

## Scenario

Re-ran the live browser/backend/frontend scenario that previously produced duplicate compaction rows. Runtime target was LM Studio via the AutoByteus native runtime, model `qwen3.6-27b:lmstudio@127.0.0.1:1234`.

## Setup

- Backend: `http://127.0.0.1:8000`, isolated data dir: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/compacting-ui-event-monitor-row/browser-e2e-evidence/20260531-121635/app-data`.
- Frontend: `http://127.0.0.1:3000`.
- Initial compaction ratio: `0.8` for turn 1.
- Updated settings before turn 2: `AUTOBYTEUS_COMPACTION_TRIGGER_RATIO=0.01`, `AUTOBYTEUS_ACTIVE_CONTEXT_TOKENS_OVERRIDE=4000`, `AUTOBYTEUS_COMPACTION_DEBUG_LOGS=true`, `AUTOBYTEUS_COMPACTION_AGENT_DEFINITION_ID=autobyteus-memory-compactor`.

## Result

Pass. The prior duplicate-row behavior is resolved in the live browser scenario.

- After `turn_0002`, the event monitor had exactly one compaction row: queued/requested.
- At `turn_0003`, the same row updated to compacting/started; row count remained 1.
- After the compactor timed out, the same row updated to failed; row count remained 1.
- The Activity panel showed exactly one Activity event/card for Memory compaction, with child task/run metadata shown inside that card.
- Backend log shows one stable parent `compaction_operation_id`: `compaction_operation_mptmpbt5_1` across `requested`, `started`, and `failed`.

## Evidence

- Backend log: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/compacting-ui-event-monitor-row/browser-e2e-evidence/20260531-121635/backend-live.log`.
- Frontend log: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/compacting-ui-event-monitor-row/browser-e2e-evidence/20260531-121635/frontend-live.log`.
- Operation id log excerpt: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/compacting-ui-event-monitor-row/browser-e2e-evidence/20260531-121635/compaction-operation-id-log-excerpt.txt`.
- Screenshots:
  - `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/compacting-ui-event-monitor-row/browser-e2e-evidence/20260531-121635/screenshots/01-agent-list.png`
  - `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/compacting-ui-event-monitor-row/browser-e2e-evidence/20260531-121635/screenshots/02-run-config-lm-studio.png`
  - `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/compacting-ui-event-monitor-row/browser-e2e-evidence/20260531-121635/screenshots/03-queued-one-row.png`
  - `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/compacting-ui-event-monitor-row/browser-e2e-evidence/20260531-121635/screenshots/04-compacting-one-row-dom-state.png`
  - `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/compacting-ui-event-monitor-row/browser-e2e-evidence/20260531-121635/screenshots/05-terminal-one-activity-card.png`
