# Delivery / Release / Deployment Report: autobyteus-581

## Release / Publication / Deployment Scope

Finalization of `sandbox-provider-relay-581` (provider relay through a paired node, and disposable sandbox nodes) into `origin/personal`, plus a pull request for the public skill. No release, tag, publication or deployment (see Release Decision). `task_size` `Large`, `architectural_risk` `High`, route `Reviewed`.

## Project Release Guide

- Release guide path and revision: `RELEASE.md` at the repository root, as on `origin/personal` @ `41f6894d9d` (the integrated base; the guide changed on the base since bootstrap, adding the Extensions catalog check, which applies to tagging only).
- Deviations from the guide and why: `None`. The guide's Finalization Target order was followed (the Secret Gate on `origin/personal..HEAD` before the first push and again on the merged state, `finalize/<ticket>` from `origin/personal`, `--no-ff` merge, push `HEAD:personal`). The checks before tagging, the build-only release run and the rollout watch do not apply: nothing is tagged.
- Proposed guide fixes, and whether the user agreed: `None`.

## Handoff Summary

- Handoff summary artifact: `tickets/done/sandbox-provider-relay-581/handoff-summary.md`
- Handoff summary status: `Updated`
- Delivery revision record: `tickets/done/sandbox-provider-relay-581/delivery-revision-record.md`
- Current delivery revision ID: `DR-001`
- Notes: written after the second integration refresh; it records both merges and DEC-119.

## Initial Delivery Integration Refresh

- Bootstrap base reference: `origin/personal` @ `9f803aa84d`.
- Latest tracked remote base reference checked: first refresh `b86817915a`; second refresh (after the user's decision) `41f6894d9d`; confirmed unchanged immediately before each push.
- Base advanced since bootstrap or previous refresh: `Yes` (35 commits, then 6 more).
- New base commits integrated into the ticket branch: `Yes`
- Local checkpoint commit result: `Completed` (`adbb2a3b21` the review and requirements documents before the first merge; `6b66bb7834` DEC-119 documents before the second)
- Integration method: `Merge` (`8c76286fbe`, then `6c3f35d8ba`)
- Integration result: `Completed`. First merge: three conflicts (`autobyteus-server-ts/src/api/rest/index.ts`, `src/compositions/build-studio-server.ts`: both sides kept; `docs/design/node_access_model.md`: the base took NAS-42 and NAS-43, so this ticket's relay scenarios became NAS-44 to NAS-46 and three test titles followed). Second merge: clean (autobyteus-657's catalog public key; no file in common).
- Post-integration executable checks rerun: `Yes`
- Post-integration verification result: `Passed`. Plan by impact (TESTING.md Rerun by impact): no dependency, lockfile, schema, `autobyteus-ts` or build-configuration change came in with the base (only a script entry in two `package.json` files), so the full suites stay valid; rerun what the merge touches, plus both typechecks.

| Check | Command | Result |
| --- | --- | --- |
| Server typecheck | `pnpm -C autobyteus-server-ts typecheck` | After merge 1: production errors 0; test-file errors 972 in 299 files (baseline 972 in 299), PASS. After merge 2: the same |
| Web typecheck | `pnpm -C autobyteus-web typecheck` | After merge 1: production 0; 85 in 35 files (baseline 85 in 35), PASS. After merge 2: the same |
| Server, composition and relay (merge 1) | `pnpm -C autobyteus-server-ts exec vitest run tests/unit/api/rest/extensions-routes.test.ts tests/unit/sandboxes tests/unit/remote-collaboration/peer-sandbox-role.test.ts tests/unit/credential-proxy tests/architecture tests/integration/credential-proxy/provider-relay-peer.integration.test.ts tests/integration/credential-proxy/provider-relay.integration.test.ts tests/e2e/node-access/node-access-model.e2e.test.ts --no-watch` | `Test Files 25 passed (25)`, `Tests 190 passed (190)` (includes the GraphQL codegen currency test) |
| Server (merge 2) | `pnpm -C autobyteus-server-ts exec vitest run tests/unit/extensions tests/unit/api/rest/extensions-routes.test.ts tests/unit/sandboxes tests/unit/credential-proxy tests/architecture tests/integration/credential-proxy/provider-relay-peer.integration.test.ts tests/e2e/node-access/node-access-model.e2e.test.ts --no-watch` (adds the extensions unit tests the base change touched) | `Test Files 25 passed (25)`, `Tests 214 passed (214)` |
| Web nodes page | `NUXT_TEST=true pnpm -C autobyteus-web exec vitest run components/settings/nodes --no-watch` | `Test Files 6 passed`, `Tests 69 passed` |
| Electron application | `env -u ELECTRON_RUN_AS_NODE pnpm -C autobyteus-web exec vitest --config ./electron/vitest.config.ts run electron/application` | `Test Files 4 passed`, `Tests 48 passed` |
| Artifact hygiene | `python3 scripts/check_repository_artifact_hygiene.py` | passed (also after the ticket move) |

- No-rerun rationale: not applicable (base commits were integrated and checked).
- Delivery edits started only after integrated state was current: `Yes` (docs sync followed the first merge; the second merge touched no file of the docs sync, and the delivery documents were updated after it).
- Handoff state current with latest tracked remote base: `Yes` (`origin/personal` was `41f6894d9d` at the push).
- Blocker (if applicable): `None`.

## Verification

- Evidence judged: `Sufficient`, with one accepted unverified risk.
- Evidence relied on: the API/E2E execution report (API-REV-002, Pass, final confidence 95%, every category 95%), the files it names (opened by delivery as the table shows), the code reviewer's CRR-005 and CRR-006 passes, and delivery's integrated-state reruns above.

| Acceptance-Criteria ID | Cases And Files Checked | What You Saw | Judgement |
| --- | --- | --- | --- |
| AC-001 | API-L01 `evidence/API-L-sandbox-live/run5-round2/SBX-01.json`, `run5-vitest.log`; API-L09 `API-L09/API-L09-owner-relayed-node.json` | Four runtimes complete in a sandbox (`relayedLines {"anthropic/apiKey/200": 3, "openai/apiKey/200": 1, "xai/apiKey/200": 5}`); in the owner-managed relayed node all five runtimes `completed`, `allFromB`, `bNativeProvidersConfiguredBeforeRelay: []`; `Tests 8 passed (8)` | Proven |
| AC-002 | API-R03/R05 (suites), SBX-01 `directTurns` (autobyteus, claude completed on the host), API-L09 | Direct turns complete as before; the unrelayed suites are green | Proven |
| AC-003 | API-R04; SBX-05 | `RELAY_PEER_NOT_ACCEPTED` in the run's error frame after the host unpaired the sandbox, `c5LinesAfterUnpair: 0` | Proven |
| AC-004 | API-R04 (two-node integration) | login token off: API key attached | Proven (automated, as the criterion says) |
| AC-005 | API-R04 (automated request shapes, refusals), IMP-09; API-L12 not run | apiKey part proven live (SBX-01, API-L09). The live login-token part (whether Anthropic and xAI accept the token the relay node attaches) was not run: the vault had no `provider.anthropic.login-token` and the user's Grok login had expired | Accepted Risk (DEC-119) |
| AC-006 | SBX-01, SBX-03, API-L09 `c5Keys`, `c5SecretHits []` | one line per call with `at, durationMs, method, path, peerNodeId, relayCredentialKind, relayId, status`; no secret | Proven |
| AC-007 | SBX-01 `runtimeStates`, `availability`; API-L09 `bRuntimeStates` | relayed runtimes signed in; Antigravity signed out with the reason | Proven |
| AC-008 | SBX-01 `readyMs 8067`, SBX-08 | 18 of 18 creates in runs 5 and 6 ready in 8.1 to 10.5 s | Proven |
| AC-009 | SBX-01 | `"network": "internet 200 host 200"`; the host lists the sandbox as a paired peer | Proven |
| AC-010 | SBX-03 `leakScan` | `sandboxFiles hits []` over 662,446,080 bytes, `processes hits []` over 46, `containerEnv []`, `runMemory hits {}`, `c5Log []` | Proven |
| AC-011 | SBX-03, SBX-04, API-L10 | the answer `done` with the file and its content, six transcripts on the host; after destroy no container, volume or pairing, folders and transcripts kept; the evaluator did not open the planted symlink (`canaryInFrames false`, `canaryInHostFiles []`) | Proven |
| AC-012 | SBX-04 | `SANDBOX_NOT_YOURS` twice | Proven |
| AC-013 | SBX-06, SBX-07 | removed at expiry in 528 ms, folders kept; after a host crash with a lost record, no container or peer left | Proven |
| AC-014 | SBX-08 | five at once: four sandboxes, one `SANDBOX_LIMIT_REACHED`; collaboration off and a home folder refused; nothing left. Docker stopped and unsupported platform: unit only (stopping the user's Docker is not allowed) | Proven |
| AC-015 | SBX-01 (`role: sandbox`), SBX-03, API-L11-round2 | one "sandbox" chip on the `sbx_…` row, none on a plain peer, none after destroy | Proven |
| AC-016 | API-L10, API-R10 | a real model with only the three tools and the skill: Skill, `create_sandbox`, `delegate_task` with `node`, reads, `destroy_sandbox`; the skill's names, fields, limits and codes match the code (round 2: the run-memory layout holds) | Proven |
| QR-001 to QR-004 | SBX-01, SBX-02, API-R07 | 8.1 to 18.6 s to ready; relay adds +16 / +68 / +90 ms median; 32 MiB body passes, +1 byte `413` | Proven |

- More evidence requested (from whom, what, result): `None` from delivery. Earlier: API/E2E's round-1 failures (F-1, F-2) were fixed and re-proven in round 2.
- User check needed: `Yes`, once: AC-005's live part needed the user's Claude `setup-token` in the test vault and a fresh Grok login (his own accounts, which DEC-102 forbids renewing); `pnpm test-vault status` confirmed the token missing.
- User check reference: the Solution Designer relayed it. The user first chose to prove it live (2026-11-26, "Ahhh okay I will do it"), then on 2026-11-27 accepted it unverified: "I wouldn't consider it as a risk … I can test it any time … as long as you tested the sandbox works [with the] API key and my normal functionality works." Recorded as DEC-119 (supersedes DEC-118), SR-011, FU-581-08.
- Re-verification after later re-integration: `Not needed` for the user's decision (the second merge changed nothing the criterion exercises); the typechecks and targeted suites were rerun after it.

## Release Decision

- Decision: `No release`
- Decided by: the release guide's default (no release unless asked); the request, the user's words relayed by the Solution Designer and the later decisions asked for none. A release is available: `release-notes.md` holds the notes.

## Docs Sync Result

- Docs sync artifact: `tickets/done/sandbox-provider-relay-581/docs-sync-report.md`
- Docs sync result: `Updated`
- Docs updated: `credential_proxy.md`, `sandboxes.md`, `remote_collaboration.md`, `autobyteus-web/docs/settings.md`, `node_access_model.md` (renumbered), the ticket's `design-spec.md`, the public skill, and one test comment; `.gitleaks.toml` (two narrow false-positive entries). `DESIGN.md`, `TESTING.md` and `RELEASE.md`: no change (reasons in the report).

## Ticket State Transition

- Ticket moved to `tickets/done/<ticket-name>`: `Yes`
- Archived ticket path: `tickets/done/sandbox-provider-relay-581/` (record copy below)

## Version / Tag / Release Commit

None. No version bump, no tag, no release commit.

## Repository Finalization

- Bootstrap context source: the Solution Designer's bootstrap (worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/sandbox-provider-relay`, branch `codex/sandbox-provider-relay`, base `origin/personal`), and `RELEASE.md`'s Finalization Target.
- Ticket branch: `codex/sandbox-provider-relay`
- Ticket branch commit result: `Completed` (`465fed90f3`: delivery documents, ticket moved to done)
- Ticket branch push result: `Completed` (new branch `origin/codex/sandbox-provider-relay`; Secret Gate on `origin/personal..HEAD` passed first: 28 commits, no findings, after two false positives were allowlisted narrowly, see the docs sync report)
- Finalization target remote: `origin`
- Finalization target branch: `personal`
- Target advanced after verification / acceptance: `Yes` (6 commits arrived after the user's decision: integrated as `6c3f35d8ba`, checks rerun, delivery documents updated)
- Delivery-owned edits protected before re-integration: `Completed` (the three Solution Designer documents were committed as `6b66bb7834` before the second merge)
- Re-integration before final merge result: `Completed`
- Target branch update result: `Completed` (`finalize/sandbox-provider-relay-581` created from `origin/personal` @ `41f6894d9d`, unchanged at the push)
- Merge into target result: `Completed`: `git merge --no-ff` gave `72cdfd1d70` (parents `41f6894d9d`, `465fed90f3`); the merged tree equals the ticket branch (`git diff HEAD codex/sandbox-provider-relay --quiet`). Secret Gate on the merged state: 29 commits, no findings.
- Push target branch result: `Completed` (`41f6894d9d..72cdfd1d70`, `HEAD:personal`)
- User's checkout of the target branch (`/Users/normy/autobyteus_org/autobyteus-workspace-superrepo`): `Updated to 72cdfd1d70` by `git merge --ff-only origin/personal` (it was on `personal` at `41f6894d9d`, no local commits; 46 uncommitted lines before and after: untouched). It is fast-forwarded again after the record commit; the terminal message states the final commit.
- Repository finalization status: `Completed`
- Blocker (if applicable): `None`

## Release / Publication / Deployment

- Applicable: `No`
- Method: none (no release asked for).
- Method reference / command: none.
- Pipelines triggered and their results: none (no tag).

| Failed Run And Job | Classification (`Platform`/`Ours`) | Log Lines That Show The Cause | Action (rerun, or handed to whom) | Result |
| --- | --- | --- | --- | --- |
| None | — | — | — | — |

- Published artifacts checked against what the release should produce: not applicable.
- Release/publication/deployment result: `Not required`
- Release notes handoff result: `Not required` (the notes are kept for the release that includes this ticket)
- Blocker (if applicable): `None`
- **Public skill pull request** (a delivery item of this ticket, DEC-112): `AutoByteus/autobyteus-skills` branch `codex/autobyteus-sandboxes` (`f85b30a` the skill, `c33ffad` delivery's two doc fixes; base `origin/main` `1213803`, unchanged) pushed; pull request **#11** opened: https://github.com/AutoByteus/autobyteus-skills/pull/11. Commits scanned with the workspace's gitleaks config: no leaks. It is open and not merged: merging a public package is the user's step, and the skill describes tools that ship with the first release containing this ticket.

## Post-Finalization Cleanup

- Dedicated ticket worktree path: `/Users/normy/autobyteus_org/autobyteus-worktrees/sandbox-provider-relay`
- Worktree cleanup result: see Final Status (done from the main checkout after the record commit)
- Worktree prune result: see Final Status
- Local ticket branch cleanup result: see Final Status (`codex/sandbox-provider-relay`, `finalize/sandbox-provider-relay-581`)
- Remote branch cleanup result: `Not required` (`origin/codex/sandbox-provider-relay` is kept, as in earlier tickets; the skill's remote branch stays while PR #11 is open)
- Blocker (if applicable): `None`

## Escalation / Reroute (Use Only If Final Handoff Cannot Complete)

Not used.

## Release Notes Summary

- Release notes artifact created before verification / acceptance: `tickets/done/sandbox-provider-relay-581/release-notes.md` (written before finalization; updated for DEC-119: the login-token mode is new and not yet tried against the providers with real logins)
- Archived release notes artifact used for release/publication: none (no release)
- Release notes status: `Updated`

## Deployment Steps

None. This repository deploys no hosted service (`RELEASE.md`, Deployment).

## Environment Or Persisted-Data Transition Notes

- Approved persisted-data decision: new files `Not Affected`; `peers.json` `role` `Directly Usable: No Migration`.
- Delivery action required: `None`.
- Result and evidence: a peer row without `role` reads as a normal peer (unit test); a live normal peer beside a sandbox peer (API-L09, API-L11). No app-data migration was added.

## Verification Checks

See Initial Delivery Integration Refresh and Verification above.

## Rollback Criteria

- Revert the merge `72cdfd1d70` on `personal` (it is one `--no-ff` merge). Nothing was released, so no user has the change; the sandbox containers a user created are removed by `destroy_sandbox`, their expiry or the node's next start. A revert leaves the optional `role` key in a `peers.json` that a node wrote; an older build ignores it.

## Final Status

- Verification complete (from the evidence, or the user's check where needed): `Yes` (from evidence; the one open part accepted by the user, DEC-119)
- Repository finalization complete: `Yes`
- Applicable release/deployment/rollout complete or not required: `Yes` (not required)
- Applicable safe cleanup complete or not required: `Yes` (recorded in the terminal message after the cleanup; the report cannot name its own record commit)
- Unresolved blocker: `None`
- Successful terminal package eligible for return: `Yes`
- Terminal package sent to the Solution Designer: `No` at the time of this file; sent after the record commit
- Terminal message/reference: the message to `/solution_designer` after the record commit
