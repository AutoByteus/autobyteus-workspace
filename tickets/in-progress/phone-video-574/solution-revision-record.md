# Solution Revision Record

## SR-001 (2026-11-24)

- Trigger: autobyteus-574 (absorbs autobyteus-636) from `/project_task_manager`, with the founder's screenshots (the re-download; a disabled fullscreen button).
- Prior status: N/A. Current status: requirements Approved.
- Findings (Measured with prototypes):
  - Service workers cannot serve iOS apps on user-chosen node addresses, and need `https`.
  - Android WebView interception fails on seek.
  - Native players stream, seek and cache with the credential only in a header (Android Media3; iOS AVPlayer with a resource loader).
- Approval: the user ("I trust your recommended solutions"): DEC-001 (b), the native player; DEC-002 (a), the per-playback credential handoff. DEC-003…005 are the Solution Designer's.
- Next: architecture design.
