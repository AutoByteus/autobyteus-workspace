# Requirements Document

## Document Status

- Status: `Approved` for FU-009, FU-002, FU-003 and FU-005…FU-008 (Solution Designer within the direction; user informed 2026-11-21). FU-004 waits for the founder (DEC-004).
- Current solution revision ID: `SR-002`
- Package identifier: `memory-follow-ups-576` (autobyteus-576)
- Request: Project Task autobyteus-576 (the autobyteus-554 follow-ups FU-002…FU-009, merged at the founder's instruction on 2026-11-21)
- Requested by: `/project_task_manager` (`project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`)
- Requirements owner: Solution Designer
- Date: 2026-11-21
- Evidence: `tickets/done/semantic-memory-for-every-agent/follow-ups.md` and its evidence; `investigation-notes.md`

## Problem And Desired Outcome

Eight follow-ups of autobyteus-554:
- FU-009 is a naming defect that blocks the next release.
- FU-002 and FU-003 are UI defects.
- FU-004 is about imported older-layout data.
- FU-005…FU-008 make tests and probes reliable.

Done means each item is fixed, or decided, and tested.

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| UC | Item |
| --- | --- |
| UC-001 | FU-009: agent definition folder names keep their full encoded name up to 255 bytes |
| UC-002 | FU-002: a relative link in a Markdown preview opens the linked file of the same workspace |
| UC-003 | FU-003: workspace menus offer only real workspaces; a transient skill workspace is always released |
| UC-004 | FU-004: older-layout imported teams (per DEC-004) |
| UC-005 | FU-005, FU-006, FU-007: E2E tests that do not fail for the wrong reason |
| UC-006 | FU-008: runtime capability probes report what really happened |

### Out Of Scope

- FU-001 (`autobyteus-agents-128`).
- Changing a released folder name: none exists yet (autobyteus-554 is not released).
- Restarting `fseventsd` on the founder's Mac.

### Prerequisites

None.

## Requirements

| REQ | Requirement | Source |
| --- | --- | --- |
| REQ-001 | An agent definition's folder name (semantic and episodic) is `encodeURIComponent(id)` whenever it is at most 255 bytes, the file-name limit. Only longer ids get the shortened form (its first 120 bytes, `#`, 16 hex characters of SHA-256). DEC-016 of autobyteus-554, the docs, the unit tests and the 554 release note say 255 | FU-009; Task priority 1 |
| REQ-002 | In the Files panel's Markdown preview (Skills page, workspaces, the read-only semantic memory view), clicking a relative link opens the file it names, relative to the document, in the same workspace, as a preview tab. A `#fragment` is ignored for the file part. A link that resolves outside the workspace root, or to a missing file, opens nothing and shows the viewer's existing message. Absolute URLs and `#heading` links behave as today. Previews that are not workspace files (node files, chat messages) behave as today | FU-002 |
| REQ-003 | The chat / Run Settings workspace menu and the mobile launch picker list only workspaces of kind `filesystem` and `temp`, as the run-history sidebar does. A skill workspace registered by the Skills page is released when the page unmounts, also when it unmounts before the registration finished | FU-003 |
| REQ-004 | Per DEC-004 | FU-004 |
| REQ-005 | `package-personal-settings.e2e.test.ts` restores real timers before closing the server, so its `afterAll` finishes within the hook limit | FU-005 |
| REQ-006 | SM-12 makes the agent's folder uncreatable in a way that also binds a root process: a regular file at the agent folder's path. It asserts the run starts without that section and the warning names the agent and the reason | FU-006 |
| REQ-007 | DCF-E2E-007's failure is reproduced and its cause found. If it is the test's fixed 300 ms wait meeting a slow file-event service, the test waits for the watcher's detection of the write (TESTING.md "File watching on a busy Mac", `tests/helpers/os-latency-under-load.ts`) before asserting that the lookup applies it. If it is product code, that is fixed. The cause is recorded | FU-007 |
| REQ-008 | The Antigravity and Grok capability probes:<br>• when their time bound fires after the child has already exited, wait for its `close` and use its real result;<br>• when a probe really times out, report a time-out, never "unsupported CLI";<br>• log the command and the bound with the time-out | FU-008 |

## Acceptance Criteria

| AC | REQ | Outcome | Verification |
| --- | --- | --- | --- |
| AC-001 | REQ-001 | An id encoding to 255 bytes keeps the full name, and one encoding to 256 bytes gets the shortened form; the semantic folder, the episodic folder and the `semantic_ws_` lookup agree; the docs and the release note say 255 | Unit |
| AC-002 | REQ-002 | In a workspace with `a/index.md` linking `../b/c.md#x`, clicking the link opens `b/c.md` in a preview tab. A link to `../../outside.md` (outside the root) opens nothing. A link to a missing file shows the viewer's message. In the read-only semantic memory view, links open preview tabs and nothing becomes editable. External and `#heading` links behave as before | Web unit + UI probe |
| AC-003 | REQ-003 | With a skill workspace registered, the workspace menu and the mobile launch picker do not list it. Leaving the Skills page mid-load leaves no registered skill workspace | Web unit |
| AC-004 | REQ-004 | Per DEC-004 | — |
| AC-005 | REQ-005 | The file passes alone three times in a row on this host | API/E2E |
| AC-006 | REQ-006 | SM-12 passes as a normal user. Its setup no longer depends on permission bits | API/E2E |
| AC-007 | REQ-007 | The cause is recorded with evidence (IMP-08). DCF-E2E-007 passes on a host whose OS delivers file events (Linux run recorded). On a host whose FSEvents delivers no event at all (an independent raw `fs.watch` also gets none), the test fails only with its named `ENVIRONMENT` reason, never as a product assertion (DEC-005) | API/E2E |
| AC-008 | REQ-008 | Unit, built in the real order: a real child (`node -e ""`) exits while the main thread is blocked longer than the bound, so its exit is delivered after the timer callback starts; the probe returns the child's real result. A child that never exits gives a time-out naming the command and the bound (Grok: not `GROK_CLI_UNSUPPORTED`). E2E: the Grok catalog case (API-05) and SM-04 pass under load | Unit + API/E2E |

## Decisions

| DEC | Question | Reasoning And Recommendation | Owner | Status |
| --- | --- | --- | --- | --- |
| DEC-001 | Folder-name limit | 255 bytes is the real limit, so 200 needlessly renamed ids of 201–255 bytes. autobyteus-554 is not released, so no shortened name exists in the wild; no migration. | Solution Designer | Decided |
| DEC-002 | How a relative link opens | Open as a preview tab in the same workspace: consistent with clicking a file in the tree, and safe in the read-only view. Links outside the root open nothing (workspace confinement). | Solution Designer | Decided |
| DEC-003 | Which workspaces the menus offer | Only `filesystem` and `temp`, the run-history sidebar's rule. Skill and semantic memory workspaces are views, not places to run. | Solution Designer | Decided |
| DEC-005 | AC-007 on a host whose file events do not arrive (CRR-001) | The founder's Mac's `fseventsd` (160–167% CPU, 23.8 GB earlier) delivers no event within 30 s, even to a raw `fs.watch`. The cause is the host, not the code, and the test now says so by name. The proof is a pass where events arrive (Linux) plus the named failure here. Waiting for a working host would block the Task on something only a root restart of `fseventsd` or a reboot fixes; that is recommended to the founder, but not required. | Solution Designer (within the direction; user informed) | Decided |
| DEC-004 | Older-layout imported teams | Options: (a) no code change: the Docker node, once updated, converts its own data at startup and the next sync imports the current layout; (b) the Memory page reads older layouts for imports (permanent compatibility readers, against DESIGN.md rule 8 and the Data Migration Guideline). The import was last synced on 2026-11-08 and holds older-layout files (`team_communication_messages.json`, `task_delegation_records.json`). Recommendation: (a). | User | Needs user |
