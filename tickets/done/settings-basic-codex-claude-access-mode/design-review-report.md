# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/settings-basic-codex-claude-access-mode/tickets/done/settings-basic-codex-claude-access-mode/requirements.md`
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/settings-basic-codex-claude-access-mode/tickets/done/settings-basic-codex-claude-access-mode/investigation-notes.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/settings-basic-codex-claude-access-mode/tickets/done/settings-basic-codex-claude-access-mode/design-spec.md`
- Upstream Rework Note: `/Users/normy/autobyteus_org/autobyteus-worktrees/settings-basic-codex-claude-access-mode/tickets/done/settings-basic-codex-claude-access-mode/upstream-rework-note.md`
- Current Review Round: 2
- Trigger: Superseding architecture review after user-approved requirement change from three-mode Basic selector to one Codex full-access toggle.
- Prior Review Round Reviewed: Round 1 at this same canonical path.
- Latest Authoritative Round: 2
- Current-State Evidence Basis: Reviewed the revised requirements, investigation notes, design spec, and upstream rework note; rechecked prior round history; statically inspected current branch state, which is ahead of `origin/personal` and contains the now-stale selector implementation (`CodexSandboxModeCard.vue`, selector tests/copy/docs) that must be reworked if this design passes.

## Round History

| Round | Trigger | Prior Unresolved Findings Rechecked | New Findings Found | Review Decision | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Initial Codex-only Basic Settings sandbox-mode selector design | N/A | No | Pass | No | Architecturally sound for the then-approved three-mode selector, but superseded by the later user-approved full-access-toggle requirement. |
| 2 | Revised Codex-only Basic Settings full-access toggle design | No unresolved findings from round 1 | No | Pass | Yes | Revised design is actionable and correctly keeps backend/runtime semantics broader than the simplified Basic UI. |

## Reviewed Design Spec

`/Users/normy/autobyteus_org/autobyteus-worktrees/settings-basic-codex-claude-access-mode/tickets/done/settings-basic-codex-claude-access-mode/design-spec.md`

## Prior Findings Resolution Check (Mandatory On Round >1)

| Prior Round | Finding ID | Previous Severity | Current Resolution | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| 1 | N/A | N/A | No prior unresolved findings. | Round 1 report recorded `Findings: None`. | Round 1 result is superseded by a requirement change, not by unresolved architecture findings. |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? | Narrative Is Clear? | Facade Vs Governing Owner Is Clear? | Main Domain Subject Naming Is Clear? | Ownership Is Clear? | Off-Spine Concerns Stay Off Main Line? | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-002 | Primary End-to-End | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-003 | Primary End-to-End | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-004 | Return-Event | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| Codex full-access store-sync local spine | Bounded Local | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| Codex full-access toggle mapping local spine | Bounded Local | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| Server predefined validation local spine | Bounded Local | Pass | Pass | N/A | Pass | Pass | Pass | Pass |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? | Reuse / Extend / Create-New Decision Is Sound? | Supports The Right Spine Owners? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Web Settings UI | Pass | Pass | Pass | Pass | `CodexFullAccessCard` correctly owns the simplified Basic decision; it must replace the stale selector surface. |
| Web Settings Store | Pass | Pass | Pass | Pass | Existing `serverSettingsStore.updateServerSetting` remains the only frontend write path. |
| Server Settings Service | Pass | Pass | Pass | Pass | Backend validation remains authoritative and intentionally accepts all runtime-valid values for Advanced/API paths. |
| Config Persistence | Pass | Pass | Pass | Pass | Reuses `AppConfig.set`; no new persistence path. |
| Codex Runtime Management | Pass | Pass | Pass | Pass | Shared Codex sandbox-mode owner remains correct because runtime semantics are still three-valued even though Basic UI is binary. |
| Codex Execution Backend | Pass | Pass | Pass | Pass | Create/resume runtime flows consume the shared normalizer and are not coupled to the Basic toggle abstraction. |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? | Shared File Choice Is Sound? | Ownership Of Shared Structure Is Clear? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Codex sandbox key/default/modes/type guard/normalizer | Pass | Pass | Pass | Pass | Must remain server-side Codex sandbox semantics, not `full access` UI semantics. |
| Basic toggle-to-canonical-value mapper | Pass | N/A | Pass | Pass | Correctly stays local to `CodexFullAccessCard`: on -> `danger-full-access`, off -> `workspace-write`. |
| Frontend toggle label/warning copy | Pass | N/A | Pass | Pass | Presentation copy belongs in the card/localization catalogs. |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Overlapping Representation Risk Is Controlled? | Shared Core Vs Specialized Variant / Composition Decision Is Sound? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `CodexSandboxMode` | Pass | Pass | Pass | Pass | Three runtime-valid values remain the right backend/runtime model. |
| `CODEX_APP_SERVER_SANDBOX_SETTING_KEY` | Pass | Pass | Pass | Pass | One canonical server-side key source remains correct. |
| Basic full-access checked state | Pass | Pass | Pass | Pass | Boolean is a UI-derived view, not a persisted setting or backend type. |
| `ServerSettingDescription` validation extension | Pass | Pass | Pass | Pass | Narrow predefined validation is still the right service-level extension. |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? | Replacement Owner / Structure Is Clear? | Removal / Decommission Scope Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Bootstrapper-local default/mode constants | Pass | Pass | Pass | Pass | Continue to remove duplicated runtime constants in favor of the shared Codex setting owner. |
| Custom-row treatment for Codex sandbox key | Pass | Pass | Pass | Pass | Predefined metadata resolves the Advanced Settings mislabeling. |
| Basic three-mode selector idea / stale selector implementation | Pass | Pass | Pass | Pass | Revised design names the selector as rejected and targets `CodexFullAccessCard`; implementation must remove/rename stale selector component/tests/copy. |
| Claude Basic Settings work | Pass | Pass | Pass | Pass | Claude remains deferred/unchanged; no hidden stubs. |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? | Responsibility Matches The Intended Owner/Boundary? | Responsibilities Were Re-Tightened After Shared-Structure Extraction? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/runtime-management/codex/codex-sandbox-mode-setting.ts` | Pass | Pass | Pass | Pass | Keeps runtime-valid modes centralized. |
| `autobyteus-server-ts/src/services/server-settings-service.ts` | Pass | Pass | Pass | Pass | Owns predefined metadata and value validation, not UI simplification. |
| `autobyteus-server-ts/src/agent-execution/backends/codex/backend/codex-thread-bootstrapper.ts` | Pass | Pass | Pass | Pass | Keeps runtime fallback/logging timing. |
| `autobyteus-server-ts/src/agent-execution/backends/codex/history/codex-thread-history-reader.ts` | Pass | Pass | Pass | Pass | Resume remains aligned with create path. |
| `autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread-config.ts` | Pass | Pass | Pass | Pass | Runtime config type should import the shared `CodexSandboxMode`. |
| `autobyteus-web/components/settings/CodexFullAccessCard.vue` | Pass | Pass | N/A | Pass | Correct UI boundary name for a one-toggle full-access card. |
| `autobyteus-web/components/settings/ServerSettingsManager.vue` | Pass | Pass | N/A | Pass | Page composition only; no duplicated sandbox state. |
| Localization files/catalogs | Pass | Pass | N/A | Pass | Should remove stale selector option copy and add full-access toggle/warning copy. |
| Backend/frontend tests | Pass | Pass | N/A | Pass | Must be updated from selector assertions to toggle assertions. |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? | Forbidden Shortcuts Are Explicit? | Direction Is Coherent With Ownership? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Frontend card -> store/localization | Pass | Pass | Pass | Pass | Card must not import GraphQL, `AppConfig`, or runtime files. |
| Store/GraphQL -> service | Pass | Pass | Pass | Pass | Transport remains thin; no validation migration into resolver. |
| ServerSettingsService -> Codex sandbox setting owner | Pass | Pass | Pass | Pass | Correct dependency on Codex semantics, not on bootstrapper internals. |
| Codex bootstrap/history -> shared Codex setting owner | Pass | Pass | Pass | Pass | Runtime does not consume the Basic full-access boolean. |
| Claude scope | Pass | Pass | Pass | Pass | Explicitly forbidden for this ticket. |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? | Internal Owned Mechanisms Stay Internal? | Caller Bypass Risk Is Controlled? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `serverSettingsStore` | Pass | Pass | Pass | Pass | Basic card uses the established frontend settings boundary. |
| `ServerSettingsService` | Pass | Pass | Pass | Pass | Rejects invalid predefined values before `AppConfig.set`. |
| Codex sandbox setting file | Pass | Pass | Pass | Pass | Shared runtime/server valid-value semantics are not duplicated. |
| Codex bootstrap/history | Pass | Pass | Pass | Pass | Runtime session timing stays separate from settings persistence. |
| `CodexFullAccessCard` | Pass | Pass | Pass | Pass | UI owns only the binary presentation/mapping; it does not redefine accepted runtime modes. |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? | Responsibility Is Singular? | Identity Shape Is Explicit? | Generic Boundary Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| `serverSettingsStore.updateServerSetting(key, value)` | Pass | Pass | Pass | Low | Pass |
| GraphQL `updateServerSetting` | Pass | Pass | Pass | Low | Pass |
| `ServerSettingsService.updateSetting(key, value)` | Pass | Pass | Pass | Low after planned validation | Pass |
| `ServerSettingsService.getAvailableSettings()` | Pass | Pass | Pass | Low | Pass |
| `toCodexFullAccessSandboxValue(checked)` or local equivalent | Pass | Pass | Pass | Low | Pass |
| `normalizeCodexSandboxMode(rawValue)` or equivalent | Pass | Pass | Pass | Low | Pass |
| `buildCodexThreadConfig({ sandbox })` | Pass | Pass | Pass | Low | Pass |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? | Folder Matches Owning Boundary? | Mixed-Layer Or Over-Split Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/runtime-management/codex/codex-sandbox-mode-setting.ts` | Pass | Pass | Low | Pass | Correct Codex runtime-management boundary. |
| `autobyteus-server-ts/src/services/server-settings-service.ts` | Pass | Pass | Medium but controlled | Pass | Generic service remains appropriate because only descriptor validation is added. |
| `autobyteus-server-ts/src/agent-execution/backends/codex/...` | Pass | Pass | Low | Pass | Existing create/resume/config owners consume shared semantics. |
| `autobyteus-web/components/settings/CodexFullAccessCard.vue` | Pass | Pass | Low | Pass | Correct settings UI folder; old `CodexSandboxModeCard.vue` should not remain as the Basic UI. |
| `autobyteus-web/localization/messages/...` | Pass | Pass | Low | Pass | Existing settings catalog workflow remains correct. |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? | Reuse / Extension Decision Is Sound? | New Support Piece Is Justified? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Friendly Basic settings UI | Pass | Pass | Pass | Pass | Extends existing card/toggle patterns. |
| Frontend persistence | Pass | Pass | N/A | Pass | Reuses server settings store. |
| Server metadata/validation | Pass | Pass | N/A | Pass | Extends `ServerSettingsService`. |
| Codex runtime semantics | Pass | Pass | Pass | Pass | New Codex-owned file remains justified. |
| Localization | Pass | Pass | N/A | Pass | Existing catalogs/generation path noted. |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? | Clean-Cut Removal Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- |
| Arbitrary `CODEX_APP_SERVER_SANDBOX` values | No target retention | Pass | Pass | Predefined key rejects invalid values; valid runtime values remain accepted for Advanced/API. |
| Basic three-mode selector | No target retention | Pass | Pass | Replace with one full-access toggle. |
| Bootstrapper constants | No target retention | Pass | Pass | Duplicates are removed/replaced by shared imports. |
| Claude access-mode parity | No | Pass | Pass | Deferred due to different semantics. |
| Setting key migration | No | Pass | Pass | Same canonical key remains. |

## Migration / Refactor Safety Verdict

| Area | Sequence Is Realistic? | Temporary Seams Are Explicit? | Cleanup / Removal Is Explicit? | Verdict |
| --- | --- | --- | --- | --- |
| Shared Codex setting extraction before consumers | Pass | Pass | Pass | Pass |
| ServerSettingsService validation extension | Pass | Pass | Pass | Pass |
| Rework stale Basic selector into full-access toggle | Pass | Pass | Pass | Pass |
| Tests/docs rework after stale implementation | Pass | Pass | Pass | Pass |
| Downstream reroute through implementation/code review/validation | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? | Example Is Present And Clear? | Bad / Avoided Shape Is Explained When Helpful? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Codex-only Basic UI naming/scope | Yes | Pass | Pass | Pass | Clear good/bad examples distinguish full-access toggle from selector/generic runtime card. |
| Toggle mapping | Yes | Pass | Pass | Pass | Explicit on/off canonical values are present. |
| Shared mode owner | Yes | Pass | Pass | Pass | Prevents service/runtime value-list drift. |
| Save path | Yes | Pass | Pass | Pass | Preserves existing authoritative boundaries. |
| Future-session copy | Yes | Pass | Pass | Pass | Avoids implying live-session mutation. |

## Missing Use Cases / Open Unknowns

| Item | Why It Matters | Required Action | Status |
| --- | --- | --- | --- |
| Exact localization generation command | Avoids stale generated catalogs. | Implementation must follow repository localization workflow and include generated files if required. | Residual implementation risk, not a design blocker. |
| Pre-existing `read-only` value | Basic UI intentionally cannot represent `read-only` except as “not full access.” | Card initializes unchecked; saving while off normalizes to `workspace-write`; Advanced/API still accept `read-only`. | Covered by design. |
| Current branch already contains selector implementation/docs/tests | Repository-resident artifacts are stale relative to revised requirements. | Route back through implementation, then code review and validation after rework. | Covered by design/rework note. |
| Save interaction details | The user-facing requirement is one full-access toggle and canonical value persistence. | Implementation must ensure toggle behavior satisfies the acceptance criteria; avoid leaving a three-option selector or copy. | Residual implementation check. |

## Review Decision

- `Pass`: the revised design is ready for implementation rework.

## Findings

None.

## Classification

N/A — no blocking findings.

## Recommended Recipient

`implementation_engineer`

## Residual Risks

- Stale selector files/tests/localization/docs from the earlier implementation must be removed, renamed, or rewritten around `CodexFullAccessCard`; do not keep both selector and toggle surfaces.
- Backend/server validation must continue accepting all runtime-valid values (`read-only`, `workspace-write`, `danger-full-access`) even though Basic UI only writes two of them.
- The Basic UI must initialize unchecked for absent, invalid, `workspace-write`, and `read-only`, and checked only for `danger-full-access`.
- `danger-full-access` copy must clearly say there is no filesystem sandboxing.
- This requirement change affects repository-resident UI/tests/docs, so after implementation rework it should proceed through code review and validation again before delivery.

## Latest Authoritative Result

- Review Decision: Pass
- Notes: Round 2 supersedes the earlier selector approval. Proceed to implementation rework for the Codex-only full-access toggle design.
