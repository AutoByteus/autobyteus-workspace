# Delivery / Release / Deployment Report — node-vocabulary (autobyteus-290)

- `RELEASE.md` at `034bfe51ab`. Deviations: none.
- Integration and checks: `handoff-summary.md`.
- Verification: `Sufficient` for AC-901/902/903/905 (`handoff-summary.md` § Verification). AC-904: User Check, open.
- Release decision: `No release` (the code reviewer's handoff; `RELEASE.md` default). Release-note text for the next release: `release-notes.md`.
- Rollback: the migrations rename stored keys. An older build reading converted files is not checked, so the next release's notes must keep "back up first; going back is not supported", as `v1.5.8` did.
- Ticket moved to `tickets/done/node-vocabulary`: Yes.

## Finalization Record (DR-001)

- Ticket branch `codex/node-vocabulary` at `5949c61e67`: hygiene passes; Secret Gate PASS; pushed.
- `finalize/node-vocabulary` from `origin/personal` `034bfe51ab`, `--no-ff`, gives `522bc2e825` with a tree identical to the ticket branch. Secret Gate PASS; `origin/personal` was unchanged. Pushed `034bfe51ab..522bc2e825`. Repository finalization: `Completed`.
- Release: `Not required`.
- Cleanup: the worktree (no process running from it; the untracked full web-suite log and build output go with it) and the local branches `codex/node-vocabulary` and `finalize/node-vocabulary` are removed after this record's push. The remote ticket branch is kept.
- Final status: AC-901/902/903/905 verified; AC-904 open (the user's check); finalized; no release; cleanup done. Terminal package sent to the Solution Designer.

## DR-002 Addendum — Beta v1.5.9-beta.5 (2026-10-24)

- Decision: the user's ("now finalize and release a new beta"). This ticket was already finalized (DR-001). The beta carries it (merge `522bc2e825`) on top of `v1.5.9-beta.4`.
- Method: `RELEASE.md`, from a fresh worktree of `origin/personal` `2033fa9bdd`.
- Checks before tagging: licensing consistent; hygiene exit 0; Secret Gate `v1.5.9-beta.4..HEAD` (38 commits) PASS.
- Release commit and tag: `desktop-release.sh beta --branch finalize/release-beta --no-push` made `0216c6fb14` (`autobyteus-web/package.json` = `1.5.9-beta.5`) and the annotated tag `v1.5.9-beta.5`. `origin/personal` was unchanged; pushed `2033fa9bdd..0216c6fb14`, then the tag.
- Pipelines, all `success`: Desktop `40110772773`, Android `40110772629`, iOS `40110773179`, Docker `40110772734`.
- Published: the GitHub pre-release with 17 assets. Docker `1.5.9-beta.5` and `:beta` are `sha256:3728d948d23b…` (amd64, arm64); `:latest` stays on `1.5.8`.
- Release notes: generated (pre-release). The curated text for the next stable is in `release-notes.md`.
- Cleanup: the release worktree and `finalize/release-beta` are removed after this record's push.
- AC-904 (the user's check) can now be run on this beta.
