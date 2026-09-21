# Design Spec — COLLAB-FOLLOWUP-001

**AD-REV-001 — Architecture Design Complete; independent review required.** Approved authority: RER-002 at `53fffe8bd4845b902e48b567649e061bea39ddfc`. No source implementation or acceptance is claimed.

Canonical workspace: `/home/autobyteus/workspace/.codex/worktrees/collaboration-follow-up-fixes`, branch `requirements/collaboration-follow-up-fixes`, base `345d8e0befabe68052ff0e42d0ec9a560ef85326`. This is one new bounded ticket, not a reopening of completed AORG-FLAT-TEAM-001. Paths below are repository-relative; `S` denotes `autobyteus-server-ts/src`, `W` denotes `autobyteus-web`. Evidence supplement: [architecture-investigation.md](architecture-investigation.md).

## Current-State Read

- Fresh Team materialization and Org configured-scope preparation eagerly prepare all configured Agent backends. Existing lower-level handles already support lazy readiness, single concurrent readiness, durable binding acceptance and termination fences. Root availability and exact Agent readiness are separate facts. Restore/task preparation shares code and must not be globally changed.
- Background Org/Team events publish exact contexts/history without explicit router selection. A delayed **user-initiated** Team inspection can still focus/select after a newer Org choice and emit an event that sends the shell to bare Workspace. Related Agent/Team/Org open completions lack a common latest-user-intent guard. The original background-publication incident's cause remains unassigned; the controlled selection race is independently established, not retroactive attribution.
- First submission retains a raw local message reference after insertion into a reactive conversation. Finalizing through that raw handle can leave the rendered attachment computed value on its draft locator. Durable final bytes and existing separate-link opener are not the failing owners shown by current evidence.

## Task Size And Architectural Risk (Mandatory)

- `task_size`: **Medium**.
- Size basis: three bounded corrections inside existing runtime, selection and submission ownership. Five server production files are primary lifecycle targets; frontend changes are one shared submission helper plus existing selection owner/ingress/completion plumbing (roughly a dozen to sixteen files depending on existing typed option placement), with focused tests. No new product subsystem, topology, provider, transport or migration. This is not the old large ticket's inherited size. Mechanical option propagation is not a router redesign.
- `architectural_risk`: **High**.
- Risk basis: changing worker activation timing affects durable binding/publication and recipient authorization; asynchronous selection commits and reactive identity are correctness boundaries. The original publication-only cause is not yet established. Small code changes can still have these material risks.
- Selected route: **Architecture Review**. No Product gate or Requirement Gap.
- Escalate material new root/receiver/restore/task semantics, another selection-owning mechanism requiring redesign, persistence/API/schema changes, or provider/file-class expansion to Architecture; changed intended behavior returns to Requirements. Do not silently widen the patch or inherit old validation scope.
- Payload inventory: current requirements/intake and selected old evidence only. Structural scope above—not evidence count—determines classification.

## Architecture Investigation Evidence

| Source / command / probe | Exact reference | Observation | Decision supported | Remaining uncertainty |
| --- | --- | --- | --- | --- |
| Git/read-only source inspection | [source-witnesses.json](architecture-evidence/AD-REV-001/source-witnesses.json); AINV-001 | Fresh materializers prepare configured members; lazy handles already exist | CD-001–002 | Fresh Org GUI/runtime not rerun |
| Current communication composition | `S/agent-org-execution/domain/agent-org-run.ts`, shared `root-communication-engine.ts`; AINV-001a | Receiver checked before readiness; direct Agent currently requires active runtime | CD-002 membership/origin split | New first-work integration still needs executable coverage |
| Schema/readers/fixtures | AINV-001b, current Team V2/Org V1 and local memory readers | Null provider binding and empty trace are current valid states | No migration; no invented empty status/data |
| Actual-source selection diagnostic | [navigation-probe.cjs](architecture-evidence/AD-REV-001/navigation-probe.cjs), [log](architecture-evidence/AD-REV-001/navigation-probe.log) | Old pending Team inspection can override newer Org choice | CD-003 | Controlled dependencies; not original GUI cause or full mounted composition |
| Actual SFC/helper/opener diagnostic | [attachment-probe.cjs](architecture-evidence/AD-REV-001/attachment-probe.cjs), [log](architecture-evidence/AD-REV-001/attachment-probe.log) | Raw handle leaves rendered draft entry; proxy control updates it | CD-004 | No actual Send/finalize/backend/provider execution |
| Original comparison | Pinned `5645b49...`; AINV-001/003 and comparison table | Lazy original Team workers; publication/selection separate; attachment path largely unchanged | Reuse ownership pattern, not original topology/code wholesale | No original live immunity or introducing commit established |
| Preparation/limits | [diagnostic-disposition.md](architecture-evidence/AD-REV-001/diagnostic-disposition.md) | Two final diagnostics exit 0; module-resolution preparation miss retained | Evidence honesty | Not acceptance or durable regression suite |

## Intended Change

### CD-001 — admit fresh configured scope without starting unused workers

Fresh standalone Team materializer passes the existing `prepareConfiguredAgents: false`. Restore keeps its existing true/preparation policy. Org builds and durably admits the **entire** direct-Agent/mounted-flat-Team scope at launch, but does not prepare its unused configured workers:

1. `AgentOrgRootAgentExecutionRegistry.prepareConfigured` creates/reserves the configured handle without provider activation in **fresh** mode. In restore mode retain actual activation staging.
2. Its prepared plan exposes the same semantic staged binding/replacement arrays plus commit/abort operations that the scope builder needs. Optional activation stays private to the registry; fresh arrays are empty, not fake provider bindings or a fabricated no-op activation object.
3. Scope builder folds those arrays, validates and commits the current initial package, then publishes all configured handles/private Team scopes and activates the Org root as before.
4. Org configured-Team directory passes the existing factory option according to fresh versus restore mode. Its task-Team preparation remains explicitly enabled. Do not globally change the factory default or task/shared planner policy.

An unstarted worker has a real configured local AgentRun identity/address, no runtime and normally no provider binding yet. A registered handle is not a started Agent. Snapshot/center use existing truthful Offline state. Root remains available with normal Stop; Org remains coordinator-free and initially unfocused. Expanding/selecting/read-only inspecting a member never calls readiness. Definition/config validation and initial package validation remain before successful launch; defer backend readiness, not validation of malformed scope.

On first work, exact recipient lookup → existing handle reservation/post → `ensureReady` → planner → durable binding callback → publication/event binding → accepted input. Preserve one readiness attempt per handle, actual initializing/active/error state, retry/abort and Stop fencing. A task assignment is real work; task preparation/settlement/event gates are not suppressed under an “unused” rule. A Team coordinator starts when work requires its ingress, not just because a configured Team exists.

### CD-002 — distinguish exact recipient membership from active command-origin authorization

In `AgentOrgRun`, retain existing active-origin authorization for public sender/task commands. Extract a private exact-membership predicate for the communication adapter: same root identity, exact AgentRun/address/index live execution, and published registry handle or published active Team scope. It must allow an unstarted **configured recipient** to reach `reserveAgentInput`; it must not allow stale/settled task recipients or unpublished reservations. Public `deliverLogicalMessage`/`deliverExactAgentMessage` continue authorizing their sender before entering the engine. `authorizeIdentity`/task authorization retain current active-origin rules; do not simply replace their check with weaker membership.

The shared communication engine remains the owner of reserve → durable message → publish/commit input and rejection behavior. Do not relax its identity contract, invent a new recipient API, or start a worker merely to answer membership. Keep root admission/termination gates and all identity checks. This is the minimum dependent correction required by lazy direct Org recipients; mounted scope availability is not promoted to a new root lifecycle.

### CD-003 — latest explicit selection owns selection commits

**One transient current intent in the existing `agentSelectionStore`; no new navigation store, queue, event bus or durable epoch.** Export a small readonly guard (for example `isCurrent(): boolean`) from this owner for existing selection paths. Beginning a new explicit intent invalidates the old guard synchronously **before any await**, while retaining the existing in-flight Team-draft selection-mutability gate. Existing selected-subject representation is unchanged; the guard is not another selected subject or root-status authority.

Entry rules:
- History/sidebar Agent, Team, exact Team member and Org open/select/inspect actions begin an intent, including same-target clicks and synchronous reuse paths. Supported explicit execution links and direct running-panel selection use the same owner. New-run selection from these surfaces also supersedes a pending old selection.
- Propagate that **same** guard through store/open/inspection calls. Lower coordinators must not begin a second intent when one was supplied. For public selecting entrypoints used without an outer UI entry, acquire it before loading. Read-only/background calls (`selectRun: false`, projection reconcile, streaming, history topology publication, temporary-ID promotion) do not begin user intents.
- `useWorkspaceRouteSelection` observes semantic root/member/execution-link changes and route leave/update, including Back/Forward. Invalidate pending old selection on unrelated navigation. Same-root active/history mode replacement is not a new selection. Watch the real `workspaceExecutionAgentRunId` link key. The current route remains router authority; do not create a second route model.

Commit rules:
- After every relevant await, check intent **before publishing a selecting hydration candidate, focusing a member, selecting/clearing another subject, changing config/center mode, recording selected history fields, or emitting/pushing shell navigation**. Preserve existing exact-context/activity/checkpoint guards; intent freshness does not replace them.
- In Team stream recovery, guard the existing pre-context-commit callback as well as the selection after awaited replacement. Never replace a currently focused context from a superseded selecting request. Background recovery remains an explicitly non-selecting path with its existing authority checks.
- Return an explicit `superseded` outcome along selecting completion paths; it is neither success nor a user-visible failure. A caller may emit `run-selected` or navigate only for a current committed selection. Propagate this through history wrapper methods, not just the component handler. Identity/load rejection still follows existing error/retry behavior for the current intent.
- Old `finally`/error completions must not clear a newer request's global loading/error state. Exact attempt cleanup may occur only for the attempt it owns (capture the existing loading record/reference and clear only while that record is still installed, never a newer same-identity attempt). Do not leave an old pending marker permanently set. No second request-attempt ledger or persisted attempt field is needed: use the same intent/owned record.
- Route-link cleanup captures the link signature it actually opened and strips only that still-current link after a current outcome. Never strip unrelated current Org/member/newer-link query in an unconditional `finally`. New distinct links arriving during a pending old read must be processed as latest, not dropped by `applyingSelection`; obsolete work may finish but cannot select. No serialized navigation queue or network cancellation prerequisite.
- Keep the final focus → selection fields → shell event synchronous except for router navigation itself; recheck before issuing that navigation. Route update may invalidate the completed intent naturally; no subsequent state commit depends on it.

A minimal example: earlier Team member click holds projection; user chooses Org member (new intent); old Team finishes → `superseded`, no focus, no config clear, no `run-selected`, no bare Workspace redirect. Reverse order and legitimate later selection must work too.

**Publication-only contract:** Org/Team streaming continues publishing exact statuses/tasks/messages and navigation rows without acquiring selection intent, issuing root selection, or resetting drafts. Existing context adoption/draft preservation remains. The source diagnostic does not explain the original single background-publication incident. Implementation must instrument/reproduce the supported ordinary frontend journey and test publication-only preservation separately. If that exposes another cause, identify its actual writer and return material Design Impact rather than broadly suppressing publication or asserting this guard has fixed an untraced incident.

### CD-004 — one reactive local submitted message

In `W/services/runSubmission/localUserSubmission.ts.beginLocalUserSubmission`, construct the submitted `UserMessage` as a Vue reactive object, append that **same canonical proxy**, and return it in the existing handle. Do not append raw and keep a raw alias. The handle remains stable across temporary-ID promotion. `finalizeLocalSubmissionAttachments` and later message-identity updates mutate that canonical proxy; existing `UserMessage.vue` computed attachments then invalidate naturally.

Keep one local message, one accepted Send, existing equality/no-op semantics, monitor effects, pending/error behavior, draft/final upload mapping, and exact owner identity. No message lookup by temporary ID, duplicate copy store, component key/remount, forced render/reload, cache-reset or opener reroute. Server/file bytes and text/JSON separate-link opener need no change based on current evidence. Preserve shared Team/Org helper semantics using bounded regression controls, not a newly expanded provider/file-type acceptance matrix.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Approved REQ / AC | Trigger / contract | Existing evidence | Changed / preserved outcome | Target path / spine |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User/System | REQ-001–002,006; AC-001–002,007–008 | SCN-001/007 fresh Team/Org launch then SCN-002 actual recipient work | INV-002–003,009; AINV-001 | Available root/full scope; unused Agent runtimes Offline; exact required work starts normally | Launch UI → manager/materializer/scope builder → package admission → lazy configured handles; first input/readiness; DS-001/002/005 |
| BEH-002 | User/System | REQ-003–004,006; AC-003–004,007 | SCN-003 ongoing mounted/task publication; SCN-004 explicit navigation and return | INV-004–005; AINV-002 distinguishes observed and controlled cases | Exact selected root/member/conversation/draft survive background updates; latest deliberate choice wins | Stream → exact context/history independent of selection; UI/router → intent → inspection → guarded focus/selection; DS-003/005 |
| BEH-003 | User | REQ-005–006; AC-005–007 | SCN-005 first native text Send/immediate chip Open; SCN-006 later reopen | INV-006–007; AINV-003 | Live chip final URL/bytes, same one input; preserved text/JSON separate-link opener | Composer → local proxy message → prepare/promote/finalize → reactive chip → opener; DS-004/006 |

## Relevant Supplemental Task Artifacts

| Artifact | Purpose / relationship | REQ / AC | Status |
| --- | --- | --- | --- |
| `requirements-doc.md`, `requirements-revision-record.md`, `investigation-notes.md` | Upstream behavior/approval/readiness authority; no edits by Architecture | All | Approved RER-002 |
| `intake/user-request.md`, `intake/evidence-index.json`, `intake/original-personal-comparison.json` | Scoped original user/source/archived evidence; exact historical references/hashes | All | Supporting read-only authorities |
| Old done ticket `known-issues.md`, `handoff-summary.md`, `delivery-evidence/dr-010/reference-resolution.json`, `upstream-evidence-limits.md` | Scope provenance and archive resolution only; no old acceptance inheritance | Three issue families | Completed/read-only; reached through intake index |
| `architecture-investigation.md`, `architecture-evidence/AD-REV-001/` | Current source comparison and bounded diagnostics | All | Architecture evidence, not user approval or executable acceptance |
| `architecture-design-self-validation.md`, `architecture-design-revision-record.md` | Design walkthroughs and round navigation | All | AD-REV-001 |
| Product prototype / new UI specification | N/A — existing approved interaction language; no visual redesign | AC-007 | No Product gate requested |

## Task Design Health Assessment (Mandatory)

- Change posture: **Bug Fix / bounded Behavior Change** under RER-002.
- Current design issue found: **Yes**; original publication incident root cause remains **Unclear** separately.
- Root-cause classification: lifecycle **Missing Invariant** between fresh scope and worker readiness; receiver check **Boundary Or Ownership Issue** exposed by that change; navigation **Missing Invariant** for async explicit intent; attachment **Local Implementation Defect** in canonical reactive-reference ownership.
- Refactor needed now: **Yes, bounded**. Reuse existing readiness machinery, expose semantically appropriate prepared-plan fields, split private membership/origin checks, and share one selection guard through existing boundaries. Do not rebuild runtime/router/store topology.
- Evidence: AINV-001–003 and retained diagnostics. Status cannot be repaired in CSS; final attachment bytes cannot be repaired in the opener; a single post-load parent guard cannot undo an already committed stale focus.
- Design response/rationale: CD-001–004 localize policy to owners rather than add parallel state/fallbacks. Required removals and sequencing below are part of the same change.
- Deferrals: broad original-code audit, all-provider/native-shell/file-class expansion and legacy architecture cleanup are out of scope. Original publication causal attribution remains an executable investigation obligation, not a deferred acceptance criterion. If a new cause requires materially different design, return rather than speculate.

## Terminology

- **Available root/scope:** admitted Team/Org or published Org-private Team scope, not proof its Agents started.
- **Unstarted configured Agent:** exact configured identity/handle exists as needed, no runtime created by this launch. Not “live but gray.”
- **Current member / active origin:** exact published routing membership versus existing active command-sender authorization; not interchangeable.
- **Selection intent:** ephemeral authority for one explicit user navigation, not a stream generation or persistent selection copy.
- **Canonical message proxy:** the exact reactive message object both conversation renderer and local submission handle observe.

## Design Reading Order

Current evidence → BEH map → health/transition decisions → DS spines/ownership → CD interface/file mapping → sequence and self-validation. CD-001–004 above are normative local decisions; the supplement explains source/diagnostic proof and limitations.

## Legacy Removal Policy (Mandatory)

**No backward compatibility; remove legacy code paths** replaced in scope. Remove fresh-configured eager preparation at the named callers, raw submitted-message alias, unguarded selecting completions and unconditional old-link cleanup. Do not reintroduce original mixed/nested Team implementation or keep old behavior behind compatibility flags. Fresh versus restore/task policy is a real lifecycle distinction, not a compatibility branch.

## Persisted Data / State Transition Decision (Mandatory When Persisted Data May Be Affected)

- Stored subjects: existing root execution trees plus task/communication files in the current rooted-memory layout, with Agent trace/attachments under exact root/member physical ownership. Current versions remain **Team V2 / Org V1**. Representative configured record: exact local `agentRunId`, configured address, `platformAgentRunId: null` until actual provider binding. Current fixture/schema/readers in AINV-001b substantiate this shape; existing non-null records remain unchanged.
- Change: **timing** of fresh configured backend activation/binding, not serialization/schema/path or accepted-message/file shape. Selection guard/proxy are ephemeral frontend ownership changes, not new persisted fields.
- Readers/writers: current strict schemas accept null bindings; root mutators adopt exact real bindings durably; local projection reads empty absent traces without creating a worker. Current restore planner interprets no-activity/null and retained bound records. It must still reject indeterminate activity or retained external conversation lacking its binding. Do not substitute configured/source binding for an exact task binding.
- Invariants: never invent provider IDs, start workers to make read views available, change local IDs at first input, replay accepted messages or lose retained bytes/tasks/drafts. Binding mutation remains before runtime/input publication and uses existing atomic root writer semantics.
- Volume: actual installation not surveyed; no rewrite/scan necessary. Existing historical records and large archives remain untouched. No disposal is permitted; no privacy/security or physical-store ownership change.
- Decision: **Directly Usable — No Migration** for current run packages; **Not Affected** for attachment storage. Version-agnostic current readers already represent both unbound-unused and bound-used members without old-shape fallback. Changing when a nullable field becomes populated adds no incompatible old shape.
- Cost/rationale: migration would add I/O/corruption/recovery/operational risk without semantic benefit. No migration/reset/backfill/cutover/release action authorized. Preserve restart/Stop/Restore tests with unstarted and previously bound members; AC-001–002,005–008.
- Migration plan: **N/A — no transformation required or authorized**.

## Data-Flow Spine Inventory

| Spine ID | Scope | BEH | Start → end | Governing owner | Purpose |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | 001 | Fresh Run action → admitted configured scope | Team root materializer / Org scope builder | Root available without worker startup |
| DS-002 | Primary End-to-End | 001 | Exact human/inter-Agent/task work → accepted recipient input | Root command/communication/task owners with configured handle | Real work activates exact worker, durably |
| DS-003 | Primary End-to-End | 002 | Explicit navigation → current selected target/shell | Existing selection owner + open coordinators | Late old read cannot select |
| DS-004 | Primary End-to-End | 003 | First text Send → actual rendered chip Open | Run submission owner | Final locator published through canonical reactive identity |
| DS-005 | Return-Event | 001,002 | Runtime/snapshot/status/task/message → exact rows/center | Root event + context/history publication owners | Truthful status independent of selection |
| DS-006 | Bounded Local | 003 | Finalized attachment array → rendered computed entry | Local submission / UserMessage | Eliminate raw/proxy divergence |
| DS-007 | Bounded Local | 001 | Handle reservation → readiness/binding → publication or abort | ConfiguredAgentExecutionHandle | Existing single readiness and termination fence |

## Primary Execution Spine(s)

- DS-001: `Run UI → existing API/manager → materializer/scope builder → strict root package commit → configured handle/scope publication → root available`.
- DS-002: `exact input → root admission/identity → recipient reservation/task owner → lazy configured handle → planner/provider → binding durability → accepted work`.
- DS-003: `explicit UI/route intent → existing history/open boundary → hydration → current-intent + existing identity guards → focus/selection → shell navigation`.
- DS-004: `composer → canonical local message → prepare/promote/finalize → one Send → reactive sent chip → existing separate-link opener`.

## Spine Narratives (Mandatory)

| Spine | Narrative | Main domain nodes | Governing owner | Off-spine concerns |
| --- | --- | --- | --- | --- |
| DS-001 | Create full valid topology and available scopes, commit package, publish handles with no unused worker activation | Root, configured scope, prepared plans | Root materializer/scope builder | Definition validation, atomic storage |
| DS-002 | Authorize real initiating work, resolve exact eligible receiver, let its existing handle perform single readiness and durable binding before accepted execution | Root, member identity, reservation, Agent handle/run | Root engines/handle | Provider activity/binding planner, termination fence |
| DS-003 | A user choice owns one pending selection; asynchronous data is staged but commits focus/shell only while that choice remains current | Intent, hydration candidate, focused member, selected subject | Selection owner/open coordinators | Identity/status authority, errors, route-link parsing |
| DS-004/006 | First-Send local message is the same proxy rendered by the chip; finalization mutates it so normal computed updates produce final Open | Submission handle, message, finalized attachment | Submission owner | Upload/finalization, link opener, monitor effects |
| DS-005 | Runtime publishes exact status/task/message state, then views derive rows/aggregate/center without making a user choice | Runtime event, exact context, navigation projection | Context/history owners | Sequence/fresh-read guards, draft retention |
| DS-007 | Concurrent readiness calls share one owned attempt; bind durably then publish, or abort safely; Stop closes admission and waits/fences | Readiness attempt, binding, runtime | Configured handle/root lifecycle | Existing planner and atomic writer |

## Spine Actors / Main-Line Nodes

Root materializer/scope builder; admitted Team/Org root; configured handle; existing communication/task engines; selection store; history/open/inspection coordinators; local submission handle/message; exact context/history publisher; rendered UserMessage/opener. The API/controller/component wrappers are entrypoints, not new lifecycle or data owners.

## Ownership Map

| Owner | Owns | Must not take over |
| --- | --- | --- |
| Root materializer / Org scope builder | Validation, package-before-scope publication, fresh/restore call policy | Agent execution/readiness internals |
| Configured registries/handle | Exact published membership, single worker readiness/binding/abort | Root topology/task policy or UI status fiction |
| Root/communication/task engines | Admission, sender authority, recipient resolution, durable accepted work | Router or presentation shortcuts |
| Selection store / selecting coordinators | Current explicit intent; local candidate/focus/selection commit respectively | Background data ownership or another route model |
| Context/history publication | Exact state and derived rows, existing freshness/draft rules | User selection/navigation |
| Local submission helper | Canonical optimistic message identity and local effects | Server file storage or opener behavior |

## Thin Entry Facades / Public Wrappers (If Applicable)

| Entry | Owner behind it | Why | Must not secretly own |
| --- | --- | --- | --- |
| Existing launch API/UI | Root manager/materializer | Input/config boundary | Eager workers merely for presentation |
| Sidebar/router action wrappers | Selection/open owners | Capture deliberate intent and target | Separate current-intent state per component |
| UserMessage attachment click | Existing context-file opener | Render actual finalized message attachment | Draft-final repair, filesystem rewrite, Files-tab redirect |

## Removal / Decommission Plan (Mandatory)

| Remove | Why | Replacement | Scope | Notes |
| --- | --- | --- | --- | --- |
| Unconditional fresh configured activation at Team/Org callers | Violates unused lifecycle | CD-001 existing deferred factory path | In This Change | Restore/task preparation retained deliberately |
| Org prepared-plan exposure of mandatory activation | Fresh registered handle needs no provider plan | Staged binding arrays + commit/abort | In This Change | Optional activation registry-private |
| One predicate conflating receiver membership with active origin | Blocks real input to unused direct Agent | CD-002 two private responsibilities | In This Change | No weaker public sender authorization |
| Raw submission-message alias | Misses computed invalidation | CD-004 canonical reactive object | In This Change | No duplicate message |
| Unguarded async selection/always-success outward emission | Stale focus and shell overwrite | CD-003 current outcome propagation | In This Change | Existing context guards remain |
| Dropped newer route links/unconditional current-query stripping | Old request edits newer route | Guarded captured-link cleanup | In This Change | No new queue |
| Original mixed configured nesting / broad old-ticket artifacts | Not this target | None | N/A | Do not import/revive |

## Return Or Event Spine(s) (If Applicable)

DS-005: `accepted runtime/command/root snapshot → exact execution event/status → existing stream/context apply → history navigation publication + center render`. Root activity, exact Agent status and mounted-Team aggregate remain distinct. This flow does not call the selection-intent API.

## Bounded Local / Internal Spines (If Applicable)

- DS-006, local submission owner: `finalize accepted locator → canonical message proxy property → computed attachment item → click`. No forced parent revision workaround.
- DS-007, configured handle/root owner: `reserve/ensureReady → share pending readiness → prepare provider → root binding commit → bind/publish → input`, with existing abort/quarantine and termination fence. Preserve; no new lifecycle loop.

## Off-Spine Concerns Around The Spine

| Concern | Spine | Serves owner | Responsibility | Reason / misplacement risk |
| --- | --- | --- | --- | --- |
| Strict config/package validation, atomic persistence | 001,002,007 | Root | Exact topology, null/bound semantics, durable publication | UI or caller bypass would fabricate identity/start success |
| Provider binding/activity planner | 002,007 | Handle | Fresh/restore preparation, failure/retry | Global change would alter task/retained history policy |
| Exact identity/checkpoint/freshness guards | 003,005 | Hydration/context | Preserve current data authority | Intent guard is not a substitute for physical read freshness |
| Error/loading/attempt ownership | 003 | Selecting coordinators | Current failures and non-destructive supersession | Old finally could overwrite newer UI state |
| Draft/expansion/center retention | 003,005 | Existing view/context | Preserve local work and explicit presentation | Global store resets lose unrelated work |
| Final upload ownership/link normalization | 004,006 | Existing upload/opener | Exact finalized file association/access | Message helper must not repair disk/URL policy |
| Evidence/runtime preflight/cleanup | All | Executable owner | Focused supported journeys, isolated resources | Archived roots are not replay targets |

## Ownership Boundaries

Existing root APIs are authoritative; configured registries/activation plans remain internal. Org root retains complete scope and authorization; communication reserves exact eligible recipients. Frontend user actions alone acquire selection authority; data publishers alone do not. Existing open boundaries encapsulate their hydration/focus effects and must accept the shared guard rather than force callers to patch lower stores afterward. Submission handle and conversation share one message proxy; upload owner supplies the finalized attachment result.

## Boundary Encapsulation Map

| Authoritative boundary | Internal mechanism | Required callers | Forbidden bypass | Boundary correction |
| --- | --- | --- | --- | --- |
| Materialize/build root | Prepared plans/durable commit | Launch/restore managers | UI starts all Agents to fill status | CD-001 caller mode policy |
| Root public command | Origin auth/index/recipient reservation | User/inter-Agent/task adapters | Directly invoke provider for unused recipient | CD-002 private membership split |
| Selecting open/inspect | Hydration, focus, selected fields, effects | Sidebar/links | Parent checks token after low-level stale focus | Propagate guard to commit boundary |
| Begin/finalize local submission | Canonical message + effects | Agent/Team/Org submitters | Raw alias/copy and forced remount | CD-004 one proxy |

## Dependency Rules

1. Keep existing transport → root → local execution → Agent runtime direction. Root package durability precedes binding/runtime publication. No UI-to-provider startup shortcut.
2. Do not change shared task/restore readiness to implement fresh-configured policy. No configured Team recursion or Org coordinator.
3. Selection entry owns acquisition; lower open/inspection owns guarded side effects. Type-only guard imports from the selection owner are acceptable; no helper cycles that instantiate router/store globally.
4. Streaming/history publication does not acquire intent, select a prior run, clear drafts/config or issue shell navigation. Temporary-ID promotion is continuity, not new navigation intent.
5. UserMessage/opener consumes final attachment facts; it does not guess final paths from draft paths. No second file registry/message store.
6. Current strict schemas remain sole runtime forms. No legacy reader fallback or migrations in business handlers.

## Interface Boundary Mapping

| Interface | Subject / responsibility | Accepted identity | Notes |
| --- | --- | --- | --- |
| Existing root materialize/build + activation mode | Configured scope admission | Exact Team/Org root and current topology | Fresh/restore remains explicit |
| Prepared configured Org Agent plan | Root-side binding mutations and publication/abort | One configured node/handle | Arrays instead of mandatory exposed provider activation |
| Private membership / origin checks | Route eligible receiver / authorize sender | Existing compound root + address + AgentRun ID | Separate meaning; task live-index checks retained |
| Selection owner begin/invalidate | One pending explicit intent | Owner-issued opaque guard, no copied subject | No persistent epoch or per-component competing token |
| Selecting open/inspect result | Committed target, superseded, or existing rejection | Exact Agent ID or Team+Agent ID; Org root+address/execution ID | Preserve distinction between address placement and task execution |
| Begin/finalize submission handle | One optimistic message | Same context/message proxy, existing navigation target | Nullable Org navigation target behavior unchanged |

## Interface Boundary Check

| Interface | Singular? | Identity explicit? | Ambiguity risk | Action |
| --- | --- | --- | --- | --- |
| Root/prepared scope | Yes | Yes | Low | Hide optional provider activation |
| Membership versus origin | Yes after split | Yes | Medium before correction | CD-002, retain negative auth tests |
| Selecting open/inspect | Yes | Yes | Medium before correction | Explicit guard/outcome; no void-as-success |
| Submission handle | Yes | Yes | Medium raw/proxy risk | Same canonical object, no parallel record |

## Main Domain Subject Naming Check

| Subject | Name | Natural? | Drift risk / action |
| --- | --- | --- | --- |
| Root and mounted scope | Existing TeamRun / AgentOrgRun | Yes | Do not call mounted scope a new root |
| Configured handle | ConfiguredAgentExecutionHandle | Yes | Document registered ≠ started; registry `active` map denotes published entries |
| Selection authority | Workspace selection intent/guard | Yes | Not “status epoch”, new selected subject, or history cache |
| Local user message | LocalUserSubmissionHandle.message | Yes | Must be actual reactive message, not snapshot |

## Existing Capability / Subsystem Reuse Check

| Need | Existing capability | Decision | Why | New subsystem? |
| --- | --- | --- | --- | --- |
| Deferred worker readiness | FlatTeam factory/registry + shared handle/planner | Reuse | Already owns single readiness/binding/Stop | No |
| Configured Org scope publication | Org scope builder/direct registry/Team directory | Extend | Correct admission boundary | No |
| Latest explicit selection | agentSelectionStore + current open coordinators | Extend | Existing user-selection authority | No |
| Reactive first message | localUserSubmission + Vue | Reuse/repair | Correct local message owner | No |
| Exact file Open | Existing upload/finalization/opener | Reuse unchanged | File/access evidence is correct | No |

## Subsystem / Capability-Area Allocation

| Area | Owns | Spine | Owner served | Decision | Notes |
| --- | --- | --- | --- | --- | --- |
| Team/Org runtime composition | Fresh scope without eager workers | 001/002/007 | Root/handle | Extend | No shared policy rewrite |
| Workspace selection/run open | User intent/commit sequencing | 003 | Selection owner | Extend | Background read contracts retained |
| Submission/presentation | Canonical optimistic message | 004/006 | Submitter/UserMessage | Repair | No storage change |
| Runtime/history publication | Exact status/tasks/messages | 005 | Root/context | Reuse | Regression controls, not speculative rewrite |

## Draft File Responsibility Mapping

| Candidate | Area / owner | Concern | Cohesion / reuse |
| --- | --- | --- | --- |
| Team root materializer; Org builder/registries/run | Runtime roots | Fresh call policy, configured plan shape, receiver membership | Existing composition owners; shared handles unchanged |
| agentSelectionStore | Workspace selection | Single ephemeral guard | Co-located with selection authority, no second store |
| History actions/open coordinators/UI/router entry | Workspace selection | Capture/propagate/check same guard and outcome | Keep loading/focus behind existing open boundaries |
| localUserSubmission | Submission | One canonical reactive message | Existing helper already serves all submitters |

## Reusable Owned Structures Check

| Repeated structure | Shared home | Owner | Why shared | Redundancy/overlap removed? | Must not become |
| --- | --- | --- | --- | --- | --- |
| Selection guard and superseded outcome | Exported types at existing selection owner / existing open result types | Workspace selection | Same intent crosses Team/Agent/Org selecting calls | Yes: no independent component counters or duplicate selected identity | General task cancellation framework |
| Prepared binding arrays/commit/abort | Existing Org configured prepared-plan type, aligned with FlatTeam plan semantics | Runtime composition | Builder needs mutations/publication, not internals | Yes: mandatory exposed activation removed | New universal lifecycle abstraction |
| Message record | Existing UserMessage type/proxy | Submission | Handle and renderer share it | Yes: raw/proxy alias divergence removed | Optimistic message mirror store |

## Shared Structure / Data Model Tightness Check

| Structure | One meaning/field? | Redundancy removed? | Overlap risk | Action |
| --- | --- | --- | --- | --- |
| Prepared configured plan | Yes | Yes | Low | Empty arrays represent no binding work, not fabricated activation |
| Selection guard | Yes | Yes | Low | Current intent only; no route copy or runtime generation |
| Open outcomes | Yes | Yes | Low | Superseded is not committed/rejected; preserve payload only for committed |
| UserMessage | Yes | Yes | Low | Same proxy, existing type/storage fields |

## Final File Responsibility Mapping

| ID / file(s) | Area / owner | Final responsibility | Why here / shared structure |
| --- | --- | --- | --- |
| F1 `S/agent-team-execution/services/team-root-materializer.ts` | Team root | Fresh deferred option, restore preserved | Existing root lifecycle composition |
| F2 `S/agent-org-execution/services/agent-org-root-agent-execution-registry.ts` | Org direct registry | Fresh unstarted handle plan, restore staging; private optional activation | Exact configured handle publication/abort |
| F3 `S/agent-org-execution/services/agent-org-execution-scope-builder.ts` | Org root | Consume staged arrays; same package-before-publication | Does not inspect provider activation |
| F4 `S/agent-org-execution/services/agent-org-team-execution-directory.ts` | Org Team directory | Defer fresh configured workers only | Task calls unchanged |
| F5 `S/agent-org-execution/domain/agent-org-run.ts` | Org root | Private exact-membership predicate versus active-origin authorization | Shared communication engine remains unchanged |
| F6 `W/stores/agentSelectionStore.ts` | Workspace selection | Current intent begin/invalidate/guard type | Selected-subject shape unchanged; no automatic intent from background mutations |
| F7 `W/composables/useWorkspaceHistorySelectionActions.ts`, `useWorkspaceHistorySubjectActions.ts` | Explicit history ingress | Begin once, propagate, honor superseded, emit/navigate only current | Same guard for legacy/Org paths; Stop mode handling stays truthful |
| F8 `W/stores/runHistorySelectionActions.ts`, `runHistoryTeamMemberInspectionActions.ts`, `runHistoryLoadActions.ts` (only selecting open), `runHistoryStore.ts` | History wrapper boundary | Typed propagation, selected fields/error/loading ownership, no void success on supersession | Existing store methods and exact attempts |
| F9 `W/services/runOpen/agentRunOpenCoordinator.ts`, `teamRunOpenCoordinator.ts`, `teamMemberInspectionCoordinator.ts` | Open/inspection | Guard after awaits and before selecting candidate/focus/recovery commit; outcome propagation | Preserve existing hydration identity/revision/stream guards |
| F10 `W/services/workspace/workspaceNavigationService.ts`, `W/composables/workspace/useWorkspaceRouteSelection.ts` | Explicit execution links/router | Propagate intent, observe actual link keys, process latest link, conditional cleanup/invalidation | Existing parser/router; no new route service |
| F11 `W/components/workspace/history/WorkspaceAgentRunsTreePanel.vue`, `W/components/AppLeftPanel.vue`, `W/components/workspace/running/RunningAgentsPanel.vue` | UI ingress/wiring | Supply guard where required, direct explicit selection invalidation, current committed shell event only | Thin wiring; no new per-component owner; untouched markup otherwise |
| F12 `W/services/runSubmission/localUserSubmission.ts` | Submission | Construct/append/retain same reactive message | No opener/server changes |

F11 is wiring scope, not authorization for a shell rewrite. Route leave/update invalidation belongs in F10; no speculative global router hooks/plugin. Existing explicit create paths reached from F7/F11 begin intent before awaits; promotion/state publication does not. Additional propagation in a directly invoked in-scope typed wrapper is mechanical; moving selection ownership or changing unrelated launch policy is Design Impact.

## Applied Patterns (If Any)

Existing lazy readiness and prepared-then-durable-publication (runtime); latest explicit request guard (selection only); canonical reactive identity (submission). No new worker queue, event bus, cache, state machine, provider/API protocol, or generic cancellation framework.

## Target Subsystem / Folder / File Mapping

| Path | Kind | Owner | Action / responsibility | Why here | Must not contain |
| --- | --- | --- | --- | --- | --- |
| F1–F5 exact files above | File | Existing Team/Org runtime | Change named composition/membership boundaries | Existing folder depth separates services/domain/local mechanics | UI status workaround or task/restore redesign |
| F6–F11 exact files above | File | Existing workspace selection | Change guard acquisition/propagation/commit wiring | Existing stores, services/runOpen, services/workspace and composables remain distinct | Second routing subsystem or stream suppression |
| F12 exact file above | File | Existing submission | Change canonical reference only | Existing services/runSubmission owner | Filesystem/opener policy |
| `autobyteus-server-ts/tests/unit/agent-team-execution/`, `tests/unit/agent-org-execution/`, relevant `tests/integration/` | Folder | Implementation validation | Add/extend focused launch/readiness/identity/persistence tests | Test ownership mirrors touched boundaries | Old whole-suite replay or test-only product path |
| `W/services/runOpen/__tests__/`, `W/composables/__tests__/`, `W/composables/workspace/__tests__/`, `W/stores/__tests__/` | Folder | Implementation validation | Real-composition deterministic selection/publication controls | Existing test locations | Only mocked `selectTreeRun` promise claimed full proof |
| `W/services/runSubmission/__tests__/localUserSubmission.spec.ts` and relevant conversation/first-Send tests | File/Folder | Implementation validation | Reactive proxy + actual rendered chip/promote/finalize regression | Existing helper/UI tests | Plain objects as sole reactive proof |
| New folders / moved production files | N/A | — | None planned | Existing structure adequate | Artificial one-folder-per-spine expansion |

## Folder Boundary Check

| Folder | Depth | Clear? | Risk | Justification |
| --- | --- | --- | --- | --- |
| Server Team/Org services/domain/local | Main-Line Domain-Control | Yes | Low | Composition changes remain at roots; shared handle reused |
| Web stores / runOpen / workspace / composables | Mixed Justified across established folders | Yes | Medium if over-expanded | One guard owner, existing entry/commit boundaries; no new parallel subsystem |
| Web runSubmission / conversation components | Main-Line + presentation separated | Yes | Low | Mutation helper fix; rendering/opener controls unchanged |
| Existing persistence/migrations | Persistence-Provider | Yes | Low | No code/model transformation required |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good | Avoid | Why |
| --- | --- | --- | --- |
| Fresh Org | Full direct+Team scope, root active, worker handles unstarted/Offline | Omit mounted scope or start all Agents then recolor | Availability ≠ worker readiness |
| First inter-Agent input | Active sender authorized → exact unstarted registered recipient → reserve/readiness | Require recipient runtime active before reserve | Otherwise lazy direct Agents are unreachable |
| Selection race | A awaits, B begins, A returns superseded without focus/event | Only suppress parent route after A already changed focus | Ownership must reach commit boundary |
| Final text chip | Append `reactive<UserMessage>(...)`, retain same object | Return raw pre-proxy object and increment another revision | Computed dependency must observe mutation |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate | Considered because | Decision | Replacement |
| --- | --- | --- | --- |
| Original mixed/nested Team backend | Original lazy behavior | Rejected | Existing flat/current handles; copy principle only |
| Old eager-fresh flag fallback | Avoid changing eager tests | Rejected | Fresh configured policy changed cleanly; real restore/task distinctions remain |
| Raw message plus forced remount/reload | Appears to refresh stale link | Rejected | Canonical reactive object |
| Old void-select completion fallback | Avoid propagating result types | Rejected | Explicit current/superseded outcome through selecting boundaries |
| Runtime dual-shape persistence reader | Fear of null bindings | Rejected | Existing current-schema nullable binding already valid; no migration |

## Derived Layering (If Useful)

Existing UI/transport entries → root or selection/submission owners → private readiness/hydration/reactivity mechanisms → persistence/provider/presentation boundaries. No layer moves. Source evidence supports extending existing boundaries, not introducing another orchestration layer.

## Change / Refactor Sequence

1. Preserve RER-002/base/source pin and focused evidence. Independent architecture review first. No source work is claimed here.
2. Implementation establishes focused before-fix regression/reproduction: real fresh Team/Org lifecycle counters, deterministic delayed selecting composition and raw/proxy rendered chip. For the original background journey instrument ordinary UI intent/route/context/publication ordering without changing semantics. Distinguish no-reproduction from identified cause.
3. Apply F1–F5 together: fresh deferred configured plans **and** direct receiver membership/origin split, retaining restore/task/planner/atomic writer behavior. Add failure/concurrent-first-input/Stop/read-only controls before claiming lifecycle complete.
4. Apply F6–F11 as one complete guard propagation, including lowest commit and outward shell events. Remove old unguarded paths; no temporary success fallback ships. Exercise supported rapid/slow navigation plus pure background publication and draft retention.
5. Apply F12 canonical proxy correction; actual reactive store/first promotion/finalization/render/open regression, including error/no-op and shared submitter controls. No server/storage/opener repair without new evidence.
6. Implementation-scoped validation/build/type checks proportionate to changed boundaries; source review selected through current team rules. API/E2E performs **new ticket focused** ordinary desktop journeys + targeted narrow controls with isolated owned data/provider setup and durable regressions. Not automatic old massive suite.
7. Any remaining material design mechanism/requirement gap returns by rules. Delivery alone owns later integration/docs/user verification/finalization and terminal package. No deployment/cutover authorization in this design.

## Key Tradeoffs

- Fresh scope is available earlier; backend-readiness failure moves to first real work, with existing truthful initialization/error and durable binding machinery. Config validation remains upfront. Restore/task behavior deliberately does not change.
- One shared selection guard adds small typed propagation, but avoids multiple ad-hoc component flags. It does not cancel network work or change history freshness. Discarding a superseded selecting candidate is safer than publishing its stale focus.
- Canonical proxy changes one shared helper rather than forcing rendering/file-access changes. Tests must cover real reactivity because plain-object tests already miss the mechanism.
- Focused deterministic overlap diagnostics expose ordering without asserting fast user input is the only cause or original personal is defective. Hosted journeys remain decisive for acceptance.

## Risks

1. Skipping eager setup without retaining registration or recipient eligibility would break first inter-Agent work; CD-001/002 must land together.
2. Deferral accidentally applied to restore/task preparation would change approved history/task contracts; preserve named mode boundaries and controls.
3. Only guarding top-level UI would leave lower stale focus/config mutations. Missing propagation or stale finally/error writes is a review blocker.
4. Treating all store/route changes as user intent could cancel legitimate newer selection during publication/promotion. Acquire only at deliberate entry; distinguish semantic route changes from same-root mode updates.
5. Original publication-only cause remains unassigned. No blanket “fixed” claim from the controlled different ordering or later non-reproduction.
6. Architecture probes are controlled, using old-tree dependencies; downstream must run installed current production composition and real frontend/provider evidence. Missing DeepSeek/runtime prerequisite is Not Tested/blocked evidence, never Pass.
7. No actual installation scan/rollback/rollout performed. Current schema invariants justify no migration, not permission to mutate existing stores or external definitions.

## Guidance For Implementation

Use [architecture-design-self-validation.md](architecture-design-self-validation.md) as the design walkthrough/coverage map, not an executed report. Preserve all requirements IDs and prior evidence limits. Keep all three fixes in this new ticket. Use representative controlled fixtures for repository tests and **new owned** normal GUI journeys for acceptance; do not replay old roots or rewrite archived evidence. Native worker proof is not Electron-shell proof. No image/unknown-file/provider expansion, Product redesign, old whole-suite rerun, or broad refactor is prescribed.

Completion requires truthful source/validation outcomes for current changes and selected route gates. This design is ready for independent review, not implemented, approved by Architecture Reviewer, or delivered.
