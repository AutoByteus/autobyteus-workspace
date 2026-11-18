# Delivery / Release / Deployment Report

## Release / Publication / Deployment Scope

autobyteus-405, slice S1 of autobyteus-394: a Docker node's desktop shown through the node's own server.
- Classification: `task_size` `Large`, `architectural_risk` `High`, reviewed route (CRR-001 Pass; API-REV-001 Pass; CRR-002 test-code review Not Applicable).
- Finalization target: `origin/personal`. Release: beta, as the user asked.

## Project Release Guide

- Release guide path and revision: `RELEASE.md` at `origin/personal` `b50ac40005`, read in the ticket worktree after integrating it. The main checkout was also fast-forwarded to `origin/personal` at the user's request, and it has the same `RELEASE.md`.
- Deviations from the guide and why:
  - The build-only release run was made although the guide does not require it here. The code reviewer and API/E2E handed it over as open under DESIGN.md rule 12. On reading the guide, the change touches a build input but changes no build step or gate:
    - it adds one test file to the existing cross-package type-check project (`tsconfig.cross-package-tests.json`, `nuxt.config.ts`);
    - the test reads no new build output, and the filter it imports has no imports.
  - So the Fresh-start build (API-07) was the required proof. The extra run passed and cost about 25 minutes. A later delivery should not take it as precedent.
- Proposed guide fixes: `None`. DESIGN.md rule 12 already separates "touches what a gate reads" (fresh start) from "a change to a build step or gate" (build-only run). Whether one added `include` entry counts as the second could be stated outright; that is the Solution Designer's rule to sharpen, reported in the terminal message.

## Handoff Summary

- Handoff summary artifact: `handoff-summary.md`
- Handoff summary status: `Updated`
- Delivery revision record: `delivery-revision-record.md`
- Current delivery revision ID: `DR-001`

## Initial Delivery Integration Refresh

- Bootstrap base reference: `origin/personal` `9e0681bf39`
- Latest tracked remote base reference checked: `origin/personal` `b50ac40005`
- Base advanced since bootstrap: `Yes`, twice.
  - Refresh 1: to `26fa57697e` (autobyteus-277 phone redesign and the v1.5.12-beta.4 release).
  - Refresh 2, during delivery: to `b50ac40005` (autobyteus-restart-reliability-3: backend env no longer carries `PORT`/`SERVER_PORT`; Electron server and server store).
- New base commits integrated into the ticket branch: `Yes`
- Local checkpoint commit result: `Completed`. `bd842ac2be` committed the code reviewer's three uncommitted reports before the merge.
- Integration method: `Merge` (`ee1c715547`, then `289b06faa4`; no conflicts)
- Integration result: `Completed`
- Post-integration executable checks rerun: `Yes`
  - After refresh 1 (`evidence/DEL-01-merged-state-rerun.log`), all `exit=0`:
    - `pnpm install --frozen-lockfile`;
    - web `typecheck` (`production errors: 0; test-file errors: 96 … (baseline 96 …)`, `[typecheck] PASS`);
    - web specs in the ticket's areas plus the three integration tests (`Test Files 236 passed`, `Tests 1569 passed`);
    - `guard:web-boundary`, `guard:localization-boundary`, `audit:localization-literals` passed;
    - server node-desktop unit/integration/E2E (`Tests 52 passed (52)`);
    - launcher modules (`Ran 46 tests` / `OK (skipped=2)`).
  - After refresh 2 (`evidence/DEL-02-second-merge-rerun.log`):
    - Electron server specs, which include `serverRuntimeEnv.spec.ts` changed on both sides (`Test Files 14 passed`, `Tests 85 passed`);
    - web `typecheck` PASS;
    - `serverStore.spec.ts` 4/4.
- Post-integration verification result: `Passed`
- Delivery edits started only after integrated state was current: `Yes`. The delivery documents were drafted after refresh 1. Refresh 2 changed only areas outside this ticket's behavior, so they remain accurate and were updated for it.
- Handoff state current with latest tracked remote base: `Yes`

## Build-only release run

- `pnpm release:test --ref codex/node-desktop-through-node-server` → run `42268386569` on `ee1c715547` (refresh 1).
- Jobs: Resolve Release Metadata, Build macOS ARM64, Build macOS Intel x64, Build Linux x64, Build Linux ARM64 and Build Windows x64 all `success`; Publish GitHub Release `skipped`.
- Not required by the guide here (see Deviations).

## Verification

- Evidence judged: `Sufficient`, apart from one user-only part (below).
- Evidence relied on: execution report API-REV-001. Final confidence is 95.1%: every critical AC directly proven, lowest category 92%. Delivery opened the files named below and checked the lines.

| Acceptance-Criteria ID | Cases And Files Checked | What You Saw | Judgement |
| --- | --- | --- | --- |
| AC-001, AC-004 | API-05-03 and API-05-01 screenshots; API-05-02 network summary; API-10-02 | Node window "Node desktop · Connected · View only" with the node desktop; embedded node "This node has no shared desktop"; node-desktop traffic only to the node's address | Proven |
| AC-002 | API-04 (`LAN {"available":true}`, loopback `http_code=000`); API-08 (`"status": 200`, `wss` `RFB 003.008`) | Reachable on the Backend URL only, also through TLS termination | Proven, except the desktop app over a real Tailscale Serve node: **User Check** |
| AC-003 | Route E2E test "refuses every other query with 4400 before any desktop connection (AC-003)" (IMP-21, `Tests 52 passed`); IMP-16 | `code 4400`, upstream 0 | Proven |
| AC-005 | Route E2E test "refuses invalid, revoked and disabled phone credentials before any desktop connection (AC-005)" | in the 52 passing tests | Proven |
| AC-006 | API-05-04; API-04 view; API-08 view | `x:960 y:540` before and after, `typed-bytes=0`; `"repliesToRequest": []`, `"serverRepliesToNotify": []`, `"nodeClipboardIsViewerText": false`; mouse unchanged through `wss` | Proven |
| AC-007 | API-05-05b; API-04 control; API-08 control | `"Connected · Control"`, `typed=[abxcontrol42]`, `x:301 y:299`; control positives `true`; `x:777 y:444` | Proven |
| AC-008, AC-009 | API-05-06; API-08 | `"openAfterSetDesktopSize":true` ×2; desktop `1920x1080` throughout | Proven |
| AC-010 | API-05-07b, API-05-08b | upstream `0` at +894 ms (minimize), +264 ms (hide); View only after restore | Proven |
| AC-011 | API-05-09 | "The node's desktop disconnected" with Reconnect, then `Connected · View only`, for Xvnc and server restarts | Proven |
| AC-013 | integration test "keeps at most 8 MiB buffered for a viewer that stops reading, and resumes when it reads again" | passing (IMP-21) | Proven |
| AC-014 | API-09 | every marker `docker=0 data-logs=0`; `password` 4 hits only Chromium's `--password-store=basic` | Proven |
| AC-020 | IMP-19; API-04 | View only clipboard unchanged | Proven |
| AC-022 | API-02; API-06c-02; API-10-01/02 | compose `published: "8001"` only; PS `0.0.0.0:61616->8000/tcp` only, env `[]`, marker kept; bash `{"8000/tcp":…}` only, app viewer `Connected · View only` over `/ws/node-desktop` | Proven |

- More evidence requested: `None`.
- User check needed: `Yes`, for AC-002's cloud variant only: the desktop app over `wss` against a real Tailscale Serve node.
  - Why: API/E2E showed what it tried. Tailscale is stopped on this Mac, and starting it changes the user's network. A self-signed proxy cannot be trusted by the app without changing the user's keychain.
  - Only the beta puts the new server on the user's nodes. The user asked for the beta, so the check comes after it.
  - The transport is proven through TLS termination, and the client derives `wss` like every other `/ws` route.
- User check reference: requested in the terminal message for after the beta (update a Tailscale Serve node to the beta, add its `https` address, open its VNC Viewer).
- Re-verification after later re-integration: refresh 2 rerun above. The validated behavior is unchanged.

## Release Decision

- Decision: `Beta`
- Decided by: the user, before this delivery arrived: "there will be a new delivery request, release a beta for it". Smoke-check waiver: "i wave for codex and grok if they do not have limit". Recorded as a waiver of Codex and Grok only when a quota limit refuses them; the delivery engineer stated that reading, and the user did not correct it.

## Docs Sync Result

- Docs sync artifact: `docs-sync-report.md`
- Docs sync result: `Updated` (by the implementation; delivery checked and changed nothing)

## Ticket State Transition

- Ticket moved to `tickets/done/<ticket-name>`: `Yes`
- Archived ticket path: `tickets/done/node-desktop-through-node-server/`

## Environment Or Persisted-Data Transition Notes

- Approved persisted-data decision: `Directly Usable — No Migration`
- Delivery action required: `None`. The launcher drops `noVncPort` / `NOVNC_PORT` at its next write (API-06c-02, IMP-25). A saved `AUTOBYTEUS_VNC_SERVER_HOSTS` value shows as a deletable custom setting.

## Rollback Criteria

- Revert the merge on `personal` and cut a new beta. Desktop updates never downgrade.
- The desktop app and the node server must match. An app from this release cannot show the desktop of a node that runs an older server, and an older app cannot show the desktop of a node from this release. Both move forward together.
- There is no data migration.

## Finalization Record

- Pre-commit checks: `check_repository_artifact_hygiene.py` exit 0; Secret Gate `origin/personal..HEAD` PASS.
- Ticket branch: `codex/node-desktop-through-node-server` at `6b063ea050` (archive commit), pushed. It was first pushed at `ee1c715547` for the build-only run, after the Secret Gate passed.
- Finalization target: `origin/personal` `b50ac40005`, the state verified after refresh 2.
- Merge: `finalize/node-desktop-through-node-server` from `origin/personal`; `--no-ff` → `5aac646cc8`.
  - Its tree is identical to the verified head `6b063ea050`.
  - Secret Gate on the merged state: PASS.
- Push: `origin/personal` fetched again and still `b50ac40005`; pushed `b50ac40005..5aac646cc8`.
- Repository finalization status: `Completed`.

## Release / Publication / Deployment

- Applicable: `Yes` (Beta, the user's decision)
- Method: `Project Release Guide`. `bash scripts/desktop-release.sh beta --branch finalize/node-desktop-through-node-server --no-push`, then `git push origin HEAD:personal` and `git push origin v1.5.12-beta.5`.
- Checks before tagging, on the merged state `5aac646cc8`:
  - `python3 scripts/check_licensing.py`: "Licensing is consistent.", exit 0.
  - `python3 scripts/check_repository_artifact_hygiene.py`: exit 0.
  - `scripts/check_secrets.sh v1.5.12-beta.4..HEAD`: 23 commits, PASS.
  - `pnpm install --frozen-lockfile` and `pnpm -C autobyteus-server-ts prebuild`: exit 0.
  - `python3 scripts/release_smoke.py` (exit 1, waived as below). Summary:

    ```
    claude      new run + restore, linked workspace      PASS
    claude      brand-new team member                    PASS
    claude      different same-named skill               PASS
    codex       (all three scenarios)                    FAIL    RUNTIME_ERROR "You've hit your usage limit … try again at Nov 10th, 2026 10:31 AM."
    grok        (all three scenarios)                    FAIL    ACP_PROMPT_FAILED "Rate limited: … 429 Too Many Requests: subscription:free-usage-exhausted …"
    antigravity brand-new run, linked workspace          PASS
    antigravity brand-new team member, linked workspace  PASS
    autobyteus  brand-new run, linked workspace          PASS
    autobyteus  brand-new team member, linked workspace  PASS
    commit    5aac646cc8d02a04c0119629b383f98f061954b3
    models    {"claude": "haiku", "codex": "gpt-5.6-luna", "grok": "grok-4.5 (pinned grok-4.7 not offered)"}
    result    FAIL
    ```

  - **Waiver:** Codex and Grok, for quota refusals only. The user said before this delivery: "i wave for codex and grok if they do not have limit". Every Codex and Grok failure is a quota refusal (a usage limit, a 429), and no other failure occurred. Claude, Antigravity and AutoByteus passed every scenario.
- Release commit: `d4a32c109d` `chore(release): bump workspace release version to 1.5.12-beta.5` (`autobyteus-web/package.json`). `origin/personal` was fetched again before the push and was still `5aac646cc8`; pushed `5aac646cc8..d4a32c109d`.
- Tag: `v1.5.12-beta.5` (annotated), pushed.
- Pipelines triggered and their results, watched together:
  - Android APK Release `42274340564`: success.
  - iOS App Store Connect Release `42274340565`: success.
  - Desktop Release `42274340622`: success.
  - Server Docker Release `42274340567`: success. Its jobs: metadata, Build And Push Server Image, and Publish Server Package for linux/amd64 and linux/arm64.

| Failed Run And Job | Classification | Log Lines That Show The Cause | Action | Result |
| --- | --- | --- | --- | --- |
| None | — | — | — | — |

- Published artifacts checked against what the release should produce:
  - GitHub release `v1.5.12-beta.5`: `isPrerelease: true`, 23 of 23 files, as RELEASE.md's table lists:
    - macOS ARM64 and x64: `.dmg`, `.zip`, blockmaps;
    - Linux x64 and ARM64 AppImages;
    - the Windows `.exe`;
    - `latest.yml`, `latest-mac.yml`, `latest-linux.yml`, `latest-linux-arm64.yml`;
    - the Android APK and its `.sha256`;
    - the server packages for `linux-x64` and `linux-arm64` (`.tar.gz`, `.json`, `.json.sig`).
  - Docker Hub: `autobyteus/autobyteus-server:1.5.12-beta.5` and `:beta` both point to `sha256:f373b1a3b8088863f93a14d081911791ba5e10bf876020d4b3498d15b4bc4a65`. `:latest` was not moved (beta).
  - The user reports this version installed and running.
- Beta notes with a user action:
  - The release's tickets (`git log --merges --first-parent v1.5.12-beta.4..HEAD`): autobyteus-405 and autobyteus-restart-reliability-3. The third merge listed, `26fa57697e`, is the v1.5.12-beta.4 records merge.
  - Used: autobyteus-405's `## What you need to do` (update Docker nodes). restart-reliability-3 has no release notes. autobyteus-402 and autobyteus-277 already shipped in v1.5.12-beta.4 with their sections.
  - The section was put above the generated notes with `gh release edit … --notes-file` after all four runs succeeded. The tag and the files were unchanged.
- Release/publication/deployment result: `Completed`
- Release notes handoff result: `Used` (the beta's user-action section; stable notes come later from `tickets/done/node-desktop-through-node-server/release-notes.md`)

## Post-Finalization Cleanup

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/node-desktop-through-node-server`.
- Right after this record is pushed:
  - Remove and prune the worktree. Its untracked files are build output only.
  - Delete the local `codex/` and `finalize/` branches; both are in `origin/personal`.
  - Keep `origin/codex/node-desktop-through-node-server`.
  - The terminal message confirms the results.
- Test resources: API/E2E removed its nodes, registry, images and isolated instances (execution report, Temporary Methods And Cleanup). The user's nodes were never addressed.

## Final Status

- Verification complete: `Yes` from the evidence, except AC-002's Tailscale variant, a user check on the beta. The user has the beta installed.
- Repository finalization complete: `Yes`
- Applicable release/deployment/rollout complete: `Yes`. v1.5.12-beta.5: 4 of 4 workflows succeeded, 23 of 23 files, Docker `:beta` moved.
- Applicable safe cleanup complete or not required: right after this record is pushed (above)
- Unresolved blocker: `None`
- Successful terminal package eligible for return: `Yes`. The Tailscale check is the user's, after the beta, as the user's beta decision put it.
