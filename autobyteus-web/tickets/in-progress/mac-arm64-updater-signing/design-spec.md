# Design Spec

## Current-State Read

AutoByteus macOS update install currently depends on two separate spines that meet at the signed app bundle:

1. Release/build spine: `pnpm build:electron:mac` runs `build/dist/build.js`, electron-builder packages `AutoByteus.app`, `afterPack.ts` signs bundled server native binaries, electron-builder signs the app, notarizes when credentials are present, and the GitHub release workflow uploads DMG/ZIP artifacts.
2. Runtime update spine: the installed app uses `electron-updater` to download a ZIP, stages the update, and calls `autoUpdater.quitAndInstall(false, true)`, which relies on the already-installed app's embedded Squirrel/ShipIt updater code to apply the staged app into `/Applications`.

The signing layout is currently invalid for the runtime update spine because `build/scripts/build.ts` configures both `mac.entitlements` and `mac.entitlementsInherit` as `build/entitlements.mac.plist`. The inherited child entitlement selection causes non-app nested code to receive the app entitlement payload. `afterPack.ts` repeats the same policy for bundled server Mach-O binaries by signing them with the full app entitlement file. Local AMFI logs show constraint violations for Squirrel, Electron Framework, framework libraries, and server `.node` modules. The user-visible updater failure is triggered when the source app's Squirrel/ShipIt code is rejected by AMFI during update apply.

Current ownership boundaries are blurred:

- `build.ts` owns release build configuration but currently encodes a broad inherited entitlement policy.
- `afterPack.ts` should only normalize packaged resources before signing, but it currently owns a second server-native signing policy.
- electron-builder/@electron/osx-sign own generic recursive signing, but their configured inherited entitlement path is too coarse for AutoByteus's bundle contents.
- `.github/workflows/release-desktop.yml` validates metadata/runtime basics but does not validate the signed entitlement shape before uploading artifacts.

Target constraints:

- Follow current macOS/Electron packaging practice: hardened runtime, final signatures before notarization, least-privilege entitlements by executable role, Squirrel.Mac DMG+ZIP artifacts, and no post-notarization signature mutation.
- Preserve top-level app runtime entitlements needed by Electron, network behavior, bundled server behavior, and microphone capture.
- Keep Electron helper apps functional while avoiding the full app entitlement payload on every helper by default.
- Sign non-app nested Mach-O code with hardened runtime and no entitlement payload.
- Add release verification that fails before upload if the signed app regresses.
- Downstream API/E2E validation may push the ticket branch and manually trigger the GitHub `Desktop Release` workflow with `publish_release=false` to prove the fix in the real macOS build environment.

## Intended Change

Introduce an explicit AutoByteus macOS signing policy as the authoritative owner for bundle signing decisions. The policy classifies packaged code by executable role:

- `root-app`: top-level `AutoByteus.app` bundle, signed with `build/entitlements.mac.plist`.
- `electron-helper-app`: nested Electron helper `.app` bundles, signed with narrow helper entitlements selected by helper role (`Renderer`, `GPU`, `Plugin`, or generic helper).
- `non-app-nested-code`: frameworks, framework binaries/libraries, Squirrel, ShipIt, `.dylib`, `.node`, and bundled server Mach-O code, signed with hardened runtime and no entitlement payload.
- `ignored-non-code`: resources that are not Mach-O code signing targets.

Implementation should replace the coarse electron-builder inherited-entitlements path with a custom macOS signing adapter that signs the bundle in the correct order before electron-builder notarization. `afterPack.ts` should stop signing server binaries with app entitlements and remain a pre-sign resource normalizer only. A verifier script should use the same policy classification to scan the signed app and fail on non-allowlisted entitlement-bearing nested code. The GitHub desktop release macOS ARM64 and x64 jobs should run this verifier before artifact upload.

## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Bug Fix / Packaging Behavior Change
- Current design issue found (`Yes`/`No`/`Unclear`): Yes
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Missing Invariant / Boundary Or Ownership Issue
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): Yes
- Evidence: `entitlementsInherit` points to the full app entitlement plist; `afterPack.ts` signs server Mach-O binaries with the same plist; installed and staged `1.3.63` apps show full app entitlements on Squirrel, ShipIt, and server native modules; AMFI logs show constraint violations for non-main binaries.
- Design response: Create one authoritative macOS signing policy/classifier, route all macOS signing decisions through it, remove the duplicate server entitlement signing branch, and enforce the policy with a release verifier.
- Refactor rationale: A Squirrel-only patch would leave the same broken invariant in place for frameworks/dylibs/native modules and would not follow macOS/Electron signing best practice. The refactor is required because the current boundary treats nested code as app-like entitlement consumers.
- Intentional deferrals and residual risk, if any: Published broken artifacts are not retroactively repaired in this code change. Affected installed apps may require one manual fixed-DMG install. Broader user-facing update UX changes are deferred unless implementation discovers a minimal error-copy need.

Rules:
- `No refactor needed` is not applicable because the current owner/boundary is demonstrably unhealthy.
- The in-scope refactor is reflected in removal of broad inherited entitlements, removal of server entitlement signing in `afterPack.ts`, final file responsibilities, dependency rules, and migration sequence.

## Terminology

- `Subsystem` / `capability area`: a larger functional area that owns a broader category of work and may contain multiple files plus optional module groupings.
- `Module`: an optional intermediate grouping inside a subsystem when the codebase benefits from it. Do not use `module` as a synonym for one file or as the default ownership term.
- `Folder` / `directory`: a physical grouping used to organize files and any optional module groupings.
- `File`: one concrete source file and the primary unit where one concrete concern should land.

Task-specific terms:

- `Entitlement profile`: the entitlement plist, if any, that a signing subject is allowed to use.
- `Signing subject`: one app bundle, framework bundle, or Mach-O file discovered inside `AutoByteus.app` that may require codesigning.
- `Entitlement-bearing subject`: a signing subject for which `codesign -d --entitlements :-` may legitimately print entitlement keys.
- `No-entitlement subject`: a signing subject that must be signed without an entitlement payload.

## Design Reading Order

Read and write this design from abstract to concrete:

1. data-flow spine
2. subsystem / capability-area allocation
3. draft file responsibilities -> extract reusable owned structures -> finalize file responsibilities
4. folder/path mapping

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: remove/decommission broad app-entitlement inheritance for child code and the server-native `afterPack.ts` branch that signs Mach-O binaries with app entitlements.
- Treat removal as first-class design work: the new signing policy replaces duplicated/coarse signing decisions with one owner.
- Decision rule: the design must not depend on compatibility wrappers, Squirrel-only special cases, or post-sign/post-notarization repairs.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | Desktop release build command | Signed/notarized macOS app artifacts | macOS Signing Policy | Main release path that creates the source app used by future updates |
| DS-002 | Primary End-to-End | Installed app update install request | Replaced app in `/Applications` | Squirrel/ShipIt updater inside source app | User-visible failing path; proves source app signing matters |
| DS-003 | Primary End-to-End | GitHub macOS build job | Artifact upload gate | macOS Signing Verifier | Prevents publishing another broken source app |
| DS-004 | Bounded Local | Packaged app contents traversal | Signed bundle with final top-level seal | macOS Signing Adapter | Internal signing order and classification determine correctness |
| DS-005 | Bounded Local | Signed app contents traversal | Pass/fail verifier report | macOS Signing Verifier | Internal validation loop enforces the same invariant |
| DS-006 | Return-Event | Manual workflow dispatch result | API/E2E execution report | API/E2E validation stage | Proves GitHub Actions build success or records blocker without publishing |

## Primary Execution Spine(s)

- `DS-001`: `pnpm build:electron:mac -> electron-builder package -> afterPack resource normalization -> AutoByteus Mac Signing Adapter -> Apple codesign -> electron-builder notarization -> DMG/ZIP artifacts`
- `DS-002`: `Installed AutoByteus.app -> AppUpdater install command -> electron-updater quitAndInstall -> Squirrel/ShipIt from source app -> staged app replacement in /Applications`
- `DS-003`: `GitHub Desktop Release macOS job -> built AutoByteus.app -> macOS Signing Verifier -> artifact upload`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | The release build creates a packaged app, normalizes resources, signs every code subject according to role, then lets electron-builder notarize and package artifacts. | Build command, electron-builder package, resource normalizer, mac signing adapter, Apple signing/notarization, artifacts | macOS Signing Policy | entitlement plist files, code discovery, codesign command adapter, notarization credentials |
| DS-002 | A user accepts an update in the installed app; the source app's embedded Squirrel/ShipIt applies the staged ZIP. If that source updater code has invalid entitlements, AMFI blocks install. | Installed app, AppUpdater, electron-updater, Squirrel/ShipIt, `/Applications` app bundle | Squirrel/ShipIt updater inside source app | update cache, release ZIP metadata, recovery documentation |
| DS-003 | The GitHub macOS build must prove the signed app follows policy before uploading ZIP/DMG artifacts. | GitHub macOS job, built app bundle, signing verifier, artifact upload step | macOS Signing Verifier | workflow artifact discovery, verifier output, failure annotations |
| DS-004 | The custom signing adapter traverses code, classifies subjects, signs deepest nested code first with the right entitlement profile, then seals containers and the root app. | Discovery, policy classification, signing order, codesign executor, final app seal | macOS Signing Adapter | helper entitlement files, timestamp handling, keychain identity, ignore rules |
| DS-005 | The verifier traverses signed code, classifies subjects, extracts entitlements, and rejects entitlement-bearing non-allowlisted subjects. | Discovery, policy classification, entitlement extraction, report | macOS Signing Verifier | `codesign`, `file`, CI output, explicit Squirrel/ShipIt checks |
| DS-006 | API/E2E pushes the ticket branch, manually starts the desktop release workflow with publishing disabled, and records success or a concrete blocker. | Pushed branch, workflow dispatch, GitHub Actions run, API/E2E report | API/E2E validation stage | repository permissions, workflow credentials, run URL |

## Spine Actors / Main-Line Nodes

- `Desktop Release Build Command`: initiates local/CI macOS build.
- `electron-builder Package`: creates the unsigned/staged `AutoByteus.app` bundle and DMG/ZIP targets.
- `afterPack Resource Normalizer`: prepares packaged terminal/server resources before signing without owning entitlement policy.
- `AutoByteus Mac Signing Adapter`: performs signing orchestration for the whole app bundle.
- `Mac Signing Policy`: classifies each signing subject and selects entitlement profile.
- `Apple codesign/notarization`: platform signing and notarization mechanism.
- `Mac Signing Verifier`: validates final signed app before artifact upload.
- `AppUpdater`: runtime update command owner, not a signing owner.
- `Squirrel/ShipIt`: update apply mechanism launched from the source app.
- `API/E2E GitHub Workflow Validation`: downstream validation owner for pushed-branch CI proof.

## Ownership Map

| Main-Line Node | Ownership |
| --- | --- |
| `build/scripts/build.ts` | Build target selection and electron-builder config handoff. It should declare the custom mac sign adapter, not duplicate signing policy. |
| `afterPack.ts` | Resource normalization before signing. It must not own entitlement choices or server-native signing policy. |
| `MacSigningPolicy` | Authoritative classification of signing subjects and entitlement profiles. Owns the invariant that only root app/helper app main executables may carry entitlement keys. |
| `MacSignAdapter` | Signing lifecycle, traversal order, and calls to `codesign`. Owns signing sequence but delegates entitlement decisions to `MacSigningPolicy`. |
| `MacCodeSignCommand` | Thin command adapter for `codesign`; owns shell argument construction and error propagation only. |
| `MacSigningVerifier` | Release validation of the signed app. Owns failure reporting and explicit Squirrel/ShipIt checks. |
| `.github/workflows/release-desktop.yml` | CI validation and artifact upload sequencing. Owns invoking verifier before upload and allowing manual dispatch validation. |
| `AppUpdater` | Runtime update status/download/install initiation. It must not inspect or mutate signing layout. |
| `Squirrel/ShipIt` | Runtime update apply. Its correctness depends on source app signing but it is not modified by this ticket. |

If a public facade exists, `build.ts` is only a build entry/config wrapper. The governing signing owner is `MacSigningPolicy` plus `MacSignAdapter`.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `build/scripts/build.ts` mac config | `MacSignAdapter` / `MacSigningPolicy` | Wires electron-builder to project-specific signing | Per-path entitlement decisions |
| `scripts/verify-macos-signing-policy.mjs` CLI | `MacSigningVerifier` logic | Gives CI and developers a stable command | A separate, divergent signing allowlist |
| GitHub workflow step | Verifier CLI | Runs validation in release build jobs | Signing policy or entitlement exceptions |
| `AppUpdater.installUpdateAndRestart()` | Squirrel/ShipIt and electron-updater | User/runtime install initiation | Signing repair, artifact mutation, or recovery policy |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| `mac.entitlementsInherit: 'build/entitlements.mac.plist'` | Broadly applies app entitlements to child code | `MacSigningPolicy` helper/no-entitlement classification | In This Change | Do not replace with another broad child app entitlement file. |
| Server-native app-entitlement signing in `afterPack.ts` | Duplicates signing policy and causes `.node` AMFI violations | `MacSignAdapter` signs server native code with no entitlements | In This Change | `afterPack.ts` may still normalize execute bits. |
| Any Squirrel-only post-sign/post-notarization re-sign workaround | Fixes one symptom while leaving invalid bundle-wide invariant and can invalidate notarization | Pre-notarization signing adapter + verifier | In This Change | Explicitly rejected. |
| Verifier allowlist for arbitrary nested binaries | Would hide recurrence of the bug | Role-based allowlist derived from `MacSigningPolicy` | In This Change | Only root app and helper app main executables may be entitlement-bearing. |
| Auto-update self-repair assumption for already-broken apps | Broken source app's Squirrel must run before replacement | Manual fixed-DMG recovery guidance | In This Change / Delivery docs | Operationally documented, not coded as compatibility path. |

## Return Or Event Spine(s) (If Applicable)

- `Verifier failure -> GitHub job failure -> implementation/API-E2E report`: The verifier report must name violating paths so downstream specialists can route defects to implementation, not rediscover the problem.
- `AMFI/update failure -> user support/recovery path`: For already-published broken artifacts, failure should be explained as requiring manual fixed-DMG install once a corrected artifact exists.
- `Manual workflow dispatch -> API/E2E report`: API/E2E records the run URL and success/failure or a permission/credential blocker.

## Bounded Local / Internal Spines (If Applicable)

- Parent owner: `MacSignAdapter`
  - `Discover signing subjects -> classify by policy -> sort deepest-first -> sign no-entitlement subjects -> sign helper app bundles -> sign root app -> verify structural signature`
  - This matters because signing order determines whether nested code and containing bundles remain valid.
- Parent owner: `MacSigningVerifier`
  - `Discover Mach-O/code subjects -> classify by policy -> extract entitlements -> compare with allowed entitlement-bearing roles -> emit pass/fail report`
  - This matters because CI must reject entitlement-bearing non-app nested code before artifacts are uploaded.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Entitlement plist files | DS-001, DS-004 | `MacSigningPolicy` | Store root app and helper entitlement profiles | Separates policy data from signing orchestration | Inline entitlement decisions become hard to review and over-broad |
| Code discovery | DS-004, DS-005 | `MacSignAdapter`, `MacSigningVerifier` | Find Mach-O files and signable bundles | Signing/verifying needs a common inventory | Discovery scattered across signer/verifier drifts |
| Codesign command wrapper | DS-004 | `MacSignAdapter` | Execute `codesign` with identity/keychain/timestamp/options | Keeps shell argument handling out of policy | Policy starts owning command mechanics |
| Verifier CLI output | DS-003, DS-005 | `MacSigningVerifier` | Produce CI-readable failure messages | Needed for fast diagnosis in GitHub Actions | Release workflow becomes a shell blob with hidden policy |
| GitHub workflow dispatch | DS-006 | API/E2E validation stage | Trigger branch build with `publish_release=false` | Proves real CI build without publishing | Release/publish concerns leak into solution design/implementation |
| Recovery documentation | DS-002 | Delivery/support | Explain manual fixed-DMG recovery | Auto-update cannot repair a blocked source helper | Runtime code gains compatibility branches |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Mac build wiring | `autobyteus-web/build/scripts/build.ts` | Extend | Already owns electron-builder configuration | N/A |
| Pre-sign resource normalization | `autobyteus-web/build/scripts/afterPack.ts` | Reuse with reduced responsibility | Already prepares packaged server/terminal resources | N/A |
| Mac signing policy | `autobyteus-web/build/scripts` | Create New inside build subsystem | No existing project file owns role-based entitlement policy | Existing `build.ts` is config wrapper; `afterPack.ts` is resource normalizer |
| Release verification script | `autobyteus-web/scripts` | Create New | Existing scripts include runtime/metadata verifiers, not mac signing policy verifier | Metadata/runtime verifiers do not inspect codesign entitlements |
| Release CI validation | `.github/workflows/release-desktop.yml` | Extend | Already owns mac build/upload jobs and manual dispatch | N/A |
| Updater runtime | `autobyteus-web/electron/updater` | Reuse, no signing change | Runtime path is not the signing owner | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| macOS Desktop Build/Signing | signing adapter, signing policy, entitlement profile selection, signing order | DS-001, DS-004 | `MacSignAdapter`, `MacSigningPolicy` | Extend/Create internal module | Lives under `autobyteus-web/build/scripts` because it participates in electron-builder signing. |
| Packaged Resource Preparation | node-pty execute-bit normalization and other pre-sign resource fixes | DS-001 | `afterPack Resource Normalizer` | Reuse with narrowed responsibility | Must not sign with entitlements. |
| Release Verification Scripts | signed app entitlement scanning | DS-003, DS-005 | `MacSigningVerifier` | Extend scripts subsystem | Runs after build, before upload. |
| Desktop Release Workflow | CI build, verifier invocation, manual dispatch validation | DS-003, DS-006 | GitHub workflow validation | Extend | API/E2E may trigger workflow with publishing disabled. |
| Updater Runtime | download/install state and user commands | DS-002 | `AppUpdater` | Reuse unchanged unless minimal messaging is needed | Do not add signing repairs here. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/build/scripts/macSigningPolicy.ts` | macOS Desktop Build/Signing | `MacSigningPolicy` | Classify signing subjects and select entitlement profile IDs | Policy decisions should be reviewable in one place | Yes |
| `autobyteus-web/build/scripts/macSign.ts` | macOS Desktop Build/Signing | `MacSignAdapter` | electron-builder custom `mac.sign` entrypoint and signing sequence | Signing lifecycle is distinct from policy rules | Yes |
| `autobyteus-web/build/scripts/macCodeSign.ts` | macOS Desktop Build/Signing | `MacCodeSignCommand` | Thin `codesign` executor | Keeps command construction/test seams separate | Yes |
| `autobyteus-web/build/entitlements.mac.plist` | macOS Desktop Build/Signing | Root app entitlement profile | Top-level app entitlements | Existing app-level profile | No |
| `autobyteus-web/build/entitlements.mac.helper*.plist` | macOS Desktop Build/Signing | Helper entitlement profiles | Narrow Electron helper profiles | Reviewable least-privilege profiles | No |
| `autobyteus-web/build/scripts/afterPack.ts` | Packaged Resource Preparation | Resource normalizer | Normalize execute bits; no entitlement signing | Existing hook remains focused | No |
| `autobyteus-web/scripts/verify-macos-signing-policy.mjs` | Release Verification Scripts | `MacSigningVerifier` | CLI verifier for signed app entitlement layout | CI/dev command boundary | Yes |
| `.github/workflows/release-desktop.yml` | Desktop Release Workflow | CI validation owner | Invoke verifier in macOS ARM64/x64 jobs; support manual validation dispatch | Existing release workflow owns artifact upload gate | N/A |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Signing subject classification | `autobyteus-web/build/scripts/macSigningPolicy.ts` compiled to `build/dist/macSigningPolicy.js` | macOS Desktop Build/Signing | Signer and verifier must agree on entitlement-bearing roles | Yes | Yes | A generic helper dumping ground |
| Codesign invocation options | `autobyteus-web/build/scripts/macCodeSign.ts` | macOS Desktop Build/Signing | Signer needs consistent identity/keychain/timestamp/runtime handling | Yes | Yes | A policy owner |
| Entitlement profile IDs | `macSigningPolicy.ts` + plist files | macOS Desktop Build/Signing | Same role names should drive signing and verification | Yes | Yes | Parallel string constants in CI shell |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `MacSigningSubject` | Yes | Yes | Low | Fields should be limited to `path`, `relativePath`, `kind`, `entitlementProfile`, `signingTargetKind`, and `mayHaveEntitlementKeys`. |
| `EntitlementProfile` | Yes | Yes | Low | Use explicit profile IDs such as `root-app`, `helper-renderer`, `helper-gpu`, `helper-plugin`, `helper-generic`, `none`. |
| Verifier violation record | Yes | Yes | Low | Include `path`, `observedKeys`, `expectedProfile`, and `reason`; avoid raw command dumps as the data model. |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/build/scripts/macSigningPolicy.ts` | macOS Desktop Build/Signing | `MacSigningPolicy` | Role-based signing subject classification, entitlement profile selection, verifier allowlist decisions | Centralizes the missing invariant | N/A |
| `autobyteus-web/build/scripts/macSign.ts` | macOS Desktop Build/Signing | `MacSignAdapter` | electron-builder custom sign function; discovery/order/sign/verify handoff before notarization | Lifecycle owner separate from policy | `MacSigningPolicy`, `MacCodeSignCommand` |
| `autobyteus-web/build/scripts/macCodeSign.ts` | macOS Desktop Build/Signing | `MacCodeSignCommand` | Execute `codesign` for a subject with or without entitlements | Thin command adapter | `MacSigningSubject` |
| `autobyteus-web/build/scripts/afterPack.ts` | Packaged Resource Preparation | Resource normalizer | Normalize node-pty spawn-helper execute bits and other pre-sign file modes only | Prevents responsibility drift | No |
| `autobyteus-web/build/scripts/build.ts` | Desktop build config | Build entry wrapper | Wire `mac.sign` to `macSign`; keep root entitlements metadata; remove broad inherited app entitlements | Keeps config readable | `MacSignAdapter` by import/reference |
| `autobyteus-web/build/entitlements.mac.plist` | macOS Desktop Build/Signing | Root app entitlement profile | Top-level app entitlement keys | Existing app profile remains | No |
| `autobyteus-web/build/entitlements.mac.helper.plist` | macOS Desktop Build/Signing | Generic helper entitlement profile | Minimal generic helper runtime entitlements | Avoids full app inheritance | No |
| `autobyteus-web/build/entitlements.mac.helper.renderer.plist` | macOS Desktop Build/Signing | Renderer helper profile | Renderer-specific runtime entitlements | Aligns with Electron helper role pattern | No |
| `autobyteus-web/build/entitlements.mac.helper.gpu.plist` | macOS Desktop Build/Signing | GPU helper profile | GPU-helper-specific runtime entitlements | Aligns with Electron helper role pattern | No |
| `autobyteus-web/build/entitlements.mac.helper.plugin.plist` | macOS Desktop Build/Signing | Plugin helper profile | Plugin-helper-specific runtime entitlements | Aligns with Electron helper role pattern | No |
| `autobyteus-web/scripts/verify-macos-signing-policy.mjs` | Release Verification Scripts | `MacSigningVerifier` | CLI scan/report/fail on signing policy violations | Release gate command | compiled `MacSigningPolicy` |
| `.github/workflows/release-desktop.yml` | Desktop Release Workflow | CI validation owner | Run verifier in macOS ARM64/x64 jobs before upload | Existing artifact gate | Verifier CLI |

## Ownership Boundaries

The authoritative signing boundary is `MacSigningPolicy`. Any file that needs to know whether a path may have entitlements must ask/use this policy rather than checking path names ad hoc. `MacSignAdapter` owns signing lifecycle and order but cannot introduce entitlement exceptions outside the policy. The verifier owns release validation and should use the same policy source; it should not carry an independent allowlist in GitHub YAML.

`afterPack.ts` is explicitly demoted back to resource preparation. It may set execute bits so later signing is valid, but it must not choose entitlements or sign server binaries. `AppUpdater` remains a runtime updater owner and must not be changed to repair signatures or bypass Squirrel. GitHub workflow remains a caller of verifier/build commands, not a signing policy owner.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `MacSigningPolicy` | path classification, entitlement profile selection, entitlement-bearing allowlist | `MacSignAdapter`, `MacSigningVerifier` | Verifier YAML or signer hardcoding a separate list of entitled paths | Add explicit policy method/profile |
| `MacSignAdapter` | traversal order, codesign calls, final app seal | `build.ts` / electron-builder custom sign | `afterPack.ts` signing binaries independently | Add hook/option to adapter, not afterPack signing |
| `MacSigningVerifier` CLI | entitlement extraction and report formatting | GitHub workflow, API/E2E validation | Inline shell `codesign` checks with partial path list only | Extend verifier output/options |
| `AppUpdater` | update state and install command | Renderer/user update UI | Runtime code attempting to re-sign or repair installed app | Use release/recovery docs, not runtime signing |

## Dependency Rules

Allowed:

- `build.ts` may import/reference `MacSignAdapter` and configure electron-builder to use it.
- `MacSignAdapter` may depend on `MacSigningPolicy` and `MacCodeSignCommand`.
- `MacSigningVerifier` may depend on the compiled `MacSigningPolicy` classification output.
- `.github/workflows/release-desktop.yml` may call `scripts/verify-macos-signing-policy.mjs` after build and before artifact upload.
- API/E2E may push the ticket branch and trigger `Desktop Release` workflow dispatch with `publish_release=false`.

Forbidden:

- `afterPack.ts` must not sign server Mach-O binaries with app entitlements.
- `build.ts` must not set full app entitlements as child inherited entitlements.
- The verifier must not maintain a divergent broad allowlist.
- No `afterSign` repair that mutates signatures after notarization.
- `AppUpdater` must not inspect codesign entitlements or add update compatibility branches to work around broken source apps.
- Do not publish artifacts from API/E2E manual workflow validation; use `publish_release=false`.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `macSignAutoByteusApp(signOptions, packager)` | Packaged macOS app bundle | Custom electron-builder signing entrypoint | electron-builder `SignOptions` with `app` path and identity/keychain | Must run before electron-builder notarization. |
| `classifyMacSigningSubject(appRoot, subjectPath)` | Signing subject | Return role/profile/entitlement allowance | absolute app root + absolute subject path | The authoritative policy boundary. |
| `signSubject(subject, signingContext)` | One signing subject | Execute `codesign` with correct runtime/entitlement arguments | `MacSigningSubject` + identity/keychain/timestamp | No policy decisions inside command wrapper. |
| `verifyMacSigningPolicy({ app })` / CLI `--app` | Signed app bundle | Scan and fail on entitlement violations | absolute or relative `.app` path | Used by CI and developers. |
| GitHub workflow dispatch `release-desktop.yml` | Desktop release build validation | Build branch without publishing | branch ref; `publish_release=false`; no `release_tag` unless intentionally validating tag mode | API/E2E records run result. |

Rule:
- Do not use one generic boundary that accepts ambiguous path strings and guesses policy in multiple places. The policy classifier is the single subject-owned boundary for signing identity.

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `macSignAutoByteusApp` | Yes | Yes | Low | Keep as electron-builder custom sign adapter only. |
| `classifyMacSigningSubject` | Yes | Yes | Low | Require app root + subject path and return explicit profile. |
| `signSubject` | Yes | Yes | Low | Do not let it choose entitlement profile by itself. |
| `verify-macos-signing-policy --app` | Yes | Yes | Low | Accept one app bundle path per invocation. |
| GitHub workflow dispatch | Yes | Yes | Medium | API/E2E must use `publish_release=false` and record run URL to avoid accidental publish. |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Signing policy | `MacSigningPolicy` | Yes | Low | Avoid vague `signHelper` naming. |
| Signing adapter | `MacSignAdapter` / `macSignAutoByteusApp` | Yes | Low | Keep adapter lifecycle separate from policy. |
| Verifier | `MacSigningVerifier` / `verify-macos-signing-policy.mjs` | Yes | Low | Name by concrete concern. |
| Resource prepack hook | `afterPack.ts` | Existing conventional name | Medium | Comments must say it normalizes resources only, not signing policy. |
| Helper entitlements | `entitlements.mac.helper.<role>.plist` | Yes | Low | Role suffix should match Electron helper role. |

## Applied Patterns (If Any)

- `Policy / Classifier`: `MacSigningPolicy` centralizes path-to-entitlement-role decisions for both signer and verifier.
- `Adapter`: `MacSignAdapter` adapts electron-builder's custom sign hook to AutoByteus signing policy and Apple `codesign` commands.
- `Command Adapter`: `MacCodeSignCommand` isolates external command invocation from policy rules.
- `Verifier`: `verify-macos-signing-policy.mjs` is an executable release gate, not a second policy owner.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/build/scripts/` | Folder | Desktop build scripts | Build-time TypeScript sources compiled by `build/tsconfig.json` | Existing build subsystem | Runtime updater behavior |
| `autobyteus-web/build/scripts/macSigningPolicy.ts` | File | `MacSigningPolicy` | Classify app/helper/non-app signing subjects and entitlement profiles | Build subsystem owns signing policy | Shell command execution |
| `autobyteus-web/build/scripts/macSign.ts` | File | `MacSignAdapter` | Custom electron-builder signing function | Needs compiled build script entrypoint | Policy constants duplicated outside policy |
| `autobyteus-web/build/scripts/macCodeSign.ts` | File | `MacCodeSignCommand` | Execute `codesign` safely | Command adapter for signer | Entitlement allowlist decisions |
| `autobyteus-web/build/scripts/afterPack.ts` | File | Resource normalizer | Normalize packaged terminal/server resource file modes only | Existing electron-builder hook | Entitlement files or signing loop |
| `autobyteus-web/build/entitlements.mac.plist` | File | Root app entitlement profile | Existing app entitlements | Existing resource location | Helper/non-app catch-all policy |
| `autobyteus-web/build/entitlements.mac.helper*.plist` | Files | Helper entitlement profiles | Narrow Electron helper entitlements by role | Same build resource location as app entitlements | App network/audio/server entitlements unless justified |
| `autobyteus-web/scripts/verify-macos-signing-policy.mjs` | File | `MacSigningVerifier` CLI | Validate final signed app | Existing script location for executable repo checks | Independent policy allowlist |
| `.github/workflows/release-desktop.yml` | File | Desktop release workflow | Run verifier before mac artifact upload; allow manual branch validation | Existing CI owner | Inline path-specific entitlement policy |
| `autobyteus-web/tickets/in-progress/mac-arm64-updater-signing/` | Folder | Solution-designer artifacts | Requirements, investigation, design | Task documentation | Workflow-state/downstream artifacts |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `autobyteus-web/build/scripts` | Main-Line Domain-Control for build/signing | Yes | Low | Build-time scripts already live here; adding three focused files is readable. |
| `autobyteus-web/build` entitlement plists | Off-Spine Concern | Yes | Low | Resource files serve signing policy; names must be role-specific. |
| `autobyteus-web/scripts` | Off-Spine Concern / verification CLI | Yes | Low | Existing scripts folder houses executable repo checks. |
| `.github/workflows` | Transport/CI orchestration | Yes | Medium | Must call verifier rather than encode policy inline. |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Entitlement profile by role | `root AutoByteus.app -> entitlements.mac.plist`; `AutoByteus Helper (Renderer).app -> entitlements.mac.helper.renderer.plist`; `Squirrel.framework/.../Squirrel -> no --entitlements` | `entitlementsInherit: 'build/entitlements.mac.plist'` for all children | Shows least-privilege app/helper/non-app split. |
| Signing order | `nested Mach-O -> framework bundle -> helper app bundle -> root app -> notarization` | `root app -> afterSign re-sign Squirrel -> package/upload` | Prevents invalid app sealing and post-notarization mutation. |
| Verifier policy | `classify path -> mayHaveEntitlementKeys? -> compare observed keys` | `grep Squirrel only` | Prevents recurrence on other nested code. |
| API/E2E GitHub validation | push ticket branch -> workflow_dispatch `Desktop Release` with `publish_release=false` -> record run URL | push tag/publish release from validation stage | Confirms CI build without accidental release. |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Squirrel-only re-sign patch | Directly matches observed failing path | Rejected as sole fix | Bundle-wide signing policy and verifier; Squirrel/ShipIt are explicit checks within broader invariant. |
| `afterSign` re-sign of Squirrel/non-app code | Easy hook location after default signing | Rejected | Custom/pre-notarization signing adapter so final signatures are notarized/sealed correctly. |
| Keep full `entitlementsInherit` and add verifier warning only | Minimizes code changes | Rejected | Remove broad inherited app entitlement policy. |
| Auto-updater fallback to manual copy or privileged installer | Could attempt to repair broken source installs | Rejected | Manual fixed-DMG recovery guidance; future fixed source app handles updates normally. |
| Treat Intel as healthy because it appeared to work | Intel update path was observed to tolerate invalid layout | Rejected | Apply same signing policy and verification to x64 and arm64. |
| API/E2E publish-release validation | Would test exact publish path | Rejected unless separately authorized | Use manual workflow dispatch with `publish_release=false`. |

Hard block:
- Any design that depends on backward-compatibility wrappers, dual-path behavior, or retained legacy flow for in-scope replaced behavior fails review.

## Derived Layering (If Useful)

- Build entry/config layer: `build.ts` wires electron-builder options.
- Build signing domain-control layer: `MacSignAdapter` and `MacSigningPolicy` own signing decisions and lifecycle.
- External command adapter layer: `MacCodeSignCommand` invokes Apple tooling.
- Release validation layer: verifier CLI and GitHub workflow enforce final artifact shape.
- Runtime updater layer: `AppUpdater`/Squirrel use the signed result but do not own signing.

The layering follows ownership: workflow/build entrypoints call the signing/verifier boundaries; they do not bypass policy internals.

## Migration / Refactor Sequence

1. Add `MacSigningPolicy` with explicit profile IDs and classification tests/fixtures for root app, helper app roles, Squirrel, ShipIt, frameworks, dylibs, `.node` files, and server native binaries.
2. Add role-specific helper entitlement plist files. Start from official Electron/@electron/osx-sign helper role patterns and remove app-only entitlements such as audio/network/server unless implementation proves a helper-specific need.
3. Add `MacCodeSignCommand` and `MacSignAdapter` custom electron-builder signing entrypoint. The adapter signs nested no-entitlement code first, helper app bundles with helper profiles, then root app with app profile. It must preserve identity/keychain/timestamp/hardened runtime behavior.
4. Modify `build.ts` to use the custom mac sign adapter and remove broad `entitlementsInherit: 'build/entitlements.mac.plist'`. Keep root `entitlements` for app profile documentation/input if useful, but do not rely on electron-builder's inherited child entitlement path for policy.
5. Modify `afterPack.ts` to remove server binary signing and keep only resource normalization such as node-pty execute-bit normalization.
6. Add `verify-macos-signing-policy.mjs` that loads the compiled signing policy, scans the signed app, explicitly checks Squirrel and ShipIt, and fails on entitlement keys outside allowed root/helper app subjects.
7. Modify `.github/workflows/release-desktop.yml` ARM64 and x64 macOS jobs to find the built `AutoByteus.app` and run the verifier before artifact upload.
8. Run implementation-local checks: build script TypeScript compile, focused policy/verifier tests, and any existing updater/build tests affected by config changes.
9. Downstream API/E2E stage: after code review, commit and push the ticket branch if needed; manually trigger `Desktop Release` workflow with `publish_release=false` on that branch; record the run URL and success/failure or a concrete permission/credential blocker. If durable coverage files are added/updated, route back through code review per team rule.
10. Delivery stage: document affected-user recovery. Users already on a broken source app may need one manual fixed-DMG install; future updates should work once the installed source app has corrected Squirrel/ShipIt signing.

## Key Tradeoffs

- Custom signing adapter vs electron-builder default signing: custom signing is more code, but electron-builder's current inherited entitlement mechanism is too coarse for this bundle and its default fallback still supplies entitlements to child code. The adapter gives the project an explicit least-privilege policy and can run before notarization.
- Bundle-wide verifier vs Squirrel-only verifier: bundle-wide scanning catches the actual invariant and prevents future AMFI surprises; Squirrel-only would be faster but incomplete.
- Helper role-specific entitlements vs one helper plist: role-specific profiles follow Electron's helper-role pattern better, but require more verification. If implementation chooses one generic helper plist, it must justify why that still satisfies least privilege and architecture review should scrutinize it.
- API/E2E GitHub workflow validation vs local-only validation: GitHub validation takes longer and requires permissions/secrets, but it validates the actual release build environment. It should not publish artifacts.

## Risks

- Re-implementing signing order incorrectly can break app sealing or notarization. Mitigation: sign deepest first, verify with `codesign --verify --deep --strict`, and run the release workflow verifier.
- Helper entitlement narrowing may break renderer/GPU/plugin behavior. Mitigation: use Electron helper-role patterns, run packaged app smoke checks, and validate in GitHub macOS jobs.
- `codesign -d --entitlements` output can include warnings/noise. Mitigation: parser should detect `<key>` entries robustly and report raw snippets only as diagnostics.
- The current installed app and current `1.3.63` artifact are still broken after manual install. Mitigation: release a fixed DMG and document one-time manual recovery.
- GitHub manual workflow validation may be blocked by credentials or permissions. Mitigation: API/E2E handoff records a concrete blocker instead of silently skipping.

## Guidance For Implementation

- Do not implement a Squirrel-only fix. Squirrel and ShipIt are mandatory explicit checks, but the invariant is broader: non-app nested Mach-O code must not carry entitlement keys.
- Do not use `afterSign` as the primary fix point. The design requires final signatures before notarization and packaging.
- Keep `afterPack.ts` focused on normalization only. Server native Mach-O signing belongs to the signing adapter with no entitlement payload.
- The verifier should fail loudly with path-specific output and should be runnable locally on a signed `.app`.
- The GitHub workflow validation command should run before artifact upload in both macOS ARM64 and x64 jobs.
- API/E2E may push the branch and trigger manual `Desktop Release` workflow dispatch with `publish_release=false`; it must not create/publish a release unless separately authorized.
- Implementation handoff should include exact commands used for local verification and any macOS signing/notarization caveats encountered.
