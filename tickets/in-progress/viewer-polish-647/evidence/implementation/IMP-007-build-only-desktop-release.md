# IMP-007: the build-only Desktop Release run (DESIGN.md rule 12, RELEASE.md "Build-only release run")

- Command: `pnpm release:test --ref codex/viewer-polish-647`, then `gh run watch 45584353228 --exit-status`.
- Commit built: `da70e7f049` (the branch head after `bash scripts/check_secrets.sh` PASS and `git push origin HEAD:refs/heads/codex/viewer-polish-647`).
- Date: 2026-11-25 (run created 09:19:48Z, finished 09:44:55Z).
- Run: GitHub Actions `release-desktop.yml`, workflow_dispatch, run id 45584353228.
- Result: **Pass**. Nothing was published.

| Job | Result | Time |
|---|---|---|
| Resolve Release Metadata | success | 1 min |
| Build Linux ARM64 | success | 8 min |
| Build Linux x64 | success | 9 min |
| Build Windows x64 | success | 13 min |
| Build macOS Intel x64 | success | 23 min |
| Build macOS ARM64 | success | 24 min |
| Sign authenticated Linux desktop releases | skipped (build-only) | n/a |
| Publish GitHub Release | skipped (build-only) | n/a |

The only annotation is GitHub's Node.js 20 deprecation notice for `actions/checkout@v4`. This change didn't cause it.
