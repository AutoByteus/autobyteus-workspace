# API/E2E Revision Record — autobyteus-269 (a remote run's title)

| Revision | Trigger | Code validated | Investigation round | Result | Durable coverage | Key evidence | Next |
| --- | --- | --- | --- | --- | --- | --- | --- |
| API-REV-001 | IR-001, direct route (Small / Low) | `05be574608` (handoff `d08cd902a9`) | 1 | **Fail**: F-001 (Medium), the active peer-started Agent run's sidebar row shows the packet wrapper (the window replaces the stored title with the first `user` message; the packet is a `user` message). The server title passes: two-server E2E 30/30. Confidence 90% | RC-05, RC-21, RC-22 title checks; RC-30 new | `API-03-browser-journey.log`, `API-03-beta-sidebar-active-runs.png`, `API-01-run1/` | Code reviewer: failure-origin review (preliminary Design Impact, Solution Designer) |
