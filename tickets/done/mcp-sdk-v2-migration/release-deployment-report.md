# Delivery / Release / Deployment Report — mcp-sdk-v2-migration

## Release / Publication / Deployment Scope

- Finalize the v2 MCP client migration to `personal`, cut a beta (REQ-012), and record the user's check of that beta (AC-011).
- `task_size=Medium`, `architectural_risk=High`, reviewed route.

## Project Release Guide

- Release guide path and revision: `RELEASE.md` at `origin/personal` @ `b7ea243953`
- Deviations from the guide and why: `None`
- Proposed guide fixes, and whether the user agreed: `None`

## Handoff Summary

- Handoff summary artifact: `tickets/done/mcp-sdk-v2-migration/handoff-summary.md`
- Handoff summary status: `Updated`
- Delivery revision record: `tickets/done/mcp-sdk-v2-migration/delivery-revision-record.md`
- Current delivery revision ID: `DR-001`

## Initial Delivery Integration Refresh

- Bootstrap base reference: `origin/personal` @ `dc530fdcb0`
- Latest tracked remote base reference checked: `origin/personal` @ `b7ea243953`
- Base advanced since bootstrap or previous refresh: `Yes` (tickets `e2e-task-execution-source-fixtures` and `mcp-test-launcher-and-test-residue`; test files and ticket docs only, none shared with this ticket)
- New base commits integrated into the ticket branch: `Yes`
- Local checkpoint commit result: `Not needed` (ticket branch head `55b5c31701` was committed and clean apart from untracked build output)
- Integration method: `Merge` (`--no-ff`) → `f151ded614`
- Integration result: `Completed`, no conflicts
- Post-integration executable checks rerun: `Yes`
  - `pnpm -C autobyteus-ts exec vitest run tests/unit/tools/mcp --reporter=verbose` → `Tests 87 passed (87)` (`evidence/DEL-01-mcp-unit-integrated.log`)
  - `env -i PATH HOME=<temp> TMPDIR pnpm -C autobyteus-ts exec vitest run tests/integration/tools/mcp --reporter=verbose` → `Tests 22 passed | 1 skipped (23)`; the skip is the gated real-user-kind file (`evidence/DEL-02-core-mcp-integration-integrated.log`). This exercises the base's changed `mcp-test-server-launcher.ts`.
  - `pnpm -C autobyteus-server-ts exec vitest run tests/integration/agent-tools/mcp/agent-tools-mcp-routes.integration.test.ts tests/integration/mcp-gateway/mcp-gateway-routes.integration.test.ts --no-watch --reporter=verbose` → `Tests 15 passed (15)` (`evidence/DEL-03-endpoint-integration-integrated.log`)
  - AC-001 grep for `@modelcontextprotocol/sdk` in `*.ts|*.mjs|*.js|package.json` (excluding `node_modules`, `dist`, `tickets`, docs) on the integrated tree: no match
- Post-integration verification result: `Passed` (same counts as API-01/02/03 after)
- Delivery edits started only after integrated state was current: `Yes`
- Handoff state current with latest tracked remote base: `Yes`

## Verification

- Evidence judged: `Sufficient`
- Evidence relied on: `api-e2e-execution-coverage-report.md` (Acceptance-Criteria Proof, Cases, final confidence 95.4% ≥ 95% target, no category below 90%, no mocks except local stand-ins for remote HTTP servers per REQ-010), the files below, and the integrated-state rerun DEL-01…03.

| Acceptance-Criteria ID | Cases And Files Checked | What You Saw | Judgement (`Proven`/`Not Proven`/`User Check`) |
| --- | --- | --- | --- |
| AC-001 v2 client pinned; no v1 import; v1 only as a peer | IMP-07 (`IMP-07-ac001-ac008-greps.log`), API-15 (`API-15-packaged-contents-after.txt`), delivery grep | grep exit 1; both manifests `@modelcontextprotocol/client: 2.3.1`; `pnpm why`: v1 only under `@anthropic-ai/claude-agent-sdk` and `@google/genai` as `peer`; packaged app resolves `@modelcontextprotocol+client@2.3.1`; the only dependent of the v1 package is `claude-agent-sdk/package.json` | Proven |
| AC-002 core suites same as on 1.32.1 | API-02 (`API-02-…-after.log`), API-10 (`API-10-13-parity-comparison.md`), DEL-02 | 22 passed + 1 skip on both sides and after integration; parity table: python_fixture 5/5, VideoAudioServer 32/32, media-downloader 2/2, ssh 4/4, fs v1/v2 14/14 tools, `Same` | Proven |
| AC-003 headers, 401, redirects | API-04, API-10 | token preview request lines identical before/after with `auth=expected` on each request; same-origin `/mcp-old` → `/mcp` followed with auth; cross-origin refused, "requests that reached the other origin: before 0, after 0", error names `http://127.0.0.1:<port>/mcp`; 401 fails with `unauthorized-parity` | Proven |
| AC-004 timeout, signal, outcomes | API-01, API-11, API-13 | cancellation in the packaged app: server saw `notifications/cancelled` 40 ms after interrupt, slow tool not completed; tool error `isError … parity-tool-error` and structured content `Same` on all gateway clients | Proven |
| AC-005 all pages | API-10, API-11, API-18 | `paging_http` 2 → 4 tools, two `tools/list` requests after; gateway 77 → 79 (`paging_page_two_a/b`) | Proven |
| AC-006 one stdio start; `initialize` first; 2025-11-25 | API-01, API-10 | stdio starts `{"python_fixture":2,"fs_v1":2,"fs_v2":2}` (preview + discover) on both sides; first request `POST initialize`, then `pv=2025-11-25` | Proven |
| AC-007 v2 clients → our endpoints | API-03, API-11, DEL-03 | 15/15 including the two `auto` cases; gateway `v2_default` and `v2_auto` connect (`auto`: `server/discover` 400 → `initialize` 200), list, call, identical results | Proven |
| AC-008 dead Claude path removed | IMP-07, API-05 Claude cell | AC-008a/b grep exit 1; Claude cell passes | Proven |
| AC-009 parity report | coverage report summary, API-01…19 | every check `Same` or approved DEC-003/DEC-004; not-run items named with cause | Proven |
| AC-010 docs | docs sync | v2 package names and wording in `mcp_server_management.md`, including the stdio texts | Proven (delivery) |
| AC-012 protocol era | API-14 (`API-14-outputschema-dialects.txt`), API-10/11 | 7/7 real servers answer `"protocolVersion": "2025-11-25"`; no draft-04 schema; no server failed on either side; REQ-013 not triggered | Proven |
| AC-011 beta and the user's check | this report | beta `v1.5.8-beta.1` published (below). The user's check was dropped by the user on 2026-10-20 (see below): the evidence already proves the change | Proven (beta); user check waived by the user |

- More evidence requested: `None`
- User check needed: `No`.
  - Delivery first asked the user to check the beta, citing REQ-012 / AC-011. Those come from the Task's Done-when, not from any gap in the evidence.
  - The user asked why. Delivery answered: under the delivery skill, a change the evidence proves needs no repeat check. The user is asked only when something can't be reached without them or when they asked to check. Neither applies here.
  - The user decided, in the Delivery Engineer conversation on 2026-10-20: "Yeah, I think you should practice what the skill told you, right?" So the user's check was dropped, and verification rests on the evidence.
  - The requirements doc still states the check in REQ-012 / AC-011. That doc belongs to the Solution Designer, who is told in the terminal message.
- User check reference: not needed (the user's decision above)
- Re-verification after later re-integration: see Repository Finalization

## Release Decision

- Decision: `Beta`
- Decided by: the approved requirements REQ-012 ("Delivery ships a beta and waits for the user's check"), approved by the user on 2026-10-20 (SR-002), and the Task's Done-when

## Docs Sync Result

- Docs sync artifact: `tickets/done/mcp-sdk-v2-migration/docs-sync-report.md`
- Docs sync result: `Updated`
- Docs updated: `autobyteus-server-ts/docs/modules/mcp_server_management.md` (error-text list); implementation's earlier updates to it and `agent_execution.md` reviewed

## Ticket State Transition

- Ticket moved to `tickets/done/mcp-sdk-v2-migration`: `Yes`
- Archived ticket path: `tickets/done/mcp-sdk-v2-migration/` on `origin/personal` (the ticket worktree was removed after finalization)

## Version / Tag / Release Commit

- Version: `1.5.8-beta.1` (`python3 scripts/release_versions.py next-beta`; highest stable `v1.5.7`)
- Release commit: `89ce6ba93c` `chore(release): bump workspace release version to 1.5.8-beta.1` (`autobyteus-web/package.json` only)
- Tag: annotated `v1.5.8-beta.1` → `89ce6ba93c`, pushed

## Repository Finalization

- Bootstrap context source: code reviewer handoff (worktree, branch `codex/mcp-sdk-v2-migration`, base `origin/personal` @ `dc530fdcb0`) and `RELEASE.md` Finalization Target
- Ticket branch: `codex/mcp-sdk-v2-migration`
- Ticket branch commit result: `3f8d471fbd` (docs sync, delivery artifacts), `5ec52d84a8` (archive)
- Ticket branch push result: pushed to `origin/codex/mcp-sdk-v2-migration` @ `5ec52d84a8`
- Finalization target remote: `origin`
- Finalization target branch: `personal`
- Target advanced after verification / acceptance: `No` (`origin/personal` still `b7ea243953` at merge and before each push)
- Delivery-owned edits protected before re-integration: `Not needed`
- Re-integration before final merge result: `Not needed`
- Target branch update result: `finalize/mcp-sdk-v2-migration` created from `origin/personal` @ `b7ea243953`
- Merge into target result: `--no-ff` merge `cb88162c0c`; tree identical to the ticket branch (`git diff codex/mcp-sdk-v2-migration HEAD` empty)
- Push target branch result: `b7ea243953..cb88162c0c`, then `cb88162c0c..89ce6ba93c` (release commit)
- Repository finalization status: `Completed`

## Release / Publication / Deployment

- Applicable: `Yes`
- Method: `Project Release Guide`
- Method reference / command: `bash scripts/desktop-release.sh beta --branch finalize/mcp-sdk-v2-migration --no-push`; `git fetch origin personal` (still `cb88162c0c`); `git push origin HEAD:personal`; `git push origin v1.5.8-beta.1`
- Pipelines triggered and their results (all `gh run watch --exit-status` exit 0):
  - Android APK Release `39401278483`: success (4m26s)
  - Desktop Release `39401278482`: success (27m49s)
  - iOS App Store Connect Release `39401278481`: success (17m12s; TestFlight upload)
  - Server Docker Release `39401278477`: success (33m36s)
- Published artifacts checked against what the release should produce:
  - GitHub release `v1.5.8-beta.1`: `isPrerelease: true`, 17/17 assets. These are macOS arm64/x64 `.dmg`, `.zip` and blockmaps (8), Linux x64/arm64 AppImages (2), the Windows `.exe` (1), the Android APK and `.sha256` (2), and `latest.yml`, `latest-mac.yml`, `latest-linux.yml`, `latest-linux-arm64.yml` (4).
  - Docker Hub: `autobyteus/autobyteus-server:1.5.8-beta.1` and `:beta` have the same digest `sha256:cc4588834bd3…`; `:latest` stays on `1.5.7` (`sha256:821e777d8e88…`).
- Release/publication/deployment result: `Completed`
- Release notes handoff result: `Not required` for the beta (GitHub generated notes); the curated file is archived for the next stable

## Post-Finalization Cleanup

- Dedicated ticket worktree path: `/Users/normy/autobyteus_org/autobyteus-worktrees/mcp-sdk-v2-migration`
- Worktree cleanup result: `Completed`. Removed with `git worktree remove --force`; it held only ignored build output, and everything tracked was pushed (`4352f23f0c` = `origin/personal`).
- Worktree prune result: `Completed`
- Local ticket branch cleanup result: `Completed`. Deleted `codex/mcp-sdk-v2-migration` (`5ec52d84a8`, contained in `origin/personal`) and `finalize/mcp-sdk-v2-migration` (`4352f23f0c`).
- Remote branch cleanup result: `Not required`. `origin/codex/mcp-sdk-v2-migration` is kept as the reviewed ticket branch, as on earlier tickets.
- The API/E2E before-worktree, isolated instances, Docker containers and images were already removed by API/E2E.
- This record was written from a temporary detached checkout of `origin/personal` (`/tmp/mcp182-record`), which is removed after the push.

## Release Notes Summary

- Release notes artifact created before verification / acceptance: `tickets/in-progress/mcp-sdk-v2-migration/release-notes.md` (written before verification), archived to `tickets/done/mcp-sdk-v2-migration/release-notes.md`
- Archived release notes artifact used for release/publication: not by the beta (pre-release tags always use GitHub generated notes, per `RELEASE.md`); kept for the next stable release's curated notes
- Release notes status: `Updated`

## Deployment Steps

- No hosted service. Rollout is the desktop beta channel (**Settings > Updates > Receive beta updates**) and Docker `:<version>` / `:beta` (`autobyteus-docker upgrade --all --tag beta`).

## Environment Or Persisted-Data Transition Notes

- Approved persisted-data decision: none affected (`mcps.json`, the vault and run history are untouched)
- Delivery action required: `None`

## Verification Checks

- `python3 scripts/check_licensing.py` → `Licensing is consistent.`; `python3 scripts/check_repository_artifact_hygiene.py` → `Repository artifact hygiene check passed.` (74,897 tracked files, longest path 200 chars). Run on the archived ticket state, whose tree equals the merged `personal` tree.

## Rollback Criteria

- Roll back if a user's MCP server that worked on 1.32.1 fails to connect, list or call on the beta for a reason other than the approved wording/paging differences. That would also be a REQ-013 defect if the protocol era is the cause.
- Method: revert the merge on `personal` and cut a newer beta. No data migration, so older builds read the same data. Docker users can pin an earlier version tag.

## Final Status

- Verification complete (from the evidence, or the user's check where needed): `Yes` (from the evidence; the user dropped the check)
- Repository finalization complete: `Yes`
- Applicable release/deployment/rollout complete or not required: `Yes` (beta `v1.5.8-beta.1`, 4/4 workflows, 17/17 assets, Docker `:1.5.8-beta.1` and `:beta`)
- Applicable safe cleanup complete or not required: `Yes`
- Unresolved blocker: `None`
- Successful terminal package eligible for return: `Yes`
- Terminal package sent to the Solution Designer: `Yes`, after this record's push, via `send_message_to` `/software_engineering_team/solution_designer` (the "Delivery Completed" rule from `get_handoff_rules`)
- Terminal message/reference: Delivery Completed for `mcp-sdk-v2-migration` (`autobyteus-182`), DR-001
