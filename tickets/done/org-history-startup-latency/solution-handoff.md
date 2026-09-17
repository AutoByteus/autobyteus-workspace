# Solution handoff — ORG-HISTORY-LATENCY-20260917-001

## Result

Architecture Design Complete, SR-003 / DS-001, Small / Low. Requirements SR-001 explicitly approved SR-002. This is a NEW ticket, not a reopening of prior history/settings/migration tickets. No implementation or acceptance Pass asserted.

## Request and approval

User reports latest base Electron displays Agent/Team history then Org history >10 seconds later; asks analysis/new ticket and comparison with personal nested-Team pattern. Presented independent-family visibility with preserved reconnection/selection/error/data behavior, excluding migration/storage redesign. User: “Yeah, I completely agree. I think the response should, the each history family should display as soon as the response is ready. Just because now you see like it's showing agent and team history immediately, right? After it's received. You should at that point also show agent org history.” Full approval in requirements-doc.md.

## Workspace / base / target

- Worktree: /Users/normy/autobyteus_org/autobyteus-worktrees/org-history-startup-latency
- Branch: codex/org-history-startup-latency
- Fresh bootstrap base and current HEAD: 6f15f446d6a56004caa15e70f4d8e68cba6eb9bc
- Origin base/finalization target: origin/requirements/flat-agent-organization-model, NOT personal.
- User profile/running application, base outputs and unrelated org-history-resume-offline-analysis untouched. No commit/push/build/finalization/release authorized by requirements approval.

## Evidence and selected design

Existing runHistoryLoadActions waits for BOTH queries, publishes raw workspace rows, awaits avatar loading/live Agent/Team hydration, then publishes raw Org rows. Three-case unmodified scheduler probe confirms dependency; NOT measured user's ten seconds. Pinned personal5645b49d6 source publishes nested-Team workspace slice before enrichment; no old-runtime replay.

Post-approval source investigation additionally found cached navigationProjection: fetchTree currently refreshes it only on full completion. Merely moving raw Org assignment is insufficient. DS-001 requires each accepted family to synchronously publish through existing store.refreshRunNavigationTopology (add required method to loader's structural store type); keep final wrapper refresh to incorporate later enrichment. Projector already supports Org-only workspaces before workspace catalogs. Do not create second projector/cache or new reactive rebuild watcher.

Run same two existing queries concurrently with family-local acceptance/error handlers. Org captured generation guards all Org writes/publication/recovery dispatch. Await both branches including workspace avatar/reconciliation to preserve loading and completion lifecycle, but do not gate visible rows. Keep focused refresh, strict parser, existing recovery/reconnect and selection ownership. No backend/API/persistence/migration changes.

## Expected downstream output and validation

Implement DS-001 in existing isolated worktree, preserve approved REQ-001–003/AC-001–003. Durable actual-store/projection + rendered sidebar regression must observe ready family's DOM before deferred other query/avatar/hydration settles; initialize projection first (lazy read otherwise masks gap). Preserve failure/empty/quiet/focused-vs-full generation cases and active reconciliation. Actual isolated browser startup evidence must distinguish query timing and DOM publication; expand/select history normally, retained IDs/selection/status/history, no provider inference from listing. Do not use user app/private profile for fixtures.

Small/Low direct routing is supported by one existing loader/type surface and reused synchronous store/projection, not a new concurrency policy. Escalate Design Impact for runtime/recovery/generation authority changes, backend/schema/index redesign or broader framework. Exact user timing remains unmeasured; backend reads full trees and could retain independent cost, not preapproved redesign. No Product design request, no architecture/source review Pass claimed.

## Cumulative canonical artifacts (absolute paths)
- /Users/normy/autobyteus_org/autobyteus-worktrees/org-history-startup-latency/tickets/in-progress/org-history-startup-latency/requirements-doc.md
- /Users/normy/autobyteus_org/autobyteus-worktrees/org-history-startup-latency/tickets/in-progress/org-history-startup-latency/investigation-notes.md
- /Users/normy/autobyteus_org/autobyteus-worktrees/org-history-startup-latency/tickets/in-progress/org-history-startup-latency/design-spec.md
- /Users/normy/autobyteus_org/autobyteus-worktrees/org-history-startup-latency/tickets/in-progress/org-history-startup-latency/solution-revision-record.md
- /Users/normy/autobyteus_org/autobyteus-worktrees/org-history-startup-latency/tickets/in-progress/org-history-startup-latency/bootstrap-handoff.md
- /Users/normy/autobyteus_org/autobyteus-worktrees/org-history-startup-latency/tickets/in-progress/org-history-startup-latency/validation/publication-order-probe.cjs
- /Users/normy/autobyteus_org/autobyteus-worktrees/org-history-startup-latency/tickets/in-progress/org-history-startup-latency/validation/publication-order-probe.log

## Routing

Fresh get_handoff_rules succeeded. Sole matching rule: Architecture Design Complete, Small/Medium and Low → /software_engineering_team/implementation_engineer. Selected direct implementation route; Product Requested, High/Large review and Delivery evidence-gap rules do not match. No architecture review required by this rule, not a review Pass. Notification follows persistence; actual send_message_to result is transport authority.
