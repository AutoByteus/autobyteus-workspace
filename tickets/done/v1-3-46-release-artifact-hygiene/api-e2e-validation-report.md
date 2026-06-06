# API/E2E Validation Report — v1.3.46 Release Artifact Hygiene

## Decision

**Pass for the urgent v1.3.46 Windows Desktop Release checkout blocker remediation.**

The reviewed branch was committed and pushed, then the GitHub **Desktop Release** workflow was manually dispatched in build-only mode. The workflow completed successfully across prepare-release, Linux, Windows, macOS ARM64, and macOS Intel jobs. The Windows job specifically completed checkout, reached `Build Electron Windows x64`, completed that build successfully, and uploaded `windows-x64` artifacts.

This validates the checkout blocker remediation. No post-checkout Windows failure was observed.

## Scope and environment

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/v1-3-46-release-artifact-hygiene`
- Branch: `codex/v1-3-46-release-artifact-hygiene`
- GitHub repo: `AutoByteus/autobyteus-workspace`
- Implementation commit tested by GitHub Actions: `ec989ecfabaa9e2671a9a146e4aeaf68497a5da5`
- Workflow: `Desktop Release`
- Workflow run: `27070018231`
- Workflow URL: <https://github.com/AutoByteus/autobyteus-workspace/actions/runs/27070018231>
- Dispatch mode: `workflow_dispatch`, branch ref `codex/v1-3-46-release-artifact-hygiene`, `publish_release=false`, `prerelease=true`, no `release_tag`
- Evidence directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/v1-3-46-release-artifact-hygiene/tickets/v1-3-46-release-artifact-hygiene/api-e2e-evidence/round-1`

## Validation coverage matrix

| ID | Requirement / risk | Validation performed | Result | Evidence |
| --- | --- | --- | --- | --- |
| V-WINREL-001 | No tracked raw `.xcresult`, generated ticket zips, or >200-char paths remain in release checkout tree. | Ran `python3 scripts/check_repository_artifact_hygiene.py` locally on the staged/reviewed tree. | Pass — 11,287 tracked files scanned, no violations, longest path 197 chars. | `api-e2e-evidence/round-1/hygiene-pass.log` |
| V-WINREL-002 | Guard detects checkout-risk path classes. | Ran expected-failure sample with `--max-path-length 196`. | Pass — command failed as expected and reported the two 197-char paths. | `api-e2e-evidence/round-1/hygiene-expected-fail-max196.log` |
| V-WINREL-003 | Static/syntax readiness for guard and workflow. | Ran Python compile, `actionlint`, and Ruby YAML parse. | Pass. | `api-e2e-evidence/round-1/python-compile.log`, `actionlint.log`, `ruby-yaml.log` |
| V-WINREL-004 | Staged deletion set is limited to allowed raw `.xcresult` and generated ticket zip categories. | Audited cached deletions before commit. | Pass — 670 deleted tracked files grouped into 13 `.xcresult` dirs plus one generated ticket zip; 0 out-of-policy deletions. | `api-e2e-evidence/round-1/staged-deletion-audit.log` |
| V-WINREL-005 | GitHub `prepare-release` runs the hygiene guard before release fan-out. | Manual Desktop Release dispatch; inspected `Resolve Release Metadata` job. | Pass — `Check repository artifact hygiene` completed successfully; 11,296 tracked files scanned in GitHub checkout. | `api-e2e-evidence/round-1/github-prepare-release-job.log`, `github-log-excerpts.txt` |
| V-WINREL-006 | Windows job gets past checkout and reaches actual build step. | Manual Desktop Release dispatch; inspected `Build Windows x64` job. | Pass — checkout completed successfully at `2026-06-06T18:12:26Z`; `Build Electron Windows x64` started at `2026-06-06T18:13:30Z`. | `api-e2e-evidence/round-1/github-run-jobs-final.json`, `github-windows-build-step-watch.log` |
| V-WINREL-007 | No new post-checkout Windows failure observed. | Allowed Windows job to complete. | Pass — `Build Electron Windows x64` completed successfully at `2026-06-06T18:22:53Z`; `Upload Windows artifacts` completed successfully at `2026-06-06T18:23:04Z`. | `api-e2e-evidence/round-1/github-windows-job.log`, `github-run-final-summary.txt` |
| V-WINREL-008 | Desktop Release build-only workflow remains usable across platform fan-out. | Allowed entire workflow run to complete. | Pass — run conclusion `success`; Linux, Windows, macOS ARM64, and macOS Intel jobs all completed successfully; publish skipped by design. | `api-e2e-evidence/round-1/github-run-final-summary.txt`, `github-run-view.txt`, `github-artifacts-summary.txt` |

## GitHub Actions result

Run `27070018231` completed successfully.

Key final statuses:

- `Resolve Release Metadata`: completed / success
  - `Check repository artifact hygiene`: completed / success
- `Build Linux x64`: completed / success
- `Build Windows x64`: completed / success
  - `Checkout workspace + submodules`: completed / success, `2026-06-06T18:12:08Z` → `2026-06-06T18:12:26Z`
  - `Build Electron Windows x64`: completed / success, `2026-06-06T18:13:30Z` → `2026-06-06T18:22:53Z`
  - `Upload Windows artifacts`: completed / success, `2026-06-06T18:22:53Z` → `2026-06-06T18:23:04Z`
- `Build macOS ARM64`: completed / success
- `Build macOS Intel x64`: completed / success
- `Publish GitHub Release`: completed / skipped, expected because the validation dispatch used `publish_release=false` and no `release_tag`.

Artifacts listed by GitHub:

- `windows-x64` — 280,787,165 bytes
- `linux-x64` — 349,429,389 bytes
- `macos-arm64` — 805,583,625 bytes
- `macos-x64` — 855,321,207 bytes

## Out of scope / not claimed

- This validation did **not** publish a GitHub Release. The dispatch intentionally used `publish_release=false` to avoid production release side effects.
- The iOS App Store Connect missing app-record/upload failure remains out of scope for this ticket.
- This validation does not certify iOS App Store/TestFlight publishing.

## Non-blocking observations

- GitHub emitted Node.js 20 action deprecation annotations for several actions. These annotations did not fail the run and are not part of this checkout-blocker remediation, but they are worth tracking before GitHub's scheduled Node.js 24 enforcement window.
- The Windows build log also includes non-fatal dependency/tooling warnings, but the Windows job completed successfully and uploaded artifacts.

## Durable validation routing

API/E2E did **not** add or modify repository-resident durable validation logic after code review. The repository-resident guard and workflow wiring were already part of the reviewed implementation. API/E2E added only validation evidence and this report, so no additional code-review round is required under the durable-validation routing rule.
