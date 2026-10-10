# Release Notes — composer-context-file-removal

## Fixed

- Context files attached in an agent that another agent delegated work to can now be removed. This covers a delegated agent or Team member, for example under the Project Task Manager. Before the fix, × and Clear All did nothing there. The uploaded copy is now deleted too.

## Improved

- If attaching or removing a file fails, the Context Files tray now shows an error that names the file. A failed removal keeps the file so you can try again.
- Where an agent can't accept uploaded files at the moment, the `+` button is disabled and shows the reason. Pasting or dropping a file there shows a message instead of doing nothing. File paths can still be attached.
