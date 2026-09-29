# Release Notes — Runtime stop cleanup and Org recovery

## Fixed

- **Stopping an Antigravity (AGY) agent now also stops the dev servers and other background commands it started.** This applies to Stop, Terminate of a run, Team or Org, and quitting the app or server. Orphaned processes no longer keep running and holding ports. A normal turn end still leaves those commands running, so a dev server keeps working between turns.
- **A crashed member no longer makes an Agent Org or Team unrecoverable.**
  - Terminate now succeeds even when a member's runtime has died.
  - The next message restores the Org or Team with its history.
  - Restore no longer fails with "already active".
- **You can message a crashed member of a running Org directly again.** It continues its previous conversation, and the other members are unaffected.

## Known limitations

- If AGY itself crashes, commands it had moved to the background are not cleaned up.
- The following are not covered: commands that deliberately detach (for example `setsid`, Docker containers or system services), and Windows.
- A daemon that ignores SIGTERM can outlive an app quit.
- A force-killed app leaves AGY and its commands running.
- Terminating an Org or Team that is already stopped still reports "not found" and changes nothing.
