## The server stops quickly, also on a busy Mac

- Quitting the desktop app, or stopping a node, no longer waits seconds for the server to stop while macOS is busy watching files. The server ends its agent-package and skill folder watching at once and lets the exit release the watches; in our checks a built server stopped in about 50 milliseconds, where before it could take several seconds and sometimes over 10, ending with "forcing exit".
- Nothing changes while the server runs: a package or skill folder that is removed or replaced still has its watch released as before.
