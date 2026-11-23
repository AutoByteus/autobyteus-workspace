# Design Spec — autobyteus-53: continue a stopped run on another model (model hand-over)

## Solution And Approval Basis

- Current solution revision ID: `SR-006` (revision after ARCH-REV-001: AR-001, AR-002, N-1..N-3; base `1f761bc8db`)
- Approved requirements baseline: `requirements-doc.md` @ SR-006 (REQ-004/AC-006/AC-007 reworded to agree with REQ-003, DEC-009). The rule is the user's (DEC-003, 2026-11-02 and 2026-11-19); the Solution Designer approved the details within that direction (user informed 2026-11-19).
- Behavior-defining supplements: none
- User approval of the design: `Not required` (the Task doesn't ask for it)
- Design status: `Ready`
- Canonical investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/stopped-run-unavailable-model/tickets/in-progress/stopped-run-unavailable-model/investigation-notes.md` (evidence rows A-01..A-17 in SR-005)
- Authorities read (2026-11-19; the 2026-11-23 changes re-read 2026-11-23, including Principle 17 and the Data Contract section): `references/architecture-design.md`, `references/design-principles.md`, `templates/design-spec-template.md`, the repository's `DESIGN.md` (root; there are no closer DESIGN files for these packages), `GLOSSARY.md` §392-404. `design-examples.md`: not used.
- Project design-principle conflicts: none.

## Current-State Read

- A stopped run's Settings save goes through three validation call sites (A-04): standalone runs and delegated copies, stopped Team runs (also delegated Team copies), and Org runs. Each validates the selection with `RunModelSelectionService` in a context built by `selectionContextFor` (A-02), then applies it with the one switch rule, `applyRuntimeSelection` (A-01).
- Today the rule decides "same session or a fresh session" by the runtime alone:
  - another runtime → a pending switch, which the next input turns into a fresh session with the hand-over notice (A-07, A-08, A-11);
  - the same runtime → a model edit in the same session.
- The native capacity rule sits in validation (A-03). An AutoByteus change to a smaller or unknown-capacity model is refused, because a same-session change is the only outcome the rule can produce for the same runtime. That is the root of the empty menu.
- Activation, memory archive, marker and notice don't depend on the runtime differing (A-07..A-11, A-14). On `1f761bc8db`, autobyteus-599's session renewal already runs a same-runtime fresh session through the same steps: `standalone-agent-run-lifecycle-service.ts:269, 282` (`activateInFreshSession`) and `configured-agent-activation-planner.ts:98, 117, 127` (`beginFreshSession`). The pending-switch branch is unchanged. They work for a same-runtime pending switch unchanged, and a native fresh session doesn't load the old conversation (A-09).

## Task Size And Architectural Risk (Mandatory)

- Task size: `Medium`
- Size rationale: about 17 production files in `autobyteus-server-ts` (3 of them one-line `no_session` builders, AR-002) plus 2 locale files in `autobyteus-web` and `GLOSSARY.md`, within existing owners. No new owner, module or API field visible to the web. The change is a decision moved from "runtime differs" to an explicit continuation, plus its inputs and texts.
- Architectural risk: `High`
- Risk rationale: it changes the shared switch rule (`applyRuntimeSelection`), which every stopped-run surface uses, and the validation contract that all three save paths and both options paths use (the context gains `handOver`; a valid result gains `continuation`). It also gives the persisted `pendingRuntimeSwitch` a new state (the same runtime on both sides), and it redefines "current model" while a switch is pending (DEC-005). The blast radius covers standalone runs, delegated copies, Team and Org members. Undo and re-edit semantics of existing switches must stay exactly as they are (AC-007).
- Escalation trigger: any activation, memory or notice path that turns out to depend on the two runtimes differing, or any surface whose save doesn't pass through the three call sites (A-04), comes back as a `Design Impact`.

## Architecture Investigation Evidence

See the investigation notes, SR-005 rows A-01..A-17. The design statements below cite those rows.

## Intended Change

Validation decides how the run continues (**same session** or **hand-over**), and the switch rule applies that decision instead of inferring it from the runtime. The native capacity comparison then chooses between the two instead of refusing. The rest (pending field, activation, archive, notice) is reused as it is.

## Change Scope (Mandatory)

- In scope: UC-001..UC-003.
  - The continuation decision in the selection service and its context.
  - The switch rule.
  - The three save call sites and the two options call sites.
  - The marker text for the same runtime.
  - The standalone Save message.
  - The native help text (en, zh-CN).
  - The glossary entries.
  - Tests that pin the old rule.
- Derived consumers of the changed structures:
  - `RunModelValidationContext` / `RunModelSelectionContext` (+`handOver`): every builder must provide it (compile-time). The builders, all found with `git grep` on `1f761bc8db`:
    - `selectionContextFor` (3 save callers): `standalone-stopped-run-selection-updater.ts:136`, `team-run-delegated-launch-plan.ts:35`, `agent-org-run-manager.ts:247` (Org save, validated at `:245`);
    - the 2 options callers: `studio-run-model-config-service.ts:70, 84` and `agent-org-run-service.ts:87`;
    - 3 launch validators (AR-002), all with **`no_session`**: `agent-org-run-service.ts:157` (Org create), `launch-preferences/launch-usability-check.ts:158` and `model-routing/model-routing-settings.ts:137`. Each validates a launch whose selection equals its current model, so there is nothing to continue, and the `unchanged` row returns `same_session` first anyway.
  - `RunModelSelectionValidationResult.valid` (+`continuation`): read by the 3 save callers and passed into `RuntimeSelection`. The 3 launch validators ignore it: they read only validity and the normalized selection. (Correction of SR-005: `model-routing-settings.ts` does use this service, through `Pick<RunModelSelectionValidator, "validate">`, `:2, :105, :137`.)
  - `RuntimeSelection` (+`continuation`): `applyRuntimeSelection`, `applySelectionToConfiguredMember`, `buildRuntimeSwitchMetadata`, `commitAgentRunRuntimeSwitch`.
  - Persisted `pendingRuntimeSwitch`: readers are the lifecycle (A-07), the member planner (A-08), the recorder (A-10), `openRawTraceRuntimeKind` and the notice (A-11). All are unchanged and accept the same runtime.
  - The web reads only options and Save messages; GraphQL shapes are unchanged.
- Deliberately left alone:
  - activation, including the shared fresh-session step and autobyteus-599's session renewal (`buildSessionRenewal`); memory archive; the notice text and journals (all reused);
  - external-runtime rules (BEH-004);
  - `canSwitchRuntime` (reused, not changed);
  - G-5 start refusal and the Settings note (still correct: the user now can do what they say);
  - web menu code (`ExistingRunConfigEditor.vue` lists `currentModel + replacements`, which now holds the models).
- Follow-ups: none found.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | REQ / AC | Trigger | Existing behavior and evidence | Approved change or preserved outcome | Target path / spine |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001/002 | User | REQ-001..003, 005..007; AC-001, 002, 005, 008, 010 | Settings → choose model → Save → message | Empty menu, refusal (A-03) | Listed; Save makes a pending hand-over; the next input hands over | DS-001, DS-002 |
| BEH-006 | User | REQ-003; AC-004 | Same, smaller target | Refused (A-03) | Hand-over | DS-001, DS-002 |
| BEH-005 | System | REQ-003; AC-003 | Same, equal or bigger | Same session | Preserved | DS-001 |
| BEH-003 | User | REQ-004; AC-006, 007 | Runtime switch, undo, re-edit | A-01, A-13 | Preserved; the reference is the last session (DEC-005) | DS-001 |
| BEH-004 | User | — | External model change | Same session | Preserved | DS-001 |
| DEC-006 | User | REQ-008; AC-009 | Non-switchable run | Refusal | Preserved refusal | DS-001 |

## Relevant Supplemental Task Artifacts

| Artifact | Purpose | IDs | Relationship | Status |
| --- | --- | --- | --- | --- |
| `probes/autobyteus-53-repro.test.ts` | Reproduction | AC-001, AC-004, AC-005 | The implementer turns its native cases into the new unit tests (they must flip) | Disposable probe; not committed as is |

## Task Design Health Assessment (Mandatory)

- Change posture: `Behavior Change` (fixes the trap in Task autobyteus-53)
- Current design issue found: `Yes`
- Root cause classification: `Missing Invariant`. The switch rule infers "fresh session" from "another runtime", so the one owner of the continuation (the rule) can't express "same runtime, fresh session", and validation has to refuse instead. Ownership is otherwise healthy: one rule, one validator, one activation path.
- Refactor needed now: `Yes`, small. The continuation becomes an explicit input of the rule, decided by its evidence owner (the selection service). No file moves.
- Structural triggers:
  - **Several kinds or forms (1): fires.** One rule serves standalone metadata, Team and Org members, and delegated copies; validation has three call sites and options two. Response: one decision in the selection service and one in the rule; every call site passes `handOver` and forwards `continuation`; the compiler enforces it through required fields.
  - **Behavior by absence (13): fires today.** "A fresh session because `currentModelIdentifier` is null" is a decision by absence. Response: an explicit `continuation` result.
  - **Derived data (11): fires.** The changed context and result structures; consumers are listed in Change Scope.
  - **Vocabulary drift (15): fires.** A same-runtime model hand-over stored in `pendingRuntimeSwitch`. Response: the glossary defines the switch as a hand-over to a fresh session whose runtime may stay the same, and the marker text names a model change (DEC-008). See the deviation below.
  - **Persisted-data transition (5): fires.** Decided below: directly usable.
  - **Repeated coordination (13): checked.** The `handOver` capability is derived per record kind: standalone (one helper next to `canSwitchRuntime`), and Team/Org scopes by `scopeKind` (a constant per scope kind at each tree's call site). No policy repeats.
  - **Empty indirection (13): checked.** No new port, interface or wrapper.
  - Hidden dependency (16), backward dependency (9), shared folder (11): not fired (no new collaborators; dependency directions unchanged).
- Deliberate deviations:
  - **Principle 15, stored name `pendingRuntimeSwitch`.** A model hand-over on the same runtime is stored in the field named "runtime switch".
    - What the field means: the binding the run's session last ran on, kept until the next input makes a fresh session. A model hand-over is exactly that, so the meaning doesn't change; only one side's runtime is equal.
    - Why not rename: renaming would need a sealed migration of every run's metadata and member trees (DESIGN.md rule 10) and a code-wide rename, for no change in meaning.
    - What we do instead: the glossary entry states that the runtime can stay the same, and the marker text reflects it.
    - Reviewers judge this reason.
- Intentional deferrals: none.

## Terminology

- **Continuation** (`continuation`): how a stopped run's save continues the run, either `same_session` (the session the run last ran on goes on with the new model) or `hand_over` (the next input starts a fresh session with the hand-over notice).
- **Reference model**: the model of the session the run last ran on, which is `pendingRuntimeSwitch.from` while a switch is pending and the saved model otherwise (DEC-005).
- **Hand-over capability** (`handOver`): `available` (the record can make a pending switch), `unavailable` (it can't: application/system-owned or peer-started run) or `no_session` (a launch default or a never-started run: nothing to continue).
- **Model hand-over**: a pending switch whose two sides have the same runtime (glossary update).

## Legacy Removal Policy (Mandatory)

- Obsolete paths:
  - the runtime-only branching in `applyRuntimeSelection` (l.48 and l.58 branches) is replaced by the continuation branch;
  - the native refusal for switchable records is replaced by `hand_over`;
  - the options "unverified capacity" answer and the ≥ filter stay only for `unavailable`.
- Compatibility wrappers kept: `None`.

## Data Contract (Mandatory When The Change Stores Or Exchanges Data)

- Contract location: this section. No stored or wire **shape** changes. The change gives the stored `pendingRuntimeSwitch` a new legal state and adds two fields to in-process contracts between `llm-management` and the save paths. The GraphQL options and save payloads that the web receives are unchanged.
- Shown to the user: in the Solution Designer's result message of 2026-11-23, which leads with this contract. No user decision is needed (no migration, nothing hard to undo).

| Record / Message | Stored Where, Or Boundary It Crosses | Field | Meaning | Written By | Read By |
| --- | --- | --- | --- | --- | --- |
| Pending agent runtime switch | `run_metadata.json` of a standalone run; a member node in `team_run_execution_tree.json` / the Org tree | `pendingRuntimeSwitch.switchId` | Identity of the hand-over (marker key) | `applyRuntimeSelection` (`hand_over` branch, when none is pending) | Lifecycle / member planner (`buildRuntimeSwitch*`), recorder |
| (same) | (same) | `pendingRuntimeSwitch.from.{runtimeKind, llmModelIdentifier, llmConfig, platformAgentRunId}` | The session the run last ran on. **New:** `runtimeKind` may equal the binding's (a model hand-over) | Same | Same; **new reader:** `selectionContextFor` takes the reference model from it (DEC-005) |
| (same) | (same) | binding `runtimeKind`, `llmModelIdentifier`, `llmConfig`, `platformAgentRunId` | The saved selection; `platformAgentRunId: null` while a hand-over is pending | The rule | Activation |
| Validation / options context | In-process: save paths and options callers → `RunModelSelectionService` | `handOver: "available" \| "unavailable" \| "no_session"` | Whether this record can make a pending switch | `stoppedRunHandOver(metadata)` (standalone), `scopeKind` (Team/Org scopes), `no_session` constants (launch validators) | `validateWithEvidence`, `optionsWithEvidence` |
| (same) | (same) | `currentModelIdentifier` (meaning narrowed) | The reference model on the selection's runtime; `null` = the selection is on another runtime than the last session | `selectionContextFor`; the options callers (saved model); the launch validators (their own model) | Selection service only |
| Valid validation result | In-process: selection service → save paths | `continuation: "same_session" \| "hand_over"` | How the save continues the run | Selection service | Save paths → `RuntimeSelection.continuation` → the rule |

- Identities and relationships: a pending switch belongs to one record (one run, or one member node), with at most one per record; `from` is the previous binding of that same record. `continuation` lives only for one save.
- Invariants and lifecycle:
  - a pending switch is created by a `hand_over` save when none is pending (a later `hand_over` keeps the first `from`);
  - it is removed by a `same_session` save (undo or ≥ resume) or by the activation's commit;
  - while one is pending, the binding has no session ID;
  - `same_session` always names the session's own runtime; the rule throws otherwise.
- Examples:
  - Model hand-over pending (standalone `run_metadata.json` excerpt):
    ```json
    { "runtimeKind": "autobyteus", "llmModelIdentifier": "qwen-small@lmstudio", "platformAgentRunId": null,
      "pendingRuntimeSwitch": { "switchId": "5f0c…", "from": { "runtimeKind": "autobyteus",
        "llmModelIdentifier": "qwen-removed@lmstudio", "llmConfig": null, "platformAgentRunId": null } } }
    ```
  - Runtime switch pending (unchanged shape): `from.runtimeKind: "autobyteus"`, binding `runtimeKind: "codex_app_server"`.
  - Save result for a model hand-over: `{ kind: "valid", selection: { llmModelIdentifier: "qwen-small@lmstudio", llmConfig: null }, continuation: "hand_over" }`.

### Data Contract Validation

| Use Case / Scenario | Flow Step (Refusals Included) | Reads | Writes | Served? |
| --- | --- | --- | --- | --- |
| UC-001 / SCN-001 | Open Settings | Options context (`handOver: available`), catalog | — | Yes: every offered native model |
| UC-001 / SCN-001 | Save `qwen-small` (reference gone) | Context: reference = saved model | `continuation: hand_over` → binding + new pending | Yes |
| UC-001 / SCN-001 | Next message | `pendingRuntimeSwitch` | Archive + marker; commit clears pending | Yes (unchanged path) |
| UC-003 / SCN-005 | Save a smaller verified model | Capacities | `hand_over` | Yes |
| SCN-004 | Save an equal or bigger model | Capacities | `same_session`, nothing pending | Yes |
| REQ-004 (a)-(d) | Re-save while a model hand-over is pending from A | Reference = `from` (A) | (a) same_session, pending cleared; (b) hand_over, `from` A kept; (c) same_session with the third model, pending cleared; (d) hand_over, `from` A kept | Yes (AR-001 resolved) |
| BEH-003 RS-08 | Native model edit while AGY→native is pending | Reference: AGY (another runtime) → `null` | hand_over, `from` AGY kept | Yes |
| AC-009 refusal | Peer-started run, smaller target | `handOver: unavailable` | — (invalid, today's message) | Yes |
| DEC-007 | Team default row, gone model | `handOver: no_session` | `same_session`; default launch only | Yes |
| Launch validators | Org create, launch-usability check, model routing | `handOver: no_session`, unchanged model | — | Yes (AR-002) |

- Checks run against existing data or real dependencies:
  - **Read-only scan** of this node's app data (`~/.autobyteus/server-data`, 2026-11-23): 3 JSON files hold `pendingRuntimeSwitch`, all of them Memory Sync imports from `docker-node-1`.
    - Two are same-runtime pending switches (`claude_agent_sdk` → `claude_agent_sdk`, session `null`): the new state already exists in stored data, and the parser accepts it.
    - One is a cross-runtime switch (`autobyteus` → `antigravity_cli`).
    - Under the new rule each reads as before: the reference is `from`, and the next activation makes a fresh session.
  - **Real dependency:** native `createAgentWithId` takes no `restoreOptions` (A-09).
  - **Probe** rerun on `1f761bc8db`: still reproduces.
- Contract changes the validation caused: AR-001 settled outcome (c) as `same_session`; three `no_session` builders added (AR-002).

## Persisted Data / State Transition Decision (Mandatory)

- Stored subject: `pendingRuntimeSwitch` in a standalone run's `run_metadata.json` and in member nodes of Team/Org execution trees (A-01, A-14).
- Change: a new legal state (`from.runtimeKind` equals the binding's runtime); no shape change.
- Readers and writers: the parser accepts it (A-14); activation, archive, notice and journal read only `from` and the key (A-07..A-11).
- Semantics: switches stored by earlier versions keep their meaning. For any stored pending switch, the new rule gives the same result as today, except for three intended DEC-005 consequences:
  1. undoing a native→external switch onto a *smaller* native model hands over instead of resuming the old session unchecked;
  2. the same for an undo onto a native model of *unknown* capacity;
  3. re-picking the previous model counts as `unchanged` (looked up with `findExactCurrent`). So an undo onto a previous model that is no longer offered is accepted at Save, where today it is `model_unavailable`, and G-5 then refuses the start. It is reachable only through the API: the menu doesn't list a gone previous model.
- Representative data: the read-only scan in Data Contract Validation (same-runtime pending switches already stored).
- Decision: `Directly Usable — No Migration`.

## Data-Flow Spine Inventory

| Spine | Scope | Behaviors | Start | End | Owner | Why |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary | BEH-001..006 | Settings Save (web) | Stored binding (+ pending) | `RunModelSelectionService` decides; `applyRuntimeSelection` applies | The decision being changed |
| DS-002 | Primary | BEH-001, 002, 006 | Next user input | Fresh session answers with the notice | Lifecycle / member planner (unchanged) | The hand-over itself (reused) |
| DS-003 | Primary | REQ-001 | Settings open | Model menu | `RunModelSelectionService.listOptions` | The menu |

## Primary Execution Spine(s)

- DS-001: `Settings Save (web) → GraphQL save → save path (standalone updater | Team plan | Org manager) → selectionContextFor(+handOver) → RunModelSelectionService.validate → {selection, continuation} → applyRuntimeSelection → metadata / tree write`
- DS-002 (unchanged): `User input → lifecycle activateOnce / member planner → pending? → new session (native createAgentWithId) → RuntimeSwitchRecorder.record (archive + marker) → commit (pending cleared) → publish → notice preface on the input`
- DS-003: `Settings open → options query → studio-run-model-config-service | agent-org-run-service (+handOver) → RunModelSelectionService.listOptions → {currentModel, replacements} → ExistingRunConfigEditor menu`

## Spine Narratives (Mandatory)

| Spine | Narrative | Subjects | Owner | Off-spine |
| --- | --- | --- | --- | --- |
| DS-001 | The save path knows the record kind, so it states the hand-over capability. The selection service compares the target with the reference model and returns the continuation. The switch rule applies it: same session (the last session's binding with the new model, any pending switch cleared) or hand-over (a fresh binding, the pending switch kept or created). | Selection, continuation, binding, pending switch | Selection service / switch rule | Native capacity resolution |
| DS-002 | Unchanged. A pending switch, whether same runtime or not, is made real at the next input. | Session, marker, notice | Lifecycle / member planner | Recorder, notice service |
| DS-003 | Options list every offered native model when a hand-over is available or there is no session; the old ≥ filter applies only when a hand-over is unavailable. | Options | Selection service | Capacity resolution |

## Spine Actors / Main-Line Nodes

Save path → `selectionContextFor` → `RunModelSelectionService` → `applyRuntimeSelection` → store. For DS-003, the options callers → `RunModelSelectionService`.

## Ownership Map

- `RunModelSelectionService`: owns model validity, capacity evidence and **the continuation decision** (new), and the options. The capacity comparison stays here, its only place.
- `applyRuntimeSelection`: owns what a save does to a binding given the continuation, i.e. the pending-switch invariants (first previous binding kept, undo restores the session).
- `selectionContextFor`: owns the reference model (DEC-005). It doesn't decide the capability; the caller passes it.
- `stoppedRunHandOver(metadata)` (new, in `standalone-agent-run-eligibility.ts`): the one owner of a standalone run's capability, next to `canSwitchRuntime`.
- Team and Org paths: a scope's capability follows from its `scopeKind` (`CONFIGURED_AGENT` → `available`; `CONFIGURED_TEAM` / `CONFIGURED_ORG` → `no_session`).

## Thin Entry Facades / Public Wrappers

N/A: none added.

## Removal / Decommission Plan (Mandatory)

| Item | Why unnecessary | Replaced by | Notes |
| --- | --- | --- | --- |
| `applyRuntimeSelection` branches "previous runtime again → undo" and "same runtime → model edit" (`runtime-selection-rule.ts:48-60`) | The continuation decides | One `same_session` branch (session = pending `from` or binding) and one `hand_over` branch | Same results for all stored cases (AC-007) |
| Native refusals in `validateWithEvidence` (`run-model-selection-service.ts:120-125`) for `available` / `no_session` | Hand-over or no session | `continuation: "hand_over"` | The refusal stays for `unavailable` (AC-009) |
| "Fresh because null" comment and semantics in `selectionContextFor` | The reference is explicit | Reference-model rule | — |
| Test cases pinning the old rule (A-16) | Behavior replaced | Rewritten to the new rule | REQ-008 |

## Return Or Event Spine(s)

The Save result returns to the web with a message. For a standalone model hand-over the message is new (REQ-007). Team and Org Save messages are generic today and stay so.

## Bounded Local / Internal Spines

`RunModelSelectionService.validateWithEvidence`, the decision for a valid, offered target:

```text
reference = context.currentModelIdentifier            // last session's model on this runtime, or null
if unchanged (target == reference)                    → same_session
if context.handOver == "no_session"                   → same_session   (nothing to continue)
if reference == null                                  → hand_over      (another runtime than the last session)
if runtime is external                                → same_session
native: fits = cap(reference) known && cap(target) known && cap(target) >= cap(reference)
  fits                                                → same_session
  !fits && handOver == "available"                    → hand_over
  !fits && handOver == "unavailable"                  → invalid (today's two messages)
```

The reviewer suggested making "another runtime than the last session" explicit instead of reading it from `reference == null`. It stays as it is: `null` has that one meaning, and only the selection service reads it (ARCH-REV-001, accepted). `reference == null` with `handOver == "unavailable"` can't occur: those runs can't change runtime (updater gate, A-06). It stays `hand_over`, and the lifecycle fails closed as it does today.

## Off-Spine Concerns Around The Spine

| Concern | Spine | Serves | Responsibility | Why | Risk if on main line |
| --- | --- | --- | --- | --- | --- |
| Native capacity resolution (`NativeModelCapacityService`) | DS-001, DS-003 | Selection service | Capacities of offered models | Evidence | — (unchanged) |
| Marker text (`buildRuntimeSwitchBetween`) | DS-002 | Recorder | The marker sentence; same runtime → "Model changed from {a} to {b}." | DEC-008 | — |

## Ownership Boundaries

The save paths depend on `RunModelSelectionService` (the validator boundary) and on the switch rule. They don't compare capacities themselves and don't decide the continuation. The switch rule doesn't read capacities. It trusts `continuation`, but it throws when `same_session` names a runtime other than the session's, so a wiring mistake fails loudly.

## Boundary Encapsulation Map

| Boundary | Encapsulates | Callers | Forbidden bypass | Fix if thin |
| --- | --- | --- | --- | --- |
| `RunModelSelectionService.validate/validateMany` | Capacity evidence, continuation decision | 3 save paths | A save path calling `NativeModelCapacityService` or comparing runtimes itself | Extend the result, not the callers |
| `applyRuntimeSelection` / `applySelectionToConfiguredMember` / `buildRuntimeSwitchMetadata` | Pending-switch invariants | Commit and tree mutators | Writing `pendingRuntimeSwitch` elsewhere | — |

## Dependency Rules

- The direction is unchanged: save paths → `selectionContextFor` and the selection service; mutators → the rule.
- `run-history/domain` (the rule) must not import `llm-management`. `continuation` is a string union defined in the rule's module (`RuntimeSelection`), and the selection service's result type reuses it by import from `run-history/domain/runtime-selection-rule.ts`. If that import direction is unwanted, the union can live in `llm-management/domain/run-model-selection.ts` and the rule imports it; the implementer picks the direction that already exists between these modules. Today `stopped-run-selection-context.ts` imports both, and `run-model-selection.ts` imports neither. Preferred: define `RunContinuation` in `llm-management/domain/run-model-selection.ts` (pure types) and import it in the rule.
- Collaborators: no new ones; no process-wide lookups added.

## Interface Boundary Mapping

| Interface | Subject | Responsibility | Identity shape | Notes |
| --- | --- | --- | --- | --- |
| `RunModelSelectionContext` / `RunModelValidationContext` + `handOver: "available" \| "unavailable" \| "no_session"` (required) | One stopped scope's selection | Where and how a selection may continue | Runtime, reference model, workspace, capability | Required, so every builder states it |
| `RunModelSelectionValidationResult` `valid` + `continuation: RunContinuation` | Validation result | The decision | — | Not part of GraphQL |
| `RuntimeSelection` + `continuation` (required) | Rule input | Apply the decision | — | Team/Org patch types after normalization carry it |
| `selectionContextFor(current, selection, handOver)` | Context builder | Reference model (DEC-005) | Record's binding + pending | Third argument |
| `stoppedRunHandOver(metadata)` | A standalone run | Its capability | `AgentRunMetadata` | `canSwitchRuntime` → `available`; `!startedAt` → `no_session`; else `unavailable` |

## Interface Boundary Check

| Interface | Singular | Explicit identity | Ambiguity | Action |
| --- | --- | --- | --- | --- |
| Context + `handOver` | Yes | Yes | Low | — |
| Valid result + `continuation` | Yes | Yes | Low | — |
| `RuntimeSelection` + `continuation` | Yes | Yes | Low | — |

## Main Domain Subject Naming Check

| Subject | Name | Natural | Same everywhere | Drift risk | Action |
| --- | --- | --- | --- | --- | --- |
| Continuation | `continuation: "same_session" \| "hand_over"` | Yes | Yes ("hand-over" as in the glossary's hand-over notice) | Low | Add to the glossary |
| Capability | `handOver: "available" \| "unavailable" \| "no_session"` | Yes | Yes | Low | — |
| Pending switch (same runtime) | `pendingRuntimeSwitch` | Mostly | Defined in the glossary | Medium | Deviation recorded; glossary updated |

## Existing Capability / Subsystem Reuse Check

| Need | Existing | Decision | Why |
| --- | --- | --- | --- |
| Fresh session + journal | autobyteus-316/348 switch (pending, activation, recorder, notice) | Reuse | The user asked for this approach; runtime-agnostic (A-07..A-11) |
| Capacity comparison | `NativeModelCapacityService` in the selection service | Reuse | One owner |
| Standalone capability | `canSwitchRuntime` | Extend (sibling function in the same file) | One owner of run eligibility |

## Subsystem / Capability-Area Allocation

| Area | Concerns | Spines | Decision |
| --- | --- | --- | --- |
| `llm-management` | Continuation decision, options | DS-001, DS-003 | Extend |
| `run-history/domain` | Switch rule | DS-001 | Extend |
| `agent-execution` | Context builder, standalone capability, updater message, marker text | DS-001, DS-002 | Extend |
| `agent-team-execution`, `agent-org-execution`, `run-history/services` (options) | Pass capability and continuation | DS-001, DS-003 | Extend |
| `autobyteus-web` localization | Help text | DS-003 | Modify |

## Draft File Responsibility Mapping / Reusable Structures / Tightness

No new files. The new types are `RunContinuation` and `RunHandOver` in `llm-management/domain/run-model-selection.ts`, beside the context types that use them. They are tight: one field each, each with one meaning. No parallel representation: `currentModelIdentifier: null` keeps only its meaning "another runtime than the last session", and the decision is never inferred from it outside the selection service.

## Final File Responsibility Mapping

| File | Change |
| --- | --- |
| `autobyteus-server-ts/src/llm-management/domain/run-model-selection.ts` | Add `RunContinuation`, `RunHandOver`; `handOver` on both context types |
| `autobyteus-server-ts/src/llm-management/services/run-model-selection-service.ts` | Decision table (bounded local spine) in `validateWithEvidence`; `valid` result gains `continuation`; `optionsWithEvidence` lists all offered native models unless `handOver === "unavailable"` |
| `autobyteus-server-ts/src/agent-execution/services/stopped-run-selection-context.ts` | Reference model = pending `from` (DEC-005); `handOver` parameter; rewrite the doc comment |
| `autobyteus-server-ts/src/agent-execution/services/standalone-agent-run-eligibility.ts` | Add `stoppedRunHandOver(metadata)` |
| `autobyteus-server-ts/src/agent-execution/services/standalone-stopped-run-selection-updater.ts` | Pass `stoppedRunHandOver(metadata)`; forward `continuation`; Save message for a same-runtime pending switch (below) |
| `autobyteus-server-ts/src/run-history/domain/runtime-selection-rule.ts` | `RuntimeSelection.continuation`; `applyRuntimeSelection` rewritten to two branches (example below); doc comments |
| `autobyteus-server-ts/src/run-history/services/agent-run-runtime-switch-commit.ts` | Types only (selection carries `continuation`) |
| `autobyteus-server-ts/src/agent-team-execution/services/team-run-delegated-launch-plan.ts` | `handOver` by `scopeKind`; forward `continuation` into the normalized patch |
| `autobyteus-server-ts/src/agent-team-execution/services/team-run-selection-mutator.ts` | The normalized patch type carries `continuation` (the GraphQL input patch doesn't) |
| `autobyteus-server-ts/src/agent-org-execution/services/agent-org-run-manager.ts` | `handOver` by `scopeKind`; forward `continuation` |
| `autobyteus-server-ts/src/agent-org-execution/services/agent-org-run-config-mutator.ts` | Patch type carries `continuation` |
| `autobyteus-server-ts/src/run-history/services/studio-run-model-config-service.ts` | Options: `handOver` for the agent (`stoppedRunHandOver(agentMetadata(...))`) and for Team scopes by kind |
| `autobyteus-server-ts/src/agent-org-execution/services/agent-org-run-service.ts` | Options: `handOver` by `scopeKind` |
| `autobyteus-server-ts/src/agent-execution/domain/runtime-switch.ts` | In `buildRuntimeSwitchBetween` only (`:36-56`), the marker text for the same runtime: `Model changed from ${from.llmModelIdentifier} to ${to.llmModelIdentifier}.` It applies only when the runtime is the same **and the models differ**. A same-runtime, same-model pending switch keeps today's text (N-4, ARCH-REV-002: such records exist in stored imports) `buildSessionRenewal` (`:59-75`) is unchanged |
| `autobyteus-server-ts/src/agent-org-execution/services/agent-org-run-service.ts` (Org create, `:157`) | `handOver: "no_session"` |
| `autobyteus-server-ts/src/launch-preferences/launch-usability-check.ts` (`:158`) | `handOver: "no_session"` |
| `autobyteus-server-ts/src/model-routing/model-routing-settings.ts` (`:137`) | `handOver: "no_session"` |
| `autobyteus-web/localization/messages/en/workspace.ts`, `…/zh-CN/workspace.ts` | `nativeModelHelp`: en "A model with a smaller or unknown context window starts a fresh session that continues from the work journal."; zh-CN "上下文窗口更小或未知的模型会开启新会话，并从工作日志继续。" |
| `GLOSSARY.md` (`:435-468`) | "Agent runtime switch" (`:435`): the runtime can stay the same, a model hand-over. "Model hand-over" and "Continuation": new entries beside "Lost runtime session" / "Session renewal" (`:441-454`). "Pending agent runtime switch" (`:455`): drop "of another agent runtime". "Switch marker" (`:462-468`): add the third text, "Model changed from … to …." |

Exact type placement may follow the implementer's reading of the imports, within the dependency rule above. The Team/Org patch types gain `continuation` only after normalization, so a GraphQL input type never carries it. If the existing types make that awkward, carry it next to the patch in the target (`{ patch, continuation }`) instead; that is the implementer's choice.

## Applied Patterns

None.

## Target Subsystem / Folder / File Mapping

As above. No new folders or files.

## Folder Boundary Check

N/A: no placement changes.

## Concrete Examples / Shape Guidance

| Topic | Good | Avoided | Why |
| --- | --- | --- | --- |
| The rule | see below | Keeping the runtime branches and adding "if same runtime and smaller then pending" | One decision owner; no second inference |
| Decision owner | The selection service returns `continuation` | A save path comparing capacities, or the rule reading the catalog | Capacity evidence has one owner |

```ts
// runtime-selection-rule.ts — target shape
export const applyRuntimeSelection = (state, selection, switchId) => {
  const llmConfig = selection.llmConfig ? structuredClone(selection.llmConfig) : null;
  const pending = state.pendingRuntimeSwitch;
  if (selection.continuation === "same_session") {
    // The session the run last ran on goes on (undo of a pending switch, or a model edit).
    const session = pending ? pending.from : { ...state.binding, llmConfig: state.binding.llmConfig ?? null };
    if (selection.runtimeKind !== session.runtimeKind) throw new Error("A session continues only on its own agent runtime.");
    return { binding: { runtimeKind: session.runtimeKind, llmModelIdentifier: selection.llmModelIdentifier, llmConfig,
      platformAgentRunId: session.platformAgentRunId } };
  }
  return {
    binding: { runtimeKind: selection.runtimeKind, llmModelIdentifier: selection.llmModelIdentifier, llmConfig, platformAgentRunId: null },
    pendingRuntimeSwitch: pending ?? { switchId, from: { runtimeKind: state.binding.runtimeKind,
      llmModelIdentifier: state.binding.llmModelIdentifier, llmConfig: state.binding.llmConfig ?? null,
      platformAgentRunId: state.binding.platformAgentRunId } },
  };
};
```

Check against today's cases:
- Undo: pending + reference model again → `same_session` → the old session back, pending cleared.
- AR-001, a model hand-over pending from A:
  - a third model ≥ A (both verified) → `same_session` → A's session resumes with the third model, pending cleared;
  - a third model < A or of unknown capacity → `hand_over` → `from` A kept;
  - another runtime → `hand_over` → `from` A kept.
- RS-08, a model edit while a switch to native is pending: the reference is the previous runtime (≠ native) → `hand_over` → pending kept.
- A switch: another runtime → `hand_over`.
- An external model edit → `same_session`.
- A native ≥ edit → `same_session`.

Standalone Save message (`standalone-stopped-run-selection-updater.ts:66-72`): when the committed metadata has a pending switch whose `from.runtimeKind` equals its runtime, the message is "Model saved. Your next message starts a fresh session on the new model, which continues from the work journal." Otherwise the messages are unchanged.

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate | Why considered | Decision | Replacement |
| --- | --- | --- | --- |
| A separate `pendingModelHandOver` field | Vocabulary purity | Rejected | The same field and path (one mechanism; no second reader) |
| Renaming `pendingRuntimeSwitch` with a migration | Principle 15 | Rejected (deviation recorded) | Glossary definition |
| Keeping the old branches and adding a special case | Smaller diff | Rejected | One continuation branch |

## Derived Layering

N/A.

## Change / Refactor Sequence

1. Types (`RunContinuation`, `RunHandOver`, context fields).
2. The selection service decision and options, with unit tests (turn the probe's native cases into tests that flip, AC-001, AC-003..AC-005, AC-009).
3. `selectionContextFor` (reference, `handOver` argument) and `stoppedRunHandOver`.
4. The rule rewrite, with unit tests for every row of the AC-006 (a)-(d) and AC-007 cases (undo, re-edit, a switch while a model hand-over is pending, RS-08's case). The existing `runtime-selection-rule.test.ts` cases keep their expected outcomes, each given its continuation.
5. The three save paths, the two options paths and the three launch validators (`no_session`), compile-driven.
6. Marker text, Save message, help texts, glossary.
7. Executable checks:
   - a built-server E2E for a native→native model hand-over with the fake LM Studio endpoint: save a smaller or gone model, then send a message → marker "Model changed from …", the notice before the user text, the previous records archived, and the new model's request (AC-002);
   - one Team-member case (AC-008);
   - existing switch E2Es unchanged (AC-007).

## Key Tradeoffs

- Reusing the runtime-switch field and path (simple, proven) versus a purer name (needs a migration). We reuse.
- An unknown *target* capacity hands over rather than being refused: the user's rule ("unknown context") and a fresh session is safe whatever the window.
- The menu shows no per-model hint about which choice hands over (the user: keep the UI clean). The help line and the Save message say it.

## Risks

- **A code path that infers "a switch" from different runtimes** and misreads a same-runtime pending switch. Searched: only `runtime-switch-recorder.ts:37` reads `from.runtimeKind` (A-10), and it is fine. The E2E covers the whole path.
- **Undo semantics drift** for existing switches. Mitigation: the rule tests enumerate today's cases (AC-007) before the rewrite.
- **Native start with an unknown-capacity model**: a fresh session behaves like a new launch on that model (launch doesn't check capacity). No new risk.

## Guidance For Implementation

- Reproduction to start from: `tickets/in-progress/stopped-run-unavailable-model/probes/autobyteus-53-repro.test.ts`. Copy it to `autobyteus-server-ts/tests/unit/llm-management/` and run `pnpm exec vitest run <file> --no-watch`. Today the native case asserts the refusal; under the fix it must become `valid` with `continuation: "hand_over"`, with the native options listing both models.
- Keep the GraphQL contract unchanged; the web needs only the locale texts.
- TESTING.md governs the real-app isolated check and the live gates.
