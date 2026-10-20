# Design Review Report — Agent Runtimes page (runtime-lifecycle-review)

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-lifecycle-design-review/tickets/in-progress/runtime-lifecycle-review/requirements-doc.md` (Approved, SR-010: SR-007 basis plus UD-007 and UD-008)
- Upstream Investigation Notes: `…/runtime-lifecycle-review/investigation-notes.md` (E-R01…E-R22, E-A01…E-A09)
- Upstream Solution Revision Record: `…/runtime-lifecycle-review/solution-revision-record.md` (SR-001…SR-010)
- Reviewed Design Spec: `…/runtime-lifecycle-review/design-spec.md` (SR-010, including "ARCH-REV-001 Resolution")
- Supplemental Task Artifacts Reviewed: Product `ui-ux-spec.md` (Approved, a74ecd4) at `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/runtime-lifecycle-review/ui-ux-spec.md`, together with the requirements' "UI note (SR-010)"; `follow-ups.md` (FU-001…FU-004)
- Relevant Solution Revision IDs: SR-009, SR-010 (approved requirements basis, unchanged), SR-011 (design delta: count Application agents)
- Architecture Review Revision Record: `…/runtime-lifecycle-review/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-003`
- Current Review Round: 3 (focused delta review of SR-011)
- Trigger: SR-011 from the Solution Designer. The implementation engineer found that Application agents run in the application platform's own `AgentRunManager` (E-A10), so the running-agent count would miss them (REQ-003/AC-004).
- Prior Review Round Reviewed: round 2 (ARCH-REV-002, Pass)
- Latest Authoritative Round: 3
- Current-State Evidence Basis: worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-lifecycle-design-review`, base `dc530fdcb0`. Round-1 evidence still holds for the unchanged parts. Rechecked this round:
  - `antigravity-cli-capability.ts` 128–141 (version cache) and `agy-agent-run-backend-factory.ts` 110 (its only other user).
  - The adapter's Codex/Claude rules (adapter 185–233) and its tests.
  - `create-application-orchestration-services.ts` 162, reached from both `build-studio-server.ts` and `start-standalone-application-host.ts`.
  - `registerGraphql` is called only from `build-studio-server.ts` 360.
  - `useEmbeddingSettings.ts` (`BUSY_POLL_MS = 2000`, `IDLE_POLL_MS = 10000`).

## SR-011 Delta Review (round 3)

Scope of this round: only the SR-011 delta. Every other verdict below carries over from round 2 unchanged.

- **Basis.** REQ-003, AC-004 and DEC-003 block Update while "that runtime has running agents". Application agents are agents the user runs, so counting them falls within approved behavior. No requirement changes.
- **Current state verified.**
  - `application-execution-scope-kernel-builder.ts` 108 and 131 build a separate `AgentRunActivationRegistry` and `AgentRunManager`. The kernel is built eagerly in `ApplicationExecutionScope.create` (`application-execution-scope.ts` 107).
  - `build-application-platform-runtime.ts` 100 creates one scope per platform runtime.
  - `hostManagement` (279–282) exposes only `catalogTransition` and `runOwnership`; the contract type is in `application-platform-runtime-contracts.ts` 67–70.
- **Ownership and boundary: Pass.** The count is a read on the existing owner of that manager (`ApplicationExecutionScope`). It goes out through the platform's public `hostManagement` contract, never the kernel directly. The studio composition sums it with the process manager's count. `agent-runtimes/` receives a single `countRunningAgents(kind)` port and imports neither manager, so the dependency direction is clean. The standalone host doesn't build the status service, so it needs no wiring. There is no double count: the two activation registries are separate.
- **Interface: Pass.** `activeAgentRuns.countByRuntimeKind(runtimeKind)` has one subject and an explicit identity.
- **AR-008 (Low, non-blocking, Design Impact — implementation note).** The design says the scope counts "`kernel.agentRunManager` active runs", but the `ApplicationExecutionScopeKernel` type (kernel builder 43–53, frozen object 187–208) doesn't expose `agentRunManager`. `application-execution-scope-kernel-builder.ts` must change too, and the file mapping doesn't list it. Required update: add a narrow reader to the kernel, for example `activeAgentRuns: Pick<AgentRunManager, "listActiveRuns" | "getActiveRun">` or a count function, rather than the whole manager. Count Application team members as well, and test that with a real Application team run. The Solution Designer can add the file to the mapping when the spec is next touched; implementation may proceed now.

## Routing Classification Review

- Task size: `Large`
- Architectural risk: `High`
- Classification rationale reviewed: the scope is smaller than in round 1 (resolvers and `Terminal.vue` are no longer touched). What remains still justifies Large/High: a new GraphQL contract, server-started vendor processes and vendor source fetches, and sign-in detection moving to a new owner that application launch readiness uses in both composition roots. About 25 files across server and web.
- Independent Architecture Review required by the classification: `Yes`
- Classification evidence or correction required: None.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed`
- Approved requirements / intended behavior understood: Yes. SR-010 keeps the SR-007 basis with two user-directed changes:
  - UD-007: runtime lookup stays as today, and Not installed rows add "After installing, restart AutoByteus.".
  - UD-008: no in-app Antigravity sign-in; only Codex and Grok get Sign in; Claude and Antigravity show the command-line hint.
  - The UI differences from the Product spec are recorded in "UI note (SR-010)".
  - DEC-008: a Codex custom provider shows "–" in Account. The Solution Designer decided this and informed the user. It is a narrow display choice for a state the approved copy doesn't cover; acceptable within the designer's authority, with the user informed.
- Relevant existing behavior and evidence confirmed: Yes.
- Scope guardrail confirmed: Yes. Out of Scope now explicitly includes "changing how AutoByteus finds runtime executables (UD-007)" and in-app sign-in for Claude and Antigravity.
- Approved change, preserved behavior, and outside scope understood: Yes.
- Every prospective blocking `Design Impact` finding is traceable: `Yes` (none remain)
- Remaining material ambiguity: None.

| Behavior ID | Kind | Design Alignment With Approved Intent | Approved Trigger / Contract And Current-State Evidence | Target Outcome / Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | Pass | Pass | Pass | Confirmed | — (resolvers unchanged, UD-007) |
| BEH-002 | User | Pass | Pass | Pass | Confirmed | — (fresh Antigravity version) |
| BEH-003 | User | Pass | Pass | Pass | Confirmed | — (post-update rule fixed) |
| BEH-004 | User | Pass | Pass | Pass | Confirmed | — (restart hint) |
| BEH-005 | User/Contract | Pass | Pass | Pass | Confirmed | — (Codex/Grok browser route; Claude/Antigravity hint; `SignInReading`) |
| BEH-006 | Operational | Pass | Pass | Pass | Confirmed | — |

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose And Scope Are Clear? | Linked To Relevant Core Artifacts? | Internally Complete? | Consistent With Related Core Artifacts? | Status And Approval Applicability Are Clear? | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| Product `ui-ux-spec.md` + VIS, with the requirements' "UI note (SR-010)" | Pass | Pass | Pass | Pass | Pass | — (VIS-010/011/012/021/023 explicitly no longer apply; the restart hint's style and zh-CN copy are given) |
| `follow-ups.md` | Pass | Pass | Pass | Pass | Pass | — |

Non-blocking document nits, to fix whenever these documents are next edited:
- requirements-doc "Exact approved requirements baseline" and "Readiness Check" still say SR-007.
- The Traceability row for REQ-008 still lists the removed SCN-004.

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | Feature; triggers listed | — |
| Root-cause classification is explicit and evidence-backed | Pass | Duplicated Codex/Claude detection (adapter 185–233) | — |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | Bounded: detection moves to `AgentRuntimeSignInReader`; FU-003/FU-004 deferred | — |
| Refactor decision is supported by the concrete design sections or residual-risk rationale | Pass | Reader, adapter mapping, composition, removal plan | — |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? | Narrative Is Clear? | Facade Vs Governing Owner Is Clear? | Main Domain Subject Naming Is Clear? | Ownership Is Clear? | Off-Spine Concerns Stay Off Main Line? | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 page read | Primary | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-002 update | Primary | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-003 Codex/Grok sign-in | Primary | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-005 process operation | Bounded local | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-006 polling return | Return/Event | Pass | Pass | N/A | Pass | Pass | Pass | Pass (2 s / 10 s as Embedding; "re-reads are started by the service, never by polling") |

DS-004 was removed together with its journey (UD-008).

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? | Internal Owned Mechanisms Stay Internal? | Caller Bypass Risk Is Controlled? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `AgentRuntimeStatusService` | Pass | Pass | Pass | Pass | Only the GraphQL resolver calls it |
| `AgentRuntimeSignInReader` | Pass | Pass | Pass | Pass | Service and adapter use it; the adapter no longer runs vendor commands. A stateless reader is a better boundary for the adapter than the round-1 stateful service. |
| `RuntimeProcessOperation`, strategies | Pass | Pass | Pass | Pass | Internal to `agent-runtimes/` |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? | Forbidden Shortcuts Are Explicit? | Direction Is Coherent With Ownership? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `agent-runtimes/` | Pass | Pass | Pass | Pass | Uses resolvers unchanged; execution doesn't depend on it |
| application-platform adapter → reader | Pass | Pass | Pass | Pass | The standalone host builds only the reader |
| Web | Pass | Pass | Pass | Pass | — |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? | Responsibility Is Singular? | Identity Shape Is Explicit? | Generic Boundary Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| Query `agentRuntimes` | Pass | Pass | Pass | Low | Pass |
| `checkAgentRuntimes` (clears finished results, skips running operations) | Pass | Pass | Pass | Low | Pass |
| `updateAgentRuntime(runtimeKind)` | Pass | Pass | Pass | Low | Pass |
| `start/cancelAgentRuntimeSignIn(runtimeKind)` (BROWSER only) | Pass | Pass | Pass | Low | Pass |
| `AgentRuntimeSignInReader.read(kind, {cwd})` → `SignInReading` | Pass | Pass | Pass | Low | Pass |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? | Reuse / Extension Decision Is Sound? | New Support Piece Is Justified? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Find each runtime | Pass | Pass | N/A | Pass | Resolvers unchanged (UD-007) |
| Antigravity version | Pass | Pass | N/A | Pass | Fresh `agy --version`. Leaving the execution cache alone is justified: it only gates a minimum-version feature, and staleness can only keep a newer feature off until restart. |
| Polling, Codex `account/read`, `listAntigravityModels`, `AgentRunManager`, Fastify `onClose` | Pass | Pass | N/A | Pass | — |
| New status service and sign-in reader | Pass | Pass | Pass | Pass | — |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? | Reuse / Extend / Create-New Decision Is Sound? | Supports The Right Spine Owners? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| server `runtime-management/agent-runtimes/` | Pass | Pass | Pass | Pass | — |
| server `application-platform/` (adapter, orchestration wiring) | Pass | Pass | Pass | Pass | — |
| server `api/graphql/types/agent-runtimes.ts`; `compositions/build-studio-server.ts` | Pass | Pass | Pass | Pass | GraphQL is registered only in the studio server (confirmed) |
| web Settings `agent-runtimes/` | Pass | Pass | Pass | Pass | — |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? | Shared File Choice Is Sound? | Ownership Of Shared Structure Is Clear? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Command runner, version, types | Pass | Pass | Pass | Pass | — |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Overlapping Representation Risk Is Controlled? | Shared Core Vs Specialized Variant / Composition Decision Is Sound? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `AgentRuntime` row | Pass | Pass | Pass | N/A | Pass | `NOT_APPLICABLE` covers both not-installed and DEC-008; both render "–" |
| `SignInReading` | Pass | Pass | Pass | Pass | Pass | Discriminated union; `detail` stays on the server |
| `operation` | Pass | Pass | Pass | N/A | Pass | Lifetime rules explicit (AR-006 resolved) |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? | Responsibility Matches The Intended Owner/Boundary? | Responsibilities Were Re-Tightened After Shared-Structure Extraction? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| All rows of the Final File Responsibility Mapping | Pass | Pass | Pass | Pass | Composition rows now cover both roots |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? | Folder Matches Owning Boundary? | Mixed-Layer Or Over-Split Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `agent-runtimes/` (+ `strategies/`) | Pass | Pass | Low | Pass | — |
| `components/settings/agent-runtimes/` | Pass | Pass | Low | Pass | — |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? | Replacement Owner / Structure Is Clear? | Removal / Decommission Scope Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Adapter detection bodies, local `runCommand`, `commandRunner` option and its test usage | Pass | Pass | Pass | Pass | Line references given |
| Dead code in touched files | Pass | N/A | Pass | Pass | Check recorded with evidence. The resolvers and `Terminal.vue` are no longer touched. |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? | Clean-Cut Removal Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- |
| Sign-in detection move | No | Pass | Pass | — |

## Persisted-Data Transition Verdict (When Applicable)

| Area / Stored Subject | Approved Decision | Representative Reader / Semantic / Invariant Evidence Is Sufficient? | Direct Use, Rebuild, Or Migration Choice Is Proportionate? | Migration Safety Is Complete If Required? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| All new state | Not Affected | Pass | Pass | N/A | Pass | In-memory only |

## Change / Refactor Safety Verdict

| Area | Sequence Is Realistic? | Temporary Seams Are Explicit? | Cleanup / Removal Is Explicit? | Verdict |
| --- | --- | --- | --- | --- |
| Steps 1–4 | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? | Example Is Present And Clear? | Bad / Avoided Shape Is Explained When Helpful? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Strategy shape, independent checks, update result, post-update re-check, `SignInReading` | Yes | Pass | Pass | Pass | — |

## Material Premise Validation

- MP-001 (cached Antigravity version): addressed. The strategy reads the version fresh, and the premise no longer applies to the page.
- MP-002 (Antigravity terminal completion): obsolete. The journey was removed by UD-008.
- No new premise.

## Unresolved Approved-Behavior Or Current-State Gaps

None.

## Review Decision

**Pass** (round 3: SR-011 delta accepted)

## Findings

None blocking. AR-001…AR-007 are resolved or obsolete (ARCH-REV-002). AR-008 (Low, non-blocking implementation note) is described in the SR-011 Delta Review section above.

## Classification

N/A (Pass).

## Recommended Recipient

`/software_engineering_team/implementation_engineer`

## Residual Risks

- **Codex rule drift (implementation note).** The design's Codex rule (`account != null` → signedIn; `requiresOpenaiAuth === false` → notRequired; otherwise signedOut) differs from today's adapter rule (`requiresOpenaiAuth !== true || account != null`) only when `requiresOpenaiAuth` is missing or not a boolean. To preserve application readiness exactly, map "no account and `requiresOpenaiAuth !== true`" to `notRequired`.
- **Claude rule drift (implementation note).** Today's Claude fallback treats non-JSON exit-0 output that says "logged in" as configured; the design maps it to unknown. To preserve today's rule, keep the fallback in the Claude reading.
- Undocumented vendor sources and GitHub's 60 requests/hour limit can show Check failed (R-02); each check fails on its own.
- `codex login` opening the browser from a piped process is not re-observed on the current version; the escalation trigger covers it. Grok's signed-in output is unverified.
- Own-node gating is UI-only, accepted per E-R10.

## Latest Authoritative Result

- Review Decision: **Pass**
- Material-Premise Gate: `Pass`
- Notes: ARCH-REV-003; SR-011 delta (basis SR-010). task_size Large, architectural_risk High. AR-008 is non-blocking.
