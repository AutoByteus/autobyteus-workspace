# Solution Handoff — `active-run-skill-update-notice`

- Result: **Architecture Design Complete** (SR-002), `task_size=Large`, `architectural_risk=High`.
- Origin: Project Task `project_task_0e330de1-0508-4424-8a6a-01e92f529312` from `/project_task_manager` (AgentRun `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), 2026-10-13. Follow-up to `agent-package-auto-refresh` (merged `b57d85ad9`).

## Request summary

When a skill used by active runs changes (the Agent Package Creator's PR merged, checkout updated), each affected run gets one short platform notice naming the skill, its changed files and the path to re-read, so the agent re-reads it.
- **User clarification:** deliver it the way agent messages are delivered today, mid-turn included; reuse that path; one notice per run per change; marked as a system notice; all runtimes.
- **Done when:** verified with real runs and tests, released, and checked by the user in the app.

## Approval

Requirements approved at SR-001 by the Solution Designer within the direction. There is no `Needs user` decision. The user was informed on 2026-10-13, restated the intent consistently, and did not override DEC-001.

## Classification evidence

- A new server subsystem.
- A new input-preface port in the core `AgentRun` admission, which every input of all six runtimes crosses.
- A new persisted per-run file (additive).
- A new watcher lifecycle.
- Mid-turn delivery relies on each runtime's append behavior.

## Artifacts (absolute paths)

- `/Users/normy/autobyteus_org/autobyteus-worktrees/active-run-skill-update-notice/tickets/in-progress/active-run-skill-update-notice/requirements-doc.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/active-run-skill-update-notice/tickets/in-progress/active-run-skill-update-notice/investigation-notes.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/active-run-skill-update-notice/tickets/in-progress/active-run-skill-update-notice/design-spec.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/active-run-skill-update-notice/tickets/in-progress/active-run-skill-update-notice/solution-revision-record.md`
- Supplements: none. Product Design: N/A. Prior reviews: N/A.

## Workspace

- Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/active-run-skill-update-notice`, branch `codex/active-run-skill-update-notice`.
- Base `origin/personal` @ `6473e269471cf5ad62abb4f70de63c47f48df485`; target `origin/personal`.
- No source changes yet.

## Open risks

- U-001: per-runtime mid-turn append of a SYSTEM input.
- `ALL_INSTALLED` watch cost (one agent).
- The re-read path: the source `SKILL.md` for all runtimes; verify that Codex and Claude read it.
- Agent compliance is model behavior (non-goal).

## Next expected action

Independent architecture review, then implementation per the design's change sequence.

## Route applied
`get_handoff_rules` (2026-10-13): the "Architecture Design Complete with task_size=Large or architectural_risk=High" rule matches → `/software_engineering_team/architecture_reviewer`. Approval note for the reviewer: requirements were approved by the Solution Designer within the Task direction, under the updated `solution-designer` skill step 2. The user was informed and did not override. The rule's "explicit user approval" wording predates that skill update.

## SR-003 Revision (after ARCH-REV-001, 2026-10-13)

- AR-001 → DEC-009: agent-message semantics per runtime (append on Codex/Claude; next turn on AutoByteus/AGY/ACP/Grok). Approved within the direction (the user's own "same as agent messages" wording); user informed.
- AR-002 → DEC-010: combine the pending notice into the next external input's provider message at dispatch; one turn on every runtime; delivered only on `forwarded`.
- AR-003 → DEC-011: name-keyed skills, re-resolved on change.
- Residuals: R-2 turn ID; R-3 dedicated ignore list; R-1/R-4/R-5 in Risks.
- Review artifacts (reviewer-owned): `design-review-report.md`, `architecture-review-revision-record.md`.
- Route: `get_handoff_rules` → the Large/High revised package matches the architecture-review rule → `/software_engineering_team/architecture_reviewer`.

- 2026-10-13: the user asked for mid-turn support on AutoByteus, Antigravity and Grok as three follow-up tickets. Drafts: `follow-up-tasks.md` (FT-1…FT-3). Sent to `/project_task_manager` for creation. This ticket's scope is unchanged (REQ-004 agent-message semantics).

## SR-004 Revision (after ARCH-REV-002, 2026-10-13)

- AR-004: native AutoByteus history.
  - Generic combined-dispatch tag `platform_input_preface {content, sender_id, original_content}`.
  - Native memory ingest records the original input as the user trace plus a separate `system_task_notification` trace in the same turn.
  - The working context keeps the combined content with explicit raw trace IDs.
  - Files: `memory-ingest-input-processor.ts`, `memory-manager.ts`, `llm-request-assembler.ts`, and the new `platform-input-preface-metadata.ts` (autobyteus-ts).
  - Test: native combined dispatch → reopened history shows the input unchanged plus one system notice.
- Residual adopted: an uncertain dispatch later reconciled as forwarded marks the preface delivered.
- Follow-ups created by `/project_task_manager` (TODO, not dispatched): FT-1 `project_task_50861051-42e0-4f1d-a311-e79b340e127d`, FT-2 `project_task_78fc79ac-29ce-4524-b6a0-5bd1145bde1e`, FT-3 `project_task_9d456b44-2045-4682-bb81-2c20ee0a5479`.
- Route: architecture-review rule (Large/High revised) → `/software_engineering_team/architecture_reviewer` (ARCH-REV-003, AR-004 only).
- 2026-10-13: ARCH-REV-003 **Pass** (informational) on SR-004. AR-004 is verified resolved. The reviewer delivered the handoff to `/software_engineering_team/implementation_engineer` with note N-1 (pass the ingest trace IDs to `LlmRequestAssembler` for the same input; do not recompute). No Solution Designer forwarding required.
