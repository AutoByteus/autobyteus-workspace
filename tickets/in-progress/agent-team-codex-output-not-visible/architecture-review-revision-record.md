# Architecture Review Revision Record

The latest `design-review-report.md` remains authoritative. This record contains concise architecture-review history.

## Revision Index

| Revision ID | Review Round / Trigger | Related Solution Revision IDs | Prior Decision | Current Decision | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| ARCH-REV-001 | Round 1 / initial complete SR-001 architecture review | SR-001 | N/A | Fail — Design Impact | DR-001 |
| ARCH-REV-002 | Round 2 / complete SR-002 re-review for DR-001 | SR-001, SR-002 | Fail — Design Impact | Fail — Design Impact | DR-001 |
| ARCH-REV-003 | Round 3 / complete SR-003 re-review for narrowed DR-001 | SR-001, SR-002, SR-003 | Fail — Design Impact | Pass | DR-001 |

## Revision Entries

### ARCH-REV-001 — Recovery journey requires one real user action and completion boundary

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-codex-output-not-visible/tickets/in-progress/agent-team-codex-output-not-visible/design-review-report.md`
- Review round and trigger: Round 1; initial complete architecture review requested after user approval and SR-001 self-validation
- Triggering role, report path, and finding IDs: `solution_designer`; no prior review report; N/A
- Relevant solution revision IDs: `SR-001`
- Prior authoritative decision: `N/A`
- Current authoritative decision: `Fail — Design Impact`
- What changed in the review result or what baseline was established: Established the initial architecture-review baseline. Confirmed the real Codex/status/sequence root cause, specialized projector design, one synchronization phase, strict-contract preservation, and no-migration decision. Opened DR-001 because the proposed detected-gap recovery skips the actual local-context selection path and lacks an exact conversation-completeness boundary between hydration and the later structural stream snapshot.

#### Prior Finding Resolution

None.

- New or remaining finding IDs: `DR-001`
- Material classification changes: None; initial baseline.
- Recommended recipient: `solution_designer`
- Remaining risks or uncertainty: ordinary silent transport recovery and automatic mid-turn replay remain explicitly out of scope; the rework should keep that simplicity while making the manual recovery action truthful and reachable.

### ARCH-REV-002 — Recovery action and checkpoint pass; projection contract remains incomplete

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-codex-output-not-visible/tickets/in-progress/agent-team-codex-output-not-visible/design-review-report.md`
- Review round and trigger: Round 2; complete SR-002 architecture re-review after rework for ARCH-REV-001 / DR-001
- Triggering role, report path, and finding IDs: `solution_designer`; prior canonical `design-review-report.md`; DR-001
- Relevant solution revision IDs: `SR-001`, `SR-002`
- Prior authoritative decision: `Fail — Design Impact`
- Current authoritative decision: `Fail — Design Impact`
- What changed in the review result or what baseline was established: Confirmed that SR-002 now routes the actual failed local selection to `reopenTeamRunAfterStreamLoss`, rejects active work, compares one root checkpoint around hydration, requires the exact candidate snapshot base, keeps candidate state unpublished, and prevents background resurrection. DR-001 remains open only because the claimed verified-empty/read-failure distinction has no implementable server projection/API contract. A prospective post-terminal recorder race was independently audited as Not Reachable and does not justify added durability machinery.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| DR-001 | Open — recovery action and completion boundary | Partially resolved — remains open at projection producer/API boundary | SR-002; ARCH-REV-001 | `runHistorySelectionActions` is now in the recovery spine; `TeamRunExecutionCheckpoint`, candidate isolation, and snapshot-base equality resolve the supported active-work interval. Current `AgentRunViewProjectionService` converts provider failure to an empty bundle and GraphQL `getTeamMemberRunProjection` is non-null, contradicting the recovery-specific `null`/failure contract. |

- New or remaining finding IDs: `DR-001`; no new finding ID
- Material classification changes: None. The remaining issue is still `Design Impact`, narrowed to the recovery projection boundary.
- Recommended recipient: `solution_designer`
- Remaining risks or uncertainty: ordinary silent transport recovery and automatic replay stay out of scope. The next revision should correct or remove the unsupported projection-result distinction without adding a second sequence, replay, outbox, persistence, or provider-specific behavior.

### ARCH-REV-003 — Exact non-null recovery projection resolves DR-001

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-codex-output-not-visible/tickets/in-progress/agent-team-codex-output-not-visible/design-review-report.md`
- Review round and trigger: Round 3; complete SR-003 architecture re-review after the narrowed ARCH-REV-002 / DR-001 correction
- Triggering role, report path, and finding IDs: `solution_designer`; prior canonical `design-review-report.md`; DR-001
- Relevant solution revision IDs: `SR-001`, `SR-002`, `SR-003`
- Prior authoritative decision: `Fail — Design Impact`
- Current authoritative decision: `Pass`
- What changed in the review result or what baseline was established: Confirmed that SR-003 removes the unsupported successful-null/provider-failure result machinery and uses the actual projection-or-empty server owner, Team-member identity mapping, non-null GraphQL field, and non-null generated payload. Recovery directly consumes one exact payload per current AgentRun, treats an object with empty arrays as successful empty content, and aborts only when ordinary GraphQL/transport/identity admission fails. All previously passed status, sequence, selection, checkpoint, candidate-isolation, no-resurrection, no-migration, and provider-neutral boundaries remain coherent.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| DR-001 | Partially resolved — open at projection producer/API boundary | Resolved | SR-003; ARCH-REV-002 | Current `AgentRunViewProjectionService` produces projection-or-empty, `TeamMemberRunViewProjectionService` validates root/AgentRun identity, GraphQL/generated types are non-null, and the target recovery query/builder preserves that exact contract without a nullable field, provider result union, or recovery-only server entry. |

- New or remaining finding IDs: None
- Material classification changes: DR-001 resolved; decision advances from `Fail — Design Impact` to `Pass`.
- Recommended recipient: `implementation_engineer`
- Remaining risks or uncertainty: ordinary silent transport recovery and automatic replay remain intentionally out of scope. Real provider/browser validation remains downstream API/E2E work after implementation and source review.
