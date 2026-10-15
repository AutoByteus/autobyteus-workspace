# Code Review Report — CRR-013

## Latest authoritative result

**Pass — implementation-source review; ready for independent API/E2E.**
No new actionable source finding. **CR007/API-F005 correction accepted at source
scope only**, against ApprovedSR018 / ReadySR023 / ARCH-REV007 / IR009.
This replaces CRR012's source/design blocking verdict at this boundary; it does
**not** close the observed product failure. API005 remains **Fail57.14%, broader
Required** until its owner issues a new result. Score **10.0/10 (100/100)** is
source-review quality/readiness, not tested product completeness or release approval.

## Review round meta and classification

- Entry **Implementation Review**, round13 / CRR-013, 2026-10-15.
- **Full Re-Audit**: although the19-path delta is bounded to CR007, shared persisted
  Identity, SourceIdentity/CheckSource interfaces and setup lifecycle change. Reran
  all mandatory structural checks and all ten scores, re-tracing affected DS001/006
  end-to-end and retained boundaries of DS002–005/006-L. This is not a repeat of
  unchanged whole-repository runtime validation; still-valid byte-checked earlier
  evidence is reused, explicitly at its original scope.
- Source **d3c88f37c30ee74a89a95a4f6906992667c9b875**; input handoff/evidence
  **2dfcffbb2fb7df6dfa8d2a672f6c5f3f7690b304**; implementation base
  **7b2db1b07beedfeac473b9e7ef367b7176338fde**. Designer receipt above ARCH007
  adds no requirements/design or production change.
- Approved requirements-doc.md SR018, approval017/018, investigation-notes.md,
  solution-revision-record.md and solution-design-handoff.md reviewed; design-spec.md
  ReadySR023 / a4be96c45d4e9799c3dc18fc6b690b7edf579477; design-review-report.md
  ARCH-REV007 / ca0ac77b16d5f88074a8d45df16a4c04aea517fa and architecture history.
  implementation-handoff.md and implementation-revision-record.md IR001–009;
  code-review-revision-record.md CRR001–012, prior CRR012 canonical snapshot in E13.
- Supplemental basis: SR023 primary/installed contracts, source identity investigation,
  persisted-state decision, probe/attempts/cleanup; CRR012 source/Mac and prior
  freshness audits; API005 reports/history/coverage ledger/raw failure and resolution
  evidence; IR009 audit/tests/mutations/build/limits/cleanup. Complete incoming1449
  references preserved in E13/package-index.json. No review artifact omitted.
- Related revisions: SR018 approval and SR019–023 solution; ARCH001–007;
  IR001–009; CRR001–013; API001–005. Successful af9f23 test-code review remains
  pending a Passed API package, not performed in this source round. External
  Product specification and delivery revision **N/A — not applicable/not performed**.
- Task shared-network-workspaces / project_task_0793009f-41bc-4684-9cbe-9a29ad26ed63.
  **Large / High / Reviewed** confirmed: cumulative multiplatform integration and
  privileged persisted-identity/lifecycle risk, not evidence-file volume. Independent
  source review required. No classification or requirement change.
- Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/shared-network-workspaces`,
  branch codex/shared-network-workspaces, finalization origin/personal. Ticket
  `tickets/in-progress/shared-network-workspaces`; E13=`code-review-evidence/crr-013`.
- Shared design principles, full source template/scenario gate/Example9, root
  AGENTS/DESIGN/TESTING, migration guideline and NFS README applied. No closer
  NFS/ticket instruction or relevant principle conflict found. No production edits.

## Upstream behavior and production-path basis confirmation

**Confirmed; no new or contradictory approved behavior, no material ambiguity.**
Scope Guardrail UC001–007/Change Scope retained. No new runtime/REST/UI/engine,
restart/mount policy or migration owner. Only Mac Docker STORAGE is deferred;
native Mac and managed clients on both OSes remain required.

| Behavior | Status | Current implementation and lifecycle evidence |
| --- | --- | --- |
| BEH001 create/connect | Confirmed | CLI plan/consent -> setup.Plan captures source/parent -> Apply validates -> nonroot create/bind/persist -> existing export/mount/probe/public descriptor |
| BEH004 healthy restart | Confirmed | launchd -> serial admin lock -> Reconnect -> complete config + actual UUID/inode check -> Apple Ensure/mount -> nonroot proof; no raw-device durable comparison |
| BEH005 retry/preservation/detach | Confirmed | PendingPlan distinguishes complete binding from zero-new; Apply saves first binding before marker/handle/export; status read-only, detach has no live-source dependency |
| BEH003 healthy sharing | Confirmed | Ganesha expiry0/OS clients unchanged; API005 Linux scoped freshness closure retained, not full AC003 |
| BEH002/006 runtime/tools/preview | Confirmed | Public connection shape unchanged; lazy workspace admission/private links and existing content-return owners unchanged; prior evidence retained, remaining full-product gates pending |
| BEH007 Guide/distribution | Confirmed | Pure release descriptor remains unavailable; release gates unchanged, no invented publication |

See **E13/source-trace.md** for forward source references and DS001–006/006-L
inventory (including primary, return and bounded capture/reconciliation spines).
Prior unresolved finding checked first: CR007 implementation matches SR023; actual
public ordinary-boot acceptance remains open. Prior resolution table in CRR013 history.

## Supported product scenario and reachability gate

| Scenario / contract | Actor or initiator; independent trigger | Entry, forward path and lifecycle | Expected consequence / evidence | Validity / use |
| --- | --- | --- | --- | --- |
| SCN009/012/013, MP011 | Storage owner ordinarily restarts a healthy completed Mac service and resumes same project | public create -> persisted binding -> launchd/locked supervisor -> Reconnect/source check -> same mount/nonroot RW | REQ014/017/019; AC007/014/017/018/019; API005 actual raw-device reassignment; SR023 dependency observations | Supported Normal Scenario / Reachable / Use |
| SCN009/012, MP012 | User retries explicitly supported partial setup after a later step fails | consented Apply -> nonroot create -> bound intent -> later incomplete step -> fresh interactive PendingPlan/consent/Apply | Preserve chosen identity; no recapture from stale NewSource; REQ014/017 and reviewed retry contract independent of test fixtures | Supported Explicit Edge Scenario / Reachable / Use |
| SCN012 preservation | Chosen source no longer names the same directory/actual volume | public reconnect/retry -> config/platform source comparison -> refuse before export/mount | AC017/REQ017, same-source protection; real SR023 replacement dependency evidence; durable refusal fixtures confirm predicate, not public qualification | Supported Explicit Edge Scenario / Reachable / Use |
| SCN013 current status/safe detach | Operator requests current state or drains/removes owned attachment | CLI -> Status/Detach -> validated records -> existing observation/exact teardown | No repair from status or new live-source dependency for teardown; source/private state preserved | Supported Normal Scenario / Reachable / Use |
| SR023 capture/shape engineering contract | Each authorized source selection or reconciliation must observe one real local supported source | platform canonical path/fd -> trusted diskutil actual device -> typed mapping -> post-observation -> backend-selected config variant | One complete identity, nonzero canonical UUID+inode Apple or device+inode Linux; fixed trusted dependency, no marker fallback | Supported Explicit Edge Scenario (integrity contract) / Use |
| SR023 retained-state decision | Exact-owned unqualified predecessor fixture is retired before installing current candidate | matching OLD CLI drained detach -> preserved source/marker -> fresh current create | No supported released predecessor established, not universal absence; real retained supported installation requires upstream transition decision before cutover | Supported Operational/Explicit Edge Scenario / Use within stated evidence |

### Candidate finding and mechanism gate

| Candidate | Observation/mechanism | Independent basis; path/lifecycle/consequence | Evidence | Disposition / scope / proportionate response |
| --- | --- | --- | --- | --- |
| CAND013 / CR007 | Old durable Mac raw-device comparison failed normal boots | MP011, same-source restart, rejects before mount | CRR012/API005; current source_darwin.go and CheckSource | Promote retained issue; this ticket. SR023 source correction accepted; product closure awaits public API-F005 |
| CAND015 | UUID+inode capture and strict mapping/correlation | MP011 + SR023 integrity contract; selection/reconcile -> fd actual mount -> trusted query -> bound comparison | E13/source-trace; actual installed diskutil and parser/correlation/FD tests | Promote required bounded mechanism; implemented, no deduction or new finding |
| CAND016 | Save complete new binding before later effects; never recapture complete pending | MP012; partial-setup retry must retain selected directory | Apply/bindSource/PendingPlan; own missing-save mutation fails intended assertion | Promote required mechanism; implemented with existing Store/lock, no additional journal |
| CAND017 | Complete validation versus metadata-only planning | SCN012/013; nonexistent-source plan vs completed hosted/readiness state | config.ValidateBound, validateSourceIntent, CheckConfiguration, backend renderers and fixtures | Promote state-boundary invariant; implemented, no separate platform discriminator |
| CAND018 | Demand automatic conversion of any old device-only Mac record | No supported released predecessor evidenced; schema existence cannot establish a supported install | SR023 persisted-state evidence, release lock/refusal, current code preserves/refuses old state | Reject hypothetical migration/fallback requirement; no deduction. Actual supported retained-install evidence routes upstream before cutover |
| CAND014 retained | Marker-only acceptance, mismatch rebinding or extra retries | Does not establish same directory/volume across MP011/012 | CRR012 rejection; current source has none | Reject as substitute machinery; no new fallback or hostile-admin atomic-race guarantee prescribed |

Unsupported/contrived or Not Reachable scenarios drive no findings, deductions or
machinery. No held material candidate. Synthetic replacement/plist/pending fixtures
exercise already-approved integrity contracts; they do not establish product support.

## Structural / design checks

All mandatory checks rerun. Evidence below refers to current code and E13/source-trace;
unchanged broader code/evidence retained with input hashes, not rerun product suites.

| Check | Result | Evidence | Required action |
| --- | --- | --- | --- |
| Task design health assessment is present, evidence-backed, and preserved by the implementation | Pass | SR023 missing lifetime invariant assessed; bounded extraction preserves existing owners | None at source boundary |
| Implementation matches approved behavior-defining supplemental artifacts | Pass | ApprovedSR018/SR023/ARCH007 and state transition respected; no scope expansion | None at source boundary |
| Data-flow spine inventory clarity and preservation under shared principles | Pass | DS001–006/006-L forward paths span entry, authoritative owner, downstream effect | None at source boundary |
| Ownership boundary preservation and clarity | Pass | config shape; platform capture; setup binding lifecycle; engine bytes; app admission distinct | None at source boundary |
| Off-spine concern clarity (off-spine concerns serve clear owners and stay off the main line) | Pass | plist decoder and OS capture serve platform; atomic Store serves setup | None at source boundary |
| Existing capability/subsystem reuse check (no fresh helper where an existing subsystem should own it) | Pass | Existing Runner, filesystem qualifier, marker, Store/admin lock and supervisor reused | None at source boundary |
| Reusable owned structures check (repeated structures extracted into the right owned file instead of copied across files) | Pass | One Identity, one ValidateBound, shared qualifyAPFS and one source comparison | None at source boundary |
| Shared-structure/data-model tightness check (no kitchen-sink base, no overlapping parallel shapes, specialization/composition used meaningfully) | Pass | Backend discriminates mutually exclusive volumeUuid/device plus inode; no version or second selector | None at source boundary |
| Repeated coordination ownership check (shared policy has a clear owner instead of being repeated across callers) | Pass | validateSourceIntent/CheckSource centralize policy; no per-caller diskutil parser | None at source boundary |
| Empty indirection check (no pass-through-only boundary) | Pass | Each extracted function owns capture/parse/qualification/validation or persistence ordering | None at source boundary |
| Scope-appropriate separation of concerns and file responsibility clarity | Pass | OS split, local parser, setup transitions and config invariant in cohesive files | None at source boundary |
| Ownership-driven dependency check (no forbidden shortcuts or unjustified cycles) | Pass | Setup -> config/platform/backend; platform -> trusted Commands; no reverse app dependency | None at source boundary |
| Authoritative Boundary Rule check (callers do not depend on both an outer owner and that owner's internal manager/repository/helper/lower-level concern) | Pass | CLI uses SetupService; source callers use platform, not parser/fd internals; no mixed-level bypass | None at source boundary |
| File placement check (file/folder path matches owning concern or explicitly justified shared boundary) | Pass | New source/volume files under platform; variant validator under config; binding under setup | None at source boundary |
| Flat-vs-over-split layout judgment (layout is readable for the scope and not artificially fragmented) | Pass | OS suffixes plus bounded decoder separation justified; no abstract-layer proliferation | None at source boundary |
| Interface/API/query/command/service-method boundary clarity (one subject, one responsibility, explicit identity shape) | Pass | SourceIdentity/CheckSource share Runner and explicit subject; ValidateBound separates lifecycle state | None at source boundary |
| Naming quality and naming-to-responsibility alignment check (files, folders, APIs, types, functions, parameters, variables) | Pass | VolumeUUID/Device/Inode/NewSource and bindSource reflect lifetime/responsibility | None at source boundary |
| No unjustified duplication of code / repeated structures in changed scope | Pass | No duplicated mapping/parser or parallel persisted identity; test fixtures remain local | None at source boundary |
| Patch-on-patch complexity control | Pass | Replaces raw-device lifetime assumption instead of adding retries, cache or repair branches | None at source boundary |
| Dead code removed in the touched files and modules (Core Principle 7) | Pass | Old unconditional Apple raw-pair persistence/comparison and stale-flag recapture removed; helpers have callers | None at source boundary |
| Relevant test scenarios and assertions are clear and requirement-aligned | Pass | Variant/plist/correlation/pending/refusal tests trace SCN009/012/013 and metadata boundary | None at source boundary |
| Test fixtures/helpers are reasonably reusable and test structure remains coherent | Pass | Config tables/platform replies/setup binding fixture reused; coherent files, no source thresholds on tests | None at source boundary |
| No stale, duplicated, or compatibility-only tests are retained in changed scope | Pass | IR008 fixtures updated to valid bound shape without weakening exact-config assertions; no stale branch tests | None at source boundary |
| API/E2E readiness for the next workflow stage | Pass | Current hashed candidates/metadata, retained engines, scoped checks and explicit API-F005-first handoff | None at source boundary |

## Source file size and structure audit

Effective nonempty lines; comparison base is finalization merge-base f13bdd0e (all
12 files new in this ticket); prior is implementation input7b2db1b. Delta is added+
removed physical lines in IR009. All <500 and <=220; no threshold action. Six test
files and README excluded from source-size rules. Full SHA/path audit E13/input-audit.

| Production path under internal/ | Base | Prior | Current | IR009 + / - | >500 | >220 delta | SoC/placement/classification/action |
| --- | ---: | ---: | ---: | --- | --- | --- | --- |
| config/source_identity.go | 0 | 0 | 20 | +23/-0 | Pass | Pass | Pass; existing owner; none |
| config/state.go | 0 | 85 | 87 | +4/-2 | Pass | Pass | Pass; existing owner; none |
| platform/filesystem_darwin.go | 0 | 22 | 29 | +14/-5 | Pass | Pass | Pass; existing owner; none |
| platform/source.go | 0 | 59 | 63 | +10/-5 | Pass | Pass | Pass; existing owner; none |
| platform/source_darwin.go | 0 | 0 | 70 | +75/-0 | Pass | Pass | Pass; existing owner; none |
| platform/source_linux.go | 0 | 0 | 12 | +14/-0 | Pass | Pass | Pass; existing owner; none |
| platform/volume_identity.go | 0 | 0 | 25 | +28/-0 | Pass | Pass | Pass; existing owner; none |
| platform/volume_plist.go | 0 | 0 | 183 | +189/-0 | Pass | Pass | Pass; existing owner; none |
| setup/apply.go | 0 | 185 | 210 | +31/-5 | Pass | Pass | Pass; existing owner; none |
| setup/lifecycle.go | 0 | 157 | 160 | +4/-1 | Pass | Pass | Pass; existing owner; none |
| setup/pending.go | 0 | 104 | 141 | +44/-5 | Pass | Pass | Pass; existing owner; none |
| setup/plan.go | 0 | 187 | 182 | +3/-8 | Pass | Pass | Pass; existing owner; none |

## Legacy / backward-compatibility verdict

| Check | Result | Evidence |
| --- | --- | --- |
| No compatibility mechanisms | Pass | Apple old device-only binding refused; no marker/device fallback |
| No legacy old-behavior retention | Pass | Current UUID variant and Linux pair are platform variants, not schema versions |
| Dead code removed in touched modules | Pass | Old capture replaced; QualifyFilesystem remains used by handles; parser/validator/binder have production callers |
| Approved persisted-data decision followed | Pass | Current Apple/Linux direct use; zero-new first binding; old owned fixture rebuild with OLD CLI before install |
| No version-specific dual reads/writes | Pass | Single current Identity selected by backend; no guessed UUID or silent rewrite |
| Transition mechanics match reviewed decision | Pass | No migration authorized/needed for evidenced fixtures; actual supported retained installation returns upstream |

Dead/obsolete items requiring removal: **None remaining found**. Previous raw Mac
identity lifetime and bound-pending recapture removed. No new unused owner/adapter.

## Docs-impact verdict

**Yes**, narrow NFS README now explains persistent identity, partial-setup binding,
old-fixture cutover and honest test boundary. No new user setup step for a released
predecessor is asserted. Delivery docs/release availability and user verification
remain later gates. No root TESTING change required for one ticket's new tests.

## Material-premise decisions

**MP011 Confirmed**: supported normal same-source boot; current source replaces the
inadequate durable component without relaxing directory comparison. **MP012 Confirmed**:
supported partial retry binds once, not stale-flag re-selection. No new/reclassified
material premise. MP001/002 outage handling stays deferred DEC015; MP003/004
independent source lifetime/current links retained. MP005 dependency, MP006 selected
boot and MP009 freshness retain scoped independent closures; MP007/008 Stop distinction
and MP010 exact-owned config remain unchanged. No stronger anti-cloning, general
Linux device-lifetime, atomic hostile-mount or universal deployed-state claim.

## Review scorecard

**10.0/10;100/100**, simple mean of ten categories. No promoted source gap or
mandatory-check failure. This is a source/readiness score only, not API coverage.

| Priority | Category | Score | Why | Concrete weakness/drag | Expected improvement |
| --- | --- | ---: | --- | --- | --- |
| 1 | Data-Flow Spine Inventory and Clarity | 10.0 | Full create/boot/retry/return paths traceable; capture is bounded local detail | None found at source scope | None |
| 2 | Ownership Clarity and Boundary Encapsulation | 10.0 | Config/platform/setup each own one invariant; no authoritative boundary bypass | None found | None |
| 3 | API / Interface / Query / Command Clarity | 10.0 | Runner and backend-selected Identity explicit; metadata vs bound validation separates lifecycle | None found | None |
| 4 | Separation of Concerns and File Placement | 10.0 | OS capture, plist translation, variant invariant and binding sequencing properly placed | None found | None |
| 5 | Shared-Structure / Data-Model Tightness and Reusable Owned Structures | 10.0 | CAND015–017 correct lifetime, exclusive variants, existing Store/qualifier reused | None found | None |
| 6 | Naming Quality and Local Readability | 10.0 | Concrete names, small owned helpers and visible refusal/order | None found | None |
| 7 | API/E2E Readiness | 10.0 | Reproducible candidates, actual metadata/hash proof, local checks and explicit first gate | No source blocker; API005 still failing, not hidden | Independent current public API-F005 execution next |
| 8 | Runtime Correctness And Behavioral Fidelity | 10.0 | MP011/012 predicates and binding ordering sound; refusal/correlation mutations discriminating | No source defect found; whole-host correction unproved by units | Actual ordinary boots/replacement controls, not synthetic substitution |
| 9 | No Backward-Compatibility / No Legacy Retention | 10.0 | Current-only variant, approved fixture disposition, no guessed migration | None within established deployment evidence | Route actual supported retained install if discovered |
| 10 | Cleanup Completeness | 10.0 | Old capture/recapture removed; own scratch removed; inputs/dist/engine preserved | None found; raw log whitespace explicitly retained | None |

## Findings, prior resolutions and follow-ups

**No new actionable finding.** CR007 is source-remediated/accepted, **not product
closed**. CRR013 history records each prior disposition. CR006/API-F004 remains
independently resolved by API005 at Linux native+Docker STORAGE/native+actual
managedHTTP40fixtures80reads<=5s; not full cross-OS AC003. CR005/API-F003 ordinary
boot/Stop/policy/replacement/detach scopes retained. CR001–004 retained. No new
follow-up; FUP001 remains in PM custody, not duplicated or deducted. D001 deferred
not fixed; IMP-D001 current-source/private-link/independent Update-Remove/AGYlocal
policies unchanged.

Classification **N/A — Pass is an outcome**. Recommended next owner is API/E2E
under fresh most-specific source-Pass rule. No duplicate informational forwarding
or delegation. Confirmed handoff only recorded after tool success.

## Validation evidence and residual risks

- E13/input-audit: all1449 incoming refs,1379 protected paths,19 old candidates,
 4 current files and286 old dist files verified. No lost cumulative artifact.
- Personal pinned Go1.27.2/clean environment: race7packages70top-level PASS /212
 four-space subcase PASS lines; standalone helper skip (parent executes child);
 vet; Python18/17Pass1skip. Twelve check commands include3 intended mutation
 failures. All test packages compile Darwinamd64/Linuxarm64+amd64; those targets
 NOT executed. Installed trusted diskutil read-only own-directory test passed.
- Binding tests start after nonroot CreateSource at actual bindSource; later actual
 Apply fails missing trusted child before marker/export. Plan stops at backend
 selection, Detach at mount observation. These are not successful privileged/public
 setup or lifecycle tests. No reviewer VM, mount, volume, Docker, app/API or provider.
- Three additional candidate commands: native version, expected verify-release
 unqualified refusal AFTER metadata equality, same-engine source-hash. Exact
 release JSON embedded in both candidates; no engine rebuild/signing/qualification.
- Defaultsource cc3556ce850bf20281e6b7e0411a6b01359ea863cac6cb22104808e9dc225354;
 sameengine f0d71675d3d9b70d89969a8071b8de03287cff0676669ddab295f14568041c88.
 Actual retained IR009 binaries+metadata at autobyteus-nfs/out/ir009-local-candidate;
 exact identities/sizes in E13/input-audit and IR009/build-result.
- Source whitespace clean;4 raw Go diagnostic whitespace lines preserved with
 artifact-only exception. Read/command-status limits and upstream unsuccessful
 attempts remain explicit in E13/checks-and-limits. Own scratch/copies cleaned.
- **API-F005 FIRST**: current public nativeMac create; >=2 ordinary whole-host
 boots, additional boots if needed to witness ACTUAL raw-device reassignment;
 automatic mounted nonroot RW BEFORE manual reconnect/repair. Then separate
 public reconnect and real directory/APFS-volume replacement refusals with preserved
 bytes/marker/state; no synthetic identity edits/helper substitutes.
- Then remaining both-OS native+managed clients, Linuxnative/Docker storage,
 independent physical hosts, actual native tools/unread linked assets/peer-close/
 restore/Standalone-Team-Org, completed artifacts/healthy previews, amd64engine,
 hosted workflow/signing/public bootstrap/docs/user/finalization/authorized release.
 Physical/profile/inference/privateLAN/peerNAT prerequisites remain. No merge,
 push, tag, release, deployment, TaskDone or user-verification claim.

Supported-scenario gate **Pass**; material-premise gate **Pass**; latest source
result **Pass CRR013**. API005 Fail57.14% / broader Required remains independent.
