# Delivery / Release / Deployment Report — node-universal-authentication-437 (autobyteus-437), slice 1 "no key, no access"

Status: **DR-002: Delivery Completed: finalized on `personal`, beta `v1.5.12-beta.9` published (4/4 workflows, 23/23 assets).** DR-001 (blocked at the post-integration check) is kept below where it still applies.

## Release / Publication / Deployment Scope

- Ticket branch `codex/node-universal-authentication-437` (worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/node-universal-authentication-437`), `task_size` `Large`, `architectural_risk` `High`, route `Reviewed` (architecture review, CRR-001…005, API-REV-002 Pass 95%).
- Release requested by the user at delivery: **Beta** (`v1.5.12-beta.9` is the next beta per `python3 scripts/release_versions.py next-beta`). The user waives the **Codex** runtime of the release smoke check if no Codex credits are left.

## Project Release Guide

- Release guide path and revision: `RELEASE.md` as on `origin/personal` `31aa11b241` (read from `git show origin/personal:RELEASE.md`, as the guide asks).
- Deviations from the guide and why: `None`. One narrow `.gitleaks.toml` false-positive entry, as the Secret Gate section allows.
- Proposed guide fixes, and whether the user agreed: `None`.
- Build-only release run: not required. The ticket changes no release workflow, packaging, runner image or build step/gate (`git diff --name-only b690a5dfdb..codex/node-universal-authentication-437 -- .github scripts '*/scripts' …`: dev-runtime scripts, the public Docker launcher, `package.json` probe script line). Build inputs were proven by API/E2E's fresh-start build (API-FS, ENV-7).

## Handoff Summary

- Handoff summary artifact: `tickets/done/node-universal-authentication-437/handoff-summary.md`
- Handoff summary status: `Updated` (DR-002)
- Delivery revision record: `tickets/done/node-universal-authentication-437/delivery-revision-record.md`
- Current delivery revision ID: `DR-002`

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
- DR-002: API/E2E fixed the probe (`43e6d41eb0`, test-only) and ran MSP-21…23 on the merged state: Pass (`evidence/api-e2e/R3-API-03-mobile-shell-msp21-23.log`: `MSP-21 Pass`, `MSP-22 Pass`, `MSP-23 Pass`, `mobile-shell probe: Pass`; 0 unknown browser errors). Run 1 failed only on the favicon known-error rule (401, not 404, under deny by default). CRR-006 Pass. `origin/personal` unchanged at `31aa11b241` on DR-002's fetch.
- Post-integration verification result: `Passed` (DR-002)
- Delivery edits started only after integrated state was current: `Yes` (only this report and the revision record; no docs sync yet)
- Blocker (DR-001, resolved in DR-002): the base's MSP-21…23 had not run under this ticket's enforcement.

## Verification

- Evidence judged (pre-integration package): `Sufficient`, except AC-008's second-device part.

| Acceptance-Criteria ID | Cases And Files Checked | What You Saw | Judgement |
| --- | --- | --- | --- |
| AC-001 | API-04 `API-04/API-04-real-network.log`; R-IMP | `POST 127.0.0.1 /graphql -> 401 NODE_CREDENTIAL_REQUIRED`, made-up key `401 NODE_CREDENTIAL_INVALID`, `/rest/health -> 200` exempt | Proven |
| AC-003 | API-01 r2 `R2-API-01-electron/R2-API-01-transcript.txt` | `searchFiles` 200 with `src/app-437.ts`; terminal `R2-TERM-42`; credential-shaped strings in DOM/storage 0 | Proven |
| AC-004 | API-02 `API-02-docker/API-02-desktop-transcript.txt` | "Needs connecting. This desktop has no key for docker-3 yet." then connected with the setup code; refusal lines carry no credential | Proven |
| AC-005 | API-03 r2 `R2-API-03-mobile-shell/mobile-shell-probe.json`; DR1-05 | 20/20 `Pass` before integration; 20/20 again on the merged state; MSP-21…23 (new in the base) not yet run with keys | Proven, also on the merged state (MSP-01…20 DR1-05; MSP-21…23 API-REV-003) |
| AC-006 | API-11 `API-11-gateway/API-11-gateway.log` | signed offer and `delegate_task` through an nginx base path; `result Pass` | Proven |
| AC-008 | API-04 | LAN not allowed `403 NODE_NETWORK_REFUSED`, Tailscale owner key `200` on this computer's real addresses | Proven on this computer; second physical device: **User Check, skipped by the user** |
| AC-002, 007, 009 | R-IMP (implementation Checks Run) | as listed in the execution report | Proven |

- More evidence requested: API/E2E — MSP-21…23 on the merged state with the credential (DR-001). Result: Pass (API-REV-003, CRR-006).
- User check needed: `Yes`. AC-008 needs a phone on the home Wi-Fi (allowed / not allowed) and on another network. API/E2E tried the tailnet Linux host (no SSH), the phone (not on adb) and Android emulators (NAT to loopback).
- User check reference: **skipped by the user** ("a second device check I think there's no need … skip it … the beta goes without AC 008, please go with beta now"). AC-008 ships proven on this computer's real LAN and Tailscale addresses only; its second-device part is untested and can be checked on the beta.

## Release Decision

- Decision: `Beta`
- Decided by: the user at delivery ("a beta release … I don't have any codex credits but I waive for them"), then confirmed ("when everything is fine, please release a beta … waive for both codex and grok in case of token limit"). Waiver: the **Codex** and **Grok** runtimes of `scripts/release_smoke.py` are waived only if their quota refuses ("usage limit", 429). Any other failure of those runtimes still blocks the tag. Claude, Antigravity and AutoByteus are not waived.

## Docs Sync Result

- Docs sync artifact: `tickets/done/node-universal-authentication-437/docs-sync-report.md`
- Docs sync result: `Updated`
- Docs updated: `autobyteus-web/docs/remote_access.md` (revocation closes the phone viewer at once, not the removed 20 s re-check); `TESTING.md` (the probe credential fixture for the probe's own calls and sockets).

## Secret Gate (ticket branch, before the first push)

- `scripts/check_secrets.sh origin/personal..HEAD`: the first run found 1 `generic-api-key` finding in `autobyteus-web/components/tools/__tests__/McpGatewayPanel.spec.ts:21` (commit `54d98f0152`, never pushed). By shape and context, the test's two mocked gateway tokens are made up: `mcpg_` + the word `secretvalue` / `regenerated` + the sequential digits `1234567890` / `0987654321`. I added the narrowest entry to `.gitleaks.toml` (exactly these two values, generic rule only, with the reason). Rerun: `secret gate: PASS (no secrets found)` over 32 commits (`evidence/delivery/DR2-secret-gate-ticket-branch.log`).

## Ticket State Transition

- Ticket moved to `tickets/done/<ticket-name>`: `Yes`
- Archived ticket path: `tickets/done/node-universal-authentication-437/`
- Path check before the final commit: `python3 scripts/check_repository_artifact_hygiene.py` → `Repository artifact hygiene check passed.` (89,974 tracked files, longest 200 characters, none of them this ticket's)

## Version / Tag / Release Commit

- `bash scripts/desktop-release.sh beta --branch finalize/node-universal-authentication-437 --no-push` → `4e2ffeaaef chore(release): bump workspace release version to 1.5.12-beta.9`, annotated tag `v1.5.12-beta.9`.
- Before it: `443abf8759`, a release notes correction. A Docker node must run this version before `setup-code` can answer (the code comes from the new server's control socket; an older image times out). The notes now say: reinstall the launcher, `upgrade --all --tag beta|latest`, then `setup-code`.
- Secret Gate over `ec2380485c..HEAD`: PASS.

## Repository Finalization

- Bootstrap context source: `RELEASE.md` § Finalization Target (`origin`, `personal`, `--no-ff`).
- Ticket branch: `codex/node-universal-authentication-437` at `0bdfcb2b49`.
- Ticket branch commit result: `Completed`.
- Ticket branch push result: `Completed` (Secret Gate PASS over 34 commits first).
- Finalization target remote / branch: `origin` / `personal`.
- Target advanced after verification: `No` (`31aa11b241` at every fetch).
- Re-integration before final merge: `Not needed`.
- Merge into target: `git checkout -b finalize/node-universal-authentication-437 origin/personal; git merge --no-ff codex/node-universal-authentication-437` → `ec2380485c`. Secret Gate on the merged state: PASS (35 commits).
- Push target branch: `31aa11b241..ec2380485c HEAD -> personal`; after the release commit, `ec2380485c..4e2ffeaaef HEAD -> personal` (fetched and checked unchanged before each push).
- Repository finalization status: `Completed`.

## Checks Before Tagging (merged state `ec2380485c`)

| Check | Result | Evidence (`evidence/delivery/`) |
| --- | --- | --- |
| `python3 scripts/check_licensing.py` | Pass | `DR2-pretag-licensing.log` |
| `python3 scripts/check_repository_artifact_hygiene.py` | Pass (89,974 tracked files; longest path 200) | `DR2-pretag-hygiene.log` |
| `scripts/check_secrets.sh v1.5.12-beta.8..HEAD` | Pass | `DR2-pretag-secrets.log` |
| `pnpm install --frozen-lockfile`, `pnpm -C autobyteus-server-ts prebuild` | Pass | `DR2-pretag-install.log`, `DR2-pretag-prebuild.log` |
| `python3 scripts/release_smoke.py` | Pass with the user's waiver: Claude 3/3, Grok 3/3, Antigravity 2/2, AutoByteus 2/2 PASS; **Codex 3/3 FAIL on quota only** (`You've hit your usage limit … try again at Nov 10th, 2026 10:31 AM`). The user waived Codex for a usage limit. Models `claude: haiku`, `codex: gpt-5.6-luna`, `grok: grok-4.7`; live 109 s | `DR2-pretag-release-smoke.log` |

## Release / Publication / Deployment

- Applicable: `Yes` (Beta `v1.5.12-beta.9`).
- Method: `Project Release Guide` (`RELEASE.md` § Cutting The Release, Watching The Rollout, Beta notes with a user action).
- Pipelines triggered and their results: Desktop Release `42522030808` **success**; Android APK Release `42522030801` **success**; iOS App Store Connect Release `42522030740` **success**; Server Docker Release `42522030739` **success**. All four were watched in parallel (`gh run watch --exit-status`, all exit 0).

| Failed Run And Job | Classification | Log Lines That Show The Cause | Action | Result |
| --- | --- | --- | --- | --- |
| None | — | — | — | — |

- Published artifacts checked against what the release should produce: `gh release view v1.5.12-beta.9`: `isPrerelease: true`, **23 assets**: 6 server packages (`linux-x64`/`arm64` `.tar.gz`, `.json`, `.json.sig`), the APK and `.sha256`, both Linux AppImages, macOS arm64/x64 `.dmg`/`.zip` with blockmaps, the Windows `.exe`, and `latest.yml`, `latest-mac.yml`, `latest-linux.yml`, `latest-linux-arm64.yml`. Publish order: the newest server package was created `21:46:04Z` and the oldest `latest*.yml` `21:46:26Z`, so the updater files went up after all six packages (`evidence/delivery/DR2-release-asset-order.tsv`). Docker Hub: `autobyteus/autobyteus-server:1.5.12-beta.9` and `:beta` point at the same digest `sha256:52db87304cc4…`; `:latest` is not moved (pre-release). TestFlight upload: the iOS workflow succeeded.
- Beta notes with a user action: the generated notes are prefixed with one `## What you need to do` section from the tickets in `git log --merges --first-parent v1.5.12-beta.8..HEAD` that have one: autobyteus-437 (this ticket), autobyteus-433 (phone-node-name-privacy) and autobyteus-432 (phone-viewer-landscape-fullscreen). autobyteus-434 and autobyteus-426 have none. Applied with `gh release edit --notes-file` after all four workflows succeeded (`evidence/delivery/DR2-beta-release-notes.md`).
- Release/publication/deployment result: `Completed`
- Release notes handoff result: `Used` (beta: the user-action section; the curated `release-notes.md` is for the stable release)

## Post-Finalization Cleanup

- Dedicated ticket worktree path: `/Users/normy/autobyteus_org/autobyteus-worktrees/node-universal-authentication-437`
- Worktree cleanup: `git worktree remove` after this record is pushed (the result is reported in the terminal message to the Solution Designer).
- Worktree prune: `git worktree prune` after removal.
- Local ticket branch cleanup: `codex/node-universal-authentication-437` and `finalize/node-universal-authentication-437` are deleted after removal (both merged into `origin/personal`).
- Remote branch cleanup result: `Not required` (the repository keeps `codex/*` ticket branches on `origin`, 435 at this time).

## Deployment Steps

- No hosted service (`RELEASE.md` § Deployment). Users get the server through the published Docker image, the signed server packages and the desktop auto-updater on the beta channel. Their one-time steps are in the beta notes.

## Escalation / Reroute (DR-001, resolved in DR-002)

- Classification: test code in this ticket's scope (QR-003, "no internal caller breaks"; API-16's rule that every probe that starts a node carries its credential), brought in by the base merge: a `Local Fix` to probe code, owned by API/E2E.
- Recommended recipient: API/E2E engineer.
- Why final handoff could not complete: the merged state's post-integration check fails on MSP-21…23's credential-less node-side sockets.

## Environment Or Persisted-Data Transition Notes

- Approved persisted-data decision: `Directly Usable — No Migration` (design spec). Delivery action required: `None`.

## Rollback Criteria

- Revert the merge on `personal` and cut a new beta. The new credential files are additive and an older build ignores them. An older build also removes the credential gate.

## Final Status

- Verification complete: `Yes` (from the evidence; AC-008's second-device check skipped by the user)
- Repository finalization complete: `Yes`
- Applicable release complete: `Yes` (beta `v1.5.12-beta.9`, 4/4 workflows, 23/23 assets)
- Applicable safe cleanup complete or not required: `Yes`, after this record is pushed (see Post-Finalization Cleanup)
- Unresolved blocker: `None`
- Successful terminal package eligible for return: `Yes`
- Terminal package sent to the Solution Designer: `Yes`, after cleanup
