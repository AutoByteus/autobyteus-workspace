# Product Design Request — Model Routing UI (autobyteus-32)

- Classification: `Product Design Requested`, purpose `New Request`
- From: Solution Designer (autobyteus-32, Model Router); To: Product Team (`/product_team`)
- Date: 2026-10-26
- Requested by the user, verbatim (Solution Designer conversation, 2026-10-26): "i feel UI should be designed first. do you think so i think you can contact @Product Team to work on the UI design first"

## The user's requested outcome

Design the user interface of model routing before it is built, so the user sees and agrees how it looks and works.

## Product context

AutoByteus delegates work between agents (`delegate_task`). With **Model Routing** on, a node's built-in **Model Router** agent chooses a runtime and model for each delegated agent that no configured default covers, for the Task at hand, from live facts about the node's agent runtimes (installed, signed in, models, usage limits with reset times) and from a **knowledge note** the user teaches it. The router runs as one long-lived conversation per node and is an *internal* agent (hidden from the normal agent lists). Every delegated copy's choices are recorded, so the user can see over time what kind of task went to which runtime/model and whether the router works well.

## What the design must cover (from the approved requirements)

1. **Settings → Model Routing page** (exists today with one section, "Agent runtimes now", from autobyteus-303: each available runtime with its models, limits, reset times, blocked models). New sections (REQ-010…REQ-012):
   - **Setup**: Model Routing switch (off by default); the router's runtime and model (choose from what the node offers; show whether the router is active and why not, e.g. "Codex is blocked until Oct 30"); the editable list of **task kinds** (initially: design, implementation, code review, testing, writing, research, computer use, other); "Open conversation" (opens the router's conversation even while internal agents are hidden).
   - **Knowledge**: the router's knowledge note — read, edit, undo the last change (the router also rewrites it).
   - **Decisions**: the latest routings — time, Task title, task kind, agent → runtime / model, source (Model Router, agent default, team default, inherited), the reason, link to the delegating run.
   - **Overview**: statistics for 7 days / 30 days / all — per task kind which runtimes/models were used and how often; how much the router decided vs defaults.
2. **The router conversation**: how routing requests and the router's answers appear in it, and where the user teaches it (it is an ordinary agent conversation; requests arrive as system messages).
3. **Where a choice shows outside the page** (REQ-009): the `delegate_task` result line per routed agent ("implementation_engineer: runs on Codex / gpt-x, chosen by the Model Router (implementation): …"); run Settings → delegated copy rows (source "Model Router" with its reason, task kind); remote copies (runs on another node) shown the same way. The Task also names the run header / board as possible places; the current design shows it in the result and Settings rows.
4. **States**: switch off (explain the feature; nothing active); on but router not active (no runtime/model chosen, or its runtime blocked/signed out); no decisions yet; no statistics yet; empty knowledge note; a decision whose router failed (fallback note); a peer node's window (that node's page).

## Constraints and non-goals

- Fit the existing Settings page patterns (the Model Routing page and its "Agent runtimes now" section exist; Agent Runtimes and Token Usage pages are neighbours).
- Out of scope: learning from outcomes (a later Task); changing launches of already started copies; choosing model settings (reasoning effort).
- Languages: English and Simplified Chinese.

## Open questions the design should answer

- How the four new sections and "Agent runtimes now" are arranged (one page, tabs, or sub-pages) so the page stays readable.
- How statistics are best shown (table, bars) for task kind × runtime/model.
- How the user moves between a decision, its delegating run and the router conversation.
- Whether and how the choice also shows in the run header (the Task mentions it; currently not designed).

## Links (absolute paths)

- Requirements: /Users/normy/autobyteus_org/autobyteus-worktrees/delegated-runtime-model-routing/tickets/in-progress/delegated-runtime-model-routing/requirements-doc.md (REQ-002…REQ-012, AC-008, AC-009, AC-012)
- Selection order and all cases: …/launch-selection-order.md
- Investigation notes: …/investigation-notes.md
- Current design (server side; the web part will follow your result): …/design-spec.md
- Existing page code: /Users/normy/autobyteus_org/autobyteus-worktrees/delegated-runtime-model-routing/autobyteus-web/components/settings/model-routing/
