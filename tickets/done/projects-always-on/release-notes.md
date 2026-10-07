# Release Notes — Projects always on, and a Projects tab beside the chat

## Changed

- **Projects is always available on desktop.** There is no longer a Projects switch in Server Settings, and Projects appears in the main navigation on every desktop node. The mobile app still doesn't show Projects.
- **New Projects tab in the right panel.** In any Agent, Team or Org conversation, a "Projects" tab, first before Files, shows a live Task board next to the chat.
  - Pick a Project or Temp tasks from the picker at the top. The choice is remembered per node.
  - Click a card to read the Task inside the tab, then go back. "Open in Projects" opens the full page.
  - Clicking a Task's worker opens its conversation in the center, and the Projects tab stays open.
  - On narrow windows, Projects is also first in the collapsed strip and the drawer.
- Token statistics labels in Settings now follow the app's font-size setting. They look the same at the default size.

## Upgrade notes

- No migration. A previously saved `ENABLE_PROJECTS` value is ignored. It now shows as an ordinary custom setting that you can delete.
