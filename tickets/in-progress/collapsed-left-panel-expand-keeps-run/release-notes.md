# Release Notes — Collapsed Left Panel: Expand Without Leaving the Open Run

Status: prepared before user verification. Whether this ships in a release, and with which version, is decided at finalization.

## Added
- The collapsed left strip has a new **Workspaces** icon. It sits below the page icons, after a light divider. Clicking it opens the left panel (docked, or as a drawer on a narrow window) **without navigating**. The open run, draft, selection, center view and right panel are all kept.
- When the panel opens, the open run's row in the Workspaces tree is selected and its parent rows are expanded. This includes a Team member inside a nested sub-team. The row is scrolled into view if needed, and keyboard focus moves onto it.

## Changed
- **The lit strip icon shows where you are.** While a run is shown (an Agent run in Chat, or a Team or Org run), Workspaces is lit. Chat is lit only on New chat. Before this change, Chat was lit on any open chat run, and clicking it replaced the run with a New chat.
- Collapsing the docked panel now moves keyboard focus to the strip's Workspaces icon. Closing the drawer also returns focus there.

## Unchanged
- Page icons (Chat, Agents, Projects, …) still open the panel and go to their page.
- The Chat row and its pencil still start a fresh New chat.
- Opening a run while the panel is already docked does not scroll the tree.
- On New chat or other pages, Workspaces opens the panel without scrolling to or focusing a row left over from an earlier run.

## Notes
- Client-only change. No server API, settings, data migration or reset.
- Translations: en "Workspaces", zh-CN "工作区".
