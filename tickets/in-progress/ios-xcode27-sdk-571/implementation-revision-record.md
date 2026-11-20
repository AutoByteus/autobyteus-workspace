# Implementation Revision Record — ios-xcode27-sdk-571 (autobyteus-571)

The current code and `implementation-handoff.md` remain authoritative.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Solution Designer, `handoff-implementation.md` (direct route) | N/A | `Initial Baseline` | `SR-001` | Implemented; handed to API/E2E |

## Revision Entries

### IR-001 — Release builds with Xcode 27 and the iOS 27 SDK

- Triggering role, report path, and round: Solution Designer, `tickets/in-progress/ios-xcode27-sdk-571/handoff-implementation.md`, SR-001 (Small/Low, direct route).
- Triggering finding IDs: N/A
- Classification: `Initial Baseline`
- Prior authoritative result: N/A
- Current authoritative result: implemented at `e3950f9d07`; IMP-01…IMP-03 pass.
- Related solution revision IDs: `SR-001`
- Related architecture-review revision IDs: N/A
- Related code-review revision IDs: N/A
- Related API/E2E revision IDs: N/A
- Related delivery revision IDs: N/A
- Why this baseline is recorded: the first implementation handoff.
- Approved behavior or requirement IDs affected: BEH-001…003; REQ-001…005.
- Implementation delta: both macOS jobs on `xcode-27`; the default Xcode `/Applications/Xcode_27.2.app` once in the workflow env; the new `select-release-xcode.sh` owns the Xcode/SDK ≥ 27 rule and replaces two inline steps; the contract check's Xcode section rewritten (`check_release_toolchain`); RELEASE.md and the iOS README updated.
- Changed files or areas: `.github/workflows/release-ios.yml`, `autobyteus-ios/scripts/select-release-xcode.sh`, `autobyteus-ios/scripts/ios-release-contract-check.py`, `RELEASE.md`, `autobyteus-ios/README.md`.
- Local validation and result: IMP-01 (contract check, positive and four negative cases), IMP-02 (the script against the local Xcode 26.1.1 and with stand-ins), IMP-03 (the build-only run on GitHub).
- Next recipient or routing: API/E2E engineer (direct route).
- Remaining limitations or risks: R-001, the archive/upload job proven only at a founder-approved upload.
