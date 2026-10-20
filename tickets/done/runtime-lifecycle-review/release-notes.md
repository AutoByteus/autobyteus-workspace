## What's New

- **Settings → Agent Runtimes.** A new Settings page shows Codex, Claude, Antigravity and Grok for the current node. For each one you see the installed version, whether a newer version exists, and whether you are signed in.
- **Update from AutoByteus.** When a runtime has a newer version, **Update** runs the runtime's own updater and shows its progress. When it finishes, the page shows "Updated from X to Y.". Update waits while that runtime still has agents running, and the page says why.
- **Sign in to Codex and Grok from AutoByteus.** **Sign in** starts the runtime's own sign-in in your browser, and the page shows Signed in when you finish. Claude and Antigravity show a reminder to sign in from their command line.
- **Missing runtimes.** A runtime that is not installed links to the vendor's install instructions. After installing it, restart AutoByteus so it is found.

## Improvements

- Remote and Docker node windows show the same runtime status, read-only. Update those runtimes on the node's own computer.
- The page is available in English and Simplified Chinese, and switches to a stacked layout in narrower windows.

## Notes

- AutoByteus never sees or stores your runtime sign-in. It asks each runtime for its state and starts the runtime's own commands.
- Rolling back to an earlier version is possible. This release changes no stored data.
