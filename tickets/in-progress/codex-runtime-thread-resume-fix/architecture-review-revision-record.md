# Architecture Review Revision Record

The latest `design-review-report.md` remains authoritative. This file records architecture-review baselines and later deltas only.

## Revision Index

| Revision ID | Review Round / Trigger | Related Solution Revision IDs | Prior Decision | Current Decision | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| `ARCH-REV-001` | Round 1 / SR-002 cumulative resubmission after the paused pre-result attempt | `SR-001`, `SR-002` | N/A | Fail — Design Impact | `ARCH-FIND-001`, `ARCH-FIND-002` |
| `ARCH-REV-002` | Round 2 / SR-003 Design Impact rework | `SR-001`, `SR-002`, `SR-003` | Fail — Design Impact | Pass | `ARCH-FIND-001` resolved; `ARCH-FIND-002` resolved |

## Revision Entries

### ARCH-REV-001 — Initial Codex and Claude continuity architecture-review baseline

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-runtime-thread-resume-fix/tickets/in-progress/codex-runtime-thread-resume-fix/design-review-report.md`
- Review round and trigger: Round 1; cumulative SR-002 package resubmitted after the user-approved Claude Agent SDK expansion. The prior attempt was paused before a completed report or decision.
- Triggering role, report path, and finding IDs: `solution_designer`; no prior review report; `ARCH-FIND-001`, `ARCH-FIND-002`
- Relevant solution revision IDs: `SR-001`, `SR-002`
- Prior authoritative decision: N/A
- Current authoritative decision: Fail — Design Impact
- What changed in the review result or what baseline was established: Established the first completed review baseline. The approved behavior basis, runtime evidence, root/task/lock-head persistence design, strict provider restore, Claude UUID lifecycle, removals, error projection, and no-migration decision were validated. Two reachable concurrency/publication gaps prevent the claimed write-before-live/pre-input invariant: team member readiness is not single-flight, and standalone provisioning persists only after manager-level live registration.

#### Prior Finding Resolution

None.

- New or remaining finding IDs: `ARCH-FIND-001`, `ARCH-FIND-002`
- Material classification changes: None from a prior review; this is the initial completed baseline. Current failure classification is `Design Impact`.
- Recommended recipient: `solution_designer`
- Remaining risks or uncertainty: No requirement ambiguity blocks rework. The design must specify the AgentRun candidate/publication or admission contract and re-enter architecture review. Historical missing/placeholder bindings remain intentionally non-recoverable.

### ARCH-REV-002 — Candidate publication and standalone activation re-review pass

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-runtime-thread-resume-fix/tickets/in-progress/codex-runtime-thread-resume-fix/design-review-report.md`
- Review round and trigger: Round 2; SR-003 resubmission resolving the two reachable concurrency/publication findings from `ARCH-REV-001`.
- Triggering role, report path, and finding IDs: `solution_designer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-runtime-thread-resume-fix/tickets/in-progress/codex-runtime-thread-resume-fix/design-review-report.md`; `ARCH-FIND-001`, `ARCH-FIND-002`
- Relevant solution revision IDs: `SR-001`, `SR-002`, `SR-003`
- Prior authoritative decision: Fail — Design Impact
- Current authoritative decision: Pass
- What changed in the review result or what baseline was established: SR-003 separates AgentRun construction from publication using one exclusive unpublished candidate claim, adds one handle-owned readiness promise for configured/committed team members, retains direct-task candidates until task/tree durability, and routes all standalone activation intents through one durability/admission owner. The active registry now contains published runs only; exact metadata reconciliation and confirmed-abort/quarantine rules close the prior early-input and duplicate-candidate paths.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| `ARCH-FIND-001` | Open — High Design Impact | Resolved | `ARCH-REV-001`; `SR-003`; `ARCH-REV-002` | DS-001 and DS-010 now install one handle promise before async work, claim the run ID before backend awaits, keep the candidate out of `getActiveRun`, hide raw input, adopt through root/staged task durability, then publish synchronously. The ownership, interfaces, file map, failure matrix, examples, sequence, and latch-based concurrency guidance all agree. |
| `ARCH-FIND-002` | Open — High Design Impact | Resolved | `ARCH-REV-001`; `SR-003`; `ARCH-REV-002` | DS-006, DS-009, and DS-011 make `StandaloneAgentRunActivationService` the one-flight owner across command/create/activate/restore. It orders strict metadata decision, private candidate/ID validation, exact `recordRunStarted` durability or reconciliation, publication, then input; eager manager publication and both prior activation maps are removed. |

- New or remaining finding IDs: None
- Material classification changes: Prior `Design Impact` failure is resolved; current result is Pass.
- Recommended recipient: `implementation_engineer`
- Remaining risks or uncertainty: Historical null/local-placeholder bindings remain intentionally non-recoverable. A persisted but unmaterialized Claude UUID may fail exact resume. Cleanup uncertainty may leave an unused remote artifact, but the retained manager claim/quarantine prevents live input and same-process replacement. These risks are explicit and do not block implementation.
