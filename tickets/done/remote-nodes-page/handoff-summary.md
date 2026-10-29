# Handoff Summary — remote-nodes-page (autobyteus-267)

Status: **finalized into `personal` and released in beta `v1.5.8-beta.8`** (DR-001), at the user's request. **AC-506, the user's desktop-window check on a Docker node and the desktop node in both directions, is open:** the user runs it on the beta.

## Ticket

- Package: `remote-nodes-page`, Project Task `autobyteus-267`, part of autobyteus-25. Nodes → Remote Collaboration shows each peer's state now and, when it is available, its Agents and Agent Teams, with search. The note card is replaced by a collapsed rules line.
- Classification: `task_size=Medium`, `architectural_risk=Low`. Route: **direct** (no independent architecture or source review):
  - API/E2E API-REV-001 found F-001;
  - the code reviewer's failure-origin review CRR-001 traced F-001 to the web store;
  - IR-002 fixed it;
  - API-REV-002 Pass, 95%;
  - test-code review: `Not Required — direct low-risk route`.
- Archived ticket folder: `tickets/done/remote-nodes-page/` on `personal`.

## What Changed

- **Server:** GraphQL `peerNodeOffer(nodeId)` answers `{entries [{name, kind, description}]}` (no address) or `{refusalCode}`, through `RemoteNodeDiscovery.listAvailableAgentsOf(nodeId)`, the same path as `list_available_agents` with `node`.
- **Web:**
  - `stores/remoteCollaborationOffersStore.ts`: one ask per peer, a token per ask, no polling or caching. It asks on open and on switch-on (every peer), and on add and Refresh (one peer). Each ask is a new request (`queryDeduplication: false`, the F-001 fix).
  - `RemoteCollaborationOfferDisclosure.vue` and `RemoteCollaborationOfferList.vue`: the one-line preview, the side-by-side lists, search above 6 entries.
  - Per-peer states with sentences; the off notice; en and zh-CN.
- **Tests:** the new durable browser probe `autobyteus-web/tests/e2e/remote-nodes-page-probe.mjs` (`pnpm -C autobyteus-web test:e2e:remote-nodes-page`, after a server build; needs Chrome), plus the two-server E2E's `peerNodeOffer` checks (RC-16/26/27) and the specs.
- **Docs:** `remote_collaboration.md` and `autobyteus-web/docs/settings.md` by the implementation; delivery added the in-flight rule (`docs-sync-report.md`).

## Integration

- `origin/personal` advanced from `9e7a458808` to `00d8a7ce62`: remote-node-runtime-sign-in (Codex and Grok sign-in on remote Docker nodes) and `1.5.8-beta.7`.
- A checkpoint commit `186e487af1` added the reviewer's CRR-001 documents.
- The merge `534ae78028` was clean. `autobyteus-web/package.json` (the version bump beside the new probe script) and `autobyteus-web/docs/settings.md` changed on both sides and merged correctly.
- Rerun on the merged state, after `pnpm install` and prebuild (`evidence/delivery/`):

| ID | Command | Result | Evidence |
| --- | --- | --- | --- |
| DEL-01 | `pnpm -C autobyteus-server-ts typecheck` | Pass | `DEL-01-server-typecheck.log` |
| DEL-02 | `pnpm -C autobyteus-server-ts test:unit` | Pass, 788 files, 6467 passed, 7 skipped | `DEL-02-server-unit-full.excerpt.log` |
| DEL-03 | web guards; `pnpm -C autobyteus-web test:nuxt` | Pass; 651 files, 4646 passed, 5 skipped | `DEL-03-web-guards-and-unit.excerpt.log` |
| DEL-04 | server build; `test:integration:prepare` | Pass | `DEL-04-server-build-and-prepare.log` |
| DEL-05 | two-server E2E | Pass, 29/29. RC-27 `pageCodes`: gamma `PEER_UNREACHABLE`, delta `REMOTE_COLLABORATION_OFF`, epsilon `PEER_NOT_REGISTERED`; black-holed beta `PEER_UNREACHABLE` at 20 006 ms | `DEL-05-two-server-e2e.log`, `DEL-05-run/` |
| DEL-06 | browser probe | Pass, 9/9. RNP-06 `thetaAsked {onReturn 1, onSwitchOnAgain 1}`; theta settles at 20 127 ms; 0 requests to peers; nothing asked while off or during 30 s quiet; cleanup clean, no browser errors | `DEL-06-browser-probe.log`, `DEL-06-probe/` |

## Verification

- **Judged from the evidence: sufficient for AC-501, 502, 504, 505 and 507.**
- **Evidence opened:**
  - the probe JSON and screenshots of run 6;
  - the API-01 receipt (`pageOffer` = the tool's 12 entries without addresses; `pageCodes`; `heldPage`);
  - the F-001 retest (runs 5 and 6);
  - DEL-05 and DEL-06 on the merged state.
- **Confidence:** 95%, with no category below 90%.
- **Screenshot note:** "RNP-01-theta-checking-others-settled.png" stops above theta, so theta's waiting state rests on the probe's DOM record and the implementation's IMP-08 screenshot.
- **AC-506 (the user's check):** the desktop window on the user's Docker node and on the desktop node, in both directions. It needs the user's nodes.
  - The user asked for a new beta (2026-10-21, "could you please release a new beta") while this ticket was in delivery. Delivery took that as the same choice as for autobyteus-261: finalize now and check on the beta.
  - Status: **open**.

## Release

- `Beta` `v1.5.8-beta.8`, by the user's request.

## Residual Risks And Follow-ups

- RSK-501 (accepted): with more than 6 silent peers, a 7th waits behind the browser's connection limit.
- RSK-401 (from 261).
- No follow-ups for this ticket.
