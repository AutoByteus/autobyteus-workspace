# Delivery / Release / Deployment Report

## Release / Publication / Deployment Scope

No release now. Repository finalization only.

## Project Release Guide

- Release guide path and revision: `RELEASE.md`, as of base `3712cd9bf0`
- Deviations: None. Paths are staged explicitly (TESTING.md).
- Guide check that caught a problem: `check_repository_artifact_hygiene.py` flagged 332 evidence paths over 200 characters, all in copied agent-memory trace trees. By the user's decision, those trees are not committed (`evidence/TRACES-NOT-COMMITTED.md`). Round 5 and round 4 traces are kept locally as byte-identical archives outside the repository. The check then passed.
- Proposed guide fixes: None

## Handoff Summary

- Handoff summary: tickets/done/collaboration-prompt-wording/handoff-summary.md (Updated)
- Delivery revision record: tickets/done/collaboration-prompt-wording/delivery-revision-record.md, DR-001

## Initial Delivery Integration Refresh

- Bootstrap base reference: `origin/personal` @ `3712cd9bf0`
- Latest tracked remote base checked: `3712cd9bf0` (after `git fetch origin personal`)
- Base advanced: No. New commits integrated: No. Checkpoint commit: Not needed. Integration method: Already current.
- Post-integration rerun: No. The validated state is the integrated state, and the delivery edits are docs and ticket artifacts only. No test reads docs (checked with `git grep` over tests and scripts).
- Delivery edits started only after integrated state was current: Yes

## Verification

- Evidence judged: Sufficient
- Evidence relied on: api-e2e-execution-coverage-report.md (API-REV-005). AC-001..AC-008 are proven on the judging runtimes. Final confidence is 93% with every category at or above 90%. I opened these logs in evidence/round5:
  - D-final-after-CRR-006.log: 11/11.
  - R2-unit.log: 705 files, 5687 tests passed.
  - R4-contracts.log: 18/0.
  - R6-agy-e2e.log: 90 passed, 4 skipped.
  - probes/P1.log: 4 Pass, 0 Fail.
  - LE-A1-analysis.txt: 0 unprompted sends on every valid run, both sides.
  - journeys-analysis.txt: reported 5/5 in every cell; branch task-message form address + run id 5/5.
- Judging runtimes: the user's decision (DEC-018, recorded by the Solution Designer as SR-017): Claude Sonnet and DeepSeek flash. The Codex clause of AC-008 is deferred until the usage reset (2026-10-22 09:16) as a follow-up rerun.
- The 95% target is missed by 2 points. The gap is Codex (excluded by the user) and catalogue entries that are unit-only but pinned to the source. More validation in this scope cannot close it.
- More evidence requested: None. User check needed: No.

## Credential Leak Check (requested by the user)

- Values checked, read locally and never printed: every secret-named or random-looking value in `~/.autobyteus/server-data/.env` (13 provider/API keys: Anthropic, AutoByteus, DeepSeek, Gemini, GLM, Google CSE, Grok, Kimi, OpenAI, Qwen, SerpAPI, Vertex AI, Zhipu) and the Codex CLI tokens in `~/.codex/auth.json` (access, id and refresh tokens). Each was matched as the full value and as its first 16 and last 16 characters.
- Scanned:
  - (A) all 3769 files this delivery adds or changes, including evidence/;
  - (B) every patch from `35eacddb25` to this branch and to `origin/personal`, covering the task-tool-split and collaboration-model-contract deliveries already pushed;
  - (C) every tracked file on `origin/personal`.
- Result: 0 matches for any API key or token. The only matches were non-secret settings (agent-definition IDs, image model names, the featured-catalog list, a VNC URL with no credentials).
- Pattern sweep (`sk-…` with a word boundary, `sk-ant-oat/api`, JWTs, `AIza…`, `AKIA…`, `ya29.`, Bearer, Slack, GitHub tokens) over the delivery files and the docs/tickets on `origin/personal`: 0 hits. The many `sk-` matches in the first pass were `task-…` IDs.
- `evidence/round5/secrets-import-*.txt` hold setting names and statuses only. The test roots (`cpw5-*`) whose databases held the imported keys were removed by API/E2E; I checked that they are gone.
- The scan scratch folder (`/tmp/keyscan-*`) was deleted. Its temporary pattern file was mode 0600 in a 0700 folder and was removed by the script.

## Release Decision

- Decision: No release now.
- Decided by: the user, 2026-10-16. Asked whether to cut a beta, the user accepted my recommendation not to release yet and said: "then you continue finish your work for this task".
- Release blocker for a later beta: the Project Task Manager in `autobyteus-agents` (`origin/HEAD` `1e36ab6`) still lists `create_or_update_task` in `agent-config.json`, and its `SKILL.md` names that tool three times. Any release that contains task-tool-split must wait for that package update (FU-1). A stable release should also wait for the Codex rerun after 2026-10-22.

## Docs Sync Result

- tickets/done/collaboration-prompt-wording/docs-sync-report.md: Updated (5 docs)

## Ticket State Transition

- Moved to `tickets/done/collaboration-prompt-wording`: Yes

## Version / Tag / Release Commit

None.

## Repository Finalization

- Ticket branch `codex/collaboration-prompt-wording` -> `origin/personal` via `finalize/collaboration-prompt-wording`, `merge --no-ff`: merge commit `d91298416e` pushed (the target was unchanged at `3712cd9bf0`). Status: Completed.

## Release / Publication / Deployment

- Applicable: No (Not required)

## Post-Finalization Cleanup

- Remove the worktree and the local and remote ticket branches after the push.

## Environment Or Persisted-Data Transition Notes

- None. No persisted format changed; earlier stored forms still read.

## Rollback Criteria

- Revert the merge on `personal`.

## Final Status

- Verification complete: Yes. Release: Not required.

---

# DR-002 — Beta v1.5.5-beta.1

## Scope And Decision

- Decision: **Beta**, decided by the user. The Solution Designer relayed it from the Project Task Manager on 2026-10-16: "ask the delivery engineer of the same software engineering team to release a beta. I think it's time." The user confirmed to me directly: "continue … just [stop] if there are any problem".
- Released exactly `origin/personal` @ `cf348d6dd6` plus the release bump. Since v1.5.4 that contains task-tool-split, collaboration-model-contract, collaboration-prompt-wording, the command-only shared-filesystem increment (AutoByteus NFS sources, the NFS Guide preview and the Docker launcher NFS attachment) and File Explorer pending-save draft preservation. It does not contain the memory refactor (Task 8641c0ac); no such commit is in `v1.5.4..origin/personal`.

## Checks Before Tagging

- FU-1: `autobyteus-agents` origin/HEAD `d8bcd68` (PR #55). The Project Task Manager's `agent-config.json` lists `create_task` and `update_task` (it also keeps `create_or_update_task`, which this build skips with a warning, AC-007). Its `SKILL.md` names `create_task`/`update_task` and says to use whichever the tool list has. Its task tools work with this build.
- On the release worktree at `cf348d6dd6` (clean): `check_licensing.py` passed and `check_repository_artifact_hygiene.py` passed. `release_versions.py next-beta` gave `1.5.5-beta.1`; the Android versionCode is `10050501`.
- `release-nfs.yml` (new since v1.5.4) had never run. Its gate test `scripts/tests/test_nfs_release_workflow.py` passed locally (5/5) before tagging.

## Cut And Push

- `bash scripts/desktop-release.sh beta --branch finalize/release-v1.5.5-beta.1 --no-push`: commit `84b89b14b4` ("chore(release): bump workspace release version to 1.5.5-beta.1"); annotated tag `v1.5.5-beta.1` (object `438509307a` -> `84b89b14b4`).
- `origin/personal` was unchanged at `cf348d6dd6` immediately before the push. Pushed `HEAD:personal` (`cf348d6dd6..84b89b14b4`), then the tag, at 2026-10-16T20:23Z.

## Rollout

| Workflow | Run | Result |
| --- | --- | --- |
| Desktop Release | 38961919034 | success (7/7 jobs) |
| Android APK Release | 38961919123 | success (metadata, build, publish) |
| iOS App Store Connect Release | 38961919065 | success, including "Archive And Upload To App Store Connect" (TestFlight) |
| Server Docker Release | 38961919030 | success |
| AutoByteus NFS Release | 38961919026 | failure **by design**: the `prepare` gate step exits because a tag push has no qualified `candidate_run_id` (`CANDIDATE_RUN` empty, `WANT_PUBLISH` true). All later jobs, including `publish`, were skipped; no NFS image or asset was published. This is the documented "a tag push without this reference refuses publication" (`autobyteus-nfs/packaging/RELEASE.md`) |

- GitHub release `v1.5.5-beta.1`: pre-release, not a draft, published 2026-10-16T20:28:37Z, **17 assets**, matching RELEASE.md:
  - Android APK and `.sha256`;
  - Linux x64 and ARM64 AppImages;
  - macOS ARM64 and x64 `.dmg`/`.zip` with blockmaps;
  - the Windows `.exe`;
  - `latest.yml`, `latest-mac.yml`, `latest-linux.yml`, `latest-linux-arm64.yml`, all with `version: 1.5.5-beta.1`.
- Docker Hub: `autobyteus/autobyteus-server:1.5.5-beta.1` and `:beta` share digest `sha256:893302c4a2e9…` (amd64, arm64). `:latest` is unchanged at the v1.5.4 digest `sha256:8c6724d5e830…`.
- Result: **Completed**. All four release workflows succeeded. NFS is not part of the release: it is unqualified by design.

## Release Notes

- Curated notes are in `beta-v1.5.5-beta.1-release-notes.md` in this folder. They cover:
  - the task-tool-split notes;
  - the collaboration-model-contract upgrade notes (stored and imported collaborators become delegated task agents; delegate first, then talk by run id);
  - the collaboration-prompt-wording notes, saying that Codex is not yet checked;
  - the File Explorer fix;
  - the NFS Guide preview.

## Deviations From RELEASE.md

1. **Curated notes on a beta.** RELEASE.md says pre-releases use GitHub generated notes. The Solution Designer required specific upgrade notes. After all workflows had finished, I replaced the release body with `gh release edit --notes-file`: the curated notes, followed by the generated "Full Changelog" line. The tag, assets and pre-release flag are unchanged (checked afterwards).
2. **Internal ID left out of the notes.** RELEASE.md forbids internal IDs in release notes, so the Codex rerun Task (Project Task 55107203, after 2026-10-22) is recorded here, not in the notes. The notes say the Codex check follows after October 22 and gates the stable release.
3. **A fifth workflow.** A tag push now also starts `AutoByteus NFS Release`, which fails at its gate until NFS is qualified. RELEASE.md still lists four workflows.

## Proposed Guide Fixes (not applied; for the user)

- RELEASE.md "Watching The Rollout": add that a `v*` tag also starts `AutoByteus NFS Release`. Until NFS is qualified, its `prepare` job fails by design and publishes nothing; that run is not a partial release. This may become moot when NFS moves to its own project, which is in progress.
- RELEASE.md "Release Decision": say whether a beta may carry curated notes (as done here) or must keep generated notes only.

## Rollback

- Revert on `personal` and cut the next beta. Desktop updates never downgrade, and turning beta updates off waits for the next stable. Docker users pin `:1.5.4`.
- The collaborator conversion is one-way: converted runs stay converted on rollback.

## Final Status

- Verification complete: Yes (DR-001). Repository finalization: Completed. Release: Completed (beta; NFS refused by design). Cleanup: release worktree and local finalize branch removed after this record is pushed.
