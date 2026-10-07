# Delivery / Release / Deployment Report — chat-new-draft-kept-on-navigation

The archived ticket folder is `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/chat-new-draft-kept-on-navigation/` (`<T>` below).

## Release / Publication / Deployment Scope

This is a frontend-only change in `autobyteus-web` (chat draft store, left panel, launch hand-off). It has no API, persistence, server or migration impact.
- Repository finalization went into `origin/personal`.
- The user asked for one new beta, which was released as `v1.4.96-beta.2`.

## Handoff Summary

- Handoff summary artifact: `<T>/handoff-summary.md`
- Handoff summary status: `Updated` (final)
- Delivery revision record: `<T>/delivery-revision-record.md`
- Current delivery revision ID: `DR-002`
- Notes: classification `Medium`/`Low`, direct route, preserved.

## Initial Delivery Integration Refresh

- Bootstrap base reference: `origin/personal@cfeda548b`
- Latest tracked remote base reference checked: `origin/personal@7d130309e` (fetched 2026-10-07)
- Base advanced since bootstrap or previous refresh: `Yes`, by 6 commits (reactivate-done-task-runs plus release `1.4.96-beta.1`)
- New base commits integrated into the ticket branch: `Yes`
- Local checkpoint commit result: `Completed`, `8ba19cc85`. It holds the live probe, the `package.json` script, and the code-review/API-E2E artifacts and evidence. Paths were staged explicitly, and the SDK `dist/` folders were excluded.
- Integration method: `Merge` (`git merge --no-edit origin/personal` → `ec4c73929`)
- Integration result: `Completed`, with no conflicts.
  - The base touched server/collaboration/task code and docs, plus `autobyteus-web` collaboration utilities and docs.
  - None of the ticket's changed files overlap.
  - `autobyteus-web/package.json` merged cleanly: the base changed the version line and the ticket added a script line.
- Post-integration executable checks rerun: `Yes`
  - `pnpm -C autobyteus-web test:nuxt --run stores/__tests__/chatDraftStore.spec.ts services/chat/__tests__/chatLaunchService.spec.ts composables/runSettings/__tests__/useRunStart.spec.ts components/__tests__/AppLeftPanel components/chat pages/__tests__/chat.spec.ts tests/integration/workspace-history-draft-send.integration.test.ts localization/messages/__tests__/shellCatalog.spec.ts` → 17 files / 126 tests passed
  - `pnpm -C autobyteus-web test:nuxt --run localization` → 15 files / 38 tests passed
  - `node --check` on the live probe passed, and `package.json` parses.
- Post-integration verification result: `Passed`
- No-rerun rationale: N/A
- Delivery edits started only after integrated state was current: `Yes`
- Handoff state current with latest tracked remote base: `Yes`
- Blocker: None

## User Verification

- Initial explicit user completion/verification received: `Yes`
- Initial verification / acceptance reference: `<T>/user-verification-record.md`. The user wrote: "finalize and release a new beta."
- Renewed verification required after later re-integration: `No`. The target was still at `7d130309e` after acceptance.
- Renewed verification received: `Not needed`
- Renewed verification / acceptance reference: —

## Docs Sync Result

- Docs sync artifact: `<T>/docs-sync-report.md`
- Docs sync result: `Updated`
- Docs updated: `autobyteus-web/docs/chat.md`, `autobyteus-web/docs/workspace_layout.md`, `TESTING.md`
- No-impact rationale: N/A

## Ticket State Transition

- Ticket moved to `tickets/done/chat-new-draft-kept-on-navigation`: `Yes` (`git mv` in `0c3b8a073`)
- Archived ticket path: `<T>`

## Version / Tag / Release Commit

- One `bash scripts/desktop-release.sh beta` run from the clean, finalized `personal` clone (exit 0). There was no stable release and no manual dispatch.
- Version `1.4.96-beta.2` (`autobyteus-web/package.json`). This is the next beta after `1.4.96-beta.1`, as `release_versions.py next-beta` predicted.
- Release commit `154bedc84` ("chore(release): bump workspace release version to 1.4.96-beta.2"), pushed `55d6db0c1..154bedc84`.
- Annotated tag `v1.4.96-beta.2`, which resolves to `154bedc84`. Tag push: `Completed`.
- Commit identity: the host default `normy <normy@macbookpro.speedport.ip>`, the same as earlier beta release commits.
- Receipt: `<T>/delivery-evidence/dr-002/beta-release.log`

## Repository Finalization

- Bootstrap context source: `investigation-notes.md` (finalization target `origin/personal`)
- Ticket branch: `codex/chat-composer-draft-persistence`
- Ticket branch commit result: `Completed`. The archive and docs-sync commit is `0c3b8a073`. History: `eef9633f5` → `9e902002d` → `8ba19cc85` → `ec4c73929` (base merge) → `0c3b8a073`.
- Ticket branch push result: `Completed` (new remote branch)
- Finalization target remote: `origin` (`git@github.com-ryan:AutoByteus/autobyteus-workspace.git`)
- Finalization target branch: `personal`
- Target advanced after verification / acceptance: `No`. It was still at `7d130309e` when rechecked immediately before the push.
- Delivery-owned edits protected before re-integration: `Not needed`
- Re-integration before final merge result: `Not needed`
- Target branch update result: `Completed`. The merge was done in a clean, isolated clone of `personal` at `7d130309e`, because the shared main checkout has unrelated uncommitted work and owns the `personal` worktree.
- Merge into target result: `Completed`. The `--no-ff` merge is `55d6db0c1` ("Merge verified chat-new-draft-kept-on-navigation"). Its tree `831331f23` is identical to the verified ticket head.
- Push target branch result: `Completed` (`7d130309e..55d6db0c1`)
- Repository finalization status: `Completed`
- Receipt: `<T>/delivery-evidence/dr-002/final-merge.log`

## Release / Publication / Deployment

- Applicable: `Yes`. The user requested one new beta.
- Method: `Release Script`, `bash scripts/desktop-release.sh beta`
- Release/publication/deployment result: `Completed`
- Release notes handoff result: `Not required` for publication. The beta helper takes no curated notes, and the GitHub prerelease uses generated notes. The archived `<T>/release-notes.md` stays as the product summary for the next stable release.

## Hosted Publication / Rollout Verification

| Workflow | Run | Result |
| --- | --- | --- |
| Desktop Release | 37599363559 | Success (09:15:33Z → 09:36:37Z) |
| Android APK Release | 37599363787 | Success (→ 09:19:58Z) |
| iOS App Store Connect Release | 37599363706 | Success (→ 09:29:07Z) |
| Server Docker Release | 37599363615 | Success (→ 10:00:16Z, about 45 min, the same as the last beta) |

- GitHub release: https://github.com/AutoByteus/autobyteus-workspace/releases/tag/v1.4.96-beta.2. It is not a draft, is marked prerelease, was published 2026-10-07T09:19:49Z, and has 17 assets, none empty (`github-release.json`).
- Updater metadata: `latest.yml`, `latest-mac.yml`, `latest-linux.yml` and `latest-linux-arm64.yml` all report `version: 1.4.96-beta.2` (`updater-metadata/`).
- Docker: `autobyteus/autobyteus-server:1.4.96-beta.2` and `:beta` share the index digest `sha256:bdaf9e1bc8c43c14697332ec0054d294a3ae06cb9a92e4bd0768f0df56c70931`, which covers linux/amd64 and linux/arm64 (`docker-version-manifest.txt`, `docker-beta-manifest.txt`).
- `workflows-final.json` records all four runs.
- Rollout: the beta is offered only to desktop installs with "Receive beta updates" on. No user-run confirmation has been received yet.

## Post-Finalization Cleanup

- Dedicated ticket worktree path: `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-composer-draft-persistence`
- Worktree cleanup result: `Completed`. It was removed after verifying that its head `0c3b8a073` is in `origin/personal`. Only the untracked SDK `dist/` build output was discarded.
- Worktree prune result: `Completed`
- Local ticket branch cleanup result: `Completed` (it was at `0c3b8a073`)
- Remote branch cleanup result: `Completed` (`origin/codex/chat-composer-draft-persistence` deleted)
- Shared main checkout: fast-forwarded with `--ff-only` after the receipt commit. Its unrelated uncommitted work overlaps no incoming path.
- The isolated finalization clone `/Users/normy/autobyteus_org/autobyteus-worktrees/finalize-chat-new-draft-kept-on-navigation` is removed after the receipt commit is pushed.

## Release Notes Summary

- Release notes artifact created before verification / acceptance: `<T>/release-notes.md`
- Archived release notes artifact used for release/publication: `<T>/release-notes.md` (product summary; not consumed by the beta helper)
- Release notes status: `Updated`

## Deployment Steps

No server deployment beyond the release workflows above. The change is in the renderer only.

## Environment Or Persisted-Data Transition Notes

- Approved persisted-data decision: `Not Affected`. Drafts are session-only Pinia state (REQ-011, DEC-002 = A).
- Delivery action required: `None`
- Result and evidence: D13 shows that a reload leaves no drafts and nothing in storage.

## Verification Checks

- API/E2E live-run-4: 15/15 pass. The focused suites at `9e902002d` pass, 32 files / 165 tests. The full web suite has only the baseline failures.
- Post-integration: as above.
- Publication: as above.

## Rollback Criteria

Revert merge `55d6db0c1` on `personal` and cut a later beta if any of these happen:
- a kept draft leaks into another chat;
- a send loses text;
- the Chat row or left panel regresses.

No data rollback is needed, because nothing is persisted.

## Final Status

- Explicit user testing/verification complete: `Yes`
- Repository finalization complete: `Yes`
- Applicable release/deployment/rollout complete or not required: `Yes`
- Applicable safe cleanup complete or not required: `Yes`
- Unresolved blocker: `None`
- Successful terminal package eligible for return: `Yes`
- Terminal package sent to `/solution_designer`: recorded in `delivery-revision-record.md` DR-002 after the send
- Terminal message/reference: see DR-002
