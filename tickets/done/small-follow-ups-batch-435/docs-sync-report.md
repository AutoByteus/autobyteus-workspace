# Docs Sync Report — small-follow-ups-batch-435 (autobyteus-435)

## Scope

- Ticket: `small-follow-ups-batch-435` (autobyteus-435), `task_size` Medium, `architectural_risk` High, route Reviewed (architecture review, source review, API/E2E, test-code review)
- Trigger: validated package from the code reviewer (CRR-005 Pass after API-REV-002 Pass, 95%)
- Bootstrap base reference: `origin/personal` @ `310fc27452`
- Integrated base reference used for docs sync: `origin/personal` @ `aae0a53a81`, merged into the ticket branch as `9ece2da7e7` (on checkpoint `230c9773d0`)
- Post-integration verification reference: `evidence/delivery/server-unit.txt`, `web-typecheck.txt`, `web-unit.txt` (all on `9ece2da7e7`)

## Why Docs Were Updated

- Summary: implementation already updated the long-lived docs for each item it changed (listed below, checked against the final code). Delivery fixed the remaining stale references to the desktop chat route sync, which this ticket moved and renamed (code review note C-09), and confirmed the phone guide's full-screen hint note (AC-009-1).
- Why this should live in long-lived project docs: `chat.md` is the frontend's owner doc for the chat route and lists its specs; `docs/design-cases.md` is read before designs of the same shape, and both named a file that no longer exists.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result (`Updated`/`No change`/`Needs follow-up`) | Notes |
| --- | --- | --- | --- |
| `DESIGN.md` | project design rules vs the final change | No change | the change adds no rule; the ticket's two design cases (20, 21) are in `docs/design-cases.md` |
| `docs/design-cases.md` | Case 20 named the moved composable | Updated | see Docs Updated |
| `TESTING.md` | test commands and rules the ticket used | No change | no reported discrepancy; the probe command (`test:e2e:mobile-shell`) and the emulator / isolated-app rules worked as written; the guide lists no probe case IDs |
| `RELEASE.md` | finalization rules used by this delivery | No change | followed as written |
| `autobyteus-web/docs/chat.md` | C-09: lines 363 and 560 named `composables/chat/useChatRouteRunSync.ts` and its spec | Updated | see Docs Updated |
| `docs/android_mobile_access.md` | AC-009-1 (REQ-009) and items 5, 8, 9 | No change (already updated by implementation) | line 84: full screen lays out into the cutout (API 28 and later) and "tap **Got it** before the viewer takes touches"; line 88: the HTTP-error overlay words and Retry of a pairing link |
| `autobyteus-web/docs/settings.md` | item 2 after DEC-019 | No change (already updated) | lines 400–408: `host_refused` from the readable 403 code in the desktop window; `window_refused` in a browser window |
| `autobyteus-server-ts/docs/modules/agent_tools.md`, `agent_communication.md`, `agent_team_execution.md`, `standalone_agent_run_root.md` | item 13 (self-delegation words) | No change (already updated) | `agent_tools.md:328-330` gives the self words; `agent_communication.md` merged cleanly with the base's Daily Assistant change |
| `autobyteus-web/docs/agent_execution_architecture.md` | item 14 | No change (already updated) | |
| `autobyteus-web/docs/remote_access.md`, `workspace_layout.md`, `autobyteus-server-ts/docs/design/node_access_model.md` | items 1, 5, 10, 11 | No change (already updated) | |
| `autobyteus-android/README.md` | item 5 after DEC-020 | No change | lines 16–18 describe the insets and full-screen owners as built |
| repository docs | removed symbols (`isNetworkRefused`, `windowRefusedPage`, `dateUtils`, `diagnosticFromWebSocketClose`) | No change | no doc names them |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-web/docs/chat.md` | stale path | the route-sync paragraph names `composables/useDraftRunPromotionRouteSync.ts` and says the phone's `useMobileRouteRunSync.ts` uses the same rule; the spec list names `composables/__tests__/useDraftRunPromotionRouteSync.spec.ts` | the file was moved and renamed in IR-002 (AR-005); C-09 |
| `docs/design-cases.md` | stale path | Case 20's fix names the shared composable instead of `useChatRouteRunSync.ts` | the same move |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Draft → node run promotion and routes | one rule keeps both the desktop `/chat?id` and the phone `row` on the promoted run | design-spec DS-006b, implementation-handoff IR-002 | `autobyteus-web/docs/chat.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| `composables/chat/useChatRouteRunSync.ts` | `composables/useDraftRunPromotionRouteSync.ts` | `autobyteus-web/docs/chat.md`, `docs/design-cases.md` Case 20 |
| `utils/dateUtils.ts`, `diagnosticFromWebSocketClose` | removed (unused) | nothing to document |

## Delivery Continuation

- Result: `Pass`
- Next delivery action: handoff summary, verification record, finalization
- Notes: no follow-up from docs sync. FU-002 already lists `teamExecutionViewState.ts` (the code reviewer's suggestion).
