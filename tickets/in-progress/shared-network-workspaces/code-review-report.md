# Code Review Report

## Latest Authoritative Result / Review Round Meta

**CRR-006 — Fail / Local Fix (implementation-owned). CR-004 P2: the new
existing-candidate publication path is skipped by downstream job conditions.**
SR020's CR003 dependency correction is accepted at the source boundary; this is
not API-F002 closure. **API-REV002 remains Fail /57.14% / broader Required.**

- Date2026-10-14; task `shared-network-workspaces` /
  `project_task_0793009f-41bc-4684-9cbe-9a29ad26ed63`; **Large/High Reviewed** retained.
  Broad app-independent privileged deployment plus runtime/UI integration supports
  this classification; payload volume alone is not its basis.
- Entry **Implementation Review**, round6, **Full Re-Audit**. Trigger IR005 after
  ReadySR020/ARCH004. Typed release metadata and the build/embed/install/publication
  spine changed across26 paths beyond the prior failure's local reader boundary.
  All mandatory structural checks and ten categories reconsidered.
- Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/shared-network-workspaces`,
  branch `codex/shared-network-workspaces`, finalization `origin/personal`.
  Reviewed HEAD`3655801628e18032fe345db7a7058b618e921554`, source
  `9992ffb30d4fbaab4852b87b2495738f1b5be908`, comparison input
  `d1aceecc4888fe8b1d58be898337473cd4be8243`.
- Requirements authority: [Approved SR018](requirements-doc.md),
  [approval018](approval-record-sr018.md), [approval017](approval-record-sr017.md),
  [scope feedback](architecture-review-scope-feedback.md). Design context:
  [Ready SR020](design-spec.md), [investigation](investigation-notes.md),
  [solution history](solution-revision-record.md), [cumulative handoff](solution-design-handoff.md),
  [ARCH004 Pass report](design-review-report.md), [architecture history](architecture-review-revision-record.md).
- Implementation: [IR005 handoff](implementation-handoff.md), [IR001–005 history](implementation-revision-record.md),
  [397-reference cumulative index](implementation-evidence/ir-005/package-index.json).
  Operative SR020 compatibility/prototype, CRR005 diagnosis and prior IR001–004/
  feasibility/source-policy supplements reviewed at their recorded scopes.
- Prior result [CRR005 Fail/Design Impact](code-review-revision-record.md); prior
  CRR001–004 findings and scoped resolutions preserved. [API002 report](api-e2e-execution-coverage-report.md),
  [investigation](api-e2e-coverage-investigation.md), [ledger](api-e2e-test-case-ledger.md),
  [API history](api-e2e-revision-record.md) retained. DR **N/A — not yet performed**;
  successful API test-code review **N/A — not triggered**.
- Review authority: shared design principles/Example9, root DESIGN.md/TESTING.md;
  no closer NFS/package instructions. No product reapproval or changed requirement.
  Full execution is API's next responsibility, not silently claimed here.

## Scope And Upstream Behavior Basis

All26 IR005 source/test/build/doc deltas inspected. Macro DS001–005 ownership
rechecked against current caller paths and1030 independently unchanged prior
source/authority/history paths. Detailed new review covers source backport recipe,
real corresponding source, typed manifest/equality, platform-specific embeds,
private staging/install/version verification/mask cleanup, Docker pair reuse and
candidate publication. Unrelated app source and historical experiments are not
re-executed; no new general test-code review, physical qualification or release.

| Behavior | Basis status / forward implementation evidence |
| --- | --- |
| BEH001 — guided create/connect | SR020 package/install path confirmed: bootstrap/VerifyRelease -> root binary -> CLI plan/consent/admin lock -> Apply -> InstallUbuntuPackages -> validated embedded pair/own staging/local APT -> existing source/engine/self-mount/nonroot verification/job. Public corrected Linux completion still awaits API. **Distribution completion contradicted by CR004**, not by the intentional empty qualification lock. |
| BEH002/003 — runtime and ordinary filesystem | Confirmed preserved source boundaries: no engine data plane through app; unchanged native ordinary filesystem, lazy shared binding and exact private runtime profiles. No source pin/copy/refcount added. Runtime execution not newly proved. |
| BEH004 — no false readiness/healthy reconnect | Confirmed source: bundle errors remain incomplete; confined marker/nonroot checks unchanged; normal Service.Reconnect has no package installation/upgrade. Pending setup resumes explicit Apply with consent. No outage deadline/fallback promised. |
| BEH005 — selected-resource/private-state preservation | Confirmed source: exact bundle validated before package commands; private0700/0600 staging, existing lock/mask ownership and uncertain cleanup receipts; no recursive source chmod/delete or detach package purge. |
| BEH006/007 — healthy previews/Guide | Confirmed unchanged implementation and authority: ordinary REST readers, intentional unqualified Guide unavailable, copy never executes. Old UI evidence is carried, not rerun/current full product qualification. |

Overall behavior-basis status: **Contradicted only for the supported distribution
path in CR004**. No new intended behavior or material requirement ambiguity.

## Prior Finding Resolution — Checked First

| Finding | Current status and verification |
| --- | --- |
| CR-003 / API-F002 | **Design/source remedy accepted; independent API resolution pending.** ReadySR020/ARCH004 selects accepted98eb77c two-field backport. IR005 replaces stock engine with distinct4.3-8ubuntu1+autobyteus1, actual arm64 bytes/provenance/corresponding source, embedded local installation and identical Docker pair. Confined reader/kernel/protocol/UID policies untouched. Designer prototype and IR005 narrow package proof do NOT close public-create/reconnect failure. |
| CR-002 / API-F001 | Remains independently resolved at tested native-Mac cold-create scope; Apple startup source byte-identical and API002 two fresh public passes retained. No peer/reboot/physical qualification implied. |
| CR-001 | Remains resolved: only newly created trusted directories chmodded, existing modes untouched; source byte-identical and prior actual077/nonroot installation proof retained. |
| FUP001 | Unchanged PM-owned out-of-scope updater follow-up; no duplicate notification, Task, patch or penalty. |

## Supported Scenario And Candidate Gate

| Basis | Initiator, independent trigger and supported surface | Forward lifecycle / consequence | Validity / use |
| --- | --- | --- | --- |
| SCN001/011/013; BEH001/004/005; AC012/018/019 | Storage owner creates native Ubuntu sharing in one public invocation with normal admin consent | Root-installed CLI -> Apply/install -> source qualification -> corrected engine -> hard4.1 self-mount -> exact nonroot marker/job/ready; original source preserved. API002 actual failures establish need independently of backport tests | Supported Normal Scenario; use for CR003 remedy |
| SR020 distribution contract; design distribution/qualification sections; REQ012/019, AC011/019/020 | Release operator, **after** required qualification/user/release gates, uses documented manual publish with existing candidate run/tag | prepare succeeds -> deliberately skip package rebuild -> verify/reuse candidate -> image/binaries -> existing release assets; correctly qualified one-command installer can then be distributed | Supported Normal Operational Scenario; use for CR004. This is an approved future release path, NOT authorization to publish now |
| SR020 bundle/security and preservation contract | Same consented setup consumes release-owned compiled payload | Exact architecture/name/version/hash/size before staging or package commands; own private staging/default-unit mask then version/status checks and exact cleanup | Supported Explicit Edge contract for invalid package delivery and owned install failure; use for guards, not a user-controlled sidecar scenario |

| Candidate | Observation / consequence / evidence | Disposition and proportionality |
| --- | --- | --- |
| CAND007 / prior CR003 | Stock engine's ordinary directory compatibility failure; selected accepted correction now incorporated in actual recipe and install path. Source archive/manifest/hash audit plus SR020 prototype and IR005 native/container package proof | **Promote retained supported remedy; accepted at source boundary.** API002 result unchanged until fresh public rerun; no Go bypass/retry/sysctl requirement |
| CAND008 / CR004 | On normal authorized publish, engine-packages skips, engine-inputs explicitly continues, but engine/binaries/publish retain default success checks over a dependency chain with the skipped ancestor. Static YAML plus primary GitHub scheduler contract | **Promote — this ticket / Local Fix.** Bounded publication control-flow regression; correct success/cancellation conditions without allowing failed verification/build/signing to publish |
| New engine/state migration or stock compatibility branch | Unreleased feature, build metadata not workspace data; no supported published pre-backport state to migrate | **Reject requirement for machinery**; SR020 rebuild artifacts/no user-data migration applies |
| Treat no physical/runtime/hosted execution in this source round as a new defect, or demand outage isolation | Those are explicitly downstream qualification gates; DEC015 defers outage isolation | **Reject deduction/prescription**; keep gates and limits visible, not a source waiver or fabricated Pass |

## CR-004 — P2: Preserve The Existing-Candidate Publication Branch Through The Job Graph

**Location:** `.github/workflows/release-nfs.yml:122–124`, and downstream
`:166–168`, `:239–241`; new skip is at`:52–54`, bridge at`:87–89`.

Given a valid authorized `workflow_dispatch` with `publish=true` and a retained
candidate, `prepare` passes its gates and `engine-packages` is intentionally
**skipped**. `engine-inputs` uses `always()` and can successfully validate/reupload
the prior candidate. The next `engine` job has no status-aware condition;
`binaries` also has none, and `publish` has only an ordinary boolean condition.
These remain in the skipped job's transitive dependency chain, so the publication
path cannot progress through them under GitHub's default status gating. The
build-only path does not hit this skip, explaining why package/build proof does
not cover it.

GitHub documents skip propagation through `needs` chains; the successful-bridge
case is also reproduced in its runner repository. [Official scheduler contract](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax#jobsjob_idneeds),
[runner issue2205](https://github.com/actions/runner/issues/2205).
[Actual graph/conditions and evidence limits](code-review-evidence/crr-006/workflow-path-audit.json).
**This is a static source/contract finding, not an executed hosted-workflow failure.**
The current empty lock's deliberate refusal is correct and is not this finding.

**Required outcome:** allow the intentionally skipped rebuild only on the existing
candidate path while requiring successful applicable prepare/candidate/image/
binary/signing gates and respecting cancellation. Cover both build-only and
existing-candidate job paths, including failed prerequisite refusal, with a focused
nonpublishing regression. Do not simply make all jobs unconditional, trigger a
real release for review, rebuild the qualified pair, or weaken release gates.
No upstream behavior/design change or new subsystem is required.

## Structural / Design Checks — Full Re-Audit

| Check | Result | Evidence / action |
| --- | --- | --- |
| Task design health assessment present, evidence-backed and preserved | Pass | SR020 dependency interoperability, not confinement, is the selected correction; bounded release/install owners retained |
| Approved behavior-defining supplements matched | Pass | SR018/017 scope, SR020 backport and SR019 source policy unchanged; no new product behavior |
| Data-flow spine inventory clarity/preservation | Pass | DS001 full distribution/setup/install/mount/job and DS002–005 app boundaries explicit; CR004 is job gating, not ownership fragmentation |
| Ownership boundary clarity | Pass | Packaging owns immutable provenance, backend installs, setup sequences, OS owns NFS data plane |
| Off-spine concerns serve clear owners | Pass | Bundle reader/stager serve existing Ubuntu installer; no new lifecycle service |
| Existing subsystem reuse | Pass | InstallUbuntuPackages and typed Release extended; CLI/admin lock/Commands retained |
| Reusable owned structures | Pass | EngineFile embedded in package identity; source/architecture pair shared by release and install |
| Shared-model tightness | Pass | EngineSource, EngineArchitecture, EnginePackage separate metadata from workspace state; no kitchen-sink application model |
| Repeated coordination ownership | Pass | Setup invokes one install boundary; package mask and APT sequencing not copied into CLI |
| Empty indirection | Pass | Validation, staging, source preparation and manifest each own concrete rules/effects |
| Separation of concerns/file responsibility | Pass | Source recipe vs build output vs artifact verification vs runtime bundle/install distinct |
| Ownership-driven dependencies | Pass | setup -> backend; CLI equality uses typed Release; no server/core dependency on package manager |
| Authoritative Boundary Rule | Pass | Setup does not bypass installer to stage/remove embedded packages; callers use authoritative service boundaries |
| File placement | Pass | packaging/engine, backend engine files, workflow, scoped scripts/tests align with responsibility |
| Flat/over-split judgment | Pass | Small cohesive files, platform embeds needed to avoid Linux debs in Mac binary; no framework |
| Interface/command boundary clarity | Pass | Typed engine metadata; fixed package names/versions and release-owned bytes, no caller path/URL |
| Naming/readability | Pass | Concrete source/build/manifest/bundle/staging names, explicit already-installed and cleanup semantics |
| Unjustified duplication | Pass | Same measured pair feeds native/Docker; cross-language validation sits at distinct build/runtime trust boundaries |
| Patch-on-patch control | Pass | Two-field dependency correction replaces stock path rather than adding reader retries/global compatibility policy |
| Dead code removed | Pass | Stock engine pins/installer arguments/GANESHA_VERSION path removed; no stranded exported engine API or old fallback identified |
| Relevant tests/assertions aligned | Pass | Real source/manifest and install-boundary assertions, equality and failure cleanup; no invalid source-read workaround |
| Fixture/helper coherence | Pass | Narrow fake bundles/runner and existing installer fixture reused; actual package evidence separately labelled |
| No stale/compatibility-only tests | Pass | Changed tests target new pair/equality/install contracts; skipped child deliberately belongs to Go parent |
| API/E2E readiness | **Fail** | CR004/CAND008 normal publication branch not operable; fix + source re-review before forward. Missing broad runtime proof itself is not a new deduction |

## Source Size / Structure Audit

[Full109-entry before/current audit](code-review-evidence/crr-006/source-size-audit.json)
against original65b0e6e57a, plus [26-path immediate delta](code-review-evidence/crr-006/source-audit.json).
No code file>500; max473. Tests/fixtures/generated payloads excluded from source
thresholds. New code owners: bundle108, staging53, source58, build74, manifest86;
Ubuntu installer111→150, release70→94, Release46→47, Apply185 unchanged, embeds4/7.
All code deltas<220. Workflow config186→277 this round (+91), cumulative277 from
original absence: explicitly reviewed as one coherent release pipeline, no
size-driven split justified. Placement/SoC pass; CR004 is control flow, not size.

## Legacy / Cleanup / Persisted Data

| Check | Result / evidence |
| --- | --- |
| No backward-compatibility machinery | Pass — no stock fallback or runtime old/new engine selection |
| No legacy old behavior retained | Pass — stock Ganesha package path replaced for native/Docker hosting |
| Touched dead code removed | Pass — old package arguments/base-version workflow output removed; fixed current recipe entrypoints all used |
| Transition decision followed | Pass — build artifacts rebuilt/locked; workspace/UUID/profile state not migrated |
| No version-specific dual reads/writes | Pass — current typed release equality and existing generic config decoding |
| Migration mechanics proportionate | Pass — no migration required or invented |

No additional dead/obsolete removal item found. Exact staging cleanup does not
recursively erase external entries; uncertain mask cleanup stays explicit.

## Material Premises And Docs

MP001–004/SR019 and DEC015 unchanged/confirmed; MP005 Linux compatibility
recovery confirmed as the supported reason for the backport. Historical exact
API packet attribution remains inferred, not newly proved. CAND008 uses an
independently approved release contract, not a synthetic user workflow.

Docs impact **Yes**: NFS README, THIRD_PARTY_NOTICES, packaging/engine README and
RELEASE.md updated coherently for source attribution, same-pair distribution and
unqualified state. Publication instructions require the CR004 implementation fix;
Delivery still owns final docs/Guide/public installer synchronization, not this review.

## Mandatory Scorecard

**9.6/10 (96/100)**, simple average for trend only. Two categories below9 fail the
review regardless of average. This is source-review quality, **not API confidence,
all-green tests or release/physical qualification**. CRR005 was failure-only/no
aggregate; previous CRR004100/100 remains historical at its prior scope.

| Priority | Category | Score | Why / concrete weakness | Improvement |
| --- | --- | ---: | --- | --- |
| 1 | Data-Flow Spine Inventory and Clarity | 10 | Complete distribution/control/data/app paths identifiable; no structural gap | None required |
| 2 | Ownership Clarity and Boundary Encapsulation | 10 | Packaging/backend/setup/private state owners distinct | None required |
| 3 | API / Interface / Query / Command Clarity | 10 | Typed release provenance, fixed install subject, complete equality | None required |
| 4 | Separation of Concerns and File Placement | 10 | Cohesive recipe/manifest/staging/install files and existing control owner | None required |
| 5 | Shared-Structure / Data-Model Tightness and Reusable Owned Structures | 10 | Composed metadata identities, no workspace registry/migration introduced | None required |
| 6 | Naming Quality and Local Readability | 10 | Named concrete concerns and explicit error/cleanup paths | None required |
| 7 | API/E2E Readiness | **8** | CAND008/CR004 blocks the supported retained-candidate publication path; current tests inspect strings rather than that dependency path | Focused branch/status regression and source re-review |
| 8 | Runtime Correctness And Behavioral Fidelity | **8** | CAND008/CR004 skips required publication jobs in normal authorized workflow; not a deduction for deferred API/physical execution | Correct status-aware graph while preserving failed/cancelled prerequisite refusal |
| 9 | No Backward-Compatibility / No Legacy Retention | 10 | Stock path replaced, no read fallback/protocol downgrade/sysctl policy | None required |
| 10 | Cleanup Completeness | 10 | Owned staging/mask receipts, no dead path found; reviewer temporary resources cleaned | None required |

## Execution Evidence, Follow-ups And Residual Gates

[Reviewer checks/limits](code-review-evidence/crr-006/checks-and-limits.md),
[personal command results](code-review-evidence/crr-006/checks-result.json),
[cleanup](code-review-evidence/crr-006/cleanup.json). Python11pass/1skip; hash and
unqualified refusal pass. Actual retained11 candidate files and corresponding
source inspected. Initial reviewer path-count assertion failed before resources,
corrected and retained; not a product defect. No reviewer Go/VM/root/Docker/hosted
workflow run. IR005 Go/build/mutations/native-package/Docker evidence inspected,
not relabelled as personally rerun or public setup. No production/durable-test edits.

**FUP001 only existing follow-up**, already `/project_task_manager` custody at
`/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/task-plans/context/fup001-updater-stack-path-classification-candidate.md`.
Current Nuxt/Electron historical baseline failures and removed-candidate-only
green distinction retained; no repeated notice/Task/worker/penalty. No new follow-up.

After correction/source Pass, API-F002 fresh public Ubuntu24.04.5/ext4/kernel7.0.0-38
create/reconnect first, default delegationsY, nonroot1000:109/no groups, original
nonempty source, hard4.1, bytes/UUID/modes/job; **no engine preinstall or probe bypass**.
Retained exact IR005 candidate is available; new builds require recorded identities.
Then remaining both-OS native/managedDocker clients, Linux native/Docker storage,
peers/normal operations/restart/detach/preservation/locks/Git, native tools/unread
assets/peer-close/restore/Standalone-Team-Org, mounted healthy desktop previews,
independent physicalMac/Linux/Docker, docs/finalization/explicit user verification/
authorized release. Only MacDocker STORAGE deferred. Mac peer NAT limitation
remains separate. DEC015/D001 outage hardening deferred/not fixed; IMP-D001 private
links/independent source Update-Remove/AGY/local preserved. VM alone cannot finish.

## Classification / Routing

**Fail — implementation-owned Local Fix**, CR004 P2; requirements/design adequate
for a bounded workflow correction. Supported-scenario/material-premise gates
**Pass**; no speculative machinery or product reapproval required. Source review
must repeat after fix; no API/test-code/Delivery Pass or advance now. Main Task open.
Fresh handoff rule and delivery receipt are retained in CRR006 `routing.json`.
No delegation, merge/push/tag/release or user-verification claim.
