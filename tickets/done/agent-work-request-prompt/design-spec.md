# Design Spec — Agent Work Request Prompt

## Solution And Approval Basis

SR-002; requirements R2 Approved by the user’s explicit request to restore the original quoted paragraph. Status: Ready. Evidence: investigation-notes.md; no behavior-defining supplements.

## Current-State Read

Carpenter composes member-context-specific instructions. Existing collaboration contract explains routing but lacks concise receiver execution guidance. Tool descriptions reinforce ordinary/email communication. Native and shared runtimes already reuse these projections (E1–E4).

## Task Size And Architectural Risk (Mandatory)

task_size: Small. architectural_risk: Low. Three existing production wording files, focused tests/snapshot and documentation; no runtime owner, API shape, schema, persistence, security or concurrency change. Content changes affect model guidance but not transport enforcement. Escalate for any need to change routing, message schemas, lifecycle or provider-specific code.

## Architecture Investigation Evidence

E1 selects projections; E2/E3 establish common wording location/consumers; E4 establishes tool-description projection; E5 establishes exact-string and snapshot tests; E6 governs validation/doc sync. See canonical investigation-notes.md for paths and observations.

## Intended Change

Export a scope-neutral `WORK_REQUEST_EXECUTION_LLM_INSTRUCTION` string from existing agent-team-collaboration-llm-contract.ts. Insert once near the beginning of both collaboration sections, before tool mechanics, under `### Work Requests and Outcomes`. Keep the approved paragraph concise, using “only at a workflow-defined handoff point or when blocked and needing external input”. Do not add mandatory skill loading when none applies.
Rename `### Ordinary Communication` to `### Work Requests and Results`. Align the send_message_to description and its content field to self-contained work requests, results or blockers, removing conversational/email framing. Preserve all addressing/selector/instance semantics.
Align the Team rule paragraph’s ending: if no rule applies to an incoming work request, return the result or specific blocker to its requesting agent via send_message_to; otherwise finish normally. Preserve single-most-specific selection and no duplicate forwarding. Do not instruct standalone agents to call an unavailable get_handoff_rules tool. Do not convert informational notifications into assignments.

## Relevant Behavior And Production-Path Map (Mandatory)

BE-001/REQ-001/AC-001: configured Team/Org work -> DS-001 team branch. BE-002/REQ-002/AC-002: mention-derived collaborator work -> DS-001 standalone or team branch. BE-003/REQ-003/AC-003: stage outcome/blocker -> DS-002 existing delivery. BE-004/REQ-004/AC-004: aligned tool wording -> DS-001 tool projection; preserve notification handling. Scenario basis: SC-001–004 in requirements.

## Relevant Supplemental Task Artifacts

prior-investigation.md: historical evidence only; owned by Solution Designer; all REQ/AC context. Not a competing normative specification. Independent architecture/code review artifacts: N/A — not applicable to Small/Low direct route, subject to rule lookup.

## Task Design Health Assessment (Mandatory)

Posture: Behavior Change. Root cause: Missing Invariant in prompt guidance (incident causality unconfirmed). No structural refactor needed: the existing platform wording owner is appropriate. Reuse a single constant to prevent duplicated policy across two renderers. No deferred structural defect; model adherence remains nondeterministic.

## Terminology

Work request is assigned work, not every inter-agent notification. Handoff point is defined by the recipient’s instructions/skill and may be intermediate. Requester fallback applies to work received from another agent, not arbitrary user-facing messages.

## Design Reading Order

Requirements -> investigation -> intended change -> paths/ownership -> file map -> validation.

## Legacy Removal Policy (Mandatory)

Replace in-scope casual framing and contradictory no-rule ending directly; no compatibility wrapper or dual prompt mode. Preserve historical saved content without rewriting it.

## Persisted Data / State Transition Decision (Mandatory When Persisted Data May Be Affected)

Not Affected: only generated instruction strings/descriptions change. No stored schema/model/read/write change; no migration or saved-history rewrite.

## Data-Flow Spine Inventory

DS-001 Primary: request/activation -> runtime bootstrap -> Carpenter/description projection -> provider context -> recipient executes role. DS-002 Return: recipient reaches outcome/blocker -> existing rules when available or requester fallback -> send_message_to -> existing dispatcher -> addressed receiver.

## Primary Execution Spine(s)

DS-001: user/team work trigger -> member execution context -> backend bootstrap -> shared/native Carpenter renderer + tool-description projection -> model receives work-execution instruction. Existing scopes cover Org, Team, collaborator and task agents.

## Spine Narratives (Mandatory)

DS-001 supplies one shared concise behavioral rule through existing renderers; tool wording agrees. DS-002 remains the existing message-delivery path; only LLM routing guidance gains an explicit requester fallback for ad-hoc work. No new scheduler, gate or result state.

## Spine Actors / Main-Line Nodes

Existing runtime bootstrap selects context; Carpenter assembles instructions; canonical contract owns wording; provider receives strings; existing tool dispatcher delivers messages.

## Ownership Map

Platform collaboration domain owns common policy text. Standalone renderer owns projection, not another policy. Communication tool contract owns parameter descriptions. Individual agent/skill continues to define the work and valid handoff/approval points.

## Thin Entry Facades / Public Wrappers (If Applicable)

No new facade. Existing composeSharedCarpenterPrompt/composeNativeAutoByteusPrompt signatures and runtime callers remain unchanged.

## Removal / Decommission Plan (Mandatory)

Replace Ordinary Communication heading, ordinary/email tool framing and unconditional “If no rule applies, finish normally” instruction for agent-assigned work. No production files removed. Do not rename transport event terminology in unrelated code.

## Return Or Event Spine(s) (If Applicable)

DS-002 above; wire protocol, sender identity and requester run-ID delivery already exist and are unchanged.

## Bounded Local / Internal Spines (If Applicable)

N/A — no loop, state machine or dispatcher implementation changes.

## Off-Spine Concerns Around The Spine

Existing native Skills append, provider discovery, memory captures, tool schemas and message wrappers remain unchanged; none should become a second wording owner.

## Ownership Boundaries

Runtime callers continue using Carpenter; renderers consume the canonical text contract. No provider-specific injection or edits to individual skills/agent definitions.

## Boundary Encapsulation Map

Carpenter -> team renderer -> canonical collaboration contract; Carpenter -> standalone renderer -> same exported execution paragraph. Tool parameter schema -> existing send-message contract -> canonical tool description. No boundary bypass added.

## Dependency Rules

Standalone renderer may import the pure shared constant from agent-collaboration/domain. Shared contract must not import renderer, runtime or tool implementation. Preserve acyclic dependencies.

## Interface Boundary Mapping

Existing string exports/render functions only. Add one named constant, no new object shape, endpoint or selector.

## Interface Boundary Check

String constant has one semantic concern; existing address/run-ID selectors unchanged. No new ambiguity.

## Main Domain Subject Naming Check

`WORK_REQUEST_EXECUTION_LLM_INSTRUCTION` expresses the common behavior without implying all messages are assignments.

## Existing Capability / Subsystem Reuse Check

Extend existing canonical collaboration LLM contract; no new subsystem or generic prompt framework.

## Subsystem / Capability-Area Allocation

agent-collaboration/domain: shared text; agent-run-collaboration/prompt: standalone projection; agent-communication/services: tool content wording; existing tests/docs: contract verification.

## Draft File Responsibility Mapping

Three existing source files suffice; a new shared module is unnecessary because the existing LLM contract already owns collaboration and tool wording.

## Reusable Owned Structures Check

One shared execution paragraph consumed by Team and standalone renderers. No duplicate paragraph or scope-dependent data object.

## Shared Structure / Data Model Tightness Check

One constant, one concern; no schema fields or parallel representations.

## Final File Responsibility Mapping

Modify autobyteus-server-ts/src/agent-collaboration/domain/agent-team-collaboration-llm-contract.ts: canonical constant, Team projection, heading, tool wording and no-rule ending.
Modify autobyteus-server-ts/src/agent-run-collaboration/prompt/standalone-collaboration-instruction.ts: import/project same constant once.
Modify autobyteus-server-ts/src/agent-communication/services/send-message-to-tool-contract.ts: concise work/result/blocker content description.
Modify focused tests and standalone snapshot, plus docs/modules/prompt_engineering.md example. Update other exact wording expectations only when directly affected.

## Applied Patterns (If Any)

Reuse pure string composition, not a new abstraction.

## Target Subsystem / Folder / File Mapping

Final file map above; no folder additions, moves or transport edits.

## Folder Boundary Check

Existing concern-specific folders remain appropriate; a three-file local content update is clearer than a new prompt layer.

## Concrete Examples / Shape Guidance (Mandatory When Needed)

Good: read own applicable skill, do work, return evidence-backed result or concrete blocker. Bad: send “Received, I will start” and end. Internal skill-defined bootstrap handoff is valid; suppressing it until the whole project ends is not.

## Backward-Compatibility Rejection Log (Mandatory)

No old/new prompt switch or duplicate legacy heading; replace generated wording and update tests. Saved history is not an active compatibility branch and stays untouched.

## Derived Layering (If Useful)

N/A — established renderer -> domain-text projection remains.

## Change / Refactor Sequence

1 Add shared paragraph and wire both renderers. 2 Align tool wording/Team fallback. 3 Update exact hashes/snapshot and add semantic assertions. 4 Sync documented example. 5 Run focused tests, inspect complete rendered prompts and hand off validation.

## Key Tradeoffs

Prompt-only scope is small and cross-runtime; it is not an enforced state machine. Concise common wording avoids repeating skill-specific workflow details.

## Risks

Model may still fail to execute. Text tests prove supplied guidance, not live compliance. No failed Product run was provided. Existing live sessions may retain previous instructions until normal bootstrap/resume supplies them. Do not promise retroactive refresh.

## Guidance For Implementation

Run focused Vitest tests for agent-team-collaboration-llm-contract, carpenter-prompt-composer and send-message-to tool projection (vitest run --no-watch). Assert canonical paragraph exactly once in shared/native Team and standalone contexts; include a collaborator Team/Org context representative, preserve no-member-context behavior, absence of get_handoff_rules in standalone, and unchanged selectors/delegation. Assert meaningful wording, not only changed hashes. Update hash/snapshot expectations deliberately. Existing scope tests establish Team/Org ownership; do not alter scopes.
API/E2E owner should verify actual supplied prompt and exposed tool schema through a deterministic runtime boundary. Any claim of corrected live model behavior requires a bounded isolated-provider probe under TESTING.md (preflight first); otherwise report that behavior unverified, not passed. No desktop UI changes warrant a UI redesign or Product work.
Keep all updates in this worktree. Implementation owns code/tests; API/E2E owns executable validation; Delivery owns docs finalization, explicit user verification and applicable integration/cleanup. No release requested.

## SR-002 exact-text correction
At candidate 18c795d2bb309d56a4874c29969901d93a1d1e81, replace only the third sentence of WORK_REQUEST_EXECUTION_LLM_INSTRUCTION with the approved R2 sentence. Both renderers already import the constant, so no duplicate code edits are needed. Update exact paragraph/hash assertions, standalone snapshot and documented sample; preserve existing uncommitted documentation additions. Re-run focused contract/composer tests and relevant bootstrap coverage affected by text pins. Prior validation covers R1, not this new literal. Classification remains Small/Low: one source string and directly affected expectations/documentation, no structural or routing change.

Exact resulting paragraph:

On receiving a work request, follow your own agent instructions and applicable skills. Do not send acknowledgements or promises to work. Use `send_message_to` only at a workflow-defined handoff point or when blocked and needing external input. Follow applicable handoff rules; otherwise, return the result or specific blocker to the requesting agent.
