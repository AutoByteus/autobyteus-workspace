# Code Review Report — autobyteus-305, build step 2 (starter and server-packages volume)

This report holds the latest result (step 2, CRR-003). The step-1 result (CRR-001, Pass) and its test review (CRR-002) are in `code-review-revision-record.md`. Step 1 is merged (`eec6522b27`).

## Review Round Meta

- Review Entry Point: `Implementation Review`
- Requirements Doc Reviewed As Context: `requirements-doc.md` (Approved, SR-003)
- Investigation Notes Reviewed As Context: cited sections only
- Solution Revision Record Reviewed As Context: SR-005 (design), SR-006 (wording), SR-007 (step 1 receipt)
- Design Spec Reviewed As Context: `design-spec.md` (SR-005): DS-003, DS-007, C1/C2/C4, Ownership Map, the step 2 sequence
- Supplemental Task Artifacts Reviewed As Context: `handoff-step-2.md`, `follow-ups.md`
- Relevant Solution Revision IDs: `SR-005`, `SR-006`, `SR-007`
- Design Review Report Reviewed As Context: `design-review-report.md` (ARCH-REV-003 Pass; note: `stopwaitsecs` above the server's shutdown bound)
- Architecture Review Revision Record Reviewed As Context: `architecture-review-revision-record.md`
- Relevant Architecture Review Revision IDs: `ARCH-REV-003`
- Implementation Handoff Reviewed As Context: `implementation-handoff.md` (IR-002)
- Implementation Revision Record Reviewed As Context: `implementation-revision-record.md`
- Relevant Implementation Revision IDs: `IR-002`
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-003`
- Current Review Round: `2` (first round for step 2)
- Review Scope: `Full Re-Audit` of the step-2 delta
- Review Scope Evidence: the change adds a new process owner and new contracts across 44 files beyond any prior finding. Step 1 was merged unchanged except for the CR-N1 message.
- Trigger: IR-002, build step 2 ready
- Prior Review Round Reviewed: CRR-001 (step 1, Pass) and CRR-002 (test review, Pass)
- Latest Authoritative Round: `2`
- Failure-origin fields: N/A

Code reviewed: worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/docker-node-in-place-server-update`, branch `codex/docker-node-in-place-server-update`, `origin/personal@77fb8bf2d1..5939cc48be` (code in `b1029fc1b0`, `82e2e7f931`).

## Routing Classification Review

- Task size: `Large`; architectural risk: `High`. Confirmed: a new process owner between supervisord and the server, the frozen C1/C2/C4 contracts, a launcher config-hash bump that recreates every node, and data-restore code.
- Selected route: `Implementation Review`. Independent source review required: `Yes`.

## Review Scope

- Changed implementation reviewed:
  - the starter: `starter.mjs`, `server-supervisor.mjs`, `package-store.mjs`, `update-status.mjs`, `starter-socket.mjs`, `cli.mjs`, `data-copy.mjs`, `state-file.mjs`, `system-facts.mjs`, `release-version.mjs`, `starter-log.mjs`, `starter-paths.mjs`;
  - the server's C1: `node-update-routes.ts`, `starter-client.ts`, the REST registration and the route class;
  - the image: Dockerfile, supervisord program;
  - the launcher, bash and PowerShell: volume, hash v7, storage text, the move to `ContainerConfig.ps1`;
  - the shared version vectors; the e2e pid source; CR-N1; the docs.
- Also read for context: the launcher entry scripts' module loading (`autobyteus-docker.ps1`, `autobyteus-docker.sh`), `remote-access-route-policy.ts` (`pathnameFromUrl`), `open-vnc-browser-url.sh`, the old supervisord program.
- Explicit exclusions: steps 3–5 (`UpdateService`, `UpdateRun`, downloads, verification, `DataCopy.take`, launcher `update`, desktop UI, resume).

## Upstream Behavior And Production-Path Basis Confirmation

- Behavior-basis status: `Confirmed`
- Changed or newly discovered behavior: none. Deviations D-1..D-3 are judged below (CC-01..CC-03).

| Behavior ID | Status | Implementation Path And Evidence | Notes |
| --- | --- | --- | --- |
| BEH-001 / REQ-012 / AC-006 (DS-003 selection) | Confirmed | `PackageStore.choose` follows the three outcomes of the design's selection rule word for word (installed when it fits and is not older than the built-in; built-in when it fits and is not older than N, recorded as current; else `NEEDS_NEW_IMAGE`). 8 unit cases; container: needsNewImage with no restart loop, older current → built-in, installed newer runs from the volume (IMP2-08) | — |
| DS-007 supervising | Confirmed | `ServerSupervisor`: C4 spawn, detached group, `AUTOBYTEUS_STARTER_SOCKET`; stop SIGTERM → 120 s → group SIGKILL; group killed after every exit; `exitCodeOf` 128 + signal. `NodeStarter.run` awaits `exited` and exits with its code; `stop()` → exit 0. Real-process tests; IMP2-07 (137 → restart; stop 0.14 s) | — |
| DS-003 recovery and cleanup | Confirmed (D-3) | `#recoverAndClean`: restore when `trial.dataCopy` → `rollBackTrial` → `markInterrupted`; then `DataCopy.delete`, `removeLeftovers`. Order matches the design (restore → state → delete) | Reachable from step 3 on |
| BEH-007 / REQ-011 (C2, C1 GET) | Confirmed | C2 status shape `{ version, state, server?, target?, update, message? }` and C1 `{ inPlaceUpdate, version, target?, update, message? }` match the Interface table. `unavailable` without the variable; `error` on no answer; 400 passed on; `TRUSTED_NETWORK_OWNER` with the query string removed (`pathnameFromUrl`) | — |
| Launcher volume / hash | Confirmed | `-v <node>-server-packages:/home/autobyteus/server-packages` and the hash inputs in both shells; v7 | Track table deferred (D-2) |

## Supported Product Scenario And Reachability Gate (Mandatory)

| Scenario ID | Related IDs | Kind | Actor | Goal / Event | Entry | Shape | Forward Path | Outcome | Evidence | Validity | Use |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| CR2-S1 | DEC-014, BEH-001 | Operational | Node owner | First move to the starter image | `autobyteus-docker upgrade --all` (v7 hash and new image) | Normal | recreate → empty volume → `choose` with no state → built-in recorded current → server | Node runs, volume mounted | design DEC-014; IMP2-06 | Supported Normal | Use |
| CR2-S2 | DS-007 | System | — | Server crash | server exits | Normal | `exited` → starter exits with the code → supervisord restarts → boot again | Server back | IMP2-07 | Supported Normal | Use |
| CR2-S3 | DS-007 | Operational | supervisord / container stop | Stop the node | SIGTERM to the starter | Normal | `stop()` → SIGTERM server → exit 0 within `stopwaitsecs=30` (server bound about 10 s, autobyteus-284) | Clean stop | IMP2-07; ARCH-REV-003 note | Supported Normal | Use |
| CR2-S4 | REQ-012, AC-006 alternate | Operational | Node owner | Retarget a node to an older image | `upgrade --all --tag <older>` (BEH-001 `--tag` retargeting) | Explicit Edge | `choose` → `NEEDS_NEW_IMAGE`, no server, starter up | Refused; message in the log and `cli.mjs status` | launcher `--tag`; IMP2-08 | Supported Explicit Edge | Use |
| CR2-S5 | REQ-011 | User | Desktop (step 4 consumer) | Read the node version | C1 GET from the trusted network; phone credential | Normal | route policy → relay → C2 | Status, or 403 for a phone | IMP2-06 | Supported Normal | Use |

### Candidate Finding And Mechanism Gate

| Candidate ID | Observation Or Mechanism | Scenario / Contract | Independent Trigger | Path / Consequence | Evidence | Disposition | Scope | Reason / Response |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| CC-01 | D-1: boot order selection → start → socket instead of socket first | C2; DS-003 | Every boot | The status is always a chosen state (`#node` is set before `listen`), so the frozen `state` enum needs no "starting". The only C2 clients are the server (it cannot serve C1 before it listens, seconds after spawn) and `cli.mjs` (it reports "cannot reach" during the first seconds of a boot, which is truthful) | `starter.mjs:50-59`; `update-status.mjs:49` would throw on a null `#node`, which this order makes unreachable | Reject (as a defect) | — | Confirmed: within the design's intent, and it removes a state the frozen contract would otherwise need |
| CC-02 | D-2: IMAGE_REF → track table and the launcher `status` printing the starter state deferred to step 3 | Principle 7; DS-003 step 5 | — | The table has no caller before `update`, so adding it now would be dead code. However, `NEEDS_NEW_IMAGE` **is** reachable in step 2 (CR2-S4). Until step 3 it is visible only in the node log and `docker exec … cli.mjs status` (documented in the Docker README), not in the launcher's `status` | handoff D-2; README | Promote, non-blocking | This ticket | CR2-N1: an interim visibility note for the Solution Designer and delivery. Before step 2 the same action ran an older server on migrated data, so step 2 is safer, not a regression. Proportionate response: ship steps 2 and 3 in the same release, or accept the interim |
| CC-03 | D-3: trial recovery present before a trial can be recorded | Design step 2 scope | Step 3 `UpdateRun` | Unit-tested; ordering repeatable (restore clears then copies; `beginTrial` is written only after a complete copy, so `trial.dataCopy` without `data-copy/` is unreachable) | tests `boot rolls back…` | Reject (as a defect) | — | Scoped by the design; not dead (its trigger lands in the next step of the same ticket) |
| CC-04 | C2 `version` in needsNewImage = `state.current.version` | C2 frozen; REQ-011 | — | "The node's version" stays one meaning: the newest that ran, which is what the message names | `package-store.mjs:114` | Reject (as a defect) | — | Confirmed |
| CC-05 | An uncaught exception in the starter (for example a corrupt `update.json` read inside the socket handler) would end the starter and orphan the detached server | DS-007 | Manual tampering, or an unknown bug | Writes are atomic (temporary file, then rename); only root-local clients reach the socket | `state-file.mjs` | Reject: Technically Possible but Unsupported/Contrived | — | — |
| CC-06 | supervisord SIGKILL of the starter after 30 s orphans a server that ignores SIGTERM | CR2-S3 | — | The server's shutdown is bounded at about 10 s (autobyteus-284, delivered); `docker stop` ends every process | handoff Known Risks; ARCH-REV-003 | Reject: not reachable with the bounded shutdown | — | — |
| CC-07 | The group kill after every server exit also kills processes the server started in its group (for example an `xdg-open`-launched Chromium when the supervised one is not running) | R-06, Case 9 | — | Intended by the design: nothing the server left outlives it. The VNC Chromium is supervisord's program, not the server's | design R-06; base supervisord programs | Reject | — | By design |
| CC-08 | PowerShell's new `ContainerConfig.ps1` module: could an old entry script load the new modules? | Launcher install contract | `autobyteus-docker install` / remote run | Install saves the entry and its module list together. A remote run downloads the entry and its modules from the same branch. The installed set is always consistent | `autobyteus-docker.ps1:51-64, 96-111` | Reject | — | Existing contract, unchanged |
| CC-09 | File-size moves: `DockerRuntime.ps1` 556 → 482, `docker-runtime.sh` 511 → 492 | `>500` rule | — | Both files were over 500 before the change. The new code went into owned files (`ContainerConfig.ps1`, `container-config.sh`), which mirror each other | `wc -l` | Reject (as a defect) | — | Correct response to the rule |
| CC-10 | `stopwaitsecs=30` versus the starter's own `stopMs=120 s` | ARCH-REV-003 note | — | The supervisord stop path is bounded by 30 s, and the server bound is about 10 s. The 120 s limit applies to the step-3 update stop, which supervisord does not drive | conf; `starter-paths.mjs` | Reject (as a defect) | — | Consistent |

## Structural / Design Checks

| Check | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Task design health assessment preserved | Pass | Only the thin C1 relay changed in the server; the starter owns the rest | — |
| Matches behavior-defining artifacts | Pass | Selection rule, exit table (supervising rows), C1/C2/C4 shapes, file mapping | — |
| Data-flow spine clarity | Pass | DS-003 reads top to bottom in `NodeStarter.run` (recover/clean → choose → start or refuse → socket → await exit) | — |
| Ownership boundaries | Pass | `ServerSupervisor` is the only spawner/stopper; `PackageStore` is the only writer of `state.json`; `UpdateStatus` is the one owner of the node's version (AR-009); the server reaches the starter only through C2 | — |
| Off-spine concerns | Pass | `system-facts`, `release-version`, `state-file`, `starter-log` serve their owners | — |
| Capability reuse | Pass | supervisord keeps crash restarts; SIGTERM reaches `ServerProcessShutdown`; the route class is reused | — |
| Reusable owned structures | Pass | One version grammar, with shared vectors for the Python and JS implementations; one atomic JSON writer | — |
| Shared-structure tightness | Pass | `state.json` entries `{ source, version }`; one `UpdateState`; `IDLE_UPDATE` merge keeps fields this starter does not know | — |
| Repeated coordination | Pass | — | — |
| Empty indirection | Pass | `StarterSocket` and `cli.mjs` are thin transports, as the design says | — |
| Separation of concerns / file responsibility | Pass | 12 files of 5–122 lines, one concern each | — |
| Dependency direction | Pass | Starter files import Node built-ins only; the server does not import `docker/` | — |
| Authoritative Boundary Rule | Pass | The C1 relay never reads `state.json` or `update.json`; `NodeStarter` reaches the child only through `ServerSupervisor` | — |
| File placement | Pass | `docker/starter/`, `src/node-update/`, launcher `ContainerConfig.ps1` mirrors `container-config.sh` | — |
| Flat-vs-over-split | Pass | — | — |
| Interface clarity | Pass | C2 `target` is validated with explicit `INVALID_VERSION`; C1 states are explicit (`unavailable` by variable absence, `error` by no answer, not "found nothing") | — |
| Naming / one vocabulary | Pass | Starter versus launcher kept distinct; "server package", "built-in", "installed" are used consistently | — |
| No unjustified duplication | Pass | The client-side socket request appears in `cli.mjs` (starter, Node built-ins) and in `starter-client.ts` (server). Separate programs: the design forbids a shared import between them | — |
| Patch-on-patch complexity | Pass | — | — |
| Dead code removed in touched files | Pass | `supervisorctl pid` use replaced; no new code without a caller except D-3 (CC-03) | — |
| Tests clear and requirement-aligned | Pass | 26 starter tests with real child processes, named by behavior (AC-006 variants, exit code, NEEDS_NEW_IMAGE, recovery); 6 C1 tests; route policy phone 403 | — |
| Fixtures and helpers coherent | Pass | `tests/fixtures.mjs` builds fake packages once | — |
| No stale / compatibility-only tests | Pass | `v6` assertion updated to `v7` | — |
| API/E2E readiness | Pass | Image `autobyteus-server-305-test:step2` kept; probes and launcher journeys listed | — |

## Source File Size And Structure Audit

| Source File | Before | After | `>500` | `>220` Delta | SoC | Placement | Classification | Action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `powershell/DockerRuntime.ps1` | 556 | 482 | Pass (shrunk below) | Pass | Pass | Pass | — | — |
| `bash/docker-runtime.sh` | 511 | 492 | Pass (shrunk below) | Pass | Pass | Pass | — | — |
| `powershell/ContainerConfig.ps1` | new | 84 | Pass | Pass | Pass | Pass | — | — |
| `bash/container-config.sh` | 51 | 71 | Pass | Pass | Pass | Pass | — | — |
| `starter/*.mjs` (12 files) | new | 5–122 each | Pass | Pass | Pass | Pass | — | — |
| `src/node-update/*.ts` | new | 38, 47 | Pass | Pass | Pass | Pass | — | — |

## Legacy / Backward-Compatibility Verdict

| Check | Result | Notes |
| --- | --- | --- |
| No backward-compatibility mechanisms | Pass | The new image has only the starter; old images keep their own entry (DEC-014) |
| No legacy retention | Pass | — |
| Dead code removed | Pass | — |
| Persisted-data decision followed | Pass | `Not Affected` for the data folder; new starter state with one writer, atomic writes, a tolerant reader |
| No version-specific dual reads/writes | Pass | — |
| Transition mechanics | Pass | No migration; config hash v7 recreates once, as planned |

## Dead / Obsolete / Legacy Items Requiring Removal

None.

## Docs-Impact Verdict

- Docs impact: `Yes`, done: Docker README (starter, selection, `cli.mjs status`, volume), root and server READMEs (volume), and TESTING.md (starter layer, package choice in test nodes; its own commit).

## Additional Material Premise Validation

No ARCH-REV-003 premise is reclassified. New: none beyond the candidate gate.

## Review Scorecard (Mandatory)

- Overall score: `9.5/10`

| Priority | Category | Score | Why | Weak / Holding Down | Improve |
| --- | --- | --- | --- | --- | --- |
| 1 | Data-Flow Spine Inventory and Clarity | 9.6 | DS-003 and DS-007 (supervising) are readable in one method each, in call order | — | — |
| 2 | Ownership Clarity and Boundary Encapsulation | 9.6 | One owner of the child, of `state.json` and of the node's version; the server goes only through C2 | — | — |
| 3 | API / Interface / Query / Command Clarity | 9.5 | C1/C2 match the frozen shapes; explicit `unavailable`/`error`/400 | — | — |
| 4 | Separation of Concerns and File Placement | 9.6 | Small files; the size-rule moves went to mirrored owned files | — | — |
| 5 | Shared-Structure / Data-Model Tightness | 9.5 | Tight `state.json` and `UpdateState`; shared version vectors | — | — |
| 6 | Naming Quality and Local Readability | 9.5 | Headers explain the order and the reasons; vocabulary consistent | — | — |
| 7 | API/E2E Readiness | 9.3 | Container journeys proven locally; images kept | Launcher upgrade path, Docker probes and PowerShell execution not yet run | API/E2E runs them |
| 8 | Runtime Correctness And Behavioral Fidelity | 9.4 | Selection, exit codes, group kill, stop timing verified in a real container | Interim `NEEDS_NEW_IMAGE` visibility (CR2-N1) | Ship with step 3, or accept |
| 9 | No Backward-Compatibility / No Legacy Retention | 9.6 | Clean cut | — | — |
| 10 | Cleanup Completeness | 9.5 | `supervisorctl pid` consumer moved; CR-N1 done | — | — |

## Findings

No blocking findings.

Non-blocking note:

- **CR2-N1** (CC-02): with D-2, `NEEDS_NEW_IMAGE` is reachable in step 2 through `autobyteus-docker upgrade --all --tag <older>`, but the launcher's `status` will not show it until step 3. Until then it appears only in `/var/log/supervisor/autobyteus_server.log` and `docker exec <container> node /opt/autobyteus/starter/cli.mjs status`. This is for the Solution Designer and delivery: if a release could come between step 2 and step 3, accept this interim or move the launcher `status` line earlier. No code change is required for this review.

Assumptions the implementation asked about, all confirmed:
- D-1, boot order: confirmed (CC-01).
- D-2, deferral: confirmed as dead-code avoidance, with the visibility note above (CC-02).
- D-3, recovery before it is reachable: confirmed (CC-03).
- The C2 `version` meaning: confirmed (CC-04).

## Follow-ups

- Follow-ups this review added: None.

## Classification

N/A (Pass).

## Recommended Recipient

- API/E2E engineer (primary pass rule); implementation engineer informed.

## Residual Risks

- The first step-2 image on a launcher-managed node (v7 recreation, empty volume → built-in recorded) has not run yet with the real launcher. API/E2E will run it on a test-owned daemon.
- PowerShell was not executed (`pwsh` absent); API/E2E ran it in step 1 (API-14) and can do so again.
- CR2-N1 interim visibility.

## Latest Authoritative Result

- Review Decision: `Pass`
- Review Entry Point: `Implementation Review`
- Supported Product Scenario Gate: `Pass`
- Material-Premise Gate: `Pass`
- Score Summary: 9.5/10; every category ≥ 9.3
- Failure Origin: N/A
- Recommended Recipient: API/E2E engineer
- Notes: suggested coverage is in the handoff:
  - launcher `new-container` and `upgrade --all` (step-1 → step-2 image) on a test-owned daemon;
  - `docker stop`/`start` keeps the selection;
  - C1 from the trusted network and from a phone credential on a real node;
  - both Docker probes against `autobyteus-server-305-test:step2`;
  - a PowerShell run in `pwsh`;
  - a `NEEDS_NEW_IMAGE` boot through the launcher (`--tag` to an older image after a newer one ran).

  Never touch `autobyteus-server-0/1/2`.
