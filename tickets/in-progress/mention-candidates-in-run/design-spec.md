# Design Spec — mention-candidates-in-run

## Solution And Approval Basis
- Current solution revision ID: `SR-001`
- Approved requirements: SR-001 (REQ-001..006, AC-001..008), user approval 2026-10-06
- Supplements: None
- Design status: `Ready`
- Investigation notes: `.../tickets/in-progress/mention-candidates-in-run/investigation-notes.md` (E-01..E-06)
- Authorities read: skill `references/architecture-design.md`, `design-principles.md`; repo `DESIGN.md`; data_migration_guideline §2 (no persisted transformation)
- Conflicts/discrepancies: None

## Current-State Read
- `CollaboratorCandidatePolicy` (`server src/agent-collaboration/collaborators/collaborator-candidate-policy.ts`) is the single owner of `@` eligibility. `listCandidates` (137-145) skips every in-run definition. `requireAdmissible` (159-178) rejects in-run definitions unless they have a collaborator entry. It is used by **both** `CollaboratorAdmission.resolveMentions` (`@`) and `CollaboratorAdmission.ensure`/`plan` (agent-initiated bring-in).
- `resolveMentions` already resolves the in-run address (collaborator entry, else `CatalogAddressMap.addressFor`, which returns the preferred in-run placement address).
- Note wording/parse: `autobyteus-agent-presentation-contracts/src/collaborator-mention-note.ts` (`MentionedCollaborator {name, kind, address}`, `ENTRY_PATTERN`, one `NOTE_GUIDANCE`, `SAVED_NOTE_GUIDANCES`).
- Web: `utils/collaborators/draftMentionEligibility.ts` mirrors the policy for New chat (excludes target + Team placements); copy in `localization/messages/{en,zh-CN}/chat.ts`.

## Task Size And Architectural Risk (Mandatory)
- Task size: `Medium` — about 6 production files across server policy/admission, the presentation contract, the web draft mirror and the localization files, plus docs and tests. All within existing owners.
- Architectural risk: `Low` — no new owner, persistence, API shape, concurrency or security change. The agent-visible note gains an optional suffix and an extra guidance sentence, and the tolerant parser accepts all forms. The bring-in invariant is kept by splitting the policy check (below).
- Escalation trigger: any additional caller of `requireAdmissible`, or a web consumer that relies on candidates excluding in-run definitions, means a Design Impact.

## Intended Change (spine-first)
DS-001 (`@` send, unchanged spine): `Composer → stream handler / AgentRunCommandCoordinator → Root.resolveCollaboratorMentions → CollaboratorAdmission.resolveMentions → composeCollaboratorMentionNote → focused agent`.
DS-002 (candidates): `Web @ menu → GraphQL collaboratorMentionCandidates → CollaboratorCandidatePolicy.listCandidates`.

1. **Policy split (one owner, two explicit checks).**
   - `requireEligible(port, mention)`: application-root check plus shared/not-built-in/exists. The run's own definition is ineligible. Used by `resolveMentions`.
   - `requireAdmissible(port, mention)` = `requireEligible` + the existing "already in this run unless it has a collaborator entry" rejection. Used only by `ensure`/`plan` (bring-in). This preserves BEH-006 without relying on `catalogDefinitionAt` alone.
   - `listCandidates`: drop the `inRun` filter; exclude only the run's own definition (via `port.rootDefinition()`), keeping the eligibility filters.
2. **Resolution reports in-run.** `resolveMentions` returns `MentionedCollaborator` with `inRun: boolean`. It is true when the definition has a collaborator entry or appears in `port.inRunPlacementsByDefinition()`.
3. **Note contract.**
   - `MentionedCollaborator` gains required `inRun: boolean`.
   - The entry line is unchanged for `inRun: false`. For `inRun: true` it gets a `, already in this run` suffix.
   - The guidance is the current `NOTE_GUIDANCE` when no entry is in the run. When any entry is in the run, it is `NOTE_GUIDANCE` + " " + `IN_RUN_GUIDANCE`. `IN_RUN_GUIDANCE` = "One already in this run can instead be messaged directly with send_message_to at its address, or use delegate_task for a separate copy."
   - The parser accepts both guidance forms plus the saved ones, and `ENTRY_PATTERN` accepts the optional suffix (parsed `inRun`; saved notes parse as `false`).
4. **Web draft mirror.** `draftInRunDefinitionIds` → `draftOwnDefinitionIds` (the target's own definition only). Remove the Team-placement exclusion and update the doc comment.
5. **Copy (en / zh-CN).**
   - `chat.mentions.headerPrefix`: "Delegate to an agent or team" / "委派给智能体或团队"
   - `chat.mentions.listAria`: "Agents and teams you can mention" / "可提及的智能体和团队"
   - `chat.mentions.footerRelay`: "{{agent}} gets your message and delegates the work" / "{{agent}} 会收到你的消息并委派这项工作"
   - `chat.new.subtitleDefaultAfterAt`: "to delegate to an agent or team." / "将工作委派给智能体或团队。"
   - `chat.mentions.noticeFailed` / `noticeFailedDetail`: "Couldn't mention {{name}}" / "{{reason}}" and zh "无法提及 {{name}}" / "{{reason}}", since nothing is "added" any more.

## Example
```
please ask @Agent Package Creator to review the package

[Mentioned collaborators]
- Agent Package Creator (Agent) at /agent_package_creator, already in this run
Delegate the work with delegate_task to its address; it returns a run ID to follow up with. If it also returns a task_id, call create_or_update_task with that task_id and status DONE when the work is finished; this stops it and removes it from the run. One already in this run can instead be messaged directly with send_message_to at its address, or use delegate_task for a separate copy.
```

## Task Design Health Assessment (Mandatory)
- Change posture: `Bug Fix` (behavior gap left by mention-delegation-dismissal)
- Design issue: `Yes`. Root cause `Missing Invariant`: one shared check served two purposes ("may be mentioned" and "may be admitted"). After `@` stopped admitting, the admission rule still governed mentions.
- Refactor needed now: `Yes` (bounded): split `requireEligible` / `requireAdmissible` inside the same policy owner.
- Deferral/residual: candidates stay per run, so a focused member may see its own definition. Mentioning itself is harmless; the agent recognizes its own address, and self-delegation is rejected.

## Persisted Data Decision
- Saved messages with notes: `Directly Usable — No Migration`. The parser recognizes every earlier guidance form, and the entry pattern suffix is optional.

## Removal / Decommission Plan
- Remove the in-run filter from `listCandidates` and the in-run rejection from the `@` path (it stays only inside `requireAdmissible` for bring-in).
- Remove the Team-placement exclusion from `draftMentionEligibility.ts`.
- Update tests that assert "already in this run" rejection for `@`, or in-run exclusion from candidates or draft candidates.

## Dependency Rules / Boundaries
Unchanged. Stream handlers → roots → `CollaboratorAdmission` → policy. Web → GraphQL only. The contracts package is the single owner of note wording.

## Final File Responsibility Mapping
| Change | File | Responsibility |
| --- | --- | --- |
| Modify | `autobyteus-server-ts/src/agent-collaboration/collaborators/collaborator-candidate-policy.ts` | `requireEligible`; `requireAdmissible` = eligible + in-run rule; `listCandidates` without in-run filter |
| Modify | `autobyteus-server-ts/src/agent-collaboration/collaborators/collaborator-admission.ts` | `resolveMentions` uses `requireEligible`, sets `inRun`; `ensure`/`plan` keep `requireAdmissible` |
| Modify | `autobyteus-agent-presentation-contracts/src/collaborator-mention-note.ts` | `inRun` field, suffix, conditional guidance, parser |
| Modify | `autobyteus-web/utils/collaborators/draftMentionEligibility.ts` | own-definition-only exclusion |
| Modify | `autobyteus-web/localization/messages/{en,zh-CN}/chat.ts` | copy |
| Modify (docs) | `autobyteus-server-ts/docs/modules/agent_communication.md` (Collaborators: Candidates, In the run, `@` resolution), `autobyteus-web/docs/chat.md` (`@` In A Live Run, New Chat Draft) | behavior sync |

## Backward-Compatibility Rejection Log
No flag or dual candidate list. The tolerant parsing of saved notes is display of stored history, not a runtime fallback.

## Change Sequence
1. Contracts (type, compose, parse, tests: AC-004, AC-005).
2. Server policy split + `resolveMentions` (AC-001..003, AC-006).
3. Web draft mirror + copy (AC-007, AC-008).
4. Docs.

## Risks
- Agents may message an in-run instance where the user wanted a copy, or the reverse. This is the user's chosen neutral wording, and the user's text decides.
