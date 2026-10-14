# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `requirements-doc.md`, **Approved SR018**; approvals018/017 and DEC015 unchanged.
- Upstream Investigation Notes: `investigation-notes.md`, current SR021 and cumulative supplement inventory.
- Upstream Solution Revision Record: `solution-revision-record.md`, **SR-021**.
- Reviewed Design Spec: `design-spec.md`, **Ready SR021**, commit `cd1519a798`.
- Supplemental Task Artifacts Reviewed: current cumulative handoff; CRR008/CR005 origin and API003 public lifecycle/raw inspect/reconnect/reboot/diagnostic results; SR021 lifecycle investigation/observations/primary source contracts and audits; IR005/006 and prior architecture/source/API results at their recorded scopes. Full667-reference input chain: `evidence/design-recovery/sr021/package-index.json`.
- Relevant Solution Revision IDs: SR021 technical recovery; ApprovedSR018; SR019 source/profile and SR020 dependency corrections retained.
- Architecture Review Revision Record: `architecture-review-revision-record.md`.
- Current Architecture Review Revision ID: **ARCH-REV-005**.
- Current Review Round: **5**, 2026-10-14.
- Trigger: **CRR008 Fail / Design Impact CR-005 P1 / API-F003**, normal selected-client host-reboot recovery.
- Prior Review Round Reviewed: ARCH004 Pass on SR020; rechecked incoming failure and earlier finding dispositions first. No automatic SR021 Pass.
- Latest Authoritative Round: this report for architecture only. **API003 Fail57.14%/broader Required and CRR008 Fail remain independent current results.**
- Canonical ticket root: `/Users/normy/autobyteus_org/autobyteus-worktrees/shared-network-workspaces/tickets/in-progress/shared-network-workspaces`. Ticket paths below are relative to this root; source paths are worktree-relative.
- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/shared-network-workspaces`; branch `codex/shared-network-workspaces`; base/finalization `origin/personal`.
- Current-State Evidence Basis: personally traced CLI/job/serial supervisor/setup apply/reconnect/status, Docker discovery/snapshot/attachment/probe/verify/recreation/ownership and launcher Stop; read raw API003 failures, same-object diagnostic repair and versioned Moby contracts. Reviewer audit `architecture-review-evidence/arch-rev-005/review-checks.json` verifies667 unique existing refs,650 protected current paths,11 retained candidate files, unchanged approved basis and production aggregate **4568593b99bb3dff263e9824ceb7176e04a95ec90e3cd14a9f7421b4e43055ac**. Reviewer skill, full template/shared principles, root DESIGN/TESTING and applicable instructions applied; no closer NFS/script AGENTS found. **No reviewer product build/test/VM/runtime/provider/live-resource operation.**

## Routing Classification Review

- Task size **Large**; architectural risk **High**; independent review required **Yes**.
- Cumulative privileged service, native/Docker storage/client, runtime/private-state and distribution scope remains Large/High. SR021 alone is a bounded Medium/High lifecycle/persistence/ownership delta, not667 files of implementation.
- No downgrade or classification correction. Pass routes the revised cumulative package to implementation, then an informational Solution Designer notice after confirmed primary delivery.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: **Confirmed**. Normal restart and preserved operator/node/source state are already approved; no new product choice is needed.
- Approved basis: REQ014/019, AC007/014/018/019, SCN009/013, BEH001/004/005. REQ010/AC009/017 constrain node/private/source preservation. DEC015 does not defer normal healthy boot completion.
- Relevant existing behavior: initial Apply orders engine, host proof, daemon probe and selected node recreation; later Reconnect stops at host proof. Docker restores clients independently and can fail the NFS volume mount before their process exists. Two ordinary API003 boots reach this state; manual diagnostic Start of the same observed object restores API. Status truthfully reports the stopped node, not false READY.
- Scope guardrail: retain one command/service, existing source/UUID and native/Docker clients on both OSes; only Mac-Docker storage hosting is deferred. No outage watchdog, all-stopped retry, global daemon ordering, policy rewriting, app-entrypoint wait or private daemon-state reader.
- Every prospective blocking Design Impact is traceable to approved authority: **Yes; no new blocker accepted**. Remaining material ambiguity preventing this design handoff: **None**. Implemented automatic recovery and negative controls remain downstream proof, not inferred successes.

| Behavior ID | Kind | Design Alignment | Trigger / Current-State Evidence | Target Path Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH001 | Operational | Pass | Pass — completed selected setup, ordinary host reboot, API003 | Pass — DS001 first use preserved, DS006 completes eligible boot start | Confirmed | Implement only SR021 delta |
| BEH002 | User/System | Pass | Pass — existing shared workspace/runtime/private profiles unchanged | Pass — DS003 unaffected | Confirmed | Retain native linked-asset/peer-stop/restore gates |
| BEH003 | Contract | Pass | Pass — ordinary NFS IO and scoped API003 operations | Pass — DS002 unchanged, no copy/proxy | Confirmed | Remaining peer/both-OS/physical matrix |
| BEH004 | Operational | Pass | Pass — host-ready/node-exited after two boots and host-only reconnect | Pass — current eligibility -> fresh daemon proof -> same-ID Start -> verify | Confirmed | Two fresh ordinary reboots without manual repair first |
| BEH005 | Operational | Pass | Pass — selected/private/source preservation plus current Stop/policy contracts | Pass — no recreation/config change; exact-ID recheck; current policy veto | Confirmed | Normal-stop, disabled-policy and unselected controls |
| BEH006 | User/System | Pass | Pass — API003 scoped mounted HTTP and isolated desktop content checks | Pass — DS004 healthy readers unchanged | Confirmed | Remaining completed-artifact/preview coverage; no outage expansion |
| BEH007 | User/Interaction | Pass | Pass — guide unavailable remains truthful | Pass — DS005 release linkage unchanged | Confirmed | Current published qualification/Guide gates retained |

**Prior dispositions first:** API-F002/CR003 is now independently resolved at API003 fresh public native-Ubuntu no-preinstall create/reconnect scope; do not reopen it as unproved or inflate it to all modes. CR001 modes, CR002/API-F001 native-Mac cold-create and CR004 release gates retain their respective scopes. D-001 is deferred/not repaired; IMP-D001 current-source/profile/AGY policy remains. **CR005's design obligation is adequately addressed; product closure is pending.**

**Earlier architecture-review gap:** ARCH004 retained the host-only lifecycle boundary without establishing that Docker restart policy completed a pre-process dependency failure. First-use ordering is not a boot-order contract. API003 supplies the normal execution witness; this review accepts the narrow missing owner, not a blanket runtime-retry interpretation of the earlier Pass.

Independent forward source trace: `platform/jobs.go:JobDefinition` -> `cli/run.go:service` -> `service/supervisor.go:Supervise` under admin lock -> `setup/lifecycle.go:Reconnect` -> source/engine/mount/nonroot probe. Target extends this last owner through `setup/reconnect_nodes.go` -> Docker adapter's current selected failure classification/probe/reinspection/attempt/Start -> `docker/exec.go:VerifyStarted`. `Status` remains observational with respect to lifecycle; existing health probes may perform their owned test IO. `setup/pending.go` and `docker/recovery.go` retain explicit-drain recreation recovery, not automatic boot repair.

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose/Scope Clear? | Linked To Core? | Complete At Scope? | Consistent? | Status/Approval Clear? | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| Approved018/approvals017–018/scope feedback | Pass | Pass | Pass | Pass | Pass | No renewed behavior approval needed |
| SR021 design/investigation/history/handoff | Pass | Pass | Pass | Pass | Pass | Same bounded policy/observability/state contracts |
| CRR008/API003 reports/history/raw chain | Pass | Pass | Pass | Pass | Pass | Preserve failed automatic outcome and scoped successes |
| SR021 lifecycle investigation/public states/Moby source | Pass | Pass | Pass | Pass | Pass | Source/raw-evidence investigation only, no new runtime Pass |
| IR001–006, earlier reviews/feasibility/engine artifacts | Pass | Pass | Pass | Pass | Pass | Retain current implementation; no restart from scratch |
| Reviewer audit/script | Pass | Pass | Pass | Pass | Pass | Integrity and raw-receipt checks only |

No source/test change in SR021; its commit changes ticket artifacts only. API diagnostic command addressed the node by name; before/after inspect proves the same immutable ID/config, not execution of the proposed immutable-ID adapter. It is a mechanism witness, not automatic recovery proof. Delivery/finalization **N/A — not performed**; external Product spec **N/A — not applicable**. Existing implementation/source/API artifacts are not N/A.

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Current posture assessed | Pass | Actual normal boot failure after working first use | None |
| Root classification evidence-backed | Pass | Missing lifecycle ownership between storage proof and failed client start | Preserve CR005 origin, not blame an unproven Docker defect |
| Refactor decision explicit | Pass | Extend setup/Docker owner, reuse volume/probe/verify/storage | None |
| Concrete design reflects decision | Pass | DS006, eligibility, attempts, files, removal and controls aligned | Implement bounded delta |

## Spine Inventory Verdict

| Spine ID | Scope | Readable? | Narrative Clear? | Facade/Owner Clear? | Domain Naming Clear? | Ownership Clear? | Off-Spine Appropriate? | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS001 | Bootstrap -> consented setup -> engine/host/selected attachment -> verified path | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS002 | Tool -> native NFS -> source -> peer open | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS003 | Selected workspace/run -> binding/profile -> existing runtime/tools | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS004 | UI/tool -> existing file/preview/PTY IO -> result | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS005 | Nodes Guide -> actual release descriptor/copy -> terminal -> DS001 | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS006 | Ordinary reboot/job -> locked Reconnect -> host proof -> selected failed-start completion -> real API/binding result | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS006-L | Selected current identity/state -> daemon probe -> reinspection -> consume -> one Start -> verify/report | Pass | Pass | Pass | Pass | Pass | Pass | Pass |

Return path distinguishes hostReady, stopped/ineligible, recovered and incomplete selected nodes. Existing serial supervisor owns cadence; readiness evidence, not elapsed sleep, permits the action. Consumed-attempt state serves that owner, not a second scheduler. Retained SR020 release supply path still delivers verified identical native/Docker engine bytes; SR021 needs current CLI metadata, not an engine rebuild.

## Boundary Encapsulation Verdict

| Boundary / Owner | Entry Clear? | Internals Stay Internal? | Bypass Controlled? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Setup Reconnect | Pass | Pass | Pass | Pass | Host proof, current selection and admin sequencing |
| Docker failed-start adapter | Pass | Pass | Pass | Pass | Owns classification/probe/recheck/Start/result; raw grammar not in CLI |
| Docker initial recreation/Recover | Pass | Pass | Pass | Pass | Explicit consent/drain remains separate; no background call |
| Status and launcher Stop guidance | Pass | Pass | Pass | Pass | No lifecycle mutation from status or retry policy in shell |
| Existing runtime/source/release owners | Pass | Pass | Pass | Pass | Unaffected decisions retained |

## Dependency Direction / Forbidden Shortcut Verdict

| Boundary | Allowed Dependencies Clear? | Forbidden Shortcuts Clear? | Coherent? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Job/CLI -> SetupService -> Docker adapter | Pass | Pass | Pass | Pass | No direct shell/node mutation from supervisor |
| Adapter -> public daemon inspect/volume/probe/Start/verify | Pass | Pass | Pass | Pass | Same daemon/immutable ID; no private DB/event replay |
| Adapter -> existing Store | Pass | Pass | Pass | Pass | Atomic attempt, not desired-running authority |
| Setup/status -> typed node result | Pass | Pass | Pass | Pass | Per-node failure retained; do not mark hostReady as nodeReady |
| Existing first-use and release paths | Pass | Pass | Pass | Pass | No pull/recreate/global Docker reorder/new package command |

## Interface Boundary Verdict

| Interface | Subject Clear? | Singular Responsibility? | Identity Explicit? | Generic Boundary Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| Reconnect with explicit retry authority separate from service | Pass | Pass | Pass | Low | Pass |
| CompleteFailedStart(snapshot, connection, nodeAttachment, store, retryConsumed) | Pass | Pass | Pass | Low | Pass |
| Shared read-only volume inspect/validation | Pass | Pass | Pass | Low | Pass |
| Typed disposition and sanitized reason | Pass | Pass | Pass | Low | Pass |
| Attempt read/write by current selected node/incarnation | Pass | Pass | Pass | Low | Pass |

The example method signature is not a generic retry framework. `retryConsumed` can authorize one additional already-eligible attempt only after explicit reconnect confirmation/`--yes`; it cannot override current policy, identity, resources or failed-start qualification. No new API selector guesses between storage, node or process identity.

## Existing Capability / Subsystem Reuse Verdict

| Need | Existing Area Checked? | Extension Sound? | New Piece Justified? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Persistent healthy reconnect | Pass | Pass | Pass | Pass | Existing job/lock/supervisor reused |
| Daemon namespace readiness | Pass | Pass | N/A | Pass | Existing fresh image Probe, no auth/private mounts |
| Real application readiness | Pass | Pass | N/A | Pass | Existing VerifyStarted, not Running alone |
| Attempt dedup | Pass | Pass | Pass | Pass | Small new subject in existing atomic Store |
| Volume identity/options | Pass | Pass | Pass | Pass | Extract common read-only validator; only EnsureVolume creates |

## Subsystem / Capability-Area Allocation Verdict

| Area | Ownership Clear? | Reuse/Extend Sound? | Correct Spine Owner? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| setup | Pass | Pass | Pass | Pass | Complete selected set after storage, keep host/node outcomes distinct |
| docker | Pass | Pass | Pass | Pass | Qualified public observation/action boundary |
| config Store | Pass | Pass | Pass | Pass | Storage mechanics only, no eligibility policy |
| CLI/launcher docs/output | Pass | Pass | Pass | Pass | Explicit retry and truthful Stop distinction, not new supervisor |
| Other implemented capabilities | Pass | Pass | Pass | Pass | No new ownership change |

## Reusable Owned Structures Verdict

| Structure | Extraction Evaluated? | File Choice Sound? | Ownership Clear? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Volume driver/options/owner inspection | Pass | Pass | Pass | Pass | Same validator used by first-use and recovery; recovery never creates |
| Observed failure and result | Pass | Pass | Pass | Pass | Docker adapter types, not shared generic lifecycle catalog |
| Consumed incarnation record | Pass | Pass | Pass | Pass | Current node/daemon/storage/container/process identity only |
| Existing Snapshot opaque Config/HostConfig | Pass | Pass | Pass | Pass | Preserve external fields, add real State observations only |

## Shared Structure / Data Model Tightness Verdict

| Structure | One Meaning? | Redundancy Controlled? | Overlap Controlled? | Core/Variant Sound? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Snapshot.State extensions | Pass | Pass | Pass | Pass | Pass | Actual Error/timestamps/Pid/exit/OOM fields; no invented manuallyStopped |
| Attempt record | Pass | Pass | Pass | Pass | Pass | No Error string/policy/config/auth/READY; not historical desiredRunning |
| Connection/NodeAttachment | Pass | Pass | Pass | Pass | Pass | Existing selected reference/daemon/storage meaning unchanged |
| Result/status | Pass | Pass | Pass | Pass | Pass | Observation separate from saved intent and dedup state |

## File Responsibility Mapping Verdict

| File / Group | Clear Responsibility? | Matches Owner? | Re-Tightened? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| setup/lifecycle.go, reconnect_nodes.go | Pass | Pass | Pass | Pass | Reconnect ordering and bounded selected-set coordination |
| docker/start_recovery.go, start_attempt.go | Pass | Pass | Pass | Pass | Failure eligibility/action; separate small durable attempt |
| docker/snapshot.go, attachment.go | Pass | Pass | Pass | Pass | Public observation shape and shared read-only volume validation |
| setup/status.go, cli/run.go | Pass | Pass | Pass | Pass | Current outcomes/explicit override, thin CLI |
| setup detach path | Pass | Pass | Pass | Pass | Exact attempt cleanup after attachment removal |
| launcher commands.sh, NFS README and focused tests | Pass | Pass | Pass | Pass | Truthful Stop/policy guidance; no shell recovery policy |
| Existing engine/runtime/preview/release files | Pass | Pass | N/A | Pass | Preserved; current CLI source hash regenerated downstream |

## Subsystem / Folder / File Placement Verdict

| Path | Placement Clear? | Matches Owner? | Mixed/Over-Split Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| internal/setup/reconnect_nodes.go | Pass | Pass | Low | Pass | Cohesive selected-set ordering, not peer coordinator |
| internal/docker/start_recovery.go and start_attempt.go | Pass | Pass | Low | Pass | Distinct action and bounded persistence concerns |
| Existing config/CLI/script/docs | Pass | Pass | Low | Pass | No new global state/service/helper hierarchy |

## Removal / Decommission Completeness Verdict

| Item | Obsolete Piece Named? | Replacement Clear? | Scope Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Host-only reconnect boundary | Pass | Pass | Pass | Pass | Extended through selected failed-start result |
| Duplicated volume validation | Pass | Pass | Pass | Pass | One read-only validator, create remains first-use only |
| Unconditional Stop-as-cancellation wording | Pass | Pass | Pass | Pass | Correct guidance, no change to actual Stop operation |
| Recreate/Recover/runtime restart policy | Pass | N/A | Pass | Pass | Reachable and preserved, not dead code |
| Prior private veto draft | Pass | N/A | Pass | Pass | Rejected design, no phantom code removal to demand |

No additional dead code is established by this review. Remove genuinely unreachable touched helpers/imports/tests if implementation creates them; preserve reachable initial apply/recovery and local behavior. No unrelated cleanup expansion or new follow-up found.

## Legacy / Backward-Compatibility Verdict

| Area | Legacy/Dual Path? | Clean-Cut Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- |
| Docker recovery | No | Pass | Pass | One qualified current path, no arbitrary-error fallback |
| Existing attachment/receipt formats | No | Pass | Pass | Known-field direct use is not version branching |
| Automatic versus explicit reconnect | No | Pass | Pass | Distinct current authority, not compatibility fallback |
| Source/profile/local/runtime and engine contracts | No | Pass | Pass | Prior corrections remain unchanged |

## Persisted-Data Transition Verdict (When Applicable)

| Subject | Decision | Reader/Semantic Evidence? | Proportionate? | Migration Safety | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Attachment/node refs/source marker/receipts | Directly Usable — No Migration | Pass | Pass | N/A | Pass | Current readers/opaque node config, same meaning/UUID |
| start-attempt per selected node | New bounded subject — no migration | Pass | Pass | N/A | Pass | Missing means no completion attempt recorded, not permission to run |
| Runtime/source/workspace/history | Not Affected | Pass | Pass | N/A | Pass | No rewrite or global admission gate |
| Engine/release artifacts | Retain engine pair; rebuild actual CLI metadata | Pass | Pass | N/A | Pass | No user-data transition or old candidate qualification |

Existing `config.Store` checks directory/file owner/mode/no-symlink and bounded JSON; `AtomicFile` writes/fsyncs/renames/fsyncs directory. A new record is written before Start under existing admin lock; failure to persist prevents that Start. At most32 current selected entries, no expiry/history growth, exact detach cleanup. Malformed record inhibits only its node's automatic action. Successful process startup gives a new StartedAt; failed pre-process mount does not itself advance that process timestamp. Thus repeated supervisor cycles need not become repeated Starts. This is one-attempt accounting, not exactly-once distributed execution: interruption after recording may require confirmed reconnect. No migration framework justified.

## Change / Refactor Safety Verdict

| Area | Realistic Sequence? | Temporary Seams Explicit? | Cleanup Explicit? | Verdict |
| --- | --- | --- | --- | --- |
| Add public state/volume classification and attempt types | Pass | Pass | Pass | Pass |
| Extend Reconnect after host proof, separate explicit retry | Pass | Pass | Pass | Pass |
| Preserve initial recreation/pending/drain and runtime policy | Pass | Pass | Pass | Pass |
| Exact probe receipt and detach attempt cleanup | Pass | Pass | Pass | Pass |
| Focused fixtures/source review -> two public reboots -> remaining matrix | Pass | Pass | Pass | Pass |

No dependency rebuild is required by this lifecycle change. Retain verified engine assets; build the actual corrected CLI/source metadata. No broader product score or release qualification follows from unit controls.

## Example Adequacy Verdict

| Topic | Example Needed? | Clear Example? | Avoided Shape Explained? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Failed start versus ordinary Stop | Yes | Pass | Pass | Pass | Exact public state plus cleared successful-start error |
| Policy=no versus no-op Stop on failed node | Yes | Pass | Pass | Pass | Explicit durable veto; no imaginary inspect/manual flag |
| One consumed incarnation versus continuous retry | Yes | Pass | Pass | Pass | Pre-Start record, later process timestamp, explicit retry only |
| Same identity versus recreation | Yes | Pass | Pass | Pass | Exact immutable Start after fresh daemon proof; no pull/config rewrite |

## Material Premise Validation (Only When Needed)

### MP-006 — Ordinary host restart can strand a selected client before its process starts

- Authority/behaviors: REQ014/019, AC007/014/018/019, SCN009/013, BEH001/004/005; AC009/017 preservation.
- Initiating kind: **Operational / Supported Normal Scenario**. The owner normally reboots a supported computer after successful public create/connect with an opted-in running managed client, expecting the same workspace and node to return without extra setup commands.
- Independent trigger/surface: supported OS whole-host reboot, not a proposed retry or synthetic edit of hidden Docker state. API003 executes `systemctl reboot` on a disposable Ubuntu24.04.5/Docker29.1.3 reference.
- Forward witness: successful consented Apply/probe/recreation/publication -> ordinary reboot -> independent Docker engine/client restore -> local-driver selected NFS volume mount before Ganesha accepts connections -> pre-process connection refusal leaves exited/Pid0/error -> existing service establishes host mount/UUID/access only -> selected API remains unavailable. Public reconnect also lacks that last step.
- Preconditions/consequence: healthy completed setup, selected unless-stopped node, preserved source/nonroot settings. Two distinct boots reach failure;15 second-boot observations through148.599s show stopped node/API failure despite later host readiness. This duration is evidence, not a150s product SLA. Same observed container/config/image succeeds after diagnostic named Start; no recreation was needed.
- Reachability: **Reachable**. Raw lifecycle/repro/inspect journals independently corroborate production trace; no generalized outage assumption.
- Proportionate response: existing setup/Docker owner completes only the exact qualified failed start after positive daemon-side proof; no engine-ready fixed sleep, global ordering, app-entrypoint wait or runtime restart-manager takeover.

### MP-007 — Ordinary operator Stop must not become authority for background restart

- Authority/behaviors: REQ010/014/019, AC009/014/017, BEH004/005; existing Docker restart-policy contract.
- Initiating kind: **User / Supported Normal Scenario**. Operator stops a successfully running selected node through the existing launcher Stop or Docker control to suspend that node.
- Forward witness: launcher `commands.sh:stop_nodes` -> Docker Stop -> normal process stop. A prior successful Docker start cleared State.Error; the stopped container therefore lacks the required NFS startup diagnostic. Under unless-stopped, normal manual stop also suppresses Docker boot restore. SR021 rejects it both in background and explicit reconnect; `always` retains Docker's different own boot behavior, not a new AutoByteus promise.
- Preconditions/consequence: currently working node, serial supported control, not a fabricated concurrent command race. Starting it merely from old Apply Running or current Running=false would override the preserved control.
- Reachability: **Reachable** from existing exposed control. Public normal-stop validation still required; source reasoning is not an executed control Pass.
- Proportionate response: live failed-start eligibility and current policy, not remembered desired-running state. No new general cancellation subsystem.

### MP-008 — Stop on an already non-running failed start records no new intent

- Authority/behaviors: truthful control/preservation under REQ010/014/019, BEH004/005; applicable public Docker Stop contract.
- Initiating kind: **User / Supported Normal Scenario**. After observing the failed selected node, operator invokes the existing Stop command intending to keep it down.
- Forward witness: launcher forwards Docker Stop -> Docker sees not running -> returns NotModified before signal/manual-stop/event path; existing failed-start observation is unchanged. A later qualifying reconnect cannot observe that no-op as fresh durable intent. The new adapter is not proof of this absence; the preexisting public Stop source contract establishes it.
- Preconditions/consequence: exact already-failed/non-running state after MP006. No-op Stop is distinct from MP007. A private veto invisible to Docker would not inhibit Docker's own future restore.
- Reachability: **Reachable**; current primary source and forwarding path establish the limit. A fresh public no-op/control demonstration remains downstream work.
- Proportionate response: disclose the distinction and use current explicit restart-policy=no as the durable veto, rechecked before Start. Do not invent manuallyStopped inspect data or change policy automatically. This preserves the existing dependency contract, not a new mandatory setup step or permission to start ordinary stopped nodes.

Primary corroboration, independently read: [Moby start path](https://raw.githubusercontent.com/moby/moby/docker-v29.1.3/daemon/start.go) fails volume setup before process creation; [state transitions](https://raw.githubusercontent.com/moby/moby/docker-v29.1.3/daemon/container/state.go) clear error on successful running state and update process timestamps at their actual boundaries. [Reset](https://raw.githubusercontent.com/moby/moby/docker-v29.1.3/daemon/container/monitor.go) cleans streams/logging, not a new process incarnation. [Stop](https://raw.githubusercontent.com/moby/moby/docker-v29.1.3/daemon/stop.go) returns early for an already stopped node. [Docker restart-policy guidance](https://docs.docker.com/engine/containers/start-containers-automatically/) distinguishes policy/manual stops and cautions against competing process managers. These versioned contracts support the narrow design; they do not assert all distributions/diagnostic grammars are identical or establish a tested recovery result.

Retained MP001/002: normal workspace media/HTML/completed artifact -> REST parent IO during storage loss is **Reachable but explicitly deferred** under DEC015, not healthy-preview failure. MP003 confirmed source changed-revision Update and MP004 confirmed Remove -> source cleanup/private-link or AGY missing-source outcome remain **Reachable**, with no byte-retention promise. MP005 supported native create -> stock directory incompatibility remains a valid historical witness; API003 now closes it at fresh no-preinstall native-Ubuntu scope. Prior full witnesses remain in ARCH003/004 history. No machinery requires contrived concurrent contradictory Docker actions; the design makes no race-free external-command transaction claim.

## Unresolved Approved-Behavior Or Current-State Gaps

**None blocking architecture handoff.** CR005/API-F003 still requires implemented automatic completion and independent public revalidation. Unknown Docker error grammar fails closed and requires evidence, not a blanket retry. Remaining platform/physical/runtime/release gates are not design contradictions or new user-choice blockers. FUP001 remains in PM custody; separate peer-NAT environment limitation is unchanged.

## Review Decision

**Pass — ARCH-REV-005 / Ready SR021 / unchanged Approved SR018.** The bounded same-ID failed-start completion closes the design ownership gap without taking over runtime restart policy or restoring DEC015 machinery. This is implementation-ready design, not proof that API-F003 is fixed.

## Findings

**No new blocking findings.**

- **CR-005/API-F003:** design recovery accepted; implementation/source/API closure pending. Preserve ID and current policy; execute normal-stop/disabled-policy/unselected controls and two ordinary public reboots.
- **CR-003/API-F002:** independently resolved at API003 fresh native-Ubuntu create/reconnect scope; broader qualification remains.
- **D-001:** deferred/not repaired. **IMP-D001:** current-source/private-profile/AGY policy preserved.
- **CR001/CR002/API-F001/CR004:** retain their reported mode/source/release-gate scopes, not a new all-platform Pass.

Prior-finding resolution is indexed in ARCH-REV-005. No downstream report edit, new aggregate score or renumbering of incoming findings.

## Classification

**Pass**, Large/High retained. No new Design Impact, Requirement Gap or Unclear blocker. Docker no-op Stop is an explicit inherited observability limitation; source-derived negative cases are required implemented validation, not fabricated current success.

## Recommended Recipient

Primary exact implementation recipient from fresh handoff rules, with all cumulative upstream/IR/CRR/API evidence and this review. After confirmed primary success, informational Solution Designer notice only — **no action required**, no duplicate forwarding or delegation.

## Residual Risks

- Current Docker grammar and state interpretation must be implemented narrowly with real-public-field fixtures. If mandatory normal-stop/policy controls cannot be enforced, return concrete Design Impact; do not broaden errors or silently narrow supported modes.
- Probe/pre-Start record/one request is not a guaranteed availability deadline or exactly-once action. Ambiguous/interrupted completion can require explicit confirmed reconnect; policy=no still vetoes it. No-op Stop of an already-failed node is not durable cancellation and must not be advertised as such.
- API003 Fail57.14% and CRR008 Fail remain. First revalidation is fresh public selected setup plus two ordinary host reboots with **no manual Start/reconnect**, real API/shared bytes and same identity/private/source/UUID; include normal-stop, disabled-policy and unselected controls. No150s SLA or forced-outage gate added.
- Retain remaining both-OS native/managed-Docker/storage/peer/lifecycle/detach/physical matrix, actual native tools and unread linked assets/peer-close/restore/Standalone-Team-Org, remaining previews/completed artifacts, user verification and authorized release gates. API003 scoped Linux storage/HTTP/desktop passes are not full completion.
- Exact engine pair/source artifacts remain usable; actual CLI metadata must match changed source. Nativeamd64 engine, hosted workflow/signing/published bootstrap remain unqualified; empty qualifiedTargets and unavailable Guide remain honest. No shipped command/merge/push/release/TaskDone authority.
- Trusted-LAN plaintext/coarse host trust, hard-NFS parent stalls and original source-availability limits remain disclosed. Five old dist trees and11 retained IR005 candidate files were left untouched; no new live resources require cleanup.

## Latest Authoritative Result

- Review Decision: **Pass — ARCH-REV-005 / Ready SR021 / Approved SR018**.
- Material-Premise Gate: **Pass** — evidenced normal reboot gap and existing public stop/policy contracts support only the bounded recovery.
- Notes: CR005 design accepted, product closure pending. API003/CRR008 remain authoritative at their own boundary. Reviewer changes only report/revision/evidence artifacts; no product execution, live mutation or release claim.
