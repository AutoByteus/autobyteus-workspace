# Design Spec — sidebar-stop-red-default

## Solution And Approval Basis
- Project Task `project_task_6d8f94f6-1694-466b-9587-2ac091e7dd18`; current solution **SR-002**; design **Ready**.
- Approved requirements **R1 / SR-001**, approved by Solution Designer within user's new direction; approval reference is the current Task message plus user-facing message beginning “I found five live sidebar variants”. No Needs user decision or behavior-defining supplement. Prior Task remains DONE, not reopened.
- Canonical investigation: `/home/autobyteus/workspace/.codex/worktrees/sidebar-stop-red-default/tickets/in-progress/sidebar-stop-red-default/investigation-notes.md`; evidence E1..E8.
- Workspace `/home/autobyteus/workspace/.codex/worktrees/sidebar-stop-red-default`, branch `codex/sidebar-stop-red-default`; fetched base `origin/personal@0c37f58d88220be3683a15da6e0956d6ab13c4db`; finalization target `origin/personal`.
- Authorities read 2026-10-13: bundled `solution-designer/references/architecture-design.md`, full `design-principles.md`, `templates/design-spec-template.md`; repository `DESIGN.md`, `TESTING.md`, root and `autobyteus-web/AGENTS.md`. No project-specific conflict. Design examples not needed for this local presentation change.

## Current-State Read / Intended Change
The supported Workspaces tree has Agent, Team and Org root Stops plus shared delegated Agent/whole-Team Stops. Four template sites in three components currently render gray at rest and red on hover. This matches the earlier delivered requirement; it is not a defect in that Task. The new user direction intentionally makes enabled Stop immediately red, with a distinct disabled state. Existing UI/store/API/root lifecycle owners are healthy for this change (E2..E5).

Change only existing button classes/comment and direct regression/rendered checks: enabled rest **red-500**, hover **red-600 on red-50**, leave **red-500**. Disabled is **gray-400 with its existing opacity/cursor and transparent background even on hover**. Keep every other attribute, shape, focus convention, animation, visibility and action unchanged.

## Change Scope
- In scope: UC-001/002, BEH-001..003, REQ-001..004, AC-001..005. Three production presentation files; relevant colocated tests and existing browser probe; two directly affected Stop documentation passages.
- Deliberately left alone: scripts/action/store/GraphQL/server/lifecycle code, selection/disclosure/row/status styling, Settings controls, sizing, icons, confirmation policy, async guards, global theme, unrelated layout/docking, fixture-only running panels and roster controls. Do not introduce a generic cancellation control or another pending-state owner.
- Follow-ups: **None newly proposed**. Previous FUP-001 architecture/catalog cleanup is excluded and already belongs to the Tasks owner; do not perform or redispatch it.

## Task Size And Architectural Risk
- `task_size=Medium`: several existing components (three files/four sites) and five variants, with expanded direct regression/probe coverage; not a broad feature or subsystem change. Documentation/evidence volume is not architectural scope.
- `architectural_risk=Low`: current owners absorb only bounded CSS changes. No interface, identity, persistence, security, concurrency, deployment or ownership behavior changes; all real action paths traced (E4/E5). CSS precedence and rendered coverage are testable local risks, not unknown architecture.
- Escalate a Design Impact if implementation needs a new abstraction, script/handler change or new runtime owner to accomplish styling. Return Requirement Gap for changed visibility/target/confirmation/lifecycle or newly proposed supported behavior; obtain approval before expanding. Do not silently use the direct route for high-risk work.

## Architecture Investigation Evidence
| Evidence | Source / observation | Design consequence / remaining uncertainty |
|---|---|---|
| E2/E3 | Mounted tree's four sites; shared copy consumers; existing red Stop palette | Reuse exact palette and current owners, not new visual language; actual CSS checked downstream |
| E4 | Root component → distinct callback/store → typed mutation → subject service/manager | Preserve all root handlers, identity fields and async/confirmation behavior |
| E5 | Copy component → root+reference keyed store → typed mutation → root/task lifecycle | Shared presentation only; never substitute whole-root/member termination |
| E6 | Existing component suites and real-stack DCP-001/002/003 probe | Update old gray assertions; expand root/Org coverage rather than invent a parallel app harness |
| E7/E8 | Two directly stale Stop passages; current ownership healthy | Targeted docs sync; no refactor, migration or unrelated catalog cleanup |
No executable validation yet. Evidence sources/commands and limitations are canonical in investigation, not inferred from prior pass reports.

## Relevant Behavior And Production-Path Map
| Behavior | Kind / approved intent | Trigger / current evidence | Target path / preserved outcome |
|---|---|---|---|
| BEH-001 | User; REQ-001/003/004, AC-001 | Observe, hover, leave supported active sidebar controls; E1..E3 | DS-001 red state styling at existing template sites; rows/status/layout unchanged |
| BEH-002 | User/System; REQ-002/004, AC-002 | Keyboard focus or pending operation; E2/E4/E5 | DS-001+004 disabled CSS and current native/pending/focus states; no duplicate action |
| BEH-003 | User/System; REQ-003/004, AC-003/004 | Pointer/native keyboard Stop; E4/E5 | DS-002/003/004 unchanged exact root/copy action, Task and history semantics |

## Relevant Supplemental Task Artifacts
Prior `/home/autobyteus/workspace/.codex/delivery-records/task-copy-stop-style/solution-terminal-result.md` and linked finalized package are read-only background for preserved behavior and test seams (AC-003/004), **not** current visual requirements or new validation passes. Complete supplement inventory is in investigation. Product package and independent architecture/source/test-code review artifacts: **N/A — not applicable** on the proposed low-risk classification; routing is recorded only after rule lookup.

## Task Design Health Assessment
- Change posture: **Behavior Change** (new styling decision). Current design issue found: **No**. Root cause classification: **No Design Issue Found**. Refactor needed now: **No**.
- Plausible structural triggers checked: duplicated policy/coordination (short utility strings repeat, but no competing lifecycle authority or synchronization); boundary bypass (components already use distinct public actions); responsibility drift (presentation remains in history components); shared structure looseness (existing root-kind and mutually typed Agent/Team identity retained); legacy pressure (no old/new mode needed). E2..E5/E8 rule out a structural repair for this scope.
- Response: change local presentation in place. Extracting a shared control would broaden DOM/focus/hit-area risks and couple root/copy semantics without benefit needed by R1. No runtime data structure changes or intentional architecture deferral. Residual presentation drift is addressed by a common regression matrix, not a new runtime registry.

## Terminology
“Root Stop” terminates the existing Agent/Team/Org root using that subject's API. “Copy Stop” stops a typed delegated execution under its owning root; it does not complete its Task or stop its parent. “Actionable” means existing visibility conditions true and native `disabled` false.

## Legacy Removal Policy / Removal Plan
No new flag, compatibility wrapper, dual visual path or legacy fallback. Prior archived artifacts remain historical records, not runtime compatibility.
| Remove / replace | Why / replacement | Scope |
|---|---|---|
| Enabled `text-gray-400` at four Stop sites | Superseded by red-500; gray remains only disabled styling | In this change |
| Shared button comment saying neutral at rest | Replace with new actionable-red/unavailable distinction | In this change |
| Active tests/probe expectations for gray resting Stop | Replace assertions for approved R1, keep lifecycle coverage | In this change |
| Current docs' neutral-sidebar-only passages | Sync at delivery; no unrelated rewrites | In this change |
No reached dead code established in touched sites. Unmounted fixture candidates are not proven dead and are not removed.

## Persisted Data / State Transition Decision
**Not Affected.** Classes/comment/tests/docs do not change stored subject, schema, serialization, readers, writers or runtime identity. Existing Tasks/history/settings remain untouched; no migration, reset, data loss, startup gate, compatibility reader or rollback machinery. REQ-003 and AC-003/004 apply. Migration plan: N/A.

## Data-Flow Spine Inventory / Primary Execution Spines
| ID / scope | Start → end | Governing owner / why it matters |
|---|---|---|
| DS-001 Bounded Local | Existing row props + pending → native button classes → browser style/focus | Three existing sidebar presentation components; only changed spine |
| DS-002 Primary End-to-End | Root Stop → TreePanel action → subject store → GraphQL → subject service/manager → root stop | Existing Agent/Team/Org lifecycle owners; preserve typed identity and no added confirmation |
| DS-003 Primary End-to-End | Copy Stop → delegated draft store → client/resolver → live root command → task stop | Existing delegated lifecycle boundary; no parent/member substitution |
| DS-004 Return-Event | Pending/publication/result → current store/context/history → row availability/render | Existing stores/context/history; keep loading, failure and stopped visibility |

## Spine Narratives / Actors And Ownership
- DS-001: each current component renders an already-eligible native button. Browser pseudo-classes select red enabled or muted disabled appearance; no new JavaScript state. Keep root native outline, shared copy ring, each current opacity/cursor/transition and copy pulse. Org currently lacks explicit transition; do not add duration equality as a new requirement.
- DS-002: Agent/Team callbacks go through history mutations and their run stores; Org uses explicit subject action and stop-and-inspect. Each sends its existing ID field to its existing resolver/service/root manager. Lifecycle owners stop the actual root and record history; UI cannot implement cancellation itself (E4).
- DS-003: shared copy button supplies its existing root and Agent-or-Team reference. Store guards the keyed request; resolver/service dispatches to the active owning root, whose command coordinates task execution stop and status publication. The Task remains restorable/open; entire Team copy is the subject, not its member (E5).
- DS-004: pending disables current buttons; success/publication hides inactive controls or transitions root history; failure follows current feedback/recovery. No new optimistic result, reload or state cache.
Thin facades: GraphQL/client adapters translate typed requests; they are not lifecycle owners. Existing root managers and task lifecycle remain behind their public boundaries.

## Off-Spine Concerns
| Concern | Spine / owner served | Responsibility / boundary |
|---|---|---|
| Localization, title/aria/focus/reduced motion | DS-001/004; UI | Retain current tokens/attributes/animations; don't put accessibility into stop services |
| Toast/error feedback and history publication | DS-002..004; existing stores/services | Preserve outcomes; no additional observer or history request |
| Proof/evidence/cleanup | All; tests/delivery | Test-owned resources and truthful layer limits, not production logic |

## Ownership Boundaries / Dependency Rules / Interface Checks
Unchanged boundaries: root buttons call their named actions; copy button calls delegated store, never GraphQL or a manager directly. No presentation import in stores/backend; no direct handle/state/file mutation in tests claiming real lifecycle evidence.
| Interface | Explicit identity / subject / responsibility | Check |
|---|---|---|
| `onTerminateRun` → `TerminateAgentRun` | Agent root `runId` → `agentRunId` | Singular, explicit; low ambiguity; no change |
| `onTerminateTeam` → `TerminateAgentTeamRun` | Team root `teamRunId` | Singular, explicit; low ambiguity; no change |
| Org subject action → `TerminateAgentOrgRun` | `rootSubjectKind:'agent_org'`, `rootRunId` → `agentOrgRunId` | Singular, explicit; no generic ID dispatch change |
| `delegatedLaunchDraftStore.stop` → `stopDelegatedExecution` | `{rootKind,rootRunId}` + exactly Agent or Team reference | Singular typed copy subject; whole-Team identity preserved |
Main subject naming stays natural (Agent root, Team root, Org root, delegated Agent/Team); no renames. Boundary encapsulation corrections: N/A, all existing entrypoints adequate.

## Capability Reuse / Subsystems / File Responsibility Decisions
Reuse history presentation for DS-001, existing run/delegated stores and services for unchanged spines, current test/probe harness for evidence. No new subsystem, public interface, shared domain structure, normalizer or global utility. Draft and final file responsibilities coincide: each component keeps its current row/control responsibility; no extraction necessary. Shared `DelegatedStopButton` already centralizes both copy types and all hosts. Tailwind tokens are existing shared styling; do not add parallel theme values. Data-model tightness: N/A to changed data, none introduced.

## Target Subsystem / Folder / File Mapping
All paths below relative worktree; folders retain existing ownership depth (presentation vs tests/docs), no mixed runtime/test layer.
| Path | Responsibility / planned delta | Must not contain |
|---|---|---|
| `autobyteus-web/components/workspace/history/WorkspaceHistoryWorkspaceSection.vue` | Agent and Team root Stop classes only | Handler/row/status/visibility changes |
| `autobyteus-web/components/workspace/history/WorkspaceAgentOrgHistoryCollection.vue` | Org root Stop classes only; copy already inherits shared component | Org hierarchy/state/confirmation changes |
| `autobyteus-web/components/workspace/history/DelegatedStopButton.vue` | Copy Stop classes and accurate comment | New props/state/action or lifecycle behavior |
| Colocated `DelegatedStopButton.spec.ts`, `WorkspaceHistoryWorkspaceSection.spec.ts` | Direct enabled/disabled tokens, native semantics, current targets/visibility; preserve unrelated cases | Weakened behavior assertions |
| Existing Org activity/subject-action/history-mutation/delegated-store suites as relevant | Focused regression of current action boundary and pending behavior | Test-only requirements on unsupported product states |
| `autobyteus-web/tests/e2e/delegated-launch-defaults-probe.mjs` | Update rest expectation; extend root/Org render/action and disabled-hover evidence using current real stack | Fake success responses described as real backend proof |
| `autobyteus-web/docs/agent_execution_architecture.md`, `autobyteus-web/docs/settings.md` | Delivery-owned direct Stop-style paragraphs only | Unrelated architecture/catalog cleanup |
| Current ticket folder | Role-owned handoffs/history/evidence | Generated package builds or secrets |
A narrowly scoped test fixture/helper addition is allowed only if the existing harness cannot express a required UI state cleanly; preserve its honest mocked boundary and do not create a competing live-app harness. Implementation/API owner chooses exact test factoring under this design.

## Concrete Shape Guidance / Applied Pattern
Keep existing utility classes; replace base `text-gray-400` with `text-red-500` on each Stop, retain `hover:text-red-600 hover:bg-red-50`, and add:
```
disabled:text-gray-400 disabled:hover:text-gray-400 disabled:hover:bg-transparent
```
These overrides express the approved disabled state without changing native disabling or event handlers. Existing project code already uses stacked disabled-hover suppression. Preserve each owner's existing geometry/cursor/opacity/transition/focus/pulse utilities. Do **not** replace every gray token in a file or color a row/icon-status ancestor. Computed browser styles, not class order assumptions, must prove specificity. A semantically equivalent enabled-hover formulation may be used if justified/tested, without changing R1.

## Backward-Compatibility Rejection Log / Derived Layering
| Candidate | Disposition | Replacement |
|---|---|---|
| Old-gray preference, feature flag, separate parent/copy conventions | Rejected; user requests one new convention | Direct CSS replacement for all actionable sidebar sites |
Derived layering: existing view → action/store → transport → lifecycle only, unchanged. No new layer.

## Change / Validation Sequence
1. Inspect current working diff and task authorities; modify only four presentation sites/comment, no scripts. Maintain new Task identity and leave old archive alone.
2. Update/add direct component regressions covering all five variants at enabled/disabled/inactive states and current native names/focus/targets/propagation. Run relevant suites with `--run`. A deliberate old-token negative control should fail the new enabled-red test (retain evidence; restore current source).
3. Render actual product components/current CSS locally: rest/hover/leave, keyboard focus, pending and disabled-hover; row/running-dot unchanged. Class tests cannot prove computed CSS or native activation. Implementation records local checks; API/E2E independently owns durable coverage/execution.
4. Extend and execute current real-stack DCP-001/002 for copy actions and parent Agent/Team paint; add Org paint using DCP-003's existing root. Exercise test-owned root Agent/Team/Org Stops **after** each existing copy resume assertion (or equivalent separately owned runs), assert exact distinct mutation ID plus current inactive/history outcome. Do not delete DCP-003's existing Settings route coverage to gain sidebar coverage. Keep test additions bounded and case headers accurate.
5. Explicit matrix: each of Agent root, Team root, Org root, Agent copy, whole-Team copy needs rendered red rest → red-600/red-50 hover → red rest; focus/name/native key action; held real pending muted and no disabled-hover red; no duplicate; proper target. Use Enter/Space across cases, safe delayed-and-forwarded requests, current row/disclosure/status unchanged. Shared copy host checks cover AGENT/AGENT_TEAM/AGENT_ORG propagation. Selected state only where product actually exposes it; label fixture-selected evidence separately.
6. Retain copy assertions: real response/stop, Task open, owning root unaffected by the copy stop, correct whole-Team vs Agent reference and resume. Stopping a test parent later must not erase the recorded earlier parent-survival proof. No user worker/task targeted.
7. API/delivery record commands, exact build/source, JSON/log/screenshots, failures and coverage limits; delivery integrates latest target and repeats necessary checks, syncs two Stop passages, verifies receipt, finalizes and cleans owned resources per RELEASE.md. Source integration does not update installed app.

Prerequisites/limits: follow TESTING.md install/prebuild/Nuxt prepare/current server build and clean test-owned HOME/database/ports; serialize builds/dev servers. Reuse `pnpm -C autobyteus-web test:e2e:delegated-launch-defaults --cases DCP-001,DCP-002,DCP-003 --output-dir <fresh>` if those case extensions are used. No paid provider, full desktop or installed-app claim from browser/scripted evidence. This renderer-only ticket's intended proof is web component + browser equivalent; if desktop-shell/full-product assurance is claimed, use current isolated Electron as required, never the user's app. No unconditional release/rollout instruction.

## Key Tradeoffs / Risks / Guidance For Implementation
- Keeping four short utility lists avoids changing markup/native focus/handlers for cosmetic consistency. Common tests guard drift.
- Disabled overrides intentionally keep unavailable muted; do not confuse “all clickable red” with “disabled red”. Browser hover specificity/transition settling is the main local risk; sample after settling, including leave and disabled-hover.
- Root and copy dimensions/focus conventions differ intentionally; consistency is colors/availability, not a redesign to identical geometry. Org does not need forced transition equality.
- Native actions and history can be expensive to set up; reuse owned probes rather than targeting live workers. Accurate partial/mock evidence is better than a false pass; unresolved AC coverage returns through the workflow.
- No additional performance machinery, whole-history work, publication or data continuity change. No blockers to implementation. Current state: design only; all new executable results pending downstream.
