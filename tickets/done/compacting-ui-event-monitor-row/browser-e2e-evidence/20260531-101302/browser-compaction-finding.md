# Browser E2E Compaction Activity Finding

Date: 2026-05-31

## Scenario

Live browser E2E with backend and frontend running locally, using LM Studio through the AutoByteus native runtime instead of Codex/GPT. The test lowered compaction from the frontend settings page to force a semantic memory compaction request.

## Runtime

- Backend: http://127.0.0.1:8000
- Frontend: http://127.0.0.1:3000
- Runtime kind: AutoByteus native runtime
- Model: `qwen3.6-27b:lmstudio@127.0.0.1:1234`
- Compaction setting verified by server settings: `AUTOBYTEUS_COMPACTION_TRIGGER_RATIO=0.01`, `AUTOBYTEUS_ACTIVE_CONTEXT_TOKENS_OVERRIDE=4000`, debug logs enabled.

## Observed lifecycle

1. First turn ran before lowering compaction; compaction was not required.
2. After lowering settings, second turn (`turn_0002`) exceeded the threshold. Backend emitted a compaction `requested` phase. Frontend displayed a row/card: `Compaction queued` / `QUEUED` / `Turn: turn_0002`.
3. Third turn (`turn_0003`) executed the pending compaction. Backend emitted `started`. Frontend displayed a second row/card: `Compacting memory…` / `COMPACTING` / `Turn: turn_0003`.
4. The compactor agent timed out after 120 seconds and backend emitted `failed` for `turn_0003`. The live frontend then had three compaction rows in the conversation feed: queued, compacting, and failed.

## Why this is a problem

This appears to be one deferred semantic compaction lifecycle, not multiple independent compaction activities. The requested/queued event is a scheduling phase after `turn_0002`; the started/failed events are execution phases at the start of `turn_0003`. Tool activity rows update in place for the same invocation lifecycle, but compaction rows currently fan out by turn/identity. That contradicts the expected single-lifecycle activity model and creates confusing duplicate activity cards.

## Evidence

- Backend log: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/compacting-ui-event-monitor-row/browser-e2e-evidence/20260531-101302/backend-live.log`
- Frontend log: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/compacting-ui-event-monitor-row/browser-e2e-evidence/20260531-101302/frontend-live.log`
- Screenshots:
  - `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/compacting-ui-event-monitor-row/browser-e2e-evidence/20260531-101302/screenshots/04-lowered-compaction-settings.png`
  - `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/compacting-ui-event-monitor-row/browser-e2e-evidence/20260531-101302/screenshots/05-queued-activity-row.png`
  - `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/compacting-ui-event-monitor-row/browser-e2e-evidence/20260531-101302/screenshots/06-compacting-duplicate-row.png`
  - `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/compacting-ui-event-monitor-row/browser-e2e-evidence/20260531-101302/screenshots/07-final-duplicate-failed-rows.png`
  - `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/compacting-ui-event-monitor-row/browser-e2e-evidence/20260531-101302/screenshots/08-user-observed-duplicate-rows.png`

## Classification

Validation result: Fail / Design Impact. The implementation correctly surfaces compaction phases but the activity identity model for deferred AutoByteus compaction needs design clarification or adjustment so requested -> started -> completed/failed updates one compaction activity lifecycle, analogous to tool activity state transitions.
