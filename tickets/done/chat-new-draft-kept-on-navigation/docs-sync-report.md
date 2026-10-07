# Docs Sync Report — chat-new-draft-kept-on-navigation

## Scope

- Ticket: `chat-new-draft-kept-on-navigation`. New chats with typed text are kept as Draft rows under the Chat row.
- Trigger: API/E2E pass, API-REV-002 round 2, on the direct low-risk route. Classification: `task_size=Medium`, `architectural_risk=Low`. Architecture, source and test-code review are `Not Applicable — direct low-risk route`. CRR-001 was only the failure-origin review of F-001.
- Bootstrap base reference: `origin/personal@cfeda548b`
- Integrated base reference used for docs sync: `origin/personal@7d130309e`, merged into the ticket branch as `ec4c73929`. Checkpoint `8ba19cc85` sits on IR-002 `9e902002d`.
- Post-integration verification reference: the focused web suites on `ec4c73929`, 32 files / 164 tests passing (see `release-deployment-report.md`).

## Why Docs Were Updated

- Summary: the chat docs described `chatDraftStore` as owning **one** New chat draft that every start replaced, and a launch that "resets the draft". After this change the store keeps a collection of drafts and one open draft, and Draft rows sit under the Chat row. A successful launch now calls `finishSentDraft` instead of resetting. `TESTING.md` had no entry for the new live probe.
- Why this should live in long-lived project docs: the draft lifecycle (has-text rule, leave rule, rows, discard, sent-draft finish, the REQ-006 failure mapping) is durable renderer behavior. Future chat or left-panel work depends on it.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result | Notes |
| --- | --- | --- | --- |
| `autobyteus-web/docs/chat.md` | Owns the New Chat Draft and Launch descriptions | Updated | The single-draft wording was obsolete |
| `autobyteus-web/docs/workspace_layout.md` | Describes the Chat left-nav item | Updated | Draft rows under Chat |
| `TESTING.md` | Lists the browser probes | Updated | New probe section |
| `autobyteus-web/docs/agent_execution_architecture.md` (Start Surfaces, `useRunStart`) | Names `chatDraftStore` as a draft owner | No change | The text is still accurate: `useRunStart` picks the owner and holds no draft state |
| `autobyteus-web/docs/agent_orgs.md` | Org launch draft | No change | The Org draft is unaffected |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-web/docs/chat.md` | Rewrite + new subsection | The New Chat Draft intro now describes the collection, `openDraftId`, `ChatDraft.id`/`listed`/`sentText` and session-only state. The start-intent table gains a "Draft row → `openChatDraft`" row. New **Draft rows** subsection: has-text rule, leave rule, rows projection, selection and Empty draft, open, discard and focus, motion, strings, attachment residue. Launch now reads `finishSentDraft`: only the open sent draft opens a fresh New chat, `sentText` covers the in-flight send, and the REQ-006 failure mapping applies. The Team launch finishes the draft on success and keeps the row on failure | Match the implemented behavior |
| `autobyteus-web/docs/workspace_layout.md` | One sentence | Draft rows under the Chat row; the Chat row is not active while a Draft row is selected | Shell navigation truth |
| `TESTING.md` | New section "Chat Draft Rows Regression" | Prerequisites, command and flags, what the stack owns, D00–D14 scope, the injection caveat, evidence to inspect | API/E2E docs-sync request |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Draft identity | `ChatDraft.id` is stable; `context.state.runId` changes on promotion and must not key rows | design-spec (AF-005) | `chat.md` |
| Has-text / leave rule | One predicate (`chatDraftHasText` over `chatDraftText`). A textless open draft is dropped when left unless it is starting | design-spec DS-002/DS-006 | `chat.md` |
| Sent-draft finish | `finishSentDraft` replaces only an open sent draft. An agent failure after registration counts as sent. `sentText` keeps the row text during the send (IR-002/F-001) | design-spec REQ-006 mapping; implementation-revision-record IR-002 | `chat.md` |
| Live probe | How to run and read `test:e2e:chat-draft-rows-live` | api-e2e reports | `TESTING.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| Single `ref<ChatDraft \| null>` replaced on every start | `drafts` + `openDraftId`; `draft` is computed | `chat.md` New Chat Draft |
| `startNewChat()` after a successful launch | `finishSentDraft(draft)` | `chat.md` Launch |
| Global model-choice generation counter | A per-draft generation map (internal) | Code only. This is an internal mechanism with no doc reader |

## Delivery Continuation

- Result: `Pass`
- Next delivery action: the handoff summary, then the user-verification hold.
- Notes: the docs edits are uncommitted until the user verifies.
