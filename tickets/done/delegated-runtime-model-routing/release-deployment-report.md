# Delivery / Release / Deployment Report — autobyteus-32 (Model Router core)

## Release / Publication / Deployment Scope

Model Routing (switch, Model Router agent, one-at-a-time routing, decision log and statistics, peer contract), Settings → Model Routing and run Settings rows, durable tests and docs. Finalization target: `origin/personal`. Release: **Beta**, as the user asked.

## Project Release Guide

- Release guide path and revision: `RELEASE.md` at `83e8e12125` (unchanged by the merged base)
- Deviations from the guide and why:
  - The beta is cut **before** the user's own desktop-app check, which the Task's "Done when" requires.
  - The user asked for the beta ("if everything goes fine. please release a new beta thanks"). The beta is also how the user gets this build into their own desktop app for that check.
  - The terminal receipt waits for the check.
- Proposed guide fixes: `None`

## Handoff Summary

- Handoff summary artifact: `tickets/done/delegated-runtime-model-routing/handoff-summary.md`
- Handoff summary status: `Updated`
- Delivery revision record: `delivery-revision-record.md`
- Current delivery revision ID: `DR-001`

## Initial Delivery Integration Refresh

- Bootstrap base reference: `origin/personal` @ `d74f75a51a`
- Latest tracked remote base reference checked: `origin/personal` @ `50e93c2108`
- Base advanced since bootstrap: `Yes` (98 commits: embedded browser history, backend port recovery and native command shutdown, MCP secrets, release 1.5.9-beta.10, the concise NFS guide)
- Local checkpoint commit result: `Completed` (`67bb22ce04`: the design package, review records, test review and follow-ups that were uncommitted)
- Integration method: `Merge` → `357936966c`
- Integration result: `Completed`
  - One conflict, `docs/design-cases.md`: both sides added a Case 9. Both were kept; this ticket's case is now Case 11.
  - Auto-merged on both sides: `GLOSSARY.md`, `schema.ts`, `build-studio-server.ts` and `autobyteus-web/package.json`.
  - The Model Routing release sits inside the base's new `closeProcessResources`.
- Post-integration executable checks rerun: `Yes` (`evidence/delivery/DEL-01…04`):
  - install, server typecheck and server build: exit 0;
  - model-routing E2E 9/9, internal-agents E2E 5/5, two-server E2E 41/41;
  - server unit 7125 passed and 3 failed; the 3 fail on the base too (DEL-02, FU-010);
  - the ticket's web specs 25/25 and the three web guards;
  - the merged desktop build's smoke passed (DEL-04);
  - full web suite: one new failure, **DEL-F1**, plus the clean-base failures (DEL-03).
- DEL-F1 and DEL-F2 were classified `Local Fix` and routed to the implementation engineer.
  - Fixed in IR-004 `f48af0176a`, reviewed in CRR-006 and revalidated in API/E2E round 3 (API-REV-003); test review CRR-007.
  - Delivery reran the contract test, `draftMentionEligibility` and the ticket's web specs (7 files, 30/30), plus the three guards (exit 0).
- Post-integration verification result: `Passed`
- Delivery edits started only after integrated state was current: `Yes`
- Handoff state current with latest tracked remote base: `Yes` (`origin/personal` still `50e93c2108` at verification)

## Verification

- Evidence judged: `Sufficient`, apart from the user's check that the Task requires.
- Evidence relied on:
  - the execution report's Acceptance-Criteria Proof and Cases (round 2 and "Round 3 Cases");
  - the files opened by delivery, listed below;
  - code review CRR-006 (9.4/10), test reviews CRR-005 and CRR-007;
  - delivery's DEL-01…04;
  - API/E2E final confidence 95%.
- Mocked: runtime CLIs (the scripted AGY fixture) in the MR, RC and API-09 cases. The live cases close that gap: the live router on five runtimes (L-05, rounds 2 and 3), L-03/04 knowledge and a killed router process, and LR-3 with live delegators.

| Acceptance-Criteria ID | Cases And Files Checked | What You Saw | Judgement |
| --- | --- | --- | --- |
| AC-001 | MR-02 (`MR-01-09-…-r2-receipt.json`), L-05, API-14 | Members without a usable default start on the router's choice: designer `agent_default`, engineer and reviewer `model_router` (`grok_build / grok-4.7`, task kind and reason). Result lines "runs on … chosen by the Model Router (implementation): …" | Proven (plus the user's desktop check) |
| AC-002 | MR-01; API-09; RC-01…38 | Off: a team copy runs as today, with no routing request and no record | Proven |
| AC-003 | MR-05 on/off | On: "its agent default … could not be used (mr-blocked-model is blocked until 2026-11-02 10:00 UTC (Retiring · weekly))"; off: used as today | Proven |
| AC-004 | MR-03 corrected and silent; MR-09; RC-41 | Correction accepted after "Not accepted; nothing was changed."; a silent router gives the inherited launch "(no valid answer within 40 seconds)" after 40.3 s; recovery after a crash or a failed turn | Proven |
| AC-005 | RC-39…41 (excerpt), API-13 D-1…D-4 (r2, r3) | Off: refusal "… and Model Routing is off on node \"beta-node\"" with `modelRouting {state: off}`; on: beta routes and the launches come back; Docker the same; `MODEL_ROUTER_FAILED` within 50 s | Proven |
| AC-006 | MR-04 | One request per turn; one waiting past 40 s is never posted ("Routing request … is no longer open"); falls back as "busy" | Proven |
| AC-007 | L-03/04 r2; L-05 `knowledge.lineAdded` true on all runtimes | The owner's writing rule is in `knowledge.md`; later routings "chosen by the Model Router (writing)", also after the router process was killed | Proven |
| AC-008 | MR-07; internal-agents E2E | Definition, run and workspace hidden, then shown when the setting is on | Proven |
| AC-009 | API-14 MRD-01…08 (r3), no browser errors | Configuration, Decisions, Overview, en and zh-CN | Proven |
| AC-011 | MR-08 `["list_available_agent_runtimes","submit_launch_choices"]`; L-05 `collaborationToolsNamed: []` | No collaboration tools on any runtime | Proven |
| AC-012 | MR-02 sources; RC-40; API-14 MRD-04 | Settings rows with runtime, model, source and reason | Proven |
| Done-when: "the user has verified it in the desktop app" | API-15 r3 (final build smoke); DEL-04 | Prepared and smoke-checked by API/E2E and delivery | **User Check — open** |

- More evidence requested: DEL-F1/F2 as code fixes (resolved). No more evidence was needed.
- User check needed: **`Yes`**. The Task's "Done when" requires it; the user is asked after the beta is published.
- Notes:
  - LR-3's Claude case failed once in a four-runtime run (a transient report read) and passed alone.
  - MR-09 failed once while it ran alongside a heavy live probe, and passed in every run alone, including delivery's on the merged code.
  - Grok was not live on the merged base (HTTP 429, usage used up); it passed live in round 2.

## Release Decision

- Decision: `Beta`
- Decided by: the user, in the delivery conversation of 2026-10-27: "if everythign goes fine. please release a new beta thanks."

## Docs Sync Result

- Docs sync artifact: `docs-sync-report.md`
- Docs sync result: `Updated` (rechecked after IR-004: copy only, and `settings.md` already says "Configuration")

## Ticket State Transition

- Ticket moved to `tickets/done/<ticket-name>`: `Yes`
- Archived ticket path: `tickets/done/delegated-runtime-model-routing/`

## Environment Or Persisted-Data Transition Notes

- New data under `<appData>/model-routing/` (settings, the router's run record, the decision log) and `<appData>/internal-workspaces/`. Nothing existing changes; no migration.
- Delivery action required: `None`

## Rollback Criteria

- Model Routing is off by default. Turning it off restores today's delegation.
- A full rollback is a revert of the merge on `personal` and the next beta. The `model-routing/` files and the internal workspace stay unused.
- Desktop updates never downgrade.

## Repository Finalization And Release

Recorded below after the merge and the release.

## Finalization Record

- Bootstrap context source: the code reviewer's handoff (branch `codex/delegated-runtime-model-routing`, base `origin/personal` `d74f75a51a`) and RELEASE.md
- Ticket branch: `codex/delegated-runtime-model-routing`
- Ticket branch commit result: archive commit `ccf55a4eb0`, on top of:
  - checkpoint `67bb22ce04`;
  - base merge `357936966c`;
  - delivery docs `e2e4f1a1ab`;
  - IR-004 `f48af0176a`;
  - API/E2E round 3 `9e8ac5e423`;
  - review records and FU-011 `9b1f9424cf`.
- Name check before the commit: `check_repository_artifact_hygiene.py` passed. The longest ticket path is 143 characters, with no Windows-hostile names.
- Ticket branch push result: pushed `origin/codex/delegated-runtime-model-routing` @ `ccf55a4eb0`, after the Secret Gate on `origin/personal..codex/delegated-runtime-model-routing` passed
- Finalization target: `origin/personal`
- Target advanced after verification: `No` (`50e93c2108` at verification, at the merge and right before the push)
- Merge into target result: `git merge --no-ff` on `finalize/delegated-runtime-model-routing` → `3c751828cb`. Checks on the merged state:
  - Secret Gate PASS;
  - `check_repository_artifact_hygiene.py` passed;
  - `check_licensing.py`: "Licensing is consistent."
- Push target branch result: pushed together with the release commit, `50e93c2108..f56365c809  HEAD -> personal`
- Repository finalization status: `Completed`

## Beta Release v1.5.9-beta.11

- Decision: `Beta`, by the user ("if everythign goes fine. please release a new beta thanks.", 2026-10-27)
- Checks before tagging, on `3c751828cb`:
  - `check_licensing.py`: consistent;
  - `check_repository_artifact_hygiene.py`: passed;
  - `scripts/check_secrets.sh v1.5.9-beta.10..HEAD`: PASS (94 commits).
- Version: `python3 scripts/release_versions.py next-beta` gave `1.5.9-beta.11` (previous `v1.5.9-beta.10`, a pre-release published 2026-10-26).
- Command: `bash scripts/desktop-release.sh beta --branch finalize/delegated-runtime-model-routing --no-push`, in a clean release worktree (`…/delegated-runtime-model-routing-release`). The ticket worktree keeps its untracked `electron-dist` for the user's check.
  - Release commit `f56365c809` (`chore(release): bump workspace release version to 1.5.9-beta.11`, `autobyteus-web/package.json` only) and the annotated tag `v1.5.9-beta.11`.
  - The identity is the same as on earlier releases.
- Push: `origin/personal` was confirmed still at `50e93c2108`; then `HEAD -> personal` and `[new tag] v1.5.9-beta.11`, at 07:10:14Z.

| Workflow | Run | Result |
| --- | --- | --- |
| Android APK Release | 40465501039 | success (07:14:56Z) |
| iOS App Store Connect Release | 40465501123 | success (07:26:41Z), TestFlight upload |
| Desktop Release | 40465501092 | success (07:38:00Z) |
| Server Docker Release | 40465501079 | success (07:42:18Z) |

- Published artifacts:
  - `gh release view v1.5.9-beta.11`: `isPrerelease: true`, 17 assets. These are macOS arm64 and x64 `.dmg`/`.zip` with blockmaps, Linux x64 and arm64 AppImages, the Windows `.exe`, four `latest*.yml` files, and the Android APK with its `.sha256`. This matches RELEASE.md.
  - Docker Hub: `autobyteus/autobyteus-server:1.5.9-beta.11` and `:beta` both point to `sha256:94c9b4bf19f7296ebcee2cb867a1ad0db3db85ee0aa26aea2e7ea340950b9751` (linux/amd64, linux/arm64). `:latest` is unchanged.
- Release result: `Completed` (not partial)
- Release notes: GitHub generated notes (pre-release tag)
- Rollout: desktop installs with Receive beta updates on are offered 1.5.9-beta.11; Docker nodes upgrade with `autobyteus-docker upgrade --all --tag beta`.
- Rollback: never move or delete the tag. Fix forward with the next beta, or turn Model Routing off (the default).

## Post-Finalization Cleanup

- Release worktree `…/delegated-runtime-model-routing-release` and the local `finalize/delegated-runtime-model-routing` branch: removed after this record is pushed.
- Ticket worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-runtime-model-routing` and the local `codex/delegated-runtime-model-routing` branch: **kept until the user's desktop check**, because the check guide can start the isolated app `--from-worktree` from its `electron-dist`. They are removed once the check is recorded.
- Remote branch: `origin/codex/delegated-runtime-model-routing` is kept as pushed ticket history.

## Final Status

- Verification complete: evidence `Yes`; **the user's desktop check (Task "Done when"): open**
- Repository finalization complete: `Yes` (merge `3c751828cb`, release commit `f56365c809` on `personal`)
- Applicable release complete: `Yes` (beta v1.5.9-beta.11, complete, all four workflows)
- Applicable safe cleanup complete: partly. The release worktree is removed; the ticket worktree is kept for the user's check.
- Unresolved blocker: the user's desktop-app check (or the user's explicit waiver)
- Successful terminal package eligible for return: `No`, until the user's check is recorded
