# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Design-ready — user approved moving this small follow-up ticket directly into design after investigation. The core self-evolver `send_message_to(target_agent_run_id=...)` architecture is already merged to `origin/personal`; this ticket only corrects the target-facing self-evolver message contract.

## Goal / Problem Statement

The Skill Self-Evolver currently uses `send_message_to` with `message_type: "self_evolution_outcome"` when reporting back to the target agent run. That label is producer/workflow-oriented. From the target agent's perspective, the meaningful event is that its durable skill package guidance has been updated and should be used/reloaded going forward.

Change the self-evolver's target-facing direct message type to a clear target-oriented skill update contract, keep the existing global direct-run `send_message_to` flow, and tighten prompt guidance so `reference_files` are selected dynamically from the actual changed/relevant skill package files.

## Investigation Findings

Latest `origin/personal` at `a267513eaff06e7d40a373472f74b214d4d997cb` already implements the larger architecture:

- `send_message_to` accepts exactly one selector: `recipient_name` for team-local roster delivery or `target_agent_run_id` for global exact active-run delivery.
- `GlobalAgentRunMessageRouter` delivers `target_agent_run_id` messages to active `AgentRun` instances and emits a direct `INTER_AGENT_MESSAGE` event after accepted runtime input.
- `DirectAgentRunMessageGrantRegistry` can restrict target run ids, allowed message types, reference roots/files, max accepted deliveries, and expiry.
- Built-in `Skill Self-Evolver` includes `run_bash` and `send_message_to`.
- `SingleAgentEvolverStrategy` registers a one-use direct-message grant, launches the visible helper, gives it editable skill root directories and anonymized work-history evidence, and records delivery outcome from grant usage.
- Current prompt and grant still hard-code `self_evolution_outcome`; that is the target-facing semantic mismatch to fix.
- Current prompt allows supporting files inside skill roots to be edited; therefore final `reference_files` must not be fixed to `SKILL.md` and must be selected from actual edits/relevance inside editable roots.

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Behavior Change / Contract Cleanup.
- Initial design issue signal (`Yes`/`No`/`Unclear`): Yes, small semantic contract drift.
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Shared Structure Looseness / Naming Drift in a shared message-type string.
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Targeted cleanup needed; no broad architecture refactor.
- Evidence basis: Current code paths are healthy, but `self_evolution_outcome` appears in the helper prompt, grant, metadata, tests, and docs as a target-facing message type.
- Requirement or scope impact: Replace the target-facing message type with `skill_update`, update prompt/content guidance, and update tests/docs. Keep the existing send-message router and grant model.

## Recommendations

1. Use `message_type: "skill_update"` for the direct message delivered to the target agent run.
2. Optionally rename the internal grant purpose to `self_evolution_skill_update` for traceability, but do not expose `self_evolution_outcome` as the target-facing message type.
3. Instruct the self-evolver to send the target message only when durable files inside editable skill roots were meaningfully changed.
4. Keep `reference_files` dynamic: include changed or directly relevant files inside editable skill roots, including supporting files created/updated/reorganized by the self-evolver; do not hard-code only `SKILL.md`.
5. Do not add new notification machinery. Continue using the existing global direct-run `send_message_to` route and direct-message grant validation.

## Scope Classification (`Small`/`Medium`/`Large`)

Small.

## In-Scope Use Cases

- UC-001: User starts self-improvement for an eligible active target run; the self-evolver changes durable skill package files and sends a `skill_update` message to the target run.
- UC-002: The self-evolver determines no durable skill file change is warranted; it makes no target direct message and the record can show send-message not attempted.
- UC-003: The self-evolver updates supporting files inside a skill package, not only `SKILL.md`; its `reference_files` identify the changed/relevant surviving files inside editable roots.
- UC-004: The self-evolver attempts an invalid message type, extra message, wrong target, or outside-root reference; the grant/router rejects it.
- UC-005: Docs and tests reflect `skill_update` as the target-facing message type and no longer teach `self_evolution_outcome` as the direct message contract.

## Out of Scope

- Rebuilding `send_message_to` global routing.
- Adding inactive-run delivery queues or lazy-start target delivery.
- Adding new UI notification surfaces.
- Renaming `SelfEvolutionRunRecord.notificationSummary` or its transport-oriented statuses.
- Adding automatic skill reload mechanics beyond the delivered model-visible message.
- Changing run eligibility, configuration, or trigger strategy behavior.

## Functional Requirements

- REQ-001: The self-evolver target-facing direct message type MUST be `skill_update` instead of `self_evolution_outcome`.
- REQ-002: `SingleAgentEvolverStrategy` MUST grant at most one accepted direct message to the original target run using allowed message type `skill_update` and editable skill roots as allowed reference roots.
- REQ-003: The self-evolver task prompt and built-in helper instructions MUST tell the helper to call `send_message_to` with the supplied `target_agent_run_id` and `message_type: "skill_update"` only after meaningful durable skill package file changes.
- REQ-004: If no durable skill package file change is made, the helper MUST NOT send a target `skill_update` message. Its own final response may explain the no-op; the record may still capture not-attempted delivery status.
- REQ-005: The helper prompt MUST describe dynamic `reference_files`: choose absolute paths for changed or directly relevant surviving files inside editable skill roots; include `SKILL.md` only when changed or useful as the entry point; describe deleted files in content instead of referencing unavailable deleted files.
- REQ-006: The helper message content guidance MUST require a concise target-facing explanation of what changed, why it matters, and how the target should use/reload the updated skill guidance, without leaking raw trace details, secrets, personal data, or transient task specifics.
- REQ-007: Runtime delivery MUST continue through the existing `send_message_to(target_agent_run_id=...)` dispatcher/router path and direct-message grant validation; no new notification service or duplicate system notification is introduced.
- REQ-008: Tests and documentation MUST be updated so `skill_update` is the documented target-facing direct message type and stale `self_evolution_outcome` direct-message instructions are removed.

## Acceptance Criteria

- AC-001: Static search of production source/docs/tests shows no remaining `self_evolution_outcome` target-facing prompt, grant-allowed message type, or documentation of the direct message contract.
- AC-002: Strategy tests verify the helper task prompt and metadata expose `skill_update` as the target message type and no longer expose `self_evolution_outcome` as the target message type.
- AC-003: Grant/router tests verify a self-evolver-style grant accepts `skill_update` and rejects an unallowed message type.
- AC-004: Prompt/instruction tests or snapshots verify dynamic `reference_files` guidance includes supporting files inside skill roots and is not hard-coded to only `SKILL.md`.
- AC-005: Existing self-evolution service integration tests continue to pass with delivery summaries based on grant usage.
- AC-006: Documentation for self-evolution and agent communication describes `skill_update` and the dynamic reference-file selection behavior.

## Constraints / Dependencies

- Base branch: `origin/personal` at `a267513eaff06e7d40a373472f74b214d4d997cb`.
- The direct route remains live-only; inactive target run ids are rejected.
- The self-evolver may edit any file inside listed editable skill roots, subject to prompt/tool limits, not only `SKILL.md`.
- `reference_files` must remain inside editable skill roots because the grant validates reference roots.
- No backward-compatibility dual message-type behavior should be kept for this in-scope target-facing contract.

## Assumptions

- `skill_update` is the desired final exact string unless the user gives a different final label before implementation starts.
- The target agent can use a model-visible direct inter-agent message as the practical reload/use-updated-guidance signal.
- Existing record field names can remain because this ticket is about the delivered message contract, not record schema cleanup.

## Risks / Open Questions

- OQ-001: If the user later wants automatic runtime skill reload instead of model-visible instruction, that is a separate larger feature.
- OQ-002: If deleted files need artifact-style references, that would require a separate reference model; MVP should mention deletion in content and reference surviving relevant files.

## Requirement-To-Use-Case Coverage

| Requirement | Covered Use Cases |
| --- | --- |
| REQ-001 | UC-001, UC-005 |
| REQ-002 | UC-001, UC-004 |
| REQ-003 | UC-001 |
| REQ-004 | UC-002 |
| REQ-005 | UC-003 |
| REQ-006 | UC-001, UC-003 |
| REQ-007 | UC-001, UC-004 |
| REQ-008 | UC-005 |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance Criterion | Scenario Intent |
| --- | --- |
| AC-001 | Prevents stale target-facing contract references. |
| AC-002 | Verifies the self-evolver receives the corrected message type. |
| AC-003 | Verifies the grant boundary enforces the corrected contract. |
| AC-004 | Verifies reference-file guidance matches whole skill-package editing. |
| AC-005 | Protects existing service lifecycle behavior. |
| AC-006 | Keeps downstream and user-facing documentation aligned. |

## Approval Status

Approved by user to proceed to design and architecture review for this small ticket.
