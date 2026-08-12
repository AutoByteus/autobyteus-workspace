# Solution Revision Record

The latest requirements, investigation notes, design spec, and supplements remain authoritative. This record is only the durable round index.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Result |
| --- | --- | --- | --- | --- |
| `SR-001` | Solution Designer / initial approved solution / round 1 | N/A | `Initial Baseline` | Ready for architecture review |
| `SR-002` | Architecture Reviewer / `design-review-report.md` / round 1 | `AR-001`, `AR-002`, `AR-003` | `Design Impact` | Ready for architecture re-review |
| `SR-003` | User clarification + Architecture Reviewer / `design-review-report.md` / round 2 | `AR-001` (`MP-003`) | `Requirement Clarification` + `Design Impact` | Ready for architecture re-review |
| `SR-004` | Code Reviewer / `code-review-report.md` / round 1 | `CR-001`, `CR-002`, `CR-MP-001` | `Design Impact` + `Local Fix` | Ready for architecture re-review |

## Revision Entries

### SR-001 — Approved carpenter-model baseline

- Triggering role, report path, and round: Solution Designer; initial solution package; round 1.
- Triggering finding IDs: N/A.
- Prior authoritative result: `N/A`.
- Current authoritative result: Approved requirements basis and complete implementation-ready design, ready for architecture review.
- Why this baseline is recorded: Establish the first reviewable solution after the user approved the complete requirements and intended-behavior supplements on 2026-08-12.
- Resolution: Define one shared carpenter prompt, exact section text/order/bindings, closed Team Runtime behavior, provider-specific high-authority projection, one ordinary lazy-skill model, terminal native Skills catalog, and clean removal of the fragmented/optional prompt-composition paths.
- Approved behavior or requirement IDs affected: `BEH-001`–`BEH-012`; `R-001`–`R-014`; `AC-001`–`AC-014`.
- Canonical artifacts and sections updated: `requirements.md` marked Refined/approved; `investigation-notes.md` completed; `design-spec.md` created; all intended-behavior supplements marked approved and design decisions resolved.
- Supplemental artifacts updated, added, or removed: existing prompt specifications and the Classroom Simulation fixture retained; no supplement removed.
- Downstream and architecture-review impact: Architecture reviewer can assess exact prompt behavior, shared ownership, provider projections, removal scope, no-migration decision, and implementation sequence without inventing wording or bindings.
- Next recipient or routing: `architecture_reviewer`.
- Remaining gaps or risks: no blocking gap; external source-package cleanup and authored-body normalization are explicit follow-ups, and provider/session cleanup plus Claude resume semantics require review attention.

### SR-002 — Close Codex lease and native final-payload ownership gaps

- Triggering role, report path, and round: Architecture Reviewer; `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/carpenter-model/design-review-report.md`; round 1 (`ARCH-REV-001`).
- Triggering finding IDs: `AR-001`, `AR-002`, `AR-003`.
- Prior authoritative result: `Fail — Design Impact`.
- Current authoritative result: Revised solution package ready for architecture re-review; approved requirements remain unchanged.
- Why this revision is recorded: Supported Codex create/restore paths can fail after creating a capability-bearing MCP session, and native terminal Skills can append dynamic text after the shared composer's placeholder check. Two supplements also retained stale wording.
- Resolution: Assign the exact Codex `sessionId` to `CodexAgentRunContext` and its cleanup target; make idempotent `CodexThreadCleanup` the singular revoke mechanism across bootstrap-before-context failure, factory create/restore failure, and normal/unexpected close, with global per-run revoke retained only as a backstop. Assign the actual final native prompt invariant to `SystemPromptProcessingStep` after terminal Skills and before state/LLM mutation, with focused placeholder-shaped skill metadata coverage. Correct the Bash/File ownership row and mark authored-body editorial normalization as the already-approved external follow-up.
- Approved behavior or requirement IDs affected: `BEH-002`–`BEH-004`, `BEH-006`, `BEH-009`–`BEH-012`; `R-004`, `R-005`, `R-011`, `R-012`, `R-014`; `AC-004`, `AC-005`, `AC-011`, `AC-012`, `AC-014`. No behavior intent changed.
- Canonical artifacts and sections updated: `design-spec.md` spines/owners/boundaries/interfaces/file mapping/sequence/examples/risks/implementation guidance; `investigation-notes.md` evidence and findings; `prompt-value-binding-spec.md` actual final-payload ownership; `system-prompt-contract.md` representation contract; this revision record.
- Supplemental artifacts updated, added, or removed: corrected `system-skill-decision.md` and `classroom-simulation-composed-system-prompt.md`; no supplement added or removed.
- Downstream and architecture-review impact: Implementation now has exact native and Codex file ownership, lifecycle exits, failure behavior, and focused coverage scenarios; no invention or requirement reapproval is needed.
- Next recipient or routing: `architecture_reviewer` with the complete package plus `ARCH-REV-001` artifacts.
- Remaining gaps or risks: no blocking design gap known. Claude create/resume symmetry and fence-aware heading behavior remain downstream verification risks already covered by the design; external source-package cleanup remains out of scope.

### SR-003 — Make team tools automatic and remove prompt-to-MCP coupling

- Triggering role, report path, and round: User clarification after Architecture Reviewer round 2; `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/carpenter-model/design-review-report.md`; `ARCH-REV-002`.
- Triggering finding IDs: remaining `AR-001`, specifically `MP-003`.
- Prior authoritative result: `Fail — Design Impact`.
- Current authoritative result: User-approved clarified requirements and revised design ready for architecture re-review.
- Why this revision is recorded: The user clarified that tool definitions remain provider-native/out of band, Team Runtime names are fixed protocol prose, and every valid team member must automatically receive `send_message_to` and `delegate_task` even when its agent configuration omits them. Therefore prompt composition does not need an MCP descriptor.
- Resolution: Replace the configured-only exposure shape with a truthfully named shared runtime-tool exposure boundary. When `MemberTeamContext` exists, add the exact two automatic team tools, deduplicate them with configured names, and preserve standalone exposure. Make `CarpenterPromptComposer` and `TeamRuntimeInstructionRenderer` consume no tool-name/descriptor input. Keep native schemas and existing Codex/Claude MCP transport, session creation, client reference counting, and cleanup unchanged. Retain the resolved native post-Skills invariant and prior supplement corrections.
- Approved behavior or requirement IDs affected: `BEH-003`, `BEH-004`, `BEH-011`, `BEH-012`; `R-003`, `R-004`, `R-013`, `R-014`; `AC-003`, `AC-004`, `AC-013`, `AC-014`; added `UC-010`.
- Canonical artifacts and sections updated: `requirements.md` current/desired behavior, use case, requirements, criteria, and scenario mappings; `investigation-notes.md` latest-base/tool-path evidence and findings 43–45; `design-spec.md` intended change, spines, owners, interfaces, exact files, sequence, examples, risks, and implementation guidance; this revision record.
- Supplemental artifacts updated, added, or removed: `team-and-runtime-prompt-spec.md`, `prompt-value-binding-spec.md`, `system-prompt-contract.md`, and the Classroom Simulation fixture now express fixed team protocol plus independent automatic provider-tool provisioning; no artifact added or removed.
- Downstream and architecture-review impact: The carpenter implementation no longer touches Codex/Claude MCP resource lifecycle. Implementation owns one small shared automatic-tool union plus provider-boundary verification, while prompt composition remains provider-transport-independent.
- Next recipient or routing: `architecture_reviewer` with the complete package and both prior review records.
- Remaining gaps or risks: no blocking design gap known. Provider adapters must all consume the shared exposure resolver, and task-result submission/review tools remain owned by existing task-execution lifecycle packets rather than the fixed carpenter Team Runtime.

### SR-004 — Close the core native prompt mutation boundary and correct fence containment

- Triggering role, report path, and round: Code Reviewer; `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/carpenter-model/code-review-report.md`; source review round 1 (`CRR-001`).
- Triggering finding IDs: `CR-001`, `CR-002`, and reachability premise `CR-MP-001`.
- Prior authoritative result: `Fail — Design Impact`.
- Current authoritative result: Revised solution package ready for architecture re-review; approved requirements and intended behavior remain unchanged.
- Why this revision is recorded: The reviewed complete-removal inventory stopped at server/API/UI configuration and omitted the public core `AgentConfig` processor list/default/copy path, generic `SystemPromptPipeline`, processor definition/registry/registration APIs, and package exports. Review also reproduced a reachable same-marker fence-like content line that incorrectly closed a fence and exposed a later code heading to rewriting.
- Resolution: Remove the generic prompt-processor concept across the remaining core source and public barrels. `AgentConfig` carries no prompt-mutator objects. `SystemPromptProcessingStep` directly invokes one focused platform-owned `appendConfiguredSkillsCatalog`, validates the complete result, then mutates state/configures the LLM. Delete the processor base/definition/registry/default singleton/registration/generic pipeline and obsolete tests without compatibility aliases. Replace the containment helper's shared prefix match with distinct opening and closing rules; an active fence closes only on the same marker, sufficient length, and trailing whitespace only. Require a real configured-skill final-payload test and focused backtick/tilde/non-close/overflow containment cases.
- Approved behavior or requirement IDs affected: `BEH-002`, `BEH-008`, `BEH-012`; `R-010`, `R-014`; `AC-010`, `AC-014`. Behavior intent did not change.
- Canonical artifacts and sections updated: `investigation-notes.md` source/reproduction evidence and findings 46–48; `design-spec.md` current state, behavior map, spines, ownership, complete removal inventory, interfaces, exact files, sequence, risks, and guidance; `prompt-value-binding-spec.md` fence-closing and native final-payload contracts; `system-prompt-contract.md` explicit core clean cut; this revision record.
- Supplemental artifacts updated, added, or removed: no artifact added or removed. Exact prompt wording is unchanged.
- Downstream and architecture-review impact: Architecture review must validate the newly complete core removal boundary. After pass, implementation must revise `IR-001`, then return to source review; API/E2E remains blocked.
- Next recipient or routing: `architecture_reviewer` with the complete package plus implementation and code-review artifacts.
- Remaining gaps or risks: no requirement ambiguity. Positional `AgentConfig` callers require atomic signature updates, current docs describing the generic pipeline must be updated, and implementation must prove no retired names remain in current source/public barrels/active tests or durable current documentation.
