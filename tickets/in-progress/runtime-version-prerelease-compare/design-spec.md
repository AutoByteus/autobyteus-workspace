# Design Spec

## Solution And Approval Basis

- Current solution revision ID: `SR-001`
- Approved requirements baseline: `requirements-doc.md` at SR-001, approved by the Solution Designer within the direction (user informed)
- Behavior-defining supplements: None
- User approval of the design, when the direction requires it: `Not required`
- Design status: `Ready`
- Canonical investigation-notes path: `tickets/in-progress/runtime-version-prerelease-compare/investigation-notes.md`
- Authorities read: `references/architecture-design.md`, `references/design-principles.md` (read earlier in this conversation), project `DESIGN.md` (unchanged since; `git diff 3ef5e33eec HEAD -- DESIGN.md` is empty), `GLOSSARY.md` (no version terms)
- Project design-principle conflicts or discrepancies: None

## Current-State Read

`runtime-version.ts` is the shared owner of runtime versions. `extractRuntimeVersion` returns the first `(\d+)\.(\d+)\.(\d+)` in a text (`:5-6`), and `compareRuntimeVersions` compares three numbers (`:9-17`). It serves `readRuntimeVersion` (installed, `:23-29`) and every strategy's `readLatestVersion`: Codex `:46`, Antigravity `:38`, Grok `:27`, Claude `:63`, DeepSeek Harness `:36`. `AgentRuntimeStatusService` compares with it for "update available" (`:200`, `:299`) and "update succeeded" (`:341`). Two minimum-version gates keep private copies of the same rule: Grok's `compareVersions` (`grok-build-capability.ts:50-58`, gate `:93-94`) and AGY's `parseVersion`/`isAgyCompactionDetectionSupported` (`antigravity-cli-capability.ts:121-133`). Versions are never stored.

## Task Size And Architectural Risk (Mandatory)

- Task size: `Small`
- Size rationale: one shared module rewritten in place (two functions), two private copies replaced by calls to it, one new unit test file plus a few status-service cases. About 3 source files and 3 test files.
- Architectural risk: `Low`
- Risk rationale: no API, contract, persistence, security, concurrency or ownership change; the module keeps its names and callers; released versions without a prerelease order exactly as today.
- Escalation trigger: a runtime whose real version text has a hyphen after `x.y.z` that is not a prerelease.

## Architecture Investigation Evidence

| Source / Command / Probe | Exact Path / Reference | Observation | Design Decision Supported | Remaining Uncertainty |
| --- | --- | --- | --- | --- |
| Code | `runtime-version.ts:4-29` | `x.y.z` only | Rewrite the rule in place | — |
| Code | `grok-build-capability.ts:50-58,93-94`; `antigravity-cli-capability.ts:121-133` | Private copies | Use the shared owner | — |
| Command | `--version` of five installed runtimes (investigation notes) | Real texts | Parser stops at whitespace and other non-identifier characters | — |
| Evidence | autobyteus-387 API-30 | `0.2.2` shown for `0.2.2-rc.1` | Defect confirmed | — |

## Intended Change

`extractRuntimeVersion` returns `x.y.z` plus an optional `-prerelease`, and `compareRuntimeVersions` implements SemVer 2.0.0 precedence. The Grok and AGY gates call them instead of their private copies.

## Change Scope (Mandatory)

- In scope: UC-001…UC-003. Files: `runtime-version.ts`, `grok-build-capability.ts`, `antigravity-cli-capability.ts`, their tests, a new `runtime-version.test.ts`, and status-service test cases.
- Derived consumers: every caller listed in Current-State Read receives the full version and the new ordering. The status rows' `installedVersion`/`latestVersion` (GraphQL strings, web display) show the full version; the web shows the string as is, and no web change is needed.
- Deliberately left alone: each runtime's version sources; page texts; autobyteus-393 item 2.
- Follow-ups: None.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Approved Requirement / Intent And AC IDs | Approved Trigger | Existing Behavior | Approved Change Or Preserved Outcome | Target Production Path / Spine |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | REQ-001/002, AC-001/002/003 | Agent Runtimes page | `x.y.z` only | Full version; precedence | DS-001 |
| BEH-002 | User | REQ-002, AC-005 | Update | `:341` comparison | Precedence | DS-001 |
| BEH-003 | System | REQ-002, AC-003/004 | Readiness gates | Private copies | Shared owner | DS-002 |

## Relevant Supplemental Task Artifacts

None.

## Task Design Health Assessment (Mandatory)

- Change posture: `Bug Fix`
- Current design issue found: `Yes`
- Structural triggers that fire: Repeated coordination (Principle 13): version ordering exists three times (`runtime-version.ts:9-17`, `grok-build-capability.ts:50-58`, `antigravity-cli-capability.ts:121-133`).
- Root cause classification: `Local Implementation Defect` (the shared rule ignores prereleases), plus `Duplicated Policy Or Coordination` in the two gates.
- Refactor needed now: `Yes` (small): the two gates call the shared owner.
- Evidence: Current-State Read.
- Design response: fix the rule once in its owner; remove the copies.
- Refactor rationale: the Task asks for semver precedence for every runtime; leaving the copies keeps two other rules.
- Intentional deferrals and residual risk: none.

## Terminology

- **Runtime version**: `x.y.z` with an optional SemVer prerelease (`-rc.1`), as read from a runtime's version text. Build metadata is not part of it.

## Section Fill Order

Followed.

## Legacy Removal Policy (Mandatory)

- Obsolete paths: Grok's `compareVersions`; AGY's `parseVersion` and its loop.
- Compatibility wrappers, dual paths, or legacy fallbacks kept: `None`.

## Persisted Data / State Transition Decision (Mandatory When Persisted Data May Be Affected)

- Decision: `Not Affected` (versions are in-memory status fields).

## Data-Flow Spine Inventory

| Spine ID | Scope | Related Behavior ID(s) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-001/002 | Agent Runtimes page / update | Row `installedVersion`, `latestVersion`, `updateState`, update outcome | `AgentRuntimeStatusService` | The visible result |
| DS-002 | Primary End-to-End | BEH-003 | Readiness probe | Gate decision | Grok / AGY capability | Same rule |

## Primary Execution Spine(s)

- DS-001: `Agent Runtimes page → GraphQL → AgentRuntimeStatusService.check → strategy.readVersion (readRuntimeVersion → extractRuntimeVersion) + strategy.readLatestVersion (→ extractRuntimeVersion) → compareRuntimeVersions → row → page`
- DS-002: `probe --version → extractRuntimeVersion → compareRuntimeVersions(version, MINIMUM) → gate`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | Each check reads installed and latest versions as full versions and orders them by precedence | runtime version | status service | `runtime-version.ts` |
| DS-002 | A gate reads the probed version and orders it against its minimum with the same rule | runtime version | capability | `runtime-version.ts` |

## Spine Actors / Main-Line Nodes

`AgentRuntimeStatusService`, the strategies, `assertGrokBuildCliSupported`, `isAgyCompactionDetectionSupported`.

## Ownership Map

- `runtime-version.ts`: the one owner of reading and ordering runtime versions.

## Thin Entry Facades / Public Wrappers (If Applicable)

N/A.

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By | Notes |
| --- | --- | --- | --- |
| `compareVersions` (`grok-build-capability.ts:50-58`) and the gate's own regex (`:93`) | Duplicate rule | `extractRuntimeVersion`, `compareRuntimeVersions` | The gate still returns the read version |
| `parseVersion` and the loop in `isAgyCompactionDetectionSupported` (`antigravity-cli-capability.ts:121-133`) | Duplicate rule | `extractRuntimeVersion`, `compareRuntimeVersions(actual, AGY_COMPACTION_DETECTION_MIN_VERSION) >= 0` | Null version → `false`, as today |

## Return Or Event Spine(s) (If Applicable)

N/A.

## Bounded Local / Internal Spines (If Applicable)

N/A.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| `runtime-version.ts` | DS-001/002 | status service, gates | Read and order versions | One rule | Copies drift |

## Ownership Boundaries

Callers use `extractRuntimeVersion` and `compareRuntimeVersions` only; no caller parses version text itself.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) | Upstream Callers | Forbidden Bypass Shape | If Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `runtime-version.ts` | regex, identifier comparison | status service, strategies, two gates | A private version regex or comparison elsewhere in `runtime-management` | Extend the module |

## Dependency Rules

- `runtime-management/grok` and `runtime-management/antigravity-cli-capability.ts` may import `runtime-management/agent-runtimes/runtime-version.ts` (dsh's capability already does, `deepseek-harness-capability.ts:11`).

## Interface Boundary Mapping

| Interface | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `extractRuntimeVersion(text: string \| null \| undefined): string \| null` | version text | First `x.y.z[-prerelease]`; build metadata dropped | text | Regex below |
| `compareRuntimeVersions(left: string, right: string): number` | two runtime versions | SemVer 2.0.0 precedence; negative when `left` is older; 0 when equal | versions as returned by `extractRuntimeVersion` | Same signature as today |

## Interface Boundary Check

| Interface | Responsibility Is Singular? | Identity Shape Is Explicit? | Ambiguous Selector Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| both | Yes | Yes | Low | — |

## Main Domain Subject Naming Check

| Node / Subject | Name | Natural? | Same Meaning Everywhere? | Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- | --- |
| runtime version | `RuntimeVersion` functions | Yes | Yes | Low | Update the doc comments to say "full version" |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area | Decision | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Semver parsing | `runtime-version.ts` | Extend | Existing owner; no `semver` package in the server's dependencies, and two small functions do not justify adding one | — |

## Subsystem / Capability-Area Allocation

| Subsystem | Owns | Spine | Owner Served | Decision | Notes |
| --- | --- | --- | --- | --- | --- |
| `runtime-management/agent-runtimes` | version rule | DS-001/002 | all | Extend | — |

## Draft File Responsibility Mapping

See Final.

## Reusable Owned Structures Check

N/A (the shared owner already exists).

## Shared Structure / Data Model Tightness Check

N/A.

## Final File Responsibility Mapping

| File | Owning Subsystem | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/runtime-management/agent-runtimes/runtime-version.ts` | agent runtimes | owner | Full version reading and precedence | Existing owner | — |
| `autobyteus-server-ts/src/runtime-management/grok/grok-build-capability.ts` | Grok | modify | Gate uses the owner | — | Yes |
| `autobyteus-server-ts/src/runtime-management/antigravity-cli-capability.ts` | AGY | modify | Gate uses the owner | — | Yes |
| `autobyteus-server-ts/tests/unit/runtime-management/agent-runtimes/runtime-version.test.ts` | tests | new | AC-001, AC-003, the AC-002 pair | — | — |
| `…/agent-runtime-status-service.test.ts` | tests | modify | AC-002 row (installed `0.2.2-rc.1`, latest `0.2.2` → `updateAvailable`, row shows `0.2.2-rc.1`), AC-005 update outcome | — | — |
| `…/grok/grok-build-capability.test.ts`, `…/antigravity-cli-capability.test.ts` | tests | keep / extend | AC-004; add one prerelease case each (`1.0.41-rc.1` below Grok's `1.0.41` minimum; `1.2.16-rc.1` not supported for AGY) | — | — |

## Applied Patterns (If Any)

None.

## Target Subsystem / Folder / File Mapping

As in Final File Responsibility Mapping; no new folders.

## Folder Boundary Check

N/A.

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Extraction | `/(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?/` → match `[0]` without build metadata. `grok 1.0.77 (50ca579fa996) [stable]` → `1.0.77`; `rust-v0.167.0` → `0.167.0`; `0.2.2-rc.1` → `0.2.2-rc.1`; `1.2.3+build.5` → `1.2.3` | Taking everything up to the next space (would keep `+build`, or a trailing `)`) | AC-001 |
| Precedence | Compare core numbers; then a version without a prerelease is higher; then identifiers left to right: both numeric (`^\d+$`) → numeric; numeric vs alphanumeric → numeric lower; both alphanumeric → ASCII order; all equal and one set longer → longer higher | `localeCompare`, or numeric parse of `rc.1` | AC-003; locale-independent |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep an `x.y.z`-only variant for gates | Fewer edits | Rejected | One rule |

## Derived Layering (If Useful)

N/A.

## Change / Refactor Sequence

1. Add `runtime-version.test.ts` with AC-001/003 and the AC-002 pair; see it fail on the current code.
2. Rewrite the two functions; tests green.
3. Replace the Grok and AGY copies; add one prerelease case each; their existing tests stay green.
4. Status-service cases for AC-002/AC-005.
5. Run the runtime-management unit folder and the server typecheck (TESTING.md).

## Key Tradeoffs

- Hand-written precedence over adding the `semver` package: two small functions with a full unit table; no new dependency.

## Risks

- RSK-001 (a non-prerelease hyphen suffix): none of the real texts has one.

## Guidance For Implementation

- Reproduction to start from: the new `runtime-version.test.ts` cases fail on the current code (`extractRuntimeVersion("0.2.2-rc.1")` returns `"0.2.2"`; `compareRuntimeVersions("0.2.2", "0.2.2-rc.1")` returns `0`).
- Keep the doc comments truthful ("full version", "SemVer precedence").
