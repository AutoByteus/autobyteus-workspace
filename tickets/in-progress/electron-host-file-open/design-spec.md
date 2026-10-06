# Design Spec — Electron host file preview

## Solution And Approval Basis
- Package: `electron-host-file-open`; current solution revision SR-003.
- Requirements: **Approved R1**, originally SR-001, evidence-only SR-002; user go-ahead on 2026-10-06, exact reference `user-approval-r1.md`. No behavior-defining supplements.
- Design status: **Ready**; design revision D1.
- Workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/electron-host-file-open`, branch `codex/electron-host-file-open`.
- Refreshed base: `origin/personal` at `30c3f40d5721124c466d464004b004053173280c`; finalization target `origin/personal`.
- Investigation: same ticket's canonical `investigation-notes.md`, requirements `requirements-doc.md`, history `solution-revision-record.md` (absolute paths in result).
- Authorities read in full: solution-designer SKILL; `references/architecture-design.md`, `design-principles.md`, `templates/design-spec-template.md`; root `DESIGN.md`, root `TESTING.md`, root/web/server AGENTS.md, requirements authority and templates; 2026-10-06. No closer web DESIGN.md found. No design-principle conflict; design-examples N/A — not needed.
- Reproduction disclosure: unchanged real launcher source reproduces the exact refusal at owner level, with historical before/after proof. Exact installed Electron state is unverified. Native changed-build product validation is still required.

## Current-State Read
Explicit Event Monitor action reaches `useEventMonitorFilePreview`; launcher resolves current target and workspace, then shared Files store/tab/viewer. The launcher incorrectly treats `config.workspaceMetadata` as the sole selected-target identity and ignores `config.workspaceId`. It refuses before trusted embedded Electron capability checking. Missing metadata is produced by real dynamic child factories and is permitted by saved member hydration.

Files store and right panel already use workspace IDs, independently of metadata presence. Native byte reading is already correctly separated: text through main IPC, binary through the shared local-file protocol. The defect does not justify changing those authorization boundaries or adding a second viewer/synthetic workspace.

When both projected workspace ID and metadata are absent, selected members still have source launch facts in their root/Team execution owners. Those facts must be exposed through the selected-target boundary rather than guessed from the unrelated global launch workspace. Source root may be null for an execution without a workspace attachment; do not invent a root from the clicked path or a parent with a different workspace.

## Task Size And Architectural Risk
- `task_size`: **Medium**. Six bounded production files inside existing web selected-context/preview ownership, plus focused tests and documentation. No server/Electron runtime implementation changes, new service subsystem or persistence changes.
- `architectural_risk`: **Low**. Additive transient selected-target source identity plus bounded on-demand metadata recovery using the existing workspace owner. No changed wire/schema/API, native permission, remote containment, deployment or persistence contract. Existing context-reference/root and node-binding revision checks govern async publication; no new coordination registry/state machine.
- Source/root field addition is a frontend projection fact, not a new external contract or access policy. Context projection fields keep their existing meaning and lifecycle.
- Escalate as Design Impact if implementation requires synthetic preview scopes, a new native permission/API, persisted-data changes, remote local fallback, broad hydration refactoring, or materially different concurrency/ownership semantics. Missing exact user-runtime attribution must remain disclosed, not silently downgraded to a pass.

## Architecture Investigation Evidence
Canonical investigation E-016–E-023 (SR-003): selected-target factories and public source methods; per-workspace Files content path and visible panel binding; existing metadata cache/query; saved-config failure/restore component tests; native validation and current root-source contracts. Historical supplements establish the root condition, not fixed-build proof.

## Intended Change
1. Use the selected context's explicit `workspaceId` as valid presentation identity even when its metadata projection is null. Metadata absence alone must not reject a native preview.
2. Add the source `workspaceRootPath: string | null` to `ActiveAgentWorkspaceTarget`'s core as a transient snapshot fact. Populate it at existing authoritative target producers; do not extend persisted `AgentRunConfig` or shared server DTOs.
3. If selected ID/required root information is missing, recover metadata from that exact selected source root through the existing workspace metadata owner, via a bounded public action on the active-context facade. Publish recovered ID/metadata only to the still-current captured context, never an unrelated workspace/launch draft.
4. Preserve the launcher runtime branch: embedded binding **and** trusted Electron bridge select local absolute reading; all other desktop clients map to the selected workspace-relative locator. Mobile path stays unchanged.
5. Keep the existing Files store, right panel/tab, read-only intent and byte readers. No preview-specific tab subsystem or synthetic workspace key. Validate that the recovered ID actually binds the visible Files panel.

## Relevant Behavior And Production-Path Map
| Behavior | Approved basis / trigger | Existing evidence | Target path / outcome |
| --- | --- | --- | --- |
| BEH-001 | REQ-001/002, AC-001–003; SCN-001 explicit native file activation | E-002/005/008/012–018 | DS-001: monitor → launcher → selected-context identity/recovery → existing Files store → native boundary → existing Files viewer. Known selected ID bypasses false metadata requirement; absent ID recovers exact source root; read-only, dedupe, selection preserved. |
| BEH-002 | REQ-003, AC-004/005; SCN-002/003 selected remote/mobile path | E-007/009/010 | DS-002: activation → selected root/ID → existing mapper → authorized relative server reader → existing read-only viewer, or localized refusal without content read. No remote host fallback. |
| BEH-003 | REQ-003/004, AC-006; SCN-004 local invalid file | E-008/009 | DS-003: native reader validates bytes → existing file state error → localized viewer alert. Failure to establish selected presentation scope is generic preview failure, not proof of being remote; host-only refusal remains for unmappable non-native paths. |

## Relevant Supplements
- `user-approval-r1.md`: exact approval reference; binding intended R1, not 100% installed-runtime-certainty claim.
- `evidence/baseline-owner-probe.cjs/.json`: controlled unchanged-source refusal and native/remote controls.
- `evidence/historical-owner-probe.cjs/.json`, `evidence/introducing-commit.diff`, `historical-investigation-result.md`: exact introducing-source and release-tag boundary.
- User screenshot: external original path in canonical investigation; illustrative symptom, not normative visual redesign.
- Independent review artifacts: **N/A — not applicable** on configured Medium/Low direct route. Implementation/API/delivery artifacts: **N/A — not yet produced**.

## Task Design Health Assessment
- Posture: Bug Fix. Design issue found: Yes — missing selected-workspace identity invariant in one orchestration path.
- Root cause: **Missing Invariant / Local Implementation Defect**. Existing selection/metadata/byte ownership is otherwise suitable.
- Refactor needed now: **No broad refactor**. Bounded strengthening of selected-target projection and public active-context recovery action; remove the metadata-only identity assumption.
- Relevant structural triggers: authoritative-boundary and capability-reuse apply — launcher must not traverse Org/collaboration indexes or duplicate the root-source selection policy; existing target producers expose exact root and existing workspace owner resolves metadata. Shared-structure tightness applies — add one nullable source fact, not many optional per-runtime fields or duplicated launch DTOs.
- Overloaded subsystem/new-service/persisted-transition triggers do not fire: all work belongs to current web selected-context/preview owners, no persisted fields. Shared-folder/compatibility indirection avoided.
- Rejected unnecessary work: no full-history scans, blanket hydration rewrite, duplicate renderer, arbitrary parent/global fallback, cached second workspace registry, or new native reader. No performance work is required.
- Residual risk: exact installed symptom attribution remains unverified; native product proof and downstream failure-origin routing remain mandatory. Workspace-less sources cannot be guessed; report failure without claiming unsupported host authorization.

## Terminology
Source root = selected execution's saved/current launch workspace fact; projected metadata = nullable frontend ID/root/display descriptor derived from that fact. They are not interchangeable availability signals. Workspace ID scopes existing Files state; native validation authorizes actual local bytes.

## Legacy Removal Policy
Clean-cut replacement of the selected metadata-only identity branch. No version-specific condition, historical DTO support or old/new parallel reader. Preserve legitimate native/remote runtime strategies because they represent different current access contracts, not compatibility modes.

## Persisted Data / State Transition Decision
**Not Affected.** New source-root field exists only in transient target views. Config updates fill existing nullable ID/metadata projection fields. No serialized run/tree/schema or reader/writer meaning changes. No file/history/reference/artifact loss accepted. Migration plan and mandatory migration-convention investigation: N/A — no persisted transformation.

## Data-Flow Spine Inventory
| Spine | Scope / start / end | Owner / purpose |
| --- | --- | --- |
| DS-001 | Primary native: user activation → correctly selected Files preview | Launcher orchestrates; active-context facade owns selected workspace identity; Files store owns preview state; native boundary owns bytes. |
| DS-002 | Primary remote/mobile: activation → contained read-only preview or refusal | Existing selected-workspace mapper/mobile request and authorized server reader. |
| DS-003 | Return/event: loaded bytes/error → file state → viewer status | Existing Files content action/viewer; launcher owns refusal result. |
| DS-004 | Bounded local: capture selection/binding → optional metadata await → currentness check → projection publication/preview | Active-context facade and launcher, attached to DS-001/002. No persistent queue or shared retry policy. |

## Primary Execution Spines And Narratives
DS-001: `AgentEventMonitor explicit action → useEventMonitorFilePreview → selected target/active-context workspace recovery → fileExplorerStore.openFilePreview(readOnly) → preload/main text or local-file protocol → FileExplorerTabs/FileViewer`.

The launcher uses the current selected target's config ID/metadata and source root. With a known ID, native text/binary reading does not wait for unnecessary metadata or tree registration. With no ID but a known source root, the active-context public action resolves/caches metadata through workspaceStore and fills the captured context's existing ID/metadata fields after currentness checks. Then the launcher requests the existing read-only preview, opens the right panel idempotently and selects Files. RightSideTabs reads the same context.config.workspaceId so the file is visible under that ID. No state is assigned to another run's workspace.

DS-002: `explicit action → selected workspace snapshot/mobile context → existing absolute-to-relative mapper → Files/mobile request → protected workspace byte reader → existing viewer`. Source-root exposure is not a new authorization grant. Outside-workspace paths remain refused and no native client-local attempt occurs in a remote-node window.

DS-003: Existing native reader or server returns bytes/error to the existing file state. Missing/unreadable/non-regular local files produce ordinary viewer errors. Failure to recover selected scope is caught as ordinary launcher preview failure, without guessing an unrelated workspace.

## Spine Actors And Ownership Map
- Event Monitor: action trigger and returned status only; passive render performs no access.
- Active-context facade: authoritative selected target and bounded current-target metadata recovery/publication.
- Org, standalone collaboration and Team view owners: exact source root for their selected execution; no preview orchestration.
- Workspace store: root/ID cache, existing metadata-only query, eventual Files-tree registration when needed; no new history or filesystem scan.
- Preview launcher: capture/currentness, runtime locator selection, read-only store request, panel selection; never reads bytes itself.
- Files content actions/store and tab/viewer: existing identity/dedupe/load/error/read-only presentation.
- Electron main/protocol or server: unchanged byte-access authority.

## Thin Facades / Wrappers
Active-context facade is a governing selected-context boundary, not an empty forwarding layer: it validates selection/source/binding and publishes recovered projections. Team public root getter encapsulates source selection behind its existing view. No new forwarding service.

## Removal / Decommission Plan
| Remove | Replacement | Scope |
| --- | --- | --- |
| Selected-target metadata-only derived ID that ignores config ID | Selected ID first, exact-root recovery through active-context boundary only when needed | In this change |
| Equating selected metadata absence with remote/host-only refusal | Existing runtime capability branch plus ordinary recovery/error handling | In this change |
| Test setup that omits real active-target identity while claiming selected-member coverage | Explicit target fixture and cross-owner root/Files binding assertions | In this change |

No unrelated file removals or all-purpose global fallback changes. Existing no-target/mobile behavior outside the selected desktop delta is retained unless evidence proves it must change; do not introduce a compatibility fallback for a selected target.

## Return/Event And Bounded Local Spines
DS-003/004 above. Capture **context identity + run ID + source root + bindingRevision**, not an entire mutable frozen target object reference. Computed target objects may be rebuilt after config updates. Check these semantic identities after metadata awaits and before filling config, opening bytes or switching/focusing the current panel. Recheck selected/binding identity after openFilePreview before UI publication. A superseded activation does not switch the new target's panel or fill another context; use existing failed result if settlement must be surfaced. Do not invent a new user-facing lifecycle policy or generic cancellation registry.

## Off-Spine Concerns
| Concern | Serves | Responsibility |
| --- | --- | --- |
| Source selectors (`teamAgentSourceAt`, current Org/child source lookup) | Target producers | Exact current source root; no unrelated parent inference |
| Metadata cache/query | Active-context recovery | Metadata-only descriptor; not native filesystem authorization |
| Binding/selection checks | Async publication | Avoid filling stale run/root/node context |
| Localization/focus | Launcher/viewer | Existing feedback and active-tab focus; no redesign |
| File type policy | Renderer/store | Existing eligibility, no new types |

## Ownership Boundaries / Encapsulation Map
| Public boundary | Encapsulates | Allowed caller / forbidden bypass |
| --- | --- | --- |
| Active-context `activeWorkspaceTarget` and `resolveWorkspaceMetadataForTarget(target)` | Correct target/source/currentness and metadata publication | Launcher; must not separately inspect Org/collaboration internals or global launch draft for a selected member |
| Team view `getAgentWorkspaceRootPath(agentRunId)` | Existing source selector and per-run placement lookup | Target producer; no launcher source-tree walk |
| Workspace store metadata actions | Cache/query/normalization | Active-context recovery; no copied hash-ID construction or direct Apollo call from launcher |
| Files `openFilePreview(path,id,accessIntent)` | Dedupe/type/native-or-workspace load/file state | Launcher; no direct native IPC/media URL from launcher |
| Main/protocol/server byte reader | Validation/authorization/readable file | Existing store/viewer; no new bypass |

## Dependency Rules
Follow existing dependency direction: target producers → their source owner; active-context facade → workspace public metadata actions; launcher → active-context/Files public actions and runtime policy. No imports from backend/core into web, including tests. No direct active context config fallback from unrelated root/launch draft. No server endpoint or native boundary weakening.

## Interface Boundary Mapping And Checks
| Interface | Subject / explicit identity | Responsibility / check |
| --- | --- | --- |
| `ActiveAgentWorkspaceTarget.workspaceRootPath: string | null` | Exact selected run/member source; already carries context/browse/root identity | One transient source fact. Required nullable field; update real producers/fixtures. No optional compatibility field in persisted config. |
| `TeamExecutionViewState.getAgentWorkspaceRootPath(agentRunId)` | Explicit AgentRun ID inside this Team view | Singular source lookup via existing location/source selector; null when absent, no root fallback |
| `activeContextStore.resolveWorkspaceMetadataForTarget(target)` | Captured selected target with source root/context | Singular metadata recovery; return existing WorkspaceMetadata or null; stale result must not publish |
| Existing `openFilePreview(path,workspaceId,{accessIntent})` | Local abs or mapped relative path, exact ID | Unchanged content boundary; source event-monitor/readOnly=true |

Responsibility/identity singular: Yes. Ambiguous-selector risk: Low; no generic “guess run kind” API. Reuse existing `WorkspaceMetadata`, root normalization and source selectors. Target root field is authoritative launch fact when metadata is absent; do not duplicate a full launch structure.

## Naming Check
`workspaceRootPath`, `getAgentWorkspaceRootPath`, `resolveWorkspaceMetadataForTarget`: concrete subject names, matching existing repository terms. No vague support/helper/service manager.

## Existing Capability Reuse And Subsystem Allocation
Selected-workspace facts: **Extend** existing active-context/root/Team view projections. Metadata recovery: **Reuse** workspace store. Preview: **Reuse** existing launcher/store/viewer and native/server boundaries. No new subsystem/module.

## Draft / Reusable / Final File Responsibility Mapping
No new runtime file needed. Draft and final mapping are the same after reusing existing types/source selectors/metadata owner.
| File | Final responsibility / change |
| --- | --- |
| `autobyteus-web/types/workspace/activeAgentWorkspaceTarget.ts` | Add required nullable source-root fact to target core; do not change external/persisted contracts |
| `autobyteus-web/stores/activeContextStore.ts` | Populate standalone Agent/Team roots and expose bounded metadata recovery action. Known Agent config ID may recover own cache/registry root; Team uses public view getter |
| `autobyteus-web/services/teamExecution/teamExecutionViewState.ts` | Public per-Agent root getter using existing location map and `teamAgentSourceAt` selector; includes configured, collaborator and catalog source semantics |
| `autobyteus-web/stores/agentRunCollaborationStore.ts` | Child target root from `getChild(agentRunId).source.launchConfiguration.workspaceRootPath` (already has exact child source) |
| `autobyteus-web/services/agentOrgExecution/agentOrgExecutionContext.ts` | selectedTarget common source root from selected indexed Agent launchConfiguration |
| `autobyteus-web/composables/useEventMonitorFilePreview.ts` | Selected ID first; exact selected-root recovery when needed; currentness checks and unchanged native/remote preview orchestration |
| Existing colocated tests (plus focused test-owned product probe when needed) | Identity/root matrix, before/after regression, Files binding, errors and stale context/node; no backend imports into web |
| `autobyteus-web/docs/file_explorer.md` / content rendering doc if needed | Synchronize corrected selected-ID/root recovery contract; no new access promise |

Shared structure tightness: existing WorkspaceMetadata and target identity reused; one nullable source fact rather than duplicated caches/full launch DTO. No redundant native preview scope/state representation.

## Applied Patterns / Folder Mapping
Existing immutable target projection and metadata-only action patterns. Changes stay under existing `types/workspace`, `stores`, `services/teamExecution`, `services/agentOrgExecution`, `composables` and colocated tests. Folder boundaries remain clear, no shared/common catch-all or over-splitting. All listed runtime paths Modified; tests/docs Modified or one bounded probe Added. Renames/Move/Remove files: N/A.

## Concrete Shape Guidance
Good: selected task member root `/owned/B`, config ID `B`, metadata null → native absolute link opens under **B**, no metadata lookup required. If ID also null, recover descriptor **only from `/owned/B`** and publish to that same still-selected member; then Files uses recovered B.

Bad: global launch draft is A, selected child is B → restoring old global fallback sends preview/UI state to A. Also bad: derive a workspace from the linked file's directory or let a remote node use desktop-native bytes.

## Backward-Compatibility Rejection Log
- Blind revert to pre-Org/global fallback: Rejected; wrong selected-member identity.
- Version-specific metadata handling or persisted legacy source field: Rejected; use current target facts/current metadata owner.
- Synthetic native-preview workspace / separate tab registry: Rejected; existing exact workspace identity/store can absorb correction.
- New local reader or uncontained remote absolute endpoint: Rejected; unchanged byte boundaries already satisfy approved access.

## Derived Layering
N/A — existing selected projection → launcher → content owner → byte reader → viewer already explains layering; no new layer required.

## Change Sequence
1. Extend target source-root fact and public Team getter; update target-producer fixtures without changing commands/source ownership.
2. Add active-context recovery action reusing current metadata owner, with source/context/binding publication checks.
3. Replace launcher metadata-only ID branch. Keep known-ID native path immediate; recover missing selected ID/root as needed. Keep mobile and remote containment unchanged; no parent/global target fallback.
4. Add regression matrix and integrated Files-panel binding/stale/error assertions; revisit DESIGN.md and TESTING.md while implementing.
5. Run focused web/native boundary checks, build current worktree, and validate isolated native desktop workflow (no user app/data). Synchronize docs through Delivery ownership.

## Verification Guidance (Intent, Not Executed Validation)
- Focused owner tests: known ID + null metadata (native opens without metadata query), both ID/metadata null + exact source root (recovery binds same member), full metadata control, unrelated A/global draft with selected B, configured/collaborator/catalog root lookup, lookup failure, target/root/node switch during pending recovery, repeat-open/read-only/user-tab preservation.
- Integrated right panel: real active-context + Files store + FileExplorerLayout/Tabs. Confirm correct content visibly rendered under selected/recovered ID; no mere opened return counted as UI success. Existing `RightSideTabs.workspaceTarget.spec.ts` must continue preserving unrelated launch A through B metadata failure/recovery.
- Negative runtime: embedded sentinel without bridge, remote Electron window despite bridge, browser outside-workspace, mobile in/out-of-workspace. No arbitrary native call or absolute server request. Existing native regular-file validation and local protocol tests stay green.
- Candidate commands from worktree (always `--run`, exact files confirmed):
  - `pnpm -C autobyteus-web test:nuxt composables/__tests__/useEventMonitorFilePreview.spec.ts stores/__tests__/activeContextStore.spec.ts stores/__tests__/agentRunCollaborationStore.spec.ts services/teamExecution/__tests__/teamExecutionViewState.spec.ts components/layout/__tests__/RightSideTabs.workspaceTarget.spec.ts --run`
  - Relevant `services/agentOrgExecution/__tests__` and existing fileExplorer tests, plus unchanged web-boundary guard/type/build checks.
  - `pnpm -C autobyteus-web test:electron electron/__tests__/localFileValidation.spec.ts electron/local-file-protocol/__tests__/local-file-protocol.spec.ts electron/local-file-protocol/__tests__/local-file-response.spec.ts --run`.
- Isolated native journey: build this worktree (`pnpm --silent isolated-app start --build`, or from-worktree only after a source-current build). Use only owned data/context/workspace and files. Exercise actual selected Team/task member Event Monitor activation to visible Markdown/native content, reopen/dedupe, read-only and invalid-file alert. Metadata-null reproduction may control the existing metadata I/O at a documented test boundary after a normal selected/saved-context publication; do not mutate hidden user app state or claim such fixture as the independent origin of product support. Retain baseline failure separately when establishing the witness.
- Record provider/metadata fixture boundaries, real IPC byte proof, build/source revision, APIs/DOM assertions and supporting screenshots. Native product validation is required, not substituted by the existing VM historical probe/browser view. Stop only the owned instance; retain cleanup receipts.

## Tradeoffs, Risks And Implementation Guidance
Bounded metadata lookup is justified only to recover the missing exact presentation identity. Known-ID native preview must not wait for lookup, tree registration, full history or unrelated discovery. The existing metadata query can fail; surface ordinary preview failure and retain source/selection rather than invent authorization or unrelated fallback. Do not add a general outage-resilient preview framework under this bug ticket.

The user-state explanation remains a hypothesis until an owned product witness is established. If isolated reproduction identifies a different cause (non-embedded node binding/missing preload, source root absent on normal UI launch), return Design Impact or Requirement Gap with exact evidence rather than claiming this fix resolves that separate condition. Do not broaden remote local access. Preserve all residual limitations; baseline installed app or pre-change binary cannot prove changed source.
