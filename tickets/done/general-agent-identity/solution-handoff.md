# General Agent identity — implementation-ready solution handoff

## Result and identity
- Outcome: **Architecture Design Complete**.
- Package: `general-agent-identity`; current/approved solution revision: `SR-002`.
- `task_size: Small`; `architectural_risk: Low`.
- Requirements Approved; design Ready; full exact prompt v1 explicitly approved. No production implementation or runtime-validation pass claimed by Solution Designer.

## Original request, goals and approval
User originally wanted to rename the internal **Daily Assistant** to General Assistant, General Agent or Universal Agent, asking for analysis. Public specialists package context led to **General Agent**, which already matches the role metadata. User explicitly stated **no data migration needed**. User requested specialist awareness through list_available_agents and relevant-skill/direct-work fallback, then changed “follow” to **“use.”** User asked for a complete prompt file so the later Implementation Engineer sees exact wording. After receiving the complete file link, user explicitly approved proceeding: **“coool. lets go approved.”**

This approves the original internal default Chat agent change and exact saved wording. Public `autobyteus-agents` repository is reference-only, not an authorized synchronization target. No forced routing order or universal specialist availability promised.

## Canonical cumulative artifacts (read these before implementation)
- Approved requirements: `/Users/normy/autobyteus_org/autobyteus-worktrees/general-agent-identity/tickets/in-progress/general-agent-identity/requirements-doc.md`.
- Canonical investigation (including post-approval AE-001–012): `/Users/normy/autobyteus_org/autobyteus-worktrees/general-agent-identity/tickets/in-progress/general-agent-identity/investigation-notes.md`.
- Completed design/classification: `/Users/normy/autobyteus_org/autobyteus-worktrees/general-agent-identity/tickets/in-progress/general-agent-identity/design-spec.md`.
- Cumulative solution revisions: `/Users/normy/autobyteus_org/autobyteus-worktrees/general-agent-identity/tickets/in-progress/general-agent-identity/solution-revision-record.md`.
- Exact approved behavior-defining supplement: `/Users/normy/autobyteus_org/autobyteus-worktrees/general-agent-identity/tickets/in-progress/general-agent-identity/general-agent-prompt.md`; v1 SHA-256 `d410e6f60d923ff66849961fd8b15c461fc6c08d254ef66a7d4a92a8299cbe1a`.
- This handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/general-agent-identity/tickets/in-progress/general-agent-identity/solution-handoff.md`.
- Historical SR-001 authoring result only: `/Users/normy/autobyteus_org/autobyteus-worktrees/general-agent-identity/tickets/in-progress/general-agent-identity/result.md` (superseded, not current approval authority).
- Architecture review / code review / external Product artifacts: **N/A — not applicable** for direct Small/Low route. Implementation/API-E2E/delivery artifacts not yet produced; do not fabricate them.

## Workspace, base and finalization context
- Isolated task root: `/Users/normy/autobyteus_org/autobyteus-worktrees/general-agent-identity`.
- Task branch: `task/general-agent-identity`.
- Refreshed base: `origin/personal` at `806907faeb567d2b703e10fe984fcd01be0b41fd` (`git fetch origin personal` before creation).
- Integration/finalization target: `origin/personal`; Delivery Engineer owns later final verification/finalization and applicable release/cleanup. Do not merge/release now merely because requirements were approved.
- Shared default checkout has unrelated user/task changes. Work ONLY in this isolated task root; do not touch the shared checkout or public package.
- Solution documents are currently untracked under this ticket and available on disk; no implementation edits, commits or merge performed here.

## Requested implementation and preserved boundaries
Apply the approved complete prompt byte-for-byte to the existing internal template `autobyteus-server-ts/src/built-in-agents/templates/daily-assistant/agent.md`; change registry displayName to **General Agent**; add **list_available_agents** once to existing template toolNames; preserve every other configuration value, tool and ALL_INSTALLED skill scope. Align focused current tests/fixtures/comments/docs as specified in design.

Keep `autobyteus-daily-assistant` definition ID, template directory, exported default constant and frontend default selector unchanged. This is a displayed-identity/content change, not a persistent identity rename. No migration, history/saved-address rewrite, duplicate default, alias, compatibility branch, new adapter/owner, eligibility/policy change or public-repository edit.

BEH-001–003 / SCN-001–003 / REQ-001–006 / AC-001–006 govern implementation and validation. Exact text is the authority; do not have the Implementation Engineer invent another prompt.

## Evidence, verification and residual risk
Existing bootstrap replaces platform-owned built-in content on every startup and refreshes catalog. Normal provider parses name/body independently from ID. Discovery is already implemented, opt-in by config, native/MCP exposed with eligible context; collaboration message/delegation tools are already automatic. Existing host addresses and historical name snapshots remain valid without rewrite. Canonical migration guideline inspected; no transformation needed. Existing owners absorb three local production content/config/display changes with no structural runtime change; Small/Low is evidence-backed.

Read server/web AGENTS.md and root TESTING.md. Add/extend focused bootstrap exact-template/name/config/startup assertions and actual-config discovery exposure checks; execute implementation-scoped tests/build. API/E2E owns broader executable integration and isolated product default Chat checks. Do not touch user's installed app/data. Do not turn prompt-string checks into claims that the model always delegates. Stale live-probe C13 asserts prompt edit preservation despite platform-owned refresh; preserve correct contract and truthfully handle stale coverage.

Open material requirement/design blockers: None within current internal scope. Residual risks: nondeterministic model judgment; old historical snapshots may still display old captured name; public package remains unchanged; dependency/build/validation environment must be checked downstream. Escalate if an ID/schema/history transition, missing structural collaboration context or changed security/eligibility/routing semantics becomes necessary.

## Expected output and next action
Implementation Engineer produces source/config/test work, implementation-scoped evidence and implementation-handoff.md according to its skill and configured routing. API/E2E validates executable/product behavior; Delivery Engineer syncs docs, captures explicit user verification and completes applicable finalization/release/cleanup. Return requirement/design findings to Solution Designer with linked approved IDs. No independent review gate assumed solely from investigation length.

Handoff-rule lookup and selected route: Pending lookup; persist exact rule decision below before sending.

Applied handoff rules: The Architecture Design Complete + Small/Low rule matches. Selected direct implementation route to exact returned recipient_address `/implementation_engineer`. Large/High independent-review and delivery-receipt-gap rules do not match. Approved requirements, canonical investigation, completed design, cumulative solution history, exact approved prompt supplement and classification rationale included above. Direct route skips independent architecture/code review, not design, implementation self-checks, executable validation or delivery gates. No other recipient notified for this outcome.
