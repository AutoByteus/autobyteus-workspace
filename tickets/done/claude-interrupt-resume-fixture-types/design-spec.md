# Design Spec

## Solution And Approval Basis
- Package `claude-interrupt-resume-fixture-types`; Project Task `project_task_11c75527-3875-4664-a49c-d1c871064d5c`; current revision **SR-003**.
- Design status **Ready — Architecture Design Complete**.
- Requirements **Approved SR-001** by Solution Designer within Task direction, user informed by “The fresh baseline reproduces the same seven TypeScript diagnostics…” (2026-10-13); behavior intent unchanged in this design.
- Behavior-defining supplements/Product artifacts **N/A — not applicable**. Prior Task Terminal and old reviews are external historical context, not new passes.
- Canonical investigation: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-interrupt-resume-fixture-types/tickets/in-progress/claude-interrupt-resume-fixture-types/investigation-notes.md`.
- Authorities read: solution-designer skill, architecture-design.md, design-principles.md, required design-spec template; applicable worktree DESIGN.md/AGENTS.md/server AGENTS.md/TESTING.md, Agent WebSocket Streaming Protocol. Full readings occurred in this same conversation; current Task reread updated TESTING.md and reconfirmed applicable DESIGN.md content unchanged. No closer DESIGN.md, no conflicts or discrepancies. design-examples N/A — narrow current-owner changes.

## Current-State Read / Architecture Investigation Evidence
Investigation E-01..08, A-01..06 establishes fresh **7 scoped compiler errors**, runtime **8 passed/1 live skipped** on finalized prior repair. Missing direct ws declarations prevents callback contextual typing; three-field literal is not current AgentDefinition; projection stub includes retired capability key/access. The historical introduced-only helper returning 0 did not mean clean. Existing typed constructor/DTOs and package-local compiler/lock surfaces can absorb a local test-only repair; no runtime boundary change or owning production defect established.
Evidence maps: E-03 → zero-total-diagnostics gate; E-05/A-01 → proper declaration dependency; E-06/A-02 → complete prompt fixture with byte-equivalent prompt; E-07/A-03 → retire obsolete projection fields; E-08/A-04/05 → standard compiler single-entry config, not filtered comparison.

### SR-003 Recovery Basis — IMPL-F001
IR-001's newly linked ws types expose a further **local** TS2367 in closeHarness's post-await readyState comparison. Investigation A-07..10 records actual command failure, unchanged source and a full-graph virtual-host feasibility probe (current one TS2367, candidate zero). This is **Design Impact**, not a requirement/product change. Requirements remain Approved SR-001 with unchanged approval; no renewed user approval needed. Revised design adds only a fresh boolean state observation in the same test file. Runtime assertions and cleanup semantics stay binding; no final implemented-source pass inferred from probe.

## Intended Change
1. Add **@types/ws 8.18.1** as server **devDependency**, reusing the already locked/installed transitive version. Update server importer in lockfile through pnpm; do not upgrade ws, TypeScript, Claude SDK, runtime packages or unrelated lock entries.
2. Instantiate current **AgentDefinition** at the existing prompt fixture with **identical name/description/instructions**. Constructor supplies declared defaults; do not use assertion casts or duplicate its full required-field structure.
3. Remove stale `canInterrupt: snapshot.can_interrupt === true` from the local status projection object. Current contract has neither member; do not re-add fields in production or substitute an invented capability gate.
4. Provide standard package-local **typecheck:claude-interrupt-resume-e2e** command/config for this exact test and normal transitive graph, exiting nonzero for any compiler diagnostic. Inherit existing build policy. No custom delta filter/diagnostic allowlist or global test check policy.
5. In **closeHarness only**, use local `socketClosed = (): boolean => socket.readyState === WebSocket.CLOSED` after the separate missing-socket return. Use it for the initial CLOSED return, existing waitForCondition predicate and finally not-closed termination guard. Keep the same CONNECTING terminate/otherwise close, label/deadline, action order, error aggregation and all remaining resource releases. No caching readyState or casts/suppression. This narrowly authorized source-form alignment resolves IMPL-F001's typing without changing cleanup behavior.

## Relevant Behavior And Production-Path Map (Mandatory)
| Behavior / intent | Approved IDs / trigger | Existing evidence and preserved outcome | Target technical path / lifecycle |
| --- | --- | --- | --- |
| BEH-001 Operational | REQ-001/003, AC-001/002; SCN-001 developer scoped check | E-02/03/E-08; strict total diagnostic accounting | DS-001: package command → prepare:shared → scoped config → TypeScript real graph → diagnostics/exit |
| BEH-002 User/System/Contract | REQ-002/004/005, AC-003/004/006; SCN-002 regression workflows | E-04/A-03; all original scripts/assertions/live gate and exact cleanup | DS-002/003 semantics unchanged; DS-004 permits only local fresh-state predicate source form plus complete fixture payload setup |
| BEH-003 Contract | REQ-001/002/003, AC-001/003/005; SCN-003 declared type inputs | E-05..07/A-01..03/A-07..10; prompt/status/interrupt and mutable close observation semantics unchanged | DS-005: constructor → prompt composer/identity rendering; accurate status projection; ws declarations at compiler boundary |
No new product premise, supported scenario or runtime behavior. Approved fixture maintenance is an operational path; synthetic messages do not establish extra product scope.

## Relevant Supplemental Task Artifacts
Canonical investigation inventory includes supplied seven-diagnostic log/helper/command and old repair/review/Terminal context, plus fresh new-Task compiler/runtime baseline probes/receipts. Evidence-only, not behavior-defining supplements. Archived previous Task remains read-only. New independent architecture/source review artifacts **N/A — not applicable/not yet produced**; classify actual route only after rule lookup.

## Task Design Health Assessment (Mandatory)
- Posture **Bug Fix / test fixture maintenance**; bounded local contract drift, no production design issue found.
- Root cause **Local Implementation Defect** in fixture/declaration linkage; old projection fields are obsolete fixture content. Existing AgentDefinition/prompt/status owners are correct.
- Refactor needed now **No**: constructor and current type owners already solve required shapes; declaration linkage and standard config suffice. No generic fixture framework, new runtime owner or shared helper layer; SR-003 reuses a local boolean predicate for actual asynchronous ws state reads, not a shared lifecycle abstraction.
- Structural triggers: reuse existing class/compiler/package boundary; legacy-retention pressure rejected (no production compatibility fields/old/new fixture fallback). Boundary bypass avoided (test consumes constructor/DTO, doesn't redefine production types). No duplicated cross-file policy or ambiguous ID requires refactor.
- Risk/deferral: a newly visible shared/production diagnostic is escalation, not reason to suppress it; global CI/other suites remain separate Tasks.

## Terminology
“Clean scoped result” means **zero total diagnostics** for target and imported graph under current build policy, not zero introduced errors or repo-wide clean tests. “Declaration dependency” is development-only ws types, not runtime ws upgrade.

## Legacy Removal Policy / Removal-Decommission Plan (Mandatory)
- Remove the retired test projection `canInterrupt` key and `can_interrupt` access (A-03: absent from current contracts/consumers). No compatibility replacement.
- Replace incomplete prompt literal with existing constructor; obsolete shape replaced cleanly, original semantic fields preserved.
- Supplied historical delta helper stays immutable old evidence; **do not** edit original finalized ticket to reinterpret its exit0. New checker is explicit zero-diagnostic compiler gate.
- Replace only three inline CLOSED comparisons with a local live-state predicate to avoid stale static narrowing; no parallel old/new close path. All closure timing/state branches retained.
- No dead case/frame/fake/lifetime method removal justified; all are reached by current8+1. No production source deletion/move; unrelated dead-code cleanup N/A.

## Persisted Data / State Transition Decision
**Not Affected**: no stored source/runtime/schema/read-write semantic change. Only disposable private test data/worktree DB; user data untouched. Migration conventions/plan N/A because no persisted transition is required.

## Data-Flow Spine Inventory / Primary Execution Spines
| ID | Scope / owner | Full span | Why / behavior |
| --- | --- | --- | --- |
| DS-001 | Primary End-to-End; package checker + TypeScript | Developer command → existing shared-build prerequisite → scoped config → target/imported project graph and declarations → full diagnostics → exit | BEH-001/003; truthful reproducible compiler result |
| DS-002 | Primary End-to-End; real AgentRun/Claude session | Test ws SEND_MESSAGE → real route/stream handler → command coordinator → AgentRun FIFO → Claude backend/session → retained SDK fake query/controlled real child → send | BEH-002; unchanged existing scenario coverage |
| DS-003 | Return-Event; Claude tracker/AgentRun/egress | Scripted provider results/task events → tracker/projectors → backend converter → canonical AgentRun queue → stream mapper/cadence → socket expectations | BEH-002; same completion/error/interrupt/append behavior |
| DS-004 | Primary resource-release; manager/exact process owner | Test finally → manager closeRunSession → component/pump/child exit+IO proof → exact manager removal → socket/app/private cwd closed | BEH-002; no cleanup dilution |
| DS-005 | Bounded Local; AgentDefinition/prompt owner | Same semantic fields → existing constructor defaults → prompt composer → identity section → same systemPrompt/query options | BEH-003; type repair without changed prompt |

## Spine Narratives (Mandatory) / Main-Line Ownership
DS-001 uses the actual TypeScript CLI, so no hand-filtered diagnostic loop can pretend clean. Existing package build prerequisite regenerates consumed declarations; narrowly included target pulls imports normally. DS-002/003 retain actual public transport/domain lifecycles and provider seam; only source fixture types align. Removing obsolete projection metadata doesn't govern interrupt, which already delegates to active AgentRun. DS-004 retains identical real cleanup semantics; socketClosed rereads the live socket before return, during polling and in finally rather than carrying a narrowed property fact. It owns no state/termination policy. A green compile cannot replace the cleanup assertions. DS-005 uses existing defaults without changing the only three fields rendering consumes.
Main owners remain: package scripts/config (developer check entry), TypeScript (module resolution/diagnostics), AgentDefinition (complete defaults), prompt composer (rendering), projection DTO/AgentRun (status), ws library types (callback signatures), existing harness/runtime (behavior/lifetime). WebSocket route is a thin entry facade, not capability/prompt/type policy owner.

## Off-Spine Concerns / Ownership Boundaries / Dependency Rules
Development declaration linkage serves compiler only. Existing prepare:shared and server prebuild supply exports/Prisma; don't invent a second build system. Test imports current constructor/interfaces; production must not depend on tests. Do not widen composer input, DTOs or type-check casts to accommodate a stale fixture. Existing partial doubles outside these diagnostics remain out of scope unless a new actual diagnostic requires an approved local repair.
Boundary map: developer → named package command, command → scoped config/real tsc; harness → constructor/current projection/SDK entry, never new type alias replacing production contract; cleanup → real manager owner, never fabricated receipts. Runtime owners, IDs, routing and caches unchanged.

## Interface Mapping / Naming / Reuse / Shared-Structure Checks
- CLI `pnpm -C autobyteus-server-ts typecheck:claude-interrupt-resume-e2e`: one explicit file/imported graph, no generic glob guess. Singular responsibility/identity Yes, ambiguity Low.
- AgentDefinition({...}): existing clear domain owner; reuses declared constructor defaults rather than repeated lists/parallel model. No new shared structures needed.
- AgentRunStatusProjection/AgentStatusPayload: existing exact shapes. Delete obsolete fixture members rather than introduce aliases.
- closeHarness.socketClosed(): local pure boolean observation of current CLOSED state; no parameters, cache, cast or additional owner. It cannot certify child/session release.
- ws message/error callbacks: infer **RawData/Error** from real locked declarations; explicit annotations only if needed, with those existing types, not unknown/any erasure.
No naming drift or new abstraction. Existing package tool/script/config subsystem **Extend**, existing domain/transport/runtime capability **Reuse unchanged**.

## Draft And Final File Responsibilities / Folder Boundary / Change Inventory
| Change | Path | Responsibility / why placed here |
| --- | --- | --- |
| Modify | autobyteus-server-ts/tests/e2e/runtime/claude-agent-websocket-interrupt-resume.e2e.test.ts | Complete local prompt fixture, current projection/callback types and fresh closeHarness state predicate; retain bodies/assertions/gate and all cleanup semantics and append focused-check command/prerequisites to header |
| Modify | autobyteus-server-ts/package.json | Direct dev declaration and discoverable optional scoped command; production typecheck/test scripts unchanged |
| Modify | pnpm-lock.yaml | Narrow server importer dev dependency, reuse existing pinned graph; no runtime upgrades/unrelated churn |
| Add | autobyteus-server-ts/tsconfig.claude-interrupt-resume-e2e.json | Standard single-entry package-local noEmit project inheriting build policy; no global-test policy |
| Add/update | tickets/in-progress/claude-interrupt-resume-fixture-types/* | This Task's owned solution/specialist evidence/history, not previous finalized ticket |
Draft/final mapping agree. Package-root tsconfig beside current build config is readable for one narrowly named check; no new tools directory/helper hierarchy warranted. Test folder remains existing boundary. Rename/move/production removal **None**.

## Concrete Shape Guidance / Applied Pattern
Existing configuration extension, not a new framework:
- New config `extends: './tsconfig.build.json'`, `compilerOptions: { rootDir: '.', noEmit: true }`, `include: ['tests/e2e/runtime/claude-agent-websocket-interrupt-resume.e2e.test.ts']`, `exclude: ['dist','node_modules']`. Do **not** inherit the build's tests exclusion or add any strictness disabling override. Keep inherited paths {}, module resolution, strict and existing skipLibCheck policy unchanged; this is scoped build-policy checking, not stronger root test policy.
- New package command: `pnpm prepare:shared && tsc -p tsconfig.claude-interrupt-resume-e2e.json --noEmit`. Standard server prebuild remains prerequisite for Prisma and suite as documented by current header. Explicit shared build avoids relying on implicit pre/post-hook behavior.
- Good fixture: `agentDefinition: new AgentDefinition({name: <same>, description: <same>, instructions: <same>})`; bad: literal `as AgentDefinition`, changed production Partial input, or copy-pasted defaults.
- SR-003 mutable close-state shape:
  ```ts
  if (!socket) return;
  const socketClosed = (): boolean => socket.readyState === WebSocket.CLOSED;
  if (socketClosed()) return;
  if (socket.readyState === WebSocket.CONNECTING) socket.terminate();
  else socket.close();
  try {
    await waitForCondition(socketClosed, "owned websocket closes");
  } finally {
    if (!socketClosed()) socket.terminate();
  }
  ```
  This replaces the existing same logical sequence only. **Avoid** snapshotting readyState once, eliminating finally termination, changing wait/timeout or returning a type assertion/constant. Missing-socket short circuit remains; no reads for absent socket. Every original closed comparison has a fresh read at the same logical point. It does not alter getStatusSnapshot, ws declaration or production lifetime logic.
- Good checker: tsc complete graph/exit. Bad: original comparison helper continuing to exit0 with 7 errors, root only changed-node diagnostics, new ts-ignore/ambient declare module ws.

## Backward-Compatibility Rejection Log (Mandatory)
Rejected: restoring retired production capability fields; old/new projection branch; untyped ws shim; allowlisted/grandfathered compiler errors; lowered strictness. Clean-cut current fixture/types plus explicit full scoped tsc check. No compatibility wrapper retained.

## Change / Refactor Sequence / Implementation Guidance
1. Read approved current package and confirm isolated workspace/base. Keep old completed Task closed.
2. Add exact development declaration via pnpm, inspect narrow importer/lock diff and frozen install reproducibility; runtime deps/source untouched.
3. Construct AgentDefinition with identical semantic fields, remove retired fixture key/access, rely on ws callback contextual types (or existing explicit types if required). Do not alter case bodies/provider/gate/deadlines; SR-003 permits only the specified local teardown-state predicate form with identical semantic reads/actions.
4. Add standard scope config/command, document scope/prerequisites locally in target header, not global TESTING.md/CI. Compiler failures from real imported owners → report/escalate; no silent expansion.
5. Implementation checks: new scoped command is clean; compare effective flags/root graph to baseline, prove target membership and fail-on-error with a temporary typed negative control restored byte-for-byte; prove prompt equality from real composer/current constructor; static case/assertion/provider/teardown preservation; production typecheck. Extend the existing prepared source-reversal proof to normalize **only the exact authorized predicate rewrite**, so full normalized source still equals original. Never exempt closeHarness or cleanup assertions/stages from preservation. Implementation self-review must explicitly assess this delta; no prior review Pass substitutes.
6. Independent API/E2E performs exact target8+1, clean scoped/compiler and production checks plus proportionate relevant lifecycle/prompt/status coverage and owned cleanup. Proportional review follows normal selected routes; direct-route self-review must be evidenced if independent review not selected. No bypass of get_handoff_rules and no fake risk escalation to force architecture review.
7. Delivery integrates latest target, reruns affected checks, obtains explicit user verification and merges/pushes/cleans through normal gates. No release requested. Record new Task histories separately.

## Key Tradeoffs / Risks
Named single-entry config adds bounded discoverability without expanding CI/global policy. Compiler uses normal imported graph, which can include substantial production types; this isn't whole-test certification. Development types are already locked, so no runtime/model/version change necessary. Prompt constructor defaults carry extra fields but renderer ignores them; prove actual string equality. Source fixture capability metadata is obsolete; no interrupt assertions changed. Mutable close-state predicate keeps live post-await observation; no new concurrency policy/timing owner. The virtual compiler probe is feasibility only; implementation must rerun actual named zero-diagnostic command before its negative control and final check. New exposed production/shared defect, lockfile runtime churn, fixture semantic change or compile-policy weakening → return to Solution Designer and reclassify/reapprove before continuing.

## Task Size And Architectural Risk (Mandatory)
- **task_size: Small** — narrow local fixture/type/check changes in four files (one config addition, dev metadata/lock, target fixture); existing owners/interfaces remain. SR-003 adds no source path, only local helper expression within the already affected test. Artifact volume isn't architecture size.
- **architectural_risk: Low** — no material production contracts, security, persistence, concurrency, deployment or ownership changes; exact baseline causes identified, existing locked types/constructor/config suffice. Runtime source/versions unchanged.
- Payload surfaces: local fixture semantic fields retained. Structural delta: optional compiler entry/config and dev declaration linkage only, not product structure/global policy.
- Escalation: any production type/runtime owner change, broader test/CI graph/policy, suppression/changed acceptance, materially new uncertainty or runtime dependency/version delta. Stop/report before widening Low-risk route.

## SR-003 Implementation Return / Review Basis
- Requirements/AC/scenario approval unchanged; current technical Ready basis is SR-003, replacing SR-002 only where mutable state observation is specified. Current incomplete IR-001 and IMPL-F001 remain historical/current failure evidence, not overwritten by Solution Designer.
- Initial independent architecture/source review N/A for Small/Low. Fresh direct-route proportional self-review/independent executable validation/Delivery gates still required against SR-003.
- Root cause local typing mismatch. Design decision for IMPL-F001 resolved; actual source correction and executable closure pending Implementation Engineer. No claim of runtime/compiler final pass or merge.
