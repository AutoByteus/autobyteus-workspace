# Design Spec

## Solution And Approval Basis

- Current SR: `SR-001`.
- Approved requirements: `requirements-doc.md` at SR-001, approved by the Solution Designer within the direction (user informed, 2026-11-20).
- Supplements: none.
- User approval of the design: `Not required`.
- Design status: `Ready`.
- Investigation notes: `investigation-notes.md`.
- Authorities read (2026-11-20): `references/architecture-design.md`, `references/design-principles.md`, `DESIGN.md` (rule 11: no test-only production code; rule 12: a workflow change needs the build-only release run).
- Conflicts: none.

## Current-State Read

Five independent, local defects, each in its existing owner (investigation S-01…S-11):
1. dead GraphQL documents and one dead server mutation;
2. a test fixture whose interpreter start-up races a 1 s deadline;
3. a path comparison broken by symlinks;
4. a structural test that missed two new child cards;
5. a duplicated, loose simulator choice.

## Task Size And Architectural Risk (Mandatory)

- Task size: `Medium`. About 14 files across the web (two GraphQL modules, the generated types, the demo list, two specs), the server (one resolver file and its unit test), iOS (one test, the smoke script, a new chooser script) and the iOS workflow and contract check. Each change is local to its owner.
- Architectural risk: `Low`.
  - The one contract change removes a GraphQL mutation with no caller (S-03); DESIGN.md rule 9 rules out cross-version compatibility.
  - The workflow change is bounded and proven by a build-only run (rule 12).
  - No persistence, security, concurrency or ownership change.
- Escalation trigger: if removing the mutation breaks a caller not found by search (`codegen:check`, the typechecks, the server suites), or the simulator chooser fails on the runner, implementation returns a `Design Impact`.

## Architecture Investigation Evidence

See investigation notes S-01…S-11. The decisions below cite them.

## Intended Change

Delete the dead GraphQL code, make three tests deterministic for the product's real behavior, and give the iOS simulator choice one exact owner.

## Change Scope (Mandatory)

- **In scope:** UC-001…005.
  - **Web:** `graphql/mutations/agentMutations.ts`, `graphql/queries/collaboratorQueries.ts`, `generated/graphql.ts` (codegen), `demo/graphql/unreachable-operations.json`, `electron/server/__tests__/PortOwnerInspectorFaults.spec.ts`, `components/settings/__tests__/ServerSettingsBasicsPanel.spec.ts`.
  - **Server:** `src/api/graphql/types/agent-run.ts`, `tests/unit/api/graphql/types/agent-run.test.ts`.
  - **iOS:** `AutoByteusMobileCoreTests/SavedNodeEntryKeysMigrationTests.swift`, `scripts/ios-simulator-smoke.sh`, new `scripts/select-ios-simulator.py`, `scripts/ios-release-contract-check.py`.
  - **CI:** `.github/workflows/release-ios.yml`.
  - **Docs:** wherever the removed mutation or the simulator choice is described (implementation searches; at least `autobyteus-ios/README.md` if it names the choice).
- **Derived consumers:**
  - generated types (regenerated);
  - the demo operation check (its list is updated);
  - the WebSocket approval path (unchanged, it never used the mutation).
- **Deliberately left alone:**
  - `restoreAgentRun` and `agentRunCollaborationMemberProjection` (FU-001);
  - the stale probes (FU-002);
  - `portOwnerInspector.ts` and its 1000 ms deadline;
  - the update cards' copy;
  - `NativeNodeNameReadsTests.swift` (unaffected, S-09).
- **Follow-ups:** FU-001, FU-002.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior | Requirement / AC | Trigger | Change | Path |
| --- | --- | --- | --- | --- |
| BEH-001 | REQ-001 / AC-001 | GraphQL client | remove | DS-001 |
| BEH-002 | REQ-002 / AC-002 | Electron suite | fixture | DS-002 |
| BEH-003 | REQ-003 / AC-003 | iOS core tests | path compare | DS-002 |
| BEH-004 | REQ-004 / AC-004 | web unit suite | stubs | DS-002 |
| BEH-005 | REQ-005 / AC-005 | release run / local smoke | chooser | DS-003 |

## Relevant Supplemental Task Artifacts

None.

## Task Design Health Assessment (Mandatory)

- Change posture: `Cleanup`.
- Current design issue found: `Yes`, small ones.
- **Structural triggers:**
  - **Repeated coordination (Principle 13):** the simulator choice is copied in the workflow and the smoke script (S-11). Response: one owner, `autobyteus-ios/scripts/select-ios-simulator.py`.
  - **Legacy cleanup / dead code (Principles 7, 8):** the three documents, their list entries and reason, and the server mutation are removed with their evidence (S-01, S-03, S-04).
  - Ruled out:
    - Persisted data: none.
    - Empty indirection: the chooser owns a rule (exact name, newest runtime the Xcode can run, explicit fallback); it does not forward.
- Deviations: none.
- Root cause:
  - `Duplicated Policy Or Coordination` for FU-001;
  - `Local Implementation Defect` for the three tests, in test code;
  - dead code for FU-002.
- Refactor needed now: `Yes`, the chooser extraction only.
- Residual risk: R-001 (an extreme load on sh).

### Decisions

- **D-1 (REQ-001):**
  - Delete `RestoreAgentRun` and `ApproveToolInvocation` from `agentMutations.ts`, and `GetAgentRunCollaborationMemberProjection` from `collaboratorQueries.ts`.
  - Delete the server's `approveToolInvocation` resolver method and the `ApproveToolInvocationInput` / `ApproveToolInvocationResult` classes in `agent-run.ts`, plus imports that become unused. Delete the unit-test case and imports (`agent-run.test.ts:23,103`, and its `it` block).
  - Regenerate `generated/graphql.ts` with `codegen:local`; `codegen:check` must pass.
  - Remove the three entries and the "unused" reason from `unreachable-operations.json`.
  - The web docs that say the web does not call `RestoreAgentRun` (`docs/agent_execution_architecture.md:356`, `docs/agent_integration_minimal_bridge.md:45`) remain true. Leave them, or reword only if they name the deleted constant as existing.
- **D-2 (REQ-002):** in the deadline case only, replace the Node fixture with a sh fixture:
  ```
  #!/bin/sh
  echo $$ > '<receipt>'
  printf 'p123\ncpartial-before-timeout\n'
  exec sleep 5
  ```
  `exec` keeps the same pid (the receipt names the process the inspector owns) and forks no descendant. The `script()` helper writes `#!${process.execPath}`; add a small sibling (for example `shellScript(body)`) or a shebang parameter. Keep every assertion (elapsed ≥ 900 and < 3000, no signal from production, ESRCH for the pid).
- **D-3 (REQ-003):** `let iosRoot = URL(…#filePath…)…resolvingSymlinksInPath()`. For each `url`, use `url.resolvingSymlinksInPath().path`, then cut by `iosRoot.path.count + 1`.
- **D-4 (REQ-004):** add stubs `ShowInternalAgentsCard` (`data-testid="show-internal-agents-card-stub"`) and `UpdateChecksCard` (`data-testid="update-checks-card-stub"`), and assert both exist. The `not.toContain('GitHub')` assertion stays, now over the panel's own content.
- **D-5 (REQ-005):** `autobyteus-ios/scripts/select-ios-simulator.py`, Python 3 with the standard library only, executable. It:
  1. reads `IOS_SIMULATOR_NAME` (default "iPhone 17");
  2. runs `xcrun --sdk iphonesimulator --show-sdk-version` (the bound) and `xcrun simctl list devices available -j`;
  3. takes the iOS runtimes (`com.apple.CoreSimulator.SimRuntime.iOS-X-Y`) with version ≤ the bound, newest first;
  4. returns the first device whose `name` equals the wanted name on the newest such runtime that has one;
  5. otherwise, the first iPhone on the newest runtime, with a stderr notice "No '<name>' simulator; using '<device>' (iOS X.Y)";
  6. otherwise, it fails with exit 1 and an error.

  It prints the UDID only on stdout, and the chosen "name (iOS X.Y)" on stderr.
  - **Callers:** the workflow step `UDID="$(autobyteus-ios/scripts/select-ios-simulator.py)"` and `ios-simulator-smoke.sh` (the same line). Both awk copies are removed.
  - **Contract check:** require the script in both places and no `awk` simulator match left in either.

## Terminology

- **Newest usable runtime:** the newest installed iOS simulator runtime whose version is not above the selected Xcode's iOS simulator SDK.

## Legacy Removal Policy (Mandatory)

- Obsolete: as D-1 and the awk copies.
- Compatibility kept: `None`.

## Persisted Data / State Transition Decision

`Not Affected`.

## Data-Flow Spine Inventory

| Spine | Scope | Start | End | Owner |
| --- | --- | --- | --- | --- |
| DS-001 | Primary | GraphQL request | resolver | server GraphQL schema |
| DS-002 | Bounded local | test run | assertions | each test |
| DS-003 | Primary | release run / smoke | simulator UDID → xcodebuild destination | `select-ios-simulator.py` |

## Primary Execution Spine(s)

- DS-003: `release-ios.yml build-ios (after Select Xcode 27) → select-ios-simulator.py → IOS_SIMULATOR_DESTINATION → xcodebuild build/test → ios-simulator-smoke.sh → select-ios-simulator.py → xcodebuild UI smoke`

## Spine Narratives (Mandatory)

| Spine | Narrative | Owner |
| --- | --- | --- |
| DS-003 | Both the release job and the smoke ask one chooser for the device; it applies the exact-name and newest-usable-runtime rule | chooser script |

## Spine Actors / Main-Line Nodes

The workflow step, the smoke script, the chooser, and `xcodebuild`.

## Ownership Map

The chooser owns the simulator rule; its callers own their xcodebuild runs.

## Thin Entry Facades / Public Wrappers

N/A.

## Removal / Decommission Plan (Mandatory)

| Item | Why | Replaced By |
| --- | --- | --- |
| `RestoreAgentRun`, `ApproveToolInvocation` (`agentMutations.ts`); `GetAgentRunCollaborationMemberProjection` (`collaboratorQueries.ts`) | Dead: no import (S-01) | — |
| Their generated types | Follow the documents and the schema | codegen |
| `unreachable-operations.json` entries ×3 and the "unused" reason | Dead once the documents go; the check fails on stale entries (S-04) | — |
| Server `approveToolInvocation` mutation, `ApproveToolInvocationInput`, `ApproveToolInvocationResult`, its unit-test case | Dead: only its own test calls it (S-03) | WebSocket `APPROVE_TOOL` (unchanged) |
| awk simulator choice ×2 | Duplicated, loose | `select-ios-simulator.py` |

## Return Or Event Spine(s)

N/A.

## Bounded Local / Internal Spines

DS-002 for each test.

## Off-Spine Concerns Around The Spine

The contract check guards the chooser's use (D-5).

## Ownership Boundaries / Boundary Encapsulation Map

| Boundary | Encapsulates | Callers | Forbidden Bypass |
| --- | --- | --- | --- |
| `select-ios-simulator.py` | the runtime/name rule | the workflow, the smoke script | an inline device match |

## Dependency Rules

- The workflow and the smoke script call the chooser.
- The chooser calls `xcrun` under the caller's `DEVELOPER_DIR`, so the workflow's chooser step runs after "Select Xcode 27 or newer".
- No process-wide bindings.

## Interface Boundary Mapping / Check

| Interface | Subject | Shape | Notes |
| --- | --- | --- | --- |
| `select-ios-simulator.py` (env `IOS_SIMULATOR_NAME`; stdout UDID; exit 0/1) | iOS simulator choice | a device name | Singular; not a forwarder |

## Main Domain Subject Naming Check

`select-ios-simulator.py` matches the sibling `select-release-xcode.sh` (571). No drift.

## Existing Capability / Subsystem Reuse Check

| Need | Existing | Decision |
| --- | --- | --- |
| simulator rule | two awk copies | Create New (extracted), in `autobyteus-ios/scripts/` |
| wiring guard | `ios-release-contract-check.py` | Extend |

## Subsystem / Capability-Area Allocation

The iOS release scripts (`autobyteus-ios/scripts/`), the web GraphQL documents, the server GraphQL types, and each test's own file.

## Draft / Final File Responsibility Mapping

As Change Scope. One concern per file.

## Reusable Owned Structures Check

The simulator rule is extracted (D-5). Nothing else repeats.

## Shared Structure / Data Model Tightness Check

N/A.

## Applied Patterns

None.

## Target Subsystem / Folder / File Mapping

New file `autobyteus-ios/scripts/select-ios-simulator.py`; everything else is modified in place.

## Folder Boundary Check

`autobyteus-ios/scripts/`: release tooling. Clear.

## Concrete Examples / Shape Guidance

| Topic | Good | Avoided |
| --- | --- | --- |
| Chooser | iPhone 17 on iOS 27.2 under Xcode 27.2 | iPhone 17e on iOS 27.0 (substring, oldest runtime); an iOS 27.3 beta runtime under Xcode 27.2 |
| Deadline fixture | `#!/bin/sh` … `exec sleep 5` | `#!node`, whose start-up races the 1 s deadline under load; a wait loop for a receipt that a killed child never writes |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate | Decision | Replacement |
| --- | --- | --- |
| Keep the dead mutation "in case a client uses it" | Rejected (no caller; DESIGN.md rule 9) | — |
| Keep the awk choice as a fallback | Rejected | the chooser's explicit fallback rule |

## Change / Refactor Sequence

1. **D-1:** delete the documents and the server mutation; `codegen:local`; update the demo list. Run `codegen:check`, both typechecks, the server unit tests for `agent-run`, the web unit suite and the demo build check.
2. **D-2:** the Electron spec. Run it 20× under CPU load (record), plus the Electron suite.
3. **D-3:** the iOS test. Run the core tests from a plain path and from a checkout under `/tmp` (record).
4. **D-4:** the Basics spec. Web unit suite green.
5. **D-5:** chooser, callers, contract check.
   - Run locally under Xcode 26.1.1: it chooses the newest local runtime's iPhone 17, and with a missing `IOS_SIMULATOR_NAME` it falls back with a notice.
   - Push and run the build-only `release-ios.yml` dispatch with `publish_app_store_connect=false`; the log shows iPhone 17 on iOS 27.2 (rule 12).

## Key Tradeoffs

- **D-2 changes the interpreter of one fixture rather than the deadline.** The deadline is the production behavior under test.
- **DEC-002 keeps two test-only fields** for now (FU-001), to keep this Task small.

## Risks

- R-001: extreme load on sh.
- R-002: a hidden caller of the mutation; mitigated by codegen and the suites.

## Guidance For Implementation

- **Reproductions to start from:**
  - FU-006: on the base, `ServerSettingsBasicsPanel.spec.ts` fails (279 `DEL-03b` log).
  - FU-005: the iOS core tests from a `/tmp` checkout fail (279 `FS-iOS-run1/2` logs).
  - FU-003: shown by the recorded log (S-06); not reliably reproducible on demand.
  - FU-001: the 571 probe log (iPhone 17e on iOS 27.0).
- No upload, tag or release. The iOS run is build-only.
