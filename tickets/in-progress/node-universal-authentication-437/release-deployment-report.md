# Delivery / Release / Deployment Report — node-universal-authentication-437 (autobyteus-437), slice 1 "no key, no access"

Status: **Blocked at the post-integration check (DR-001)**. Nothing pushed, merged or tagged.

## Release / Publication / Deployment Scope

- Ticket branch `codex/node-universal-authentication-437` (worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/node-universal-authentication-437`), `task_size` `Large`, `architectural_risk` `High`, route `Reviewed` (architecture review, CRR-001…005, API-REV-002 Pass 95%).
- Release requested by the user at delivery: **Beta** (`v1.5.12-beta.9` is the next beta per `python3 scripts/release_versions.py next-beta`). The user waives the **Codex** runtime of the release smoke check if no Codex credits are left.

## Project Release Guide

- Release guide path and revision: `RELEASE.md` as on `origin/personal` `31aa11b241` (read from `git show origin/personal:RELEASE.md`, as the guide asks).
- Deviations from the guide and why: `None` so far.
- Proposed guide fixes, and whether the user agreed: `None`.
- Build-only release run: not required. The ticket changes no release workflow, packaging, runner image or build step/gate (`git diff --name-only b690a5dfdb..codex/node-universal-authentication-437 -- .github scripts '*/scripts' …`: dev-runtime scripts, the public Docker launcher, `package.json` probe script line). Build inputs were proven by API/E2E's fresh-start build (API-FS, ENV-7).

## Handoff Summary

- Handoff summary artifact: not yet written (written only on a passing integrated state).
- Handoff summary status: `Blocked`
- Delivery revision record: `tickets/in-progress/node-universal-authentication-437/delivery-revision-record.md`
- Current delivery revision ID: `DR-001`

## Initial Delivery Integration Refresh

- Bootstrap base reference: `b690a5dfdb`
- Latest tracked remote base reference checked: `origin/personal` `31aa11b241`
- Base advanced since bootstrap: `Yes` (43 commits: autobyteus-426 r2, 432, 433 phone node names, 434 phone live run stream reconnection)
- New base commits integrated into the ticket branch: `Yes`
- Local checkpoint commit result: `Completed` — `2252914dd5` (the code reviewer's uncommitted CRR-004/CRR-005 records)
- Integration method: `Merge` — `3e85115f6e`
- Integration result: `Completed`, one conflict: `autobyteus-web/tests/e2e/mobile-shell-probe.mjs` imports (this ticket's `fixtures/probe-node-access.mjs` import vs the base's `mobile-live-reconnect-cases.mjs` import); both kept.
- Post-integration executable checks rerun: `Yes`

| Check | Command | Result | Evidence (`evidence/delivery/`) |
| --- | --- | --- | --- |
| DR1-01 server build | `pnpm -C autobyteus-server-ts build` | Pass | `DR1-server-build.log` (`server build exit 0`) |
| DR1-02 phone bundle | `pnpm -C autobyteus-web build:mobile-web` | Pass | `DR1-build-mobile-web.log` (`mobile web build exit 0`) |
| DR1-03 web specs where base and ticket overlap | `NUXT_TEST=true npx vitest run components/mobile utils/remoteAccess services/agentStreaming services/liveStreamLifecycle stores/__tests__/remoteCollaborationStore.spec.ts stores/__tests__/agentRunStore.spec.ts` | Pass | `DR1-web-overlap-specs.log` (`Test Files 43 passed`, `Tests 396 passed`) |
| DR1-04 base's new server test | `vitest run tests/unit/agent-memory/external-runtime-user-message-identity.test.ts` | Pass | `DR1-server-base-new-test.log` |
| DR1-05 phone probe (AC-005) on the merged state | `pnpm -C autobyteus-web test:e2e:mobile-shell --output-dir=…/DR1-mobile-shell` | **Fail** | `DR1-mobile-shell.log`, `DR1-mobile-shell/mobile-shell-probe.json`, `DR1-mobile-shell/server-gamma.log` |

- DR1-05 detail: MSP-01…MSP-20 all `Pass` (the 20 cases API-03 r2 proved). The base's new block MSP-21…23 (`mobile-live-reconnect-cases.mjs`, autobyteus-434) fails at its setup: `Error: Timed out waiting for the warm-up replies stored on the node` (`mobile-live-reconnect-cases.mjs:172`). `server-gamma.log` lines 121–123: `Node request refused NODE_CREDENTIAL_REQUIRED /ws/agent-team/…`, `/ws/agent/…`, `/ws/agent-org/…` from `127.0.0.1`. The case module's node-side clients (`nodeClient`, line ~136: `new NodeWebSocket(\`${wsBase}/ws/${route}\`)`) open without the probe's credential; the probe never calls `attachToProbeProcess()`, and these sockets do not use `ownerSocketUrl`. Same class as API-16's LRL-001…005 fix in `fa6ec192a0`.
- Post-integration verification result: `Blocked`
- Delivery edits started only after integrated state was current: `Yes` (only this report and the revision record; no docs sync yet)
- Blocker: the base's MSP-21…23 have not run under this ticket's enforcement, so the merged state's phone live-reconnect behaviour (autobyteus-434 AC-001…005) is unproven with keys on.

## Verification

- Evidence judged (pre-integration package): `Sufficient`, except AC-008's second-device part.

| Acceptance-Criteria ID | Cases And Files Checked | What You Saw | Judgement |
| --- | --- | --- | --- |
| AC-001 | API-04 `API-04/API-04-real-network.log`; R-IMP | `POST 127.0.0.1 /graphql -> 401 NODE_CREDENTIAL_REQUIRED`, made-up key `401 NODE_CREDENTIAL_INVALID`, `/rest/health -> 200` exempt | Proven |
| AC-003 | API-01 r2 `R2-API-01-electron/R2-API-01-transcript.txt` | `searchFiles` 200 with `src/app-437.ts`; terminal `R2-TERM-42`; credential-shaped strings in DOM/storage 0 | Proven |
| AC-004 | API-02 `API-02-docker/API-02-desktop-transcript.txt` | "Needs connecting. This desktop has no key for docker-3 yet." then connected with the setup code; refusal lines carry no credential | Proven |
| AC-005 | API-03 r2 `R2-API-03-mobile-shell/mobile-shell-probe.json`; DR1-05 | 20/20 `Pass` before integration; 20/20 again on the merged state; MSP-21…23 (new in the base) not yet run with keys | Proven for MSP-01…20; merged-state MSP-21…23 **pending** |
| AC-006 | API-11 `API-11-gateway/API-11-gateway.log` | signed offer and `delegate_task` through an nginx base path; `result Pass` | Proven |
| AC-008 | API-04 | LAN not allowed `403 NODE_NETWORK_REFUSED`, Tailscale owner key `200` on this computer's real addresses | Proven on this computer; second physical device: **User Check** |
| AC-002, 007, 009 | R-IMP (implementation Checks Run) | as listed in the execution report | Proven |

- More evidence requested: API/E2E — MSP-21…23 on the merged state with the credential (this round).
- User check needed: `Yes`. AC-008 needs a phone on the home Wi-Fi (allowed / not allowed) and on another network. API/E2E tried the tailnet Linux host (no SSH), the phone (not on adb) and Android emulators (NAT to loopback).

## Release Decision

- Decision: `Beta`
- Decided by: the user at delivery ("a beta release … I don't have any codex credits but I waive for them"), then confirmed ("when everything is fine, please release a beta … waive for both codex and grok in case of token limit"). Waiver: the **Codex** and **Grok** runtimes of `scripts/release_smoke.py` are waived only if their quota refuses ("usage limit", 429). Any other failure of those runtimes still blocks the tag. Claude, Antigravity and AutoByteus are not waived.

## Docs Sync Result

- Not started (blocked before docs sync, as the integration rule requires).

## Ticket State Transition

- Ticket moved to `tickets/done/`: `No`

## Repository Finalization

- Ticket branch commit result: local commits only; ticket branch push: `Not done` (Secret Gate not yet run)
- Repository finalization status: `Blocked`

## Release / Publication / Deployment

- Applicable: `Yes` (Beta), not started.

## Post-Finalization Cleanup

- Not started.

## Escalation / Reroute

- Classification: test code in this ticket's scope (QR-003, "no internal caller breaks"; API-16's rule that every probe that starts a node carries its credential), brought in by the base merge: a `Local Fix` to probe code, owned by API/E2E.
- Recommended recipient: API/E2E engineer.
- Why final handoff could not complete: the merged state's post-integration check fails on MSP-21…23's credential-less node-side sockets.

## Environment Or Persisted-Data Transition Notes

- Approved persisted-data decision: `Directly Usable — No Migration` (design spec). Delivery action required: `None`.

## Rollback Criteria

- Revert the merge on `personal` and cut a new beta. The new credential files are additive and an older build ignores them. An older build also removes the credential gate.

## Final Status

- Verification complete: `No` (merged-state MSP-21…23; AC-008 user check)
- Repository finalization complete: `No`
- Applicable release complete: `No`
- Unresolved blocker: MSP-21…23 without a credential on the merged state
- Successful terminal package eligible for return: `No`
- Terminal package sent to the Solution Designer: `No`
