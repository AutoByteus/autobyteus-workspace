# Docs Sync Report

## Scope

- Ticket: `run-expand-motion` (autobyteus-390), SR-002 / IR-002 / API-REV-002; direct route, `task_size=Small`, `architectural_risk=Low`
- Base: `origin/personal` @ `4500e7278d`; the branch already contains it

## Why Docs Were Updated

- The ticket changed `TESTING.md` with a new "Fresh-start build" section (`8602505f4e`): when a change touches a build input, prove it from a fresh clone with `pnpm install --frozen-lockfile` alone, then the release job's build command. Its macOS ARM64 command is unsigned (`CSC_IDENTITY_AUTO_DISCOVERY=false`), and signing and notarization are recorded as not tested.
- Delivery checked it against `.github/workflows/release-desktop.yml`: the same install, the same `NO_TIMESTAMP`, `AUTOBYTEUS_BUILD_FLAVOR` and `PRISMA_CLI_BINARY_TARGETS` values, the same `build:electron:mac -- --arm64` command, and the same two verify steps (named in the workflow with an ARM64 suffix). It is accurate.
- The motion change itself (the Runs view's `RunListPanel` and `RunListRow`) changes no documented behavior: rows look the same, and only the slide-in is gone.

## Long-Lived Docs Reviewed

| Doc Path | Result | Notes |
| --- | --- | --- |
| `TESTING.md` "Fresh-start build" | Updated (by the ticket; verified) | Matches the release workflow; unsigned local build |
| `DESIGN.md` | No change | Rule 12 ("a release build starts from `pnpm install` alone") already covers it |
| `RELEASE.md` | No change; **proposal recorded** | See below |
| Web docs for the left panel (`workspace_layout.md`) | No change | Expand and collapse content is unchanged; motion details are not documented |

## Proposal For The User (not changed)

- `RELEASE.md` requires a build-only release run on GitHub before every tag. With `TESTING.md`'s Fresh-start build, a change to a build input is now proven locally from a fresh clone before merge, which is the earlier stage that can reproduce those failures. Under the team's rule (a release-stage check only for what no local machine can reproduce), the per-tag build-only run could be limited to what a local machine cannot do: Windows and Linux packaging, and the runner's signing. It is the project's rule, so it stays until the user decides.

## Delivery Continuation

- Result: `Pass`. Next: finalization, no release (AC-004).
