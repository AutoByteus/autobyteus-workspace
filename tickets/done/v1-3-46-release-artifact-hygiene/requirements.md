# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Design-ready

## Goal / Problem Statement

Fix the v1.3.46 Desktop Release Windows checkout blocker caused by committing generated iOS validation/finalization artifacts into the repository. The immediate problem is that raw Xcode `.xcresult` bundles under `tickets/done/ios-wrapper-app/...` contain deeply nested, generated filenames that exceed the GitHub-hosted Windows runner checkout path limit. This prevents the Desktop Release workflow from reaching the actual Windows build and therefore prevents the GitHub Release / website release-information path from completing.

## Investigation Findings

- Desktop Release run `27067769356` failed in `Build Windows x64` during `Checkout workspace + submodules`, before any Windows desktop build command started.
- The failed log reports `Filename too long` for paths under committed `tickets/done/ios-wrapper-app/.../*.xcresult/Data/...` files.
- Current `origin/personal` contains 13 committed `.xcresult` bundle directories and 669 tracked `.xcresult` files under `tickets/done/ios-wrapper-app`.
- 110 tracked paths exceed 240 characters and 464 exceed 200 characters; the long paths are generated `.xcresult` internals, not application source.
- There is also a committed simulator app artifact zip under the same iOS finalization evidence tree. It is generated build output and should not live in git.
- The iOS App Store Connect upload failure is separate: App Store Connect has no accessible app record for bundle ID `org.autobyteus.mobile`. That is intentionally out of this urgent Windows remediation scope.

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Bug Fix + Cleanup
- Initial design issue signal (`Yes`/`No`/`Unclear`): Yes
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Missing Invariant + File Placement Or Responsibility Drift
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Likely Needed
- Evidence basis: Raw Xcode result bundles and generated simulator build output were archived into `tickets/done`, crossing the boundary between durable human-readable ticket records and transient/generated validation artifacts.
- Requirement or scope impact: Remediation must remove generated artifacts from the committed tree, keep useful summaries/logs, and add automated guardrails so future tickets cannot reintroduce checkout-hostile artifacts.

## Recommendations

Implement a narrow artifact-hygiene remediation:

1. Remove committed raw `.xcresult` directories from `tickets/done/ios-wrapper-app`.
2. Remove committed generated simulator build zip(s) from ticket evidence.
3. Preserve durable human-readable evidence such as summaries, key logs, validation reports, release reports, and explicit failure details.
4. Add `.gitignore` patterns preventing future `.xcresult` bundles and generated ticket artifact drops from being staged accidentally.
5. Add a repository hygiene guard script that fails if tracked paths include `.xcresult` internals, generated ticket artifact zips, or checkout-risk path lengths.
6. Wire the guard into the Desktop Release `prepare-release` job before platform build jobs fan out, so future release tags fail early on Linux instead of failing during Windows checkout.
7. Validate that Windows checkout succeeds and that Desktop Release reaches the actual Windows build step after the cleanup.

## Scope Classification (`Small`/`Medium`/`Large`)

Medium

## In-Scope Use Cases

- UC-WIN-001: A Desktop Release run for the corrected release commit can checkout the repository on GitHub-hosted Windows runners.
- UC-HYG-001: Developers and delivery engineers cannot accidentally commit raw `.xcresult` bundles or generated ticket build artifacts without a guard failure.
- UC-REC-001: The iOS ticket keeps durable human-readable evidence after raw generated bundles are removed.

## Out of Scope

- Fixing the iOS App Store Connect upload failure / missing app record for `org.autobyteus.mobile`.
- Changing iOS app source behavior or Android/web/backend/desktop application logic.
- Rewriting historical Git history. This remediation removes files from the current tree; it does not purge old objects from repository history.
- Changing the release versioning policy or website release-information implementation except as needed to unblock the Desktop Release workflow.

## Functional Requirements

- R-WINREL-001: The committed repository tree must not contain raw Xcode `.xcresult` bundles or files below `.xcresult` directories.
- R-WINREL-002: The committed repository tree must not contain generated simulator app/build archives inside ticket evidence, including the iOS simulator app zip captured from GitHub Actions artifacts.
- R-WINREL-003: Durable ticket evidence must remain sufficient after cleanup: retain summary text, validation reports, handoff/release reports, key logs, and the v1.3.46 failure-detail artifact.
- R-WINREL-004: `.gitignore` must explicitly ignore raw `.xcresult` bundles and local/generated ticket artifact directories that are not intended for git.
- R-WINREL-005: A repository hygiene guard must scan tracked files and fail when disallowed generated evidence is tracked.
- R-WINREL-006: The hygiene guard must fail on checkout-risk relative paths, using a conservative threshold that would have caught the current `.xcresult` paths before release.
- R-WINREL-007: Desktop Release must run the hygiene guard in `prepare-release` after checkout and before Windows/macOS/Linux build jobs start.
- R-WINREL-008: The remediation must verify Windows checkout succeeds for the corrected tree, either through a GitHub-hosted Windows run or equivalent release-pipeline evidence.
- R-WINREL-009: The iOS App Store Connect app-record failure must be documented as excluded from this remediation and must not block the Windows fix.

## Acceptance Criteria

- AC-WINREL-001: `git ls-files` returns no tracked path containing `.xcresult/` and no tracked path ending in `.xcresult`.
- AC-WINREL-002: `git ls-files` returns no tracked generated iOS simulator app zip under `tickets/done/ios-wrapper-app/**/github-run-*-artifacts/**`.
- AC-WINREL-003: A committed guard script exits nonzero before cleanup and exits zero after cleanup for the target repository state.
- AC-WINREL-004: `.github/workflows/release-desktop.yml` runs the guard in `prepare-release`, before platform build jobs.
- AC-WINREL-005: The longest tracked relative path after cleanup is below the guard threshold.
- AC-WINREL-006: A Windows checkout/build validation record shows the Desktop Release reaches the Windows build step, or if a new failure appears after checkout, it is recorded separately as a non-checkout failure.
- AC-WINREL-007: Existing human-readable iOS ticket artifacts remain available, including `requirements.md`, `investigation-notes.md`, `design-spec.md`, review reports, validation reports, delivery reports, release notes, key logs, and v1.3.46 failure details.
- AC-WINREL-008: No Android, web runtime, backend, desktop application source, or iOS app source logic changes are included unless strictly required by the guard wiring.

## Constraints / Dependencies

- Base branch: `origin/personal`.
- The urgent release blocker is Windows checkout; remediation should avoid expanding into iOS App Store Connect setup.
- GitHub-hosted Windows runner checkout is the externally observable failure point.
- Raw generated bundles may exist locally during validation, but must not be tracked.

## Assumptions

- The current long-path failure is fully caused by committed generated evidence artifacts, not by desktop source code.
- Removing raw `.xcresult` bundles is acceptable because summaries/logs/reports preserve the durable evidence needed for review and audit.
- A new release rerun or patch release will be handled by delivery after the cleanup is implemented and validated.

## Risks / Open Questions

- If a separate Windows build issue appears after checkout is fixed, it must be treated as a new non-checkout failure.
- Some validation screenshots inside `.xcresult` bundles will no longer be committed raw; if screenshots are necessary, they should be exported to short, intentional paths or stored as external CI artifacts.
- Existing git history still contains the removed files; if clone performance or repository size becomes a separate concern, history rewriting would need a separate explicit task.

## Requirement-To-Use-Case Coverage

| Requirement | Use Case(s) |
| --- | --- |
| R-WINREL-001 | UC-WIN-001, UC-HYG-001 |
| R-WINREL-002 | UC-WIN-001, UC-HYG-001 |
| R-WINREL-003 | UC-REC-001 |
| R-WINREL-004 | UC-HYG-001 |
| R-WINREL-005 | UC-HYG-001 |
| R-WINREL-006 | UC-WIN-001, UC-HYG-001 |
| R-WINREL-007 | UC-WIN-001, UC-HYG-001 |
| R-WINREL-008 | UC-WIN-001 |
| R-WINREL-009 | UC-WIN-001 |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance Criterion | Scenario Intent |
| --- | --- |
| AC-WINREL-001 | Confirms raw Xcode result bundles are removed from git. |
| AC-WINREL-002 | Confirms generated build zip artifacts are removed from ticket evidence. |
| AC-WINREL-003 | Confirms guard is executable and effective. |
| AC-WINREL-004 | Confirms release workflow catches recurrence before Windows checkout. |
| AC-WINREL-005 | Confirms the path-length hazard is gone. |
| AC-WINREL-006 | Confirms the user-visible Desktop Release blocker is resolved or reclassified beyond checkout. |
| AC-WINREL-007 | Confirms auditability is preserved after cleanup. |
| AC-WINREL-008 | Confirms remediation remains artifact/CI hygiene only. |

## Approval Status

Design-ready based on user direction to fix the Windows release blocker immediately and exclude the iOS App Store Connect issue for now.
