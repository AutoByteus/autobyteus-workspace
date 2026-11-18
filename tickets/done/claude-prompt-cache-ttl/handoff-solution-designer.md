# Handoff: autobyteus-273 Architecture Design Complete (SR-002)

- Package: `claude-prompt-cache-ttl` (Task autobyteus-273, FU-001 of autobyteus-271)
- Requested by: `/project_task_manager` (run id `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`) for the user
- Original request: Claude runtime uses the 1-hour prompt cache by default on API billing; an explicit user setting wins; subscription keeps Claude Code's own behavior for the agent conversation; Token Statistics show the 5m/1h split; two-turn proof; tests, docs, finalized on `personal`; release as the user decides (worth a beta soon).
- User decisions (2026-10-22, Solution Designer conversation): a "Claude runtime" card in Server Settings with an on/off toggle "One-hour prompt cache", on by default; mechanism option A (`ENABLE_PROMPT_CACHING_1H=1`, ranks below every user choice); spend of about 1-2 cents of API credits approved for the proof ("yes you can spend, go ahead").
- Status: Architecture Design Complete. `task_size` Small, `architectural_risk` Low (design-spec "Task Size And Architectural Risk").
- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-prompt-cache-ttl`, branch `codex/claude-prompt-cache-ttl`, base `origin/personal` @ `d8df12435ca2352636046cf514daae800acecefe`; finalization target `personal`.
- Ticket folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-prompt-cache-ttl/tickets/in-progress/claude-prompt-cache-ttl/`

## Documents

- `requirements-doc.md` (Approved, SR-002): BEH-001..006, REQ-001..006, AC-001..006
- `investigation-notes.md`: S1-S9, D1/D4, experiments T1-T6 (Claude Code 2.1.307 precedence)
- `design-spec.md`: target files, builder shape, card, breakdown rows, tests, docs, validation guidance
- `solution-revision-record.md`: SR-001, SR-002
- `follow-ups.md`: FU-001..003 (not part of this ticket)

## Key constraints for implementation and validation

- Never overwrite a user-set `ENABLE_PROMPT_CACHING_1H`; never set `CLAUDE_CODE_PROMPT_CACHE_TTL` (it would override the user's `promptCacheTtl`, T4).
- The default applies in every auth mode (one exit in the builder).
- Absent setting = on, in server and card.
- Proof run: API billing only through the product (`api-key` mode, vault key), never print keys; if the isolated instance cannot reach the vault key through the product, stop and ask the user. Budget about 1-2 cents.
- The user's Claude CLI is currently on his subscription (`billingType stripe_subscription`); do not log it in or out.

## Open risks

- `ENABLE_PROMPT_CACHING_1H` on API billing is documented but not yet run (escalation trigger in design-spec).

## Route

Rule matched (task_size Small, architectural_risk Low): direct implementation -> `/software_engineering_team/implementation_engineer`, 2026-10-22. No architecture review selected.
