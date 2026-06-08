# Investigation Notes

## Investigation Status

- Bootstrap Status: Complete
- Current Status: Investigation complete; no implementation started.
- Investigation Goal: Identify why linked GitHub Actions iOS build/publish job failed, and determine whether the failure relates to local ignored iOS signing/certificate artifacts.
- Scope Classification (`Small`/`Medium`/`Large`): Small
- Scope Classification Rationale: Investigation focuses on one GitHub Actions job plus iOS signing workflow/script, repository secrets/variables by name, ignored-file inventory, and local signing-readiness metadata.
- Scope Summary: Inspected job logs, workflow definitions, iOS scripts/config, repository secret/variable names, and local ignored certificate/profile artifact paths without exposing secret contents.
- Primary Questions Resolved:
  - What exact step and command failed in job `79901963167` from run `27071479568`? `Upload IPA to App Store Connect/TestFlight`; `xcrun altool --upload-app` returned App Store Connect error `No suitable application records were found... (-19000)` for bundle ID `org.autobyteus.mobile`.
  - Which signing/certificate files or environment secrets does the iOS pipeline expect? `.github/workflows/release-ios.yml` expects GitHub repository secrets `IOS_DISTRIBUTION_CERTIFICATE_P12_BASE64`, `IOS_DISTRIBUTION_CERTIFICATE_P12_PASSWORD`, `IOS_APPSTORE_PROVISIONING_PROFILE_BASE64`, `IOS_SHARE_EXTENSION_APPSTORE_PROVISIONING_PROFILE_BASE64`, `IOS_DEVELOPMENT_TEAM`, `APP_STORE_CONNECT_KEY_ID`, `APP_STORE_CONNECT_ISSUER_ID`, and `APP_STORE_CONNECT_API_KEY_P8_BASE64`.
  - Do matching signing/certificate artifacts exist locally only as ignored files? No matching ignored signing/certificate/profile artifacts were found in the main checkout. `.gitignore` reserves such patterns/paths, but the files are not currently present there.

## Request Context
User reported that the iOS build pipeline failed at https://github.com/AutoByteus/autobyteus-workspace/actions/runs/27071479568/job/79901963167 and suspects iOS certificate-related material may be stored in ignored files in the main repo, but is unsure.

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): Git
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/investigate-ios-build-pipeline-failure`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/investigate-ios-build-pipeline-failure/tickets/investigate-ios-build-pipeline-failure`
- Current Branch: `codex/investigate-ios-build-pipeline-failure`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/investigate-ios-build-pipeline-failure`
- Bootstrap Base Branch: `origin/personal`
- Remote Refresh Result: `git fetch origin personal --prune` succeeded on 2026-06-08.
- Task Branch: `codex/investigate-ios-build-pipeline-failure`, created from `origin/personal` at `dfc26eec54cdf685442740691ce5469754ab945f`.
- Expected Base Branch (if known): `origin/personal`
- Expected Finalization Target (if known): `personal`
- Bootstrap Blockers: None.
- Notes For Downstream Agents: This is an investigation-only bootstrap so far. Do not print certificate/private-key/provisioning-profile contents.

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-06-08 | Command | `pwd; git rev-parse --show-toplevel; git branch --show-current; git status --short --branch; git remote -v` | Bootstrap repository context | Main checkout is `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo`, branch `personal`, remote `AutoByteus/autobyteus-workspace.git`. | No |
| 2026-06-08 | Command | `git remote show origin` | Resolve base branch | Remote HEAD branch is `personal`. | No |
| 2026-06-08 | Command | `git fetch origin personal --prune` | Refresh tracked remote before task branch/worktree | Fetch succeeded. | No |
| 2026-06-08 | Setup | `git branch codex/investigate-ios-build-pipeline-failure origin/personal` and `git worktree add /Users/normy/autobyteus_org/autobyteus-worktrees/investigate-ios-build-pipeline-failure codex/investigate-ios-build-pipeline-failure` | Create dedicated task workspace | Worktree created on dedicated branch. | No |
| 2026-06-08 | Command | `gh auth status` | Verify GitHub Actions log access prerequisites | Authenticated as `ryan-zheng-teki`; token has `repo` and `workflow` scopes. | No |
| 2026-06-08 | Log | `gh run view 27071479568 --repo AutoByteus/autobyteus-workspace --json ...` | Inspect linked workflow/run/job topology | Run `27071479568` failed; jobs: metadata success, build/test success, publish secret gate success, archive/upload failure in job `79901963167`. | No |
| 2026-06-08 | Log | `gh api /repos/AutoByteus/autobyteus-workspace/actions/jobs/79901963167/logs > logs/job-79901963167.log` | Inspect failing job log | Archive and export succeeded. Upload failed at `xcrun altool --upload-app` with App Store Connect error for bundle ID `org.autobyteus.mobile`: no suitable application records / no Apple ID access; exit code 1. | No |
| 2026-06-08 | Code | `.github/workflows/release-ios.yml` | Map workflow signing and upload inputs | Workflow reads iOS distribution certificate/profile and App Store Connect API key from GitHub secrets; imports cert to temporary keychain; verifies profiles; archives/exports; uploads via `xcrun altool`. | No |
| 2026-06-08 | Doc | `autobyteus-ios/README.md` | Confirm intended operator contract | README lists required iOS publish repository secrets and optional vars; warns desktop `APPLE_*` secrets are not valid for iOS App Store signing. | No |
| 2026-06-08 | Code | `autobyteus-ios/project.yml` | Confirm bundle-ID authority | Main app bundle ID uses `$(IOS_BUNDLE_ID)`; share extension uses `$(IOS_SHARE_EXTENSION_BUNDLE_ID)`. | No |
| 2026-06-08 | Code | `autobyteus-ios/scripts/verify-appstore-profile.py` | Understand profile validation strength | Verifies profile platform, team, exact `team.bundle_id` app identifier, `get-task-allow=false`, no provisioned devices, not all-devices, not expired; installs verified profile by UUID. | No |
| 2026-06-08 | Command | `gh secret list --repo AutoByteus/autobyteus-workspace` filtered to iOS/App Store names | Check whether required secret names exist | Required iOS/App Store Connect secret names are present by name; values are not readable and were not printed. | No |
| 2026-06-08 | Command | `gh variable list --repo AutoByteus/autobyteus-workspace` filtered to iOS vars | Check bundle ID and related vars | Repo vars include `IOS_BUNDLE_ID=org.autobyteus.mobile`, `IOS_SHARE_EXTENSION_BUNDLE_ID=org.autobyteus.mobile.share`, `IOS_APP_SCHEME=AutoByteusMobile`, `IOS_ARTIFACT_PREFIX=AutoByteus_personal_ios`. | No |
| 2026-06-08 | Command | `.gitignore`, `git ls-files --others --ignored --exclude-standard -- '*.p12' '*.p8' '*.mobileprovision' ...`, `find .local`, `git status --short --ignored -uall -- .local autobyteus-ios` in main checkout | Determine if cert files exist in ignored local repo area | `.gitignore` reserves `.local/ios-signing/` and signing file patterns, but no matching ignored iOS signing/certificate/profile files were found in the main checkout. | No |
| 2026-06-08 | Probe | `autobyteus-ios/scripts/ios-signing-readiness.sh tickets/investigate-ios-build-pipeline-failure/local-signing-readiness` | Check local Xcode/user signing metadata without secrets | Local machine has development profile/identity metadata, but no iOS distribution signing identity and no exact App Store/TestFlight profiles for the app/share bundle IDs. This is local-only and separate from CI secrets. | No |
| 2026-06-08 | Log | `gh run list --repo AutoByteus/autobyteus-workspace --workflow release-ios.yml --limit 20` and prior job logs for `v1.3.46`, `v1.3.47` | Check recurrence | Recent tag publish runs `v1.3.46`, `v1.3.47`, and `v1.3.48` all failed in archive/upload at the same App Store Connect application-record/access stage; earlier branch push run was build-only and skipped publish. | No |
| 2026-06-08 | Repo | `tickets/done/ios-wrapper-app/handoff-summary.md` and `tickets/done/ios-wrapper-app/validation-logs/release-v1.3.46-github-runs/ios-run-27067769383-key-lines.txt` | Check prior delivery findings | Prior archived ticket already recorded the `v1.3.46` failure as App Store Connect lacking an accessible app record for bundle ID `org.autobyteus.mobile`. | No |
| 2026-06-08 | Command | Safe Python scan for iOS/App Store secret variable names in small text/config files under main checkout, printing names only and no values | Check whether ignored env/config files in the main checkout appear to store iOS publish secrets | Only documentation, workflow files, logs/evidence, and scripts mention the variable names; no ignored `.env`/`.local` value file containing the iOS secret variable names was found. | No |
| 2026-06-08 | Trace | `gh run rerun 27071479568 --failed` and job log `logs/job-80027498663-rerun-attempt2.log` | Verify after user created App Store Connect app record | Original app-record/access failure is gone. Rerun reached App Store validation and failed with new error: app was built with iOS 18.5 SDK/Xcode 16.4; Apple now requires iOS 26 SDK/Xcode 26 or later for upload. | Pipeline should select Xcode 26+ before archive/export/upload. |

### Scope Update: small Xcode 26 CI fix
- User requested bootstrapping a simple ticket after the App Store Connect app record was created and the rerun exposed the Xcode/iOS SDK validation issue.
- Scope is intentionally limited: select Xcode 26+ in `.github/workflows/release-ios.yml`, keep signing/certificate/profile handling unchanged, and verify with existing release contract checks plus rerun evidence.
- Review expectation: limited design/architecture review because this is a local workflow configuration defect, not a release architecture redesign.
- User approved requirements basis on 2026-06-08.

## Current Behavior / Current Flow

- Current entrypoint or first observable boundary: Tag push/manual publish path in `.github/workflows/release-ios.yml`.
- Current execution flow:
  1. `prepare-release` resolves release metadata and release ref.
  2. `build-ios` checks out the ref, generates the iOS project, builds/tests on simulator, writes publish-secret readiness summary.
  3. `publish-secret-gate` checks that required iOS/App Store Connect secret names are present.
  4. `upload-testflight` imports distribution certificate, verifies app/share App Store provisioning profiles, generates project/export options, archives and exports a signed IPA, then uploads via `xcrun altool --upload-app`.
- Ownership or boundary observations: Repository workflow owns CI orchestration; GitHub repository secrets/vars own CI inputs; App Store Connect owns final app-record and API-key access. Local ignored repo files are not used by the GitHub runner.
- Current behavior summary: Build/sign/export path succeeds; external App Store Connect upload rejects the IPA because there is no suitable app record accessible for `org.autobyteus.mobile`.

## Design Health Assessment Evidence

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Bug Fix / CI Investigation
- Candidate root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): External App Store Connect configuration gap; no design issue in signing pipeline found from the observed failure.
- Refactor posture evidence summary: No refactor needed for the linked failure. Possible small diagnostic/doc improvement could be a separate quality-of-life change.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| Job `79901963167` log | Certificate import, profile verification, archive, and export succeeded. | Signing pipeline boundaries are functioning through export. | No |
| Job `79901963167` log | `altool` upload fails with no suitable application records for `org.autobyteus.mobile`. | Failure is after repository-controlled signing/build path, at App Store Connect ownership boundary. | Verify external App Store Connect app record/API key access. |
| Main checkout ignored-file inventory | No ignored repo signing artifacts present. | Local ignored files are not the source of this CI failure. | No |
| Prior ticket evidence | Same external App Store Connect record/access failure recorded for `v1.3.46`. | The failure is recurrent until external ASC app/access state changes. | Verify external ASC configuration. |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `.github/workflows/release-ios.yml` | GitHub Actions iOS release workflow | Defines secret gate, cert import, profile verification, archive/export, and altool upload. | Correct owner for CI orchestration; failure occurs at final external upload. |
| `autobyteus-ios/README.md` | iOS operator documentation | Lists required publish secrets and bundle-ID variables. | Current docs distinguish signing secrets from App Store Connect upload but could optionally emphasize app-record prerequisite. |
| `autobyteus-ios/project.yml` | XcodeGen project settings | App/share bundle IDs flow from `IOS_BUNDLE_ID` / `IOS_SHARE_EXTENSION_BUNDLE_ID`. | Bundle-ID authority is consistent in repo. |
| `autobyteus-ios/scripts/verify-appstore-profile.py` | App Store provisioning profile validation | Enforces exact team/bundle profile constraints before archive/export. | Passing profile validation means Apple Developer profile exists for the configured bundle, but not necessarily App Store Connect app record/access. |
| `.gitignore` | Local untracked/ignored hygiene | Reserves local Apple/iOS signing material patterns and `.local/ios-signing/`. | Intended local secret storage area exists, but no such files are present in main checkout now. |

## Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-06-08 | Trace | GitHub Actions job log for `79901963167` | `** ARCHIVE SUCCEEDED **`, `** EXPORT SUCCEEDED **`, then `altool` upload failed with `No suitable application records were found... org.autobyteus.mobile... (-19000)`. | Root failure is App Store Connect app-record/API access, not cert/profile import or xcodebuild. |
| 2026-06-08 | Probe | Focused ignored-file inventory in main checkout | No `.p12`, `.p8`, `.mobileprovision`, `.cer`, `.csr`, or `.local/ios-signing` files found as ignored repo-local artifacts. | User's memory of repo-ignored cert storage is true as an intended convention in `.gitignore`, but no actual files are currently there. |
| 2026-06-08 | Probe | Local `ios-signing-readiness.sh` | Local Xcode environment has development signing assets only, no iOS distribution identity / exact App Store profiles for these IDs. | Local machine state would not support App Store publish, but CI already has separate GitHub secrets that passed signing/export. |

## External / Public Source Findings

- Public API / spec / issue / upstream source: GitHub Actions run/job linked by user and retrieved via GitHub CLI/API.
- Version / tag / commit / freshness: Run `27071479568`, created 2026-06-06T19:18:03Z, tag/ref `v1.3.48`, commit `dfc26eec54cdf685442740691ce5469754ab945f`.
- Relevant contract, behavior, or constraint learned: The GitHub runner got masked iOS/App Store secrets and reached App Store Connect upload; App Store Connect rejected due no suitable accessible app record for bundle ID `org.autobyteus.mobile`.
- Why it matters: App Store Connect app-record/API access is outside the repo's local ignored files and outside xcodebuild signing/export.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: GitHub CLI access to Actions logs.
- Required config, feature flags, env vars, or accounts: GitHub token with `repo` and `workflow` scopes; present.
- External repos, samples, or artifacts cloned/downloaded for investigation: None.
- Setup commands that materially affected the investigation: Dedicated worktree/branch created as recorded above; logs saved under task artifact folder.
- Cleanup notes for temporary investigation-only setup: None yet.

## Findings From Code / Docs / Data / Logs
- Direct failure: `Upload IPA to App Store Connect/TestFlight` step, line context in saved log `logs/job-79901963167.log`, failed with App Store Connect/altool error for bundle ID `org.autobyteus.mobile`.
- Secret/certificate facts:
  - Secret gate job succeeded and required iOS secret names were present as masked env vars.
  - Certificate import step succeeded; log captured public identity output only.
  - App/share profile verification step succeeded.
  - Archive/export signed IPA step succeeded.
- Local ignored-file facts:
  - `.gitignore` lines 9-17 document intended Apple/iOS signing material ignored patterns and `.local/ios-signing/` convention.
  - Main checkout contains only `.local/release-server-dockerhub.env.example` under `.local`; no `.local/ios-signing/` files.
  - Focused `git ls-files --others --ignored --exclude-standard` for signing patterns returned no matching ignored files.
  - Safe value-redacted scan for iOS publish secret variable names found only docs/workflows/evidence/scripts, not ignored local value files.
- External App Store Connect facts:
  - `altool` error wording allows two concrete possibilities from the available evidence: no App Store Connect app record exists for `org.autobyteus.mobile`, or the configured API key/issuer/account does not have access to that app record. It can also happen if the actual app uses a different bundle ID than the repo var.

## Constraints / Dependencies / Compatibility Facts
- Secret/signing contents were not printed or persisted in artifacts.
- GitHub Actions secrets are not readable; only workflow references, masked presence, timestamps, and behavior can be inspected.
- A valid Apple Developer provisioning profile for a bundle ID is not sufficient by itself for TestFlight upload; App Store Connect must have an accessible app record for the bundle ID under the API key's team/account.

### 2026-06-08 rerun after App Store Connect app creation
- Command: `gh run rerun 27071479568 --repo AutoByteus/autobyteus-workspace --failed`.
- New failed job: `80027498663`, attempt 2, `Archive And Upload To App Store Connect`.
- The previous `No suitable application records were found` failure did not recur, confirming the new App Store Connect app record addressed that blocker.
- New failure: Apple validation rejected the IPA because it was built with the iOS 18.5 SDK from Xcode 16.4. The log says uploads now require the iOS 26 SDK / Xcode 26 or later.
- Runner image: `macos-15-arm64`; log shows default `xcodebuild -version` was `Xcode 16.4 (Build 16F6)`.
- Fix direction: select installed Xcode 26+ on GitHub-hosted macOS runner before archive/export/upload, and likely before build/test for consistency.

## Open Unknowns / Risks
- Cannot distinguish between absent app record, wrong team, wrong App Store Connect API key role/access, or wrong bundle ID without checking App Store Connect directly.
- If `org.autobyteus.mobile` is not the intended public App Store bundle ID, changing it requires updating `IOS_BUNDLE_ID`, provisioning profiles, and possibly App Group / entitlement setup.

## Notes For Architect Reviewer
No design review handoff planned unless the user asks for a repository/workflow change. If a change is requested, likely scope is a small diagnostic/docs improvement rather than a signing architecture refactor.
