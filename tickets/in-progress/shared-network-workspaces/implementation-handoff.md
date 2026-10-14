# Implementation Handoff — IR-004

## Current result

**Local Fix Complete — CR-002 / API-F001 addressed; independent source re-review required.**
Latest source-review authority remains **CRR-003 Fail**; **API-REV001 Fail** and
confidence57.14% remain unchanged pending independent retest. Historical CRR002
source Pass and CR001 resolution are preserved, not reopened.
IR004 corrects Apple activation-to-mount startup sequencing through registered-port
and actual NFSv3/MOUNTv3 serving checks in the existing backend. Two complete fresh
native Mac VM checks pass; failed candidates and one harness-only false assertion
remain recorded. Implementation and local checks performed personally, no delegation.

IR002's full-suite results remain historical local evidence for unchanged areas,
not an all-green repository result: the same3 baseline updater failures remain.
No API/E2E forwarding is authorized until independent review passes this correction.

This is not delivery, release, physical-system qualification or API/E2E signoff.
Current code and this handoff are authoritative; preserve IR-001's design finding
history instead of rewriting it into an earlier implementation pass.

## Upstream artifact package

Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/shared-network-workspaces`.
Branch: `codex/shared-network-workspaces`; base/finalization: `origin/personal`.
Task: `project_task_0793009f-41bc-4684-9cbe-9a29ad26ed63`.
Ticket root (all ticket-relative artifacts below live here):
`/Users/normy/autobyteus_org/autobyteus-worktrees/shared-network-workspaces/tickets/in-progress/shared-network-workspaces`.

- `solution-design-handoff.md`: full cumulative upstream index, not superseded by
  this implementation summary. `investigation-notes.md` is the full supplement/raw
  evidence inventory; read its still-relevant links, limitations and historical failures.
- `requirements-doc.md`: unchanged **Approved SR018**; approvals
  `approval-record-sr018.md`, `approval-record-sr017.md`, user direction in
  `architecture-review-scope-feedback.md`.
- `design-spec.md`: **Ready SR019**, reviewed design commit `4c28e7865b`.
- `solution-revision-record.md`: cumulative requirements/design history.
- `design-review-report.md`, `architecture-review-revision-record.md`:
  **ARCH-REV-003 Pass**, review commit `65b0e6e57a`; independent architecture review
  applies. ARCH-REV-002's source-lease acceptance is superseded, ARCH-REV-001/D-001
  remains historical. No production behavior is qualified by those reviews.
- `implementation-revision-record.md`: IR-001/002/003 preserved plus current **IR-004**.
  Current trigger **CRR-003 / CR-002 P1 / API-F001**. Historical **IMP-D001**, detailed original evidence
  `implementation-evidence/ir-001/source-lease-design-impact.md` and `source-audit.json`.
- Retained feasibility supplements under `evidence/feasibility/`:
  `sr019-artifact-audit.json`, `sr018-artifact-audit.json`, `sr017-selection-report.md`,
  `experiment-index.json` and all indexed raw FR001–057 receipts, `feasibility-report.md`,
  `macos-vm-feasibility-report.md`, `native-folder-hosting-report.md`,
  `backend-correctness-report.md`, `private-runtime-skill-report.md`,
  `native-private-readiness-report.md`, `real-agent-roundtrip-report.md`.
  These are historical experiments, not current-product qualification.
- UI reference: `evidence/ui-reference/docker-guide-user.png`; no separate
  Product-owned behavior supplement was requested (N/A — not applicable).
- Current local-fix evidence: `implementation-evidence/ir-004/checks-and-limits.md`,
  `startup-investigation.md`, `source-audit.json`, `local-checks-result.json`,
  `vm-summary.json`, `run-mac-cold.py`, raw8 VM attempts and `cleanup.json`.
  `package-index.json` inventories IR004 receipts; `final-source-check.json` verifies
  source/history preservation. `packaging-check.json` records untouched raw-log
  whitespace warnings; source and authored artifact whitespace checks pass.
  IR003 permission fix/evidence remains under `implementation-evidence/ir-003/`.
- IR002 implementation evidence index:
  `implementation-evidence/ir-002/checks-and-limits.md`; historical source hashes,
  expanded check receipts, native metadata discovery, rendered artifacts and all
  earlier failures reside alongside it. `progress.md` is historical checkpoint context.
- `code-review-report.md`, `code-review-revision-record.md`: **CRR-003 Fail / Local Fix**;
  `code-review-evidence/crr-003/` contains source contracts, focused hashes, execution
  summary, routing and limits. Review commit164e871e55, receipt4ed9a12720.
  Historical CRR002 Pass (3b7dd9a289) and CRR001/CR001 permission finding retained,
  with all `code-review-evidence/crr-001/` and `crr-002/` receipts.
- `api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md`,
  `api-e2e-revision-record.md`, `api-e2e-test-case-ledger.md`: **API-REV001 Fail**,
  API-F001; `evidence/api-e2e/api-rev-001/package-index.json` indexes actual V01 Pass,
  V02/single-VM Fail, public reconnect limits, source identity, executed harnesses
  and cleanup. API evidence1009ce87e5; API-owned REST fixture correctionaf9f23 unchanged.
  Reviewer did not rerun that API evidence. This fix does not overwrite its result.
- DR: **N/A — not yet performed**, not waived or marked passed.

## Current implementation summary

- Cycle: Implementation-owned **Local Fix** after API failure-origin review; revision **IR-004**.
- Related revisions: SR-019 / Approved SR-018; ARCH-REV-003, retained preceding history.
  **CRR-003 / CR-002 / API-REV001 / API-F001** current trigger; DR N/A. IMP-D001 historical resolution retained.
- IR004 fix: **`174e480bd0cfaee29f22fd46b1922afbb274e56b`**; `backend/apple_apply.go`,
  new `apple_startup.go` + durable unit regression, and selected-endpoint arguments
  in `setup/apply.go`/`lifecycle.go`. Existing Apple owner waits for TCP registrations
  AND NULL replies at explicit ports before returning to the one-shot mount/probe.
  Narrow startup conditions only; invalid setup/procedure/auth errors remain fatal.
  No implicit-lookup fallback, daemon policy, mount retry, OS ownership or state change.
- IR003 fix (retained, CR001 independently resolved by CRR002): **`dfeac830f468994255fdafc31f66cdbeee1852cc`**: one production owner
  `autobyteus-nfs/internal/platform/commands.go`; durable Go directory/installer
  regression and existing Python bootstrap fixture extended. Only newly created
  directories receive exact requested modes, including recursive0755 parents;
  private0700, root trust, unsafe-existing refusal and installer077 remain.
  No data/source chmod, global umask change, private-source retention or new scenario.
- IR002 production/source tests/docs: `c57ab71c90930a0c98e1310d07b0808d28dfbd14`.
  Separate baseline fixes: launcher quoting `6717bcb221`; isolated-core traversal
  fixture `f34fc81aa2` (full core rerun:298 files/2,019 tests pass).
- Standalone Go service, installer/release plumbing, selected managed-node adapter,
  optional launcher reference, lazy application binding and scoped Git child env,
  private linked runtime profiles and Nodes NFS Guide are implemented.
- **IMP-D001 resolution implemented:** catalog lookup is not source acquisition.
  Exact private process/profile cleanup owns wrappers/links only. Source Update/
  Remove keeps its independent deletion policy; no source-byte pin/refcount,
  snapshot, copy fallback or retirement queue. AGY's capsule/manifest restore policy
  and ordinary local materialization/collision/runtime permissions remain unchanged.
- Source files, node private volumes/auth state and healthy REST streams are not
  moved into another storage layer. No outage worker/stream lease/cwd trampoline.

## Routing classification

- `task_size: Large`; `architectural_risk: High` — **confirmed**, no downgrade.
- Design section: Task Size And Architectural Risk. Multiple privileged OS engines,
  persistent storage identity, destructive-boundary Docker preservation, runtime
  lifecycle and release surfaces confirm the original scope/blast radius.
- Selected completion route: **Code Review**, per refreshed handoff rules for completed
  implementation-owned Local Fix on an existing Large/High package, exact recipient `/software_engineering_team/code_reviewer`.
  Request that review after this cumulative package is persisted. This is not
  delegation of implementation or execution of testing to another team.
- Direct-route lightweight review: N/A — independent source review is required.
- New design-impact/requirement escalation: None identified. Additional independent
  evidence and release gates remain outstanding, not silently converted to a design
  waiver or called completed implementation validation.

## Reviewed behavior implementation trace

Production paths below are relative to the worktree root.

| Behavior | Approved change / preserved outcome | Actual owner and key paths | Implementation result / evidence limit |
| --- | --- | --- | --- |
| BEH001 | One app-independent guided service, selected original source and same mapping across reconnect | `autobyteus-nfs/cmd/autobyteus-nfs`; `internal/cli`, `setup`, `config`, `service`, `platform/jobs.go`; `scripts/public/nfs/install.sh`; release workflow/packaging | Implemented normal create/connect/status/reconnect/detach and pending-state ownership. IR003 new-directory modes retained; IR004 Apple serving barrier corrects CR002. Two fresh current native-Mac VM creates under077 verify source/mounted bytes/UUID and live job; not physical/peer/reboot/published-installer qualification. |
| BEH002 | Standalone/Team/Org/restore normal tools/cwd, configured skills, no intentional shared temp fallback | server `agent-execution/services/shared-run-workspace-admission.ts` via `agent-run-manager.ts`; `workspaces/shared-workspace-binding.ts`; native helper/resolvers; shared `runtime-skill-profile.ts` and `prepare-private-runtime-skills.ts`; Claude/Codex/Grok exact discovery adapters/process owners | Shared activation check central, private linked profiles/process close implemented; ordinary local branch retained as a distinct supported mode. Unit and native signed-out discovery proof, not real native tool/support-asset/peer-turn proof. |
| BEH003 | Same filesystem bytes and documented concurrency/Git behavior | Go `backend/apple*`, `ganesha*`, `platform/mounts.go`, filesystem/file-handle qualification; server `runtime-management/shared/scoped-project-git-environment.ts`; core `tools/terminal/terminal-child-environment.ts` and existing PTY/process owners | Hard TCP NFS3/NFS4.1 mapping, source nonroot map-all, child-only exact-project Git trust preserving indices. No merge/sync/cache substitute; mounted filesystem/concurrent peer semantics await actual matrix. |
| BEH004 | Known bad new-run binding not ready, ordinary healthy reconnect, no local substitute | Go `setup/status.go`, `lifecycle.go`, `service/supervisor.go`; server lazy descriptor/mount/source/UUID/access checker | No global workspace startup scan or per-turn/file checks. Actual bad binding rejected, status host/node distinctions retained. Checks may stall; no outage deadline. |
| BEH005 | Explicit consent/trust/nonroot source, preserve exact selected nodes and all private state | Go `setup/plan.go`, `apply.go`, `detach_nodes.go`; Docker `snapshot.go`, `recreate.go`, `recovery.go`, `ownership.go`, probe receipts; root/private config, Apple exact blocks; launcher `nfs-attachment.sh`, `container-config.sh` | Immutable selected-node image/config/private/anonymous volumes/ports/network aliases preserved, no general launcher reuse or node image pull. Pre-start rollback vs new-drain-after-possible-work distinction; fake transport tests. No real nodes were modified. |
| BEH006 | Healthy explorer reload/media/HTML/relative assets/completed artifacts use existing contracts | Existing `api/rest/workspaces.ts`, `api/rest/run-file-changes.ts` and projection/stream readers **unchanged**; extended `tests/unit/api/rest/workspaces.test.ts` and existing completed-artifact tests | Local byte/MIME/static/missing/projection/no-store regressions pass. No new authorization/path/stream policy. Actual mounted UI and broader API proof remain downstream. |
| BEH007 | Nodes NFS Guide, truthful copy/download availability, existing settings pattern | web `NodeManager.vue`, `NodeManagerTabs.vue`, `NfsGuideCard.vue`, pure `utils/nfsLauncherCommands.ts`, en/zh-CN settings strings | Actual components rendered; route, keyboard, responsive English/Chinese, unavailable release, fixture copy success/failure checked. Default release is null; no invented/published command or automatic execution. |

Scope Guardrail respected: **Yes**. Windows, Mac-Docker storage hosting, public
multi-tenant/secure internet NFS, sync/HA/distributed Git conflict resolution and
bounded-outage isolation were not added. Native/managed Docker **clients on both
Mac/Linux** remain included; Docker-on-Linux storage is separate from Mac hosting.

## Design health, ownership and implementation decisions

Reviewed posture Larger Requirement / Missing Invariant / Boundary Or Ownership
Issue confirmed. Narrow refactor needed now is implemented for process-private
skill links, known shared activation and selected-node preservation. The design's
source-lease premise was already corrected through IR-001/SR019/ARCH-REV-003; this
round follows the corrected contract rather than implementing a new source owner.
Existing registry, filesystem, PTY and REST stream owners remain authoritative.

Normal partial preparation/close ownership is explicit: register profile before
awaits; native close must complete before deleting only its profile. Failed close
retains the profile for retry; source bytes and peer profiles are not cleanup targets.
Existing source Update/Remove may break links. Neither current catalog resolution
nor metadata-only native discovery proves retention of source support files.

Service configuration uses fixed root-owned private directories and a separately
traversable fixed libexec binary for nonroot probes. Per-node public opt-in reference
is a typed root-owned record, not a root-sourced launcher `.env`. A descriptor
**directory** is bound read-only, avoiding old atomic-file inode binds. Pending
setup/recreation and disposable probes have exact-resource receipts; no generic
workflow engine, per-action pool or watchdog. External edits cause refusal or a
retained-settings report, not blind overwrite. Cleanup preserves source/marker,
recovery and named volumes; the guarded empty mount directory is conservatively
retained rather than recursively removing filesystem parents.

## Legacy / compatibility / size checks

- No compatibility shim, dual persisted shape or source copy fallback introduced.
  Configured shared vs ordinary local are the two approved modes, not old/new
  versions. Registered shared resolver failures propagate instead of falling back.
- Touched dead code removed/not introduced: obsolete shell helper placement moved
  to its current owner; no duplicate legacy implementation retained. No unrelated
  dead-code cleanup or established out-of-scope dead-code finding.
- Shared structures kept tight: specialized private runtime profile/adapter and
  optional per-session child env; no general global filesystem abstraction.
- Canonical design guidance reapplied. No changed implementation file exceeds
  500 effective nonempty lines; new Go owner files <=220 nonempty after decomposition.
  Existing launcher runtime shrank 497 ->450. Source audit records size pressure;
  test files are outside the hard implementation-file limit.

## Persisted data transition

Approved decisions followed: existing workspace/run/launcher references **Directly
Usable — No Migration**; execution-private profile files **Discard or Rebuild**
under their exact owner; new service subjects have new typed records. Known-field
readers tolerate additive fields; no schemaVersion, startup migration, history
scan, source retarget queue or version-specific runtime fallback was introduced.
AGY keeps its existing capsule manifest and missing-source warn/skip restore.

## Local implementation checks and frontend feedback

### IR004 current local-fix checks

`implementation-evidence/ir-004/checks-and-limits.md` is the detailed current evidence
index. Go7 packages race/vet pass, Python6 pass plus child fixture invoked through
Go,4 target builds pass, native version and unqualified-publication refusal pass.
Three mutation controls fail on expected assertions: command-only activation,
one-shot observation, blanket retry. Five durable startup-test groups cover RPC
registration/actual serving, partial startup, exact targets/ports, invalid setup
and bounded unsuccessful observation with original errors preserved.

Two separate fresh native-Mac VM complete harnesses pass13.407s/11.496s under077,
without manual reconnect. Original source inode/device/owner/mode and bytes remain;
mounted bytes/UUID match; private0700/0600, exact root binary and live launchd job
verified. A third current-source create passed but its expanded harness incorrectly
required GID0 instead of root ownership and private modes; that false assertion is
retained and corrected in the two subsequent runs. Baseline and three rejected
candidate failures are also retained. Packet evidence refines RPC startup/implicit-
lookup diagnosis; not a statd/NLM feature prescription or blanket retry.

All8 exact disposable clones and owned toolchain/scratch cleaned. No host shares,
credentials, providers, user node or host mount. This is narrow implementation
regression requested by CRR003, not broad API/E2E coverage, physical proof or release.
No rendered UI delta: new-round frontend feedback N/A; IR002 render proof retained.

### IR003 carried local-fix checks (historical)

`implementation-evidence/ir-003/checks-and-limits.md` and `final-checks.json` record
all7 Go packages race/vet passing,7 Python cases (6 pass plus the child fixture that
runs through Go), and the real-bootstrap-to-Go fixture covering077 inheritance,
Mac/Linux private/executable/public/node directory layouts, all new ancestors,
0644 descriptors, private0600 receipts and actual nonroot fixture exec/read.
Three mutation controls fail as expected for old mkdir-only behavior, missing node
mode, and missing intermediate-parent mode. Four OS/architecture targets compile;
native version/unqualified-release refusal pass. No privileged/root install was
claimed in IR003: fixture trust is substituted inside an owned temp root, not actual sudo
or a different-UID root-owned traversal. No OS resources or user data touched in IR003.

Production owner78 ->86 nonempty lines,137 other IR002 audited paths unchanged;
no source-size trigger. New tests excluded from production-file limit. No dead
code/compatibility path or persisted transition added. This is a bounded approved
BEH001/005 / SCN001/011/013 / AC012/018/019 correctness fix, not design recovery.
No rendered UI delta in IR003; previous rendered proof retained.

### IR002 carried checks (not re-executed in this local-fix round)

Read `implementation-evidence/ir-002/checks-and-limits.md` for commands, final logs,
retained failures, native metadata-only receipts and explicit untested layers.
Server: 686 files/5,402 tests passed, four files/seven tests skipped; production
build/typecheck pass. Initial terminal scope109 and guide scope21 pass. Go seven
test packages/race/vet and four-target cross-compile pass; only native version/
unqualified-release refusal was executed. Fake launcher38 run/two skips; installer/
packaging six tests pass. Full core rerun:298 files/2,019 tests pass. Web production
build and normal integration preparation pass; changed-boundary integration9 files/
52 tests pass, without provider gates. Full original Nuxt:611 files pass/1 fail/
2 skip;4,258 tests pass/3 fail/5 skip. Full original Electron:35 files pass/1 fail/
1 skip;188 tests pass/3 fail/1 skip. Both failures are the same baseline updater
classification issue, not NFS regressions. Candidate experiment results are not a
substitute for these authoritative suite outcomes.

Frontend loop: existing Docker Guide/settings components and approved screenshot
informed the design. Actual Nuxt NodeManager/NfsGuideCard rendered in an owned
browser on a task-only page with fake definition WebSocket and clipboard. Desktop
1280x1000, mobile390x844; en/zh-CN, actual route and keyboard navigation, no-release
disabled actions, fixture release copy-success and copy-error states inspected.
Responsive pill wrapping and keyboard focus/selection were implemented. Eight
assertions pass, no browser errors; screenshots plus direct interactions recorded.
The fixture URL is `.invalid`, real clipboard untouched. First cleanup-race failure
is retained; second run confirms browser/dev/page/home cleanup. This is not a full
application, Electron-shell, live mount, user verification or API/E2E pass.

## Environment, dependencies and limitations

Node22.23.1/pnpm workspace tools; installed shared-package dependencies and rebuilt
current outputs. Go1.27.2 official Darwin-arm64 archive checksum verified in a
**task-owned temporary toolchain**, not a global Go installation; removed after
checks with a cleanup receipt. Native installed
CLI metadata-only discovery: Claude SDK0.3.280, Codex0.162.1, Grok1.0.52, signed-out
throwaway homes, no provider prompts/keys. No user CLI config was edited.

Source/tests/docs are development commits only. Generated SDK dist outputs remain
untracked and deliberately unstaged. No merge, push, tag, publication, codesigning,
Docker engine build/pull, live user-node disruption or provider inference was
performed. IR004 used authorized credential-free disposable Mac guests for actual
guest root install/export/mount/job startup only; no host/user resource mutation. Release pins derive from the
reviewed reference inventory; current publication qualification is deliberately
empty. The UI must remain unavailable until actual qualified publication.

**DEC015/D-001 remains deferred, not repaired:** hard NFS may stall file operations,
previews, startup, terminals and unrelated work. Local component tests cannot prove
actual physical network semantics or prompt/tool behavior. IR004 narrows only the
fresh native-Mac setup gap with current guest execution. Peer/reboot/Docker/Linux/
physical and real runtime/preview gates remain; previous numeric unit coverage is
not replaced by an all-path claim from these focused checks.

## Out-of-scope finding and testing ownership

`implementation-evidence/ir-002/updater-follow-up.md` records the unchanged updater's
stack-path false positive. A diagnostic candidate patch and its separate rerun are
preserved **only as evidence, not applied to current source**. The reviewer has delivered FUP001 to `/project_task_manager`; CRR001 records
durable custody and pending approval for a separate Task. No new task/worker was
spawned by this implementation. Root
TESTING.md rule9 distinguishes small baseline repairs from separate product-change
follow-ups; the implementation skill's Scope Guardrail also excludes unrelated
production behavior. The in-scope launcher defect and fixture-only core correction remain separate development
commits; updater production changes were not bundled with NFS.

The user's request for full personal testing was honored within this role's
permitted local-check scope; no tests were delegated. The implementation skill
reserves API/E2E authoring/execution and broad system validation for the independent
validation role. This round executes only the specifically requested narrow
native-Mac startup reproduction/regression, not that broader matrix/signoff. The main
project Task remains open, not Done or Cancelled. The two previously cancelled
sub-work copies reported no edits, children or processes; no remaining delegated
implementation work is being awaited.

## Required downstream coverage / delivery gates

1. Independent Large/High source re-review of IR004 / CR002 first; then API owner
   reruns API-F001 cold case and continues the remaining matrix. Preserve prior
   source-review coverage of exact root-resource ownership,
   partial setup, native child/profile cleanup, selected-node daemon identity,
   consent/rollback, source Update/Remove and launcher attachment retention.
2. Current-build selected modes: native Mac APFS/Apple; native Ubuntu24.04 ext4/
   Ganesha; Docker-on-Linux storage; native and managed Docker clients on **both**
   Mac/Linux. Original nonempty source/identity, wrong/occupied target refusal,
   nonroot/root-squash, normal reconnect/restart and safe detach.
3. Real selected Docker Config/HostConfig/image/private volume/auth/ports/aliases
   preservation, requested IP mappings, pending/accepted-work recovery, stopped
   nodes, unavailable daemon and general launcher recreate/upgrade retention.
4. Normal standalone/Team/Org and all selected runtimes: actual native discovery
   and canonical paths, **previously unread support assets through native tools**,
   separate live peer stop, restore, source Update/Remove, partial setup/exact close,
   AGY capsule and ordinary local policies, scoped Git and explicit cwd semantics.
5. Healthy current-product explorer/media/HTML/relative assets/completed-artifact
   streams with unchanged auth/path/projection/MIME/errors/cache behavior. No claim
   of outage isolation or cancellation deadlines.
6. Independent physical Mac/Linux/Docker topology proof is mandatory **before
   delivery**, not retroactively an implementation prerequisite. API/E2E owns
   independent executable coverage; Delivery owns docs sync, finalization/merge,
   explicit user verification, approved release/signing/public assets and cleanup.
   Existing approvals do not authorize live user resources or paid provider use.
