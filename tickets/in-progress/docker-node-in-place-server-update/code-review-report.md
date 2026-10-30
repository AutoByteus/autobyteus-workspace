# Code Review Report — autobyteus-305, build step 3 (in-place update by command)

This report holds the latest result (step 3, CRR-005). The earlier results are in `code-review-revision-record.md`: step 1 (CRR-001/002) and step 2 (CRR-003/004). Steps 1 and 2 are merged (`origin/personal` base `6b34f900b6`).

## Review Round Meta

- Review Entry Point: `Implementation Review`
- Requirements Doc Reviewed As Context: `requirements-doc.md` (Approved, SR-003)
- Solution Revision Record Reviewed As Context: up to SR-010 (SR-009 step-3 delta: RU-23 `NO_PACKAGES_VOLUME`/`updateBlocker`, CR2-N1 launcher `status`)
- Design Spec Reviewed As Context: `design-spec.md` (SR-009): DS-001/002/006/007, Ownership Map, Interface table (C2, refusal codes), step 3
- Supplemental Task Artifacts Reviewed As Context: `handoff-step-3.md`, `follow-ups.md`
- Design Review Report Reviewed As Context: ARCH-REV-004 Pass (N-2 one gate rule for status and request; N-3 launcher against a node without a starter)
- Implementation Handoff Reviewed As Context: `implementation-handoff.md` (IR-003)
- Relevant revision IDs: SR-009/010, ARCH-REV-004, IR-003
- Code Review Revision Record: `code-review-revision-record.md`; Current Code Review Revision ID: `CRR-005`
- Current Review Round: `3` (first for step 3)
- Review Scope: `Full Re-Audit` of the step-3 delta. The change adds the update state machine, the verification chain, data copy and restore, the C2 request surface and launcher commands: 36 files, all beyond any prior finding.
- Prior Review Round Reviewed: CRR-003 (step 2, Pass), CRR-004 (tests, Not Applicable)
- Failure-origin fields: N/A

Code reviewed: worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/docker-node-in-place-server-update`, branch `codex/docker-node-in-place-server-update`, `6b34f900b6...a17033dc30` (code in `31df015657`, `4985104751`, `c72107a0fd`, `71604951d4`).

## Routing Classification Review

- `Large` / `High`, confirmed: the supply-chain path, data copy and restore, a process state machine across starter stops, a new frozen request surface, launchers in two shells.
- Selected route: `Implementation Review`; independent review required: `Yes`.

## Review Scope

- Reviewed:
  - starter `update-service.mjs`, `update-run.mjs`, `update-error.mjs`, `release-source.mjs`, `package-verifier.mjs`, `self-check.mjs`, `server-process.mjs`;
  - changes to `server-supervisor.mjs`, `package-store.mjs`, `data-copy.mjs`, `update-status.mjs`, `system-facts.mjs`, `starter-socket.mjs`, `cli.mjs`, `starter.mjs`, `starter-paths.mjs`;
  - `update-flow.test.mjs`; the C1 `updateBlocker` relay; the Dockerfile key copy;
  - launcher bash `node-update.sh`, `commands.sh`, `core.sh`; PowerShell `NodeUpdate.ps1`, `Commands.ps1`, `Core.ps1`; the entry module lists; `test_public_docker_launcher_update.py`; the docs.
- Context read: launcher helpers (`load_state`, `container_running`, `Read-NodeState`, `Test-ContainerRunning`), IMP3 evidence (06, 07, 08, 10, 01).
- Exclusions: the desktop (C1 POST, row) is step 4; resume is step 5.

## Upstream Behavior And Production-Path Basis Confirmation

- Behavior-basis status: `Confirmed`. No newly discovered behavior.

| Behavior / AC | Status | Implementation Path And Evidence |
| --- | --- | --- |
| BEH-003; REQ-001/002/004/009/015; AC-002, AC-008, AC-013 | Confirmed | `cli.mjs update` → C2 `POST /updates` → `UpdateService.request`. The gates are explicit refusals, with UPDATE_RUNNING re-checked after the async track resolution. Then `UpdateRun.#prepare` in design order: description → signature → binding (version, arch, asset name) → fit → needsCopy → space → download (size-capped) → SHA-256 → unpack (`.partial`) → package match → install → self-check. IMP3-06: same container and image ID across two updates |
| BEH-004; REQ-005; AC-003 | Confirmed | Every `#prepare` error goes to `#removeFiles` (leftovers and this version's package) and `#finish`; `state.json` is not touched before `beginUpdate`. IMP3-07: pid and state unchanged for each code |
| BEH-004; REQ-006; AC-004; DEC-005 | Confirmed | `#switch`: beginUpdate → stop → [space re-check, `take` into `.partial` then rename] → `beginTrial` → start → health ≤ 180 s, then alive 60 s → commit (state → delete copy → deleteOthers → endUpdate). Rollback: stop → restore → `rollBackTrial` → delete → discard → start old → endUpdate. This is the design's order. IMP3-08: migrated table gone after the rollback |
| DS-007 | Confirmed | `ServerSupervisor` modes: an exit while supervising resolves `supervisedExit`; during an update the exit is the step result. Before the point of no return a stop aborts the run (INTERRUPTED; SERVER_EXITED_DURING_UPDATE for a server exit); after it, the run halts and boot recovers. IMP3-08/10 |
| REQ-008; AC-005 | Confirmed | `checkFit` → NEEDS_NEW_IMAGE with `upgrade --all --tag <version>` |
| RU-23 (SR-009); N-2 | Confirmed | `nodeBlocker()` is the one rule: `request()` refuses with it and `status()` reports it as `updateBlocker`; C1 relays it. IMP3-09 |
| REQ-012; AC-006 | Confirmed | Recreation keeps installed 1.5.13 (IMP3-06) |
| REQ-013; AC-012 | Confirmed | Logs carry names, versions, codes, messages; IMP3-06 scan clean |
| DS-002; CR2-N1; N-3 | Confirmed | Launchers: track table as designed (`latest`/`latest-zh` → stable, `beta` → beta, pinned and custom images refused); `status` prints the starter line or "not available"; `update` follows the steps to the result |

## Supported Product Scenario And Reachability Gate (Mandatory)

| Scenario ID | Related IDs | Kind | Actor | Goal / Event | Entry | Shape | Forward Path | Outcome | Evidence | Validity | Use |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-002 | AC-002, AC-008 | Operational | Node owner | Update by command | `autobyteus-docker update`, `cli.mjs update` | Normal | above | New version, same container | IMP3-06 | Supported Normal | Use |
| SCN-003 | AC-003, AC-013 | System | — | Package does not verify or is missing | during an update | Explicit Edge | refusal before the stop | Nothing changes | IMP3-07 | Supported Explicit Edge | Use |
| SCN-004 | AC-004 | System | — | New version does not come up | after the switch | Explicit Edge | rollback | Old version on pre-update data | IMP3-07/08 | Supported Explicit Edge | Use |
| SCN-005 | AC-005 | System | — | Package needs a newer image | during an update | Explicit Edge | `checkFit` | Refused with the command | IMP3-07 | Supported Explicit Edge | Use |
| CR3-S1 | DS-007 rows | Operational | Owner / supervisord | Container stop or restart during an update | `docker stop`, `supervisorctl stop` | Explicit Edge (design table) | abort before the point of no return; halt after it, then boot recovery | Old version on intact data | IMP3-08/10 | Supported Explicit Edge | Use |
| CR3-S2 | RU-23 | Operational | Owner with an old launcher | Update a node recreated without its volume | `update` | Explicit Edge (SR-009) | `nodeBlocker` | Refused with the reinstall instruction | IMP3-09 | Supported Explicit Edge | Use |

### Candidate Finding And Mechanism Gate

| Candidate ID | Observation Or Mechanism | Scenario / Contract | Trigger | Path / Consequence | Evidence | Disposition | Scope | Reason / Response |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| CC-01 | Refused versus failed split | UpdateState (C2) | Every outcome | `refused` = nothing attempted or changed; `failed` = went wrong while doing it. NOT_ENOUGH_SPACE is refused before the stop and failed after it. An unexpected error is failed with `code: null` | `update-error.mjs`, `update-run.mjs` | Reject (as a defect) | — | Confirmed: one meaning per state, codes unchanged |
| CC-02 | Frozen step names `checking`, `downloading`, `preparing`, `restarting`, `confirming`, `rollingBack` | C2 frozen | — | Covers the design's row texts (Downloading / Checking / Preparing / Restarting…); self-check counts as `preparing` | `update-run.mjs` | Reject (as a defect) | — | Confirmed |
| CC-03 | Halt past the point of no return | DS-007 rows "updating … SIGTERM" | CR3-S1 | Checked for each await in `#switch`:<br>• during the stop of the old server: no trial is recorded, or `beginTrial` is written and the next `start()` is refused (`#closed`). Boot then runs the old version, or rolls back.<br>• during `take`: the `.partial` copy is deleted at boot.<br>• during confirm: shutdown stops the trial, the catch returns on `#halted`, and boot rolls back.<br>• during the rollback start: guarded by `#halted` and `#closed`.<br>Commit is synchronous, so a signal cannot split it | code; IMP3-08/10 | Reject (as a defect) | — | Confirmed: every recorded state has a boot recovery |
| CC-04 | Boot-time `deleteOthers` | DEC-013 | An update stopped after its download | Keeps the installed current and previous; runs before selection, with no server running. After a boot rollback it deletes the failed trial's package, so "not retried by itself" holds | `starter.mjs:120`, `package-store.mjs` | Reject (as a defect) | — | Confirmed |
| CC-05 | Status during the trial reports the trial's version and pid | C2/C1 | — | Truthful about what runs; `update.step` says `confirming`; a rollback re-sets the old version | `update-run.mjs:142,174` | Reject (as a defect) | — | Confirmed |
| CC-06 | Unpack with the image's `tar` | REQ-004 | — | Runs only after the archive's SHA-256 matched a signed description; `--no-same-owner`; GNU tar refuses `..` and absolute names by default; the result is then matched to the description | `package-store.mjs` | Reject (as a defect) | — | Confirmed: the trust anchor comes before the unpack |
| CC-07 | bash reads the CLI's JSON with the container's `node` and assigns only allow-listed field names (`printf -v`) | Launcher, no host JSON tool | — | No `eval`; values flattened to one line | `node-update.sh:20-31` | Reject (as a defect) | — | Confirmed |
| CC-08 | `AUTOBYTEUS_SERVER_PACKAGE_SOURCE` is read from the container environment in production images too | REQ-004 | Setting it in a production container | Only changes where bytes come from; signature and binding to the production key still decide | `starter.mjs:129` | Reject: no consequence | — | Signature is the trust anchor |
| CC-09 | SelfCheck failure detail: the candidate's output is discarded (`stdio: 'ignore'`), and the message says "no health answer within 120 s" even when the candidate exited at once | UC-003 "says what failed"; SCN-003 family | A package that fails its self-check (test package 1.5.20 shape) | Code `SELF_CHECK_FAILED` is right and nothing changes. The detail can be wrong, and the cause is not in any log. `#switch` already reports "exited with code N before answering", so SelfCheck is the one place without it | `self-check.mjs:46-52`; `server-process.mjs:62-76` | Promote, non-blocking | This ticket | CR3-N1: report the exit code when the candidate exited, and keep its output in the starter log (or its last lines) |
| CC-10 | Boot message after a halt during the rollback's restart of the old server reads "interrupted before the switch; nothing changed" | DS-003 cleanup | Stop during the ≤ 30 s port wait of a rollback | Outcome correct (old version, data restored); wording imprecise | `starter.mjs:114-116` | Reject: needs a stop timed within a rollback's port wait | — | — |
| CC-11 | A throw from the rollback itself (for example a spawn error starting the old server) leaves mode `updating`, so `supervisedExit` never resolves | DS-007 | Spawn failure of `node` | Not reachable in a working image; no supported trigger | `update-run.mjs:84,173` | Reject: Technically Possible but Unsupported/Contrived | — | — |
| CC-12 | `update_track_for_image_ref` reports a digest reference (`…@sha256:`) as "custom image" | DS-002 table | Saved IMAGE_REF with a digest | The launcher saves tag references; `--version` works anyway | `node-update.sh:35-54` | Reject | — | — |
| CC-13 | The beta track can name a release whose packages are still uploading | REQ-015 | Update right after a tag | NO_PACKAGE_FOR_VERSION (signature or description 404), nothing changes; the next attempt works | `release-source.mjs:38-50`; step-1 upload order | Reject (as a defect) | — | Explicit refusal, as designed |

## Structural / Design Checks

| Check | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Design health preserved | Pass | The server only relays an optional field; the starter owns the update | — |
| Matches behavior-defining artifacts | Pass | DS-006 order, rollback order, codes, C2 shapes, track table | — |
| Data-flow spine clarity | Pass | `UpdateRun` reads as DS-006 top to bottom; one owner calls each mechanism (no callbacks across collaborators: Case 1) | — |
| Ownership boundaries | Pass | `ServerSupervisor` is the only owner of the node's child. `SelfCheck` owns its candidate through the shared `server-process.mjs` (mechanism only, no policy). `UpdateService` is the one entry for both forms (Case 2) | — |
| Off-spine concerns | Pass | `ReleaseSource`, `PackageVerifier`, `DataCopy`, `system-facts` serve `UpdateRun` | — |
| Capability reuse | Pass | `server-process.mjs` extracted instead of duplicated; `release-version.mjs` reused | — |
| Reusable owned structures | Pass | One `UpdateError` (code and outcome); one `UpdateState` | — |
| Shared-structure tightness | Pass | `state.json` `{ current, previous, trial }`; `trial` adds `previous`, `dataCopy` | — |
| Repeated coordination | Pass | One gate rule (N-2) | — |
| Empty indirection | Pass | Socket and CLI stay thin | — |
| SoC / file responsibility | Pass | Largest `update-run.mjs` 202, `package-store.mjs` 186 lines | — |
| Dependency direction | Pass | Starter uses Node built-ins and the image's `tar` (recorded) | — |
| Authoritative Boundary Rule | Pass | `UpdateRun` reaches the child only through `beginUpdate`/`stop`/`start`/`endUpdate`; the launcher reaches the starter only through `cli.mjs` | — |
| File placement | Pass | Launcher `node-update.sh` / `NodeUpdate.ps1` mirror each other | — |
| Flat-vs-over-split | Pass | — | — |
| Interface clarity | Pass | C2 POST `{ version \| track, requestedFrom }`, exactly one of the two; 202/409; CLI exits 0/2/1 | — |
| Naming / one vocabulary | Pass | "update" (in place) versus "upgrade" (image) kept apart in commands and help | — |
| No unjustified duplication | Pass | Bash and PowerShell twins are the established launcher shape | — |
| Patch-on-patch complexity | Pass | The two `fix` commits close real defects that the implementation's own proof found, inside the owning code (halt; boot `deleteOthers`) | — |
| Dead code removed | Pass | The step-2 deferrals (D-2) now have callers | — |
| Tests clear and requirement-aligned | Pass | 48 starter tests named by AC and code, with real processes, real archives and signatures, and a local source; 8 launcher tests against the fake docker that runs the real in-container script | — |
| Fixtures coherent | Pass | `tests/fixtures.mjs` builds signed packages, a source, a node | — |
| No stale tests | Pass | — | — |
| API/E2E readiness | Pass | Test images kept; real-launcher journeys listed | — |

## Source File Size And Structure Audit

| Source File | Before | After | `>500` | `>220` Delta | SoC | Placement | Action |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `starter/update-run.mjs` | new | 202 | Pass | Pass | Pass | Pass | — |
| `starter/package-store.mjs` | 122 | 186 | Pass | Pass | Pass | Pass | — |
| other new starter files | new | 13–96 | Pass | Pass | Pass | Pass | — |
| `bash/node-update.sh`, `powershell/NodeUpdate.ps1` | new | 128, 95 | Pass | Pass | Pass | Pass | — |
| `bash/docker-runtime.sh`, `powershell/DockerRuntime.ps1` | 492, 482 | unchanged | Pass | — | — | — | — |

## Legacy / Backward-Compatibility Verdict

| Check | Result | Notes |
| --- | --- | --- |
| No backward-compatibility mechanisms | Pass | Nodes without the volume are refused with an instruction, not handled by a fallback (RU-23) |
| No legacy retention | Pass | — |
| Dead code removed | Pass | — |
| Persisted-data decision followed | Pass | Byte copy and restore only for new migrations (DEC-005); no format change |
| No version-specific dual paths | Pass | Unknown `update.json` fields are kept by the reader, which is not a version branch |
| Transition mechanics | Pass | Copy completes before `beginTrial`; restore is repeatable; both orders match the design |

## Dead / Obsolete / Legacy Items Requiring Removal

None.

## Docs-Impact Verdict

- `Yes`, done: Docker README (in-place update, tracks, test source), README (launcher `update`), RELEASE.md (Deployment). The release notes that ship step 3 must tell launcher users to reinstall the launcher and then run `upgrade --all` (RU-23; for delivery).

## Additional Material Premise Validation

None new or reclassified beyond the candidate gate.

## Review Scorecard (Mandatory)

- Overall score: `9.5/10`

| Priority | Category | Score | Why | Weak / Holding Down | Improve |
| --- | --- | --- | --- | --- | --- |
| 1 | Data-Flow Spine Inventory and Clarity | 9.6 | DS-006 and the rollback read as their design lists | — | — |
| 2 | Ownership Clarity and Boundary Encapsulation | 9.6 | One owner each for the sequence, the child, the gates and the state | — | — |
| 3 | API / Interface / Query / Command Clarity | 9.5 | Explicit codes and outcomes, one gate rule for status and request | — | — |
| 4 | Separation of Concerns and File Placement | 9.5 | Shared process mechanism extracted, files small | — | — |
| 5 | Shared-Structure / Data-Model Tightness | 9.5 | Tight state, one error type | — | — |
| 6 | Naming Quality and Local Readability | 9.5 | Headers state the order and why | — | — |
| 7 | API/E2E Readiness | 9.3 | Real-container proof of every AC in scope; images kept | Real launcher on Docker and PowerShell execution not yet run | API/E2E |
| 8 | Runtime Correctness And Behavioral Fidelity | 9.4 | Stops in every phase recovered with intact data; refusals change nothing | SelfCheck failure detail (CR3-N1) | Report the exit and keep its output |
| 9 | No Backward-Compatibility / No Legacy Retention | 9.6 | Clean refusal instead of a fallback for old launchers | — | — |
| 10 | Cleanup Completeness | 9.5 | Boot removes leftovers and unreferenced packages | — | — |

## Findings

No blocking findings.

Non-blocking notes:

- **CR3-N1** (CC-09): `self-check.mjs` discards the candidate's output and always reports "no health answer within 120 s", even when the candidate exited at once. Report "exited with code N before answering" when `exited` settled, as `#switch` already does, and send the candidate's output (or its last lines) to the starter log, so an owner can see why a package fails its self-check. This is for implementation, with step 4 or before delivery.

Assumptions the implementation asked about, all confirmed:
- refused versus failed (CC-01);
- the frozen step names (CC-02);
- halting past the point of no return (CC-03);
- the boot-time `deleteOthers` (CC-04);
- the status during the trial (CC-05);
- unpacking with the image's `tar` (CC-06);
- bash reading the CLI's JSON with the container's own `node` (CC-07).

## Follow-ups

- Follow-ups this review added: None.

## Classification

N/A (Pass).

## Recommended Recipient

- API/E2E engineer (primary); implementation engineer informed.

## Residual Risks

- Real GitHub path and production key: proven only by the first release that carries packages and a step-3 starter.
- The launcher against real Docker, and PowerShell execution: not run by implementation.
- RU-23 release-notes instruction (delivery).
- FU-006 (PowerShell fresh-port pick, pre-existing) stays a follow-up.

## Latest Authoritative Result

- Review Decision: `Pass`
- Review Entry Point: `Implementation Review`
- Supported Product Scenario Gate: `Pass`; Material-Premise Gate: `Pass`
- Score Summary: 9.5/10; every category ≥ 9.3
- Recommended Recipient: API/E2E engineer
- Notes: suggested coverage, on test-owned names and daemons only, never `autobyteus-server-0/1/2`:
  - the real launcher's `update` (`--name`, `--all`, without `--version` on `latest`/`beta`/pinned) and `status` (running, stopped, pre-starter image);
  - an `upgrade` from a step-2 node with its volume, then an update;
  - a second update after a rollback (the failed version is not retried by itself);
  - PowerShell `update`/`status` in `pwsh`.
