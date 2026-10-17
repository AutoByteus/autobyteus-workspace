# Docs Sync Report

## Scope

- Ticket: collaboration-prompt-wording
- Trigger: post-API/E2E, post-test-code-review delivery (CRR-007 pass; API-REV-005 93%)
- Bootstrap base reference: `origin/personal` @ `3712cd9bf0`
- Integrated base reference used for docs sync: `3712cd9bf0` (no advance; branch already current)
- Post-integration verification reference: not needed, no new base commits

## Why Docs Were Updated

- Summary: every agent-facing collaboration text was rewritten (prompt sections, tool descriptions, results, refusals, task message, header, `@` note). The implementation updated 9 docs. Delivery compared every quoted agent-facing string in the docs with the shipped source and found five stale quotes and terms.
- Why this should live in long-lived project docs: the module docs quote the exact refusal and result texts as the contract.

## Method

- A relative-link and anchor check over the 9 changed docs: 0 dead links.
- Every string literal the branch removed from `src` and no longer present in it, searched with whitespace normalized across all `*/docs/*.md`, `DESIGN.md`, `TESTING.md` and `README.md`: 3 stale quotes and 1 stale paraphrase. One further match in `agent_orgs.md` ("that same instance.") is ordinary prose, not a quote.
- The term lists in docs checked against the source: "its ID" survives only in a code comment, while the product says "run id" (DEC-017).
- Every collaboration line in the `prompt_engineering.md` code blocks is present in the approved fixture or the source. The only lines not found are example agent-definition text and non-collaboration sections (workspace and skills), which are out of scope.

## Docs Updated

| Doc Path | What Changed | Why |
| --- | --- | --- |
| autobyteus-server-ts/docs/modules/agent_communication.md | Reactivation suffix "<run ID> was reactivated." -> "<run id> continues with its conversation."; `COLLABORATION_TARGET_NOT_FOUND` quote -> the current text ("No agent or agent team you can talk with has the address …") | Product text changed (`root-task-execution-lifecycle.ts`, `collaborator-errors.ts`) |
| autobyteus-server-ts/docs/modules/agent_tools.md | Unknown-address delegation quote -> "'…' is not the address of an available agent or agent team. If you have list_available_agents, it shows the addresses you can use." | Product text changed (`collaborator-errors.ts`, M-22) |
| autobyteus-server-ts/docs/modules/projects.md | Coordinator refusal paraphrase "Team copy X" -> "task agent team X" | Matches `existing-copy-target.ts` |
| autobyteus-server-ts/docs/design/collaboration_model.md | Agent-facing term list "its ID" -> "run id" | DEC-017 |
| autobyteus-server-ts/docs/modules/prompt_engineering.md | The wording-authority reference now links the archived proposal and names the durable fixture | It named the ticket without a path |

## Long-Lived Docs Reviewed Without Change

The other implementation-updated docs: agent_definition, agent_execution, agent_team_execution, codex_integration, standalone_agent_run_root, and web chat.md. Their links are valid and they quote no stale text.

## Durable Knowledge Promoted

| Topic | Target |
| --- | --- |
| Collaboration text per role (`collaborationRole`), the vocabulary owner | prompt_engineering.md "Collaboration Sections By Role" (implementation), linked to the archived wording authority |
| Approved prompt blocks | `autobyteus-server-ts/tests/e2e/fixtures/collaboration-prompt-complete-views.md` (durable, test-pinned) |

## Removed / Replaced Concepts

| Old | New | Where |
| --- | --- | --- |
| `teamScoped` switch for prompt choice | explicit `collaborationRole` | prompt_engineering.md |
| "copy", "this run", the agent's own address in prompts | "task agent", "task agent team", "run id"; no own address | prompt_engineering.md, collaboration_model.md |

## Delivery Continuation

- Result: `Pass`
- Follow-up suggestion (not done; outside delivery scope): the wording authority lives in an archived ticket. If it keeps being the owner of agent-facing text, the Solution Designer may want to promote it into `docs/design/`.
