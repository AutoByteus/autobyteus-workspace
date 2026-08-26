# Solution Revision Record

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Result |
| --- | --- | --- | --- | --- |
| SR-001 | User-approved bootstrap from the future architecture simplification assessment | N/A | Initial Baseline | Design-ready package produced |
| SR-002 | Code reviewer current-Personal refresh handoff | N/A | Upstream Rebootstrap / Source Revalidation | Existing approved package refreshed and design-ready for new architecture review |
| SR-003 | Code reviewer CRR-003 / API-REV-001 failure-origin review | CR-002 / APIE2E-F001 | Downstream Design Impact | Completion/control boundary reconciled; ready for architecture re-review |

## Revision Entries

### SR-001 — Logical application-agent addressing and role contraction baseline

- Triggering role, report path, and round: user direction plus the code-reviewer future architecture simplification assessment; upstream `future-architecture-simplification-review.md`.
- Triggering finding IDs: N/A for baseline.
- Prior authoritative result: N/A.
- Current authoritative result: requirements and normative addressing contract are approved; the complete solution is ready for architecture review after the provider-composition package.
- Why this baseline is recorded: establishes the clean public root/member address, sole authorization-owned physical translation, descriptor-only input/stream flow, redundant application-role removal, and directly usable current-schema data decision.
- Resolution: replaces repeated public subject/physical selectors and downstream reinterpretation without changing `ApplicationExecutionScope`, provider runtime configuration, physical run correlation, or dual-host behavior.
- Approved behavior or requirement IDs affected: BEH-001–BEH-007; REQ-001–REQ-008; AC-001–AC-018.
- Canonical artifacts and sections updated: `requirements.md`, `investigation-notes.md`, `design-spec.md`.
- Supplemental artifacts added: `logical-application-agent-addressing-contract.md`, `logical-application-agent-addressing-transition-inventory.md`.
- Downstream and architecture-review impact: implementation remains blocked pending a passing architecture review; the package must be reviewed separately and second in the approved ticket order.
- Next recipient or routing: `/architecture_reviewer` after the explicit provider-composition package is submitted first.
- Remaining gaps or risks: architecture must validate descriptor completeness, occurrence closure, and current-data projection ownership; implementation must prove package parity, old-superset reads, and realistic root/member behavior in Studio and standalone.

### SR-002 — Current-Personal rebootstrap and dependency-boundary refinement

- Triggering role, report path, and round: `/code_reviewer` handoff, “Bootstrap/refresh the logical application-agent addressing simplification ticket from current origin/personal,” 2026-08-26.
- Triggering finding IDs: N/A; upstream refresh request rather than a review finding.
- Prior authoritative result: the existing package's `ARCH-REV-001 Pass` applied to SR-001 on old source basis `0811503a6c547698e7b77e1064d98890101acc1b`; it is preserved as historical reviewer evidence, not treated as authority for current Personal.
- Current authoritative result: approved BEH-001–BEH-007 and REQ-001–REQ-008 remain unchanged; the package is revalidated and design-ready against `origin/personal@4108786f4058ca83fd036df84666a2c846fd6401`.
- Why this revision is recorded: current Personal contains the finalized execution-scope/provider/session architecture plus stopped-run model-config and application-run-ownership behavior, and is not descended from the ticket's old source basis. The existing ticket had to be reused safely and its spines, consumers, persistence, and exact transition inventory re-audited.
- Resolution: protected the prior solution at `codex/logical-application-agent-addressing-and-role-simplification-pre-current-personal-refresh`, rebased its single documentation commit onto exact current Personal, and retained the approved clean-cut public contract. Refined the internal dependency boundary so `application-execution-scope-contracts.ts` owns `ResolvedApplicationAgentExecutionTarget`, authorization owns the complete descriptor, host input derives subject-specific command arguments only from `descriptor.runtime`, and scope streaming receives that runtime value directly.
- Approved behavior or requirement IDs affected: no semantic change; clarification implements BEH-003, REQ-004, AC-006, and AC-007 while preserving the complete approved baseline.
- Canonical artifacts and sections updated: current source/base, owner and data-flow spine descriptions, dependency rules, exact private types, persistence revalidation, current-Personal owners/tests, and verification/occurrence obligations in `requirements.md`, `investigation-notes.md`, and `design-spec.md`.
- Supplemental artifacts updated or added: revised `logical-application-agent-addressing-contract.md`; revised `logical-application-agent-addressing-transition-inventory.md`; added `current-personal-refresh-analysis.md` and `evidence/solution/sr-002-current-personal-source-audit.log`.
- Downstream and architecture-review impact: implementation remains blocked; a fresh architecture review must assess SR-002 on current Personal. The finalized provider/session/scope architecture, general/application family separation, run-ownership guard, stopped-run model configuration, and Directly Usable — No Migration decision are fixed preservation constraints.
- Next recipient or routing: `/architecture_reviewer` with the cumulative current package and historical review artifacts.
- Remaining gaps or risks: architecture must confirm exact resolved-target ownership and occurrence closure; downstream must prove generated/package parity, current-data superset reads, and realistic Studio/standalone root/member behavior. No open requirement question remains.

### SR-003 — Completion-coupled application work and abort-before-failure engine control

- Triggering role, report path, and round: `/code_reviewer`, `code-review-report.md`, CRR-003 focused failure-origin review of API-REV-001 / APIE2E-F001.
- Triggering finding IDs: `CR-002`.
- Prior authoritative result: `ARCH-REV-002 Pass` for SR-001–SR-002; `IR-002`; `CRR-002 Pass / 97`; `API-REV-001 Fail / 93` on one cold/reentry response-lifecycle finding.
- Current authoritative result: `Design Impact resolved in the solution package; ready for architecture re-review`. The logical-address implementation remains accepted and unchanged. SR-003 selects the existing synchronous completion contract and removes the internal live-work timeout ambiguity without adding a public API.
- Why this revision is recorded: direct Studio/standalone evidence proved that two independent 30-second transport timers could report HTTP failure while the same accepted mutation later committed. Correlation transports did not own cancellation, commit, or retry policy.
- Resolution: `ApplicationEngineController` governs completion-coupled application work; `ApplicationEngineClient` and `ApplicationWorkerHostBridgeClient` retain correlations until real response/error/write/close; a new concrete control-request owner applies deadlines only to definition load and stop and terminates/awaits the worker before timeout failure. Bridge close and write-failure cleanup become explicit. Brief/Socratic schemas/services, public GraphQL/command/route contracts, JSON-RPC frames, and persistence remain unchanged.
- Approved behavior or requirement IDs affected: `BEH-007`, `REQ-008`, `AC-018`; no new public behavior, migration, or requirement ID.
- Canonical artifacts and sections updated: `requirements.md` (existing synchronous preservation obligation made explicit), `investigation-notes.md` (runtime/source evidence, MP-006–MP-008, owners), `design-spec.md` (DS-010–DS-012 and exact ownership/dependency/file transition), `logical-application-agent-addressing-transition-inventory.md` (exact production/test/occurrence delta).
- Supplemental artifact added: `application-worker-operation-completion-contract.md` (normative derived technical correction; approval N/A).
- Downstream and architecture-review impact: implementation/API-E2E remain paused. Architecture must confirm the completion-versus-control boundary, no public-contract expansion, exact control importers, and proof inventory before implementation resumes. After implementation and source review, API/E2E reruns the exact cold Studio RequestHint, standalone Socratic restart, and cold Brief launch evidence plus preserved logical root/member matrix.
- Requirements approval state: existing user approval remains applicable because the outward API remains synchronous and the correction restores its actual completion result. Public async status, idempotency, cancellation, retry, or indeterminate/reconciliation behavior remains a Requirement Gap requiring separate explicit approval.
- Next recipient or routing: `/architecture_reviewer` with the cumulative solution and CRR-003/API-REV-001 evidence package.
- Remaining gaps or risks: a real process/transport failure remains an error and is not automatically retried; do not infer exactly-once semantics. Implementation must prove no live-work timer survives, bridge write/close cannot leak pending work, and lifecycle deadline failure is observable only after worker stop.
