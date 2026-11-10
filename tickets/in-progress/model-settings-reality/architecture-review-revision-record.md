# Architecture Review Revision Record

## Revision Index

| Revision ID | Review Round / Trigger | Related Solution Revision IDs | Prior Decision | Current Decision | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| ARCH-REV-001 | Round 1, Architecture Design Complete (Large / High), 2026-11-10 | SR-001, SR-002 | N/A | Fail (Design Impact) | AR-001, AR-002, AR-003 |
| ARCH-REV-002 | Round 2, SR-003 design revision, 2026-11-10 | SR-003 | Fail | Pass | AR-001, AR-002, AR-003 (resolved) |

## Revision Entries

### ARCH-REV-001 — Initial review of model-settings-reality SR-002

- Canonical design review report: `/home/autobyteus/workspace/.codex/worktrees/model-settings-reality/tickets/in-progress/model-settings-reality/design-review-report.md`
- Review round and trigger: round 1, Solution Designer handoff 2026-11-10 (`handoff.md`)
- Triggering role, report path, and finding IDs: Solution Designer; `design-spec.md`; N/A
- Relevant solution revision IDs: SR-001, SR-002
- Prior authoritative decision: N/A
- Current authoritative decision: `Fail` (Design Impact)
- What changed in the review result or what baseline was established: baseline. The behavior basis is confirmed. The spines, ownership, interfaces, persisted `llmConfig` decision and removals pass. The derived-consumer inventory for the new `model_list_unavailable` kind and the empty-list throw misses four consumers. One of them, the launch-usability fallback reason, writes a persisted, schema-validated vocabulary (AR-001). The DS-003 trace table is cited but missing (AR-002). FU-001 and the design disagree on the policy mode for Anthropic's "always on" models (AR-003).

#### Prior Finding Resolution

None.

- New or remaining finding IDs: AR-001 (blocking), AR-002 (low), AR-003 (low)
- Material classification changes: None (Large / High confirmed)
- Recommended recipient: Solution Designer
- Remaining risks or uncertainty: RSK-001, RSK-004; refresh cost on sequential picker opens; the `extra_params` container is kept at creation (R-3)

### ARCH-REV-002 — Focused re-review of SR-003

- Canonical design review report: `/home/autobyteus/workspace/.codex/worktrees/model-settings-reality/tickets/in-progress/model-settings-reality/design-review-report.md`
- Review round and trigger: round 2; Solution Designer SR-003 revision (`handoff.md`, section "SR-003 revision"), 2026-11-10
- Triggering role, report path, and finding IDs: Solution Designer; `design-spec.md` (SR-003); AR-001, AR-002, AR-003, R-3, R-4
- Relevant solution revision IDs: SR-003 (requirements unchanged at SR-002)
- Prior authoritative decision: Fail (Design Impact)
- Current authoritative decision: `Pass`
- What changed in the review result: re-checked the behavior basis (BEH-002, BEH-008, BEH-012) and each claimed update against the code. All findings are resolved. Implementation guidance IG-1..IG-3 was added.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-001 | Open (blocking) | Resolved | SR-003; design-spec Change Scope "Derived consumers" 1–5; DEC-D1 | The list covers launch-usability `reason` (kept as `model_unavailable` with the owner's `detail`; persisted vocabulary unchanged), `invalidModelMessage`, `refusalOf`, `runtimeCurrentModelDescriptors`, the application capability validator and the cache preloader, each with a decision and tests. Confirmed in code: no code branches on the stored reason (`rg model_settings_invalid`: type, list, mapping and schema `oneOf` only). The web renders recorded fallbacks from `detail` (`useRunMemberFacts.ts` L36, `ModelRoutingDecisions.vue` L243 with `runSettings.delegated.fallback`). |
| AR-002 | Open (low) | Resolved | design-spec "DS-003 creation trace" | Citations checked: `remote-delegation-receiver.ts` L98 → `prepareAgentRun` (`agent-run-service.ts` L265); GraphQL `prepareAgentRun` L237; `remote-team-run-starter.ts` L76; `createTeamRunFromRootConfig` → `createTeamRun` L185. The per-runtime key table matches the backends. |
| AR-003 | Open (low) | Resolved | design-spec policy rows; PRB-A3; FU-001 | One mode, `adaptive_required`, for Fable 5, Fable 5.1 and Opus 5.5. PRB-A3: explicit adaptive is accepted and `temperature` is rejected by the API on all three. FU-001 agrees. No production caller passes sampling kwargs, and stored `temperature` never reaches the Anthropic request (`buildRequestParams` L299-312), so this adds no failure for stored runs. |

- New or remaining finding IDs: None
- Material classification changes: None (Large / High)
- Recommended recipient: Implementation Engineer; Solution Designer informational
- Remaining risks or uncertainty: RSK-001, RSK-004; refresh cost on sequential picker opens (accepted)
