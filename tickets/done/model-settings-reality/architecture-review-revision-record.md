# Architecture Review Revision Record

## Revision Index

| Revision ID | Review Round / Trigger | Related Solution Revision IDs | Prior Decision | Current Decision | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| ARCH-REV-001 | Round 1, Architecture Design Complete (Large / High), 2026-11-10 | SR-001, SR-002 | N/A | Fail (Design Impact) | AR-001, AR-002, AR-003 |
| ARCH-REV-002 | Round 2, SR-003 design revision, 2026-11-10 | SR-003 | Fail | Pass | AR-001, AR-002, AR-003 (resolved) |
| ARCH-REV-003 | Round 3, SR-004 design revision after code review CR-004 (API-14), 2026-11-10 | SR-004 | Pass | Pass | None (CR-004 is a code-review finding; verified) |

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

### ARCH-REV-003 — Re-review of SR-004 (saved-run options state a failed model-list read)

- Canonical design review report: `/home/autobyteus/workspace/.codex/worktrees/model-settings-reality/tickets/in-progress/model-settings-reality/design-review-report.md`
- Review round and trigger: round 3; Solution Designer SR-004 (`handoff.md`, section "SR-004 revision"), after code review CRR-003 / CR-004, the failure origin of API-14
- Triggering role, report path, and finding IDs: code reviewer, `code-review-report.md`, CR-004; Solution Designer, `design-spec.md` (SR-004)
- Relevant solution revision IDs: SR-004
- Prior authoritative decision: Pass (ARCH-REV-002)
- Current authoritative decision: `Pass`
- What changed: the SR-003 consumer decision for `listOptions*` is replaced by an explicit `RunModelOptions.modelListReadable`, worded by the owner, with one shared read-failure classification. The dead `supportedRuntime` gate is removed. The web merges options per row on reload and reports failure, so the menu shows an error with Retry, and "No longer offered" appears only for a readable answer. Guidance IG-4 is added.
- Reviewer gap acknowledged: ARCH-REV-002 accepted "`listOptions*` → existing catch" without tracing the DS-005 reload consumer that was introduced in the same design. Re-reviews of a changed consumer decision now trace every consumer of that answer, not only the one that triggered the change.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| CR-004 (code review) | Open (Design Impact) | Resolved in design | SR-004; design-spec Change Scope consumer 2, DS-005 narrative, Interface rows `reloadModelOptions`/`RunModelOptions`, file mapping | Server options callers (`studio-run-model-config-service.ts` L67/L81, `agent-org-run-service.ts` L78, `delegated-launch-selection-command.ts` L241) spread the answer. The web stores hold per-key `ExistingRunModelOptionsState`, which supports the per-row merge. Editor `modelUnavailable` requires `ready` (L442-452). Gate deadness: `RuntimeKind` enum plus enum checks on stored-run reads. |

- New or remaining finding IDs: None
- Material classification changes: None (Large / High)
- Recommended recipient: Implementation Engineer; Solution Designer informational
- Remaining risks or uncertainty: RSK-001, RSK-004; one CLI read per menu opening (accepted); real-app locked-menu journeys rest on the API/E2E rerun (API-14, API-11, API-12, API-15)
