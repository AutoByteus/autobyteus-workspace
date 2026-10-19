# Delivery / Release / Deployment Report — mcp-sdk-1-32-upgrade

# Round 2 (DR-002) — latest authoritative result

## Scope

Round 2 delivers the parity validation the user asked for after DR-001 (SR-002, SR-003, IR-002, API-REV-002). There is no product source change. It adds one gated e2e suite, evidence and a docs section, finalizes them into `origin/personal`, then publishes beta `v1.5.7-beta.1`. Classification of this round: `task_size=Small`, `architectural_risk=Low`, direct low-risk route; review artifacts `Not Applicable`.

## Project Release Guide

- `RELEASE.md` at `origin/personal` @ `f33dacc994` (last changed in `c64a45b871`); deviations: `None`; proposed fixes: `None`

## Integration Refresh

- Ticket branch `codex/mcp-sdk-1-32-upgrade-parity`, created from `origin/personal` @ `f59055f13f` (the DR-001 finalization)
- Latest base checked: `origin/personal` @ `f33dacc994`, one commit ahead (`docs(delivery): record stable v1.5.6 publication (DR-002)`; ticket files only)
- Checkpoint commit: `Not needed` (validated state committed at `1250a74840`)
- Integration method: `Merge` → `cec8ccdf89`; no conflicts
- Post-integration checks rerun: `Yes`, all Pass

| Check | Command | Result | Evidence |
| --- | --- | --- | --- |
| DR-06 | `pnpm -C autobyteus-ts build`; `pnpm -C autobyteus-server-ts build` | Pass (exit 0) | `evidence/DR-06-integrated-core-server-build.log` |
| DR-07 | `RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<abs fixture> … vitest run tests/e2e/runtime/mcp-runtime-tool-matrix.e2e.test.ts`; then no gate | Pass: `1 passed / 5 skipped`; summary `taskStatus DONE`, `stdioEnvDelivered true`, `stdioCwdDelivered true`, `httpToolCalls ["expected"]`, `dummyOnWire false`. No gate: `6 skipped` | `evidence/DR-07-integrated-runtime-mcp-matrix.log` |
| DR-08 | `vitest run tests/e2e/tool-management/mcp-http-redirect-and-transport.e2e.test.ts tests/e2e/tool-management/mcp-http-auth-remote-server.e2e.test.ts` | Pass, 4/4 | `evidence/DR-08-integrated-built-server-mcp-e2e.log` |

- Live runtimes and the before/after isolated apps were not repeated: the base commit touched ticket files only.
- Delivery edits started only after the integrated state was current: `Yes`

## Verification

- Evidence judged: `Sufficient`. Sources: the round-2 Acceptance-Criteria Proof and Cases (95.4%, lowest category 93%, target met), the files below, and DR-06..08.

| Acceptance-Criteria ID | Cases And Files Checked | What You Saw | Judgement |
| --- | --- | --- | --- |
| AC-010 toy integration parity | `IMP-SR2-01-toy-integration-{before,after}.log` | `Tests 4 passed` on both (before also skips the WebSocket case; the HTTP/WS toys do not exist: "cannot run on either") | Proven |
| AC-011 real servers in isolated apps | `API-10-12-parity-comparison.txt`; harness files (bundle `1.30.0 (only copy)` / `1.32.1 (only copy)`) | `SAME` VideoAudioServer 32/32, media-downloader 2/2, parity_http 1/1; tool names identical | Proven |
| AC-012 exit/hang at start | same comparison; `API-13-processes-and-stop.txt` | exit: `Connection closed` in about 40 ms on both; hang: `Request timed out` at 60.0 s on both, health 200 during the hang; after stop `forced: false`, `dataRootRemoved: true`, `(no process left)` | Proven |
| AC-013 code statement | `API-15-sdk-imports.txt` | server `src` imports 0 on both; only `autobyteus-ts/src/tools/mcp/server/*` | Proven |
| AC-014 project tools from Claude and Codex | comparison matrix; `API-17-codex-direct-mcp-{before,after}.txt` | Claude, native, AGY, Grok: `create_task`/`update_task` succeeded, task `DONE DONE`. Codex live turn: `You've hit your usage limit` on both commits. Codex's own MCP client: `updateTask … DONE`, stdio `62.314667`, HTTP `expected`; outputs differ only in paths, IDs and timings | Proven. The SDK can only affect the tool path, which is proven through Codex's real MCP client; round 1 (API-04) had a live Codex turn on 1.32.1 |
| AC-015 gateway call | comparison "Gateway" | `SAME toolCount 35 35`, stdio `62.314667` on both, HTTP answered | Proven |
| AC-016 plain-words report | report top section | present: what ran, same/different, what could not run, findings | Proven |
| AC-017 runtime × MCP matrix | comparison matrix; API-17; `API-18-runtime-mcp-matrix-suite.txt` | every cell same before/after; HTTP server `authValues ['expected']`, 28 requests each side; durable suite passes for AGY, Codex MCP client, native, Claude, Grok; API-18M red with stdio env dropped | Proven |
| AC-009 dummy values | `API-16-ac009-scan.txt`; DR rerun logs | every raw log `test-dummy=0`; DR logs 0 | Proven |
| REQ-010 safety | `API-14-user-data-untouched.txt` | both user MCP repos `diff: identical`; `mcps.json` mtime unchanged | Proven |

- More evidence requested: `None`
- User check needed: `No`. Optional: a live Codex model turn after the account's usage limit resets (25 Oct).
- Report inconsistency noted, not material: the round-2 routing line says "no durable test code changed this round", while the report also lists the added matrix suite. The suite is in the diff and in API-18.

## Release Decision

- Decision: `Beta` (`v1.5.7-beta.1`)
- Decided by: the user, in the Delivery Engineer conversation after DR-001: "for the next version, pplase release a meta. there will be another ticket comming. i just say this". This was in reply to my question whether to cut `v1.5.7-beta.1` then. Delivery reads "meta" as "beta", and treats this round, the next delivery to arrive, as the trigger. The beta contains everything on `personal` since stable `v1.5.6`.

## Docs Sync Result

- `docs-sync-report.md` (round 2): `Updated`, `autobyteus-server-ts/docs/modules/mcp_server_management.md` "Verifying An MCP SDK Upgrade"

## Ticket State Transition

- Moved back from `tickets/in-progress/` (by the Solution Designer for SR-002) to `tickets/done/mcp-sdk-1-32-upgrade/`: `Yes`

## Finalization Record (round 2)

| Step | Result |
| --- | --- |
| Ticket archive | pending |

## Final Status (round 2)

- pending

---

# Round 1 (DR-001) — history

## Release / Publication / Deployment Scope

Repository finalization of `codex/mcp-sdk-1-32-upgrade` into `origin/personal`. No release, tag or deployment (Release Decision below). `task_size=Medium`, `architectural_risk=Low`, direct low-risk route; architecture, source and test-code review artifacts `Not Applicable`.

## Project Release Guide

- Release guide path and revision: `RELEASE.md` at `origin/personal` @ `bf3c550c18` (last changed in `c64a45b871`)
- Deviations from the guide and why: `None`
- Proposed guide fixes: `None`

## Handoff Summary

- Handoff summary artifact: `tickets/done/mcp-sdk-1-32-upgrade/handoff-summary.md`
- Handoff summary status: `Updated`
- Delivery revision record: `tickets/done/mcp-sdk-1-32-upgrade/delivery-revision-record.md`
- Current delivery revision ID: `DR-001`

## Initial Delivery Integration Refresh

- Bootstrap base reference: `origin/personal` @ `436b85ce93`
- Latest tracked remote base reference checked: `origin/personal` @ `bf3c550c18` (fetched 2026-10-19)
- Base advanced since bootstrap: `Yes` (14 commits: task-part-of beta.11 record, run-file-change live-cache-race fix, stable `v1.5.6` release commit and notes)
- New base commits integrated into the ticket branch: `Yes`
- Local checkpoint commit result: `Not needed` (validated state fully committed at `53ef702bd3`; only untracked build output)
- Integration method: `Merge` (`git merge --no-ff origin/personal` → `7d02301c3a`)
- Integration result: `Completed`, no conflicts. No file changed on both sides; the base did not touch `pnpm-lock.yaml`, either `package.json` with the SDK pin, or any MCP code or test. After the merge both manifests still pin `1.32.1` and the lockfile has no `sdk@1.30`.
- Post-integration executable checks rerun: `Yes`

| Check | Command | Result | Evidence |
| --- | --- | --- | --- |
| DR-01 | `pnpm -C autobyteus-ts build`; `vitest run tests/unit/tools/mcp` (clean env) | Pass; 73/73 (real-SDK HTTP incl. redirects, stdio fixture env/cwd, config/types incl. websocket rejection) | `evidence/DR-01-integrated-core-build-mcp-unit.log` |
| DR-02 | `pnpm -C autobyteus-server-ts typecheck`; `pnpm -C autobyteus-server-ts build` | Pass (exit 0) | `evidence/DR-02-integrated-server-typecheck-build.log` |
| DR-03 | built-server e2e: `mcp-http-redirect-and-transport` + `mcp-http-auth-remote-server` together, then the redirect file alone | Pass, 4/4 then 2/2. Redirect observations: `other` (cross-origin target) 0 requests; `moved` 12 on `/mcp` + 12 on `/mcp-new`, all `expected`; `serverOutputScan` `containsDummy: false, containsCanary: false`. Credentials observations identical in shape to 179 API-01 | `evidence/DR-03-integrated-built-server-mcp-e2e.log`, `DR-03-integrated-redirect-observations.json.txt`, `DR-03-integrated-credentials-observations.json.txt` |
| DR-04 | scripted AGY agent tool call (`RUN_AGY_FAILURE_E2E=1`) | Pass, `1 passed / 3 skipped`; `hdr` and `tok` `tools/call` `auth: expected`; markers received; `dummyValueOnAgentWire: false` | `evidence/DR-04-integrated-agy-agent-tool-call.log` |
| DR-05 | server unit `tests/unit/mcp-server-management` + `tests/unit/services/run-file-changes` (base change) | Pass, 35/35 | `evidence/DR-05-integrated-server-unit-focus.log` |

- Not rerun: full server e2e, live runtimes, Docker and Electron (API-05..08). The base changed one server service (`run-file-change-service.ts`) unrelated to MCP, plus docs, release notes and the web version; DR-05 covers that service. The dependency tree is unchanged by the base, so the Docker and packaged-app SDK resolution still stands.
- Post-integration verification result: `Passed`
- Delivery edits started only after integrated state was current: `Yes`
- Handoff state current with latest tracked remote base: `Yes` (re-checked before the final merge; see Finalization Record)

## Verification

- Evidence judged: `Sufficient`
- Evidence relied on: the execution report's Acceptance-Criteria Proof and Cases (95.6% overall, lowest category 93%, target met), the files opened below, and DR-01..05.

| Acceptance-Criteria ID | Cases And Files Checked | What You Saw | Judgement |
| --- | --- | --- | --- |
| AC-001 single SDK 1.32.1; peers on it | Implementation row AC-001; `API-07-docker-image-mcp.txt`; `API-08-electron-packaged-mcp.txt`; merged manifests + lockfile | `@modelcontextprotocol+sdk@1.32.1_zod@4.3.6 (only copy)` in the Docker install and the app bundle; Claude Agent SDK and GenAI variants on 1.32.1; manifests `1.32.1`; lockfile `sdk@1.30` count 0 | Proven |
| AC-002 cross-origin redirect refused, nothing sent | API-01 log + observations; API-01M; IMP-00; API-07/08; DR-03 | `other` 0 requests; error `Redirect to http://127.0.0.1:<B>/mcp not followed (redirectPolicy: 'same-origin')`; mutant `1 failed \| 1 passed`; red on 1.30.0 (`1 failed \| 5 passed`); Docker and Electron `crossOriginTargetRequests: 0` | Proven |
| AC-003 same-origin redirect works | API-01 observations; DR-03 | `moved` on `/mcp-new`: initialize, tools/list and tools/call all `expected` | Proven |
| AC-004 179 behavior on 1.32.1 | API-03/04/06 summaries; API-05; DR-03, DR-04 | native, Codex, Claude: `tools/call` `auth: expected` on both servers, markers received; 179 built-server file passes inside the full e2e and in DR-03 | Proven |
| AC-005 typecheck, no seams/casts | Implementation AC-005 row; IMP-01/IMP-04; DR-01/DR-02 | empty grep; builds and typecheck pass | Proven |
| AC-006 websocket rejected, listed types, nothing saved | API-01/02; DR-03 | `importedCount 1, failedCount 1`; only the valid entry saved; log `Valid types are: stdio, streamable_http.`; WebSocket-era stored entries skipped at startup | Proven |
| AC-007 real stdio server with env and cwd | IMP-02; API-07/08; DR-01 | Docker `envDelivered: true`, `cwd: "/tmp"`; Electron `envDelivered: true`, configured cwd | Proven |
| AC-008 full rerun | IMP-02/05/06/09; API-05 | core 2047, server unit 6079, integration 419, web 4547, server e2e 370 passed / 394 gated-skipped, exit 0. IMP-03 (external-toy integration tests) fails with `ENOENT` because the separate toy repo is absent from the worktree layout; those tests are out of scope, and the same stdio/HTTP paths are proven by the real-fixture tests, Docker and Electron. Follow-up recorded | Proven |
| AC-009 dummy values only | `API-09-ac009-scan.txt`; Docker/Electron log scans; DR evidence grep | dummy values only; `test-dummy occurrences: 0` in container and app logs; DR files 0 | Proven |

- More evidence requested: `None`
- User check needed: `No`. All proof uses local servers and dummy values; nothing needs the user's accounts.
- Re-verification after later re-integration: `Not needed` (target unchanged after verification)

## Release Decision

- Decision: `No release`
- Decided by: `RELEASE.md` default; the user did not ask for a release of this ticket. The Task says it ships with the next beta; `v1.5.7-beta.1` (`python3 scripts/release_versions.py next-beta`) is available on request.

## Docs Sync Result

- Docs sync artifact: `tickets/done/mcp-sdk-1-32-upgrade/docs-sync-report.md`
- Docs sync result: `Updated`
- Docs updated: `autobyteus-server-ts/docs/modules/mcp_server_management.md`

## Ticket State Transition

- Ticket moved to `tickets/done/mcp-sdk-1-32-upgrade`: `Yes`
- Archived ticket path: `tickets/done/mcp-sdk-1-32-upgrade/`

## Version / Tag / Release Commit

- None (no release).

## Repository Finalization

- Bootstrap context source: `handoff.md` (finalization target `origin/personal`) and `RELEASE.md`
- Ticket branch: `codex/mcp-sdk-1-32-upgrade`
- Step results are in the Finalization Record below.

## Release / Publication / Deployment

- Applicable: `No`
- Release/publication/deployment result: `Not required`
- Release notes handoff result: `Not required` (notes archived for the next stable release)

## Post-Finalization Cleanup

- Dedicated ticket worktree path: `/Users/normy/autobyteus_org/autobyteus-worktrees/mcp-sdk-1-32-upgrade`
- Results are in the Finalization Record.

## Release Notes Summary

- Release notes artifact: written during delivery in the archived folder
- Archived release notes artifact: `tickets/done/mcp-sdk-1-32-upgrade/release-notes.md` (for the next stable release; betas use generated notes)
- Release notes status: `Updated`

## Deployment Steps

- None. The repository deploys no hosted service (`RELEASE.md` Deployment).

## Environment Or Persisted-Data Transition Notes

- Approved persisted-data decision: `Not Affected`
- Delivery action required: `None`
- Result and evidence: API-02 started on a `mcps.json` with WebSocket-era entries; they are skipped and the valid entry registers.

## Verification Checks

- `python3 scripts/check_repository_artifact_hygiene.py` and `python3 scripts/check_licensing.py` on the archived ticket branch and on the merged state; results in the Finalization Record.

## Rollback Criteria

- If MCP servers fail to connect or call in the field (for example a legitimate endpoint behind a cross-origin redirect that cannot be replaced by its final URL), revert the merge on `personal` and ship with the next release (`RELEASE.md` Rollback).
- Rolling back is possible: `mcps.json` shapes are unchanged, and an earlier build reads the same configuration. No data conversion.
- Core, server and web move together (DESIGN.md: no mixed-version compatibility).

## Finalization Record

| Step | Result |
| --- | --- |
| Ticket archive | `git mv tickets/in-progress/mcp-sdk-1-32-upgrade tickets/done/mcp-sdk-1-32-upgrade`. 51 tracked files; longest ticket path 100 characters; no Windows-hostile names; no build output |
| Pre-commit checks (ticket branch) | `check_repository_artifact_hygiene.py`: `Repository artifact hygiene check passed.` `check_licensing.py`: `Licensing is consistent.` |
| Ticket branch commit | `bbac99d34b` "docs(delivery): sync docs and archive mcp-sdk-1-32-upgrade (DR-001)" |
| Ticket branch push | `origin/codex/mcp-sdk-1-32-upgrade` → `bbac99d34b` (new remote branch) |
| Target refresh after verification | Re-fetched `origin/personal`: still `bf3c550c18`, the integrated and verified base. No re-integration needed |
| Finalize branch | `finalize/mcp-sdk-1-32-upgrade` from `origin/personal`, in the ticket worktree (`RELEASE.md`) |
| Merge | `git merge --no-ff codex/mcp-sdk-1-32-upgrade` → `6990940b8d`. Tree identical to the verified ticket branch (`git diff --quiet` passes) |
| Checks on the merged state | Hygiene check passed; licensing consistent |
| Push target | Fetched before the push: `origin/personal` = `6990940b8d^1` (`bf3c550c18`), unchanged. `git push origin HEAD:personal`: `bf3c550c18..6990940b8d` |
| Repository finalization status | `Completed` |
| Release / publication / deployment | `Not required` (No release, the `RELEASE.md` default). No tag; no pipelines triggered |
| Delivery record commit | This record is committed on `finalize/mcp-sdk-1-32-upgrade` on top of `6990940b8d` and pushed to `personal` after a fresh fetch shows the target unchanged (rebased onto any newer `personal` if it moved, touching only this ticket's folder) |
| Worktree cleanup | After the record push: `git worktree remove --force` (only untracked build output remains: `*/dist/`, `autobyteus-web/electron-dist/`) and `git worktree prune`, from the main repository's git dir; the main checkout's working tree is not touched |
| Local branch cleanup | After the record push: `codex/mcp-sdk-1-32-upgrade` and `finalize/mcp-sdk-1-32-upgrade` deleted once `origin/personal` contains them |
| Remote branch cleanup | `Not required`. By repository practice, merged `codex/*` ticket branches stay on `origin` |

## Final Status

- Verification complete (from the evidence): `Yes`
- Repository finalization complete: `Yes` (`origin/personal` @ `6990940b8d`, followed by this record commit)
- Applicable release/deployment/rollout complete or not required: `Yes` (`Not required`, No release)
- Applicable safe cleanup complete or not required: `Yes` (worktree and local branches removed after the record push; see the Finalization Record)
- Unresolved blocker: `None`
- Successful terminal package eligible for return: `Yes`
- Terminal package sent to `/software_engineering_team/solution_designer`: `Yes`, sent after this record commit and cleanup (DR-001)
