# Implementation Handoff — IR-007

## Current result and authority

**Implementation Complete — SR021 selected Docker failed-start completion;
independent source review required. Large / High confirmed.** All implementation
and local checks personal; no delegation/spawning. Source commit
`d318bd9db935affdf16d141ef4e88a6c0e4939b5` changes15 scoped code/test/docs paths.
This is not automatic-reboot, API/E2E, physical-product or release signoff.
**CRR008 Fail / CR005 and API003 Fail57.14% / broader Required / API-F003 remain
current until their owners supersede them.** API-F002 is independently resolved
at API003's fresh public native-Ubuntu no-engine-preinstall create/reconnect scope.

The existing locked Reconnect now orders storage/host proof before a selected
Docker adapter that qualifies the exact current failed-start observation, proves
current-image daemon-side UUID/access, reinspects, records bounded consumption,
starts the same immutable ID once and verifies actual API/shared binding. It
never recreates, pulls, changes policy/config/private state/source or starts
arbitrary stopped nodes. Normal process restart remains Docker-owned.

## Upstream package and routing

Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/shared-network-workspaces`;
branch `codex/shared-network-workspaces`, finalization `origin/personal`.
Task `project_task_0793009f-41bc-4684-9cbe-9a29ad26ed63`.
Ticket root `/Users/normy/autobyteus_org/autobyteus-worktrees/shared-network-workspaces/tickets/in-progress/shared-network-workspaces`.
Ticket paths below are relative to this root; production paths worktree-relative.

- Requirements: `requirements-doc.md`, unchanged **Approved SR018**;
  `approval-record-sr018.md`, prior approvals and scope feedback retained.
- `investigation-notes.md`, `solution-design-handoff.md`,
  `solution-revision-record.md`, `design-spec.md` **Ready SR021** at `cd1519a798`.
  Full incoming667-reference index: `evidence/design-recovery/sr021/package-index.json`;
  complete incoming669 with ARCH005 audit/script. All references preserved.
- `design-review-report.md`, `architecture-review-revision-record.md`:
  **ARCH-REV005 Pass**, review `4cd2aae49b6e628084bc4d63fd6ef3b2719c3fc2`.
  Actual implementation input `50d9c9d0c883e1ad8d3a1808b9e980a7df4f132b`
  only adds the solution owner's architecture-pass receipt/history.
- `code-review-report.md`, `code-review-revision-record.md`, CRR001–008 evidence:
  CR005 Design Impact origin accepted in SR021/ARCH005, not yet source closure.
- `api-e2e-execution-coverage-report.md`, investigation/ledger/revision record,
  `evidence/api-e2e/api-rev-001/` through `api-rev-003/`: original failures,
  scoped resolutions, successful actual journeys, current failure and remaining
  environment/matrix limits preserved. No historical run relabelled current.
- `implementation-revision-record.md`: IR001–006 preserved, IR007 appended.
  Prior full IR006 handoff saved as historical
  `implementation-evidence/ir-007/prior-implementation-handoff-ir006.md`.
- Current `implementation-evidence/ir-007/`: full absolute cumulative
  `package-index.json`, input/source/final audits, executed scripts/results,
  final/prior/failing check logs, build provenance and cleanup.
- Requirements/design supplements, feasibility/raw attempts, FUP001 custody,
  SR020/021 primary contracts and all earlier review/implementation/API evidence
  remain in the cumulative index. Product-owned spec **N/A — not applicable**;
  independent reviews apply. Delivery revision **N/A — not performed**.

Cycle **Rework / architecture-reviewed recovery**. Trigger ARCH005/SR021 after
CRR008/CR005/API-F003; ApprovedSR018, SR019/020 choices remain. Task design
classification retained: Large multi-surface feature, High privileged lifecycle,
persistence, source/private-data and exact Docker ownership risk. No downgrade.
Fresh matching rule selects **Code Review**, exact existing recipient
`/software_engineering_team/code_reviewer`; no direct API handoff. Lightweight
*direct-route* review N/A; scoped self-review performed. No new Design Impact.

## Reviewed behavior implementation trace

| Approved behavior | Actual current path | Result / limits |
| --- | --- | --- |
| BEH003, SCN009/013, REQ014/019, AC007/014/018/019: healthy restart | CLI service -> serial lock -> `setup/lifecycle.go:Reconnect` -> host proof -> `setup/reconnect_nodes.go` -> `docker/start_recovery.go` | One selected-set discovery; current label/ref resolves replacements, then immutable IDs only; independent node failures aggregate separately from host readiness. Actual whole-host reboot pending API |
| AC009/017: selected object/config/private/source preservation | `snapshot.go`, `start_observation.go`, shared `volume.go` validator, `start_recovery.go` | Current daemon/ref/attachment/local-driver options, qualified error grammar, image proof and exact post-probe reinspection. Opaque config retained; actual Mounts projection order alone is ignored, exact entries preserved |
| Normal running Stop / policy veto / unselected controls | Current public State and RestartPolicy; `commands.sh`, NFS README | No error after successful run -> normal stopped node not eligible. No/on-failure/unknown policy veto; no policy changes. Already-failed Stop is Docker no-op; guidance states `docker update --restart=no` durable veto. Always keeps Docker semantics |
| Restart-safe at-most-once completion per incarnation | `start_observation.go:startAttempt`, existing atomic Store | One0600 record per selected node under0700; only daemon/storage/node/container/StartedAt/FinishedAt, no error/policy/auth/Config/READY. Write before Start; malformed fails closed. Changed diagnostic/policy cannot rearm consumed incarnation |
| Explicit eligible retry, observation and safe detach | `cli/run.go`, `setup/status.go`, `setup/lifecycle.go` | Public confirmed reconnect/--yes may retry consumed once; ticks false, policy=no never overridden. Status no lifecycle writes/Start. Successful detach removes exact selected attempts after attachment removal; source/volumes/private recreation receipts retained |
| Prior engine correction / API-F002 | IR005 exact pair/recipe/embed/install owner and IR006 release gates unchanged | No engine rebuild.11 retained IR005 files verified; actual API003 fresh native closure retained, not rerun |
| BEH002/005, IMP-D001 private skills/current source | Prior IR002/SR019 paths unchanged | Independent source Update/Remove, local and AGY policy retained; no source pin/copy/refcount/retirement |
| Healthy previews/current product; D001/DEC015 | Prior paths unchanged | API003 scoped mounted desktop evidence retained; no new frontend, no outage isolation or forced-outage gate |

Changes stayed within Scope Guardrail and Change Scope: **Yes**.

## Design-health, structure and persistence check

Reviewed posture Larger Requirement; root **Missing Invariant / Boundary Or
Ownership Issue**. SR021's missing post-host-proof completion owner confirmed.
Narrow cohesive refactor extracts read-only volume validation shared by
EnsureVolume and recovery, plus selected-set/reference coordination shared by
Reconnect/Status. Creation remains exclusively EnsureVolume. Existing probe,
Store, lock and VerifyStarted reused. No extra job, global Docker ordering,
app-entrypoint wait, process supervisor, generic retries or private stop intent.

Old host-only completion endpoint replaced cleanly; old duplicated inline volume
validator and per-node Status discovery removed. No compatibility wrapper,
version branches, alternative state owner, dead touched-code path or new outside
follow-up found. New modules are117/92/42/65 nonempty lines; all changed production
files ≤267, no production changed-line delta >220. Test files separate.
Shared Snapshot adds only real public Docker state fields, not invented intent.

Persisted transition follows SR021: **new bounded subject, no migration**.
Existing app/attachment/node/recreation data directly usable and unchanged;
absent attempt means no recorded attempt, NOT prior running intent. No historical
schema transformation, schemaVersion, TTL or accumulating attempt history.
Malformed attempt suppresses only that node's completion with actionable status.
Current different ID/incarnation is not held by old record. No deviation.

## Local implementation checks / current build

Read root DESIGN/TESTING, implementation skill/shared principles, NFS docs and
current authority chain. Details/commands/exit codes/timings are in
`implementation-evidence/ir-007/checks-and-limits.md`, `checks-result.json` and
executed scripts. These are local checks, **not API/E2E coverage scores**.

- Final Go race: all7 packages,51 top-level tests +105 subcases pass; vet pass.
- Python18 enumerated/17 pass/1 standalone Go-child skip; actual child exercised
  by Go suite. Real shell forwarding/guidance fixture and bash syntax pass.
- Seven deliberate mutations fail intended assertions, not compilation.
- Darwin/Linux × arm64/amd64 compile; publication intentionally refuses empty
  qualification. No four-platform runtime/engine/physical claim.
- Transport/Unix HTTP fixtures personally exercise exact-ID adapter, current
  status and Store/probe contracts. Real Docker boot/control semantics remain
  next independent gate. No real daemon/VM/mount/root install/service this round.
-15 source/test/docs paths;1350 prior active-package files unchanged; all11
  IR005 retained candidate files and complete incoming references verified.
  Source audit separately compared62634 other tracked paths to input hashes.
- Initial negative-fixture defect (foreign/wrong-driver volume got a probe but
  no Start) fixed with distinct eligible result; failed log retained. Pre-polish
  passing candidate retained; final Mounts-order handling tested. Build harness
  initially expected source hash from version-only output; corrected without
  production change, both attempt logs/scripts retained.

Current default aggregate:
`968f6d000d4b6c2cc3c66cd3add5845cb30385cdad752fe831b564823db9b764`.
Current aggregate with unchanged exact arm64 engine manifest:
`51f81cd187caf269ecffa83fecc35a4f665b70942716d7858fa7d964d3b335ed`.
Ignored local build retained at
`/Users/normy/autobyteus_org/autobyteus-worktrees/shared-network-workspaces/autobyteus-nfs/out/ir007-local-candidate`:
Linux arm64 CLI SHA `0036ccef0bbb2a2510064f2e882b692687a2288eb25563d89f9c4ac9150c860c`,
Darwin arm64 CLI SHA `64085e451774b99666ae272c78111d3f3c3972a619aa4cf7e4da657abb79df04`.
Source-copy delta exactly release.json + two debs; metadata bytes verified in
both binaries, native version invoked. `build-result.json` inventories4 files.
No engine/image/source-package rebuild, no qualification; Docker image identity
not assigned here. API must bind an actual owned current image for Docker-hosting
checks. Retained IR005 exact pair/source/notices remain at their original paths.

## Risks / frontend / environment

Only the SR021 observed local-driver diagnostic grammar is qualified; unknown
formats remain incomplete, not heuristically restarted. Serial controls are
supported; no race-free guarantee against conflicting external Docker commands.
Hard NFS/probe IO can wait indefinitely under deferred outage scope. Actual
post-reboot Docker normalization/controls and immutable-ID adapter must be
proved, not inferred from mocks or prior name-based diagnostic Start.

Frontend rendered feedback: **Not Applicable** — no rendered frontend change.
CLI confirmation and launcher guidance checked at source/function-fixture layer;
real administrative public reconnect and Stop controls await API. API003's prior
actual desktop scoped checks remain historical, not rerun. Five old dist trees
and all user resources untouched. Owned scratch/toolchain/copies removed per
cleanup receipt; only explicitly inventoried ignored candidate retained.
No provider, live user node/mount/data, hosted workflow, merge/push/release or
TaskDone. FUP001 remains PM-owned, no duplicate task/notification/patch.

## Required downstream order

1. Independent **source review first** on IR007/SR021/ARCH005. CRR008/API003 are
   not superseded by this implementation handoff.
2. After source Pass, **API-F003 first**: fresh public selected setup using actual
   current CLI/image, then **two ordinary whole-host reboots**, no manual
   Start/reconnect; actual API/mounted bytes/UUID plus same immutable ID/image/
   Config/HostConfig/ports/aliases/private/source proof. Normal Stop of a
   successfully running unless-stopped selected node, policy=no and unselected
   controls mandatory. Show already-failed Stop no-op/guidance separately.
   No150s SLA or forced-outage test invented.
3. Remaining approved bothOS native and managedDocker **clients**, Linux
   native/Docker **storage**, independent peers/restart/detach/preservation/locks/
   Git, native tools/assets/peer-close/restore/Standalone-Team-Org, all healthy
   mounted desktop preview/user journeys, physicalMac/Linux/Docker, documentation,
   finalization and user verification/explicitly authorized release gates.
   Only MacDocker STORAGE deferred; peer-NAT environment limit remains separate.

CR001, scoped CR002/API-F001 and CR004 resolutions preserved. API-F002 resolved
only at independently tested scope. D001/DEC015 is deferred NOTfixed; IMP-D001
current-source/independent Update-Remove/unchanged AGY/local and FUP001 custody
unchanged. No release approval or whole-product Pass inferred.
