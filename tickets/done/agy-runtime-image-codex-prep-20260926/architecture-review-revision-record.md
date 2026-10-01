# Architecture Review Revision Record

The latest `design-review-report.md` is authoritative; this file records review history.

## Revision Index

| Revision ID | Review Round / Trigger | Related Solution Revision IDs | Prior Decision | Current Decision | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| ARCH-REV-001 | Round 1 / Architecture Design Complete | SR-005, SR-006, SR-007 | N/A | Fail — Design Impact | F-001 |
| ARCH-REV-002 | Round 2 / Revised Architecture Design Complete | SR-008, SR-009, SR-010, SR-011 | Fail — Design Impact | Fail — Design Impact | F-001 resolved; F-002 new |
| ARCH-REV-003 | Round 3 / Revised Architecture Design Complete | SR-012 | Fail — Design Impact | Pass | F-002 resolved |
| ARCH-REV-004 | Round 4 / Approved skill-policy change | SR-013, SR-014, SR-015 | Pass (SR-012 only) | Pass (SR-015) | None; F-001/F-002 remain resolved |
| ARCH-REV-005 | Round 5 / Approved exact eight and transcript-media recovery | SR-016, SR-017, SR-018 | Pass (SR-015 only) | Fail — Design Impact | F-003 new; F-001/F-002 remain resolved |
| ARCH-REV-006 | Round 6 / F-003 turn-release correction | SR-019 | Fail — Design Impact | Pass | F-003 resolved; F-001/F-002 remain resolved |
| ARCH-REV-007 | Round 7 / Approved AGY-owned image scope | SR-020, SR-021, SR-022 | Pass (SR-019 only) | Fail — Design Impact | F-004 new; F-003 obsolete; F-001/F-002 resolved |
| ARCH-REV-008 | Round 8 / F-004 terminal-result correction | SR-023 | Fail — Design Impact | Pass | F-004 resolved; F-001/F-002 resolved; F-003 obsolete |

## Revision Entries

### ARCH-REV-001 — Native image failure presentation boundary

- Canonical design review report: `/Users/normy/autobyteus-org/autobyteus-task-worktrees/agy-runtime-capabilities-20260926/tickets/agy-runtime-image-codex-prep-20260926/design-review-report.md`
- Review round and trigger: Round 1, `SR-007` Architecture Design Complete handoff.
- Triggering role, report path, and finding IDs: `/solution_designer`, `solution-result.md`, initial review (no prior findings).
- Relevant solution revision IDs: `SR-005`, `SR-006`, `SR-007`.
- Prior authoritative decision: N/A.
- Current authoritative decision: Fail — Design Impact.
- What changed in the review result or what baseline was established: Initial independent technical review confirms the approved native-AGY and Codex behavior basis and overall ownership, but finds that native-image provider error text currently reaches the user-visible tool lifecycle without a specified safe mapping, contrary to AC-002/QR-001.

#### Prior Finding Resolution

None.

- New or remaining finding IDs: F-001.
- Material classification changes: None; `task_size=Medium`, `architectural_risk=High` remain appropriate.
- Recommended recipient: `/solution_designer`.
- Remaining risks or uncertainty: Complete native tool profile and actual image output schema remain implementation-validation gates; Codex root cause requires first-turn confirmation.

### ARCH-REV-002 — Verified native-image correction; missing-skill cause gap

- Canonical design review report: `/Users/normy/autobyteus-org/autobyteus-task-worktrees/agy-runtime-capabilities-20260926/tickets/agy-runtime-image-codex-prep-20260926/design-review-report.md`
- Review round and trigger: Round 2, `SR-011` revised design following F-001 and approved SR-009/SR-010 behavior change.
- Triggering role, report path, and finding IDs: `/solution_designer`, `solution-result.md`; prior F-001.
- Relevant solution revision IDs: `SR-008`, `SR-009`, `SR-010`, `SR-011` (native-tool approval `SR-005` remains applicable).
- Prior authoritative decision: Fail — Design Impact (F-001).
- Current authoritative decision: Fail — Design Impact (F-002).
- What changed in the review result or what baseline was established: SR-008/SR-011 now own a static safe public native-image failure/denial mapping, scrub raw start/terminal fields and isolate optional raw diagnostics; F-001 is resolved. The newly approved missing-skill design assumes every `unresolved` binding means absence, but current resolver also emits it for present invalid contextual skill sources.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| F-001 | Open blocker in ARCH-REV-001 | Resolved in target design | SR-008, SR-011 | `design-spec.md` DS-003, ownership/dependency/interface/file maps, fixed denial/failure examples and validation step 2 prohibit raw `tool_info.error`/output/arguments in canonical public events, route bounded evidence only to private run memory, and cover public/history/Files checks. |

- New or remaining finding IDs: F-002.
- Material classification changes: None; `task_size=Medium`, `architectural_risk=High` remain justified.
- Recommended recipient: `/solution_designer`.
- Remaining risks or uncertainty: Native tool profile/image output remain release-validation gates; original Codex raw exception not captured.


### ARCH-REV-003 — Cause-certified absence boundary passes

- Canonical design review report: `/Users/normy/autobyteus-org/autobyteus-task-worktrees/agy-runtime-capabilities-20260926/tickets/agy-runtime-image-codex-prep-20260926/design-review-report.md`
- Review round and trigger: Round 3, `SR-012` revised design following ARCH-REV-002/F-002.
- Triggering role, report path, and finding IDs: `/solution_designer`, `solution-result.md`; prior F-002.
- Relevant solution revision IDs: `SR-012`; approved `SR-005` and `SR-009`/`SR-010` behavior bases remain applicable.
- Prior authoritative decision: Fail — Design Impact (F-002).
- Current authoritative decision: Pass.
- What changed in the review result or what baseline was established: The SkillService/configured resolver now owns an AGY-facing detailed result (`resolved`, `certified_absent`, `invalid_candidate`). Only no-candidate absence can warn/skip; present invalid and post-resolution source changes fail. Codex/Claude's existing resolver projection is preserved. SR-008 native-image public/private failure correction remains intact.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| F-002 | Open blocker in ARCH-REV-002 | Resolved in target design | SR-012 | `design-spec.md` DS-004, dependency/interface/data-model and file maps assign absence certification to SkillService/resolver, forbid AGY inference from legacy `unresolved`, classify present malformed/no-manifest/name-mismatch candidates and resolved-source changes as failures, and require source-root/first-turn/manifest/non-regression tests. |

- New or remaining finding IDs: None; F-001 remains resolved from ARCH-REV-002.
- Material classification changes: None; `task_size=Medium`, `architectural_risk=High` remain justified.
- Recommended recipient: `/implementation_engineer` primary, then `/solution_designer` informational.
- Remaining risks or uncertainty: Exact AGY native profile, actual app-backed native-image output and Codex first turn remain implementation/API-E2E validation gates, not claimed facts. User-deferred live symlink updates are out of scope.


### ARCH-REV-004 — Approved semantic-invalid skill skip design passes

- Canonical design review report: `/Users/normy/autobyteus-org/autobyteus-task-worktrees/agy-runtime-capabilities-20260926/tickets/agy-runtime-image-codex-prep-20260926/design-review-report.md`
- Review round and trigger: Round 4, `SR-015` revised architecture following SR-013/E-034 approval and CRR-001 block on older IR-001 skill code.
- Triggering role, report path, and finding IDs: `/solution_designer`, `solution-result.md`; no prior open architecture finding. CRR-001 had no promoted source finding.
- Relevant solution revision IDs: `SR-013`, `SR-014`, `SR-015`; unchanged `SR-005` native-tool and `SR-009/SR-010` missing-skill basis still apply.
- Prior authoritative decision: Pass on SR-012 only (ARCH-REV-003).
- Current authoritative decision: Pass on SR-015 revised design; not code/API-E2E signoff.
- What changed in the review result or what baseline was established: The user-approved invalid-content outcome supersedes SR-012's hard failure. The detailed AGY resolver now owns semantic-invalid/missing versus unsafe provenance classification; materializer warns/omits the two skippable causes, snapshots only trusted resolved sources, and retains safety/source-change/unrelated failures. Native AGY image/tool boundaries are unchanged and remain coherent.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| F-001 | Resolved in ARCH-REV-002/003 | Remains resolved | SR-008, SR-015 | `design-spec.md` DS-003 and provider-public/private failure boundary retain fixed public text, scrubbed image arguments/output, private-only raw diagnostics and no failed artifact. |
| F-002 | Resolved in ARCH-REV-003 | Remains resolved under changed disposition | SR-012, SR-015 | `design-spec.md` DS-004 and SkillService/resolver interface still classify absence and present-invalid separately; SR-013 changes invalid's disposition to approved warn/omit while leaving provenance/collision/source-change coded failures outside the semantic-invalid catch. |

- New or remaining finding IDs: None.
- Material classification changes: None; `task_size=Medium`, `architectural_risk=High` remain justified.
- Recommended recipient: `/implementation_engineer` primary, then `/solution_designer` informational.
- Remaining risks or uncertainty: IR-001 skill code follows old policy; CRR-001 was blocked, not signoff. Actual AGY native image/output/profile and Codex first turn remain executable validation gates. User-deferred live symlinks remain out of scope.


### ARCH-REV-005 — Result-bound image reconciliation needs one turn-release rule

- Canonical design review report: `/Users/normy/autobyteus-org/autobyteus-task-worktrees/agy-runtime-capabilities-20260926/tickets/agy-runtime-image-codex-prep-20260926/design-review-report.md`
- Review round and trigger: Round 5, SR-018 exact-eight and transcript-media architecture following API-REV-001/CRR-004 F-API-001/F-API-002.
- Triggering role, report path, and finding IDs: `/solution_designer`, `solution-result.md`; API-REV-001/CRR-004 returned F-API-001/F-API-002 Design Impact. No open prior architecture finding.
- Relevant solution revision IDs: SR-016, SR-017, SR-018; E-048 approves exact eight. SR-013 skill approval remains applicable.
- Prior authoritative decision: ARCH-REV-004 Pass on superseded SR-015 design only.
- Current authoritative decision: Fail — Design Impact F-003.
- What changed in the review result or what baseline was established: Exact eight-name custom-agent policy addresses the 49-name failure, and strict same-conversation/turn/step structured transcript media with run-owned verified image copy addresses missing DONE output at design level. However, item 6 allows next-turn eligibility before queued image reconciliation/publication, conflicting with items 1–5 and current backend input gating. The supported two-turn user path MP-002 makes this consequential.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| F-001 | Resolved in ARCH-REV-002/004 | Remains resolved in target design | SR-008, SR-018 | `design-spec.md` DS-003 and safe public/private image failure section retain fixed public text, empty native-image arguments, restricted private diagnostics and no failed `FILE_CHANGE`. |
| F-002 | Resolved in ARCH-REV-003/004 | Remains resolved in target design | SR-012, SR-015, SR-018 | `design-spec.md` DS-004 retains detailed absent/semantic-invalid outcomes and distinct blocking unsafe provenance/collision/source mutation under approved SR-013 policy. |

- New or remaining finding IDs: F-003. F-API-001/F-API-002 are downstream failure-origin IDs, not newly assigned architecture IDs; their design corrections remain subject to implementation/API-E2E.
- Material classification changes: None; Medium/High remains justified.
- Recommended recipient: `/solution_designer`; no implementation handoff on Fail.
- Remaining risks or uncertainty: Version-pinned transcript layout may drift; full app native image/Files, Team/Org MCP and native collaboration exclusion, public redaction and Codex skill first turn still require executable validation.


### ARCH-REV-006 — Serial result finalization and next-turn release pass

- Canonical design review report: `/Users/normy/autobyteus-org/autobyteus-task-worktrees/agy-runtime-capabilities-20260926/tickets/agy-runtime-image-codex-prep-20260926/design-review-report.md`
- Review round and trigger: Round 6, SR-019 revised architecture correcting ARCH-REV-005/F-003.
- Triggering role, report path, and finding IDs: `/solution_designer`, `solution-result.md`; prior F-003. API-REV-001/CRR-004 F-API-001/F-API-002 remain historical downstream failure origin.
- Relevant solution revision IDs: SR-019; unchanged SR-018/E-048 exact-eight approval and SR-013/E-034 skill approval.
- Prior authoritative decision: Fail — Design Impact F-003 on SR-018.
- Current authoritative decision: Pass on SR-019 design; not implementation/API-E2E sign-off.
- What changed in the review result or what baseline was established: SR-019 keeps the AGY input gate/turnId occupied through transcript reconciliation and awaited terminal source-event delivery; a private finalizing state retains public running phase, while synchronous provider-result receipt is only for close classification. Mid-finalization follow-up is explicitly rejected/acknowledged and retry is accepted only after terminal delivery and a healthy process. Delayed-listener, close, interrupt and publication-failure tests are required. The exact-eight policy, verified run-owned image copy and approved skill behavior remain coherent.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| F-003 | Open Design Impact in ARCH-REV-005 | Resolved in target design | SR-019, E-051 | `design-spec.md` DS-002/003 turn sequencing items 3/6, turn-release example, backend ownership/file responsibility and validation gate 2 explicitly hold `turnId` through listener delivery, reject follow-up during finalizing and separate `providerResultSeen` from readiness. |
| F-001 | Resolved in ARCH-REV-002/005 | Remains resolved | SR-008, SR-019 | `design-spec.md` safe public/private native-image failure mapping retains fixed public failure, restricted diagnostics and no failed artifact. |
| F-002 | Resolved in ARCH-REV-003/005 | Remains resolved | SR-012, SR-015, SR-019 | `design-spec.md` DS-004 retains approved semantic-invalid warning/omission and distinct unsafe provenance/collision/source-mutation hard failures. |

- New or remaining finding IDs: None. F-API-001/F-API-002 design recovery remains subject to implementation/API-E2E proof.
- Material classification changes: None; task size Medium and architectural risk High remain justified.
- Recommended recipient: `/implementation_engineer` primary, then `/solution_designer` informational.
- Remaining risks or uncertainty: Provider transcript shape is observed only for validated CLI 1.2.11; live native image/Files/redaction, Team/Org MCP/native-collaboration exclusion and Codex skill behavior need downstream validation.


### ARCH-REV-007 — AGY-owned image scope needs terminal-result redaction

- Canonical design review report: `/Users/normy/autobyteus-org/autobyteus-task-worktrees/agy-runtime-capabilities-20260926/tickets/agy-runtime-image-codex-prep-20260926/design-review-report.md`
- Review round and trigger: Round 7, SR-022 architecture after explicit SR-021/DEC-006/E-055 requirement reduction and IR-004 partial implementation finding.
- Triggering role, report path, and finding IDs: `/solution_designer`, `solution-result.md`; IR-004/E-052/053 contradict the superseded special finalization target. Prior F-003 and historical API-REV-001/CRR-004 F-API-001/F-API-002 reviewed for applicability.
- Relevant solution revision IDs: SR-020, SR-021, SR-022; E-048 exact-eight and E-034 skill approvals remain current.
- Prior authoritative decision: ARCH-REV-006 Pass on superseded SR-019 image-copy design only.
- Current authoritative decision: Fail — Design Impact F-004 on SR-022 design.
- What changed in the review result or what baseline was established: E-055 removes AutoByteus image path/bytes/Files/preview obligations. SR-022 requires genuine AGY-native `generate_image` status and ordinary reply, maps pathless DONE to safe canonical success, retains safe ERROR/denial, and deletes transcript reader/copy, deferred text and special backend finalization/admission/publication machinery. Exact eight native grants, separate scoped MCP/native collaboration exclusion and SR-013 skill policy remain coherent. However, SR-022 preserves ordinary provider-result handling while current converter forwards raw `result.error` and may publish failed-result `response` to public events when no image tool ERROR occurred. This violates QR-001/AC-002/AC-004 despite safe tool-step error mapping.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| F-001 | Resolved in ARCH-REV-002/006 | Remains resolved under new scope | SR-008, SR-022 | `design-spec.md` native lifecycle spine keeps empty public image args/output, fixed safe native error/denial and restricted private diagnostics; no false artifact. |
| F-002 | Resolved in ARCH-REV-003/006 | Remains resolved | SR-012, SR-015, SR-022 | `design-spec.md` Codex skill spine retains absence/semantic-invalid warning/omission with unsafe provenance/collision/source mutation hard failures. |
| F-003 | Resolved in ARCH-REV-006 for SR-019 | Obsolete under approved DEC-006 target | SR-021/E-055, SR-022 | `design-spec.md` removes transcript-media reconciliation/copy and image-specific `finalizing`/shared acknowledgment target; the prior pending-reconciliation overlap is not reachable on the new path. Existing ordinary `AgentRun` FIFO is preserved. |
| F-004 | N/A — new in this round | Open Design Impact | SR-022, E-036, QR-001/AC-002/004 | `design-spec.md` retains ordinary terminal-result handling while current `agy-stream-event-converter.ts` lines 157–162 and 183–186 publish raw failure response/error when no image tool ERROR set the safe branch; MP-003 documents supported terminal-error path. |

- New or remaining finding IDs: F-004. F-API-001 exact-profile recovery still needs real app validation; F-API-002's app path requirement is superseded by E-055.
- Material classification changes: None; Medium/High remains justified by provider-grant/MCP/security and skill-source boundaries.
- Recommended recipient: `/solution_designer`; no implementation handoff on Fail.
- Remaining risks or uncertainty: Full app native provenance/tool card/assistant reply, Team/Org MCP/exclusions and Codex skill first turn/edge cases remain executable gates. IR-004 partial source must be cleaned up and freshly reviewed. Terminal-result redaction needs a narrow design correction.


### ARCH-REV-008 — Safe terminal-result boundary passes

- Canonical design review report: `/Users/normy/autobyteus-org/autobyteus-task-worktrees/agy-runtime-capabilities-20260926/tickets/agy-runtime-image-codex-prep-20260926/design-review-report.md`
- Review round and trigger: Round 8, SR-023 corrected architecture after ARCH-REV-007/F-004.
- Triggering role, report path, and finding IDs: `/solution_designer`, `solution-result.md`; F-004. E-056 documents the existing converter result/error source path.
- Relevant solution revision IDs: SR-023; SR-021/E-055 image-scope, SR-018/E-048 exact-eight and SR-013/E-034 skill approvals remain current.
- Prior authoritative decision: Fail — Design Impact F-004 on SR-022.
- Current authoritative decision: Pass on SR-023 design; not implementation/API-E2E signoff.
- What changed in the review result or what baseline was established: Only exact provider SUCCESS with no terminal error permits ordinary fallback response. Any failed/unknown/missing status or explicit terminal error yields fixed-safe `AGY_TURN_ERROR` with turn/terminal evidence, no raw error/failed response/status/usage or misleading completed-idle success. Bounded private diagnostic persists without public projection. Existing `AgentRun` recognizes the scoped terminal error for input/lifecycle; no transcript/copy/Files or special finalization machinery returns.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| F-004 | Open Design Impact in ARCH-REV-007 | Resolved in target design | SR-023, E-056 | `design-spec.md` terminal result failure subsection, converter/diagnostic file map and validation gate 1 require exact SUCCESS-only fallback, fixed terminal `ERROR` with `turn_id`/`error_scope=turn`/`error_effect=terminal`, no failed-result raw fields, and direct ERROR-without-tool-step test. `agent-run-error-evidence.ts`/`AgentRun` recognize this terminal shape. |
| F-001 | Resolved in ARCH-REV-002/007 | Remains resolved | SR-008, SR-023 | Native image step ERROR/denial still uses bounded safe public text and restricted diagnostics. |
| F-002 | Resolved in ARCH-REV-003/007 | Remains resolved | SR-012, SR-015, SR-023 | Detailed skill absence/semantic-invalid warning/omission remains distinct from unsafe provenance/collision/source mutation hard failures. |
| F-003 | Obsolete in ARCH-REV-007 under DEC-006 | Remains obsolete | SR-021/E-055, SR-023 | No transcript-media reconciliation/copy or image-specific finalizing/input acknowledgment stage in current approved target. |

- New or remaining finding IDs: None. F-API-001 still needs real app exact-profile validation; F-API-002's app-path obligation is superseded by E-055.
- Material classification changes: None; Medium/High remains justified by provider-grant/MCP/security and skill-source boundaries.
- Recommended recipient: `/implementation_engineer` primary, then `/solution_designer` informational.
- Remaining risks or uncertainty: Current IR-004 partial source still needs cleanup and fresh review; real native call/status, Team/Org MCP/native collaboration exclusion, terminal redaction and Codex skill first-turn/edge behavior require API/E2E.
