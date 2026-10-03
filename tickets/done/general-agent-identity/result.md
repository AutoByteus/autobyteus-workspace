> Historical SR-001 prompt-authoring result. Superseded for current approval/design/routing by SR-002 and solution-handoff.md; retained as historical evidence.

# Complete General Agent prompt — authoring result

- Package: `general-agent-identity`; current revision: `SR-001`.
- Outcome: Requested prompt-file authoring complete; future implementation requirements Ready for Approval. Not Architecture Design Complete, not implementation-ready, not delivery.
- Original request: discuss internal Daily Assistant rename in context of public specialists, then save the complete General Agent prompt so a later Implementation Engineer sees exact wording.
- Goals: consistent identity; discover available specialist agents/teams when useful; use relevant available skills for direct work; no-skill fallback to reasoning/tools.
- User constraints: no migration; use “use,” not “follow”; current request is a prompt file, not production edits.
- Approval basis: user “sounds good” authorizes writing the discussed prompt; exact expanded full supplement awaits review. No automatic routing priority, public synchronization, rollout, or finalization approval inferred.
- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/general-agent-identity`; branch `task/general-agent-identity`.
- Refreshed base: `origin/personal` at `806907faeb567d2b703e10fe984fcd01be0b41fd`; prospective integration target `origin/personal` only after future authorization. No production modifications, commit, release or deployment in this step.

## Canonical artifacts
- Full exact prompt v1: `/Users/normy/autobyteus_org/autobyteus-worktrees/general-agent-identity/tickets/in-progress/general-agent-identity/general-agent-prompt.md`.
- Requirements: `/Users/normy/autobyteus_org/autobyteus-worktrees/general-agent-identity/tickets/in-progress/general-agent-identity/requirements-doc.md`.
- Investigation: `/Users/normy/autobyteus_org/autobyteus-worktrees/general-agent-identity/tickets/in-progress/general-agent-identity/investigation-notes.md`.
- Revision history: `/Users/normy/autobyteus_org/autobyteus-worktrees/general-agent-identity/tickets/in-progress/general-agent-identity/solution-revision-record.md`.
- Result: `/Users/normy/autobyteus_org/autobyteus-worktrees/general-agent-identity/tickets/in-progress/general-agent-identity/result.md`.
- Design, independent architecture/code reviews, implementation and validation artifacts, Product artifacts: N/A — not applicable at this stage.

## Evidence, risks and next action
Public package and built-in definitions already use General Agent as role but still have Daily Assistant name/self-introduction. Their tool/skill configurations differ. list_available_agents is opt-in, returns accessible agents AND teams, and does not expose their skill contents; both inspected Daily Assistant configs omit it. Source paths and factual contracts are listed in investigation-notes.md.

SCN-001–003 / BEH-001–003 support the proposed wording. No runtime behavior has been tested; this is a reviewed file-authoring result, not a runtime pass. Open decisions are full prompt approval and future production scope/tool enablement. Next action: user reads the exact prompt; upon later approved requirements, Solution Designer completes architecture and applicable handoff. Implementation Engineer must use the approved supplement's exact wording rather than inventing another prompt.

Route lookup: Pending. This prompt-authoring outcome should remain in the user conversation, not be misclassified as an implementation-ready architecture package.

File verification: full prompt/frontmatter read; identity, discovery, “use” wording and fallback assertions passed. Prompt v1 SHA-256: `d410e6f60d923ff66849961fd8b15c461fc6c08d254ef66a7d4a92a8299cbe1a`. Production/runtime verification N/A.

Applied handoff rules: No rule matches prompt-file authoring / requirements review. Return the saved prompt to the user; no implementation or reviewer handoff. Routine approval hold remains in the user conversation.
