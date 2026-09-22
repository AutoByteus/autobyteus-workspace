## Improvements
- Unsent composer text and selected context files now remain available when you switch between Agent Orgs, members, standalone Agents, Agent Teams, configuration, and other supported workspace surfaces during the same application session.
- Drafts stay isolated to their exact run and member, including file uploads that finish after you navigate elsewhere.

## Fixes
- Fixed ordinary Agent Org navigation and workspace unmounting incorrectly discarding the retained Org context and clearing unfinished member input.
- Kept successful send, failed-send recovery, newer-edit precedence, Stop/continue, sent-history hydration, and explicit archive/delete cleanup behavior unchanged.

## Scope
- Draft retention remains session-local. Reloading or restarting the application does not persist unsent drafts, and the existing draft-file cleanup period is unchanged.
