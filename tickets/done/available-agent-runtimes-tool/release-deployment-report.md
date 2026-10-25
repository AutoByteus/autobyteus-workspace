# Delivery / Release / Deployment Report — autobyteus-303

## Release / Publication / Deployment Scope

The change covers a new server read service, an opt-in agent tool, provider usage readers, a GraphQL query, a Settings → Model Routing page, durable tests and docs. Finalization target: `origin/personal`. No release.

## Project Release Guide

- Release guide path and revision: `RELEASE.md` at `83e8e12125`
- Deviations from the guide and why: `None`. The ticket branch follows `codex/<ticket-name>`, finalization runs in the ticket worktree on `finalize/available-agent-runtimes-tool`, and the Secret Gate runs before the first push and on the merged state.
- Build output: the untracked `*/dist/` folders (`applications/brief-studio`, `autobyteus-application-*`) are not committed; paths are staged explicitly.
- Proposed guide fixes: `None`

## Handoff Summary

- Handoff summary artifact: `tickets/done/available-agent-runtimes-tool/handoff-summary.md`
- Handoff summary status: `Updated`
- Delivery revision record: `delivery-revision-record.md`
- Current delivery revision ID: `DR-001`

## Initial Delivery Integration Refresh

- Bootstrap base reference: `origin/personal` @ `a2faf424d6`
- Latest tracked remote base reference checked: `origin/personal` @ `a2faf424d6` (`git fetch origin personal`, 0 new commits)
- Base advanced since bootstrap or previous refresh: `No`
- New base commits integrated into the ticket branch: `No`
- Local checkpoint commit result: `Completed`. The code reviewer's uncommitted round-5 records (`code-review-report.md`, `code-review-revision-record.md`, `api-e2e-test-review-report.md`) were committed as `e1450c9754` before any delivery edit.
- Integration method: `Already current`
- Integration result: `Completed`
- Post-integration executable checks rerun: `Yes`, as a delivery smoke check even though nothing was integrated. DEL-01: `env -i PATH="$PATH" HOME=<mktemp -d> TMPDIR="$TMPDIR" pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/available-agent-runtimes-graphql.e2e.test.ts --no-watch` gave `Tests  6 passed (6)` (`evidence/delivery/DEL-01-server-e2e-rerun.log`).
- Post-integration verification result: `Passed`
- No-rerun rationale: not applicable (rerun done). The base did not move, and the code at `e1450c9754` is identical to the validated `cc789b7c84`, so API/E2E round 2 still applies in full.
- Delivery edits started only after integrated state was current: `Yes`
- Handoff state current with latest tracked remote base: `Yes`

## Verification

- Evidence judged: `Sufficient`
- Evidence relied on:
  - the execution report's Acceptance-Criteria Proof and Cases (API-REV-002, final confidence 95%, no category below 90%);
  - the critical evidence files, opened directly and listed below;
  - code review CRR-005 (9.5/10) and test review CRR-006 (Pass);
  - delivery's rerun DEL-01.
- Mocked: runtime CLIs (scripted with each wire protocol and recorded answers) and provider HTTP in the repository cases. The live cases close that gap: API-08 shows live answers equal to the vendors' direct answers, API-08b covers live LM Studio, API-11 a live agent run, and API-12 a Docker node.

| Acceptance-Criteria ID | Cases And Files Checked | What You Saw | Judgement |
| --- | --- | --- | --- |
| AC-001 | `API-01-06-r2-server-e2e-excerpt.log` (AAR-01 cold-read, providers); `API-08b-r2-live-lmstudio-probe.json.log`; `API-12-r2-docker-node.log` | Cold read lists `codex_app_server, claude_agent_sdk, antigravity_cli, grok_build, autobyteus`; providers with models. Live LM Studio is listed under `beforeEnsure` with 4 models. In Docker, signed-out CLIs are `installed … SIGNED_OUT` and absent from the answer | Proven |
| AC-002, AC-012 | Excerpt lines 20, 24–25 (AAR-04) | With the tool: `enabled_tools ["list_available_agent_runtimes",…]`. Without: `"Tool is not enabled for this session"` | Proven |
| AC-003 | AAR-01 report; `API-08-09-r2-live-probe.json.log` `direct` vs `product`; MRP-01b screenshot | Codex "Weekly" at 0% blocks `gpt-5.6-luna` `{until: 2026-10-30T19:57:53Z, by: "Weekly"}`. Live: direct 100 = product 100 | Proven |
| AC-004 | Live probe (direct groups 90.2 / 100 / 0 / 36.5 → product 90 / 100 / 0 / 36, rounded down); MRP-01b | Claude Sonnet blocked "Claude and GPT models · weekly"; Gemini not blocked | Proven |
| AC-005 | AAR-01 `claude-stdin-frames ["control_request initialize","control_request get_usage"]`; `API-10-r2-claude-repeated-get-usage.log` | Only control frames. 6 reads, each `session_total_cost_usd: 0`, `session_model_usage: {}`, utilization stable at 53 / 60 | Proven |
| AC-006 (not critical) | MRP-01b; live probe `"Billing period", remainingPercent: null` | "Billing period … resets"; note "Grok does not report how much of the period is used." | Proven. The used-% meaning is for the user (UNK-001) |
| AC-007 | AAR-01 providers; AAR-06 lines 26–28; MRP-02 discovered; API-12 | DeepSeek "0.14 USD"; Kimi and Anthropic blocked with their reasons and all their models blocked; OpenAI "not reported". LM Studio answering is listed, not answering is absent. Custom endpoint down shows `models: "unknown: … CUSTOM_PROVIDER_DISCOVERY_UNAVAILABLE"` | Proven |
| AC-008 | AAR-02 `signIn: "not checked"`; AAR-03 report; `API-03b-r2-timeout-reason-probe.log` | `"limits":"unknown: Antigravity usage limits timed out"`; 400/400 "timed out" | Proven |
| AC-009 | AAR-05 (`secrets: 11` scanned over 55 responses and 262 output chunks); MRP-07 `hits []`; live `scan` all 0; Docker hits 0 | No key, e-mail or account value. Provider calls go only to usage endpoints (`refused-outside-urls []`) | Proven |
| AC-010 | `API-07-r2-probe-summary.log` (Pass MRP-01…07, `browserErrors: []`); MRP-01b, MRP-02b screenshots | The page shows the same rows, limits, reset times and blocked models as the node's answer; Check again re-reads; a remote-node window shows that node | Proven (the user's own windows: optional user check) |
| AC-011 | AAR-03 `elapsed-ms 14050`, hung pids stopped; live cold read 4994 ms | Within 20 s; the slow steps end at their own deadlines | Proven |
| AC-013 | AAR-04 `parallel` (one `checkedAt` for 4 callers, `appServersStarted: 1`), 10 two-reader rounds all `read`; live API-09 `wallMs 4710 / 4539`, one `checkedAt` per round | One shared read; Codex read for every caller | Proven |

- More evidence requested: `None`
- User check needed: **corrected to `Yes` in DR-002** (see "Receipt Correction (DR-002)"): the Task's "Done when" requires the user's check in the desktop app on the desktop node and a Docker node. The DR-001 text follows. `No`. Every critical criterion is proven by evidence. Three optional checks need the user's own windows or accounts; they do not gate this ticket (`handoff-summary.md`):
  - AC-010 in the user's own desktop and Docker-node windows: the same web bundle was proven on test-owned nodes, and the desktop shell is unchanged.
  - AC-006 used-% meaning: Grok reports none this period.
  - ASM-001 signed-in CLIs in Docker: if it fails, the result is a truthful "unknown"/"not checked", not a wrong answer.
- Re-verification after later re-integration: `Not needed` (target did not advance; see Finalization Record)

## Release Decision

- Decision: `Beta` (`v1.5.9-beta.7`, DR-002). At DR-001 it was `No release`.
- Decided by: the user, relayed by the API/E2E engineer on 2026-10-25 ("The user asks for a new beta release that includes autobyteus-303"). At DR-001: the RELEASE.md default. Neither the request nor the ticket asks for a release. A beta or stable release is available whenever the user wants one.

## Docs Sync Result

- Docs sync artifact: `docs-sync-report.md`
- Docs sync result: `Updated`
- Docs updated:
  - By delivery: `agent_tools.md` (two tool lists), and the test listings in `agent_runtimes.md` and `settings.md`.
  - By the implementation, verified by delivery: `agent_runtimes.md`, `agent_tools.md`, `llm_management.md`, `settings.md`, `GLOSSARY.md`, `docs/design-cases.md`.

## Ticket State Transition

- Ticket moved to `tickets/done/<ticket-name>`: `Yes`
- Archived ticket path: `tickets/done/available-agent-runtimes-tool/`

## Version / Tag / Release Commit

None.

## Release / Publication / Deployment

- Applicable: `Yes` (DR-002; `No` at DR-001)
- Release/publication/deployment result: `Completed` (see "Beta Release (DR-002)")
- Release notes handoff result: `Not required` (beta tags use GitHub generated notes)

## Environment Or Persisted-Data Transition Notes

- Approved persisted-data decision: none affected (live reads only; requirements "Data Continuity").
- Delivery action required: `None`

## Rollback Criteria

Revert the merge on `personal`. The tool and the Model Routing page disappear, and Claude model discovery goes back to its string prompt. No data change, so a revert is safe.

## Repository Finalization

Recorded after the merge in "Finalization Record" below.

## Finalization Record

- Bootstrap context source: the code reviewer's handoff (branch `codex/available-agent-runtimes-tool`, base `origin/personal` `a2faf424d6`) and RELEASE.md
- Ticket branch: `codex/available-agent-runtimes-tool`
- Ticket branch commit result: archive commit `624a9d3285`, on top of checkpoint `e1450c9754`. Code: `5135bb73dc`, `683b036be9`, `07c07cfc27`, `c4fff3eb00`, `7ece4e2069`. API/E2E tests: `8de58e3ab3`, `cc789b7c84`.
- Name check before the commit: `check_repository_artifact_hygiene.py` passed. The longest ticket path is 128 characters, with no Windows-hostile names.
- Ticket branch push result: pushed `origin/codex/available-agent-runtimes-tool` @ `624a9d3285`, after the Secret Gate on `origin/personal..codex/available-agent-runtimes-tool` passed (13 commits)
- Finalization target remote: `origin`
- Finalization target branch: `personal`
- Target advanced after verification: `No` (`a2faf424d6` at verification, at the merge and right before the push)
- Delivery-owned edits protected before re-integration: `Not needed`
- Re-integration before final merge result: `Not needed`
- Target branch update result: `finalize/available-agent-runtimes-tool` created from `origin/personal` @ `a2faf424d6`
- Merge into target result: `git merge --no-ff` → `eac8ee6dfc`. Checks on the merged state:
  - Secret Gate PASS (14 commits);
  - `check_repository_artifact_hygiene.py` passed;
  - `check_licensing.py`: "Licensing is consistent."
- Push target branch result: `a2faf424d6..eac8ee6dfc  HEAD -> personal`
- Repository finalization status: `Completed`

## Post-Finalization Cleanup

- Dedicated ticket worktree path: `/Users/normy/autobyteus_org/autobyteus-worktrees/available-agent-runtimes-tool`
- Worktree cleanup result: `Completed`.
  - Its only uncommitted content was untracked build output (`applications/brief-studio/dist/`, `autobyteus-application-*/dist/`).
  - No process ran from it, and no container mounted it. The only open handle was Docker's VM file-share cache from the already-removed API-12 container.
  - It was removed with `git worktree remove --force`, and the path no longer exists.
- Worktree prune result: `Completed`
- Local ticket branch cleanup result: `Completed`. `codex/available-agent-runtimes-tool` (`624a9d3285`) and `finalize/available-agent-runtimes-tool` (`eac8ee6dfc`) were deleted; both are contained in `origin/personal`.
- Remote branch cleanup result: `Not required`. `origin/codex/available-agent-runtimes-tool` is kept as the pushed ticket history.
- Other:
  - The main checkout was not touched. No user data, running app or user node container was changed.
  - This record was committed from a temporary detached checkout of `origin/personal` (`/tmp/ab303-record`), which is removed after the push.

## Final Status

- Verification complete: `Yes` (from the evidence; no user check required)
- Repository finalization complete: `Yes` (`eac8ee6dfc` on `personal`)
- Applicable release/deployment/rollout complete or not required: `Yes` (no release)
- Applicable safe cleanup complete or not required: `Yes`
- Unresolved blocker: `None` at DR-001. Since the receipt check: the user's desktop/Docker-node check is open (DR-002)
- Successful terminal package eligible for return: `Yes` at DR-001; `No` until the user's check or waiver is recorded (DR-002)
- Terminal package sent to the Solution Designer: sent with `send_message_to` to the address from `get_handoff_rules`, right after this record is pushed (confirmed in the delivery conversation)

## Beta Release (DR-002)

- Trigger: the user asked for a new beta that includes autobyteus-303. The request was relayed by `/software_engineering_team/api_e2e_engineer` (run `api_e2e_engineer_0c8dd85fb20a445bbae9f25e48b39c43`) on 2026-10-25, while the user was away.
- Additional evidence that came with the request (API/E2E, after DR-001, on `c77f9af791`): API-14, the tool on live agents on all five runtimes with real models. An agent without the tool could not call it. The data the agent received matched each runtime's direct 0-token answer, value by value (`API-14b-tool-data-vs-direct.log`, all `MATCH`).
  - This evidence and its gated test `available-agent-runtimes-live-agents.e2e.test.ts` are on the unpushed, unreviewed local branch `codex/available-agent-runtimes-live-agents` (`2245f1a427`, `6a3d942539`).
  - They are not part of this release, and this record does not archive them.
- Release source: `origin/personal` @ `c77f9af791`. It contains merge `eac8ee6dfc` and the DR-001 record.
- Checks before tagging, on `c77f9af791`:
  - `check_licensing.py`: "Licensing is consistent."
  - `check_repository_artifact_hygiene.py`: passed.
  - `scripts/check_secrets.sh v1.5.9-beta.6..HEAD`: PASS (50 commits).
- Version: `python3 scripts/release_versions.py next-beta` gave `1.5.9-beta.7` (previous `v1.5.9-beta.6`, a pre-release published on 2026-10-24).
- Command: `bash scripts/desktop-release.sh beta --branch finalize/available-agent-runtimes-tool --no-push`, in a fresh, clean release worktree.
  - It produced commit `48e8234774` (`chore(release): bump workspace release version to 1.5.9-beta.7`, `autobyteus-web/package.json` only) and the annotated tag `v1.5.9-beta.7`.
  - The identity is the same as on `v1.5.9-beta.6` and the previous commits.
- Push:
  - `origin/personal` was confirmed still at `c77f9af791`.
  - `c77f9af791..48e8234774  HEAD -> personal`.
  - `[new tag] v1.5.9-beta.7`, at 09:52:43Z.
- Pipelines (all started 09:52:44Z, each watched with `gh run watch --exit-status`):

| Workflow | Run | Result |
| --- | --- | --- |
| Desktop Release | 40182463980 | success (10:17:07Z) |
| Android APK Release | 40182464007 | success (09:57:03Z) |
| iOS App Store Connect Release | 40182463997 | success (10:09:32Z), TestFlight upload |
| Server Docker Release | 40182464013 | success (10:31:07Z) |

- Published artifacts:
  - `gh release view v1.5.9-beta.7`: `isPrerelease: true`, 17 assets. These are macOS arm64 and x64 `.dmg`/`.zip` with blockmaps, Linux x64 and arm64 AppImages, the Windows `.exe`, `latest.yml`, `latest-mac.yml`, `latest-linux.yml` and `latest-linux-arm64.yml`, and the Android APK with its `.sha256`. This matches RELEASE.md.
  - Docker Hub: `autobyteus/autobyteus-server:1.5.9-beta.7` and `:beta` both point to `sha256:b66603777748a1183cee470be48428f4f32ee0975a435765fcb59a1bc8fcec2e` (linux/amd64 and linux/arm64). `:latest` is unchanged, as it should be for a beta.
- Release result: `Completed` (not partial).
- Release notes: GitHub generated notes (pre-release tag); no curated notes.
- Rollout to users:
  - Desktop installs with Settings → Updates → Receive beta updates on are offered 1.5.9-beta.7.
  - Docker nodes upgrade with `autobyteus-docker upgrade --all --tag beta`.
- Rollback: never move or delete the tag. Fix forward with the next beta, or revert the merge on `personal` and cut the next beta.
- Cleanup: the release worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/available-agent-runtimes-tool-release` and the local `finalize/available-agent-runtimes-tool` branch are removed after this record is pushed.

## Receipt Correction (DR-002, open)

- The Solution Designer's receipt check (2026-10-25, `receipt-verification.md` in `/Users/normy/autobyteus_org/autobyteus-delivery-records/available-agent-runtimes-tool-receipt-20261025/`) blocked the DR-001 receipt with a Delivery Receipt Evidence Gap.
  - The Task's "Done when" requires "the user has verified it in the desktop app (desktop node and a Docker node)", and AC-010's verification intent names it.
  - DR-001 recorded that check as optional. That was a delivery misjudgement.
- Status: **awaiting the user's check or explicit waiver.** The check is Settings → Model Routing → "Agent runtimes now" in the user's desktop window and in a Docker-node window. 1.5.9-beta.7 now makes the change available in both places.
- Once the check is in, it will be recorded here and in `delivery-revision-record.md`, and the corrected receipt goes to the Solution Designer.
