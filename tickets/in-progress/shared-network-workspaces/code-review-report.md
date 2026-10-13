# Code Review Report — Shared Network Workspaces

## Review Round Meta

- **Latest result: Fail — Local Fix, CRR-001, CR-001 (P1).** Initial implementation-source review; not API/E2E failure-origin review or proportional test review.
- Reviewed 2026-10-13 by `/software_engineering_team/code_reviewer`, personally; no delegation.
- Task `project_task_0793009f-41bc-4684-9cbe-9a29ad26ed63`; worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/shared-network-workspaces`, branch `codex/shared-network-workspaces`, finalization base `origin/personal`.
- Reviewed source HEAD `f0456d1f92`; implementation `c57ab71c90930a0c98e1310d07b0808d28dfbd14`, separate narrow launcher quoting `6717bcb221` and core fixture-only correction `f34fc81aa2`. Compared with architecture basis `65b0e6e57a0f93d8343ccbefc1b5227642d7e557`.
- Requirements/investigation/solution/design: [requirements-doc.md](requirements-doc.md), [investigation-notes.md](investigation-notes.md), [solution-revision-record.md](solution-revision-record.md), [design-spec.md](design-spec.md), [complete solution-design-handoff.md](solution-design-handoff.md). **Approved SR018 / Ready SR019**; SR017 hosting/trust/physical sequencing retained.
- Approval supplements: [approval018](approval-record-sr018.md), [approval017](approval-record-sr017.md), [exact user scope feedback](architecture-review-scope-feedback.md).
- Architecture: [design-review-report.md](design-review-report.md), [architecture-review-revision-record.md](architecture-review-revision-record.md), **ARCH-REV-003 Pass**; prior D-001 explicitly deferred, not fixed.
- Implementation: [implementation-handoff.md](implementation-handoff.md), [implementation-revision-record.md](implementation-revision-record.md), **IR-002**, preserving IR-001/IMP-D001 and [source-lease correction evidence](implementation-evidence/ir-001/source-lease-design-impact.md).
- Supplemental evidence reviewed as context: investigation's cumulative inventory; [experiment index](evidence/feasibility/experiment-index.json), [feasibility report](evidence/feasibility/feasibility-report.md), [Mac feasibility](evidence/feasibility/macos-vm-feasibility-report.md), [native folder report](evidence/feasibility/native-folder-hosting-report.md), [backend correctness](evidence/feasibility/backend-correctness-report.md), [private runtime skills](evidence/feasibility/private-runtime-skill-report.md), [native readiness](evidence/feasibility/native-private-readiness-report.md), [native agent roundtrip](evidence/feasibility/real-agent-roundtrip-report.md), [SR017 selection](evidence/feasibility/sr017-selection-report.md), SR018/019 artifact audits, and Nodes guide reference. Prior experiments are selection evidence, not current product signoff; raw57 rounds were not all replayed/re-audited.
- Current review round **1**, scope **Full Review**. Trigger: IR002 Implementation Complete Large/High source-review handoff. Prior review/result **N/A**; no missing record inferred to mean Pass. Current history: [code-review-revision-record.md](code-review-revision-record.md), **CRR-001**.
- Coverage investigation, execution coverage, API-REV and DR: **N/A — not yet performed / not applicable to this entry point**. No API/E2E failure attribution is being made.
- Evidence from this review: [checks and limits](code-review-evidence/crr-001/checks-and-limits.md), [source hashes](code-review-evidence/crr-001/source-audit.json), [permission trace](code-review-evidence/crr-001/installer-permission-trace.md), [diagnostic result](code-review-evidence/crr-001/installer-umask-result.json), [focused checks](code-review-evidence/crr-001/focused-checks-result.json). Exact commands and limits are retained there.

## Routing Classification Review

**Large / High; Implementation Review required.** New privileged service/install/backend and Docker preservation boundaries, multi-runtime private lifecycle, launcher and UI span justify the upstream classification. No classification correction or design change is required for the bounded mode defect below.

## Review Scope

Reviewed139 changed non-ticket paths (99 implementation source files counted) and their relevant callers/contracts: Go CLI/setup/service/platform/backend/Docker/config; release/bootstrap; selected launcher attachment; server shared binding/admission, standalone/Team/Org convergence and native backends; private profiles/discovery/close; child-only Git environment/core terminal integration; healthy existing REST readers; Nodes guide/copy/localization. Independent hashes match IR002. Approval/design authorities match65b0e6; solution history alone has a reviewed informational ARCH-REV003 receipt appended.

Excluded: implementing fixes; creating worker/tasks; live install/export/mount/Docker mutation; provider inference; release/push/merge; full API/E2E execution; physical qualification; user verification; unrelated application refactoring. Pre-existing generated SDK/BriefStudio `dist/` directories were neither deleted nor staged. Unchanged outage paths and source publication policies are not additional required machinery.

## Upstream Behavior And Production-Path Basis Confirmation

Intended behavior is understood without reapproval: one app-independent persistent service, ordinary shared whole projects, native/managed Docker clients on both OSes, exact private/source preservation, normal tools and healthy previews, private linked skills, and truthful guide/release availability. Native Apple APFS/v3 and selected Ubuntu ext4/Ganesha4.3/v4.1 remain the selected references; only Mac-Docker **storage hosting** is deferred. Linked source availability is not a snapshot/lease guarantee.

Behavior-basis status: **Contradicted at BEH001 only by CR-001**. Other rows are source-path confirmation, not claims that their downstream runtime/physical acceptance checks passed. No newly invented behavior or unresolved intended-behavior ambiguity.

| Behavior ID | Status | Current path / lifecycle evidence | Contradiction |
| --- | --- | --- | --- |
| BEH001 | **Contradicted** | DS001 installer -> CLI elevation -> plan/consent/apply -> backend/mount/nonroot verification -> managed lifecycle/path reporting; typed persisted identity supports repeat/reconnect | Fresh installer077 causes newly created root executable/public directories0700; mandatory nonroot child cannot execute. CR-001 |
| BEH002 | Confirmed | DS003 common run admission/restore -> shared binding -> Claude/Codex/Grok execution-private profiles/discovery -> existing process owners; AGY capsule remains private; native AutoByteus child environment narrowly extended | None promoted; native tools/peer/restore remain validation gates |
| BEH003 | Confirmed | DS002 native OS/client paths use same endpoint/export/storage marker; no file-copy transport; protocol-specific lock/cache options and coordinated Git policy documented | No distributed Apple-v3 advisory-lock claim; physical compatibility not inferred |
| BEH004 | Confirmed | Setup/mount observations and new-run binding reject known missing/wrong configured shared root rather than runtime temp fallback; ordinary local behavior preserved | Outage stalls remain possible/explicitly deferred, not falsely repaired |
| BEH005 | Confirmed | Explicit resource plan/consent, selected Docker fingerprint and pre-/post-start receipts, nonroot mapping, owned detach/rollback without source/private-volume deletion | CR001 blocks successful setup but no destructive preservation-policy change identified |
| BEH006 | Confirmed | DS004 existing explorer/static/media/run-file-change readers and streams unchanged; healthy byte/MIME/static regressions extended | Full healthy mounted UI proof remains; no workers/stream lease guarantee introduced |
| BEH007 | Confirmed | DS005 NodeManager/Tabs -> NfsGuideCard -> pure descriptor -> displayed/copy text and unavailable/error feedback; en/zh-CN | Null descriptor/default unqualified release deliberately cannot promise a working download |

## Supported Product Scenario And Reachability Gate

The independent basis below comes from approved requirements/current engineering contracts, not the added tests. Only supported rows drive findings. No contradictory concurrent user actions or arbitrary internal state edits are assumed.

| Scenario / contract | Kind; actor / initiator | Coherent goal; supported entry / event | Shape / validity | Forward path / lifecycle; expected outcome | Independent evidence; use |
| --- | --- | --- | --- | --- | --- |
| SCN-001/011/013; BEH001; REQ006/013/018/019, AC012/018/019 | User/Operational; computer user/storage owner | First service install/start on supported fresh computer; grant normal admin approval, choose create/connect | **Supported Normal Scenario** | Versioned bootstrap -> elevation -> root install -> setup -> nonroot verify -> usable path/managed service. New product dirs must support intended child traversal | Approved requirements scenarios and design's installer/lifecycle contract; **Use — CR001** |
| SCN-002/003; BEH002/003 | User/System/Contract; agents on participating nodes | Select shared workspace, perform instructed native writes/fresh reads and coordinated project/Git operations | **Supported Normal Scenario** | Existing run admission/restore -> binding -> private runtime -> OS filesystem; two private profiles can coexist; closing one's process removes only its wrappers | Approved runtime/ordinary filesystem contracts, FR011 peer-cleanup evidence; **Use** |
| SCN-005/008/009/012; BEH001/004/005 | User/Operational; source owner and selected managed-node operator | Attach existing source/nodes with consent, retry or detach without losing content/private state | **Supported Normal Scenario / Supported Explicit Edge Scenario** (occupied target/denied approval) | Plan identifies resource/daemon -> consent -> apply/verification; exact selected node/config receipts; safe abort/rollback/reconnect; never data rollback | REQ009/010/014/017 and explicit AC preservation cases; **Use** |
| SCN-006; BEH006 | User; workspace viewer | Healthy remote edit followed by deliberate explorer/preview reopen | **Supported Normal Scenario** | Existing UI -> authorized workspace/static/artifact REST -> mounted bytes/streams -> MIME/render; no automatic remote notification promise | REQ011/AC010, existing readers; **Use** |
| SCN-014; BEH007 | User; desktop/browser Nodes user | Find one complete command/download via NFS Guide | **Supported Normal Scenario** | Nodes tab -> pure supported-release descriptor -> display/copy -> user terminal; unavailable/clipboard denial truthful | REQ020/AC020, user reference guide; **Use** |
| MP-003 / MP-004; BEH002/005 | User/Contract; Skills Sources operator | Confirm Update to changed revision / confirm Remove of installed managed source (distinct operations) | **Supported Normal Scenario** | Sources UI/store/GraphQL -> existing source owner -> independent generation retirement/removal; links confer no byte retention | ARCH-REV003 witnesses and unchanged SkillSourceService/GitHubSkillRepository; **Use**, no new concurrency/snapshot policy |
| SCN-004 / MP-001/002 | Operational; network/storage loss during work | Recover storage after established hard-mount operation stalls | Explicitly **deferred v1 edge** under DEC015 | Existing parent IO can stall; do not claim unrelated-local responsiveness | Approved018 exact scope feedback; **disclosure only**, not finding/deduction/machinery |
| SCN-007 | Hypothetical automatic agent notification | Auto-ingest remote writes without an approved feature | **Technically Possible but Unsupported/Contrived** for this package | No approved event/owner; parked collaboration work | Scope Guardrail; **Reject** |
| DESIGN.md + shared design principles | Contract; implementation maintainers | Clear ownership, authoritative boundaries, small coherent files, no dead/compat-only machinery | **Supported Normal Scenario** (engineering contract) | Production owners remain coherent across approved DS001–005; source thresholds only on implementation | Repository/team governing rules; **Use** for structural checks, no unsupported structural finding |
| Existing updater error-category contract; FUP001 | Contract; project maintainers/updater caller | Correctly classify an updater error regardless of its stack's checkout path; normal unit validation | **Supported Normal Scenario** (established classifier contract) | Existing classifier includes stack in network regex; unchanged category tests fail in this checkout | Existing source/spec and retained actual runs, not NFS behavior; **Use as out-of-scope follow-up only** |

### Candidate Finding And Mechanism Gate

| Candidate | Observation | Independent trigger / path / lifecycle / consequence | Evidence | Disposition / scope |
| --- | --- | --- | --- | --- |
| CAND-001 | Installer's restrictive umask survives into root directory creation | SCN001/011/013 normal fresh approved install; bootstrap077 -> sudo -> RootDirectory0755 -> actual0700 -> nonroot exec EACCES; public descriptor parents similarly inaccessible | [Complete trace](code-review-evidence/crr-001/installer-permission-trace.md), current source lines, observed child077/0700, Go mkdir/sudo contracts | **Promote -> CR-001**, bounded implementation/packaging defect inherent in ticket |
| CAND-002 | Current broad web/Electron validation has three updater category failures | Established updater classification/test contract; ordinary checkout validation -> stack path includes `shared-network-workspaces/...appUpdateErrorClassifier` -> network regex false match | Unchanged baseline hashes independently checked; current-source failure logs and candidate restoration receipts in IR002 | **Promote -> FUP001 only**; no NFS score/failure attribution |
| CAND-003 | Possible need to pin skill-source generations for private profiles | Independent confirmed Update/Remove explicitly preserve source-owner deletion; profile merely owns wrapper/link | ARCH-REV003 MP003/004, SR019 and passing source-lifecycle unit checks | **Reject retained-byte requirement**: no supported snapshot promise; do not add refcounts/copies/retirement queues |
| CAND-004 | Possible need for per-action outage isolation/stream workers | SCN004/MP001/002 is reachable but approved DEC015 defers bounded outage guarantees | Approval018, scope feedback, unchanged REST/tool paths | **Reject as v1 finding/deduction**, not as unreachable; retain disclosure |
| CAND-005 | Native Mac Ganesha-client `vers=4.1` compatibility concern | Approved native Mac client path, not a constructed scenario; consequence investigated | Installed `mount_nfs` manual supports minor1; upstream raw FR026/028/033 native mount evidence | **Reject defect hypothesis**, contradicted by available evidence; no option rewrite required |

No held/unclear candidate drives a prescription. Scenario and material-premise gates **Pass** (finding is valid); implementation itself **Fails**.

## Structural Design Checks

| Check | Result | Source / contract evidence | Action |
| --- | --- | --- | --- |
| Task design health posture and bounded refactor | Pass | SR019 private profile and known-shared fallback correction address supported FR011/new-run defects; no outage subsystem added | None |
| Supplemental artifact alignment | Pass | Approved018, Ready019, ARCH003 and IR001 source-owner correction respected; historical limitations retained | Preserve chain |
| Data-flow spine inventory clarity/preservation | Pass | DS001 CLI/setup/service; DS002 OS NFS; DS003 runtime; DS004 unchanged REST; DS005 Vue descriptor | CR001 is a mode bug within DS001, not missing ownership |
| Ownership boundaries | Pass | Backend owns export, platform OS calls, config identity, Docker selected state, existing runtime process owner exact cleanup | None |
| Off-spine concern clarity | Pass | Elevation/downloads/consent/receipts/locale stay at appropriate boundaries; no storage UI controller | None |
| Existing subsystem reuse | Pass | Existing source catalog/source deletion, workspace/run provisioners, runtime/PTY owners and REST readers retained | None |
| Reusable owned structures | Pass | Shared RuntimeSkillProfile + preparation policy; mount binding parser; Docker snapshot/attachment types; launcher container-config extraction | None |
| Data-model tightness | Pass | HostedFilesystem, Attachment and NodeAttachment distinct identities; public descriptor excludes private recovery snapshot; runtime hooks expose own needs | None |
| Repeated coordination ownership | Pass | Profile owns prepare/release; native owners own actual close; setup owns selected resource transaction/receipt | None |
| Empty indirection | Pass | New helpers enforce mount identity, profile lifetime or adapter transformation, not renamed pass-through layers | None |
| SoC / file responsibilities | Pass | CLI/setup/service/backend/platform/Docker separation; launcher extraction avoids growing general runtime module | None |
| Ownership-driven dependencies | Pass | Core receives optional child environment, not server NFS service; web pure descriptor independent of backend control | None |
| Authoritative Boundary Rule | Pass | Callers use shared admission/profile and existing subsystem APIs; no reviewed caller bypasses an outer owner to couple to private source repository state | None |
| File placement | Pass | Runtime-specific discovery under respective backend/runtime; common policy in shared; independent service outside app server | None |
| Flat versus over-split layout | Pass | Small Go modules represent concrete adapter/state/receipt responsibilities; no speculative general recovery framework | None |
| Interface clarity | Pass | Explicit storage/daemon/node IDs; CLI public actions separate internal probes; profile links not misnamed source leases | None |
| Naming alignment | Pass | source/mount/attachment/profile distinction visible in APIs/docs; source availability not ownership fiction | None |
| Duplication | Pass | Native SDK-specific adaptation remains separate; shared profile/source selection and launcher config policy centralized | None |
| Patch-on-patch complexity | Pass | SR019 implemented directly with links; no copied generations or extra retirement/retry machinery layered on withdrawn premise | None |
| Dead code in touched scope | Pass | New modules wired to public/lifecycle callers; local-only path retained for supported local mode, not obsolete compatibility | None found requiring removal |
| Test scenarios/assertions | **Fail (gap tied to CR001)** | Archive/descriptor/profile tests map to approved behavior; installer fake binary never exercises root-parent modes/nonroot traversal | Add bounded restrictive-mask install-boundary regression |
| Test fixtures/helpers | Pass | Fake downloader/archive variants, selected Docker transport snapshots, shared source fixture and profile doubles are coherent and isolated | Do not mislabel unit doubles as actual installation |
| Stale/compatibility-only tests | Pass | AGY/local preservation tests remain relevant; core traversal change fixture-only; existing skips explicit | None |
| API/E2E readiness | **Fail** | Setup's ordinary first-use executable boundary is known broken despite green unit plumbing | Fix CR001 and return to source review before API/E2E |

## Source File Size And Structure Audit

The complete required per-file before/after, >500, >220 delta, ownership/placement and action table is incorporated as [source-size-audit.md](code-review-evidence/crr-001/source-size-audit.md), backed by independent [source-audit.json](code-review-evidence/crr-001/source-audit.json).

**99 changed implementation-source files: no >500 violation; no >220 nonempty delta.** Largest473. All14 files with total size>220 were also responsibility-reviewed. Launcher runtime497→450; native AutoByteus factory470→473 (shared environment hook), Claude client460→466 (owned options/discovery), Codex bootstrap394→401 (private preparation within existing thread lifecycle). No test-file size deduction or gratuitous split. No unchanged oversize-file follow-up was manufactured outside reviewed scope.

## Legacy / Backward-Compatibility Verdict

| Check | Result | Notes |
| --- | --- | --- |
| No new backward-compatibility mechanism | Pass | Explicit ordinary-local and configured-shared modes are current approved behavior, not historical shape emulation |
| No legacy old-behavior retention | Pass | Shared profiles replace project publishers only where needed; AGY capsule and local policies intentionally current |
| Dead code removed in touched scope | Pass | No enumerated dead/unused path found; no fictional lease code retained |
| Persisted-data transition follows design | Pass | New service-owned config/ref files and ephemeral profiles; no existing app schema transformation required |
| No version-specific dual runtime reads/writes | Pass | No app migration/old-shape fallback added; release metadata qualification is not schema compatibility |
| Transition mechanics match approval | Pass | No unnecessary migration runner; old source/path semantics unchanged; historical data not made startup prerequisite |

Dead/obsolete/legacy items requiring removal: **None identified**. The unqualified release guard is deliberate active behavior, not dead code.

## Docs-Impact Verdict

**Yes.** NFS README, server shared-network-workspace/skills docs, launcher README, root release documentation and Nodes en/zh guide explain install modes, trusted plaintext LAN, exact source/private ownership, local advisory-lock limitation, native/client matrix, source Update/Remove and deferred outage stalls. These are present; final docs synchronization and actual qualified-release linkage remain Delivery work. Correct the mode defect rather than weakening the separately traversable binary/public descriptor contract to fit it.

## Additional Material Premise Validation

| Upstream premise | Current status | Reason / review consequence |
| --- | --- | --- |
| MP-001 | Confirmed | Parent workspace-preview IO still can stall on outage; DEC015 deferral retained, not fixed |
| MP-002 | Confirmed | Completed-artifact reads use same parent/path IO; healthy semantics preserved, no outage worker required |
| MP-003 | Confirmed | Managed-source changed-revision Update independently deletes retired bytes; current profile lookup does not pin sources |
| MP-004 | Confirmed | Confirmed Remove independently deletes bytes; AGY missing-source restore stays warn/skip and wrapper-only cleanup |

No upstream premise reclassified. New CR001 initiating condition is fully recorded in CAND001 and the linked permission trace; no duplicate mechanism is inferred. IMP-D001 is corrected in source ownership, not claimed proved for every native tool/restore scenario.

## Personally Executed Checks And Evidence Boundaries

- Installer/packaging fixtures: **6 pass**. Focused binding/profile/discovery/source-lifecycle server units: **4 files/26 pass**. Exact commands, clean environment and cleanup receipts in [review checks](code-review-evidence/crr-001/checks-and-limits.md).
- Unprivileged current-installer diagnostic: verifier/final invocation inherit077; mkdir0755 yields0700. **Not** an actual root install/nonroot execution test. Root-path consequence is independently source/contract-grounded.
- Implementation-reported full server/core, builds, Go race/vet, four-target compile and guide checks retained as upstream evidence, not personally rerun or expanded into API/E2E proof.
- **Full repository not green:** current Nuxt3 and Electron3 category assertions fail in the same pre-existing updater area. Diagnostic candidate patch was removed; candidate-only green logs must not replace current-source failures. FUP001 below.
- No provider/native tool/support-asset/physical topology proof added by this review. Low privileged Go coverage remains a stated evidence limit, not an invented blanket coverage threshold.

## Review Scorecard

**Overall9.3/10 (93/100)**, simple average for visibility only. **Fail**: readiness7 and correctness6 are below9 and CR001 blocks the ordinary install path. Scores10 elsewhere mean no promoted in-scope deficiency was found in this review, not universal or runtime-qualified perfection. No deduction comes from a rejected candidate, deferred outage behavior, unrun physical gate or unrelated baseline failure.

| Priority | Category | Score | Why | Weakness / drag | Expected improvement |
| --- | --- | ---: | --- | --- | --- |
| 1 | Data-Flow Spine Inventory and Clarity | 10.0 | DS001–005 have explicit owners/inputs/outputs consistent with approved scope | None promoted | Preserve mapped paths |
| 2 | Ownership Clarity and Boundary Encapsulation | 10.0 | Profiles own links, source service owns bytes, native owner closes process, privileged service owns setup | None promoted; no Authoritative Boundary breach found | Preserve source/profile distinction |
| 3 | API / Interface / Query / Command Clarity | 10.0 | Explicit connection/storage/node identity and separate public/private contracts | None promoted | No new interface required |
| 4 | Separation of Concerns and File Placement | 10.0 | Independent service package, adapter boundaries and launcher extraction fit concrete duties | None promoted | Bounded mode fix at existing owner |
| 5 | Shared-Structure / Data-Model Tightness and Reusable Owned Structures | 10.0 | Shared profile/binding helpers; backend-specific protocols composed rather than kitchen-sink owner | None promoted | No new retention/recovery model |
| 6 | Naming Quality and Local Readability | 10.0 | Names distinguish profile/source/mount/attachment and exact native cleanup | None promoted | Keep nonsecret descriptor semantics explicit |
| 7 | API/E2E Readiness | **7.0** | Unit/fixture evidence is useful and accurately limited, but first installation has known CR001 blocker | CAND001: current fixture misses inherited-mask privilege boundary | Add restrictive-mask regression, fix and re-review before downstream execution |
| 8 | Runtime Correctness And Behavioral Fidelity | **6.0** | Normal approved install cannot complete with newly created root0700 binary parents | CAND001/CR001 contradicts BEH001/AC012/018/019; secondary public-parent access also affected | Honor intended traversable/public modes while preserving private safety |
| 9 | No Backward-Compatibility / No Legacy Retention | 10.0 | No new migration/dual shape/source retention; current local/AGY behavior stays supported | None promoted | Preserve approved no-transition decision |
| 10 | Cleanup Completeness | 10.0 | Exact profile/owned-resource cleanup and retained evidence; no source fix or external resources from reviewer | None promoted; generated pre-existing outputs intentionally untouched | Keep scope and resource ownership intact |

## Findings

### CR-001 — P1: restrictive bootstrap mask makes the fixed binary's new root parents inaccessible to nonroot verification

- **Status:** Open. **Classification:** Local Fix (implementation/packaging). **Candidate:** CAND001. **Supported scenario:** fresh first-use SCN001/011/013, BEH001, REQ006/013/018/019, AC012/018/019.
- **Primary location:** `autobyteus-nfs/internal/platform/commands.go:71–82` (particularly76), reached from `internal/cli/install.go:43–50`; trigger `scripts/public/nfs/install.sh:4,45`.
- The installer sets077; normal sudo policy preserves that restrictive mask. RootDirectory passes0755 to mkdir without setting the resulting owned directory's mode. On a fresh installation the root-owned binary ancestors become0700 and still pass TrustedPath. chmod0755 on the binary itself does not make its parents traversable. `internal/service/probe.go:119–138,143–158` then drops to the selected nonroot identity before executing the fixed binary, which cannot be reached. Setup fails rather than printing a verified usable folder.
- Same cause affects intended public parents created at `internal/cli/run.go:74` and `internal/setup/apply.go:158–163`; readable descriptor files alone do not make a0700 parent accessible to the desktop/launcher.
- **Evidence/limit:** [source/OS-contract trace and primary references](code-review-evidence/crr-001/installer-permission-trace.md), [personally executed unprivileged mask diagnostic](code-review-evidence/crr-001/installer-umask-result.json). Actual privileged install was not run or authorized. This is a supported default-policy/fresh-directory consequence, not a claim about every custom sudo configuration or a published release.
- **Required bounded correction:** enforce the intended modes for newly owned executable/public directories despite inherited restrictive masks, retaining private0700 configuration and refusal of unsafe pre-existing paths. Cover the bootstrap-to-install/nonroot traversal and public-descriptor boundary with a regression; include necessary parents. Do not relax source-data permissions, broadly chmod/adopt external paths, add machinery, or change intended behavior.
- **Revalidation:** implementation self-check and independent source re-review required; then API/E2E and already-required authorized clean-install/native/physical validation. No upstream requirement/design revision needed.

## Follow-ups

These do not fail this review, lower its score, or enlarge this ticket.

| ID | Problem / location | Evidence | Why outside this ticket | Suggested Task |
| --- | --- | --- | --- | --- |
| FUP001 | Existing updater classifier searches Error.stack; a path containing `shared-network-workspaces/...appUpdateErrorClassifier` falsely satisfies network regex, misclassifying three normal category cases | `autobyteus-web/electron/updater/appUpdateErrorClassifier.ts:34–37,55–62,105–113`; unchanged source/spec hashes independently checked in review audit; [updater follow-up](implementation-evidence/ir-002/updater-follow-up.md), baseline finding/candidate disposition and current-source Electron result | Neither classifier nor spec changed by this feature; NFS source can be corrected/validated without redesigning updater classification. TESTING rule9 product-change follow-up applies | Make updater classification independent of incidental stack paths; preserve diagnostic stack separately and cover category behavior across checkout paths; rerun Nuxt/Electron current source |

- **Sent:** `/project_task_manager`, receipt `accepted:true / DELIVERED`, target AgentRun `project_task_manager_a5f6d9d306e54970bafdad895bdf731d`, 2026-10-13, message type `review_follow_up`. This is the requirements' Requested-by owner. No task/worker was created by this review.

- **PM tracking receipt (2026-10-13, informational only):** `/project_task_manager` found no duplicate Task and retained FUP001 at `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/task-plans/context/fup001-updater-stack-path-classification-candidate.md`, awaiting user approval to create a separate Task. Seven public artifacts are in originating Project context for durable custody. No Task, worker, dispatch, scope expansion, review waiver or duplicate technical handoff. CRR001 Fail/CR001 and its existing implementation route remain unchanged.

## Classification And Recommended Recipient

**Fail — Local Fix -> implementation-owned bounded packaging/platform correction.** Fresh `get_handoff_rules` selected exactly: “When source review identifies an implementation-owned Local Fix or packaging defect that must be corrected before executable coverage.” Recipient `/software_engineering_team/implementation_engineer`. Other pass/test/failure-origin/upstream routes do not apply. No structural Design Impact, Requirement Gap or Unclear finding. Do not advance to API/E2E until CR001 is fixed and reviewed. Later rounds use the actual change breadth to select Targeted Delta Review versus Full Re-Audit.

## Residual Risks / Downstream Gates

- Real first-use service install/start/restart, mode-specific nonroot NFS operations, exact selected Docker preservation, client paths and healthy mounted previews remain unproved by these unit checks.
- Current-product standalone/Team/Org native runtime tools, previously unread support assets, peer close and restore require actual native tests; signed-out metadata discovery is insufficient. Update/Remove availability remains the existing no-snapshot policy.
- Independent physical Mac/Linux and managed Docker clients on both platforms, explicit user verification, docs sync, integration/finalization and only authorized release remain mandatory downstream; none was a prerequisite imposed on implementation.
- DEC015 outage stalls of affected and unrelated work remain disclosed, **not fixed and not a v1 hardening gate**. No stream workers, action probes, retention leases, cwd trampoline or local-copy fallback is prescribed.
- Default release unqualified/guide unavailable is truthful; actual published link/installer matrix must be verified before advertising. No release/OS/user-data permission is inferred from a review.
- Baseline updater failures and candidate-vs-current distinction remain visible through FUP001.

## Latest Authoritative Result

- Review Decision: **Fail**.
- Entry Point / Scope: **Implementation Review / Full Review**, round1, **CRR-001**.
- Supported Product Scenario Gate: **Pass**; Material-Premise Gate: **Pass**.
- Score: **9.3/10,93/100**, does not override CR001 or sub9 categories.
- Failure origin: implementation-owned bootstrap/platform permission handling, not API/E2E attribution or design/requirement deficiency.
- Finding: **CR-001 open P1; Local Fix**. Next owner: implementation via fresh rules; source re-review then API/E2E required.
- No source/durable test change, API/E2E pass, release, merge, user verification, Task DONE or Terminal completion claimed.
