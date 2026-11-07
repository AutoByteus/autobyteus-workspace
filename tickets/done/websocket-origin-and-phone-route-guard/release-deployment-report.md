# Delivery / Release / Deployment Report — websocket-origin-and-phone-route-guard (autobyteus-403)

## Release / Publication / Deployment Scope

Finalize the reviewed and validated autobyteus-403 change into `origin/personal`. No release (below). **Current state: Blocked** at the second base refresh by a source conflict with autobyteus-407; nothing pushed.

## Project Release Guide

- Release guide path and revision: `RELEASE.md` at ticket-branch `5e028310e5` (identical to `origin/personal` `6341292552`; not changed by either base commit range)
- Deviations from the guide and why: `None`
- Proposed guide fixes, and whether the user agreed: `None`

## Handoff Summary

- Handoff summary artifact: `tickets/in-progress/websocket-origin-and-phone-route-guard/handoff-summary.md`
- Handoff summary status: `Blocked` (written against the first integrated state `18fd9f4e5c`; to be updated after re-integration)
- Delivery revision record: `tickets/in-progress/websocket-origin-and-phone-route-guard/delivery-revision-record.md`
- Current delivery revision ID: `DR-001`
- Notes: —

## Initial Delivery Integration Refresh

- Bootstrap base reference: `origin/personal` @ `3bf9240d42`
- Latest tracked remote base reference checked: first `e427a0c9cf`, then `6341292552`
- Base advanced since bootstrap or previous refresh: `Yes` (twice)
- New base commits integrated into the ticket branch: `Yes` for `e427a0c9cf` (merge `18fd9f4e5c`); `No` for `6341292552` (merge aborted on conflict)
- Local checkpoint commit result: `Completed` — `f942c0eeb2` (CRR-002 documents), `5e028310e5` (delivery documents)
- Integration method: `Merge`
- Integration result: `Completed` for `e427a0c9cf`; `Blocked` for `6341292552`
- Post-integration executable checks rerun: `Yes` on `18fd9f4e5c`: `pnpm -C autobyteus-server-ts exec vitest run tests/unit/remote-access tests/unit/api/websocket tests/architecture tests/e2e/remote-access/request-origin-and-phone-routes.e2e.test.ts --no-watch` → `Test Files 22 passed (22)`, `Tests 151 passed (151)` (`evidence/delivery/DEL-01-merged-state-remote-access-checks.log`)
- Post-integration verification result: `Passed` on `18fd9f4e5c`; `Blocked` for `6341292552`
- Delivery edits started only after integrated state was current: `Yes` (current at the time; the base moved again during delivery)
- Handoff state current with latest tracked remote base: `No`
- Blocker: see Escalation / Reroute

### The conflict

`git merge origin/personal` (`6341292552`) → `CONFLICT (content): Merge conflict in autobyteus-server-ts/src/api/websocket/remote-access-websocket-auth.ts`. The source commit on the base is `4f11061ecf` (autobyteus-407, "VNC Viewer on the phone; viewer limits and live phone revocation"). It is a semantic conflict, not only a textual one:

1. **Close-code table moved.** 407 moved `closeCodeByFailure` into the new domain module `src/remote-access/domain/remote-access-close-codes.ts` (`REMOTE_ACCESS_CLOSE_CODE_BY_FAILURE: Readonly<Record<RemoteAccessAuthFailureCode, number>>`, plus `remoteAccessCloseForFailure`). This ticket adds `REMOTE_ACCESS_ORIGIN_REFUSED` and `PHONE_ACCESS_ROUTE_REFUSED` to `RemoteAccessAuthFailureCode` and to the old table. After the merge the new module's `Record<…>` lacks both, which is a type error, and they would fall to the `?? 4401` default instead of 4403.
2. **Removed helper now imported.** This ticket removed `extractRemoteAccessWebSocketCredential` from `remote-access-websocket-auth.ts`; its credential parsing is now in `RemoteAccessRoutePolicy` (`remote-access-route-policy.ts:146`). 407's `src/api/websocket/node-desktop.ts` imports it to hand the phone's credential to the new `NodeDesktopViewers` registry (`viewerFor(context, extractRemoteAccessWebSocketCredential(req))`).
3. **New live re-check path.** 407's `NodeDesktopViewers` re-checks an open phone stream with `authService.authorizeMobileCredential(...)` and closes with `remoteAccessCloseForFailure(...)`. It does not go through this ticket's route policy. `/ws/node-desktop` is in `PHONE_WEBSOCKET_ROUTES`, so the intent is compatible, but the combined behavior (the phone VNC stream under the origin gate and the route limit, plus live revocation) has not been run.

The merge was aborted (`git merge --abort`); the ticket branch is clean at `5e028310e5`.

## Verification

- Evidence judged: `Sufficient` for the change as validated (on `18fd9f4e5c`); re-verification is required after the 407 integration
- Evidence relied on: the execution report's Acceptance-Criteria Proof and Cases. I opened the critical evidence files: API-06/07 JSON and node log, the API-03 summary and node logs, the API-04 summary and node logs, API-05 JSON and logs, the API-08 recorder JSONL and logs, and the IMP-02/04/08 logs. 95.4% final confidence, no category below 95%. Integrated rerun DEL-01.

| Acceptance-Criteria ID | Cases And Files Checked | What You Saw | Judgement (`Proven`/`Not Proven`/`User Check`) |
| --- | --- | --- | --- |
| AC-001 | API-06 `API-06-07-browser-attack-and-gateway.json`, `API-06-07-node.log`; IMP-04/08 logs | Foreign terminal/projects/graphqlWs/peerObservation `"opened": false, "frames": 0`; `null` iframe refused; `REMOTE_ACCESS_ORIGIN_REFUSED /ws/terminal/abx403-evil-term origin http://evil.example:56853`; control terminal `"frames": 5`; IMP-04 `7 passed`, IMP-08 `5 failed \| 2 passed` on base | Proven |
| AC-002 | API-04 summary; API-07 JSON; API-08 recorder | LAN `('http://192.168.77.10:55079', 101)`; Tailscale-shaped `Host alpha.tail-probe.ts.net:55195 → 101`; gateway 403 without the setting, 200/101 with it; `file://` 101 | Proven |
| AC-003 | API-06 JSON; IMP-04/05 | Foreign preflighted POST `Failed to fetch`; `definitionsAfter: ['ABX403-LOOPBACK-PREFLIGHT']` | Proven |
| AC-004 | IMP-02 (`144 passed`), IMP-04 | Route refusals 4403/403 per route | Proven |
| AC-005 | IMP-04; API-04 ASM-002 | Every listed pattern registered and opens; `outsidePhoneList: []` | Proven |
| AC-006 | API-06 `checks` | `foreignLogLines: 7`, `noCredentialInLogs: true` | Proven |
| AC-007 | API-08 `API-08-desktop-ws-recorder.jsonl`, three logs | 16/16 handshakes `origin: "file://"` → 101 over 7 routes incl. node-desktop; 488 HTTP requests without Origin; 0 refusals | Proven |
| AC-008 | API-03 summary and logs; API-04 summary, WebKit rerun, logs | MSP-01…15 Pass, 0 origin/route refusals; three journeys all steps Pass, `{'alpha': [], 'beta': []}` | Proven (the approved criterion names a Host-preserving proxy shaped like Tailscale Serve; real tailnet and devices are residual risk) |
| AC-009 | API-05 JSON and logs; API-04 `remoteRun` | RTP-01…07 Pass, 0 refusals | Proven |
| AC-010 | CRR-001; this delivery's docs sync | Docs match the code | Proven by review |

- More evidence requested: `None` for the validated change. After the 407 merge is resolved, the combined phone node-desktop behavior needs executable proof (Escalation below).
- User check needed: `No`. The approved AC-008 is proven by its stated method. Real Tailscale Serve and the wrapper apps on devices remain residual risk, recorded in the handoff summary.
- User check reference, when needed: N/A
- Re-verification after later re-integration: `Pending` — required after the conflict resolution

## Release Decision

- Decision: `No release`
- Decided by: the ticket handoff ("Finalized on the base branch; release only on the user's word") and RELEASE.md's default. A beta or stable release is available on request.

## Docs Sync Result

- Docs sync artifact: `tickets/in-progress/websocket-origin-and-phone-route-guard/docs-sync-report.md`
- Docs sync result: `Updated`
- Docs updated: `autobyteus-server-ts/README.md`, `docs/android_mobile_access.md` (delivery); feature docs and glossary (source commit)
- No-impact rationale: N/A
- Note: 407 also edits `autobyteus-web/docs/remote_access.md` and `docs/android_mobile_access.md`; both auto-merged in the aborted attempt. Docs sync is rechecked after re-integration.

## Ticket State Transition

- Ticket moved to `tickets/done/<ticket-name>`: `No` (blocked before verification is final)
- Archived ticket path: N/A

## Version / Tag / Release Commit

Not applicable (no release).

## Repository Finalization

- Bootstrap context source: ticket `handoff.md`; RELEASE.md Finalization Target
- Ticket branch: `codex/websocket-origin-and-phone-route-guard`
- Ticket branch commit result: local checkpoints `f942c0eeb2`, `5e028310e5`
- Ticket branch push result: `Not done` (the Secret Gate and push come after the block is cleared)
- Finalization target remote: `origin`
- Finalization target branch: `personal`
- Target advanced after verification / acceptance: `Yes` (`e427a0c9cf` → `6341292552`)
- Delivery-owned edits protected before re-integration: `Completed` (`5e028310e5`)
- Re-integration before final merge result: `Blocked` (conflict)
- Target branch update result: N/A
- Merge into target result: N/A
- Push target branch result: N/A
- Repository finalization status: `Blocked`
- Blocker: source conflict with autobyteus-407 (above)

## Release / Publication / Deployment

- Applicable: `No`
- Release/publication/deployment result: `Not required`
- Release notes handoff result: `Not required` for this delivery. `release-notes.md` is written for the next release and carries a `## What you need to do` section (`AUTOBYTEUS_ALLOWED_ORIGINS` for a Host-rewriting gateway).

## Post-Finalization Cleanup

- Dedicated ticket worktree path: `/Users/normy/autobyteus_org/autobyteus-worktrees/websocket-origin-and-phone-route-guard`
- Worktree cleanup result: `Not yet` (blocked; the worktree is needed for the fix)
- Local ticket branch cleanup result: `Not yet`
- Remote branch cleanup result: `Not required`

## Escalation / Reroute

- Classification: `Local Fix` (integration of the latest base; no requirement or design change: 407's phone node-desktop route is already in `PHONE_WEBSOCKET_ROUTES`, and both changes intend phone credentials on `/ws/node-desktop`)
- Recommended recipient: implementation engineer, then the normal route (code review of the resolution; API/E2E for the combined behavior)
- Why final handoff could not complete: merging `origin/personal` `6341292552` conflicts in `remote-access-websocket-auth.ts`, and 407's code depends on a helper this ticket removed and on a close-code table that lacks this ticket's codes. Resolving it changes reviewed High-risk source, and the combined phone node-desktop behavior is unproven.
- What the fix needs:
  1. Merge `origin/personal` into the ticket branch.
  2. Put `REMOTE_ACCESS_ORIGIN_REFUSED: 4403` and `PHONE_ACCESS_ROUTE_REFUSED: 4403` in 407's `REMOTE_ACCESS_CLOSE_CODE_BY_FAILURE`, and have the adapter use `remoteAccessCloseForFailure`, with no second table.
  3. Give `node-desktop.ts` the phone credential from the single owner (the route policy's parsing, or an exported helper there), not a revived copy.
  4. Rerun the server unit/architecture suites, IMP-04, and 407's `tests/e2e/node-desktop/node-desktop-routes.e2e.test.ts` and `tests/unit/node-desktop/node-desktop-viewers.test.ts`.
  5. Have API/E2E prove the phone node desktop (View only/Control, live revocation closing the stream) under the origin gate and the route limit, plus a foreign-origin `/ws/node-desktop` refusal.

## Release Notes Summary

- Release notes artifact created before verification / acceptance: `tickets/in-progress/websocket-origin-and-phone-route-guard/release-notes.md`
- Archived release notes artifact used for release/publication: N/A (no release)
- Release notes status: `Updated`

## Deployment Steps

None. The repository deploys no hosted service (RELEASE.md, Deployment).

## Environment Or Persisted-Data Transition Notes

- Approved persisted-data decision: none; the change stores no data
- Delivery action required: `None`
- Result and evidence: N/A

## Verification Checks

DEL-01 on `18fd9f4e5c` (above). Further checks are pending re-integration.

## Rollback Criteria

Revert the merge on `personal` (RELEASE.md, Rollback). No data migration, so rolling back is possible.

## Final Status

- Verification complete: `No` (re-verification needed after the 407 integration)
- Repository finalization complete: `No`
- Applicable release/deployment/rollout complete or not required: `Yes` (not required)
- Applicable safe cleanup complete or not required: `No`
- Unresolved blocker: source conflict with autobyteus-407 at `origin/personal` `6341292552`
- Successful terminal package eligible for return: `No`
- Terminal package sent to the Solution Designer: `No`
- Terminal message/reference: N/A
