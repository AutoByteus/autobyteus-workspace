# Handoff — Architecture Design Complete (autobyteus-303)

- Package: `available-agent-runtimes-tool`, Project Task **autobyteus-303** (part of autobyteus-32, model routing, which depends on it)
- From: Solution Designer; To: Architecture Reviewer
- Date: 2026-10-25; Solution revision: SR-001
- Classification: `Architecture Design Complete`, task_size **Large**, architectural_risk **High** (design-spec § Task Size And Architectural Risk)

## Original request and goal

Task autobyteus-303 (from `/project_task_manager`): an opt-in agent tool `list_available_agent_runtimes` that tells an agent which agent runtimes can run now on its node, their models and their live usage limits with reset times, plus a Settings → Model Routing page section "Agent runtimes now" with the same data. It is the fact source of the Model Router (autobyteus-32). The user set the direction in the Solution Designer conversation of 2026-10-24/25 (name, tool first as its own ticket, one strategy per runtime, AutoByteus providers without a key are not usable, separate Model Routing page).

## Approval basis

- `requirements-doc.md` SR-001: Approved by the Solution Designer within the direction, user informed (2026-10-25). Decisions DEC-001…DEC-006 in the requirements doc.
- Supplements: none behavior-defining; `evidence/limit-probes/` is evidence (probe scripts + recorded results, 0 tokens).

## Artifacts (absolute paths)

- Requirements: /Users/normy/autobyteus_org/autobyteus-worktrees/available-agent-runtimes-tool/tickets/in-progress/available-agent-runtimes-tool/requirements-doc.md
- Investigation: /Users/normy/autobyteus_org/autobyteus-worktrees/available-agent-runtimes-tool/tickets/in-progress/available-agent-runtimes-tool/investigation-notes.md
- Design: /Users/normy/autobyteus_org/autobyteus-worktrees/available-agent-runtimes-tool/tickets/in-progress/available-agent-runtimes-tool/design-spec.md
- Solution revision record: /Users/normy/autobyteus_org/autobyteus-worktrees/available-agent-runtimes-tool/tickets/in-progress/available-agent-runtimes-tool/solution-revision-record.md
- Evidence: /Users/normy/autobyteus_org/autobyteus-worktrees/available-agent-runtimes-tool/tickets/in-progress/available-agent-runtimes-tool/evidence/limit-probes/README.md

## Workspace

- Worktree: /Users/normy/autobyteus_org/autobyteus-worktrees/available-agent-runtimes-tool, branch `codex/available-agent-runtimes-tool`
- Base: `origin/personal` at `a2faf424d6dc69a1d5160cb55acefc2f5a4f6bd5`; finalization target `origin/personal`
- Documents are uncommitted in the worktree.

## Points for the review

- New external contracts: Codex `account/rateLimits/read`; Claude SDK experimental `get_usage`; `agy -p "/usage" --output-format json`; Grok ACP `_x.ai/billing`; DeepSeek/Kimi balance, Anthropic `count_tokens` credit check, xAI `/v1/api-key`.
- Short child processes per call (Claude CLI, `agy`, `grok agent stdio`; Codex lease) under per-reader time-outs; no cache, no polling.
- Credential path: provider keys only inside provider readers via the server secret resolver; answers carry no identities.
- Extension of `AgentRuntimeStrategy` (all test doubles), extraction of Claude's short control query.

## Open risks / unknowns

- UNK-001 Grok `creditUsagePercent` presence; UNK-002 Docker node parity (user verifies); RSK-001 external format changes → "limits unknown".

## Constraints from the Task

Read limits only; never spend tokens; never print or store credentials; the tool is not given to any agent automatically; prove from a clean clone; no release unless asked; clean up.

## Next expected action

Independent architecture review of the package; on Pass, the reviewer's route to implementation.

## Route taken

- 2026-10-25: rule "Architecture Design Complete with task_size=Large or architectural_risk=High" → sent to `/software_engineering_team/architecture_reviewer` (delivered, run `architecture_reviewer_0fda00a36595499d940b4fb4017ee06f`).

## Revision SR-002 (2026-10-25)

Revised for ARCH-REV-001 (AR-001…AR-005 and the non-blocking points; resolution table at the top of `design-spec.md`) and for the user's request of 2026-10-25 to keep only useful information in the answer (requirements SR-002: REQ-004 lean answer, REQ-006 removed, REQ-007 failure entries, DEC-007 Codex credits). Evidence C-15…C-18 added to the investigation notes. Previous design: `history/design-spec-sr001.md`. Classification unchanged: Large / High.
- 2026-10-25: SR-002 sent back to `/software_engineering_team/architecture_reviewer` for re-review (delivered).

## Revision SR-003 (2026-10-25)

For ARCH-REV-002: step deadline (`read-deadline.ts`, option `deadline`, shared by every command in a step; Codex races it and releases the lease; slow-second-command test) and requirement text alignment (UI states, `blocked: {until, by}`, balance vs credits wording). See the resolution table at the top of `design-spec.md`; evidence C-19. Previous design: `history/design-spec-sr002.md`.
- 2026-10-25: SR-003 sent to `/software_engineering_team/architecture_reviewer` for re-review.

## Revision SR-004 (2026-10-25)

Small addition after ARCH-REV-003 Pass: an optional per-runtime `note` (design § SR-004 Addition; REQ-004, AC-003, AC-006), decided by the Solution Designer at the user's request. Additive; nothing else changes.
- 2026-10-25: sent to `/software_engineering_team/architecture_reviewer`.

## Revision SR-005 (2026-10-25)

For ARCH-REV-004 AR-007: `signIn?: "not checked"` and `limitsNote?: string` as separate fields; requirements UI states, REQ-004, REQ-007, AC-003, AC-006 aligned.
- 2026-10-25: sent to `/software_engineering_team/architecture_reviewer`.
