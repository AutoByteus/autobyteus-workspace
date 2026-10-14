# Code Review Report

## Latest Authoritative Result / Review Meta

**CRR-008 — Fail / Design Impact. CR-005 P1 (API-F003): normal Linux host
reboot can strand a previously-running selected managed Docker client after its
NFS volume start fails, with no owned recovery after storage becomes ready.**
**API-F002 is independently resolved at API003's fresh public native-Ubuntu
create/reconnect scope. API-REV003 remains Fail /57.14% / broader Required.**

- Date2026-10-14. `shared-network-workspaces` /
  `project_task_0793009f-41bc-4684-9cbe-9a29ad26ed63`; **Large/High Reviewed** retained.
- Entry **API/E2E Failure-Origin Review**, round8. Review scope **N/A — focused
  failure-origin**, not a full re-audit or successful test-code review.
- Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/shared-network-workspaces`,
  branch `codex/shared-network-workspaces`, finalization `origin/personal`.
  API input/build HEAD`e8ed5627da2afa646c9ab89c6ce69b3a0bc0826c`; API report/evidence
  `f76cf11a519c8f22fd89e5acc946802c5d23259f`; reviewed current receipt HEAD
  `8f497a61fde65e44aefd2362f8fb37db91570997`. Source remains
  `eb7934072a1f98832b7b6330a1bc6a7f348fd93d`.
- Authorities: [Approved SR018 requirements](requirements-doc.md),
  [approval018](approval-record-sr018.md), [scope feedback](architecture-review-scope-feedback.md),
  [Ready SR020 design](design-spec.md), [investigation](investigation-notes.md),
  [solution history](solution-revision-record.md), [solution handoff](solution-design-handoff.md),
  [ARCH004 Pass](design-review-report.md), [architecture history](architecture-review-revision-record.md),
  [IR006 handoff](implementation-handoff.md), [implementation history](implementation-revision-record.md).
  These are unchanged, not silently reapproved by this review.
- Trigger: [API003 Fail report](api-e2e-execution-coverage-report.md),
  [coverage investigation](api-e2e-coverage-investigation.md),
  [ledger](api-e2e-test-case-ledger.md), [API history](api-e2e-revision-record.md),
  [failure summary](evidence/api-e2e/api-rev-003/new-failure-summary.json), and
  [625-reference input chain](evidence/api-e2e/api-rev-003/package-index.json).
  Prior source result **CRR007 Pass100/100** is historical, not current lifecycle
  qualification. [CRR001–008 history](code-review-revision-record.md) remains cumulative.
- DR **N/A — not performed**. Successful test-code review **not triggered**;
  cumulative af9f23 REST coverage unchanged and still awaits a passed package.
  Personal review only; no source/test fix, delegation, new runtime resources or release.

## Bounded Scope And Evidence Integrity

The [focused audit](code-review-evidence/crr-008/focused-audit.json) confirms all625
incoming paths exist, all169 API manifest entries match,22 focused source/authority
paths equal reviewed input, and11 retained IR005 candidate files match. Only API
artifacts changed since CRR007 input; **no post-review implementation/test edit**
caused this failure. Identity checks are not a fresh source audit or test run.

Reviewed only supported restart/preservation requirements and the smallest
production chain: CLI service, serial supervisor, OS job, setup reconnect/apply/
status, Docker engine/volume/recreation/config references, exact failing harnesses,
raw journals/inspect observations, build provenance, prior failure resolution and
cleanup. [Checks/limits](code-review-evidence/crr-008/checks-and-limits.md) and
[execution evidence review](code-review-evidence/crr-008/execution-evidence-review.json)
record personal checks versus inherited execution. No new VM reproduction was
needed to classify this evidenced ownership gap; API disposed its test resources.

## Prior Finding Resolution — Checked First

| Finding | Current disposition | Evidence |
| --- | --- | --- |
| CR-003 / API-F002 | **Resolved at independent public native-Ubuntu scope**; prior design/source acceptance retained | API003 `linux-public-final-result.json` and actual harness: fresh Ubuntu24.04.5/ext4/kernel7.0.0-38, default delegationsY, no engine preinstall/probe bypass, actual nonroot1000:109/no groups, public create16.778s; root-installed current CLI,700/600 private and644 public modes, hard4.1, original source inode/device/UID/GID/mode/bytes and mounted UUID, active managed jobs; reconnect0.508/0.605s and preservation pass. Seven cases independently reconciled to raw outputs. Two earlier fresh-create passes followed by harness errors remain separate incomplete attempts |
| CR-004 | **Resolved at source/contract boundary, retained** | IR006/CRR007 four status gates and regression; no workflow change since. Hosted Actions/signing/publication not executed |
| CR-002 / API-F001 | **Scoped native-Mac cold-create resolution retained** | API002 two fresh public passes and untouched source; no fresh Mac create claimed in API003 |
| CR-001 | **Resolved, retained** | New-directory mode/trust correction unchanged; API003 fresh077/root/nonroot proof corroborates Linux scope |
| FUP001 | **PM-owned out-of-scope follow-up unchanged** | Historical current-source Nuxt/Electron failures versus removed-candidate green remain distinct; no duplicate follow-up/task/patch/penalty |

## Candidate And Supported Scenario Gate

### CAND009 — Selected managed client stranded by ordinary whole-host reboot

**Promote -> CR-005. Supported Normal Scenario; Reachable; in this ticket.**

- Independent basis: REQ014/019 and AC007/014/018/019; SCN009/013, BEH001/004/005.
  AC009/017 and selected-node/private-state contracts constrain preservation.
  Requirements explicitly retain normal repeat/restart in DEC015. This is not an
  invented concurrent workflow, injected outage, or test-created product promise.
- Actor/goal and trigger: owner has completed guided setup on a supported Linux
  machine hosting Docker storage plus a selected running managed Docker client;
  performs an ordinary host restart and resumes the same shared workspace without
  extra Docker/mount/setup commands. Supported surface is public create/connect
  and normal OS reboot, followed by saved managed service/daemon startup.
- Preconditions: current public launcher node, completed public create with
  selected-node consent/drain, exact running/restart state preserved, storage and
  client on local Docker, network healthy when startup completes. Source is
  nonempty and unchanged. A separate unselected node was deliberately stopped.
- Forward path: first-use `setup.Apply` readies engine/host and probes volume before
  recreation; saved service then starts on boot. Docker independently restores
  engine and client; the client's local-driver NFS mount runs before its process
  and before Ganesha is ready. That start fails. The service later reconciles
  engine/host only; the client remains stopped even after public reconnect.
- Consequence: same selected node/API remains unavailable, despite healthy host
  mount/export; requires extra manual Docker start. No source loss, false-ready
  status or changed private config is evidenced. That manual workaround conflicts
  with the approved one-service normal lifecycle, so this is not a follow-up.
- Evidence: two ordinary `sudo -n systemctl reboot` runs with distinct boot IDs,
  before/after inspect, raw startup journals, repeated host/node/API status and
  diagnostic-only start of the same node. Full source path below. The test
  confirms a preapproved scenario; it does not establish that scenario itself.
- Exclusions: no claim that every stopped node should start, every platform has
  this failure, or recovery must meet150s. Neither observed stopped state nor an
  old recreation receipt alone proves current operator intent. Do not infer an
  all-stopped restart rule or deferred outage machinery from this finding.

No additional speculative material premise. Unchanged earlier architecture
premises remain at their recorded scope; the inadequate restart integration is
captured completely by CAND009 rather than assigned a fictitious prior premise ID.

## CR-005 — P1: Close the normal-boot storage/client lifecycle ownership gap

### Production path and design evidence

| Boundary | Evidence / relevant invariant |
| --- | --- |
| First-use apply | `internal/setup/apply.go:122–153` orders host mount/nonroot proof, selected volume/probe/recreation, then installs job. This explains why initial setup works; it does not order later Docker daemon restoration |
| Docker mount | `internal/docker/attachment.go:16–40` uses direct local-driver NFS volume. Mount occurs before application process startup; the application cannot wait for storage from an entrypoint it never reaches |
| OS/service owner | `internal/platform/jobs.go:43–57` starts a simple service after network-online; `internal/cli/run.go:80–89` calls `service.Supervise -> s.Reconnect`; `internal/service/supervisor.go:15–29` serializes and repeats that same reconciliation |
| Reconnect | `internal/setup/lifecycle.go:13–67` validates source, ensures engine, publishes/checks descriptor, ensures host mount and nonroot probe. **It never reconciles selected client startup.** Pending mutation is correctly refused rather than blindly resumed |
| Engine versus application | `internal/docker/engine.go:18–59,82–86` owns the exact Ganesha container and persistent restart policy, not application client readiness ordering. Engine-only recovery does not restart the client whose earlier NFS mount failed |
| Preservation and status | `internal/docker/recreate.go:113–131` preserves running/stopped state at apply; `snapshot.go` keeps opaque Config/HostConfig. `setup/status.go:76–78` truthfully reports attached/stopped/not ready. Config node references and completed receipts do not define current boot-recovery intent |
| Reviewed design | `design-spec.md:157–159` limits supervisor to source/mount/engine and expects engine-before-client mount/healthy restart. Lines166–173 specify direct Docker NFS volumes and preserved running/restart state, but **do not assign or establish boot-time ordering/eligible failed-client recovery**. Current code follows that limited owner, leaving the required path incomplete |

All source paths above are relative to `autobyteus-nfs/`. This is not a request to
start arbitrary nodes, recreate them at every boot, rewrite restart policies or
make status mutating. Exact current intent, selected identity, private volumes/
auth/ports/aliases/image, unrelated nodes and source must remain preserved.

### Runtime confirmation

Selected node `689c89e631dd82ef0f57b454332f3a57d45806e898dc5c3e00f1c3240e7c0a38`,
current full server image `sha256:dd986b8ae47f0947516d1b708df200161d28a33706eb177b59b1afa70be937b4`,
was running with `unless-stopped`. Public selected create/reconnect and ordinary
`docker restart` passed before whole-host reboot. The selected and unselected
fixtures are test-owned; public launcher/current full image and before-NFS port
fixture correction are documented, not stale beta/dist-overlay evidence.

- First boot: Docker records selected-container NFS mount `connection refused`
  at07:40:10.280246, then completes daemon initialization07:40:10.302066.
  Selected node exited255, not restarting, not OOM; host later ready.
- Read-only diagnosis preceded repair. Public reconnect returned hostReadytrue
  with selected node still stopped. Diagnostic-only `docker start` restored the
  **same ID/Config/HostConfig/image** and API readiness; this is not a Pass for
  automatic recovery.
- Second ordinary boot reproduces: mount refusal07:46:57.935220; engine log starts
  Ganesha07:46:57.940143044; daemon completes07:46:57.962894. Fifteen observations
  through148.599s show stopped client/API unavailable, while hostReadytrue from
  the21.53s observation onward. Source inode/device/owner/mode/bytes and mounted
  marker UUID`71887d49-17ec-4e6f-a734-03ebd3abaafd` remain correct.

Primary artifacts: [lifecycle](evidence/api-e2e/api-rev-003/managed-lifecycle-result.json),
[read-only diagnosis](evidence/api-e2e/api-rev-003/managed-reboot-diagnostic.json),
[second reproduction](evidence/api-e2e/api-rev-003/managed-reboot-repro-result.json),
[exact repro harness](evidence/api-e2e/api-rev-003/reproduce-managed-reboot.py).
No source or network change between diagnostic recovery and second reboot.

Supporting primary dependency contract: the versioned [Moby restore path](https://github.com/moby/moby/blob/docker-v29.1.3/daemon/daemon.go#L605-L642)
logs this start error and finishes that restore task; [mount failure precedes
process creation](https://github.com/moby/moby/blob/docker-v29.1.3/daemon/start.go#L154-L157).
[Docker restart-policy documentation](https://docs.docker.com/engine/containers/start-containers-automatically/)
does not provide this NFS readiness ordering and preserves manual-stop intent.
These sources corroborate the observed mechanism, not an upstream-Docker defect
or an assertion of distro-byte equality. [Fetch/interpretation limits](code-review-evidence/crr-008/primary-contracts.md)
are retained. The failure is not merely a short observation timeout: current
product reconciliation contains no selected-client recovery path.

## Origin, Review Gap, And Proportionate Routing

**Origin: inadequate reviewed dependency/lifecycle design, realized by the
implementation; earlier source-review coverage gap. Classification: Design Impact.**

Not a requirement gap: intended normal restart and preservation are explicit.
Not an invalid/stale test, fixture/VM availability issue, unrelated old app bug,
implementation edit after review, or deferred outage requirement. No evidence
requires blaming Docker for violating its own restart contract. Exact boot order
is runtime evidence; source alone could not establish its occurrence. However,
the earlier review should have challenged the absence of an owned, evidenced
engine-ready-to-selected-client boot path when checking AC014/019: first-use
ordering plus preserved restart policy was insufficient evidence. CRR007's
carried ownership/API-readiness/runtime-correctness rationale does not establish
normal selected-client boot completion. Other reviewed corrections remain valid.

**No new aggregate score or full structural checklist in this failure-origin
round.** The prior100/100 stays historical, not a current source/lifecycle Pass.
API confidence remains its owner's57.14%; this review does not rewrite that report.

Solution Designer must investigate and revise the smallest coherent startup/
recovery responsibility that satisfies the already-approved normal lifecycle,
including how eligibility differs from intentional stop, and how exact node/
source/private-state preservation holds. Select and evidence the owner/dependency
contract before implementation; do not prescribe blanket retries, arbitrary fixed
sleeps, all-stopped-node starts, global Docker changes, an app entrypoint workaround
or a generalized outage worker. A changed intended behavior needs renewed approval;
an architecture-only repair within approved intent does not silently narrow it.
Update investigation/design/solution history and use configured architecture
routing. Implementation-owned correction must return through source review and
API/E2E; after a passed cumulative API package, separate proportional test review
still precedes Delivery. Documentation impact: normal lifecycle/recovery contract
and validation guidance need synchronization by their owners, not a manual-start
workaround relabeled as completion.

## Residual Evidence, Scope And Handoff

API003's additional scoped passes remain evidence, not broad qualification:
Linux native/Docker storage lifecycle and preservation; selected Linux Docker
create/reconnect/node restart; actual mounted HTTP/GraphQL CRUD/static/HTML/image,
PTY Git and same-kernel two-mount record locks; current isolated Mac desktop
remote-window Guide/HTML-relative-image/image/text after deliberate Files refresh.
Go7 race/vet and Python52 enumerated/49pass/3skip belong to API003, not reviewer
reruns. Raw harness errors and45 upstream/raw build whitespace warnings remain
recorded separately; they are not additional product findings.

Mandatory remaining both-OS native/managed-Docker client matrix, Mac managed
Docker client, independent physical Mac/Linux/Docker/healthy peer proof, actual
native tools/unread linked assets/peer close/restore/Standalone-Team-Org, completed
artifact/remaining healthy previews and docs/finalization/user/release gates stay
open. Native amd64 engine, hosted workflow/signing/publication/public installer
remain unqualified. Only MacDocker **storage** is deferred; peer-network limits
are separate. D001/DEC015 outage isolation remains deferred/not fixed, not a new
gate. IMP-D001 private current-source links/independent Update-Remove/AGY/local
policy unchanged; no pin/copy/refcount/retirement. FUP001 remains PM-owned; no new
out-of-scope follow-up or duplicate notification.

Exact retained engine pair/source remains unchanged; API regenerated current
native CLI`0f7d6a37e8d418f3fd16ae83e16ef4ca45fd75311a93cb40237665afca4db2b4`
and Docker CLI`532b98169d7434cd76d9e279397fc6a03a00f9dabb1fcf951dfdad75471169ff`.
Current aggregate hashes and all limits are in the audit. Empty qualifiedTargets
remain; current default unavailable Guide is intentional. No release confidence
is inferred from package checks or the older ignored IR005 CLI.

Review Decision **Fail**; Scenario/Material-Premise gates **Pass** (basis proven,
not product success). Recommended owner **Solution Designer**. Fresh matching
rule and handoff state (receipt when confirmed) recorded in
[CRR008 routing](code-review-evidence/crr-008/routing.json); complete chain in
[CRR008 package index](code-review-evidence/crr-008/package-index.json). API cleanup
complete; no live failing VM retained. No duplicate forwarding, Task Done,
merge/push/tag/release or user-verification claim.
