# Design Spec — Electron host file preview

## Solution And Approval Basis
- Package: `electron-host-file-open`; current solution revision SR-004.
- Requirements: **Approved R1**, originally SR-001, evidence-only SR-002; user go-ahead on 2026-10-06, exact reference `user-approval-r1.md`. No behavior-defining supplements.
- Design status: **Ready**; design revision D2; supersedes D1 presentation contract, retains implemented selected-identity correction.
- Workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/electron-host-file-open`, branch `codex/electron-host-file-open`.
- Refreshed base: `origin/personal` at `30c3f40d5721124c466d464004b004053173280c`; finalization target `origin/personal`.
- Investigation: same ticket's canonical `investigation-notes.md`, requirements `requirements-doc.md`, history `solution-revision-record.md` (absolute paths in result).
- Authorities read in full: solution-designer SKILL; `references/architecture-design.md`, `design-principles.md`, `templates/design-spec-template.md`; root `DESIGN.md`, root `TESTING.md`, root/web/server AGENTS.md, requirements authority and templates; 2026-10-06. No closer web DESIGN.md found. No design-principle conflict; design-examples N/A — not needed.
- Reproduction disclosure: unchanged real launcher source reproduces the exact refusal at owner level, with historical before/after proof. Exact installed Electron state is unverified. IR-001 supplies a real isolated native byte/binding witness with controlled saved-projection and initial-metadata boundaries, but only after manual Files reveal. D2 changed-build one-activation visibility remains unvalidated; exact installed state remains unverified.

## Current-State Read
Original source rejected a selected target with missing workspaceMetadata before checking native capability, ignoring config.workspaceId. D1's six-file selected-identity correction is now implemented in source/test commit `17e1e201a1bfc3cbc2d566df34d773c1915c102c`. Known selected IDs work without metadata; missing IDs recover only from that member's source root through the active-context owner. Native bytes and correct B binding were demonstrated in IR-001, with the documented I/O controls.

DI-001 establishes a second incomplete segment: `openRightPanel()` changes global dock preference, not the private `WorkspaceToolShell.isRightDrawerOpen`. At the ordinary ~992 CSS px window the responsive policy yields a strip; file activation populated B but rendered no contentViewer until a second, manual Files-strip click. Mounted RightSideTabs checks cannot prove the enclosing shell reveal.

Fresh tabs hosts also apply contextual defaults. The launcher calls passive `setActiveTab`, which is overwritten by Activity/Team/Org defaults on first/new-scope mount. The existing `selectTabExplicitly` already carries pending explicit intent to the next host; use it rather than invent new tab state. The actual-source probe confirms this owner behavior (E-027), not D2 DOM success.

The actual launcher is dynamically imported/created by AgentEventMonitor only inside the action handler, after setup. Therefore an injected shell action cannot be looked up in that late call: capture the local shell capability in **AgentEventMonitor setup** and explicitly pass it to the late-created launcher. All desktop Agent/Team/Org/task monitors are descendants of WorkspaceToolShell; mobile monitors are not and retain their separate inline path.

Files store/viewer and native/server byte boundaries remain suitable. No synthetic workspace, second drawer registry, new native reader or viewport policy copy is justified. Source workspace roots can still be null; do not infer from a linked path or unrelated draft/parent.

## Task Size And Architectural Risk
- `task_size`: **Medium**. Nine cumulative production files (six D1 plus shell, monitor and one small typed layout-injection contract); D2 adds three files and revises the existing launcher. Focused tests and documentation stay within current selected-context/preview and shell ownership. No server/Electron runtime implementation changes, new service subsystem or persistence changes.
- `architectural_risk`: **Low**. Additive transient selected-target source identity plus bounded on-demand metadata recovery using the existing workspace owner. No changed wire/schema/API, native permission, remote containment, deployment or persistence contract. Existing context-reference/root and node-binding revision checks govern async publication. The mounted shell gains a scoped action over its own existing dock/drawer state; no ownership move, cross-window routing, new coordination registry or state machine. Existing explicit-tab lifecycle is reused without changing tab-default policy.
- The scoped reveal interface is an internal Vue ownership boundary, not a new external API; shell remains the sole drawer/presentation owner. Source/root field addition is a frontend projection fact, not a new external contract or access policy. Context projection fields keep their existing meaning and lifecycle.
- Escalate as Design Impact if implementation requires synthetic preview scopes, a new native permission/API, persisted-data changes, remote local fallback, broad hydration refactoring, or materially different concurrency/ownership semantics. Missing exact user-runtime attribution must remain disclosed, not silently downgraded to a pass.

## Architecture Investigation Evidence
Canonical investigation E-024–E-030 (SR-004) records the DI-001 native evidence, local shell and lazy caller boundaries, actual-source explicit-tab/policy probe, focus lifecycle and test limitations. E-016–E-023 (SR-003): selected-target factories and public source methods; per-workspace Files content path and visible panel binding; existing metadata cache/query; saved-config failure/restore component tests; native validation and current root-source contracts. Historical supplements establish the root condition, not fixed-build proof.

## Intended Change
1. Use the selected context's explicit `workspaceId` as valid presentation identity even when its metadata projection is null. Metadata absence alone must not reject a native preview.
2. Add the source `workspaceRootPath: string | null` to `ActiveAgentWorkspaceTarget`'s core as a transient snapshot fact. Populate it at existing authoritative target producers; do not extend persisted `AgentRunConfig` or shared server DTOs.
3. If selected ID/required root information is missing, recover metadata from that exact selected source root through the existing workspace metadata owner, via a bounded public action on the active-context facade. Publish recovered ID/metadata only to the still-current captured context, never an unrelated workspace/launch draft.
4. Preserve the launcher runtime branch: embedded binding **and** trusted Electron bridge select local absolute reading; all other desktop clients map to the selected workspace-relative locator. Mobile path stays unchanged.
5. Keep the existing Files store/viewer, read-only intent and byte readers. No preview-specific tab subsystem or synthetic workspace key. Validate that the recovered ID binds visible content.
6. Replace the launcher's global preference/passive-tab pair with a single **mounted-shell `revealTool('files')` capability**. The shell selects Files explicitly before mounting a tabs host, opens the shared preference, reevaluates its existing responsive state, and either shows the dock or sets its own drawer open. It is idempotent, never a strip toggle. See DS-005 contract below.
7. Capture that capability in monitor setup; preserve lazy launcher import and explicit-action-only reads. Pass the captured action to the launcher, guard origin disposal/run changes, await shell rendering and preserve existing file-tab focus after reveal. Mobile uses its existing inline path with no shell action.

## Relevant Behavior And Production-Path Map
| Behavior | Approved basis / trigger | Existing evidence | Target path / outcome |
| --- | --- | --- | --- |
| BEH-001 | REQ-001/002, AC-001–003; SCN-001 explicit native file activation | E-002/005/008/012–018 | DS-001: monitor → launcher → selected-context identity/recovery → existing Files store → native boundary → mounted-shell explicit Files reveal → existing Files viewer. Known selected ID bypasses false metadata requirement; absent ID recovers exact source root; read-only, dedupe, selection preserved. |
| BEH-002 | REQ-003, AC-004/005; SCN-002/003 selected remote/mobile path | E-007/009/010 | DS-002: activation → selected root/ID → existing mapper → authorized relative server reader → existing read-only viewer, or localized refusal without content read. No remote host fallback. |
| BEH-003 | REQ-003/004, AC-006; SCN-004 local invalid file | E-008/009 | DS-003: native reader validates bytes → existing file state error → shell-revealed localized viewer alert, without a second user action. Failure to establish selected presentation scope is generic preview failure, not proof of being remote; host-only refusal remains for unmappable non-native paths. |

## Relevant Supplements
- `user-drawer-clarification.md`: reported user confirmation of automatic default Files drawer reveal after DI-001 explanation; same R1 visible outcome, no always-drawer/dock/mobile policy change.
- `user-approval-r1.md`: exact approval reference; binding intended R1, not 100% installed-runtime-certainty claim.
- `evidence/baseline-owner-probe.cjs/.json`: controlled unchanged-source refusal and native/remote controls.
- `evidence/historical-owner-probe.cjs/.json`, `evidence/introducing-commit.diff`, `historical-investigation-result.md`: exact introducing-source and release-tag boundary.
- User screenshot: external original path in canonical investigation; illustrative symptom, not normative visual redesign.
- Independent review artifacts: **N/A — not applicable** on configured Medium/Low direct route. Implementation artifacts: `implementation-design-impact.md` DI-001, `implementation-handoff.md`, `implementation-revision-record.md` IR-001 and linked native/test/build/cleanup evidence (implementation-owned, retained). API/E2E and Delivery: **N/A — not yet performed**.
- `evidence/design-reveal-owner-probe.cjs/.json`: SR-004 source/policy investigation; controlled owners, not D2 product validation.
- `evidence/native-visual.json`, `native-recovered-brief.png`, `native-after-manual-files.png`, `native-stop.json`: returned IR-001 native failure/manual-control/cleanup evidence; full boundaries in investigation.

## Task Design Health Assessment
- Posture: Bug Fix. Design issue found: Yes — missing selected-workspace identity invariant plus incomplete shell-owned reveal interaction (DI-001).
- Root cause: **Missing Invariant / Local Implementation Defect** for original refusal; **Boundary Or Ownership Issue** for DI-001: launcher mistakes dock preference for effective presentation and bypasses explicit-tab lifecycle. Existing selection/metadata/byte and shell ownership remain suitable.
- Refactor needed now: **Yes, bounded boundary strengthening; no broad refactor**. Retain D1 selected-target correction. Add one mounted-shell capability, pass it from setup into the lazy launcher, and clean-cut remove the launch-specific dock/passive-tab orchestration. No generic drawer/tab framework or relocation of owners.
- Relevant structural triggers: authoritative-boundary and capability-reuse apply — launcher must not traverse Org/collaboration indexes or duplicate the root-source selection policy; existing target producers expose exact root and existing workspace owner resolves metadata. Shell exposes its actual presentation action rather than allowing launcher to duplicate responsive policy or mutate private refs. Existing explicit-tab action is the authoritative lifecycle entrypoint. Shared-structure tightness applies — add one nullable source fact, not many optional per-runtime fields or duplicated launch DTOs.
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
| DS-001 | Primary native: user activation → correctly selected, visibly revealed Files preview | Launcher orchestrates; active-context facade owns identity; Files store owns preview; native boundary owns bytes; mounted shell owns effective presentation. |
| DS-002 | Primary remote/mobile: activation → contained read-only preview or refusal | Existing selected-workspace mapper/mobile request and authorized server reader. |
| DS-003 | Return/event: loaded bytes/error → file state → revealed viewer status | Existing Files content action/viewer; shell reveal exposes ordinary error state; launcher owns refusal result. |
| DS-004 | Bounded local: capture selection/binding → optional metadata await → currentness check → projection publication/preview | Active-context facade and launcher, attached to DS-001/002. No persistent queue or shared retry policy. |
| DS-005 | Bounded presentation: setup-bound shell action → explicit Files choice → dock/drawer reveal → Vue mount → file-tab focus | WorkspaceToolShell owns dock/drawer state and reuses current responsive policy/tab lifecycle; monitor supplies setup-bound capability and origin-currentness predicate; launcher requests reveal after store settlement. |

## Primary Execution Spines And Narratives
DS-001: `AgentEventMonitor explicit action → useEventMonitorFilePreview (captured shell capability passed in) → selected target/active-context workspace recovery → fileExplorerStore.openFilePreview(readOnly) → preload/main text or local-file protocol → shell.revealTool(files) → RightSideTabs mount/explicit intent → FileExplorerTabs/FileViewer`.

The launcher uses the current selected target's config ID/metadata and source root. With a known ID, native text/binary reading does not wait for unnecessary metadata or tree registration. With no ID but a known source root, the active-context public action resolves/caches metadata through workspaceStore and fills the captured context's existing ID/metadata fields after currentness checks. Then the launcher requests the existing read-only preview and awaits the mounted shell reveal action (DS-005), rechecking currentness before UI publication and focus. RightSideTabs reads the same context.config.workspaceId so the file is visibly presented under that ID without a separate strip click. No state is assigned to another run's workspace.

DS-002: `explicit action → selected workspace snapshot/mobile context → existing absolute-to-relative mapper → Files/mobile request → protected workspace byte reader → existing viewer`. Source-root exposure is not a new authorization grant. Outside-workspace paths remain refused and no native client-local attempt occurs in a remote-node window.

DS-003: Existing native reader or server returns bytes/error to the existing file state. Missing/unreadable/non-regular local files produce ordinary viewer errors; successful store settlement includes error state and must still request shell reveal. Failure to recover selected scope is caught as ordinary launcher preview failure, without guessing an unrelated workspace.

## DS-005 — Scoped Shell Reveal Contract (D2)
- New typed contract in `composables/layout/useWorkspaceToolReveal.ts`: `WorkspaceToolReveal = (tab: WorkspaceToolName) => Promise<boolean>`, typed InjectionKey, and `useWorkspaceToolReveal(): WorkspaceToolReveal | null`. The consumer calls inject synchronously in setup (with null default for mobile/no provider); no global state, callback registry, event bus or fallback.
- WorkspaceToolShell provides exactly its own action during setup. A component-lifetime flag turns false in onBeforeUnmount; a disposed capability returns false without selecting tabs or opening anything. For a live run shell, in one synchronous sequence: **selectTabExplicitly(tab)**; set shared right-panel preference visible (same approved desktop open intent as D1); read the existing reactive responsive state's **post-preference** presentation; if docked, leave/clear transient drawer state, otherwise set isRightDrawerOpen=true. Do not invoke the existing toggle-like strip handler. Await nextTick to settle host mount, return live flag; no delayed state publication after await.
- Explicit tab selection precedes host creation. Existing pendingExplicitTab/useContextualDefaultTab consumes that intent once and preserves Files; no new tab state or changed contextual-default policy. A wide user-hidden panel can become docked after preference change; never decide from the pre-change strip alone or numeric breakpoints. Existing responsive watcher handles drawer→dock transition; a later viewport change retains existing product behavior (no sticky new auto-reopen intent).
- AgentEventMonitor captures the nullable capability in setup only. Its explicit handler retains lazy launcher import, captures origin run identity, and guards monitor disposal/run change before invocation/results. Pass `{ revealTool, isOriginCurrent }` into the launcher; the predicate captures monitor live/run identity for this activation. Include that predicate in launcher currentness before bytes, reveal, return and delayed focus. Pass the injected action itself, not a second presentation wrapper. Do not eagerly create/read files during setup. All supported desktop run monitors have the enclosing shell; mobile intentionally does not.
- The launcher's options are explicit/required. Mobile branches first and keeps requestFilePreview inline unchanged. Desktop with no captured reveal capability returns the existing ordinary failed result without reading/opening a hidden store-only preview; do not return host-only or fall back to global preference.
- After the existing store action settles (including a stored missing/non-regular-file error), launcher checks semantic selection/root/binding, awaits revealTool('files'), then checks success/currentness before returning opened/scheduling focus. Native/remote locator decisions and bytes do not move into shell. Keep the existing guarded post-render file-tab focus; schedule it **after** reveal flush so accessible drawer's initial focus does not win over the intended file tab. The existing drawer captures/restores origin, traps Tab and handles Escape; do not call a strip-only remember trigger with a fabricated nav/tab element.
- Boolean success is lifecycle/render-flush acceptance, not proof of bytes or rendered content. Actual UI/byte validation is mandatory. Existing setTimeout focus may be retained after awaited reveal (and checked currentness); it is not a visibility mechanism. No production DOM-click/query determines which presentation opens.
- Start-surface launch toggles/storage and mobile tools have no new consumer or behavior; preserve them. Presentation requests are only the approved desktop Event Monitor action; passive message arrivals, file-store watchers and other tab users do not gain auto-reveal.

## Spine Actors And Ownership Map
- Conversation feed/renderer: action trigger only; passive render performs no access.
- Active-context facade: authoritative selected target and bounded current-target metadata recovery/publication.
- Org, standalone collaboration and Team view owners: exact source root for their selected execution; no preview orchestration.
- Workspace store: root/ID cache, existing metadata-only query, eventual Files-tree registration when needed; no new history or filesystem scan.
- Preview launcher: capture/currentness, runtime locator selection, read-only store request and one shell-reveal request; never reads bytes itself or resolves viewport/drawer state.
- Monitor: capture shell action in setup, retain lazy explicit-action launcher, suppress obsolete origin callbacks/results.
- WorkspaceToolShell: sole effective dock/drawer reveal owner, typed scoped action and mount lifetime. Existing tab owner handles explicit intent; accessible drawer owns modal focus/Escape/return.
- Files content actions/store and tab/viewer: existing identity/dedupe/load/error/read-only presentation.
- Electron main/protocol or server: unchanged byte-access authority.

## Thin Facades / Wrappers
Active-context facade is a governing selected-context boundary, not an empty forwarding layer: it validates selection/source/binding and publishes recovered projections. Team public root getter encapsulates source selection behind its existing view. No new forwarding service. Typed layout injection module contains the scoped capability contract/key/setup consumer only; it has no mutable state, registration table or presentation policy.

## Removal / Decommission Plan
| Remove | Replacement | Scope |
| --- | --- | --- |
| Selected-target metadata-only derived ID that ignores config ID | Selected ID first, exact-root recovery through active-context boundary only when needed | In this change |
| Equating selected metadata absence with remote/host-only refusal | Existing runtime capability branch plus ordinary recovery/error handling | In this change |
| Launcher global openRightPanel + passive setActiveTab pair | One local shell reveal action with existing explicit-tab intent; other preference/passive callers remain unchanged | D2 |
| Test setup that omits real active-target identity while claiming selected-member coverage | Explicit target fixture and cross-owner root/Files binding assertions | In this change |

No unrelated file removals or all-purpose global fallback changes. Existing no-target/mobile behavior outside the selected desktop delta is retained unless evidence proves it must change; do not introduce a compatibility fallback for a selected target.

## Return/Event And Bounded Local Spines
DS-003/004 above. Capture **context identity + run ID + source root + bindingRevision**, not an entire mutable frozen target object reference. Computed target objects may be rebuilt after config updates. Check these semantic identities after metadata awaits and before filling config, opening bytes or switching/focusing the current panel. Recheck selected/binding identity after openFilePreview before UI publication, and after the awaited shell render before scheduling focus. The captured shell action returns false without state changes if disposed; monitor guards its own run/disposal across lazy import/results and passes that predicate for launcher reveal/focus checks. No post-await shell state mutation. A superseded activation does not switch the new target's panel or fill another context; use existing failed result if settlement must be surfaced. Do not invent a new user-facing lifecycle policy or generic cancellation registry.

## Off-Spine Concerns
| Concern | Serves | Responsibility |
| --- | --- | --- |
| Source selectors (`teamAgentSourceAt`, current Org/child source lookup) | Target producers | Exact current source root; no unrelated parent inference |
| Metadata cache/query | Active-context recovery | Metadata-only descriptor; not native filesystem authorization |
| Binding/selection checks | Async publication | Avoid filling stale run/root/node context |
| Localization/focus | Launcher/viewer/drawer | Existing feedback, post-reveal active-file focus, accessible drawer entry/Escape/return; no new focus trap |
| File type policy | Renderer/store | Existing eligibility, no new types |

## Ownership Boundaries / Encapsulation Map
| Public boundary | Encapsulates | Allowed caller / forbidden bypass |
| --- | --- | --- |
| Active-context `activeWorkspaceTarget` and `resolveWorkspaceMetadataForTarget(target)` | Correct target/source/currentness and metadata publication | Launcher; must not separately inspect Org/collaboration internals or global launch draft for a selected member |
| Team view `getAgentWorkspaceRootPath(agentRunId)` | Existing source selector and per-run placement lookup | Target producer; no launcher source-tree walk |
| Workspace store metadata actions | Cache/query/normalization | Active-context recovery; no copied hash-ID construction or direct Apollo call from launcher |
| Mounted-shell `revealTool(tab)` | Effective dock/drawer reveal, explicit tab intent, component lifetime | Origin monitor/launcher; no direct drawer mutation, DOM clicks, breakpoint copy or global registry |
| Files `openFilePreview(path,id,accessIntent)` | Dedupe/type/native-or-workspace load/file state | Launcher; no direct native IPC/media URL from launcher |
| Main/protocol/server byte reader | Validation/authorization/readable file | Existing store/viewer; no new bypass |

## Dependency Rules
Follow existing dependency direction: target producers → their source owner; active-context facade → workspace public metadata actions; launcher → active-context/Files public actions, runtime policy and injected shell capability. Monitor setup → typed layout injection; shell → existing responsive/tab/preference owners. Launcher must not call useRightPanel/useRightSideTabs directly for reveal or attempt inject after setup. No imports from backend/core into web, including tests. No direct active context config fallback from unrelated root/launch draft. No server endpoint or native boundary weakening.

## Interface Boundary Mapping And Checks
| Interface | Subject / explicit identity | Responsibility / check |
| --- | --- | --- |
| `ActiveAgentWorkspaceTarget.workspaceRootPath: string | null` | Exact selected run/member source; already carries context/browse/root identity | One transient source fact. Required nullable field; update real producers/fixtures. No optional compatibility field in persisted config. |
| `TeamExecutionViewState.getAgentWorkspaceRootPath(agentRunId)` | Explicit AgentRun ID inside this Team view | Singular source lookup via existing location/source selector; null when absent, no root fallback |
| `activeContextStore.resolveWorkspaceMetadataForTarget(target)` | Captured selected target with source root/context | Singular metadata recovery; return existing WorkspaceMetadata or null; stale result must not publish |
| `WorkspaceToolReveal = (tab: WorkspaceToolName) => Promise<boolean>` / `useWorkspaceToolReveal()` | Implicit identity is exactly the providing shell instance, explicit tab name | Setup-only nullable injection; shell action resolves true after its render flush while live, false if disposed; mobile has no shell provider |
| `useEventMonitorFilePreview({ revealTool, isOriginCurrent })` | Captured local shell capability or null, never a global shell lookup | Required options supplied by monitor/tests; isOriginCurrent is a local origin-lifetime/run predicate combined with existing desktop target/binding checks, including delayed focus. Desktop missing capability fails ordinary preview without store read/UI fallback; mobile retains inline branch |
| Existing `openFilePreview(path,workspaceId,{accessIntent})` | Local abs or mapped relative path, exact ID | Unchanged content boundary; source event-monitor/readOnly=true |

Responsibility/identity singular: Yes. Ambiguous-selector risk: Low; no generic “guess run kind” API. Reuse existing `WorkspaceMetadata`, root normalization and source selectors. Target root field is authoritative launch fact when metadata is absent; do not duplicate a full launch structure.

## Naming Check
`workspaceRootPath`, `getAgentWorkspaceRootPath`, `resolveWorkspaceMetadataForTarget`, `WorkspaceToolReveal`, `revealTool`, `useWorkspaceToolReveal`: concrete subject names, matching existing repository terms. No vague support/helper/service manager.

## Existing Capability Reuse And Subsystem Allocation
Selected-workspace facts: **Extend** existing active-context/root/Team view projections. Metadata recovery: **Reuse** workspace store. Preview: **Reuse** existing launcher/store/viewer and native/server boundaries. Reveal: **Extend** existing shell with a scoped action; **Reuse** explicit-tab pending intent, responsive policy and accessible drawer. No new subsystem/registry.

## Draft / Reusable / Final File Responsibility Mapping
D1 mapping retained; D2 adds one small typed layout-injection file and two existing presentation/caller owners. No second preview subsystem. Draft and final mapping coincide after actual caller/lifecycle investigation.
| File | Final responsibility / change |
| --- | --- |
| `autobyteus-web/types/workspace/activeAgentWorkspaceTarget.ts` | Add required nullable source-root fact to target core; do not change external/persisted contracts |
| `autobyteus-web/stores/activeContextStore.ts` | Populate standalone Agent/Team roots and expose bounded metadata recovery action. Known Agent config ID may recover own cache/registry root; Team uses public view getter |
| `autobyteus-web/services/teamExecution/teamExecutionViewState.ts` | Public per-Agent root getter using existing location map and `teamAgentSourceAt` selector; includes configured, collaborator and catalog source semantics |
| `autobyteus-web/stores/agentRunCollaborationStore.ts` | Child target root from `getChild(agentRunId).source.launchConfiguration.workspaceRootPath` (already has exact child source) |
| `autobyteus-web/services/agentOrgExecution/agentOrgExecutionContext.ts` | selectedTarget common source root from selected indexed Agent launchConfiguration |
| `autobyteus-web/composables/useEventMonitorFilePreview.ts` | Selected ID first; exact selected-root recovery when needed; currentness checks and unchanged native/remote byte orchestration; required captured reveal capability replaces direct panel/tab imports, await reveal before existing guarded focus |
| `autobyteus-web/composables/layout/useWorkspaceToolReveal.ts` (Added) | Typed shell action + injection key + setup-only nullable consumer. No state/policy/registry; required to capture actual local owner before lazy action handler |
| `autobyteus-web/components/layout/WorkspaceToolShell.vue` (Modified) | Provide live idempotent reveal action; selectTabExplicitly before mounting, restore dock preference and choose actual dock/drawer from existing reactive policy; Vue flush/lifetime only, no bytes/context selection |
| `autobyteus-web/components/workspace/agent/AgentEventMonitor.vue` (Modified) | Capture injected action in setup, pass it to lazy launcher on explicit activation; bounded origin/disposal guard. Mobile and passive rendering untouched |
| `autobyteus-web/composables/useRightSideTabs.ts`, `useRightPanel.ts`, `WorkspaceRightToolDrawer.vue`, `useAccessibleDrawer.ts`, responsive policy | Reused unchanged production owners; add regression coverage where appropriate, not a generic tab/drawer rewrite |
| Existing colocated tests (plus focused test-owned product probe when needed) | Identity/root matrix, before/after regression, Files binding, errors and stale context/node; no backend imports into web |
| `autobyteus-web/docs/file_explorer.md` / content rendering doc if needed | Synchronize corrected selected-ID/root recovery contract; no new access promise |

Shared structure tightness: existing WorkspaceMetadata and target identity reused; one nullable source fact rather than duplicated caches/full launch DTO. No redundant native preview scope/state representation.

## Applied Patterns / Folder Mapping
Existing immutable target projection and metadata-only action patterns. Changes stay under existing `types/workspace`, `stores`, `services/teamExecution`, `services/agentOrgExecution`, `composables` and colocated tests. Folder boundaries remain clear, no shared/common catch-all or over-splitting. D1 six paths Modified; D2 typed injection Added and monitor/shell Modified, with launcher revised. Explicitly reused owner paths above are Unchanged; tests/docs Modified/Added as bounded. Renames/Move/Remove files: N/A.

## Concrete Shape Guidance
Good: selected task member root `/owned/B`, config ID `B`, metadata null → native absolute link opens under **B**, no metadata lookup required. If ID also null, recover descriptor **only from `/owned/B`** and publish to that same still-selected member; then Files uses recovered B.

Bad: global launch draft is A, selected child is B → restoring old global fallback sends preview/UI state to A. Also bad: derive a workspace from the linked file's directory or let a remote node use desktop-native bytes.

## Backward-Compatibility Rejection Log
- Blind revert to pre-Org/global fallback: Rejected; wrong selected-member identity.
- Version-specific metadata handling or persisted legacy source field: Rejected; use current target facts/current metadata owner.
- Synthetic native-preview workspace / separate tab registry: Rejected; existing exact workspace identity/store can absorb correction.
- New local reader or uncontained remote absolute endpoint: Rejected; unchanged byte boundaries already satisfy approved access.
- Global reveal-event bus/handler registry or sharing isRightDrawerOpen in useRightPanel: Rejected; one local component owns transient drawer lifetime.
- Launcher viewport guesses, production DOM-clicking strip, toggleRightDrawer on repeat, or passive setActiveTab for explicit file intent: Rejected; shell/current explicit-tab boundary realizes the approved visible outcome.
- Injection inside async action/late launcher: Rejected; Vue setup ownership is no longer active. Capture in setup and pass explicitly.
- Missing-provider legacy preference fallback: Rejected; cannot honestly claim visible opening; desktop reports ordinary failed, mobile retains inline flow.

## Derived Layering
N/A — existing selected projection → launcher → content/byte owner, then shell-owned reveal → viewer explains layering; typed local capability strengthens the existing boundary, not a new runtime subsystem.

## Change Sequence
1. Extend target source-root fact and public Team getter; update target-producer fixtures without changing commands/source ownership.
2. Add active-context recovery action reusing current metadata owner, with source/context/binding publication checks.
3. Replace launcher metadata-only ID branch. Keep known-ID native path immediate; recover missing selected ID/root as needed. Keep mobile and remote containment unchanged; no parent/global target fallback.
4. D1 implementation/checks exist but DI-001 blocks completion. Add typed shell capability; provide from actual shell and capture from monitor setup. Replace launcher global pair with awaited reveal request, retaining currentness/read-only/error boundaries. Do not reimplement six-source identity correction or roll it back.
5. Add fresh-host explicit-intent and real shell integration coverage (below). Preserve current contextual-default/strip/preference/start-surface/drawer behavior. Revisit DESIGN.md and TESTING.md.
6. Run cumulative focused checks, rebuild current worktree (IR-001 package predates D2), and validate one-activation visible native desktop workflow (no user app/data). Synchronize docs through Delivery ownership.

## Verification Guidance (Intent, Not Executed Validation)
- Focused owner tests: known ID + null metadata (native opens without metadata query), both ID/metadata null + exact source root (recovery binds same member), full metadata control, unrelated A/global draft with selected B, configured/collaborator/catalog root lookup, lookup failure, target/root/node switch during pending recovery, repeat-open/read-only/user-tab preservation.
- DS-005 shell integration: mount real WorkspaceToolShell and its RightSideTabs/contextual-default owner around a descendant action consumer; real selected target and Files store. Use reactive provided responsive policy, not a frozen snapshot. Cover constrained strip (~992 CSS px), narrow and short-height strip, wide visible dock and wide user-hidden→redock; fresh first/new-scope host, already-open repeat, dismiss/reopen, disposal and currentness. Assert content/error is visible from one action, exact B binding, no separate strip click; `opened` or populated store alone is insufficient. External viewer/IPC/metadata doubles remain disclosed.
- Explicit intent: preserve normal Activity/Team/Org default on scope changes without an action, while `selectTabExplicitly('files')` before a fresh mount wins for standalone/Team/Org. Reuse existing pending lifecycle, do not change global semantics for an imagined scope-switch race.
- Monitor boundary: setup captures provider, lazy action receives the same capability after asynchronous import, no inject in handler; passive feed creates no launcher/read/reveal. Mobile null provider still uses inline path. Desktop missing provider gives ordinary failed, no store-only success. Obsolete monitor/shell action cannot reveal/focus a replacement.
- Focus: keyboard activation focuses the active file tab after drawer mount/default entry; Escape/backdrop restores the initiating control under the existing drawer lifecycle. Repeat reveal never closes an open drawer. Existing left/right drawer stack, start-surface tools and responsive resize tests remain green; no layout/focus redesign.
- Integrated right panel: real active-context + Files store + FileExplorerLayout/Tabs. Confirm correct content visibly rendered under selected/recovered ID; no mere opened return counted as UI success. Existing `RightSideTabs.workspaceTarget.spec.ts` must continue preserving unrelated launch A through B metadata failure/recovery.
- Negative runtime: embedded sentinel without bridge, remote Electron window despite bridge, browser outside-workspace, mobile in/out-of-workspace. No arbitrary native call or absolute server request. Existing native regular-file validation and local protocol tests stay green.
- Candidate commands from worktree (always `--run`; existing paths inspected, new shell spec explicitly identified):
  - `pnpm -C autobyteus-web test:nuxt composables/__tests__/useEventMonitorFilePreview.spec.ts stores/__tests__/activeContextStore.spec.ts stores/__tests__/agentRunCollaborationStore.spec.ts services/teamExecution/__tests__/teamExecutionViewState.spec.ts components/layout/__tests__/RightSideTabs.workspaceTarget.spec.ts --run`
  - D2 focus: `pnpm -C autobyteus-web test:nuxt components/layout/__tests__/WorkspaceToolShell.spec.ts components/workspace/agent/__tests__/AgentEventMonitor.spec.ts composables/__tests__/useRightSideTabs.contextualDefault.spec.ts components/layout/__tests__/WorkspaceAdaptiveLayout.spec.ts --run` (add the bounded new shell spec; retain existing preference/drawer/start-surface suites).
  - Relevant `services/agentOrgExecution/__tests__` and existing fileExplorer tests, plus unchanged web-boundary guard/type/build checks.
  - `pnpm -C autobyteus-web test:electron electron/__tests__/localFileValidation.spec.ts electron/local-file-protocol/__tests__/local-file-protocol.spec.ts electron/local-file-protocol/__tests__/local-file-response.spec.ts --run`.
- Isolated native journey: build this worktree (`pnpm --silent isolated-app start --build`, or from-worktree only after a source-current build). Use only owned data/context/workspace and files. Exercise actual selected Team/task member Event Monitor activation to visible Markdown/native content **without a Files-strip click** at normal ~992 CSS px first/fresh drawer host, then wide dock/user-hidden control; reopen/dedupe, dismiss/reopen and keyboard focus/Escape/read-only. Missing/non-regular native alerts must also appear from one activation. Preserve controlled metadata boundaries and use existing negative runtime checks/native remote-window control when available; disclose any unexecuted surface. Metadata-null reproduction may control the existing metadata I/O at a documented test boundary after a normal selected/saved-context publication; do not mutate hidden user app state or claim such fixture as the independent origin of product support. Retain baseline failure separately when establishing the witness.
- Record provider/metadata fixture boundaries, real IPC byte proof, build/source revision, APIs/DOM assertions and supporting screenshots. Native product validation is required, not substituted by the existing VM historical probe/browser view. Stop only the owned instance; retain cleanup receipts.

## Tradeoffs, Risks And Implementation Guidance
Bounded metadata lookup is justified only to recover the missing exact presentation identity. Known-ID native preview must not wait for lookup, tree registration, full history or unrelated discovery. The existing metadata query can fail; surface ordinary preview failure and retain source/selection rather than invent authorization or unrelated fallback. Do not add a general outage-resilient preview framework under this bug ticket.

Exact installed-user attribution remains unverified despite the owned partial identity/native-byte witness; D2 automatic visible outcome still requires a current-build witness. If isolated reproduction identifies a different cause (non-embedded node binding/missing preload, source root absent on normal UI launch), return Design Impact or Requirement Gap with exact evidence rather than claiming this fix resolves that separate condition. Do not broaden remote local access. Preserve all residual limitations; baseline installed app or pre-change binary cannot prove changed source.
