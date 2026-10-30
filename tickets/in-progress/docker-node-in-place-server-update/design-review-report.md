# Design Review Report — autobyteus-305 (Docker nodes update their server in place)

## Review Round Meta

- Upstream Requirements Doc: `requirements-doc.md` (Approved at SR-003; editorial fixes at SR-005, no behavior change)
- Upstream Investigation Notes: `investigation-notes.md` (current-behavior IDs renamed `CUR-001..CUR-007` at SR-005)
- Upstream Solution Revision Record: `solution-revision-record.md` (SR-001..SR-005)
- Reviewed Design Spec: `design-spec.md` (SR-005, status `Ready`, section "Resolution of ARCH-REV-001")
- Supplemental Task Artifacts Reviewed: `options-report.md` (approved at SR-003), `follow-ups.md` (FU-001..FU-004), `handoff-architecture-design-complete.md`
- Relevant Solution Revision IDs: `SR-003` (approval basis), `SR-004` (first design), `SR-005` (revision for ARCH-REV-001)
- Architecture Review Revision Record: `architecture-review-revision-record.md` (same folder)
- Current Architecture Review Revision ID: `ARCH-REV-003` (confirmation of the SR-005 basis for build step 2; the full review result below is from ARCH-REV-002)
- Current Review Round: `3`
- Trigger: round 2, Solution Designer `Architecture Design Complete`, SR-005, Large / High (revision for ARCH-REV-001 Fail). Round 3, Solution Designer `Architecture Design Complete` for build step 2 (`handoff-step-2.md`), design unchanged at SR-005, with SR-006 (editorial) and SR-007 (step 1 receipt).
- Prior Review Round Reviewed: `1` (ARCH-REV-001, Fail, AR-001..AR-012); `2` (ARCH-REV-002, Pass)
- Latest Authoritative Round: `3`

## Step 2 Basis Confirmation (ARCH-REV-003)

- **Design unchanged.**
  - SR-006 made only the N-1 wording fixes. Checked: the DEC-016 row now names `<node>-server-packages`; the `starter-client.ts` and `system-level.json` rows and the `supervisor.stop()` example are fixed.
  - SR-007 records evidence only (step 1 receipt; PRQ-001 delivered).
- **Step 1 as built matches the design** that step 2 builds on:
  - the built-in package is at `/opt/autobyteus/server-package`;
  - `server-package.json` is written by `describe-server-package.mjs`;
  - `system-level.json` has `baseImages`;
  - supervisord still runs the package directly, as the step-1 seam intends.
  Implementation assumptions A-1 (old-ref re-publish refused with a way out) and A-2 (self-reference link removed) stay within the design. The C3 details fixed in step 1 are inside the frozen C3. Code review CRR-001 passed.
- **PRQ-001 delivered** (autobyteus-284, `bf2857ca29`): `ServerProcessShutdown` bounds cleanup at `SERVER_SHUTDOWN_TIMEOUT_MS = 10_000`, then sweeps its process tree (`src/shutdown/server-process-shutdown.ts:8, 25, 64`). That fits the starter's 120 s stop limit, so the escalation trigger "bounded stop cannot finish within the starter's stop limit" does not fire.
- **Step 2 scope** (`handoff-step-2.md`): starter boot, recovery and cleanup; selection with `NEEDS_NEW_IMAGE`; `ServerSupervisor`; C2 status and `cli.mjs status`; C1 GET with `AUTOBYTEUS_STARTER_SOCKET`; supervisord runs the starter; launcher volume, config hash and IMAGE_REF → track table; the e2e PID from `cli.mjs status`; CR-N1. All of it is covered by the reviewed sections DS-003, DS-007, C1, C2, C4 and the Change Scope.
- **Implementation note (non-blocking):** supervisord's default `stopwaitsecs` is 10 s. The server's cleanup bound is also 10 s, plus its sweep. When supervisord stops the program, the starter forwards SIGTERM and waits, and supervisord may SIGKILL the starter before the server, in its own process group, has exited. On `docker stop` the container ends anyway (Docker's own 10 s grace, unchanged from today). Setting `stopwaitsecs` in `supervisor-autobyteus-server.conf` above the server bound (for example 30 s) keeps DS-007's "stop child → exit 0" true for a supervisord-initiated stop. This is a configuration line in a file step 2 already changes. It is not a design change.
- **Decision:** the ARCH-REV-002 `Pass` applies to build step 2.
- Current-State Evidence Basis: worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/docker-node-in-place-server-update`, branch `codex/docker-node-in-place-server-update`, base `origin/personal` @ `9d59ab82ec`. The round-1 code reads still apply; no code changed. Round 2 re-checked the revised design sections against them, and the SR-005 edits to the requirements and investigation notes.

## Routing Classification Review

- Task size: `Large`
- Architectural risk: `High`
- Classification rationale reviewed: unchanged from round 1 (new starter process owner, four subsystems plus launcher, supply chain, cross-version contracts by the DEC-007 exception, data copy and restore, CI secret and `contents: write`).
- Independent Architecture Review required by the classification: `Yes`
- Classification evidence or correction required: none.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed`
- Approved requirements / intended behavior understood: as in round 1. The SR-005 requirements edits are editorial and match the recorded decisions:
  - REQ-003 now says "no agent tool", matching AC-009 and DEC-004;
  - the extra cells in the REQ-006 row are gone;
  - DEC-005's reasoning now describes copy-only-with-migration, with the space check before the stop;
  - SCN-001 no longer lists "network updates off".
  No intended behavior changed, so no new approval is needed.
- Relevant existing behavior and evidence confirmed: round-1 citations hold. The design now cites the owner branch at `remote-access-route-policy.ts:161-166`, the three workflow forms (`release-server-docker.yml:61-71, 94-99, 187-202, 218-242`), the launcher's track meaning (`core.sh:54`), and the full set of layout consumers.
- Scope guardrail confirmed: unchanged.
- Every blocking finding traceable to an approved ID: `N/A` (no blocking finding remains).
- Remaining material ambiguity: none.

| Behavior ID | Kind | Design Alignment With Approved Intent | Approved Trigger / Contract And Current-State Evidence | Target Outcome / Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | Operational | Pass | Pass | Pass | Confirmed | — (DS-003 selection with `NEEDS_NEW_IMAGE`; compose volume; `latest-zh` track) |
| BEH-002 | User | Pass | Pass | Pass | Confirmed | — |
| BEH-003 | System | Pass | Pass | Pass | Confirmed | — (version/arch/asset binding; track table) |
| BEH-004 | System | Pass | Pass | Pass | Confirmed | — (`ServerSupervisor` exit table; data-copy order) |
| BEH-005 | System | Pass | Pass | Pass | Confirmed | — |
| BEH-006 | System | Pass | Pass | Pass | Confirmed | Step 5 waits for PRQ-001/002 |
| BEH-007 | User | Pass | Pass | Pass | Confirmed | — (the starter alone reports the version) |

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose And Scope Are Clear? | Linked To Relevant Core Artifacts? | Internally Complete? | Consistent With Related Core Artifacts? | Status And Approval Applicability Are Clear? | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| `options-report.md` | Pass | Pass | Pass | Pass (refinements listed in the design; the DEC-016 figure goes to the user) | Pass | — |
| `follow-ups.md` | Pass | Pass | Pass | Pass | Pass | — |
| `evidence/*` | Pass | Pass | Pass | Pass | Pass | — |

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | Unchanged, sound | — |
| Root-cause classification is explicit and evidence-backed | Pass | `No Design Issue Found`; new owners added | — |
| Refactor decision is explicit | Pass | No refactor; removal in scope | — |
| Refactor decision is supported by concrete sections | Pass | Removal plan extended (AR-008) | — |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? | Narrative Is Clear? | Facade Vs Governing Owner Is Clear? | Main Domain Subject Naming Is Clear? | One Owner Per Node, In Call Order? | Off-Spine Concerns Stay Off Main Line? | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 desktop update | Primary | Pass | Pass | Pass | Pass | Pass (`beginUpdate → stop → take → beginTrial → start → confirm → commitTrial → delete → endUpdate`) | Pass | Pass |
| DS-002 host command | Primary | Pass | Pass (IMAGE_REF → track table, refusals for pinned/custom) | Pass | Pass | Pass | Pass | Pass |
| DS-003 boot | Primary | Pass | Pass (recovery → cleanup → socket → selection → start or `NEEDS_NEW_IMAGE`) | Pass | Pass | Pass | Pass | Pass |
| DS-004 release | Primary | Pass | Pass (three workflow forms; no package job for zh) | N/A | Pass | Pass | Pass | Pass |
| DS-005 status | Return-Event | Pass | Pass (keeps polling every 10 s after 5 min) | Pass | Pass | Pass | Pass | Pass |
| DS-006 update steps | Bounded Local | Pass | Pass (space check for package and copy before the point of no return; numbered commit and rollback order) | N/A | Pass | Pass | Pass | Pass |
| DS-007 supervision | Bounded Local | Pass | Pass (exit-case table per mode and phase; one awaiter at a time) | N/A | Pass | Pass (`ServerSupervisor` only) | Pass | Pass |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? | Internal Owned Mechanisms Stay Internal? | Caller Bypass Risk Is Controlled? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Starter socket C2 | Pass | Pass | Pass | Pass | — |
| Node REST C1 | Pass | Pass | Pass | Pass | — |
| `UpdateRun` | Pass | Pass | Pass | Pass | — |
| `ServerSupervisor` | Pass | Pass | Pass | Pass | Only code that spawns, stops or awaits the child; `UpdateRun` acts through `beginUpdate`/`stop`/`start`/`endUpdate`; `SelfCheck` runs its own separate process |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? | Forbidden Shortcuts Are Explicit? | Direction Is Coherent With Ownership? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Starter | Pass | Pass | Pass | Pass | — |
| Server `node-update` | Pass | Pass | Pass | Pass | Reads `AUTOBYTEUS_STARTER_SOCKET`; no `docker/` imports |
| Desktop | Pass | Pass | Pass | Pass | — |
| CI scripts | Pass | Pass | Pass | Pass | — |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? | Responsibility Is Singular? | Identity Shape Is Explicit? | Generic Boundary Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| C1 GET/POST | Pass | Pass | Pass (`available`/`unavailable`/`error`, decided explicitly) | Low | Pass |
| C2 socket | Pass | Pass | Pass | Low | Pass |
| C2 host form `cli.mjs` | Pass | Pass | Pass (arguments, one JSON line, exit codes 0/1/2; frozen) | Low | Pass |
| C3 description + `server-package.json` | Pass | Pass | Pass (signature, then binding of version/arch/asset name, then fit) | Low | Pass |
| C4 server start | Pass | Pass | Pass (adds `AUTOBYTEUS_STARTER_SOCKET`) | Low | Pass |

## Existing Capability / Subsystem Reuse Verdict

Unchanged from round 1: all `Pass` (supervisord, `ServerProcessShutdown`, `/rest/health`, `TRUSTED_NETWORK_OWNER`, `appUpdateStore`, staging approach, version-ordering twin with shared vectors).

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? | Reuse / Extend / Create-New Decision Is Sound? | Supports The Right Spine Owners? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Image | Pass | Pass | Pass | Pass | — |
| Starter | Pass | Pass | Pass | Pass | `NodeStarter` boot / `ServerSupervisor` child / `UpdateRun` sequence |
| Release CI | Pass | Pass | Pass | Pass | Every workflow form traced |
| Launcher | Pass | Pass | Pass | Pass | Every IMAGE_REF kind traced |
| Server | Pass | Pass | Pass | Pass | — |
| Desktop | Pass | Pass | Pass | Pass | — |

## Reusable Owned Structures Verdict

Unchanged: `Pass` (version grammar, starter paths, C3 one writer / one strict reader).

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Overlapping Representation Risk Is Controlled? | Shared Core Vs Specialized Variant Decision | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| C3 / `server-package.json` | Pass | Pass | Pass | N/A | Pass | — |
| `state.json` | Pass | Pass | Pass | N/A | Pass | — |
| `UpdateState`, C2 status | Pass | Pass | Pass | N/A | Pass | — |
| Running version | Pass | Pass | Pass | N/A | Pass | One owner: `UpdateStatus`, from the package `ServerSupervisor` started; `ServerPackageInfo` removed |
| `system-level.json` | Pass | Pass | Pass | N/A | Pass | DS-004 gives `{ level, baseImages: { default, zh }, systemInputsSha256 }`. The file-mapping row still shows the short shape (N-1) |

Derived consumers of a changed structure listed with a decision for each (Principle 11): `Pass`. Each layout consumer has a decision and a build step: TESTING.md rule, the three Docker tests, the compose volume, the READMEs.

Each domain word keeps one meaning (Principle 15): `Pass`. Current-behavior IDs are now `CUR-*`. The requirements' DEC-016 row still names the volume `<node>-server`, while the design names it `<node>-server-packages` (N-1).

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? | Responsibility Matches The Intended Owner/Boundary? | Re-Tightened After Extraction? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `starter/server-supervisor.mjs` | Pass | Pass | N/A | Pass | New owner of the child |
| `starter/starter.mjs` | Pass | Pass | N/A | Pass | Its row still says "supervision, signals". The Ownership Map, which is authoritative, gives supervision to `ServerSupervisor` (N-1) |
| `src/node-update/starter-client.ts` | Pass | Pass | N/A | Pass | Its row still says "`unavailable` when no socket". The authoritative C1 rule uses `AUTOBYTEUS_STARTER_SOCKET` (N-1) |
| Other files | Pass | Pass | N/A | Pass | — |

## Subsystem / Folder / File Placement Verdict

Unchanged: `Pass`. The volume and folder are now `<node>-server-packages` → `/home/autobyteus/server-packages` (per node).

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? | Replacement Owner / Structure Is Clear? | Removal / Decommission Scope Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `bootstrap.sh`, `entrypoint.sh:30-36` | Pass | Pass | Pass | Pass | Evidence corrected (`0` only clones into `/app/src`, read by nothing) |
| `AUTOBYTEUS_SKIP_SYNC` and git-sync env (launcher, PowerShell, compose, `.env.example:12-18`, `docker-start.sh:250-254`, e2e test `:210`) | Pass | N/A | Pass | Pass | — |
| `AUTOBYTEUS_WORKSPACE_ROOT=/app` (3 places) | Pass | N/A | Pass | Pass | The "Legacy Removal Policy" list does not repeat it; the Removal plan has it (N-1) |
| Workspace `node_modules` copy; supervisord command | Pass | Pass | Pass | Pass | — |
| Tests and docs of the old layout | Pass | Pass | Pass | Pass | Steps 1–2 |
| `ServerPackageInfo` | Pass | Pass | Pass | Pass | Removed (AR-009) |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? | Clean-Cut Removal Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- |
| Starter vs old `/app` layout | No | Pass | Pass | — |
| Built-in package | No | Pass | Pass | — |
| Frozen C1–C4 | No (approved exception DEC-007) | Pass | Pass | Names the `cli.mjs` form and `server-package.json`; unknown codes show `message` |

## Persisted-Data Transition Verdict (When Applicable)

| Area / Stored Subject | Approved Decision | Evidence Sufficient? | Choice Proportionate? | Safety Complete If Required? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Data volume | `Not Affected` (formats); byte copy/restore by DEC-005 | Pass | Pass | Pass | Pass | The copy is taken only after the space check before the stop. `beginTrial(dataCopy)` is written only after the copy completes. Rollback: restore → state → delete → start. Commit: state → delete. Boot: repeatable restore with a trial, leftover cleanup without one. Interrupting any step leaves either the original data or a complete copy that `state.json` refers to |
| Starter state `/home/autobyteus/server-packages` | New, single writer, tolerant reader | Pass | Pass | N/A | Pass | — |

## Change / Refactor Safety Verdict

| Area | Sequence Is Realistic? | Temporary Seams Are Explicit? | Cleanup / Removal Is Explicit? | Verdict |
| --- | --- | --- | --- | --- |
| Steps 1–5 | Pass | Pass | Pass (layout consumers in steps 1–2; step 3 tests cover `DESCRIPTION_MISMATCH`, a trial exiting at start, container stops during copy, trial and restore, and too little space before the stop) | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? | Example Is Present And Clear? | Bad / Avoided Shape Is Explained When Helpful? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Selection at boot | Yes | Pass | Pass | Pass | Includes the AC-006 alternate case |
| Exit of the trial child | Yes | Pass | Pass | Pass | — |
| Sequence ownership | Yes | Pass | Pass | Pass | Uses the old name `serverProcess.stop()`; read it as `supervisor.stop()` (N-1) |
| Others | — | Pass | Pass | Pass | Unchanged |

## Material Premise Validation (Only When Needed)

Round-1 records MP-001..MP-007 still apply. Each reachable premise is now covered by the design:

- MP-001 (compose recreation): compose server-packages volume added.
- MP-002 (`zh` variant): workflow-form table, track table, zh digest in the system-level inputs.
- MP-003 (renamed older signed pair): binding check, `DESCRIPTION_MISMATCH`, and a test.
- MP-004 (container stop during copy or restore): ordering, plus boot recovery and cleanup.
- MP-005 and MP-006: governed by rule 9 and DEC-004/AC-009; REQ-003 wording now aligned.
- MP-007: Not Reachable.

No new premise was needed in round 2.

## Unresolved Approved-Behavior Or Current-State Gaps

None.

## Review Decision

- `Pass`

## Findings

None blocking. All of AR-001..AR-012 are resolved (see `architecture-review-revision-record.md`, ARCH-REV-002).

Non-blocking note for implementation, N-1 (stale wording; the authoritative sections govern):
- The requirements' DEC-016 row names the volume `<node>-server`; the design and launcher use `<node>-server-packages`.
- The file-mapping rows for `starter.mjs` ("supervision, signals") and `starter-client.ts` ("`unavailable` when no socket") predate the revision. The Ownership Map, DS-007 and C1 govern.
- The `system-level.json` file-mapping row lacks `baseImages`; the DS-004 shape governs.
- The Sequence-ownership example says `serverProcess.stop()`; it means `supervisor.stop()`.
- The Legacy Removal Policy list does not repeat `AUTOBYTEUS_WORKSPACE_ROOT` and `.env.example`; the Removal plan governs.

The Solution Designer may correct these in the next revision; implementation follows the authoritative sections.

## Classification

N/A (Pass).

## Recommended Recipient

Implementation Engineer (`/software_engineering_team/implementation_engineer`), build step 1. Informational notification to the Solution Designer.

## Residual Risks

- **DEC-016 download figure:** about 0.94 GB per release on a 3-node machine, instead of the 0.31 GB in the approved supplement. The stronger reason is now stated, and the Solution Designer is asking the user to confirm. Non-blocking; if the user rejects it, it comes back as a requirement change.
- **A node in `NEEDS_NEW_IMAGE` refuses in-place updates** (the `UpdateService` gate "a server is running"). So the only way out is a newer image, as AC-006 says. An update to a newer package that fits would also work, but that is not required.
- **Re-publishing a release with `--clobber`:** a node that fetches during the replacement may get `ARCHIVE_MISMATCH` once; a retry succeeds. Accepted in the design.
- **R-07, confirm window and resume (step 5):** within DEC-005; to be named in step 5.
- **Prerequisites:** step 5 waits for autobyteus-284, -285 and -287 (PRQ-001/002). Before running `gh secret set SERVER_PACKAGE_SIGNING_KEY` in step 1, tell the user (his instruction).
- **Version ordering in two languages:** kept equal by shared vectors.

## Latest Authoritative Result

- Review Decision: `Pass`
- Material-Premise Gate: `Pass`
- Notes: the revised design covers every finding of ARCH-REV-001 in its authoritative sections:
  - `NEEDS_NEW_IMAGE` at boot;
  - `ServerSupervisor` as the single owner of the child, with its exit table;
  - the data-copy order and the space check before the point of no return;
  - signed-description binding;
  - layout consumers;
  - workflow forms and tracks;
  - removal completeness;
  - one owner of the running version and explicit starter presence;
  - the frozen CLI and `server-package.json`;
  - SelfCheck isolation;
  - editorial requirement fixes.
  Ready for implementation of build step 1.
