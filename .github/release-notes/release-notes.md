## New
- **Claude Sonnet 5.5 and Claude Haiku 5.5** are available in the model picker, with 1M context and 128K output.
  - Thinking is **Off** by default. You can turn it **On** for each run. The display then defaults to **Summarized** on Sonnet 5.5 and **Omitted** on Haiku 5.5, and you can change it.
  - The Token Meter prices both models at Anthropic Standard rates. Haiku 5.5 uses its prompt-size tiers (up to 100K and above 100K tokens, with cache tokens counted).
- **See each delegated copy's Task in the Workspaces tree.** Under Agent runs and Agent Team runs, a delegated Agent or Team copy shows a one-line summary of its current Task under its name.
  - Click the summary, or press Enter or Space on it, to open that Task in the right panel's Projects tab. The card is scrolled into view and briefly highlighted, and your conversation stays where it is.
  - Summaries update without a reload when a Task is renamed, closed, deleted or replaced by a follow-up Task.
- **New Workspaces icon on the collapsed left strip.** It opens the left panel without leaving the run you have open. The open run's row is selected, expanded and focused in the tree.

## Changed
- On the collapsed strip, **Workspaces is lit while a run is shown**. Chat is lit only on New chat. Before, clicking Chat on an open run replaced the run with a New chat.
- Collapsing the docked left panel, or closing the drawer, moves keyboard focus to the strip's Workspaces icon.
- AutoByteus now builds each Claude request from a fixed set of rules per model. Existing Claude models send the same requests as before. Like Opus 5.5, Sonnet 5.5 refuses a forced tool choice before sending the request.

## Fixes
- The Cancelled status pill shows its intended light slate ring.
- A two-line row in the Workspaces tree now collapses smoothly instead of jumping first.
- The Server Docker image builds reliably again. The Antigravity CLI installer was sometimes downloaded in compressed form and failed to run.

## Notes
- No reset or data migration is needed.
