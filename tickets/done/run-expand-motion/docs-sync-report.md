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
| `RELEASE.md` | Updated (by delivery, with the user's agreement) | See below |
| Web docs for the left panel (`workspace_layout.md`) | No change | Expand and collapse content is unchanged; motion details are not documented |

## RELEASE.md Updated With The User's Agreement (2026-11-06)

- The user questioned delivery's full clean-clone rerun of every suite as over-building, and asked that `RELEASE.md` be updated where it was not clear. He agreed that delivery audits the evidence instead of redoing it, and that local builds are never signed.
- `RELEASE.md` "Finalization Target": before the merge, delivery audits the ticket's evidence and does not rerun the suites, clean clones or builds already run. It reruns only when the evidence has a gap (sent back to API/E2E), when new base commits came in (one relevant check), or when the ticket or the guide asks for it by name.
- `RELEASE.md` "Build-only release run":
  - local builds are never signed; signing and notarization happen only on the release runners;
  - the per-tag build-only run stays, because a local Mac proves only the macOS build, not Windows and Linux.

  This replaces delivery's earlier proposal to narrow that run.

## Delivery Continuation

- Result: `Pass`. Next: finalization, no release (AC-004).
