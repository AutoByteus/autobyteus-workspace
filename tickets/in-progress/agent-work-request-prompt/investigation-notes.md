# Investigation — Agent Work Request Prompt

Package: agent-work-request-prompt; SR-001.
Workspace: /Users/normy/autobyteus_org/autobyteus-worktrees/agent-work-request-prompt
Branch: codex/agent-work-request-prompt
Base: refreshed origin/personal; revision 07023b915 (full revision to follow). Finalization target: personal; no release requested.
Original analysis was read-only in the shared checkout. Source-only evidence and full conversation analysis are preserved at /tmp/autobyteus-collaborator-prompt-investigation-2026-10-02.md and will be copied into this package as historical supporting evidence.

## Evidence already established
Carpenter selects a team or standalone collaboration renderer. Team contract emphasizes ordinary communication, while delegate_task emphasizes work. Receiving-message wrappers contain generic sender/message text. Team members retain their own handoffs; ad-hoc collaborators gain no automatic cross-team return rule. These are code observations; their causation of the reported model behavior is unconfirmed without a failing trace.

## Architecture investigation
Pending current-base confirmation of prompt consumers, tool descriptions and focused tests. No production code changes by Solution Designer.

## Current-base architecture confirmation
Base full revision: 07023b9152c60d67095be192df3cb5a647cdbf74. `git fetch origin` succeeded before worktree creation. Shared checkout remains unmodified.
- E1: `autobyteus-server-ts/src/agent-execution/prompt/carpenter-prompt-composer.ts:29-74`: both shared and native compositions consume the existing member-context branch; shared runtimes need no provider-specific edits.
- E2: `src/agent-collaboration/domain/agent-team-collaboration-llm-contract.ts`: owns Team collaboration and send-message tool wording. Existing no-rule sentence “finish normally” must be aligned with the approved requester-return fallback, without changing the single-most-specific selection policy.
- E3: `src/agent-run-collaboration/prompt/standalone-collaboration-instruction.ts`: standalone renderer has no get_handoff_rules instruction; reuse only scope-neutral wording here.
- E4: `src/agent-communication/services/send-message-to-tool-contract.ts` and `src/agent-tools/agent-communication/send-message-to-parameter-schema.ts`: content description is canonical and reused by tool projection. Update description only; no argument/schema changes.
- E5: `tests/unit/agent-team-execution/agent-team-collaboration-llm-contract.test.ts` pins hashes and exact rule paragraph; `tests/unit/agent-execution/prompt/carpenter-prompt-composer.test.ts` has exact section assertions and standalone snapshot. Update deliberately and add semantic coverage, not just hashes.
- E6: `docs/modules/prompt_engineering.md:169-247` includes old heading and full sample; synchronize. Read `TESTING.md` and server `AGENTS.md`: focused server tests are smallest layer; live provider adherence needs separate honest evidence.
Paths E2-E6 are relative to `autobyteus-server-ts/` unless explicitly root `TESTING.md`.
Commands: targeted cat/sed/rg of the listed files; no tests executed during design.

## Supplement inventory and uncertainty
`prior-investigation.md` is historical source/analysis context, non-normative (earlier proposals superseded by approved R1). Original /tmp path remains provenance only. No Product artifact or UI supplement applies. No failed live exchange available, so no assertion of confirmed incident root cause. No remaining material implementation-shape uncertainty.

## E7 / SR-002 — exact-text drift confirmed
Current worktree HEAD 18c795d2bb309d56a4874c29969901d93a1d1e81; delivery is awaiting user verification, not finalized. Read solution-handoff.md, requirements, design, revision record and delivery handoff-summary.md before resuming. Canonical source line 6 of agent-team-collaboration-llm-contract.ts omits “only” and “needing external input”; both renderers import it. rg identified exact expected sentence in contract unit test, standalone snapshot and prompt_engineering.md. Existing uncommitted docs change belongs to delivery and must be preserved. User explicitly requests original quoted paragraph; no causal re-investigation needed. No source/test edits or tests executed by Solution Designer in SR-002.
