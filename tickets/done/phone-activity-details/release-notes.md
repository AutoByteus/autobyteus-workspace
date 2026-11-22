## The phone's Activity shows what each tool did

- **Each tool call says what it acted on.** In a run's Activity on the phone, a tool call now shows its name and, below it, what it did: the command it ran, the file it read or wrote, the query it searched for, the agent it messaged ("→ /architecture_reviewer") or the Task it changed. Before, every row only repeated the tool's name twice.
- **A clearer status.** A call that succeeded shows just a check mark. Any other state shows an icon and its word (Failed, Running, Review, Denied), so it never depends on color alone. A failed call also shows the start of its error.
- **Tap a call to open its details.** The details open full screen and show the status, the whole command or path, and the call's Arguments, Logs, Result and Error. They update while you watch, so the output of a call that is still running keeps growing, and the Back button returns you to the list where you were.
- **Memory compactions open too**, with their details and any error, and **a background task unfolds** to show its full command and how it ended.
- **The desktop app uses the same wording.** Tool cards in the conversation now show the recipient of a message or delegation and the Task a Task tool changes, and a command no longer starts with its `cd <folder> &&`; the desktop Activity panel uses the same status words.

### Good to know

- A tool call that was interrupted shows "Unknown" as its status, as it already did on the desktop.
