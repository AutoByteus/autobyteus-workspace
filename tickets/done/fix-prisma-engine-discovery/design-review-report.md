# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: [requirements-doc.md](requirements-doc.md), R3 Approved.
- Upstream Investigation Notes: [investigation-notes.md](investigation-notes.md), E-001–008.
- Upstream Solution Revision Record: [solution-revision-record.md](solution-revision-record.md).
- Reviewed Design Spec: [design-spec.md](design-spec.md), D1 Ready.
- Supplemental Task Artifacts Reviewed: current cumulative [handoff](solution-handoff.md), cause brief, metadata attempts, recurrence snapshot and custody/relay records; relevant historical evidence identified below. No normative supplement.
- Relevant Solution Revision IDs: SR-004 current; SR-001–003 establish approval/supersession history.
- Architecture Review Revision Record: [architecture-review-revision-record.md](architecture-review-revision-record.md).
- Current Architecture Review Revision ID: ARCH-REV-001.
- Current Review Round: 1, completed 2026-10-13 by architecture_reviewer.
- Trigger: Solution Designer requests independent review of permanent-source Task `project_task_6b8c9612-c94b-4d62-8053-00ef94bd94df`.
- Prior Review Round Reviewed: N/A — first review of this package. Other tickets' operational reviews do not transfer approval.
- Latest Authoritative Round: 1 / ARCH-REV-001 / Pass.
- Current-State Evidence Basis: isolated `codex/fix-prisma-engine-discovery` at `269b3939ec`, base `e22245f097c208e66065302cfc30814cc5ffd14f`, target `origin/personal`; clean before review. Base-to-HEAD changes are only the 12 supplied ticket artifacts. Independently read complete `autobyteus-server-ts/src/startup/migrations.ts` and its engine-env unit test, traced production callers and packaging; no source edit, build, executable test, Docker command, live-node probe or private-backup access performed by reviewer.

Review authorities: architecture-reviewer skill/shared design principles/report templates; root AGENTS.md, DESIGN.md, TESTING.md; server AGENTS.md; startup-initialization and data-migration guidelines. No closer startup/test AGENTS or DESIGN override found. Historical AppImage investigation and introducing commit `6a0a43b55e` were checked for the fallback's independent product basis.

## Routing Classification Review

- Task size: Medium. One existing runtime owner plus focused owner tests, durable Docker lifecycle harness and discoverable package script.
- Architectural risk: High. Native selection feeds the schema prerequisite for normal server, standalone host and explicit-target secret import; wrong ABI can prevent startup. Content volume is not the rationale.
- Classification rationale reviewed: supported by actual callers and observed startup failure.
- Independent Architecture Review required by the classification: Yes.
- Classification evidence or correction required: none. Source/code/API/Delivery gates remain pending; no operational dispatch is requested.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: Confirmed.
- Approved requirements / intended behavior understood: R3 REQ-001–007 / AC-001–006 govern permanent automatic discovery, preserved contracts, truthful cause and isolated current-source proof.
- Relevant existing behavior and evidence confirmed: `migrations.ts:16–29,85–240,243–321` implements local JS/.bin/pnpm selection, unowned bundle lookup, all-revision cache ranking, explicit pair precedence, canonical DB and deploy/P3005/error behavior. The defect is not an absence of installed native engines.
- Scope guardrail confirmed: UC-001–003 only; live repair/probes, pin removal, user data/cache changes, dependency/schema/launcher changes and publication are excluded. R2's operational IDs are retired, not silently approved by historical evidence.
- Approved change, preserved behavior, and outside scope understood: change automatic ownership/revision selection only; keep normal command/migration/data lifecycle and all user nodes untouched.
- Every prospective blocking Design Impact finding is traceable to approved authority: Yes — no blockers raised.
- Remaining material ambiguity: none for this design. Unknown historical cache writer is an explicit evidence limit, not a prerequisite to this fix.

| Behavior ID | Kind | Design Alignment With Approved Intent | Approved Trigger / Contract And Current-State Evidence | Target Outcome / Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System / SCN-001 | Pass | Pass — supported normal Docker/development/deployed launch enters AppConfig then common migrations; Dockerfile.monorepo:95–112 retains root pnpm graph; prepare-server.sh:174–239 deploys self-contained graph | Pass — DS001/002/004 use real local CLI dependency ownership rather than physical-store guessing | Confirmed | Implement and validate AC-001 |
| BEH-002 | Contract / SCN-002,003 | Pass | Pass — historical released AppImage lacks required native target and cannot copy into its read-only mount; actual user managed upgrade/recreation retained HOME and lost container-local pin, exposing incompatible cache on new process startup | Pass — own pair first, exact metadata revision cache second, null without arbitrary override; normal CLI failure retained | Confirmed | Prove AC-002 and actual owned recreation AC-004 |
| BEH-003 | Operational / preserved contract | Pass | Pass — runMigrations called by server-runtime:118, standalone host:115 and immutable-target importer:60; complete env pair and supplied DB already govern command execution | Pass — DS001–004 preserve these boundaries and schema-before-repository/vault order; no live action | Confirmed | Exercise command/env/error controls, protect all user state |
| BEH-004 | Operational / SCN-004 | Pass | Pass — user asks why same-image nodes differed and for permanent fix; historical control/RPC, fresh timestamped recurrence and source history support selection cause, not actor identity | Pass — cause brief distinguishes historical, current fixture, source proof and separately reported recovery | Confirmed | Update factual completion evidence after validation; no release inference |

The production witness for retained cache starts with the supported managed upgrade/recreation, not with a synthetic cache file: preserved root-home volume → new unpinned backend → common schema startup → local-only bundle miss → incompatible cached pair → RPC error → migration prerequisite failure. The test fixture reproduces this already-observed path. The immutable fallback has separate released-artifact evidence in `tickets/done/linux-appimage-prisma-erofs/investigation-notes.md`, not just a fallback branch or deletion experiment.

## Supplemental Artifact Coherence Verdict

All current paths below are relative to this ticket. Historical paths are under `/Users/normy/autobyteus_org/autobyteus-delivery-records/docker-node2-prisma-engine-mismatch/`. Investigation notes inventory current and externally owned evidence and link it to behavior; old status-bearing artifacts are snapshots, not current execution authority.

| Artifact | Purpose And Scope Are Clear? | Linked To Relevant Core Artifacts? | Internally Complete? | Consistent With Related Core Artifacts? | Status And Approval Applicability Are Clear? | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| root-cause-summary.md | Pass — source/provenance explanation | Pass | Pass | Pass | Pass — not implemented, writer unknown | Preserve evidence limits in final brief |
| investigation-evidence/available-image-dependency-metadata.json | Pass — owned fixture feasibility | Pass | Pass — command, actual realpath/metadata, image ID, cleanup | Pass | Pass — not current-source startup proof | None |
| investigation-evidence/cli-dependency-metadata.json | Pass — unavailable old-image attempt | Pass | Pass — exit125 and absence receipt retained | Pass | Pass — failed attempt, not Pass | None |
| investigation-evidence/recurrence-node2-readonly.json | Pass — authorized earlier factual snapshot | Pass | Pass — timestamp/identity/pin/log/resolver facts | Pass | Pass — no permission for another probe | None |
| investigation-evidence/requirements-r2-superseded.md; recurrence-findings-handoff.md | Pass — superseded scope and historical relay | Pass | Pass for historical purpose | Pass — SR-003/004 and current custody override old routing | Pass — R3 alone governs | Never replay historical repair request |
| delivery-custody-resolution.md; external recurrence-20261013-upgrade/handoff-summary.md | Pass — distinct operational disposition | Pass | Pass for custody purpose | Pass — canceled unused06f7, permanent task open | Pass — neither Terminal nor source approval | Preserve external ownership; no duplicate operator/manager dispatch |
| External package/cause-comparison.md and investigation-notes.md, with referenced control/native evidence | Pass — historical same-image contrast and cause | Pass | Pass for design basis | Pass — no current health guarantee | Pass — old config-only reviews/results remain scoped | No reuse as changed-source proof |
| solution-handoff.md | Pass — cumulative package/route | Pass | Pass | Pass | Pass — source gates pending | Append reviewer artifacts to downstream packet |

Dependency mechanism is supported by the actual owned-image manifest observation. Node documents realpath-based dependency lookup and filename-anchored require construction; using both here is a design inference consistent with that observed graph. See [Node package-manager resolution](https://nodejs.org/download/release/v22.15.0/docs/api/modules.html#package-manager-tips) and [createRequire](https://nodejs.org/download/release/v22.15.0/docs/api/module.html#modulecreaterequirefilename). Prisma's pinned source associates its engine package with `engines-version` and revision-specific downloads; its cache utility includes channel/revision/target. See [Prisma 5.22 engines](https://raw.githubusercontent.com/prisma/prisma/5.22.0/packages/engines/src/index.ts) and [cache utilities](https://raw.githubusercontent.com/prisma/prisma/5.22.0/packages/fetch-engine/src/utils.ts). These sources corroborate mechanics, not node2's historical cache writer.

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | D1 explicitly assesses source bug fix | None |
| Root-cause classification is explicit and evidence-backed | Pass | Local Implementation Defect + Missing Invariant; current unowned search and unversioned cache match observed failure | None |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | Local algorithm replacement now, not new owner/subsystem | None |
| Refactor decision is supported by the concrete design sections or residual-risk rationale | Pass | Exact algorithm, file map and obsolete-branch removal; callers retain healthy boundary | None |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? | Narrative Is Clear? | Facade Vs Governing Owner Is Clear? | Main Domain Subject Naming Is Clear? | Ownership Is Clear? | Off-Spine Concerns Stay Off Main Line? | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS001 | Launch/config → migrations/CLI/schema → repository/vault/app-data → HTTP | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS002 | Standalone host/config → same schema owner → persistence/vault → host ready | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS003 | Explicit-target secret import → target-bound schema → repository/vault → result | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS004 | Local explicit pair → CLI metadata → own bundle → exact cache → pair/null | Pass | Pass | Pass | Pass | Pass | Pass | Pass |

No new asynchronous return/event spine; existing synchronous success/error propagation remains.

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? | Internal Owned Mechanisms Stay Internal? | Caller Bypass Risk Is Controlled? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Migration startup owner | Pass | Pass | Pass | Pass | Three callers still use runMigrations; private metadata resolution does not become caller policy |
| Caller configuration/persistence lifecycle | Pass | Pass | Pass | Pass | Canonical DB stays caller-owned; native discovery does not assert data health or admit history |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? | Forbidden Shortcuts Are Explicit? | Direction Is Coherent With Ownership? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| migrations.ts → Node filesystem/module resolution → selected CLI packages | Pass | Pass | Pass | Pass | No package JS execution, global search, downloader, caller pin or cache management; normal command execution remains distinct |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? | Responsibility Is Singular? | Identity Shape Is Explicit? | Generic Boundary Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| runMigrations({appRoot,databaseUrl}) | Pass | Pass | Pass | Low | Pass |
| resolvePrismaEnginePair(appRoot,baseEnv,cacheRoot) → existing PrismaEnginePair/null | Pass | Pass | Pass | Low | Pass |
| Private installed metadata {engineDir,engineRevision}; buildPrismaCommandEnv | Pass | Pass | Pass | Low | Pass |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? | Reuse / Extension Decision Is Sound? | New Support Piece Is Justified? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Startup/engine selection | Pass | Pass | Pass | Pass | Extend existing owner and target/pair semantics; small private metadata reader, no engine service |
| Native lifecycle regression | Pass | Pass | Pass | Pass | No equivalent discovery/recreation harness found; existing Node/Docker/E2E boundary fits one gated durable check |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? | Reuse / Extend / Create-New Decision Is Sound? | Supports The Right Spine Owners? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Startup; unit/startup; e2e/startup | Pass | Pass | Pass | Pass | Production policy stays in startup; tests reproduce rather than own it; no framework addition |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? | Shared File Choice Is Sound? | Ownership Of Shared Structure Is Clear? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Pair/platform/CLI metadata | Pass | N/A | Pass | Pass | Already one owner; two private metadata fields do not warrant shared module or global cache |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Overlapping Representation Risk Is Controlled? | Shared Core Vs Specialized Variant / Composition Decision Is Sound? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Existing PrismaEnginePair and private metadata | Pass | Pass | Pass | Pass | Pass | Keep path/source API; revision is native commit, not package/app semver or mtime; no persistent schema |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? | Responsibility Matches The Intended Owner/Boundary? | Responsibilities Were Re-Tightened After Shared-Structure Extraction? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| src/startup/migrations.ts | Pass | Pass | N/A | Pass | Bounded automatic selection and existing migration command boundary |
| tests/unit/startup/migrations-prisma-engine-env.test.ts; optional migrations-command.test.ts | Pass | Pass | N/A | Pass | Graph/pair/env fixtures and preserved exec lifecycle; repository search found no equivalent focused command file |
| tests/e2e/startup/prisma-engine-discovery.docker.mjs; package.json script | Pass | Pass | N/A | Pass | Actual owned current-build/native/recreation proof; script only, no dependency churn |
| Ticket artifacts | Pass | Pass | N/A | Pass | Role-owned facts/results, no private evidence or executable policy |

Paths in this table are under `autobyteus-server-ts` except ticket artifacts.

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? | Folder Matches Owning Boundary? | Mixed-Layer Or Over-Split Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Existing startup owner and startup test directories | Pass | Pass | Low | Pass | No artificial common/helpers hierarchy or caller-specific duplicate |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? | Replacement Owner / Structure Is Clear? | Removal / Decommission Scope Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| listBundledPrismaEngineDirs and unowned candidate loop | Pass | Pass | Pass | Pass | Private same-file reachability; replacement CLI-owned lookup removes its caller, then helper |
| All-revision cache/mtime ranking | Pass | Pass | Pass | Pass | Exact-revision subtree replaces defective policy cleanly |
| Ownerless fixtures / now-unused imports and helpers | Pass | Pass | Pass | Pass | Remove replaced assumptions; final reference/typecheck required, not claimed run here |

No independent currently dead production path was identified in the touched owner. Existing public startup/pair/target functions remain reached by production, not retained solely for tests.

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? | Clean-Cut Removal Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- |
| Old automatic selection | No | Pass | Pass | No old/new flag, directory-scan rescue, version sniffing or hardcoded605 |
| Exact-revision cache and explicit env | No | Pass | Pass | Same current ABI/storage alternative and preserved operator contract, not legacy protocol support |

## Persisted-Data Transition Verdict (When Applicable)

| Area / Stored Subject | Approved Decision | Representative Reader / Semantic / Invariant Evidence Is Sufficient? | Direct Use, Rebuild, Or Migration Choice Is Proportionate? | Migration Safety Is Complete If Required? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Native package/cache inputs | Not Affected by transformation | Pass | Pass | N/A | Pass | Read-only lookup; mismatching cache retained but not injected, no wipe/rebuild |
| App DB, vault, app-data/history | Not Affected by new transformation | Pass | Pass | N/A | Pass | No schema/format/ledger change. Existing schema prerequisite, P3005 and ordinary migration writes remain; tests use owned data only |

D1 answers all ten migration-guideline questions proportionately. No history-wide validator, backup/journal framework, forced-success branch or new migration is warranted by this change.

## Change / Refactor Safety Verdict

| Area | Sequence Is Realistic? | Temporary Seams Are Explicit? | Cleanup / Removal Is Explicit? | Verdict |
| --- | --- | --- | --- | --- |
| Owner fixtures → bounded algorithm replacement → self-checks → independent validation | Pass | Pass | Pass | Pass |
| Current-build native stack → API-created data → same-home/data recreation → owned cleanup | Pass | Pass | Pass | Pass |

The old resolver/native mismatch control is required evidence, not an allowed production fallback. No old-image config-only check can substitute for current-source proof. TESTING's dist-equality restriction or fresh owned image build prevents a stale mixed stack. Missing fixtures/builds are not a waived pass. Source finalization is separate from public-image rollout.

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? | Example Is Present And Clear? | Bad / Avoided Shape Is Explained When Helpful? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| CLI realpath/associated revision versus newer unrelated cache | Yes | Pass | Pass | Pass | D1 concrete A/B example, positive exact cache and negative unrelated revision; supported layouts named |

## Material Premise Validation (Only When Needed)

None additional. Normal startup, immutable packaged native fallback and retained-home managed recreation are independently established in the confirmed behavior basis above. No finding or new machinery depends on hypothetical cache tampering, corrupt DB, missing historical records, or a presumed cache writer.

## Unresolved Approved-Behavior Or Current-State Gaps

None affecting architecture readiness. Actual implementation/native execution results remain future gate obligations, not missing design intent.

## Review Decision

**Pass** — R3/D1 is actionable within the existing owner, its production basis is confirmed, and no in-scope machinery relies on an unsupported material premise. This approves implementation, not completed source, tests, live recovery or release.

## Findings

None.

## Classification

N/A — no Design Impact, Requirement Gap or Unclear finding. Retain Medium / High routing classification.

## Recommended Recipient

Rule lookup completed 2026-10-13. Selected primary Pass/implementation-ready rule: `/software_engineering_team/implementation_engineer`, with the cumulative current package and both review artifacts. Fail/Blocked does not apply. The separately returned informational rule for `/software_engineering_team/solution_designer` applies only after the primary handoff succeeds. No operational/manager dispatch or duplicate implementation request. Transport success is not preclaimed by this artifact.

## Residual Risks

- Installed package metadata is verified for the current locked dependency and graph; unexpected package/export changes or missing packaged graph need evidence and upstream recovery, not new guessing/scans.
- Native regression, canonical command/error controls and actual current-built retained-home recreation have not run in this review. Required by AC-001–004; fake files only prove selection. Record native platform limits rather than claiming every packaged platform.
- Explicit override precedence deliberately remains unchanged, including compatible temporary user-node pins. Future recreation of an old published image can still lose a container-local pin; this source gate neither removes it nor authorizes rollout.
- Historical cache writer remains unknown. Read-only snapshots and external recovery receipts are time-bounded; no reviewer live readiness or all-history health claim.
- TESTING Rule9 and moving-base/source-build audits remain downstream obligations. Old image absence is recorded, not concealed; it does not require live-node access or block this owner-bound architecture.

## Latest Authoritative Result

- Review Decision: Pass / ARCH-REV-001 / round 1.
- Material-Premise Gate: Pass.
- Notes: SR-004, R3 Approved, D1 Ready, Medium/High. No findings. Canonical report is authoritative; revision record is navigation/history. No source modification, executable validation, live action or finalization performed by reviewer.
