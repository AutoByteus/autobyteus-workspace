# API/E2E Coverage Investigation — desktop-node-file-open-471 (autobyteus-471): the desktop opens node files; a remote run's path names its node; no phone size limit

The plan. Results, confidence and the broader-validation decision are in `api-e2e-execution-coverage-report.md`.

## Investigation Meta

- Requirements Doc: `tickets/in-progress/desktop-node-file-open-471/requirements-doc.md` (SR-002, approved by the user 2026-11-11; REQ-001…004, AC-001…005)
- Investigation Notes: `tickets/in-progress/desktop-node-file-open-471/investigation-notes.md`
- Solution Revision Record: `tickets/in-progress/desktop-node-file-open-471/solution-revision-record.md` (SR-002)
- Design Spec: `tickets/in-progress/desktop-node-file-open-471/design-spec.md` (DS-001…003)
- Supplemental Task Artifacts: `autobyteus-server-ts/docs/design/node_access_model.md` (NAS-39, unchanged)
- Design Review Report: N/A (direct route)
- Implementation Handoff: `tickets/in-progress/desktop-node-file-open-471/implementation-handoff.md` (IR-001)
- Implementation Revision Record: `tickets/in-progress/desktop-node-file-open-471/implementation-revision-record.md`
- Code Review Report: N/A (direct route)
- API/E2E Revision Record: `tickets/in-progress/desktop-node-file-open-471/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- Current Investigation Round: 1
- Trigger: Implementation Engineer, IR-001, code `2e2b9ed436`, handoff commit `08d804cbb9` (base `origin/personal` @ `827f1e68dc`)
- Prior Investigation Reviewed: none
- Latest Authoritative Investigation: this document, round 1

## Current Requirement And Design Basis

In a desktop window that is not the embedded one (a window on a Docker or remote node, or an embedded window without the local-file capability), a click on an absolute path in a conversation opens it read-only in the Files panel: inside the run's folder as a workspace file (unchanged), anywhere else on the run's node through `GET /rest/node-files/content` (436) with the window's owner credential, read by one shared loader (`utils/fileExplorer/nodeFileContent.ts`) that the phone also uses. Text becomes content; anything else an object URL the store revokes on every close path and on reload. Refusals read "This file was not found on the computer." / "This path is a folder, not a file." / "The file preview could not be opened." A path in a run another node runs says "This file is on <node>, where this run runs." on the desktop and the phone; the host-workspace text is gone. The phone shows a text file of any size. The embedded window's local files and the phone's node files are unchanged.

## Supported Scenarios And Real Usage

- From the requirements: UC-001 (desktop opens a node file read-only), UC-002 (plain reasons on desktop and phone), UC-003 (big text file on the phone).
- Real-use scenarios added:
  - RU-01: the user's own setup: an AutoByteus desktop app connected to a Docker node by a setup code (NA-5), the node's window open, an agent there names files in the container (its shared folder and elsewhere).
  - RU-02: in that window, the user opens several node files one after another, closes them and reopens one (object URLs, RSK-002).
  - RU-03: a run the Docker node delegated to another node (a remote run, shown under its delegating run in that window); its conversation names a path on that other node.
  - RU-04: a PDF and a media file (audio) named by the agent, which go through the object-URL path.
- Technically possible but unsupported: none recorded.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 desktop node file | Changed | DS-001, REQ-001/002 | Electron + Docker journey |
| BEH-004 remote-run message | Changed | DS-002, REQ-003 | desktop window journey; phone MSP-29 |
| BEH-005 phone big file | Changed | REQ-004 | MSP-16 |
| BEH-002 embedded local files, BEH-003 phone node files, inside-folder | Preserved | AC-005 | packaged probe; desktop file probes; full phone probe |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Frontend component / state | Yes | link handler, Files panel store, tabs, phone viewer | IMP-02 (unit/component) | real window kind decision, real credential | Electron |
| Browser integration / user journey | Yes | Files panel in a non-embedded window; phone | IMP-06b (MSP-16, 29, 37 in a browser with the probe's credential) | the Electron main process attaching the owner credential; a Docker node's filesystem | Electron + Docker |
| Desktop renderer in Electron | Yes | the node window of the packaged app | none | window kind, credential attachment, CSP for blob URLs in `file://` renderer | isolated instance |
| Desktop shell / Electron main | No (unchanged) | — | — | — | — |
| API / transport | No (436 route unchanged) | — | — | — | — |
| Persisted data | No | — | — | — | — |
| External integration | Yes (consumer) | Docker node filesystem through the route | none | container paths and permissions | test-owned container |

## Project Execution Discovery

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/desktop-node-file-open-471`, branch `codex/desktop-node-file-open-471`
- Testing guideline: `TESTING.md` (root); `docs/isolated-app-instances.md`
- Conflicting instructions: none
- Changed build-input paths (`git diff --name-only 827f1e68dc...HEAD` against TESTING.md's list): `None` (autobyteus-web source, specs, probes, docs; no manifest, config, script or workflow; no new workspace-package import) → no fresh-start build case
- Secrets: N/A (scripted AGY runtime; no provider calls)

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `TESTING.md` | testing guideline | Isolated desktop instance for a full real-product journey; Docker server nodes (test-owned container, this worktree's server package, `docker rm -f -v`); probes with fresh `--output-dir`; one heavy run at a time; clean env |
| `docs/isolated-app-instances.md` | isolated instance | `isolated-app start --from-worktree|--build`, CDP attach-only on `controlPort`, `stop <instanceId>` |
| `scripts/public/docker/autobyteus-docker.d/bash/commands.sh` | setup code | `docker exec <c> node -e <client> /home/autobyteus/data/node-access/local-control.sock` (the launcher's own client) |
| `autobyteus-server-ts/docs/design/node_access_model.md` | NA-5 | a desktop gets an owner credential for a Docker node only for a setup code |

| Component / Dependency | Start / Setup | Readiness | Stop / Cleanup |
| --- | --- | --- | --- |
| Server `dist` (host node B) | current (`dist/app.js` 13:55, no server change in this ticket) | `/rest/health` | SIGTERM, temp root removed |
| Test image `abtest471/autobyteus-server:test` | `autobyteus/autobyteus-server:beta` + `docker buildx … --target server-package` of this worktree | — | `docker image rm` |
| Docker node A | `docker run` from the test image, `127.0.0.1:<free port>`, fresh volumes, scripted AGY CLI mounted read-only, a probe launch credential for setup data | `/rest/health` | `docker rm -f -v` |
| Isolated desktop instance | `isolated-app start --from-worktree` after the packaged build of API-03 (`--build`) | start's JSON | `isolated-app stop <id>` |
| docker CLI | guarded wrapper refusing mutating commands on `autobyteus-server-0/1/2` | — | removed |

| Data / Fixture / Identity Need | Method | Safety | Cleanup |
| --- | --- | --- | --- |
| the desktop's owner credential for A | setup code from A's local control socket, entered in the Nodes page (as the user does) | code read from a file, never printed | container removed |
| the probe's credential for A and B | launch credential (`probe-node-access.mjs`-style), for creating agents, runs and messages | redacted | removed with the nodes |
| files | test-made files in the container (shared folder and `/srv/abtest471`), a chmod-000 file, a folder | — | removed with the container |

## Existing Durable Coverage Inventory

| Path / Test | Current Assertion Or Intent | Related | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| nine 471 specs (`nodeFileContent`, `fileExplorerNodeRouting`, `FileExplorerTabs`, `WorkspaceToolShell`, `useEventMonitorFilePreview(.mobileBoundary)`, `useMobileNodeFile`, `useMobileAttachmentOpening`, `MobileFileViewer`) | loader, routing, object-URL release, refusal wording, remote-run message, no limit | AC-001…004 | Still Valid | IMP-02 | Reuse |
| `mobile-file-open-cases.mjs` MSP-37 | non-embedded desktop window opens node files with the owner credential | AC-001, AC-002 | Still Valid | IMP-06b | Reuse; the Electron journey adds the real window |
| `mobile-shell-probe.mjs` MSP-16 (big file), MSP-29 (remote-run toast) | AC-004, AC-003 phone | Still Valid | IMP-06b | Reuse; rerun in the full probe |
| `mobile-shell-probe.mjs` MSP-38 (renumbered from the second MSP-32) | autobyteus-9 model sheet | — | Still Valid (ID only) | `c686acfaff` | full probe |
| `event-monitor-file-preview-probe.mjs` | packaged embedded window opens local files; negative text check now `where this run runs` | AC-005 | Still Valid | — | Run |
| other MSP cases, `search-pdf-preview`, `file-explorer-pending-save-draft` | phone features, desktop file viewing, unsaved drafts in the Files panel (the store changed) | AC-005 | Still Valid | — | Run |

## Planned Cases

| Case ID | Criteria | Boundary / Surface | Kind | Planned Command Or Steps | Why |
| --- | --- | --- | --- | --- | --- |
| R-IMP | AC-002…AC-004 (component), AC-001/002 (MSP-37 browser), AC-003/004 (MSP-16, 29), AC-003 grep | web | Reused | IMP-01…05 (`7917df2a15`; later commits change probe files only), IMP-06b and IMP-07 (`2e2b9ed436` = code under test; HEAD adds docs) | ran on the code under test |
| API-01 | AC-001, AC-002 (missing, folder, unreadable), RU-01, RU-02, RU-04; preserved inside-folder | packaged app's window on a test-owned Docker node | Temporary Probe | isolated instance; Docker node A (this worktree's server package, scripted AGY); Nodes page: add `http://127.0.0.1:<port>`, enter a setup code; open A's window; a run on A whose own message links: Markdown and PNG in `/home/autobyteus/shared`, a PDF and a WAV in `/srv/abtest471`, a file inside the run's folder, a missing path, a folder, a chmod-000 file; click each; read-only check (typing changes nothing); open/close/reopen with `URL.createObjectURL`/`revokeObjectURL` counted | AC-001's stated check; the real window, credential and container |
| API-02 | AC-003 (desktop) | the same window; a remote run | Temporary Probe | host node B (`dist/app.js`, scripted AGY, temp root) paired with A by invite; A's run delegates to B (`CALL_TOOL delegate_task`); a message with a path link and a path attachment in B's run; in A's window open the remote run and click both | the desktop remote-run message in a real window (unit-covered only so far) |
| API-03 | AC-005 (embedded window) | packaged app | Existing Test | `pnpm -C autobyteus-web test:e2e:event-monitor-file-preview` (builds the packaged app) | the embedded window's local-file path and the changed negative check |
| API-04 | AC-005 (desktop files) | browser probes | Existing Test | `test:e2e:file-explorer-pending-save-draft`, `test:e2e:search-pdf-preview` | the Files panel store changed (`_openFileWithMode`, close paths) |
| API-05 | AC-003, AC-004, AC-005 (phone); assumption 6 | phone bundle, all MSP cases | Existing Test | `env -i … pnpm -C autobyteus-web test:e2e:mobile-shell --output-dir=…` | every phone case after the shared loader moved; the duplicate-ID fix lets the whole probe run |

- Added during execution (round 1): RU-05, a path attachment (a message's attached file path, as the desktop composer sends it) in the same window, for a run on the window's node and for the remote run (API-01 D7–D9, API-02 D5–D6). Reason: REQ-003 names path attachments, and the attachment chip opens through the same Files panel store as a link (`UserMessage.vue` → `fileExplorerStore.openFilePreview`).
- Test progress log needed: `Yes`

## Durable Coverage To Add / Update / Remove

None planned. API-01/02 depend on Docker, a packaged build and machine-specific state (temporary probes kept in the evidence); MSP-37 is the durable browser case for the same Files panel path.

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Only The User Can Check? | Follow-Up |
| --- | --- | --- | --- | --- |
| Windows and Linux desktop | macOS host only | low (renderer code) | No | — |
| A very large text file on a real low-end phone (RSK-001, accepted) | no device | speed only | Yes | — |

## Ambiguities Or Reroute Triggers

None.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `No` (unless a run shows a need)
- Reroute Required Before Validation Execution: `No`
