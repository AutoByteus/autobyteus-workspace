# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-agent-sdk-custom-settings/docs/tasks/claude-agent-sdk-custom-settings/requirements.md`
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-agent-sdk-custom-settings/docs/tasks/claude-agent-sdk-custom-settings/investigation-notes.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-agent-sdk-custom-settings/docs/tasks/claude-agent-sdk-custom-settings/design-spec.md`
- Current Review Round: 2
- Trigger: User clarification superseded Round 1: no Server Settings selector/card; automatic Claude Code filesystem settings inheritance.
- Prior Review Round Reviewed: Round 1 report at this same path, now superseded for context only.
- Latest Authoritative Round: 2
- Current-State Evidence Basis: Re-read the updated requirements, investigation notes, and design spec; re-read the architecture-reviewer workflow and shared design principles; inspected current git status showing stale prior settings-card/server-setting implementation artifacts remain in the worktree and must be reconciled during implementation.

## Round History

| Round | Trigger | Prior Unresolved Findings Rechecked | New Findings Found | Review Decision | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Initial settings-card design review | N/A | No | Pass | No | Superseded by later user clarification. |
| 2 | Re-review revised backend-only automatic settings-source design | Yes: Round 1 had no unresolved findings; Round 1 direction is obsolete | No | Pass | Yes | Revised design is simpler, backend-only, and ready for implementation. |

## Reviewed Design Spec

The revised design removes the prior Server Settings selector/card and any durable settings-source persistence. Claude Agent SDK options are centralized in the `runtime-management/claude/client` boundary:

- Runtime turns use `settingSources: ["user", "project", "local"]`.
- Global model discovery uses `settingSources: ["user"]`.
- The existing project-skill-only replacement branch `settingSources: ["project"]` is removed.
- Frontend settings and server settings persistence are explicitly out of scope.

## Task Design Health Assessment Verdict

| Assessment Area | Result (`Pass`/`Fail`) | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | The design classifies the work as a behavior change. | None. |
| Root-cause classification is explicit and evidence-backed | Pass | The design identifies Missing Invariant / Boundary Or Ownership Issue and cites `ClaudeSdkClient` independently constructing turn/discovery SDK options without user settings, plus live SDK probe evidence. | None. |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | The design says refactor is needed now. | None. |
| Refactor decision is supported by the concrete design sections or residual-risk rationale | Pass | The resolver, SDK client updates, removal plan, interface boundaries, and tests all reflect centralizing settings-source policy at the SDK boundary. | None. |

## Prior Findings Resolution Check (Mandatory On Round >1)

| Prior Round | Finding ID | Previous Severity | Current Resolution | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| 1 | N/A | N/A | No unresolved findings to recheck | Round 1 Findings section was `None`. | Round 1 pass decision is obsolete only because user changed product direction. |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? (`Pass`/`Fail`) | Narrative Is Clear? (`Pass`/`Fail`) | Facade Vs Governing Owner Is Clear? (`Pass`/`Fail`/`N/A`) | Main Domain Subject Naming Is Clear? (`Pass`/`Fail`) | Ownership Is Clear? (`Pass`/`Fail`) | Off-Spine Concerns Stay Off Main Line? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Claude runtime turn | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-002 | Claude model catalog | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-003 | Project skill materialization / project settings preservation | Pass | Pass | Pass | Pass | Pass | Pass | Pass |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? (`Pass`/`Fail`) | Reuse / Extend / Create-New Decision Is Sound? (`Pass`/`Fail`) | Supports The Right Spine Owners? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `runtime-management/claude/client` | Pass | Pass | Pass | Pass | Correct authoritative owner for SDK option policy, executable path, auth env, and model-discovery invocation. |
| Claude agent-execution backend | Pass | Pass | Pass | Pass | Keeps prompt/tool/session construction separate from SDK settings-source policy. |
| LLM model catalog | Pass | Pass | Pass | Pass | Remains a facade delegating SDK behavior to `ClaudeSdkClient`. |
| Frontend settings / `ServerSettingsService` | Pass | Pass | Pass | Pass | Correctly marked as unchanged for source selection under the revised product direction. |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? (`Pass`/`Fail`) | Shared File Choice Is Sound? (`Pass`/`Fail`/`N/A`) | Ownership Of Shared Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Runtime/catalog settings-source arrays | Pass | Pass | Pass | Pass | A small resolver avoids hardcoded drift between turns and model discovery. |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Pass`/`Fail`) | Redundant Attributes Removed? (`Pass`/`Fail`) | Overlapping Representation Risk Is Controlled? (`Pass`/`Fail`) | Shared Core Vs Specialized Variant / Composition Decision Is Sound? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `ClaudeSdkSettingSource` literals | Pass | Pass | Pass | N/A | Pass | Direct SDK vocabulary only: `user`, `project`, `local`. |
| Runtime vs catalog source functions | Pass | Pass | Pass | Pass | Pass | Two explicit functions are clearer than one generic selector because runtime and catalog contexts differ. |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? (`Pass`/`Fail`) | Replacement Owner / Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Removal / Decommission Scope Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Existing project-skill-only `settingSources: ["project"]` branch | Pass | Pass | Pass | Pass | Replaced by runtime sources including `user`, `project`, and `local`. |
| Omitted `settingSources` in model discovery | Pass | Pass | Pass | Pass | Replaced by catalog source function returning `user`. |
| Prior proposed Server Settings selector/card | Pass | Pass | Pass | Pass | Revised design says no UI selector/card. The current worktree has stale prior-design UI/server-setting edits that implementation must remove. |
| Prior durable server setting for source selection | Pass | Pass | Pass | Pass | No source-selection persistence remains in the target design. |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? (`Pass`/`Fail`) | Responsibility Matches The Intended Owner/Boundary? (`Pass`/`Fail`) | Responsibilities Were Re-Tightened After Shared-Structure Extraction? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/runtime-management/claude/client/claude-sdk-setting-sources.ts` | Pass | Pass | N/A | Pass | Focused source-policy resolver. |
| `autobyteus-server-ts/src/runtime-management/claude/client/claude-sdk-client.ts` | Pass | Pass | Pass | Pass | Remains SDK invocation boundary and should be the only caller passing `settingSources` to SDK. |
| `autobyteus-server-ts/tests/unit/runtime-management/claude/client/claude-sdk-setting-sources.test.ts` | Pass | Pass | N/A | Pass | Focused resolver tests. |
| `autobyteus-server-ts/tests/unit/runtime-management/claude/client/claude-sdk-client.test.ts` | Pass | Pass | N/A | Pass | Existing mock SDK option tests are the right place. |
| `autobyteus-server-ts/docker/README.md` | Pass | Pass | N/A | Pass | Optional docs update belongs here if touched. |
| Frontend/server-settings files from prior design | Pass | Pass | N/A | Pass | Target responsibility is no change; implementation must remove stale prior-design edits from these files. |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? (`Pass`/`Fail`) | Forbidden Shortcuts Are Explicit? (`Pass`/`Fail`) | Direction Is Coherent With Ownership? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `ClaudeSdkClient` | Pass | Pass | Pass | Pass | May import resolver, auth env, and executable path resolver. |
| Settings-source resolver | Pass | Pass | Pass | Pass | Should stay pure; no UI/server-settings dependency. |
| `ClaudeSession` | Pass | Pass | Pass | Pass | Must not construct source arrays. |
| `ClaudeModelCatalog` | Pass | Pass | Pass | Pass | Must not pass raw SDK options. |
| Frontend settings / `ServerSettingsService` | Pass | Pass | Pass | Pass | Must not be modified for source selection. |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? (`Pass`/`Fail`) | Internal Owned Mechanisms Stay Internal? (`Pass`/`Fail`) | Caller Bypass Risk Is Controlled? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `ClaudeSdkClient` | Pass | Pass | Pass | Pass | Proper authoritative boundary for Agent SDK query options. |
| Settings-source resolver | Pass | Pass | Pass | Pass | Internal to runtime-management client; centralizes source arrays. |
| `ClaudeModelCatalog` facade | Pass | Pass | Pass | Pass | Remains thin and delegates to SDK client. |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? (`Pass`/`Fail`) | Responsibility Is Singular? (`Pass`/`Fail`) | Identity Shape Is Explicit? (`Pass`/`Fail`) | Generic Boundary Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- |
| `getClaudeRuntimeSettingSources()` | Pass | Pass | Pass | Low | Pass |
| `getClaudeCatalogSettingSources()` | Pass | Pass | Pass | Low | Pass |
| `ClaudeSdkClient.startQueryTurn(...)` | Pass | Pass | Pass | Low | Pass |
| `ClaudeSdkClient.listModels()` | Pass | Pass | Pass | Low | Pass |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? (`Pass`/`Fail`) | Folder Matches Owning Boundary? (`Pass`/`Fail`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `runtime-management/claude/client` | Pass | Pass | Low | Pass | Correct for SDK client policy. |
| `autobyteus-server-ts/tests/unit/runtime-management/claude/client` | Pass | Pass | Low | Pass | Correct for resolver and SDK option unit tests. |
| `components/settings` / `ServerSettingsService` | Pass | Pass | Low | Pass | Correct target is no source-selection changes. |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? (`Pass`/`Fail`) | Reuse / Extension Decision Is Sound? (`Pass`/`Fail`) | New Support Piece Is Justified? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| SDK settings-source policy | Pass | Pass | Pass | Pass | Add small resolver under existing Claude runtime client owner. |
| UI controls | Pass | Pass | N/A | Pass | Correctly rejected for this user direction. |
| Durable server setting | Pass | Pass | N/A | Pass | Correctly rejected for this user direction. |
| Docker/runtime docs | Pass | Pass | N/A | Pass | Optional but helpful if implementation touches docs. |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? (`Yes`/`No`) | Clean-Cut Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- |
| Implicit SDK isolation | No | Pass | Pass | Replaced by explicit SDK source arrays. |
| Project-skill-only source replacement | No | Pass | Pass | Replaced by runtime source policy. |
| Server Settings selector from prior design | No in target design | Pass | Pass | Any stale implementation artifacts must be removed. |

## Migration / Refactor Safety Verdict

| Area | Sequence Is Realistic? (`Pass`/`Fail`) | Temporary Seams Are Explicit? (`Pass`/`Fail`) | Cleanup / Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- |
| Resolver addition | Pass | Pass | Pass | Pass |
| Runtime query option update | Pass | Pass | Pass | Pass |
| Model discovery option update | Pass | Pass | Pass | Pass |
| Prior settings UI/server-setting cleanup | Pass | Pass | Pass | Pass |
| Test updates | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? (`Yes`/`No`) | Example Is Present And Clear? (`Pass`/`Fail`/`N/A`) | Bad / Avoided Shape Is Explained When Helpful? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Runtime source list | Yes | Pass | Pass | Pass | Clear `user,project,local` target. |
| Catalog source list | Yes | Pass | Pass | Pass | Clear user-only catalog policy. |
| Project skills | Yes | Pass | Pass | Pass | Avoids old `project` replacement. |
| No UI | Yes | Pass | Pass | Pass | Explicitly rejects source selector/card. |

## Missing Use Cases / Open Unknowns

| Item | Why It Matters | Required Action | Status |
| --- | --- | --- | --- |
| Project-scoped model catalog | Current catalog lacks workspace context, so project/local model aliases may not show globally. | Deferred by design; implement only a future project-scoped catalog API if needed. | Not blocking. |
| SDK isolation for advanced operators | User direction prefers automatic inheritance; normal UI must not expose source selection. | If absolutely needed, keep env-only and do not create UI/server setting without renewed requirements. | Not blocking. |
| Stale prior implementation artifacts | Worktree currently contains previous settings-card/server-setting changes. | Implementation must remove or revert those artifacts to match revised backend-only design. | Implementation guidance, not design blocker. |

## Review Decision

Pass: the revised design is ready for implementation.

## Findings

None.

## Classification

N/A — no blocking design findings.

## Recommended Recipient

`implementation_engineer`

## Residual Risks

- The current worktree contains stale prior-design changes in frontend settings, localization, `ServerSettingsService`, and related tests. Implementation must remove/revert those source-selection UI/server-setting changes and leave only backend SDK-source behavior plus any appropriate docs/tests.
- Keep `getClaudeRuntimeSettingSources()` and `getClaudeCatalogSettingSources()` pure and context-specific. Do not reintroduce a persisted source-selector setting through this resolver.
- If an env-only advanced disable escape hatch is implemented, it must stay out of normal UI and must be explicitly tested; otherwise prefer no disable path for this scope.
- Runtime uses `project` and `local` for the SDK `cwd`. Code review should verify `cwd` remains the intended workspace/project directory and is not accidentally omitted from turn options.
- Docker/remote docs should clarify that `user` means the server process user's home, typically `/root/.claude/settings.json` in Docker.

## Latest Authoritative Result

- Review Decision: Pass
- Notes: Round 2 supersedes Round 1. Proceed with the simplified backend-only design and remove stale prior settings-card/server-setting implementation artifacts.
