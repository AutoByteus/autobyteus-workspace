# Design Spec

## Solution And Approval Basis

- Current solution revision ID: `SR-001`
- Approved requirements baseline: `requirements-doc.md` at SR-001. Approved by the Solution Designer within the direction (the founder informed), 2026-11-20.
- Behavior-defining supplements: none.
- User approval of the design: `Not required`.
- Design status: `Ready`. Probe P-01 (run 44725773809) passed: Xcode 27.2 / SDK 27.2, build succeeded, 56 core tests and 8 UI smoke tests passed, with no app change.
- Canonical investigation notes: `investigation-notes.md` (same folder).
- Authorities read (2026-11-20): `references/architecture-design.md`, `references/design-principles.md`, `DESIGN.md` (rule 12: a workflow change needs the build-only release run on the ticket branch before merge).
- Conflicts or discrepancies: none.

## Current-State Read

- The iOS release workflow has two macOS jobs, `build-ios` and `upload-testflight`. Each runs on `macos-latest` and starts with its own copy of the step "Select Xcode 26 or newer" (`release-ios.yml:125-155` and `:391-421`).
- The step:
  1. takes `IOS_XCODE_APP_PATH` (workflow default `/Applications/Xcode_26.3.app`, `:40`, repeated as a fallback inside each copy, `:129` and `:395`);
  2. exports `DEVELOPER_DIR`;
  3. parses `xcodebuild -version`;
  4. fails below major 26;
  5. only logs the iPhoneOS SDK.
- The contract check (`ios-release-contract-check.py:191-220`) pins those strings per job.
- The beta.3 binary was built with Xcode 26.3 / SDK 26.2 (S-01). `macos-latest` has no Xcode 27 (S-04). GitHub's `xcode-27` image has Xcode 27.0–27.2 released and 27.3 in beta (S-05).
- No repository variable overrides the path (S-03).

## Task Size And Architectural Risk (Mandatory)

- Task size: `Small`.
- Size rationale: one workflow file (two runner labels, the default path, and the two select steps calling one script), one new script of about 40 lines, the contract check's Xcode section, and two documents. No app source, unless P-01 shows Xcode 27 refusing the build.
- Architectural risk: `Low`.
- Risk rationale:
  - It moves the existing release toolchain to GitHub's supported Xcode 27 image, within the existing owners.
  - It adds no contract, persistence, security, concurrency or ownership change.
  - The deployment surface (the release workflow) changes, but in a bounded way:
    - a build-only GitHub run proves it before merge (DESIGN.md rule 12);
    - the archive job uses the identical step and runner.
  - The uncertainty (does the app build with Xcode 27?) was measured by P-01 before this classification.
- Escalation trigger: if the final build-only run shows Xcode 27 refusing the build (compiler errors, a Swift-mode removal, a deployment-target floor), implementation returns a `Design Impact` with the log. The smallest change that builds is then added and reclassified.

## Architecture Investigation Evidence

| Source | Reference | Observation | Decision Supported | Remaining Uncertainty |
| --- | --- | --- | --- | --- |
| S-01 | beta.3 run 44721148794 | Xcode 26.3 / SDK 26.2 | Root cause | — |
| S-02 | `release-ios.yml:40,116,125-155,373,391-421` | Pin, runner and two identical select steps | D-1, D-3 | — |
| S-04, S-05 | runner-images readmes; changelog | Xcode 27 only on `xcode-27` | D-1, D-2 | — |
| S-06 | `ios-release-contract-check.py:191-220` | Static strings per job | D-4 | — |
| P-01 | run 44725773809 | Build/test/smoke under Xcode 27.2 on `xcode-27` | Feasibility | See investigation notes |

## Intended Change

Both macOS jobs run on `xcode-27` and select `/Applications/Xcode_27.2.app` by default. One script owns the toolchain rule (Xcode major ≥ 27 and iPhoneOS SDK major ≥ 27), and both jobs call it. The contract check and the documents follow.

## Change Scope (Mandatory)

- **In scope:** UC-001…003.
  - `.github/workflows/release-ios.yml`: the runner labels, the default path, and the two select steps;
  - a new `autobyteus-ios/scripts/select-release-xcode.sh`;
  - `autobyteus-ios/scripts/ios-release-contract-check.py` (its Xcode section);
  - `RELEASE.md` (iOS bullet);
  - `autobyteus-ios/README.md` (the `IOS_XCODE_APP_PATH` text).
- **Derived consumers:** N/A. No stored or shared structure changes.
- **Deliberately left alone:**
  - the app's source, `project.yml` (Swift 5.10, iOS 17.0), the demo build, signing, version metadata and upload steps, unless the escalation trigger fires;
  - the desktop, Android and server workflows;
  - the `actions/checkout@v4` Node 20 deprecation notice seen in the probe log. It is GitHub's notice, unrelated to the SDK, and applies to every workflow.
- **Follow-ups:** FU-001: the simulator substring match picks iPhone 17e on iOS 27.0. It is pre-existing and affects no AC.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Requirement / AC | Trigger | Existing Behavior | Approved Change / Preserved | Target Path / Spine |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | Operational | REQ-001, REQ-002; AC-001, AC-002 | `v*` tag / dispatch | S-01, S-02 | Runs on `xcode-27`, Xcode 27.2 by default; the override and the logging are preserved | DS-001, DS-002 |
| BEH-002 | Operational | REQ-003; AC-003 | each macOS job | S-02 | Floor 27 for Xcode and SDK; the full-output parse is preserved | DS-003 |
| BEH-003 | Contract | REQ-004; AC-004 | contract check | S-06 | Checks the new wiring; the other rules are unchanged | DS-001 |

## Relevant Supplemental Task Artifacts

None.

## Task Design Health Assessment (Mandatory)

- Change posture: `Behavior Change` (toolchain requirement).
- Current design issue found: `Yes`, a small one.
- Structural triggers that fire:
  - **Repeated coordination (Principle 13):** the Xcode selection and guard are copied in two jobs (S-02), and the default path is written three times (`:40`, `:129`, `:395`). This change must alter every copy the same way, which is the drift the principle names.
    - Response: one owner, `autobyteus-ios/scripts/select-release-xcode.sh`, called by both jobs.
    - The default path lives once, in the workflow `env` (`:40`). The script requires `IOS_XCODE_APP_PATH` and fails loudly when it is empty; it has no second default.
  - Triggers ruled out:
    - Persisted data: none (CI only).
    - Empty indirection: the script owns the rule (the floor, the parse, the failure); it does not forward.
    - Shared folder: it sits beside the other iOS release scripts.
- Deliberate deviations: none.
- Root cause classification: `Duplicated Policy Or Coordination`, for the structure. The trigger itself is an outdated toolchain pin.
- Refactor needed now: `Yes`, the small extraction above, because both copies change in this ticket anyway.
- Evidence: S-02, S-06.
- Design response: D-1…D-4 below.
- Residual risk: R-001 (the archive job is proven only at a real upload).

### Decisions

- **D-1 Runner:** `runs-on: xcode-27` for `build-ios` and `upload-testflight`. `macos-latest` has no Xcode 27 (S-04), and `xcode-27` is GA (S-05). The two labels stay literal; the contract check enforces both.
- **D-2 Xcode:** default `IOS_XCODE_APP_PATH` = `/Applications/Xcode_27.2.app`, the newest released Xcode on the image. Not the 27.3 beta, which App Store Connect does not accept for distribution, and not the moving `Xcode.app` symlink: the project pins an explicit path (S-09). When GitHub removes 27.2 from the image, the script's error lists the installed Xcode apps, and the repository variable or a one-line change moves the pin.
- **D-3 Guard (REQ-003):** the script fails before any build when:
  - the app path is missing; the error lists `/Applications/Xcode*.app`;
  - the `Xcode` line of `xcodebuild -version` is missing or its major version is below 27;
  - the major version of `xcrun --sdk iphoneos --show-sdk-version` is below 27.

  Each error names the found version and the path. On success it appends `DEVELOPER_DIR` to `$GITHUB_ENV` and logs "Selected Xcode app: …", the full `xcodebuild -version` output and "Selected iPhoneOS SDK: …". These are the lines AC-001 reads. The minimum version 27 is one constant in the script.
- **D-4 Contract check:** replace the Xcode 26 strings with checks that:
  - both jobs run on `xcode-27`;
  - the workflow default is `/Applications/Xcode_27.2.app`;
  - both jobs have a step "Select Xcode 27 or newer" that runs `autobyteus-ios/scripts/select-release-xcode.sh`, before "Install XcodeGen";
  - the script contains the floor 27 for both the Xcode and the SDK check and does not pipe `xcodebuild -version`;
  - no "Xcode_26" or "Xcode 26" text remains in the workflow.

## Terminology

- **Toolchain rule:** the requirement that the selected Xcode and its iPhoneOS SDK are major version 27 or newer.

## Legacy Removal Policy (Mandatory)

- Obsolete paths: the two inline select steps, the Xcode 26 default and the two in-step fallbacks.
- Compatibility kept: `None`. No Xcode 26 fallback (requirements, Non-Goals).

## Persisted Data / State Transition Decision

`Not Affected`: the change is to CI configuration only.

## Data-Flow Spine Inventory

| Spine ID | Scope | Behavior | Start | End | Owner | Why |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary | BEH-001, BEH-003 | tag / dispatch | simulator build, core tests, smoke pass | `build-ios` job | AC-001 |
| DS-002 | Primary | BEH-001 | publish-enabled tag / dispatch | IPA uploaded to TestFlight | `upload-testflight` job | The binary Apple checks |
| DS-003 | Bounded local | BEH-002 | `IOS_XCODE_APP_PATH` | `DEVELOPER_DIR` set, or the job fails | `select-release-xcode.sh` | The toolchain rule |

## Primary Execution Spine(s)

- DS-001: `Tag/Dispatch → prepare-release → build-ios on xcode-27 → select-release-xcode.sh (Xcode 27.2, SDK 27.2) → XcodeGen → demo build → xcodebuild build/test → simulator smoke → artifacts`
- DS-002: `Tag/Dispatch(publish) → build-ios → publish-secret-gate → upload-testflight on xcode-27 → select-release-xcode.sh → archive → export → upload`
- DS-003: `path → app exists? → DEVELOPER_DIR → xcodebuild -version → major ≥ 27? → iPhoneOS SDK → major ≥ 27? → export + log`

## Spine Narratives (Mandatory)

| Spine ID | Narrative | Nodes | Owner | Off-Spine |
| --- | --- | --- | --- | --- |
| DS-001 | A release or a manual run builds and tests the app with the one selected toolchain | job, select script, xcodebuild | `build-ios` | contract check |
| DS-002 | A founder-approved upload archives with the same toolchain | job, select script, archive/upload | `upload-testflight` | secret gate |
| DS-003 | The script turns a path into a verified toolchain or a clear failure | script | script | — |

## Spine Actors / Main-Line Nodes

The `build-ios` and `upload-testflight` jobs, `select-release-xcode.sh`, `xcodebuild`.

## Ownership Map

- **Workflow `env`:** owns the default path, in one place.
- **Jobs:** own the runner label and their sequence.
- **`select-release-xcode.sh`:** owns the toolchain rule (floor, parse, failure, export, log).
- **Contract check:** owns the static wiring rules.

## Thin Entry Facades / Public Wrappers

N/A.

## Removal / Decommission Plan (Mandatory)

| Item | Why Unnecessary | Replaced By | Notes |
| --- | --- | --- | --- |
| Inline "Select Xcode 26 or newer" step ×2 (`release-ios.yml:125-155`, `:391-421`) | Duplicated rule | "Select Xcode 27 or newer" → `select-release-xcode.sh` | — |
| Fallbacks `${IOS_XCODE_APP_PATH:-/Applications/Xcode_26.3.app}` ×2 | A second default | `env.IOS_XCODE_APP_PATH` only; the script fails when it is empty | — |
| Contract-check Xcode 26 strings (`:198-220`) | Replaced rule | D-4 checks | — |
| Xcode 26 text in RELEASE.md:523 and `autobyteus-ios/README.md:134,139` | Outdated | Xcode 27 text | — |

## Return Or Event Spine(s)

N/A.

## Bounded Local / Internal Spines

DS-003 above. Parent: the job's select step.

## Off-Spine Concerns Around The Spine

| Concern | Spine | Serves | Responsibility | Why | Risk If Misplaced |
| --- | --- | --- | --- | --- | --- |
| Contract check | DS-001 | release wiring | Static rules for labels, path and step | Catches drift before a release | — |

## Ownership Boundaries

The workflow calls the script; the script does not read workflow files. The contract check reads the workflow and the script as text.

## Boundary Encapsulation Map

| Boundary | Encapsulates | Callers | Forbidden Bypass | Fix |
| --- | --- | --- | --- | --- |
| `select-release-xcode.sh` | floor, parse, export | both macOS jobs | an inline copy of the rule in a job | call the script |

## Dependency Rules

- Jobs → script (by path, after checkout).
- Script → `IOS_XCODE_APP_PATH`, `GITHUB_ENV` (both from the environment; fails loudly when missing).
- Process-wide bindings: none.

## Interface Boundary Mapping

| Interface | Subject | Responsibility | Identity Shape | Notes |
| --- | --- | --- | --- | --- |
| `select-release-xcode.sh` (env `IOS_XCODE_APP_PATH`, `GITHUB_ENV`; exit 0/1) | release toolchain | verify and export | an Xcode app path | Owns the rule; not a forwarder |

## Interface Boundary Check

| Interface | Singular | Explicit | Ambiguity | Action |
| --- | --- | --- | --- | --- |
| select script | Yes | Yes | Low | — |

## Main Domain Subject Naming Check

| Node | Name | Natural | Consistent | Drift | Action |
| --- | --- | --- | --- | --- | --- |
| script | `select-release-xcode.sh` | Yes | Yes (the step reads "Select Xcode 27 or newer") | Low | — |

## Existing Capability / Subsystem Reuse Check

| Need | Existing | Decision | Why |
| --- | --- | --- | --- |
| Toolchain rule | inline steps | Create New (extracted) | Two copies of one rule |
| Wiring checks | `ios-release-contract-check.py` | Extend | It owns the iOS release wiring rules |

## Subsystem / Capability-Area Allocation

| Area | Owns | Spine | Decision |
| --- | --- | --- | --- |
| `autobyteus-ios/scripts/` (iOS release scripts) | the toolchain rule, the contract check | DS-001…003 | Extend |

## Draft File Responsibility Mapping

See the final mapping.

## Reusable Owned Structures Check

| Repeated Logic | Shared File | Owner | Why | Redundant Removed | Overlap Removed | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Xcode select + guard | `autobyteus-ios/scripts/select-release-xcode.sh` | iOS release scripts | Same meaning, must change together | Yes (the second default goes) | Yes | A general "CI setup" script (XcodeGen, simulator) |

## Shared Structure / Data Model Tightness Check

N/A: no data structures.

## Final File Responsibility Mapping

| File | Owner | Concern |
| --- | --- | --- |
| `.github/workflows/release-ios.yml` | iOS release workflow | runner labels, the default path, steps that call the script |
| `autobyteus-ios/scripts/select-release-xcode.sh` (new, executable) | iOS release scripts | the toolchain rule |
| `autobyteus-ios/scripts/ios-release-contract-check.py` | iOS release scripts | D-4 |
| `RELEASE.md`, `autobyteus-ios/README.md` | docs | the Xcode 27 rule, the default, the script |

## Applied Patterns

None.

## Target Subsystem / Folder / File Mapping

As the final mapping above. No folders are added.

## Folder Boundary Check

| Folder | Depth | Clear | Risk | Note |
| --- | --- | --- | --- | --- |
| `autobyteus-ios/scripts/` | Off-Spine Concern (release tooling) | Yes | Low | Existing home of the iOS release scripts |

## Concrete Examples / Shape Guidance

| Topic | Good | Avoided | Why |
| --- | --- | --- | --- |
| Step | `- name: Select Xcode 27 or newer` / `run: autobyteus-ios/scripts/select-release-xcode.sh` | Two inline copies with their own fallback paths | One rule, one place |
| Failure | `::error::Selected Xcode must be 27 or newer; found '26.3' at /Applications/Xcode_26.3.app.` and `::error::Selected iPhoneOS SDK must be 27 or newer; found '26.2' (Xcode at …).` | A log line only | Apple checks the SDK (REQ-003) |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate | Why Considered | Decision | Replacement |
| --- | --- | --- | --- |
| Keep `macos-latest` with an Xcode 26 fallback | Fewer changes | Rejected | `xcode-27` only; the guard refuses anything older |

## Change / Refactor Sequence

1. Add the script and replace both inline steps; set both runner labels and the default path.
2. Update the contract check (D-4), then run it locally. Check negatively too: it must fail with the floor or the default reverted.
3. Run the script locally against Xcode 26.1.1 (`IOS_XCODE_APP_PATH=/Applications/Xcode.app GITHUB_ENV=$(mktemp)`). It must exit 1 with the Xcode error (AC-003).
4. Update RELEASE.md and the iOS README.
5. Push the branch; build-only dispatch `publish_app_store_connect=false` (AC-001, DESIGN.md rule 12). Record the log lines.

## Key Tradeoffs

- **Pinning 27.2** gives reproducible builds; the cost is one line to move when GitHub drops 27.2. Following the image default (`Xcode.app`) would move by itself, but builds would change under us without a commit. The project chose pinning (S-09).

## Risks

- **R-001:** the archive/upload job is not exercised by a build-only run. It shares the runner, script and default with `build-ios`, enforced by the contract check. It is proven at the next founder-approved upload, whose App Store Connect email should carry no ITMS-90725.
- **Queueing:** `xcode-27` capacity may queue jobs longer than `macos-latest` did. This is acceptable; there is no deadline inside a run.

## Guidance For Implementation

- Reproduction to start from: S-01 (beta.3 log: SDK 26.2) and probe run 44725773809 (`probe/ios-xcode27-571`, two-line change). The fix must log Xcode 27.2 / SDK 27.2 on the final branch's build-only run.
- Keep the step parsing the full `xcodebuild -version` output (no pipe; the contract check forbids it).
- Do not upload, tag or release (REQ-005).
