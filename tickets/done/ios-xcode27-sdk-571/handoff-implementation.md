# Handoff: ios-xcode27-sdk-571 → Implementation

- **Result:** `Architecture Design Complete`, `task_size = Small`, `architectural_risk = Low`. Rule: Small/Medium and Low → `/implementation_engineer` (direct route; implementation self-checks and executable validation still apply).
- **Task:** autobyteus-571 (Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`); SR-001.
- **Ticket folder:** `/Users/normy/autobyteus_org/autobyteus-worktrees/ios-xcode27-sdk-571/tickets/in-progress/ios-xcode27-sdk-571/`
- **Worktree / branch / base:** `/Users/normy/autobyteus_org/autobyteus-worktrees/ios-xcode27-sdk-571`, `codex/ios-xcode27-sdk-571`, `origin/personal` `fa6632cbca`. Finalization target: `origin/personal`.
- **Ticket documents:** uncommitted in the worktree. Commit them with your change.

## Original request

- The founder, on App Store Connect's ITMS-90725 email for Build 343 (v1.5.14-beta.3): "Fix this now".
- Apple's text: "This app was built with the iOS 26.2 SDK. Starting April 2027, iOS and iPadOS apps must be built with the iOS 27 SDK or later, included in Xcode 27 or later, in order to be uploaded to App Store Connect or submitted for distribution."
- The email screenshot is private (Task context file). It must not be committed.

## Approval basis

Requirements were approved by the Solution Designer within the direction; the founder was informed (requirements-doc.md, Document Status).

## What to build (design-spec.md D-1…D-4, Change / Refactor Sequence)

1. **Runner:** `runs-on: xcode-27` for `build-ios` and `upload-testflight` (`release-ios.yml:116`, `:373`).
2. **Default Xcode:** `IOS_XCODE_APP_PATH` default → `/Applications/Xcode_27.2.app` (`:40`). This is the only default.
3. **New script** `autobyteus-ios/scripts/select-release-xcode.sh` (executable). It owns the toolchain rule:
   - it requires `IOS_XCODE_APP_PATH`;
   - when the app is missing, it fails and lists the installed Xcode apps;
   - it exports `DEVELOPER_DIR` to `$GITHUB_ENV`;
   - it parses the full `xcodebuild -version` output (no pipe);
   - it fails when the Xcode major version is below 27, or the `xcrun --sdk iphoneos --show-sdk-version` major version is below 27, with `::error::` naming the found version and the path;
   - it logs "Selected Xcode app: …", the full version output and "Selected iPhoneOS SDK: …".
   - The minimum version 27 is one constant.
4. **Both jobs:** replace the inline "Select Xcode 26 or newer" steps (`:125-155`, `:391-421`) with a step "Select Xcode 27 or newer" that runs the script, before "Install XcodeGen". Remove the in-step fallbacks (`:129`, `:395`).
5. **Contract check** `ios-release-contract-check.py:191-220` (D-4). It checks:
   - both jobs run on `xcode-27`;
   - the default is Xcode_27.2;
   - the step calls the script, in order;
   - the script holds the floor 27 for the Xcode and the SDK and does not pipe `xcodebuild -version`;
   - no "Xcode_26" or "Xcode 26" text remains in the workflow.
6. **Docs:** `RELEASE.md:523` and `autobyteus-ios/README.md:134,139` move to the Xcode 27 rule, the default and the script.

## Proof required

- **AC-004:** the contract check passes, and fails with the floor or the default reverted.
- **AC-003:** run the script locally against the local Xcode 26.1.1 (`IOS_XCODE_APP_PATH=/Applications/Xcode.app GITHUB_ENV=$(mktemp) autobyteus-ios/scripts/select-release-xcode.sh`). It must exit 1 with the Xcode error.
- **AC-001 (DESIGN.md rule 12):**
  - push the branch;
  - run `gh workflow run release-ios.yml --ref codex/ios-xcode27-sdk-571 -f publish_app_store_connect=false`;
  - record the lines: image `xcode-27-arm64`, "Selected Xcode app: /Applications/Xcode_27.2.app", "Xcode 27.2", "Selected iPhoneOS SDK: 27.2"; build, core tests and UI smoke passed; upload jobs skipped.
- **Starting point:** probe P-01 (run 44725773809) already passed with the two-line change. See `evidence/probe/P-01-xcode27-build-only.txt`.

## Constraints

- **REQ-005:** no upload to App Store Connect or TestFlight, no tag, no release.
- No private IDs or screenshots from the email in the repository.
- Do not touch the app source or `project.yml` unless the build-only run fails. In that case return a `Design Impact` with the log.

## Documents

- `requirements-doc.md`
- `investigation-notes.md`
- `design-spec.md`
- `solution-revision-record.md`
- `follow-ups.md` (FU-001, not in scope)
- `evidence/probe/P-01-xcode27-build-only.txt`

## Route record

Sent to `/implementation_engineer` on 2026-11-20, by handoff rule Small/Low.
