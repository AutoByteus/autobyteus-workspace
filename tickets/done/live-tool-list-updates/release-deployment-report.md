# Delivery / Release / Deployment Report

## Release / Publication / Deployment Scope

Live tool list updates (server, autobyteus-ts, web), with durable e2e and browser-probe coverage and docs. Finalization target `origin/personal`. Beta `v1.5.11-beta.2` at the user's request.

## Project Release Guide

- Release guide path and revision: `RELEASE.md` as on `origin/personal` @ `e82d03b0f9` (last changed by `f9d1db2aa0`, the release smoke cost; the release smoke check from `6bd00b2f36`), read from `origin/personal` @ `e82d03b0f9` in the ticket worktree after integration
- Deviations from the guide and why:
  - The release smoke check runs with **Grok waived** by the user for this release (see Verification). The guide allows this: "the user explicitly waiving a named runtime at the release decision. Record the waiver and its reason."
  - Otherwise `None`.
- Proposed guide fixes: `None`
- Incident during preparation: running `python3 scripts/release_smoke.py --help` to read its options started a real smoke run, because the script takes no arguments. It ran in the ticket worktree at about 20:15Z, alongside the clean-clone checks.
  - It was stopped (SIGTERM) within about two minutes, during its first, scripted AutoByteus step.
  - No Claude, Codex or Grok turn was started, so no provider quota was used.
  - Its temp folder (`…/T/release-smoke-gh9abxdm`) holds only that partial step's logs.
  - The deliberate smoke run on the merged state is recorded below.

## Handoff Summary

- Handoff summary artifact: `tickets/done/live-tool-list-updates/handoff-summary.md`
- Handoff summary status: `Updated`
- Delivery revision record: `delivery-revision-record.md`; current delivery revision ID: `DR-001`

## Initial Delivery Integration Refresh

- Bootstrap base reference: `origin/personal` @ `9f7c9c10a6`
- Latest tracked remote base reference checked: `origin/personal` @ `e82d03b0f9`
- Base advanced since bootstrap: `Yes`. The base added:
  - autobyteus-149, the release smoke check;
  - autobyteus-326, v1.5.11-beta.1.
- New base commits integrated: `Yes` (merge `6fae6761d3`)
- Local checkpoint commit: `Not needed` (the validated state was committed at `645bfe5c11`)
- Integration method: `Merge`
- Integration result: `Completed`. There were no conflicts. `autobyteus-web/package.json` was changed on both sides, in different lines, and both changes are kept.
- Post-integration executable checks rerun: `Yes`, the full set from a clean clone of `6fae6761d3` (DEL-01…09, listed in the handoff summary)
- Post-integration verification result: `Passed`. The one timed-out test passes alone (FU-005). The web suite was rerun after a setup-order problem in the fresh clone.
- Delivery edits started only after integrated state was current: `Yes`

## Verification

- Evidence judged: `Sufficient`, with the Grok real run waived by the user.
- Evidence relied on:
  - the execution report (API-REV-002) and the test review (CRR-006);
  - `evidence/real-runs/README.md` and `evidence/api-e2e/API-03-codex-live-run.log`, opened directly;
  - the clean-clone checks DEL-01…09.

| Acceptance-Criteria ID | Cases And Files Checked | What You Saw | Judgement |
| --- | --- | --- | --- |
| AC-001 | real runs (native, Claude, AGY); API-06; DEL-09 | The new tool works at once with the notice; the "Tools updated" card in the app; TLU-001 1 Pass | Proven |
| AC-002 | API-03 (Codex); API-05/DEL-08 (Grok reopen with a test agent through the real server) | Codex: the notice, the new tool works, "DONE-2 OKAPI-8545" quotes turn 1. Grok: no real model run (API-04 owed) | Proven for Codex; **Grok real run waived by the user** |
| AC-003, AC-004 | real runs; API-06; API-02/03 | The removed tool is refused ("Tool is not enabled for this session"; Claude: "No such tool available") and not offered again | Proven |
| AC-005 | API-01; API-06 | No card and no notice without a change | Proven |
| AC-006 | API-06; DEL-09 | A stopped run, edited and then restored, shows the card and the tool works | Proven |
| AC-007 | API-05; DEL-08; Team-member integration | The failed reopen's message is unsent and shown failed; the next message retries; run B is untouched | Proven |
| AC-008 | API-05; API-01 | Only the changed definition's runs change | Proven |

- User decision on the gate: the code reviewer's gate (do not finalize before API-04, the real Grok run) was lifted by the user, 2026-10-29: "for grok, i can accept that". Reason: the Grok account is at its free usage limit (the user confirmed this to the implementation engineer). API/E2E's real Grok run stays owed and can be made when the credit returns.
- User check needed: `No`

## Release Decision

- Decision: `Beta`
- Decided by: the user, 2026-10-29: "if everythign good, release a new beta please"; Grok waived in the same conversation
- Version: `v1.5.11-beta.2` (`python3 scripts/release_versions.py next-beta`; Android version code `10051102`)

## Docs Sync Result

- Docs sync artifact: `docs-sync-report.md`
- Docs sync result: `Updated`
- The change's docs were verified, and delivery added a paragraph to `autobyteus-web/docs/agent_management.md`.

## Ticket State Transition

- Ticket moved to `tickets/done/live-tool-list-updates/`: `Yes`

## Release Notes

- A beta pre-release uses GitHub generated notes (RELEASE.md); no ticket `release-notes.md` is needed.

## Environment Or Persisted-Data Transition Notes

- Persisted data: `Not Affected` (no migration); delivery action `None`

## Rollback Criteria

- Revert the merge on `personal` and cut a new release; desktop updates never downgrade.
- No data change.

## Finalization And Release Record

Recorded below after the merge, the checks before tagging, the tag and the rollout.

### Repository Finalization (completed)

- Ticket branch `codex/live-tool-list-updates`: archive commit `6688c93e90`, pushed after the Secret Gate passed.
- `git merge --no-ff` into `personal` → `be9e78dc93`.
- On the merged state: Secret Gate PASS, `check_repository_artifact_hygiene.py` exit 0, `check_licensing.py` consistent.
- Pushed `e82d03b0f9..be9e78dc93 HEAD -> personal`.

### Checks Before Tagging

- Secret Gate over the release range: `scripts/check_secrets.sh v1.5.11-beta.1..HEAD`, 30 commits, PASS.
- Release smoke check on `be9e78dc93`, after `pnpm install` and server `prebuild` (summary in `evidence/DEL-10-release-smoke-merged-state.txt`):
  - Claude 3/3 PASS; Codex 3/3 PASS; Antigravity 2/2 PASS; AutoByteus 2/2 PASS.
  - Grok 3/3 FAIL: `429 Too Many Requests: subscription:free-usage-exhausted … grok-4.7`. That is the quota refusal the user waived for this release.
  - Exit 1 because of Grok only.
- **Build-only release run `40950729360` on `personal` @ `be9e78dc93`: FAILED.**
  - "Build Linux x64" and "Build Linux ARM64" failed in their "Build Electron" step. The build chain's first gates are `guard:web-boundary` (Passed) and then `guard:localization-boundary`, which reported:

    ```
    [guard:localization-boundary] Failed.
    components/conversation/segments/__tests__/SystemTaskNotificationSegment.spec.ts:4: direct localization/messages import is forbidden outside localization/runtime and localization/messages.
    components/conversation/segments/__tests__/SystemTaskNotificationSegment.spec.ts:5: direct localization/messages import is forbidden outside localization/runtime and localization/messages.
    ```

  - The two imports (`~/localization/messages/en/workspace`, `~/localization/messages/zh-CN/workspace`) came with this ticket (`a9cc802d99`, `c4da95428e`); the file at base `9f7c9c10a6` does not have them.
  - Every desktop target runs the same chain, so every desktop build fails the same way.
- **Delivery's own miss:** the clean-clone guard step (DEL-07) ran the three guards as one group, so only the last guard's exit code counted, and its summary filter kept only "Passed" lines. The localization-boundary failure was therefore not seen before the merge. `evidence/DEL-07-web-guards-clean-clone.log` shows only two "Passed" lines, not three. That log is wrong to read as a pass.

### Release Status: Blocked

- **No tag was created and nothing was published; no version number is used.** `v1.5.11-beta.2` is still free.
- `personal` @ `be9e78dc93` fails the desktop build's first gate. The merge is not undone; the fix goes forward on `personal`.
- Classification: `Local Fix`, test source introduced by this ticket. Recipient: the implementation engineer (handoff rule "a code or packaging Local Fix that must be corrected by implementation before finalization can continue").
- The fix needed: read the messages through the localization runtime in `SystemTaskNotificationSegment.spec.ts`, as other specs do, so `guard:localization-boundary` passes.
- After the fix: delivery reruns all three web guards, each with its own exit code, then the build-only release run and the release smoke check (Grok waived). Then the tag.
- The ticket worktree is kept for the fix; cleanup is deferred.

### DR-002: Local Fix received, guards rerun, release resumed

- Chain:
  - IR-005, the spec-only fix `137ce572aa` (`SystemTaskNotificationSegment.spec.ts` reads the locales through `getCatalog`);
  - source review CRR-007 Pass (the guard passes, and fails on the old spec);
  - API/E2E API-REV-003 Pass (`b404e0b519`, API-05 reran green);
  - test review CRR-008 Not Applicable.
  `git diff origin/personal HEAD` outside `tickets/` touches only that spec.
- Delivery checks on `045a7a76b0`, each with its own exit code (`evidence/DEL-11…13`):
  - `guard:web-boundary` exit 0 Passed;
  - `guard:localization-boundary` exit 0 Passed;
  - `audit:localization-literals` exit 0 Passed;
  - the notice spec 8/8;
  - web typecheck: production 0, test files at the 298/139 baseline, PASS.
- Grok: API-04, the real Grok CLI run, is still owed; the code reviewer passed this decision on again. It was already decided by the user on 2026-10-29: "for grok, i can accept that". Delivery does not ask again. The waiver covers API-04 and the Grok row of the release smoke check for this release.
