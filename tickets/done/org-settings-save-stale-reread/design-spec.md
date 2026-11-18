# Design Spec

## Solution And Approval Basis

- Current solution revision ID: `SR-001`
- Approved requirements baseline: `requirements-doc.md` at SR-001, approved by the Solution Designer within the direction (user informed, 2026-10-24)
- Behavior-defining supplements: none
- Design status: `Ready`
- Canonical investigation-notes path: `/Users/normy/autobyteus_org/autobyteus-worktrees/org-settings-save-stale-reread/tickets/in-progress/org-settings-save-stale-reread/investigation-notes.md`
- Authorities read (2026-10-24): `references/architecture-design.md`, `references/design-principles.md`, `DESIGN.md` (root), `TESTING.md`; design examples not used
- Project design-principle conflicts or discrepancies: none

## Current-State Read

After a successful delegated-copy Save, Settings re-reads the Org's canonical settings through `agentOrgContextsStore.readRunConfig` (`agentOrgContextsStore.ts:358-372`). On a running Org, the same Save makes the server publish `delegated_launch_selections_changed`. The Org view answers with a designed checkpointed reload, and a new context is published (`agentOrgExecutionContext.ts:268-273`, `agentOrgStreamingService.ts:134-170,339`, `agentOrgContextsStore.ts:53-70`). `readRunConfig` compares the captured context and view with the current ones and throws "Org configuration read is stale; refresh required." (line 365). Settings then shows "Settings were saved, but could not be refreshed…" (`existingRunConfigEditActions.ts:96`).

## Task Size And Architectural Risk (Mandatory)

- Task size: `Small`
- Size rationale: one function in one web store (`readRunConfig`), its unit tests, one docs sentence. No API, server or stream change.
- Architectural risk: `Low`
- Risk rationale: no contract, persistence, security or deployment change; the concurrency change is a bounded client-side re-read inside the existing owner, which keeps its guard for real target changes.
- Escalation trigger: if the AC-001 loop still shows the message after the fix (another stale source), or a fix needs changing the Org stream's reload, return a Design Impact.

## Architecture Investigation Evidence

| Source / Command / Probe | Exact Path / Reference | Observation | Design Decision Supported | Remaining Uncertainty |
| --- | --- | --- | --- | --- |
| API-18 | archived evidence (investigation notes) | Reload after 12/12 Saves; stale re-read 4/12 | Fix needed; reload is systematic | — |
| Code | `agentOrgContextsStore.ts:358-372` | Guard mixes target change and view refresh | Separate the two | — |
| Code | `existingRunConfigStore.ts:243`, `existingRunConfigResultActions.ts:148` | Two callers | Policy in the owner, not the callers | — |
| Doc | `docs/settings.md:1388-1392` | Reload is designed | Keep BEH-002 | — |
| SD-01 | `evidence/repro-org-reread-race.spec.ts` | Reproduces | Regression test basis | — |

## Intended Change

`readRunConfig` reads again when only the Org's own view was refreshed during the read; it still refuses when the target really changed, and it gives up after 3 attempts.

## Change Scope (Mandatory)

- In scope: UC-001. `autobyteus-web/stores/agentOrgContextsStore.ts` (`readRunConfig` only), its unit tests, one sentence in `autobyteus-web/docs/settings.md` ("Save recovery").
- Derived consumers: `loadAgentOrgCanonical` and `reconcileAgentOrgFailure` get the same result type; no change.
- Deliberately left alone: the Org/Agent stream reload (BEH-002, follow-up FU-001); `saveRunConfig` (stopped Org's own Save: no stream runs for a stopped Org, so a reload cannot overlap it); Team and Agent loaders (no such guard).
- Follow-ups: FU-001.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Approved Requirement / AC IDs | Approved Trigger | Existing Behavior | Approved Change Or Preserved Outcome | Target Production Path / Spine |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | REQ-001…003, AC-001…005 | Save in Run Settings | Stale error ~1/3 | Re-read on view refresh; refuse on target change | DS-001 |
| BEH-002 | System | preserved | Live Save event | Reload | Unchanged | DS-002 |

## Relevant Supplemental Task Artifacts

| Artifact Path | Purpose | Related IDs | Relationship | Status |
| --- | --- | --- | --- | --- |
| `evidence/repro-org-reread-race.spec.ts` | Failing reproduction | AC-002 | Start of the regression test | Current |

## Task Design Health Assessment (Mandatory)

- Change posture: `Bug Fix`
- Current design issue found: `Yes` (small)
- Structural triggers: *Behavior by absence* does not fire. *Repeated coordination* would fire if each caller retried; this design puts the retry in the one owner. *Several kinds or forms*: the guard serves live and stopped Orgs. Both are traced: live (stream reload possible) and stopped (no stream; the retry is harmless and keeps the publication guarded).
- Root cause classification: `Missing Invariant`. The owner's guard does not tell a refreshed view of the same target from a changed target.
- Refactor needed now: `No`
- Evidence: investigation E-04, SD-01.
- Design response: split the guard into a target check and a view check; re-read on a view change only.
- Intentional deferrals: in-place recording of the event (FU-001).

## Terminology

- *Target change*: the Org's context released (`contexts.value[id]` missing), the node binding changed, or an Org operation (`operations.value[id]`, an inspection) pending.
- *View refresh*: the same Org's context or view object replaced while the target is unchanged.

## Legacy Removal Policy (Mandatory)

- Obsolete legacy paths: none.
- Compatibility wrappers kept: `None`.

## Persisted Data / State Transition Decision

- Decision: `Not Affected`. A client read path only.

## Data-Flow Spine Inventory

| Spine ID | Scope | Related Behavior ID(s) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-001 | Save in `ExistingRunConfigEditor` | Settings draft shows saved model | `agentOrgContextsStore.readRunConfig` (read rule) | The fixed path |
| DS-002 | Return-Event | BEH-002 | Server event | New Org context published | `AgentOrgStreamingService` | Overlaps DS-001 |
| DS-003 | Bounded Local | BEH-001 | read attempt | result or refusal | `readRunConfig` | The bounded re-read loop |

## Primary Execution Spine(s)

DS-001: `ExistingRunConfigEditor Save -> delegatedLaunchDraftStore.save (updateDelegatedLaunchSelections) -> existingRunConfigStore.reloadCanonical(true) -> loadAgentOrgCanonical -> agentOrgContextsStore.readRunConfig -> readAgentOrgRunConfig (GraphQL AgentOrgRunConfig) -> syncAgentOrgCanonical (Settings draft)`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | Save stores the choice; Settings reads the canonical settings and shows them | Save, canonical read, draft | `readRunConfig` | metadata preparation for a stopped Org |
| DS-002 | The live Org's view reloads through the stream after the event | event, checkpoint, snapshot, publish | Org stream | — |

## Spine Actors / Main-Line Nodes

Editor Save, draft store, Settings store loader, `readRunConfig`, Org run-config client.

## Ownership Map

- `readRunConfig` owns the rule "is this read still for the current target, and is it consistent with the current view"; it owns the bounded re-read.
- Callers own only what they do with the result.

## Thin Entry Facades / Public Wrappers

N/A.

## Removal / Decommission Plan (Mandatory)

| Item | Why It Becomes Unnecessary | Replaced By | Notes |
| --- | --- | --- | --- |
| None | — | — | No dead code found in `readRunConfig` |

## Return Or Event Spine(s)

DS-002: `AgentOrgRun.delegatedLaunches.update -> publisher (delegated_launch_selections_changed) -> Org WebSocket -> AgentOrgExecutionContext.applyEvent -> checkpoint_required -> AgentOrgStreamingService.reopenOwned -> CONNECTED -> ROOT_EXECUTION_VIEW_SNAPSHOT -> agentOrgContextsStore.publish`. Unchanged.

## Bounded Local / Internal Spines

DS-003 (parent: `readRunConfig`):
`capture (org, view, binding) -> read canonical -> target changed? refuse -> view refreshed? next attempt (max 3) -> stopped Org: prepare metadata, recheck, apply -> return`

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| `prepareConfigWorkspaces` | DS-001 | `readRunConfig` | Workspace metadata for a stopped Org | Existing | — |

## Ownership Boundaries

`readRunConfig` stays the only entry for the Org canonical read; callers do not inspect `org.view`.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) | Upstream Callers | Forbidden Bypass Shape | If Too Thin |
| --- | --- | --- | --- | --- |
| `agentOrgContextsStore.readRunConfig` | target/view checks, re-read, metadata, `applyRunConfig` | `loadAgentOrgCanonical`, `reconcileAgentOrgFailure` | A caller retrying on the stale error itself | Strengthen `readRunConfig` |

## Dependency Rules

Unchanged. Settings stores → `agentOrgContextsStore` → run-config client. No dependency on the streaming service.

## Interface Boundary Mapping

| Interface | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `readRunConfig(orgRunId)` | Org run config | Current canonical settings of this Org | `orgRunId` | Signature and result unchanged |

## Interface Boundary Check

| Interface | Responsibility Is Singular? | Identity Shape Is Explicit? | Ambiguous Selector Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `readRunConfig` | Yes | Yes | Low | None |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Natural? | Same Meaning Everywhere? | Drift Risk | Action |
| --- | --- | --- | --- | --- | --- |
| Stale error | "Org configuration read is stale; refresh required." | Yes | Yes | Low | Keep text |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area | Decision | Why |
| --- | --- | --- | --- |
| Current-target check | `requireConfigOwner` (`agentOrgContextsStore.ts:331-336`) | Reuse | Each attempt resolves the owner through it |

## Subsystem / Capability-Area Allocation

| Subsystem | Owns | Spine | Owner Served | Decision | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/stores` (Org contexts) | read rule | DS-001/003 | `readRunConfig` | Extend | — |

## Draft File Responsibility Mapping

| Candidate File | Subsystem | Owner | Concern | Why One File | Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `stores/agentOrgContextsStore.ts` | Org contexts | `readRunConfig` | bounded re-read | Existing owner (399 lines; stays < 500) | No |

## Reusable Owned Structures Check

None.

## Shared Structure / Data Model Tightness Check

N/A: no structure changes.

## Final File Responsibility Mapping

As drafted.

## Applied Patterns

None.

## Target Subsystem / Folder / File Mapping

| Path | Kind | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/stores/agentOrgContextsStore.ts` | File (Modify) | `readRunConfig` | Target check vs view refresh; ≤ 3 attempts | Owner of the read | Stream internals |
| `autobyteus-web/stores/__tests__/agentOrgRunConfigPublication.spec.ts` (or a new `agentOrgRunConfigRead.spec.ts` beside it) | File (Modify/Add) | tests | AC-002, AC-003 | Existing `readRunConfig` test harness | — |
| `autobyteus-web/docs/settings.md` ("Save recovery") | Doc (Modify) | docs | One sentence: a reload of a running Org's view during the re-read does not fail the re-read | Docs follow behavior | — |

## Folder Boundary Check

| Path | Depth | Clear? | Risk | Justification |
| --- | --- | --- | --- | --- |
| `stores/` | Main-Line Domain-Control | Yes | Low | Existing |

## Concrete Examples / Shape Guidance

| Topic | Good Example | Bad / Avoided Shape | Why |
| --- | --- | --- | --- |
| Re-read rule | see below | `loadAgentOrgCanonical` catching the stale error and calling `readRunConfig` again | Policy stays in one owner |

Good shape (illustrative):

```ts
const MAX_CONFIG_READ_ATTEMPTS = 3
const readRunConfig = async (orgRunId: string) => {
  for (let attempt = 1; ; attempt += 1) {
    const org = requireConfigOwner(orgRunId), view = org.view
    const binding = useWindowNodeContextStore().bindingRevision
    const targetChanged = () => !contexts.value[orgRunId] || !!operations.value[orgRunId] || inspections.has(orgRunId)
      || binding !== useWindowNodeContextStore().bindingRevision
    const viewRefreshed = () => contexts.value[orgRunId] !== org || org.view !== view
    const canonical = await readAgentOrgRunConfig(orgRunId)
    if (targetChanged()) throw stale()
    if (viewRefreshed()) { if (attempt < MAX_CONFIG_READ_ATTEMPTS) continue; throw stale() }
    // stopped Org: unchanged metadata preparation and applyRunConfig under the same checks
    return canonical
  }
}
```

The stopped-Org branch keeps its existing `current()` recheck after `prepareConfigWorkspaces`; a view refresh there may also take the next attempt.

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why Considered | Decision | Replacement |
| --- | --- | --- | --- |
| None | — | N/A | — |

## Derived Layering

N/A.

## Change / Refactor Sequence

1. Copy the reproduction into the store tests; see it fail.
2. Change `readRunConfig` as above.
3. Add AC-003 cases: context released, binding changed, operation started → stale; view refreshed every attempt → stale after 3 attempts (and exactly 3 reads).
4. Docs sentence.
5. Run the existing Org/Settings store and stream tests.

## Key Tradeoffs

- A re-read costs one more `AgentOrgRunConfig` request on the Saves that hit the race; accepted.
- Recording the event in place (FU-001) would reduce reload work, but it is a separate improvement and would not close the race by itself.

## Risks

- Another stale source in the real stack. AC-001's loop on the real stack catches it.

## Guidance For Implementation

- Reproduction to start from: `tickets/in-progress/org-settings-save-stale-reread/evidence/repro-org-reread-race.spec.ts`. Copy it into `autobyteus-web/stores/__tests__/`, then `NUXT_TEST=true pnpm -C autobyteus-web exec vitest run stores/__tests__/<file> --run`. It fails on base and the fix must turn it green. Fold it into the permanent regression test; do not keep the `zz-probe` name.
- AC-001 needs the browser probe on a built worktree stack, `pnpm -C autobyteus-web exec node tests/e2e/delegated-launch-defaults-probe.mjs --output-dir <fresh> --cases DCP-003,DCR-003,…` repeated to at least 12 Saves, counting any "could not be refreshed" message. That is API/E2E's run; implementation runs the unit layer.
