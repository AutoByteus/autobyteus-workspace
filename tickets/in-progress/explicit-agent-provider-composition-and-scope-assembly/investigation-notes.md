# Investigation Notes

## Investigation Status

- Bootstrap Status: Complete
- Current Status: `Complete — Design-ready`
- Investigation Goal: establish exact process/provider/session ownership, supported construction and failure spines, clean-cut transition, and proof surface.
- Scope Classification: `Large`
- Scope Classification Rationale: two execution roots, three provider families, MCP capability lifecycle, scope assembly, and tests change; public behavior does not.
- Scope Summary: explicit process provider composition plus Agent Tools MCP Host/Authority/Issuer/descriptor boundary and one private scope-kernel builder.
- Primary Questions Resolved: process versus execution-local dependencies; reachable default paths; exact trusted authority; issuance/unwind timing; lifecycle/multiplicity; transition inventory.

## Request Context

The user authorized continued design improvements, specifically required the Agent Tools MCP authority/descriptor boundary to remain within this ticket, and kept logical application-agent addressing as a separate second ticket. The passed concrete `ApplicationExecutionScope` remains the baseline, not a defect to reopen.

## Environment Discovery / Bootstrap Context

- Project Type: `Git`
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/explicit-agent-provider-composition-and-scope-assembly`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/explicit-agent-provider-composition-and-scope-assembly/tickets/in-progress/explicit-agent-provider-composition-and-scope-assembly`
- Current Branch: `codex/explicit-agent-provider-composition-and-scope-assembly`
- Current Worktree: same as task workspace root
- Bootstrap Base Branch: finalized `codex/application-execution-scope-boundary-hardening`
- Remote Refresh Result: `origin/personal` fetched at `306de420ca8830478529b40bd6dfda6694b742a9`; this task intentionally starts from the finalized scope commit not yet on Personal.
- Expected Base: `0811503a6c547698e7b77e1064d98890101acc1b`
- Expected Finalization Target: ticket branch; ordered integration only after the scope feature.
- Bootstrap Blockers: None.
- Notes For Downstream Agents: no source changes yet; logical addressing is excluded.

## Supplemental Task Artifact Inventory

| Artifact Path | Purpose And Scope | Evidence, Context, Or Decision Captured | Core Artifact(s) Supported | Related IDs | Status | Approval | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `provider-composition-and-agent-tools-authority-contract.md` | Normative boundary contract | Host/Authority/Issuer/resource, builder, kernel, lifecycle | requirements, design | REQ-001–REQ-007; AC-001–AC-011 | Current | User-approved scope | Architecture review |
| `provider-composition-transition-inventory.md` | Exact transition/proof map | Add/modify/rename/remove and coverage obligations | design | REQ-001–REQ-008; AC-001–AC-012 | Current | N/A | Architecture review |
| upstream `future-architecture-simplification-review.md` | Triggering assessment | source-backed smells, spines, sequencing | all | all | Read-only upstream | N/A | None |

## Source Log

| Date | Type | Exact Source / Command | Why Consulted | Relevant Findings | Follow-Up |
| --- | --- | --- | --- | --- | --- |
| 2026-08-26 | Doc | `.codex/skills/solution-designer/design-principles.md` | canonical design rules | requires spine-first ownership, no boundary bypass, proportionate reachability, clean-cut removal | Applied |
| 2026-08-26 | Doc | upstream `future-architecture-simplification-review.md`, CRR-006 and evidence log | triggering review | mixed-level dependency, duplicated provider policy, session authority/descriptor refinement | Incorporated |
| 2026-08-26 | Code | `src/application-platform/execution/application-execution-scope.ts` | inspect application root | direct provider construction; partial kernel, tuple, eight arguments, later non-null capture | Replace privately |
| 2026-08-26 | Code | `src/agent-execution/runtime/general-process-run-supervisor.ts` | inspect general root | duplicates providers, uses ambient workspace/defaults, owns separate process run family | Inject builder/authority |
| 2026-08-26 | Code | `src/agent-tools/mcp/agent-tools-mcp-runtime.ts` and session files | locate trust/lifecycle | process host and scoped capability authority are mixed | Split cleanly |
| 2026-08-26 | Code | Codex bootstrap/materializer files | trace issue/adaptation | issue happens before later skill/thread work; descriptor adapter exists | Narrow to issuer/config |
| 2026-08-26 | Code | Claude session/state/materializer files | trace lazy issue | first-query issuance is provider-session state; descriptor is cached | Preserve lazy retry |
| 2026-08-26 | Code | `agent-run-manager.ts`, activation registry, resource manager | trace failure cleanup | claim is allocated before backend; pre-attachment failure can miss immediate session revocation | Add narrow releaser |
| 2026-08-26 | Review | `design-review-report.md` and `architecture-review-revision-record.md`, ARCH-REV-001 | receive Design Impact | accepted ownership direction; AR-001 exact provider provenance, AR-002 kernel transaction, AR-003 transition closure required | Resolved in SR-002 |
| 2026-08-26 | Code | AutoByteus factory, Codex factory/bootstrap/thread owners, Claude factory/bootstrap/session owners, workspace/skill/process getter sources | close builder input | exact nineteen process leaves, six constructor mappings, and shared/fresh identity policy established | Normative contract sections 3–6 |
| 2026-08-26 | Code | scope build input plus publication/resource/session construction in `application-execution-scope.ts` | prove actual construction cycle | publication requires activation/resource graph; scoped capabilities require publication; typed construction-only authority assembly resolves it without generic deferred binding | Normative K0–K8 contract |
| 2026-08-26 | Command | exact `rg -l` audit for old Runtime/scope/manager symbols and direct Codex/Claude/Mixed/session constructions across `autobyteus-server-ts/src` and `tests` | close occurrences | twenty governed production old-symbol paths and eleven durable-test old-symbol paths; three SR-001 paths were corrected; Claude session and state-input consumers added | Exact transition inventory and allowlist guards |
| 2026-08-26 | Review | `design-review-report.md` and `architecture-review-revision-record.md`, ARCH-REV-002 | receive narrowed Design Impact | AR-001 and AR-002 resolved; AR-003 remained only because ten direct durable-test constructors were absent from the closed transition inventory | Resolve without production redesign in SR-003 |
| 2026-08-26 | Command | separate `rg -l` searches for `new AgentRunManager(`, `AgentRunManager.initializeProcessInstance(`, `new MixedTeamManager(`, and `new MixedAgentMemberHandle(` under `autobyteus-server-ts/tests` | close required releaser constructor surface | exact sets are seven Agent-manager, three Team-manager, and five member-handle test files; ten were absent from SR-002 Modify rows | Add exact fixture/behavior rows and derived occurrence guards |

## Relevant Existing Behavior And Production Paths

| Behavior ID | Kind | Current Supported Trigger / Contract | Current Production Path And Lifecycle | Current Outcome / Invariants | Evidence |
| --- | --- | --- | --- | --- | --- |
| BEH-001 | System | Studio or standalone server boot | host root -> `AgentToolsMcpRuntime` -> route deps + general manager; platform -> application session scope/manager | shared route/catalog with separate ledgers in practice | runtime and host roots |
| BEH-002 | System | general or application Agent create/restore | execution owner -> direct provider constructors -> manager -> backend | provider defaults selected partly by omitted positional args | scope/supervisor source |
| BEH-003 | Contract | Codex/Claude provider session needs Agent Tools | provider bootstrap/session state -> broad session manager -> descriptor -> materializer | authenticated descriptor and configured tool exposure | provider sources |
| BEH-004 | Operational | provider preparation fails after session issue | run claim -> backend/bootstrap -> issue -> later failure -> manager cleanup | claim cleanup exists; immediate pre-attachment session cleanup is incomplete | manager/bootstrap trace |
| BEH-005 | System | application platform builds/closes scope | partial locals -> tuple -> scope; close -> Team -> Agent -> sessions | correct outward scope, fragile private assembly | scope source/tests |
| BEH-006 | Contract | existing clients/stores/packages | unchanged public/persistence paths | current schemas and behavior are authoritative | passed upstream package |

## Product-Reachability Premises

| Premise | Classification | Independent Trigger / Contract | Forward Trace | Material Consequence |
| --- | --- | --- | --- | --- |
| Codex can issue then fail before activation attachment | `Reachable` | supported create/restore with workspace skill materialization and provider thread creation | run claim -> bootstrap -> issue -> later skill/thread operation -> throw -> failed preparation | live capability can remain until broader scope close |
| Claude first query can fail after issuance | `Reachable` | supported provider query | active run -> first query -> lazy issue -> SDK/query failure | session must remain for supported retry, then normal termination cleanup |
| application kernel construction can fail after authority begin/completion and before platform return | `Reachable` by startup contract | supported Studio/standalone startup constructs all required application owners and may fail before publishing the runtime | platform build -> K1 authority begin -> later required K2–K7 constructor throws -> builder/scope/outer abort | incomplete/full authority must be disposed once without double-close or leaked capability state |
| one mounted Studio app needs its own manager family | `Unclear` and out of scope | no independent lifecycle trigger found | current platform runtime owns one family across mounted apps | per-app registry would add prohibited routing machinery |

## Design Health Assessment Evidence

- Change posture: `Refactor`
- Candidate root cause: `Boundary Or Ownership Issue`, `Duplicated Policy Or Coordination`, `File Placement Or Responsibility Drift`
- Refactor posture: required now for the authorized improvement.

| Evidence | Observation | Implication | Follow-Up |
| --- | --- | --- | --- |
| Scope + supervisor | same provider construction policy twice | one explicit builder owner | Adopt |
| Runtime + scoped manager/scope | two lifecycle depths combined | split host from authority | Adopt |
| Provider bootstrap | broad manager passed below needed operation | issuer/descriptor boundary | Adopt |
| Scope construction | partial bag/tuple/non-null assertion | complete private kernel builder | Adopt |
| Passed outer capabilities | callers already use narrow scope contracts | preserve; do not expose kernel | Fixed constraint |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding | Design Implication |
| --- | --- | --- | --- |
| `application-execution-scope.ts` | scope public owner + private assembly | mixed construction and lifecycle | keep owner; extract kernel builder |
| `general-process-run-supervisor.ts` | general mutable owner + assembly | provider policy duplication | inject builder and own general authority |
| `agent-tools-mcp-runtime.ts` | process routes plus session-family creation | mixed lifecycle | rename/split to Host and authority factory |
| session scope + manager | ledger plus issuance façade | overlapping authority shapes | replace with one scoped authority and narrow ports |
| `agent-tool-mcp-session-service.ts` | low-level issue/revoke against registry/catalog | correct host-internal mechanism | keep internal; stop exporting it to execution |
| Codex bootstrap/materializer | provider preparation/adaptation | broad manager leak | issuer + provider config |
| Claude manager/state/materializer | provider session/lazy adaptation | broad manager leak | issuer + provider config |
| `agent-run-manager.ts` | run claim/preparation lifecycle | correct cleanup owner lacks exact releaser | inject releaser |
| `backends/mixed/members/mixed-agent-member-handle.ts` plus configured/task registries | defensive nested-member run cleanup | broad/optional manager and ambient fallback cross the boundary | propagate required run-session releaser only |
| `claude/session/claude-session-state-input.ts` and `claude-session.ts` | per-session provider state dependency | broad optional service continues below manager | carry exact issuer to lazy session state |

## Runtime / Probe Findings

No behavioral execution was necessary for design discovery. Static production-path tracing established the exact construction and failure order. Downstream must run focused and realistic tests; absence of installed dependencies in a fresh worktree is not behavioral evidence.

## External / Public Source Findings

None. This is repository-internal architecture and no current external contract is needed.

## Reproduction / Environment Setup

- Dedicated worktree created at the exact finalized scope commit.
- No production source edits or transient services.
- Read-only `rg`, `sed`, `find`, and Git commands only.

## Findings From Code / Docs / Data / Logs

1. `AgentToolsMcpRuntime` is a process host in one half and an execution-scope authority factory in the other; its name obscures that distinction.
2. The trusted issued-session ledger, readiness, blocking, run/owner revocation, and close form a real authority, not an empty facade.
3. Provider code needs issuance plus a descriptor, not the authority's administrative controls.
4. Provider construction has exactly nineteen process-selected leaves. Each host already needs one workspace manager, so it selects that identity once and passes it to the helper, general supervisor, and application platform; the helper owns selection of the other eighteen provider leaves. AutoByteus receives every option explicitly; Codex receives shared thread/cleanup owners plus a fresh bootstrapper; Claude receives a fresh session manager/bootstrapper/cleanup over shared process collaborators.
5. General and application executions share the same builder and canonical definition identities but create non-identical factory sets, issuers, Claude session managers, run managers, runs, and sessions.
6. The current publication/resource/session cycle justifies one typed authority assembly with one completion shape. A generic deferred container is unnecessary and forbidden.
7. K0–K8 has exactly one construction closeable: incomplete assembly abort, atomically replaced by full authority close. Plain graph objects do not start resources during construction; successful transfer moves the sole disposer to the scope.
8. The corrected transition inventory maps every current broad-symbol path, including the three corrected mixed-member files and omitted Claude session/state-input consumers, and makes any newly matching file fail closed.
9. Direct-constructor discovery is a distinct surface from old-symbol discovery: seven tests construct `AgentRunManager`, three construct `MixedTeamManager`, and five construct `MixedAgentMemberHandle`. Ten of those fifteen did not mention the old symbols and were therefore omitted from SR-002. SR-003 closes them with one narrow no-op/recording releaser fixture, an explicit preserved-behavior row for every site, and source-derived exact-set guards.

## Persisted Data Transition Evidence

- Current stored subject: no composition or MCP authority types are serialized.
- Code-model change: object graph and TypeScript contracts only.
- Normal readers/writers: unchanged.
- Required semantics preserved by direct use: `Yes` — no stored shape changes.
- Decision: `Not Affected`; migration has no benefit and would create risk.

## Constraints / Dependencies / Compatibility Facts

- Same Host route/catalog is shared; authorities are distinct.
- General and application managers remain distinct.
- Provider-specific adapter code remains below the provider-factory boundary.
- No aliases, dual paths, generic container, service locator, manager map, optional dependency dictionary, or mutable-owner union.
- Application agent addressing is a separate ticket.

## Open Unknowns / Risks

- No design unknown remains for AR-001–AR-003. Downstream must prove the exact process input/mapping, K0–K8 ownership cuts, old-symbol allowlists, and all fifteen direct-constructor fixture obligations rather than reinterpret them.
- Any newly discovered production/test occurrence, construction closeable, or proposed issuer broadening is Design Impact and requires re-review; it is not permission to add a generic escape hatch.

## Notes For Architecture Reviewer

Review SR-003 as the bounded ARCH-REV-002 closure. AR-001 remains closed by the exact nineteen-leaf provenance and six-object constructor/identity map; AR-002 remains closed by the construction-only authority assembly plus K0–K8 ownership/error contract. AR-003 now has the ten omitted Modify rows, an exact narrow no-op/recording fixture contract, and source-derived allowlists covering all seven direct Agent-manager, three direct Team-manager, and five direct member-handle tests. No production architecture, requirement, product behavior, migration, or logical-addressing scope changed.
