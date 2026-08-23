# Design Spec

## Current-State Read

The first user message activates a prepared run through `AgentRunCommandCoordinator`, `AgentRunService`, and `AgentRunManager`. The selected backend factory invokes the runtime bootstrapper before a Codex thread or Claude session is started. Each bootstrapper resolves the agent's configured skills through `SkillService`; Codex additionally asks `skills/list` which resolved skill names are already discoverable. The current Codex bootstrapper removes such resolved skills from the materializer input, so discovery currently controls both whether a new link is needed and whether the expected configured workspace path is inspected at all.

Codex and Claude each implement an almost identical materializer. Each owns path naming, source-manifest validation, path inspection, a holder-count registry, link creation, and guarded cleanup. Their state union contains only `missing`, `same-source-symlink`, and `collision`. Therefore the reachable persisted state “different symlink whose target was deleted after a source move” is indistinguishable from a live different link and fails before runtime start (BEH-001/BEH-002).

`ConfiguredAgentSkillResolver` already owns raw-name validation and warns/skips a safe unresolved name, but returns only `Skill[]`. That loses the validated unresolved identity before workspace reconciliation (BEH-004). `AgentRunManager` correctly owns private candidate preparation and cleanup; it wraps unexpected errors with a stable safe message and assigns the original to `.cause`, but does not log the underlying error. `AgentRunCommandCoordinator` then correctly exposes only the safe outer message (BEH-003).

The current materializers also acquire multiple configured skills sequentially but return descriptors only after the complete batch succeeds. A later collision can therefore strand earlier holders. Their final release deletes its registry entry before awaiting guarded unlink, so a concurrent new acquisition can return the old descriptor before the old cleanup removes its link. These reachable lifecycle gaps were confirmed in architecture review `ARCH-REV-001` as `DI-001`–`DI-003`.

The target design must retain runtime-specific paths, Codex discovery preflight, link holder cleanup, safe UI error presentation, and model/provider pass-through. Discovery may suppress unnecessary creation for an initially missing path, but it must not suppress configured-path reconciliation. One per-key lifecycle must serialize acquisition with final cleanup, and one batch invocation must roll back its own earlier acquisitions before rethrowing a later failure. The design must not use a historical source-path map or broad workspace migration.

## Intended Change

1. Introduce a resolver-owned `ConfiguredAgentSkillBinding` union so an already-validated configured identity can reach runtime reconciliation whether it resolved or not.
2. Replace the duplicate Codex/Claude algorithms with one shared `WorkspaceSkillMaterializer` policy owner configured by a small runtime profile.
3. Add first-class broken-symlink inspection and a guarded link-only repair transition.
4. Warn/skip when no valid source is available, including removing a verified broken link for an unresolved safe configured name.
5. Keep live different symlinks and non-symlink collisions fatal and non-destructive.
6. Map every safe binding to a workspace reconciliation request. Codex discovery selects `reconcile-discoverable` rather than removing the binding; only the initial-missing action differs from `expose-resolved`.
7. Give every resolved workspace/source key one `acquiring → ready/held → releasing` lifecycle. A new acquire that observes `releasing` waits for cleanup and then rematerializes; it never receives the descriptor being cleaned.
8. Make each multi-binding materialization call transactional with respect to its own holder acquisitions: on a later failure, release all descriptors acquired by that invocation in reverse order and rethrow the original error.
9. Log unexpected preparation errors as error objects at the `AgentRunManager` boundary before preserving the current generic wrapper/command/UI contract.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Approved Requirement / Intent And Acceptance-Criteria IDs | Approved Trigger Or Governing Contract | Relevant Existing Behavior And Evidence Reference | Approved Change Or Preserved Outcome | Target Production Path / Lifecycle And Spine ID(s) |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | FR-002, FR-003, FR-007; AC-001, AC-002, AC-006 | First create/restore activation for an agent with a moved configured skill and a broken old-source runtime link | Investigation behavior table; Experiments A/B; `ARCH-REV-001`/`PREM-001` | Guardedly unlink only the broken link, recreate it to the valid current source, warn, and continue activation even if Codex reports the skill name discoverable at another scope | Command → manager/backend bootstrap → safe binding resolution → Codex discovery annotation (never deletion) → shared materializer `broken-symlink` transition → runtime start (DS-001, DS-003) |
| BEH-002 | System | FR-002, FR-003, FR-006; AC-003, AC-007, AC-008, AC-009 | Runtime bootstrap asks for configured workspace skill exposure; supported acquire/release operations overlap; one agent may configure multiple skills | Duplicate materializer sources/tests; `ARCH-REV-001`/`PREM-002`/`PREM-003` | One shared state machine differentiates path states; one per-key phase machine serializes readiness and final cleanup; one call-scoped rollback releases only that invocation's acquisitions on a later failure | Runtime profile/request plan → shared path reconciliation → per-key lifecycle → descriptor batch or rollback → coordinated cleanup (DS-001, DS-003, DS-004, DS-005) |
| BEH-003 | Operational | FR-004; AC-004 | Unexpected failure during private candidate preparation | Manager/coordinator trace and screenshot | Manager logs run/runtime plus original error object; wrapper and `ACTIVATION_FAILED` UI message stay generic | Failure → manager diagnostic/cleanup/wrapper → coordinator ACK/status → UI (DS-002) |
| BEH-004 | User / System | FR-001, FR-002, FR-003; AC-005, AC-006 | Active configured safe name has no current resolvable source | Missing-skill production experiment; resolver source | Resolver still warns; unresolved binding lets materializer remove only a broken link, warn with run/path/disposition, and omit the skill | Binding resolution → shared materializer unresolved branch → runtime start without descriptor (DS-001, DS-003) |
| BEH-005 | Contract | FR-005; AC-010 | Selected `codex_app_server` + `gpt-5.6-luna` activation after workspace preparation | Direct Codex control and successful run metadata | No mapping/fallback change; existing thread config/start path is preserved | Config → bootstrapper → current Codex thread config/client (DS-001) |

## Relevant Supplemental Task Artifacts

| Artifact Path | Purpose | Related Requirement / Acceptance-Criteria IDs | Relationship To This Design | Status / Approval Applicability |
| --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/codex-luna-agent-run-prepare-failure/evidence/full-stack-reproduction/experiment-report.md` | Production-path reproduction and A/B causal controls | FR-001, FR-002, FR-004, FR-005, FR-007; AC-001, AC-004, AC-005, AC-010 | Proves which transition must change and which provider/missing-skill behaviors must remain | Complete; N/A approval (evidence) |
| `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/codex-luna-agent-run-prepare-failure/evidence/full-stack-reproduction/` | Raw GraphQL/WebSocket/log/run-metadata/exception evidence | AC-001, AC-004, AC-005, AC-010, AC-011 | Supplies exact production events and strings for downstream coverage comparison | Complete; N/A approval (evidence) |
| `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/codex-luna-agent-run-prepare-failure/evidence/reported-ui-error.png` | Reported UI failure state | FR-004; AC-004 | Establishes the generic UI contract to preserve; no UI feature is designed | Complete; N/A approval (evidence) |
| `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/codex-luna-agent-run-prepare-failure/design-review-report.md` | Architecture review Round 1 and reachable lifecycle findings | FR-002, FR-007; AC-001, AC-006, AC-007, AC-008, AC-009 | `ARCH-REV-001` supplied `DI-001`–`DI-003`/`PREM-001`–`PREM-003`; SR-002 incorporates all three without changing requirements | Authoritative Round 1 report; review applicability N/A |
| `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/codex-luna-agent-run-prepare-failure/architecture-review-revision-record.md` | Architecture-review round index | Same as review report | Records the Round 1 Fail baseline that triggered this design revision | Current through `ARCH-REV-001`; review applicability N/A |

## Task Design Health Assessment (Mandatory)

- Change posture (`Bug Fix`).
- Current design issue found (`Yes`).
- Root cause classification (`Missing Invariant` and `Duplicated Policy Or Coordination`).
- Refactor needed now (`Yes`).
- Evidence: the delivered build fails solely when the broken link exists; both runtime materializers encode the same incomplete three-state policy and duplicate the same registry/cleanup logic; the resolver discards safe unresolved identity too early. `ARCH-REV-001` additionally proves that current name-only discovery filtering can bypass reconciliation, final cleanup can race a new holder, and a later binding failure can strand earlier holders.
- Design response: add the missing path and holder invariants in one shared owner, carry a tight resolution union from the existing validation authority, map Codex discovery into request intent rather than binding deletion, make per-key acquire/release one phase lifecycle, make batch acquisition roll back locally, retain runtime files only as profile composition roots, and log causes at the existing preparation owner.
- Refactor rationale: implementing repair twice would leave the same safety decision in two owners and make Codex/Claude drift likely. The new state is filesystem-policy behavior, not runtime-provider behavior.
- Intentional deferrals and residual risk: no background sweep, historical path registry, UI warning channel, or broad manual-corruption repair. The shared registry serializes only one materialization key and the batch rollback owns only acquisitions made by its call; no general filesystem transaction framework is introduced.

## Terminology

- **Configured agent skill binding:** a resolver-produced discriminated union containing either a resolved `Skill` or a validated safe configured name that could not resolve. Invalid raw names never become bindings.
- **Workspace reconciliation request:** a materializer input derived from one safe binding: `expose-resolved`, `reconcile-discoverable`, or `reconcile-unresolved`. Discovery changes request intent; it never removes configured identity.
- **Materialization profile:** runtime label plus conventional workspace root segments, for example Codex + `[".codex", "skills"]`.
- **Broken symlink:** an expected path that is itself a symbolic link and whose resolved target returns `ENOENT` or `ENOTDIR`. Permission/I/O failures are not classified as broken.
- **Live collision:** a different symlink whose resolved target exists, or any non-symlink at the expected materialization path.
- **Projection:** the disposable workspace symlink; the skill source directory is authoritative content and is never a projection.
- **Per-key lifecycle entry:** the sole registry entry for one runtime-profile singleton and materialized workspace path while it is `acquiring`, `ready`, or `releasing`. The entry records its source root and remains registered through final cleanup, so two sources cannot mutate the same path through different locks.
- **Call-scoped rollback:** release of exactly the descriptor acquisitions completed by one failed `materializeConfiguredWorkspaceSkills` invocation, without releasing holders owned by another call.

## Design Reading Order

The remainder follows state transition → spines/ownership → boundaries/interfaces → file projection → change sequence. The filesystem decision table is the key local mechanism; runtime bootstrap and error return remain the wider production spines.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: remove the two duplicated path-state/materialization/registry/cleanup implementations and their runtime-specific descriptor/method types. Runtime-specific files remain only as explicit profile/singleton composition roots, not delegating compatibility facades.
- No old agent-local path lookup, historical source map, fallback link, dual materializer, or startup migration is retained.
- Current callers move directly to shared `WorkspaceSkillMaterializer` and `MaterializedWorkspaceSkill` contracts in the same change.

## Persisted Data / State Transition Decision (Mandatory When Persisted Data May Be Affected)

- Stored subject, location, representative shape, and approximate volume: symlink projections at `<workspace>/.codex/skills/<sanitized-name>` or `<workspace>/.claude/skills/<sanitized-name>`; one observed broken link, generally a small number bounded by active configured skills.
- Relevant code-model, serialization, semantic, or physical-store change: the normal materialization reader adds an explicit broken-link state and may discard/rebuild that projection on demand. No database/schema change.
- Normal reader/writer behavior and representative evidence: materializer validates source and inspects/creates/reuses links during create/restore; Codex discovery may suppress initial-missing creation but cannot suppress inspection; holder cleanup conditionally unlinks after final release while the per-key registry entry remains in `releasing`. Experiment B proves link removal followed by normal creation rebuilds the correct state. `PREM-001`–`PREM-003` establish why discovery annotation, acquire/release serialization, and failed-batch rollback are required readers/writers of the same derived lifecycle.
- Required semantics and invariants under direct use: skill source content remains authoritative and untouched; only a verified link may be unlinked; current-source exposure is correct; collisions remain untrusted.
- Physical-store, privacy/security, disposal/rebuild, and operational constraints: link count is small; no bulk I/O, downtime, or user-data rewrite; target traversal/deletion is prohibited.
- Decision (`Discard or Rebuild`): discard the verified broken projection and rebuild from the current resolved source when available.
- Decision rationale, including concrete benefit versus I/O, downtime, corruption, recovery, and rollout cost: on-demand reconciliation is local and already sits at the authoritative create/cleanup lifecycle. A migration/sweep would add ownership ambiguity and unnecessary I/O/corruption risk. No maintenance window is justified.
- Acceptance criteria or design constraints supported by this decision: FR-002, FR-003, FR-007; AC-001, AC-002, AC-006, AC-008, AC-009.

### Migration Plan

N/A — decision is `Discard or Rebuild`; the shared materializer performs current-state on-demand reconciliation before runtime start.

## Data-Flow Spine Inventory

| Spine ID | Scope | Related Behavior ID(s) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-001, BEH-002, BEH-004, BEH-005 | First message requires create/restore activation | Active runtime thread/session accepts the command, with every configured path reconciled and each skill exposed, already discoverable, or safely omitted | `AgentRunManager` governs candidate lifecycle; runtime bootstrapper governs request planning; shared materializer governs link state/batch acquisition | Shows the real business path and proves discovery never bypasses repair before provider start |
| DS-002 | Return-Event | BEH-003 | Non-degradable preparation exception | Server diagnostic plus stable failed command ACK/error status/UI message | `AgentRunManager` owns diagnostic/wrapper; coordinator owns transport projection | Prevents cause loss without leaking internal paths to the UI |
| DS-003 | Bounded Local | BEH-001, BEH-002, BEH-004 | One workspace reconciliation request at an expected path | Descriptor for an acquired/created/repaired managed link or safe no-descriptor outcome; otherwise fail-closed exception | `WorkspaceSkillMaterializer` | Captures intent-aware path reconciliation and mutation safety |
| DS-004 | Primary End-to-End | BEH-002 | Run/backend termination releases materialized descriptors while another activation may acquire the same key | Final cleanup completes before a waiting acquire rematerializes/returns, or a retained holder prevents cleanup | `WorkspaceSkillMaterializer` behind backend cleanup | Preserves holder lifecycle across acquire-versus-final-release concurrency |
| DS-005 | Bounded Local | BEH-002, BEH-003 | One multi-request materialization call has acquired one or more descriptors and a later request fails | Every descriptor occurrence acquired by that call is released exactly once; original failure is rethrown | `WorkspaceSkillMaterializer` | Prevents orphan holders/links when bootstrap never receives a partial batch |

## Primary Execution Spine(s)

**DS-001 — Activation:**

`Electron/WebSocket SEND_MESSAGE → AgentRunCommandCoordinator → AgentRunService → AgentRunManager candidate preparation → runtime backend factory/bootstrapper → SkillService binding resolution → Codex discovery annotation (Codex only) → one reconciliation request per binding → shared WorkspaceSkillMaterializer batch → Codex thread / Claude session start → accepted command`

**DS-004 — Cleanup:**

`Run termination/failed backend cleanup → runtime cleanup owner → shared WorkspaceSkillMaterializer.release → per-key ready entry decrements → zero holders transitions entry to releasing before await → guarded link-only cleanup → exact entry removal → waiting acquire retries/rematerializes`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | Candidate preparation resolves safe bindings. Codex annotates each resolved binding as already discoverable or needing workspace exposure; it does not delete bindings. The bootstrapper maps every active binding to one reconciliation request, the shared owner completes the full batch or rolls it back, and only then starts the selected runtime unchanged. | command, candidate, binding, reconciliation request, materialized batch, runtime thread/session | Manager + runtime bootstrapper + materializer at their lifecycle boundaries | name validation, Codex discovery preflight, warning logging |
| DS-002 | A genuine exception is recorded with its original error object by the manager, cleanup runs, then the current generic wrapper moves through command ACK/status to the UI. | preparation failure, safe activation failure | Manager for diagnostics/wrap; coordinator for transport | cleanup/quarantine, broadcaster |
| DS-003 | The materializer derives the expected path from a reconciliation request, applies request intent plus lstat/readlink/target state, rechecks before unlink, and returns a descriptor only when this call acquires a managed link. A discoverable resolved request still repairs a broken path but leaves an initially missing path absent. | request, path state, descriptor/no-descriptor result | Shared materializer | filesystem adapter calls, warnings, runtime profile |
| DS-004 | Release decrements a `ready` entry. Zero holders synchronously transitions that same registered entry to `releasing` before cleanup awaits. An acquire observing `releasing` waits, then retries against the post-cleanup filesystem; it cannot receive the descriptor that cleanup may remove. | descriptor, phased registry entry, workspace link | Shared materializer | cleanup warning on I/O failure |
| DS-005 | The public batch method records every returned descriptor occurrence. If request N fails, it releases recorded occurrences in reverse order through the same per-key lifecycle, logs but does not substitute rollback errors, and rethrows the original request-N error object. | request batch, acquired descriptor ledger, original failure | Shared materializer | rollback warning diagnostics |

## Spine Actors / Main-Line Nodes

- `AgentRunCommandCoordinator`: supported first-message entry and ACK/status return.
- `AgentRunService`: resolves whether activation is needed.
- `AgentRunManager`: private candidate claim, backend preparation, cleanup, publication, safe wrapping, diagnostic boundary.
- Codex/Claude backend bootstrapper: runtime-specific preparation sequence and current runtime configuration.
- `SkillService` / `ConfiguredAgentSkillResolver`: authoritative configured-name validation and binding resolution.
- `WorkspaceSkillMaterializer`: authoritative workspace link policy, registry, mutation, and cleanup.
- Codex app-server client / Claude session owner: unchanged provider start and runtime execution.

## Ownership Map

- **Manager:** owns run identity claim and candidate lifecycle. It logs unexpected preparation failures because it is the last boundary holding both run/runtime identity and the original error before wrapping.
- **Runtime bootstrapper:** owns ordering of working-directory/agent/skill preparation and provider-specific configuration. Codex alone owns `skills/list` preflight and maps its result to `reconcile-discoverable`; it cannot delete a configured binding from reconciliation.
- **SkillService/resolver:** owns whether a raw configured name is safe and whether it maps to a current `Skill`; no filesystem consumer revalidates raw agent configuration independently.
- **Shared materializer:** owns expected path derivation from reconciliation requests, request-intent/path-state classification, safe mutation, descriptor identity, the complete per-key phase lifecycle, call-scoped rollback, warnings, and guarded cleanup.
- **Runtime composition file:** thin profile/singleton construction only; it is not a policy owner.
- **Command coordinator:** owns the user-safe ACK/status surface and must not walk or serialize internal causes.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `SkillService.resolveConfiguredSkillBindingsForAgent` | `ConfiguredAgentSkillResolver` | Stable service entry for catalog/context resolution | Runtime paths or link mutation |
| `getCodexWorkspaceSkillMaterializer` | Shared `WorkspaceSkillMaterializer` configured with Codex profile | Process singleton/holder identity for Codex workspace links | State policy or delegated compatibility method names |
| `getClaudeWorkspaceSkillMaterializer` | Shared materializer configured with Claude profile | Process singleton/holder identity for Claude workspace links | State policy or delegated compatibility method names |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope | Notes |
| --- | --- | --- | --- | --- |
| Codex-local state union, path helpers, registry, ensure/cleanup algorithm | Shared filesystem policy must have one owner | `backends/shared/workspace-skill-materializer.ts` | In This Change | Codex file retains only profile + singleton construction |
| Claude-local equivalent algorithm | Exact policy duplication and same defect | Same shared owner | In This Change | Claude file retains only profile + singleton construction |
| `MaterializedCodexWorkspaceSkill` / `MaterializedClaudeWorkspaceSkill` and runtime-specific materialize/cleanup method names | Same descriptor and lifecycle semantics | `MaterializedWorkspaceSkill`; generic shared methods | In This Change | Update contexts, cleanup, bootstrapper, tests directly |
| Duplicate full behavior matrices in both runtime unit test files | Shared policy should be verified once | Shared materializer unit suite plus small profile-placement tests | In This Change | Coverage is consolidated, not removed |
| Any proposed old-path lookup/fallback table | Would turn historical layout into runtime compatibility logic | Current resolver binding + on-demand link rebuild | In This Change | Do not add |

## Return Or Event Spine(s) (If Applicable)

**DS-002:** `Materializer/filesystem exception → AgentRunManager logger.error(runId, runtimeKind, original Error) → failed preparation cleanup → generic AgentCreationError(cause) → coordinator toMessage(outer) → ACTIVATION_FAILED ACK + error status → Electron generic error card`.

The cause remains available in the error object and server log, but the coordinator intentionally does not project it to the user-facing transport.

## Bounded Local / Internal Spines (If Applicable)

### DS-003 — Shared materialization state machine

- Parent owner: `WorkspaceSkillMaterializer`.
- Chain: `reconciliation request → expected path → source availability (when resolved) → lstat/readlink → target existence/canonical comparison → intent + state decision → identity recheck → unlink/create/reuse/leave/skip/throw → optional registry descriptor`.
- Why it matters: it is the only place authorized to decide whether a runtime workspace entry is a disposable projection.

### State decision table

| Request / Source Condition | Existing Path State | Action | Descriptor Acquired By This Call? | Diagnostic |
| --- | --- | --- | --- | --- |
| `expose-resolved`, valid `SKILL.md` | Missing | Create directory symlink to current source | Yes | None |
| `expose-resolved`, valid | Same-source symlink | Reuse through per-key lifecycle | Yes | None |
| `expose-resolved`, valid | Broken symlink | Recheck raw link identity + broken target; unlink link only; create link to current source | Yes | Warning: repaired, old target, new source |
| `reconcile-discoverable`, valid | Missing | Leave absent; Codex already discovers the configured skill elsewhere | No | None |
| `reconcile-discoverable`, valid | Same-source symlink, no existing registry entry | Leave unchanged; do not claim or later delete a discoverable link the process does not currently own | No | None |
| `reconcile-discoverable`, valid | Same key already `acquiring`/`ready` in registry | Join the existing lifecycle/holder before returning | Yes | None |
| `reconcile-discoverable`, valid | Broken symlink | Recheck/unlink/recreate to current source; this call becomes a holder of the repaired link | Yes | Warning: repaired despite other-scope discovery, old target, new source |
| `reconcile-unresolved`, or resolved source became unavailable with `ENOENT`/`ENOTDIR` | Missing | Omit | No | Warning: skipped, no source, expected path |
| `reconcile-unresolved` / source unavailable | Broken symlink | Recheck; unlink link only; leave absent; omit | No | Warning: removed broken link, no replacement |
| Resolved source manifest unavailable but configured source target remains live | Same-source symlink | Do not mutate; omit this acquisition and continue | No | Warning: source is not currently a valid skill; existing same-source link left untouched |
| Any request | Live different symlink | Do not mutate or trust; throw collision | No | Manager logs underlying cause |
| Any request | Non-symlink file/directory | Do not mutate or trust; throw collision | No | Manager logs underlying cause |
| Any request | Permission/I/O/unknown inspection or mutation error | Do not reinterpret as missing; throw | No | Manager logs underlying cause |

`ENOENT` during a final unlink is benign only if the same recheck established the expected link and another actor removed it first. `EEXIST` during creation is resolved by reinspection: accept only a same-source symlink; otherwise fail closed.

### DS-004 — Per-key acquire/release lifecycle

- Parent owner: `WorkspaceSkillMaterializer`.
- Registry key: resolved `materializedRootPath` within one runtime-profile singleton. The entry/descriptor records `sourceRootPath` separately. This keys serialization to the filesystem resource being mutated; unresolved requests do not create registry entries because they acquire no source-backed link.
- Entry union:
  - `acquiring`: `{ phase, holderCount, readiness }`; the entry is inserted before the first filesystem await. Every joining acquire increments its holder exactly once and awaits the same readiness promise.
  - `ready`: `{ phase, holderCount, descriptor }`; acquisition increments synchronously and returns the descriptor.
  - `releasing`: `{ phase, holderCount: 0, descriptor, cleanup }`; final release changes `ready → releasing` and publishes `cleanup` in the same synchronous segment before awaiting filesystem work.
- Acquire rule: an acquire for the entry's same source that finds `acquiring` joins readiness; one that finds `ready` increments and returns. A different-source acquire against `acquiring`/`ready` fails as a live configured-path collision. Any acquire that finds `releasing` awaits cleanup and then retries from the registry/filesystem; it never increments or receives the releasing descriptor.
- Final-release rule: the entry stays in the map throughout guarded cleanup. Only `finally`, and only if `registry.get(key) === releasingEntry`, deletes it. Cleanup failure is warned; the waiting acquire still retries and reclassifies the actual path before returning or throwing.
- Readiness-failure rule: all joiners reject with the same acquisition failure, and only that exact `acquiring` entry is removed. No holder/descriptor survives a failed readiness promise.
- Why it matters: it closes `DI-002`/`PREM-002` without a general lock framework and preserves AC-007.

### DS-005 — Call-scoped batch acquisition and rollback

- Parent owner: `WorkspaceSkillMaterializer.materializeConfiguredWorkspaceSkills`.
- Chain: `request[0..N] → acquire/reconcile sequentially → append every returned descriptor occurrence to call-local ledger → success returns ledger; failure captures original error → release ledger in reverse order → rethrow original error object`.
- The ledger records occurrences, not distinct keys: if two requests legitimately increment the same key twice, rollback decrements twice.
- Rollback calls the same per-key release operation. It therefore removes only this invocation's holders; other calls' holder counts remain intact, and zero-holder cleanup remains serialized with new acquisitions.
- A rollback cleanup/release problem is logged with run/skill/path and does not replace or wrap the original materialization failure. After attempting all releases, rethrow the original object so `AgentRunManager` logs the real collision/I/O cause.
- Why it matters: it closes `DI-003`/`PREM-003`; the bootstrapper never receives partial descriptors and cannot otherwise clean them.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Safe configured-name validation | DS-001, DS-003 | Skill resolver | Reject path separators, absolute paths, traversal/null patterns before binding creation | Prevent raw config from becoming a path | Duplicated validators drift or sanitizer turns unsafe input into unintended paths |
| Codex `skills/list` preflight | DS-001 | Codex bootstrapper | Annotate every resolved binding as `expose-resolved` or `reconcile-discoverable`; map unresolved to `reconcile-unresolved`; on preflight failure use `expose-resolved` for resolved bindings; remove none | Avoid redundant initial-missing creation without bypassing reconciliation | Shared policy becomes coupled to provider protocol, or bindings disappear before repair |
| Runtime materialization profile | DS-001, DS-003, DS-004, DS-005 | Shared materializer | Supply label and workspace root segments | Preserve provider conventions without duplicated policy | Profile starts owning divergent behavior |
| Warning formatting | DS-003 | Shared materializer | Include runtime/run/skill/link/old target/current source/disposition | Actionable degradation evidence | Bootstrapper reconstructs internal state or UI leaks paths |
| Error logging | DS-002 | Manager | Log original Error object with run/runtime | Preserve cause/stack before safe wrapping | Coordinator becomes mixed internal/user diagnostic owner |
| Call-local acquisition ledger | DS-001, DS-005 | Shared materializer | Track descriptor occurrences owned by one public invocation until commit/rollback | Bootstrapper cannot clean a batch it never receives | Caller receives/cleans partial state or other holders are decremented |

## Ownership Boundaries

- Raw agent `skillNames` stop at the configured-skill resolver. Downstream materialization receives only `ConfiguredAgentSkillBinding` instances.
- Runtime bootstrapper may preserve order and annotate request intent but must not remove configured bindings from reconciliation or inspect/unlink/create links.
- Shared materializer owns all filesystem-state semantics, per-key acquisition/release phases, and per-call rollback. Runtime composition may supply only profile and logger construction.
- Backend cleanup calls the shared release boundary; it must not directly unlink materialized paths.
- Manager owns internal failure observation and outer preparation errors. Coordinator owns user-safe projection and must not bypass the manager to inspect backend/materializer causes.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `SkillService.resolveConfiguredSkillBindingsForAgent` | resolver validation, contextual/global lookup, missing warning | Codex/Claude bootstrappers | bootstrapper reads raw names and sanitizes them itself | Extend the binding result, not duplicate validation |
| `WorkspaceSkillMaterializer.materializeConfiguredWorkspaceSkills` | request intent, expected path, state inspection, repair, phased holder acquire, batch rollback | runtime bootstrappers | bootstrapper drops discoverable bindings, calls fs directly, or handles partial descriptors | Extend the request union/state decision or shared batch lifecycle |
| `cleanupMaterializedWorkspaceSkills` | phased holder release, acquire-versus-cleanup serialization, still-matching ownership check | runtime cleanup owners and internal rollback | cleanup removes registry entry/unlinks directly | Extend shared lifecycle entry/release operation |
| `AgentRunManager.prepare*` | claim, backend preparation, cleanup, diagnostic, wrapping | run service | coordinator/backend logs only reconstructed wrapper or reaches manager internals | Strengthen manager logging at catch boundary |

## Dependency Rules

- Skills domain binding type may depend on `Skill`; it must not depend on runtime or filesystem code.
- Configured resolver constructs bindings; `SkillService` exposes them and may project resolved `Skill[]` for unrelated existing consumers.
- Runtime bootstrappers may depend on `SkillService`, the binding type, their runtime profile getter, and shared materializer contract. Codex alone converts discovery names into request variants, but it must emit exactly one request for every active safe binding.
- Runtime-specific materializer files may depend on the shared class/profile only. Shared materializer must not import Codex/Claude clients, bootstrappers, or contexts.
- Context and cleanup files depend on `MaterializedWorkspaceSkill`, not runtime-specific aliases.
- Only the shared materializer may create/change/delete per-key registry entries or roll back a partial descriptor ledger. Bootstrappers and cleanup callers never manipulate holder counts.
- No source-to-old-source fallback and no runtime-specific copied state logic.
- Coordinator remains dependent only on manager/service errors exposed through existing run service; it must not inspect filesystem/materializer types.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `ConfiguredAgentSkillResolver.resolveForAgent` (changed return) | Validated configured skill selection | Produce ordered `ConfiguredAgentSkillBinding[]`; warn for unresolved; exclude invalid names | `AgentDefinition` | Clean-cut internal return-type change; direct caller is `SkillService` |
| `SkillService.resolveConfiguredSkillBindingsForAgent` (new) | Runtime-relevant configured bindings | Expose safe resolved/unresolved outcomes | `AgentDefinition` | Authoritative runtime entry |
| `SkillService.resolveConfiguredSkillsForAgent` (preserved projection) | Resolved configured skills | Return only resolved `Skill[]` to consumers that do not own materialization | `AgentDefinition` | Not a legacy wrapper; distinct resolved-only subject used by AutoByteus/skill improvement |
| `WorkspaceSkillMaterializer.materializeConfiguredWorkspaceSkills` | Workspace skill projections as one call-scoped batch | Reconcile every request, acquire descriptors, and roll back this invocation on later failure | `{runId, workingDirectory, requests: WorkspaceSkillReconciliationRequest[], skillAccessMode}` | Returns descriptors only after full success; rethrows original failure after rollback |
| `WorkspaceSkillMaterializer.cleanupMaterializedWorkspaceSkills` | Acquired projection holders | Release descriptors and guarded final unlink | `MaterializedWorkspaceSkill[]` | Null/undefined remains no-op |
| `getCodexWorkspaceSkillMaterializer` / `getClaudeWorkspaceSkillMaterializer` | Runtime singleton instance | Configure root/profile and preserve shared registry identity | No selector | Return shared class directly |

## Interface Boundary Check

| Interface | Responsibility Is Singular? | Identity Shape Is Explicit? | Ambiguous Selector Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Resolver binding method | Yes | Yes | Low | Discriminated union; invalid names omitted |
| Resolved-only SkillService method | Yes | Yes | Low | Projection is named explicitly |
| Materialize method | Yes | Yes | Low | Run/workspace/requests/mode are named; request union separates exposure from discovery-only reconciliation |
| Cleanup method | Yes | Yes | Low | Shared descriptors contain source, path, registry key; release shares per-key phase owner |
| Runtime singleton getters | Yes | Yes | Low | Each getter has a fixed profile, no generic runtime string selector |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Safe resolution outcome | `ConfiguredAgentSkillBinding` | Yes | Low | Use `resolved`/`unresolved` union, not nullable loose object |
| Reconciliation intent | `WorkspaceSkillReconciliationRequest` | Yes | Low | Use three variants; do not add independent optional discovery/source booleans |
| Shared policy owner | `WorkspaceSkillMaterializer` | Yes | Low | Keep repair/registry/cleanup together |
| Runtime configuration | `WorkspaceSkillMaterializationProfile` | Yes | Low | Only label and root segments |
| Acquired link | `MaterializedWorkspaceSkill` | Yes | Low | One shared descriptor; no runtime aliases |
| Path state | `ExistingWorkspaceSkillPathState` (private) | Yes | Low | Explicit variants; no boolean flags |
| Holder lifecycle | `MaterializedSkillRegistryEntry` phased union (private) | Yes | Low | `acquiring`/`ready`/`releasing`; entry remains mapped through cleanup |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Safe configured names and resolution | Skills service/resolver | Extend | Already authoritative and tested | N/A |
| Workspace materialization | Agent-execution backend shared folder | Extend | Shared runtime concerns already live under `backends/shared` | N/A |
| Runtime path choice | Existing Codex/Claude materializer composition files | Reuse | Natural provider composition point | N/A |
| Preparation cause diagnostics | `AgentRunManager` | Extend | Holds original error plus run/runtime identity | N/A |
| UI warning | Frontend activity/status | Reuse not required | Out of scope; server diagnostic satisfies approved ticket | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision | Notes |
| --- | --- | --- | --- | --- | --- |
| Skills domain/services | Binding union, safe-name validation, contextual/global resolution, resolved projection | DS-001, DS-003 | SkillService/resolver | Extend | No runtime/fs dependency |
| Agent execution shared backends | Request/state models, profile, materialization, phased registry, call rollback, repair, cleanup, warnings | DS-001, DS-003, DS-004, DS-005 | WorkspaceSkillMaterializer | Extend | One policy/lifecycle for both runtimes |
| Codex backend | Discovery preflight, request-intent planning, Codex profile, thread config | DS-001 | CodexThreadBootstrapper | Reuse/Modify | Annotation only; no binding removal or shared policy copy |
| Claude backend | Claude profile, session config | DS-001 | ClaudeSessionBootstrapper | Reuse/Modify | No shared policy copy |
| Agent run services | Preparation diagnostics/wrapper and command projection | DS-002 | AgentRunManager/coordinator | Extend manager only | Coordinator production code unchanged |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `skills/domain/configured-agent-skill-binding.ts` | Skills | binding type/projection | Tight resolved/unresolved union and resolved-skill projection | Reused by resolver, service, bootstrappers, materializer | N/A (is shared structure) |
| `backends/shared/workspace-skill-materializer.ts` | Agent execution shared | shared materializer | Profile, request union, descriptor, path state machine, phased registry, batch rollback, repair, cleanup | One coherent filesystem/holder lifecycle owner | Yes, binding |
| Runtime materializer files | Codex/Claude | composition | Fixed profiles and singleton construction | Provider choice only | Shared materializer |
| Resolver/service files | Skills | resolver/service | Produce/expose bindings | Existing authoritative boundary | Binding |
| Manager file | Run services | manager | Original error logging before wrapper | Existing lifecycle owner | No new structure |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? | Overlapping Representations Removed? | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Resolved or safe unresolved configured identity | `skills/domain/configured-agent-skill-binding.ts` | Skills | Needed across resolver and runtime materialization | Yes: resolved variant uses `skill.name`; unresolved uses `name` | Yes | Generic error/result bag |
| Codex/Claude requests, descriptors, states, registry, fs transitions | `backends/shared/workspace-skill-materializer.ts` | Agent execution shared | Semantics are identical; only bootstrapper request planning/profile differ | Yes: one request union/descriptor/profile | Yes: delete runtime duplicates | Provider client abstraction |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Parallel / Overlapping Representation Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `ConfiguredAgentSkillBinding` | Yes | Yes | Low | Union: `{kind:"resolved", skill}` or `{kind:"unresolved", name}` only |
| `WorkspaceSkillReconciliationRequest` | Yes | Yes | Low | Union: `{kind:"expose-resolved", skill}`, `{kind:"reconcile-discoverable", skill}`, or `{kind:"reconcile-unresolved", name}`; no independent booleans |
| `WorkspaceSkillMaterializationProfile` | Yes | Yes | Low | `runtimeLabel`, `workspaceSkillsRootSegments`; logger remains constructor dependency, not profile data |
| `MaterializedWorkspaceSkill` | Yes | Yes | Low | Keep name/source/materialized path/registry key once |
| Private path-state union | Yes | Yes | Low | State-specific target fields only; do not add booleans like `exists`, `broken`, `owned` in parallel |
| Private phased registry entry | Yes | Yes | Low | Each phase contains only fields valid in that phase; do not retain separate pending/cleanup maps |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/skills/domain/configured-agent-skill-binding.ts` | Skills | configured binding structure | Union plus `collectResolvedConfiguredSkills` | Small reusable domain shape | N/A |
| `.../skills/services/configured-agent-skill-resolver.ts` | Skills | resolver | Validate and return ordered bindings; warn on unresolved | Existing resolution authority | Binding |
| `.../skills/services/skill-service.ts` | Skills | service facade | Expose bindings; preserve resolved-only method via projection | Public skills boundary | Binding |
| `.../agent-execution/backends/shared/workspace-skill-materializer.ts` | Shared runtime execution | materializer | Request-intent state policy, phased registry, call rollback, repair, cleanup | Coherent lifecycle owner | Binding |
| `.../backends/codex/codex-workspace-skill-materializer.ts` | Codex | composition root | Codex profile constant + cached shared instance getter | Keeps `.codex/skills` choice local | Shared class |
| `.../backends/claude/claude-workspace-skill-materializer.ts` | Claude | composition root | Claude profile constant + cached shared instance getter | Keeps `.claude/skills` choice local | Shared class |
| Codex/Claude bootstrapper, contexts, cleanup files | Runtime backends | runtime orchestration | Use bindings/shared descriptor/shared methods; Codex annotates every binding with reconciliation intent | Existing lifecycle files | Binding/materializer types |
| `.../agent-execution/services/agent-run-manager.ts` | Run services | manager | Log original unexpected preparation error with run/runtime | Existing failure boundary | No |
| Related unit/integration test files | Corresponding subsystem | verification | Shared state matrix, profile placement, binding results, manager diagnostic, bootstrap pass-through | Tests follow production owners | Shared fixtures where local |

## Applied Patterns (If Any)

- **Discriminated union:** configured resolution and path inspection express mutually exclusive states without nullable/boolean overlap.
- **Profile-configured shared owner:** one invariant-bearing materializer with tiny Codex/Claude composition roots.
- **Guarded compare-and-mutate:** link identity and target-broken status are rechecked immediately before unlink; creation collisions are reinspected and accepted only if same-source.
- **Phased per-key lifecycle:** one registry union serializes acquiring, ready holders, and final cleanup; no separate cleanup map or unlocked delete-before-await seam.
- **Call-local compensation:** a failed batch reverses only the holder acquisitions recorded by that invocation and preserves the original error.
- **Discard/rebuild projection:** derived link is locally reconstructed from current authoritative source, not migrated by historical version logic.

## Target Subsystem / Folder / File Mapping

| Path | Kind | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/skills/domain/configured-agent-skill-binding.ts` | File | Skills domain | Binding union/projection | Shared identity semantics | fs/runtime imports |
| `autobyteus-server-ts/src/skills/services/configured-agent-skill-resolver.ts` | File | Resolver | Binding production and warnings | Existing source-selection authority | workspace paths |
| `autobyteus-server-ts/src/agent-execution/backends/shared/workspace-skill-materializer.ts` | File | Shared materializer | Request union, path state machine, phased registry, batch rollback, mutation, cleanup | Cross-runtime execution policy/lifecycle | Codex/Claude clients/configs |
| `.../backends/codex/codex-workspace-skill-materializer.ts` | File | Codex composition | Codex label/root profile and singleton | Runtime-specific conventional path | policy helpers/descriptor aliases |
| `.../backends/claude/claude-workspace-skill-materializer.ts` | File | Claude composition | Claude label/root profile and singleton | Runtime-specific conventional path | policy helpers/descriptor aliases |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/shared/workspace-skill-materializer.test.ts` | File | Shared policy verification | Complete intent/path matrix, acquire-versus-release concurrency, batch rollback, repair, cleanup | Mirrors shared owner | provider protocol tests |
| Existing runtime materializer test files | File | Profile verification | `.codex`/`.claude` root and singleton/profile wiring only | Prevent placement regressions | duplicate full state matrix |

The layout remains compact because this change adds one domain structure and one coherent shared lifecycle owner; creating deeper “state/registry/reconciler/helper” folders would over-split one bounded state machine.

## Folder Boundary Check

| Path / Folder | Intended Structural Depth | Ownership Boundary Is Clear? | Mixed-Layer Or Over-Split Risk | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `src/skills/domain` | Main-Line Domain-Control | Yes | Low | Binding is runtime-agnostic skill identity |
| `src/skills/services` | Main-Line Domain-Control | Yes | Low | Resolver/service own validation/lookup |
| `src/agent-execution/backends/shared` | Main-Line Domain-Control / filesystem concern, mixed justified | Yes | Low | Runtime-shared materialization lifecycle already serves backend preparation |
| Runtime backend folders | Persistence-Provider / composition | Yes | Low | Profiles and provider orchestration remain local |
| `src/agent-execution/services` | Main-Line Domain-Control | Yes | Low | Manager remains run lifecycle owner |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Safe resolution | `{ kind: "unresolved", name: "shell-first-operating-practice" }` produced only after resolver validation | Passing raw `agentDefinition.skillNames` to `path.join` | Prevents path validation duplication/bypass |
| Broken repair | `lstat(link) → readlink → stat(target)=ENOENT → recheck same raw target → unlink(link) → symlink(currentSource, link)` | `rm -rf(linkOrTarget)` or unlink based on stale earlier check | Guarantees link-only mutation and race safety |
| Live collision | Different target exists → throw without mutation | “Warn and continue” while runtime auto-discovers unexpected skill | Avoids loading untrusted instructions |
| Discoverable stale link (`DI-001`) | `skills/list` contains name → `{kind:"reconcile-discoverable", skill}` → inspect broken expected path → repair/acquire; initial missing path alone stays absent | Remove binding from materializer input because its name is discoverable | Preserves preflight without bypassing FR-002/FR-007 |
| Acquire during final cleanup (`DI-002`) | release sets entry `releasing` before await → new acquire waits `cleanup` → retries/rematerializes after exact-entry deletion | delete registry entry → await unlink while new acquire reuses/returns old link | Prevents an old final release from removing a new holder's link |
| Later batch failure (`DI-003`) | acquire A → collision B → release A occurrence through registry → rethrow exact B error | throw B and strand A, or replace B with rollback error | Preserves holder counts and original diagnostics |
| Shared ownership | Codex profile `{label:"Codex", segments:[".codex","skills"]}` + shared class | Two copied classes with identical state logic | Keeps safety policy uniform |
| Diagnostics | `console.error("Failed ...", originalError)` then generic wrapper | Put full local filesystem paths into WebSocket error card | Preserves actionable server evidence and safe UI contract |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Search former agent-local skill path | Observed link points there | Rejected | Trust current resolver only; rebuild link from current source |
| Historical old→new path table | Could “migrate” known move | Rejected | Generic broken-link state works for every relocation |
| Keep both runtime-specific algorithms and add same branch twice | Lowest line-change count | Rejected | Extract shared policy and delete duplicates |
| Preserve runtime-specific descriptor/method APIs through delegating wrappers | Fewer caller edits | Rejected | Update callers directly to shared types/methods; runtime files only construct profiles |
| Expose nested cause to command/UI | Makes screenshot more actionable | Rejected | Log internally; keep generic safe outer transport |

## Derived Layering (If Useful)

`Transport (WebSocket/command) → run lifecycle (service/manager) → runtime orchestration (bootstrapper) → skills resolution + shared materialization → provider session/thread`.

This is explanatory only. The authoritative boundaries are the manager, resolver/service, and shared materializer described above; callers must not skip them.

## Change / Refactor Sequence

1. Add `ConfiguredAgentSkillBinding` and resolved-skill projection; change the internal resolver return to bindings and expose the binding method through `SkillService`. Update resolver/service tests first.
2. Add the shared request union and profile-driven materializer with the explicit path-state union, warning contract, one phased per-key registry (`acquiring`/`ready`/`releasing`), guarded repair/create, call-scoped batch rollback, and guarded cleanup semantics. Port the full intent/path/lifecycle matrix to its unit suite.
3. Reduce Codex/Claude materializer files to profile/singleton composition and update bootstrappers, contexts, cleanup owners, integration/E2E test construction, and mocks to shared contracts. Replace Codex name-only filtering with request planning: every resolved binding becomes `expose-resolved` or `reconcile-discoverable`; every unresolved binding becomes `reconcile-unresolved`. Claude maps resolved/unresolved directly to expose/reconcile-unresolved.
4. Remove the duplicated algorithms/types/method names and reduce runtime tests to placement/wiring checks. Run typecheck/unit suites to ensure no legacy import remains.
5. Add manager error-object logging before safe wrapping; verify cleanup/wrapper behavior and coordinator-visible message/code remain unchanged.
6. Validate the production-equivalent stale-link, discoverable-plus-broken-link, missing-source, live-collision, same-source, model pass-through, deterministic acquire-during-final-release, and failed-multi-binding rollback paths in downstream coverage. No migration/startup sweep step exists.

No temporary dual implementation is permitted between steps 2–4 in the final branch.

## Key Tradeoffs

- **Shared class versus two local patches:** more call-site/type churn now, but one security-sensitive path policy and less future runtime drift.
- **Binding union versus raw configured names:** adds a small domain type, but preserves the resolver's validation authority and enables unresolved-link cleanup without unsafe re-parsing.
- **Discovery annotation versus filter:** every binding now reaches reconciliation, but `reconcile-discoverable` preserves the preflight's no-new-link outcome for an initially missing path.
- **Wait during final cleanup versus join old holder:** waiting may add one bounded cleanup latency to a concurrent activation, but guarantees it never receives a descriptor that an older release can still unlink.
- **Call rollback versus partial result:** rollback adds local release work on failure, but the bootstrapper has no valid owner for partial descriptors and must receive all-or-nothing holder ownership.
- **Warn/omit versus fail:** absence/broken projections are safely degradable; live collisions and non-`ENOENT` I/O are not, because continuing may expose unintended instructions or mask operational failure.
- **On-demand rebuild versus migration sweep:** on-demand work is bounded and has a current-source context; sweeping cannot establish ownership safely.
- **Internal cause log versus UI detail:** server operators gain actionable evidence while the product preserves stable codes and avoids leaking local paths.

## Risks

- Filesystem state can change between inspection and mutation. Mitigation: immediate identity/target recheck, exclusive link creation, and fail-closed reinspection.
- An unresolved safe binding can collide with live workspace content. Mitigation: never delete or trust it; throw and rely on the improved diagnostic.
- Changing resolver output can accidentally alter ordering/duplicates/disabled flags. Mitigation: binding projection must preserve iteration order and exact resolved `Skill` objects; extend existing resolver/service tests.
- Codex discovery planning could accidentally drop a binding or treat a discoverable broken path as initial-missing. Mitigation: assert one request per active binding and cover `reconcile-discoverable` across missing, same-source, broken, and collision states.
- A new acquire can overlap final cleanup. Mitigation: keep the exact `releasing` entry mapped until cleanup settles; wait/retry rather than join it.
- A later request can fail after earlier descriptors were acquired. Mitigation: occurrence ledger, reverse release through the same owner, exhaustive rollback, and original-error rethrow.
- Logging an error through string interpolation would still lose stack/cause. Mitigation: pass the original error as a separate logger argument and assert object identity in a unit test.
- Runtime profile files could regrow divergent policy. Mitigation: profiles contain only label/root segments and tests assert no alternative class/API is used.

## Guidance For Implementation

- Use `fs.lstat` to inspect the link itself, `fs.readlink` to capture the raw target, `path.resolve(dirname(link), rawTarget)` for relative links, and `fs.stat`/`fs.realpath` only after resolving the target. Treat only `ENOENT`/`ENOTDIR` as absence.
- Do not use `fs.rm`, recursive deletion, target paths for unlink, or catch-all “missing” fallbacks.
- Implement a private discriminated path-state union with state-specific fields. Do not expose filesystem state in run contexts; contexts retain only acquired descriptors.
- Build `WorkspaceSkillReconciliationRequest` with mutually exclusive variants. In Codex, collect discovery names once, map rather than filter, and assert/test that output length/order equals active binding length/order. A discovered resolved skill uses `reconcile-discoverable`; an undiscovered resolved skill uses `expose-resolved`; an unresolved binding remains `reconcile-unresolved`. If `skills/list` fails, preserve the current fallback by warning and mapping every resolved binding to `expose-resolved`, not by skipping reconciliation.
- Implement one registry entry union per key. Insert `acquiring` before the first await; joiners increment once and await its readiness. On readiness, replace the exact entry with `ready` while retaining the accumulated holder count. On failure, delete only the exact acquiring entry and reject all joiners.
- On final release, transition the still-exact `ready` entry to `releasing` and store its cleanup promise before the first cleanup await. Keep it mapped until cleanup finishes. An acquire that sees `releasing` must await it and retry; it must not receive or increment the releasing descriptor.
- Wrap the public request loop in call-scoped rollback. Record every descriptor occurrence after a successful acquire. On a later failure, release the ledger in reverse order, attempt all entries, log rollback cleanup errors without substituting them, and `throw originalError` unchanged.
- Before unlinking a broken link, verify it is still a symlink with the same raw/resolved target and the target is still absent. If it changed, reclassify once and apply the current safe decision; never overwrite a now-live/non-symlink path.
- If creation gets `EEXIST`, reinspect. Accept only a same-source symlink; otherwise surface the collision.
- For `reconcile-discoverable`, an initially missing expected path is a successful no-descriptor outcome. A broken path is not equivalent to missing: repair/recreate it and return a descriptor. If the materialized-path key is already registered for the same source, join that lifecycle; a different ready/acquiring source is a collision, and any source waits/retries through `releasing`. An unregistered same-source discoverable link remains untouched/unclaimed.
- Emit one materializer warning per degraded binding outcome. Include runtime label, run ID, skill name, materialized path, previous resolved target when present, current source when present, and `repaired`/`removed-and-skipped`/`skipped` disposition.
- Preserve the existing resolver warning for catalog consumers; the run-specific materializer warning is additional operational context, not a replacement.
- In `AgentRunManager.prepareCandidate`, log unexpected original errors before they can be replaced by cleanup quarantine or generic wrapping. Pass the `Error` object separately, for example `logger.error(message, error)`, so stack/cause survive. Preserve `failure.cause = error` and the coordinator path.
- Do not change `CodexThreadConfig.model`, default model resolution, Codex client calls, frontend status components, or command error codes.
- Deterministic concurrency tests must use controllable cleanup gates: pause guarded unlink after entry becomes `releasing`, begin a new acquire, prove it has not resolved, release cleanup, then prove the acquire rematerializes/returns a live link. Do not rely on timing sleeps.
- Batch rollback tests must cover an earlier created/reused descriptor followed by a live collision and by a non-`ENOENT` injected failure; prove the original error object is rethrown, this call's holder is released, another pre-existing holder remains, and cleanup does not delete changed live content.
- Implementation-scoped checks should include affected TypeScript typecheck/unit/integration tests. Final durable API/E2E coverage decisions and execution belong to `api_e2e_engineer` after code review.
