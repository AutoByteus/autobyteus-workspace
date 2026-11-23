# Implementation Revision Record

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | `/architecture_reviewer`, `design-review-report.md` (ARCH-REV-002, round 2) | `N/A` | `Initial Baseline` | `SR-006`, `ARCH-REV-002` | Implemented, self-validated, routed per `get_handoff_rules` |

## Revision Entries

### IR-001 — Model hand-over: the continuation decision replaces the runtime-only switch rule

- Triggering role, report path, and round: `/architecture_reviewer`, `design-review-report.md`, round 2 (`ARCH-REV-002`, `Pass`)
- Triggering finding IDs: `N/A` (initial implementation of a passed design)
- Classification: `Initial Baseline`
- Prior authoritative result: `N/A`
- Current authoritative result: implemented and self-validated; ready for its next route
- Related solution revision IDs: `SR-006`
- Related architecture-review revision IDs: `ARCH-REV-002`
- Related code-review revision IDs: `N/A`
- Related API/E2E revision IDs: `N/A`
- Related delivery revision IDs: `N/A`
- Why this baseline is recorded: first implementation round of the approved, architecture-reviewed design for autobyteus-53 (`stopped-run-unavailable-model`).
- Approved behavior or requirement IDs affected: REQ-001..REQ-008; BEH-001..BEH-006; DEC-005..DEC-009; AC-001..AC-010.
- Implementation delta:
  - `llm-management/domain/run-model-selection.ts`: new `RunContinuation`, `RunHandOver`; `handOver` added to both context types; `continuation` added to the valid result.
  - `llm-management/services/run-model-selection-service.ts`: new private `continuationFor` (the decision table) called from `validateWithEvidence`; `optionsWithEvidence` lists every offered native model unless `handOver === "unavailable"`.
  - `agent-execution/services/stopped-run-selection-context.ts`: `selectionContextFor` takes the reference model from the pending switch's `from` when one is pending (DEC-005), and a new `handOver` parameter.
  - `agent-execution/services/standalone-agent-run-eligibility.ts`: new `stoppedRunHandOver(metadata)`.
  - `agent-execution/services/standalone-stopped-run-selection-updater.ts`: passes `stoppedRunHandOver`; forwards `continuation` into the commit; new Save message branch for a same-runtime model hand-over.
  - `run-history/domain/runtime-selection-rule.ts`: `RuntimeSelection` gains `continuation` (required); `applyRuntimeSelection` rewritten to two branches (`same_session` / `hand_over`) driven by the stated continuation, replacing the runtime-equality inference; throws if a `same_session` selection names a runtime other than the session's.
  - `agent-team-execution/services/team-run-delegated-launch-plan.ts`, `team-run-selection-mutator.ts`: `handOver` passed by `scopeKind`; `continuation` carried next to the patch on the internal selection-target type (not the GraphQL-facing patch type).
  - `agent-org-execution/services/agent-org-run-manager.ts`, `agent-org-run-config-mutator.ts`, `agent-org-run-service.ts`: the same shape for Org saves, options, and the Org-create launch validator (`handOver: "no_session"`, AR-002).
  - `run-history/services/studio-run-model-config-service.ts`: options `handOver` for a standalone Agent (`stoppedRunHandOver`) and for Team scopes (by `scopeKind`).
  - `launch-preferences/launch-usability-check.ts`, `model-routing/model-routing-settings.ts`: `handOver: "no_session"` added to their validation contexts (AR-002).
  - `agent-execution/domain/runtime-switch.ts`: `buildRuntimeSwitchBetween`'s marker text reads "Model changed from … to …" only when the runtime is the same and the model differs (DEC-008); keeps today's text otherwise (N-4); `buildSessionRenewal` untouched.
  - `autobyteus-web/localization/messages/{en,zh-CN}/workspace.ts`: `nativeModelHelp` copy rewritten to state the rule truthfully (REQ-007).
  - `GLOSSARY.md`: "Agent runtime switch" updated to note the same-runtime case; new "Continuation" entry; "Pending agent runtime switch" reworded; "Switch marker" lists the third marker text.
  - Test files rewritten to the new rule (REQ-008) or extended with new cases: `tests/unit/llm-management/run-model-selection-service.test.ts`, `tests/unit/llm-management/on-demand-stored-model.test.ts`, `tests/unit/llm-management/services/run-model-selection-refusal.test.ts`, `tests/unit/run-history/domain/runtime-selection-rule.test.ts`, `tests/unit/run-history/services/agent-run-history-catalog-service.test.ts`, `tests/unit/run-history/services/agent-run-runtime-switch-commit.test.ts`, `tests/unit/agent-execution/standalone-stopped-run-selection-updater.test.ts`, `tests/unit/agent-execution/standalone-agent-run-lifecycle-service.test.ts`, `tests/unit/agent-execution/domain/runtime-switch-session-renewal.test.ts`, `tests/unit/agent-team-execution/team-run-model-selection-save.test.ts`, `tests/unit/agent-team-execution/team-run-selection-mutator.test.ts`, `tests/unit/agent-team-execution/team-run-selection-validation-context.test.ts`, `tests/unit/agent-org-execution/agent-org-run-service-model-selection.test.ts`, `tests/unit/model-routing/model-routing-settings.test.ts`, `tests/integration/agent-team-execution/agent-team-run-manager.integration.test.ts`, `tests/integration/agent-team-execution/team-agent-tools-mcp-lifecycle.integration.test.ts`.
- Local validation and result: see `implementation-handoff.md` → `Checks Run` (IMP-01..IMP-05), all `Pass`; evidence in `evidence/`.
- Next recipient or routing: `/code_reviewer` (`get_handoff_rules`: `architectural_risk=High` → independent source review).
- Remaining limitations or risks: the native→native path (AC-002) and the Team-member case (AC-008) are proven only by the planned built-server E2E (not run by this role); `requirements-doc.md`'s "baseline SR-005" editorial line is unchanged (Solution Designer's document).
