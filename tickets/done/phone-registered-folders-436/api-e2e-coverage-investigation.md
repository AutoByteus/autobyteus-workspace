# API/E2E Coverage Investigation — phone-registered-folders-436 (autobyteus-436): the phone opens any file a conversation names, read-only

The plan. Results, confidence and the broader-validation decision are in `api-e2e-execution-coverage-report.md`.

## Investigation Meta

- Requirements Doc: `tickets/in-progress/phone-registered-folders-436/requirements-doc.md` (SR-004 baseline, approved by the user 2026-11-09; REQ-001…006, AC-001…006)
- Investigation Notes: `tickets/in-progress/phone-registered-folders-436/investigation-notes.md`
- Solution Revision Record: `tickets/in-progress/phone-registered-folders-436/solution-revision-record.md` (SR-005)
- Design Spec: `tickets/in-progress/phone-registered-folders-436/design-spec.md`
- Supplemental Task Artifacts: `autobyteus-server-ts/docs/design/node_access_model.md` (NAS-39, NAS-40, §5); `probes/`
- Design Review Report: `tickets/in-progress/phone-registered-folders-436/design-review-report.md` (ARCH-REV-001, Pass; R-1…R-3)
- Architecture Review Revision Record: `tickets/in-progress/phone-registered-folders-436/architecture-review-revision-record.md`
- Implementation Handoff: `tickets/in-progress/phone-registered-folders-436/implementation-handoff.md` (IR-001)
- Implementation Revision Record: `tickets/in-progress/phone-registered-folders-436/implementation-revision-record.md`
- Code Review Report: `tickets/in-progress/phone-registered-folders-436/code-review-report.md` (CRR-001, Pass, residual C-03)
- Code Review Revision Record: `tickets/in-progress/phone-registered-folders-436/code-review-revision-record.md`
- Delivery Revision Record: N/A
- API/E2E Revision Record: `tickets/in-progress/phone-registered-folders-436/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- Current Investigation Round: 1
- Trigger: Code Reviewer CRR-001 Pass, HEAD `ea51d4fddd` (base `origin/personal` @ `97ed263074`)
- Prior Investigation Reviewed: none
- Latest Authoritative Investigation: this document, round 1

## Current Requirement And Design Basis

A new read-only node route `GET /rest/node-files/content?path=<absolute>` serves one regular file (real path resolved, opened read-only, `fstat` of the opened handle, streamed through `sendUserFile`) to owner and phone credentials only (explicit permission row, NAS-40); refusals 400 `NODE_FILE_PATH_INVALID` / `NODE_FILE_IS_FOLDER` / `NODE_FILE_UNREADABLE`, 404 `NODE_FILE_NOT_FOUND`, no path in logs. On the phone, a tapped absolute path outside the open run's folder opens on the Files screen (`screen=files&nodeFile=<path>`) through `useMobileNodeFile` (one `authorizedFetch`, blob for non-text), with the REQ-004 messages; inside the run's folder as before; a remote run's link keeps "available only on the host" (assumption 4, accepted by CRR-001). On a Docker node paths are the container's (REQ-006). Everything from autobyteus-437 is preserved.

## Supported Scenarios And Real Usage

- Designer scenarios covered: SCN-001 (open a named file anywhere), SCN-002 (missing / folder messages), SCN-003 (route contract, other client kinds refused).
- Real-use scenarios added: RU-01 the phone paired with a Docker node over Tailscale (the launcher publishes there) opens a file in the node's shared folder; RU-02 a path that exists on the host but is not mounted into the container; RU-03 a file the node's user cannot read; RU-04 a large PDF opened on the phone (RSK-001).
- Technically possible but unsupported: none recorded.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 phone link outside the run's folder | Changed | DS-001 | full phone shell probe; Docker phone journey |
| BEH-002 node-file route | Added | DS-002, NAS-39/40 | reused server e2e; Docker container paths; unreadable file |
| BEH-003, BEH-004 phone features, desktop file opening | Preserved | — | full phone probe; desktop file probes; server e2e suite |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | `NodeFileReader` | IMP-03 unit | — | — |
| API / transport / contract | Yes | new GET route, gate row | IMP-05 e2e (NAS-39/40) | a container's filesystem; EACCES on a real file | Docker probe; host probe |
| Frontend component / state | Yes | phone link handler, navigation, viewer | IMP-07 specs | — | — |
| Browser integration / user journey | Yes | phone bundle | IMP-09 (MSP-16/17 only) | the other 21 MSP cases | full phone shell probe |
| Authentication / session / permissions | Yes | owner+phone row | IMP-05 | — | — |
| Desktop renderer | No (unchanged branch) | — | IMP-07 | regression | desktop file probes |
| Desktop shell / Electron | No | — | — | — | — |
| Process / lifecycle | No | — | — | — | — |
| Persisted-data transition | No | — | — | — | — |
| Worker / distributed | No | — | — | — | — |
| External integration | Yes | Docker container filesystem | none | REQ-006 | Docker probe |

## Project Execution Discovery

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-registered-folders-436`, branch `codex/phone-registered-folders-436`
- Stack: as autobyteus-437 (server, Nuxt web + phone bundle, Docker launcher)
- Testing guideline: `TESTING.md` (root)
- Conflicting instructions: none
- Changed build-input paths: `None` (no manifest, lockfile, config, `scripts/**`, generated code or workflow changed) → no fresh-start build case
- Secrets: N/A

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `TESTING.md` | testing guideline | Browser probes (credential attached, fresh output dir); Docker server nodes (test-owned container, this worktree's server package, `docker rm -f -v`); one heavy run at a time; clean env for server E2E |
| `scripts/public/docker/…` | launcher | temp `AUTOBYTEUS_DOCKER_STATE_DIR`/`SHARED_WORKSPACE_DIR`; never `upgrade/stop/destroy --all` on the user's daemon; guarded docker wrapper |

| Component / Dependency | Start / Setup | Readiness | Stop / Cleanup |
| --- | --- | --- | --- |
| Server `dist`, phone bundle | built after the last source commit (05:15 / 04:53 vs `4603511bfb` 04:51) | — | — |
| Test Docker node | `docker buildx … --target server-package` → `abtest436/autobyteus-server:test`; this launcher `new-container` with temp state | `/rest/health` | `docker rm -f -v`, volumes, image |
| Host node (RU-03) | `dist/app.js` with a launch credential, `0.0.0.0` | health | SIGTERM, temp root removed |

| Data / Fixture / Identity Need | Method | Safety | Cleanup |
| --- | --- | --- | --- |
| owner credential on the Docker node | setup code from its local control socket, exchange | never printed | container removed |
| phone credential | Phone Access pairing through the phone UI (pairing link) | redacted | removed with the node |
| files | test-owned files in the shared folder, a host temp folder, a chmod-000 file | — | removed |

## Existing Durable Coverage Inventory

| Path / Test | Current Assertion Or Intent | Related | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `tests/e2e/node-files/node-files.e2e.test.ts` | NAS-39/40: owner/phone read, refusals, symlink, read-only, no log | AC-002, AC-003 | Still Valid | IMP-05 | Reuse |
| `tests/unit/node-files/node-file-reader.test.ts`, permission row test | reader rules, R-1 | REQ-002/003 | Still Valid | IMP-03 | Reuse |
| web specs (`useMobileNodeFile`, navigation, views, link handler incl. remote run) | phone open, messages, remote run keeps the host answer | AC-001, AC-004 | Still Valid | IMP-07 | Reuse |
| `mobile-shell-probe.mjs` MSP-16/17 | outside text/Markdown/image, missing, folder, read-only | AC-001, AC-004 | Still Valid | IMP-09 | Rerun as part of the full probe (AC-006) |
| other MSP cases, desktop file probes, server e2e | preserved behavior | AC-006 | Still Valid (not run since the change) | — | Run |

## Planned Cases

| Case ID | Criteria | Boundary / Surface | Kind | Planned Command Or Steps | Why |
| --- | --- | --- | --- | --- | --- |
| R-IMP | AC-002, AC-003, AC-004 (component), AC-001 (MSP-16/17) | server, web | Reused | IMP-01…10 | ran on `271656acc0`; HEAD `ea51d4fddd` adds only ticket docs |
| API-01 | AC-001, AC-004, AC-006 | phone bundle, every MSP case | Existing Test | `pnpm -C autobyteus-web test:e2e:mobile-shell --output-dir=…` (clean env) | AC-006 |
| API-02 | AC-005; REQ-006; RU-01, RU-02, RU-04 | Docker container + phone bundle served by it | Temporary Probe | test image with this branch's server; launcher `new-container` (temp state, temp shared folder); owner setup code; Phone Access pairing on the Tailscale address; phone opens `/home/autobyteus/shared/…` (Markdown, image, large PDF), an unmounted host path, a folder | Docker-specific; machine-specific addresses |
| API-03 | RU-03 (optional) | host node, real file permissions | Temporary Probe | node on `0.0.0.0`; phone credential; GET a chmod-000 file → 400 `NODE_FILE_UNREADABLE`; phone shows "The file preview could not be opened." | EACCES only reachable on a real filesystem as a non-root user |
| API-04 | AC-006 (desktop) | desktop file viewing | Existing Test | `test:e2e:event-monitor-file-preview`, `test:e2e:file-explorer-pending-save-draft`, `test:e2e:search-pdf-preview` | the desktop branch of the link handler and workspace file viewing |
| API-05 | AC-006 (server suites) | server E2E | Existing Test | `pnpm -C autobyteus-server-ts exec vitest run tests/e2e` (clean env) | the whole server E2E after the new route and row |

- Test progress log needed: `Yes`

## Durable Coverage To Add / Update / Remove

None planned (the implementation added the durable coverage; API-02/03 are machine-specific).

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Only The User Can Check? | Follow-Up |
| --- | --- | --- | --- | --- |
| C-03 Windows node: a folder path may answer "could not be opened" | no Windows host | message wording on Windows only | Yes (Windows) | — |
| A large PDF on a real phone (RSK-001 memory) | no real device here | memory on low-end phones | Yes | — |
| A remote run's link on the phone (assumption 4) | covered by the link-handler spec (`remoteRunIds`); a live remote run with an outside path needs scripted output naming a path on the peer | low | No | — |

## Ambiguities Or Reroute Triggers

None.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `No` (unless a run shows a need)
- Reroute Required Before Validation Execution: `No`
