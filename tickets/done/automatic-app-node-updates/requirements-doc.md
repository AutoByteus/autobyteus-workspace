# Requirements Document — automatic-app-node-updates (autobyteus-356)

## Document Status
- Status: **Approved**. Current solution revision ID: `SR-004`.
- Approved by and reference:
  - **DEC-001: the user**, 2026-11-01, in this conversation: "once its downloaded then its intall immediately not 30
    minutes please" (option A).
  - DEC-002 and DEC-003: the Solution Designer within the direction (the user's Task comment of 2026-11-01: "just like
    the setting for … the agent package or skill, no need to ask, just a normal setting"). The user is informed in the
    message that records DEC-001.
  - SR-004 sharpening (REQ-002 "download is done", REQ-004 reason, AC-002, AC-005): the Solution Designer within the
    direction, 2026-11-02, with the user informed. It adds no condition or wait of choice; see DEC-001.
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), Task
  `autobyteus-356`, 2026-11-01. The user's words: "I want to have this automatic update and restart feature for the
  app, the desktop application and the server itself as well … I enable this, just like runtime … when there's a new
  beta release, or agent server package, it automatically updates."
- Workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/automatic-app-node-updates`, branch
  `codex/automatic-app-node-updates`, base `origin/personal` @ `3b9dc912a1`.
- Behavior-defining supplements: none.

## Problem And Desired Outcome
- **Problem:** the app and Docker nodes update only on a click. Agent packages, skill sources and runtimes already
  have an "Update automatically" switch (F-01); the app and the node server do not.
- **Desired outcome:**
  - with the app switch on, a new release on the user's channel is downloaded, installed, and the app restarts by
    itself, at once after the download;
  - each Docker node with its switch on follows the desktop to the same version;
  - with the switches off, nothing changes;
  - busy agents continue after the restart (autobyteus-285, F-05).
- **Observable success:** on an isolated app and a real test Docker node, a new release appears; with the switches on,
  both end on the new version without a click, and they say "Updated automatically to …"; with them off, nothing
  happens; a failed update leaves the old version running.

## Relevant Current And Desired Behavior
| ID | Kind | Current (evidence) | Desired | Preserved |
| --- | --- | --- | --- | --- |
| BEH-001 | User | The app checks on a schedule and shows a waiting row; Download and "Install update and restart" are clicks (F-02) | With the app switch on, both happen without a click | Off: today's behavior exactly |
| BEH-002 | User | A Docker node updates in place only when the user clicks "Update to <version>" on the Nodes page (F-03) | With the node's switch on, the desktop asks for that update itself | The node's own verify, trial and rollback (305) |
| BEH-003 | System | The app row and node line show manual outcomes | Automatic outcomes say "Updated automatically to <version>" or "Automatic update failed. Nothing was changed." | The manual wording |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases
| ID | Use case |
| --- | --- |
| UC-001 | The user turns on "Update automatically" for the desktop app; new releases on the channel install by themselves |
| UC-002 | The user turns on "Update automatically" for one Docker node; it follows the desktop's version |
| UC-003 | The user sees what an automatic update did, or why it failed |

### Out Of Scope
- A node updating itself from a release channel without a desktop (DEC-003 B).
- A timing window or idle wait for the app restart (DEC-001: install at once).
- Cancelling a download that already started.
- Notification Center rows for node server updates (the outcome is on the node's Nodes-page row; FU candidate).
- Desktop-to-node compatibility across versions (DESIGN rule 9).

### Non-Goals
- Downgrades. The app never installs an older version (`allowDowngrade = false`, `appUpdater.ts:326`), and a node is
  updated only when the desktop's version is newer.

### Preserved Behavior Boundary
The manual app update flow; the channel switch and its lock; the update check schedule; the node in-place update
contract C1 (frozen); the node's verify, trial and rollback; agent-package, skill-source and runtime switches.

### Prerequisites
None. 284, 339 and 285 are merged (F-05).

### Review Authority
Findings must cite a REQ, AC or BEH ID. New behavior is a `Requirement Gap` for the Solution Designer.

## Requirements
| ID | Requirement | Behavior | Source |
| --- | --- | --- | --- |
| REQ-001 | **App switch.** An "Update automatically" switch for the desktop app, **off by default**, with no confirmation question. Off: today's behavior | BEH-001 | Task; the user's standing rule; Task comment |
| REQ-002 | **Automatic install.** With it on, when a check finds a newer release on the app's channel (DEC-002), the app downloads it, and **as soon as the download is done** installs it and restarts (DEC-001), without a click. On macOS the download is done when the system updater has its verified copy and the update is ready to install (about 36 s more when idle); the app and its server keep working until then. The embedded server is updated with it. Turning the switch on while an update is found or downloaded continues that update the same way | BEH-001 | Task; DEC-001 |
| REQ-003 | **Node switch.** Each Docker node has an "Update automatically" switch, off by default. With it on, the desktop updates the node **to the desktop's version** whenever the node's version is older (DEC-003), through the node's in-place update (signed, verified, rolled back on failure) | BEH-002 | Task; DESIGN rule 9 |
| REQ-004 | **Failure.** A failed download, verification, install or trial leaves the old version running and shows "Automatic update failed. Nothing was changed." with a plain reason (never raw system text) and does not say "try again" for a version that will not be retried. A failed download is tried again at the next scheduled check. A version whose install or trial failed is **not** installed automatically again; a newer version or the user's click can still install | BEH-003 | Task; restart-loop risk |
| REQ-005 | **Outcomes.** After an automatic app update, the app's row says "Updated automatically to <version>" (new until seen); a node's row says the same for the node | BEH-003 | Existing outcomes (F-01) |
| REQ-006 | **Nothing to agents.** No agent can turn the switches on or start an update: both switches are kept by the desktop, not by any server | — | Task |

## Acceptance Criteria
| ID | Criterion | REQ |
| --- | --- | --- |
| AC-001 | A fresh profile shows both switches off; with them off, a found release and an older node behave exactly as today (no download, no install, no node request) | REQ-001, REQ-003 |
| AC-002 | App switch on, a newer release on the test feed: the app downloads it, installs it and restarts by itself, without a click; after the restart it runs the new version and the row says "Updated automatically to <version>", new until seen. This also holds on a busy machine (a normal scenario; no idle precondition) | REQ-002, REQ-005 |
| AC-003 | Busy agents at that automatic restart resume after it (285 path), when the version being replaced has the recorder | REQ-002 |
| AC-004 | Node switch on, the node older than the desktop: the desktop requests the update to its own version, the node ends on it, and its row says "Updated automatically to <version>". A node at the same or a newer version gets no request | REQ-003, REQ-005 |
| AC-005 | Failures: a failed app download shows the failure row and is tried again at the next check; a failed app install leaves the old version running and is not tried again for that version; an update the system updater refuses before the install starts leaves the app and its server running, with no restart; a node trial that rolls back shows the failure with the node's reason and is not tried again for that version; an unreachable node is tried again later | REQ-004 |
| AC-006 | No server setting, GraphQL field, REST route or agent tool reads or writes either switch | REQ-006 |

## Decisions
| ID | Question | Decision | Owner | Status |
| --- | --- | --- | --- | --- |
| DEC-001 | When may the app install and restart by itself? | **(A) As soon as the download is done.** The options were also (B) after 30 minutes without keyboard or mouse use, (C) only at night, (D) only at quit. **On macOS (SR-004)** "done" includes the system updater's copy; that step takes time but is not a condition or a chosen wait, so the user's decision stands | **The user**: "once its downloaded then its intall immediately not 30 minutes please" | Approved |
| DEC-002 | Which releases count? | The app's existing channel setting (stable or beta); nodes follow the desktop, so they need no channel of their own | Solution Designer (Task comment: "just a normal setting, no need to ask") | Decided |
| DEC-003 | How do Docker nodes stay on the desktop's version? | (A) The desktop updates each node whose switch is on to its own version when the node is older. Not (B), each node updating itself from the channel, which lets a node move ahead of the desktop. Cost of A: a node updates only while a desktop is running | Solution Designer (within the Task's constraint, DESIGN rule 9) | Decided |

## Assumptions
- The test Docker node is a starter node with in-place update available (305).
- Install failures at the operating-system level are rare; the one-attempt rule (REQ-004) bounds a loop if they recur.

## Readiness Check
Approved (SR-002). Design: `design-spec.md`.
