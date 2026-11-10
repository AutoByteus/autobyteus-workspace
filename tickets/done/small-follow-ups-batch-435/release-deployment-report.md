# Delivery / Release / Deployment Report — small-follow-ups-batch-435 (autobyteus-435)

## Release / Publication / Deployment Scope

Finalize the validated ticket into `personal`. No release: the user releases only on their word (investigation notes, user constraints), and none was asked for.

## Project Release Guide

- Release guide path and revision: `RELEASE.md` on `origin/personal` @ `aae0a53a81` (read in the ticket worktree after the base refresh)
- Deviations from the guide and why: `None`
- Proposed guide fixes, and whether the user agreed: `None`

## Handoff Summary

- Handoff summary artifact: `tickets/done/small-follow-ups-batch-435/handoff-summary.md`
- Handoff summary status: `Updated`
- Delivery revision record: `tickets/done/small-follow-ups-batch-435/delivery-revision-record.md`
- Current delivery revision ID: `DR-001`
- Notes: `task_size` Medium, `architectural_risk` High, route Reviewed

## Initial Delivery Integration Refresh

- Bootstrap base reference: `origin/personal` @ `310fc27452`
- Latest tracked remote base reference checked: `origin/personal` @ `aae0a53a81`
- Base advanced since bootstrap or previous refresh: `Yes` (16 commits: autobyteus-455 Daily Assistant as a collaborator, autobyteus-456 beta v1.5.13-beta.2 release records and version bump)
- New base commits integrated into the ticket branch: `Yes`
- Local checkpoint commit result: `Completed` (`230c9773d0`: the code reviewer's uncommitted CRR-005 documents)
- Integration method: `Merge` (`9ece2da7e7`)
- Integration result: `Completed`; no conflicts. The only file changed on both sides, `autobyteus-server-ts/docs/modules/agent_communication.md`, merged automatically
- Post-integration executable checks rerun: `Yes`. The base changed server collaborator admission (`collaborator-candidate-policy.ts`, `built-in-agent-registry.ts`) and web mention eligibility (removed `utils/agents/builtInAgentDefinitionIds.ts`); the ticket changed server delegation refusal and web stores and mobile composables. No ticket file imports the removed web file.
  - `pnpm -C autobyteus-server-ts exec vitest run tests/unit/agent-collaboration tests/unit/agent-org-execution tests/unit/standalone-agent-run-root tests/unit/api/graphql/agent-run-collaboration-statuses.test.ts` → `Test Files 80 passed (80)`, `Tests 896 passed (896)` (`evidence/delivery/server-unit.txt`)
  - `pnpm -C autobyteus-web typecheck` → `production errors: 0; test-file errors: 93 in 40 files (baseline 93 in 40 files)`, `[typecheck] PASS` (`evidence/delivery/web-typecheck.txt`)
  - `pnpm -C autobyteus-web test:nuxt --run utils/collaborators utils/agents stores/__tests__/agentRunCollaborationStore.spec.ts stores/__tests__/agentRunStore.spec.ts components/mobile composables/mobile` → `Test Files 25 passed (25)`, `Tests 259 passed (259)` (`evidence/delivery/web-unit.txt`)
- Post-integration verification result: `Passed`
- Delivery edits started only after integrated state was current: `Yes`
- Handoff state current with latest tracked remote base: `Yes`

## Verification

- Evidence judged: `Sufficient`
- Evidence relied on: the execution report's Acceptance-Criteria Proof (round 2 authoritative), the cases' evidence files opened for every critical criterion, the implementation checks it reuses, the 95% final confidence (no category below 90%; target 95% met), and the integrated-state rerun above.

| Acceptance-Criteria ID | Cases And Files Checked | What You Saw | Judgement (`Proven`/`Not Proven`/`User Check`) |
| --- | --- | --- | --- |
| AC-001-1 | API-17 (r2): `round2/API-17-full-probe-excerpt.txt`, `round2/API-17-full-probe/mobile-shell-probe.json` | `failed requests to localhost:8000/health: 0`; JSON `result` `Pass`, 36 cases all `Pass`, `unknownBrowserErrors` 0 | Proven |
| AC-003-1 | API-13 (r2): `round2/API-13-r2-electron-nodes-page.txt`, `round2/API-13-r2-row-abx435-row.png` | row and Add: "The node at this address doesn’t accept the name 127.0.0.1.nip.io. Add … to AUTOBYTEUS_ALLOWED_HOSTS …"; closed port "No answer from that address."; plain 403 "isn't an AutoByteus node"; window read `{"status":403,"type":"basic","code":"REMOTE_ACCESS_HOST_REFUSED"}`; the screenshot shows the words on the packaged app's row | Proven |
| AC-004-1 | API-07 (r2) `round2/API-07-r2.txt`; API-18 (r2) `round2/API-18-r2.txt`, `round2/API-18-fill-a.png`; IMP-20 | API 35 and API 34: `ROTATION_90` and `ROTATION_270` `"viewport":[915,412]` = `"screen":[915,412]`, Fill `"canvas":[0,-51,915,515]`; API 34 content frame `0,0-2400,1080` in full screen, `0,136-1080,2337` after (as before); the Fill screenshot is edge to edge | Proven (other makers' cutouts: residual, UNK-001) |
| AC-005-1, -3, -7, -8 | API-17 (r2) MSP-33 | four restores `reached True same query True opening True listShown False`; gone row → list; reload before the send → list | Proven |
| AC-005-2 | API-09 `API-09-viewer-full-screen-process-death.txt` | `E3 reopened from the launcher (new pid 5456) \| ROTATION_90 … bars: visible=false … &screen=desktop&full=1 … "viewer":true` | Proven |
| AC-005-6 | API-17 (r2) MSP-33; API-10 `API-10-android-created-run-process-death.txt` | route moves from `temp-…` to `project_task_manager_…` after the send; Android: `sample 11 "opening":true` then `sample 12 "activity":true` with the node run id after process death | Proven |
| AC-006-1 | API-08, API-08b (r2) | API 35 and 34: `"topAtSendCentre":"mobile-node-desktop-clipboard-send"`, `mInputShown=true`; `node clipboard after Send: 'abx435-sent-in-full-screen'` | Proven |
| AC-008-1 | API-11 `API-11-pairing-retry.txt` | overlay `Can’t reach abx435 Proxy Node … Retry`; paired devices `before: 1` → `after: 2`; `R5 after Retry … "connected":true` | Proven |
| AC-009-1 | `docs/android_mobile_access.md:84` (delivery's docs review) | "tap **Got it** before the viewer takes touches (the hint holds them until then; system behaviour)" | Proven |
| AC-010-1 | API-01: IMP-13 (`Tests 5586 passed`), owner specs in the change (`WebSocketClient.spec.ts`, `credentialRefusalClose.spec.ts`, `agentRunStore.spec.ts`, `agentTeamRunStore.spec.ts`, `agentRunCollaborationStreamingService.reconnect.spec.ts`, `agentOrgStreamingService.spec.ts`, `FileExplorerStreamingService.spec.ts`) | full web suite green with the per-owner specs | Proven (unit, as the criterion asks) |
| AC-010-2, AC-010-3 | API-17 (r2) | MSP-32 `"refused": [], "refusedSockets": [], "socketsOpened": 0`; MSP-13 and MSP-18 `Pass`; verdict `Pass` | Proven |
| AC-011-1 | API-17 (r2) MSP-34, MSP-35 | stopped host (`"isActive": false`); after DONE the row leaves in 833–4228 ms on both phones and the desktop, `viewReads` 1 | Proven for "leaves". The "(or reopened) … returns" half cannot occur for a stopped host: setting the Task back to TODO does not reopen its executions, and the probe shows the row stays gone with the node still closed (`afterTodo … "listed": false`), which matches the active-host rule. The code reviewer's TR-N1 asks the execution report to say so; I record it here instead of sending a wording-only round back. Not a gap in the change |
| AC-013-1 | API-19 / API-17 (r2) MSP-36 | `/project_task_manager is your own address; you can't delegate to yourself. …`; `/lead is your own address; …`; teammate keeps `/mate is in your own team; …`; `ptmNodes before 18 after 18` (nothing placed) | Proven |
| AC-014-1 | IMP-17 `IMP-17-render-system-instructions-excerpt.txt` | phone and desktop: `preMaxHeight "none"`, `preHasOwnScroll false`, `textLength 15818`, `collapsedAgain.expanded "false"` | Proven |
| non-critical ACs | execution report rows (API-01, API-02, API-04, API-06, API-12, API-13 r1 Chrome comparison) | as listed there | Proven |

- More evidence requested: `None`
- User check needed: `No`. Every critical criterion is proven on real surfaces (emulators API 35 and 34, the packaged desktop app, live nodes). Other makers' cutouts are a residual risk the user's own phone will show after a release, not a check this finalization needs.
- Re-verification after later re-integration: recorded under Repository Finalization

## Release Decision

- Decision: `No release`
- Decided by: the user ("release only on the user's word", investigation notes § user constraints) and `RELEASE.md` Release Decision's default. A release is available; the change ships with the next one.

## Docs Sync Result

- Docs sync artifact: `tickets/done/small-follow-ups-batch-435/docs-sync-report.md`
- Docs sync result: `Updated`
- Docs updated: `autobyteus-web/docs/chat.md`, `docs/design-cases.md` (stale path of the moved route-sync composable, C-09)

## Ticket State Transition

- Ticket moved to `tickets/done/small-follow-ups-batch-435`: `Yes`
- Archived ticket path: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/small-follow-ups-batch-435` (on `personal`)

## Version / Tag / Release Commit

None (no release).

## Repository Finalization

Recorded after the merge and push (below this line in the record commit).

## Release / Publication / Deployment

- Applicable: `No`
- Release/publication/deployment result: `Not required`
- Release notes handoff result: `Not required`

## Release Notes Summary

- Release notes status: `Not required` (no release). The change needs no action from users, so a later beta's notes need no `## What you need to do` section from this ticket.

## Deployment Steps

None. This repository deploys no hosted service (RELEASE.md Deployment). The phone page and the Android app come from the same release: users get items 5–9 with the next release of both.

## Environment Or Persisted-Data Transition Notes

- Approved persisted-data decision: `Not Affected` (REQ-012 only moves an import; the stored task-execution key is unchanged)
- Delivery action required: `None`

## Rollback Criteria

Revert the merge commit on `personal` (no data migration; no stored format changes).
