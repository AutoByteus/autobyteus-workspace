# Architecture Review Revision Record — runtime-lifecycle-review

## Revision Index

| Revision ID | Review Round / Trigger | Related Solution Revision IDs | Prior Decision | Current Decision | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| ARCH-REV-001 | Round 1 / Architecture Design Complete (SR-008) | SR-007, SR-008 | N/A | Fail | AR-001…AR-007 |
| ARCH-REV-002 | Round 2 / revised package (SR-010) | SR-009, SR-010 | Fail | Pass | AR-001…AR-007 (all resolved or obsolete) |
| ARCH-REV-003 | Round 3 / SR-011 delta (Application-agent count) | SR-011 | Pass | Pass | AR-008 (new, Low, non-blocking) |

## Revision Entries

### ARCH-REV-001 — Initial review of the Agent Runtimes design

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-lifecycle-design-review/tickets/in-progress/runtime-lifecycle-review/design-review-report.md`
- Review round and trigger: round 1; Architecture Design Complete from the Solution Designer (run `solution_designer_01a89da60c294d39aa5390913af8a6f0`), 2026-10-20
- Triggering role, report path, and finding IDs: Solution Designer, `analysis-result.md` / `design-spec.md` (SR-008); no prior findings
- Relevant solution revision IDs: SR-007 (approved requirements basis), SR-008 (design)
- Prior authoritative decision: N/A
- Current authoritative decision: Fail
- Baseline established: the classification (Large/High) is confirmed and the overall structure is sound. Two reachable correctness defects (AR-001 Antigravity sign-in completion, AR-002 cached Antigravity version), one Requirement Gap (AR-003 shared resolver change vs the preserved detection/execution boundary), and three medium specification gaps (AR-004 terminal reuse, AR-005 `readSignIn` contract/composition, AR-006 post-update state) block implementation. AR-007 is low-severity cleanup.

#### Prior Finding Resolution

None.

- New or remaining finding IDs: AR-001 (High, Design Impact), AR-002 (High, Design Impact), AR-003 (High, Requirement Gap — user approval), AR-004 (Medium, Design Impact), AR-005 (Medium, Design Impact), AR-006 (Medium, Design Impact), AR-007 (Low, Design Impact)
- Material classification changes: none (task_size Large, architectural_risk High confirmed)
- Recommended recipient: `/software_engineering_team/solution_designer`
- Remaining risks or uncertainty: undocumented vendor sources and the GitHub rate limit (R-02); leaving the page ends the Antigravity terminal session; `codex login` browser hand-off from a piped process not re-observed on the current version

### ARCH-REV-002 — Re-review of the revised design (SR-010)

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-lifecycle-design-review/tickets/in-progress/runtime-lifecycle-review/design-review-report.md`
- Review round and trigger: round 2; revised package from the Solution Designer (run `solution_designer_01a89da60c294d39aa5390913af8a6f0`) responding to ARCH-REV-001
- Triggering role, report path, and finding IDs: Solution Designer, `design-spec.md` "ARCH-REV-001 Resolution"; AR-001…AR-007
- Relevant solution revision IDs: SR-009 (design revision), SR-010 (user decisions UD-007/UD-008; requirements Approved)
- Prior authoritative decision: Fail (ARCH-REV-001)
- Current authoritative decision: Pass
- What changed in the review result: the user chose option (b) for AR-003 and removed in-app Antigravity sign-in. The design fixed AR-002, AR-005, AR-006 and AR-007. Basis Confirmed; no open findings; two implementation notes about preserving the adapter's exact Codex/Claude rules are recorded as residual risks.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-001 | Open (High) | Obsolete | SR-010, UD-008 | AC-008/SCN-004/DS-004 removed; Antigravity signInRoute COMMAND_LINE; `startAgentRuntimeSignIn` is BROWSER-only |
| AR-002 | Open (High) | Resolved | SR-009/010 | Antigravity strategy runs `agy --version` fresh through the runner (file mapping, Reuse table). The execution cache is left alone with its reason; `agy-agent-run-backend-factory.ts` 110 is its only other user (confirmed). |
| AR-003 | Open (Requirement Gap) | Resolved | SR-010, UD-007 | User chose option (b); REQ-004/AC-005 restart hint; Out of Scope updated; resolvers listed under "Deliberately left alone"; escalation trigger covers any resolver need |
| AR-004 | Open (Medium) | Obsolete | SR-010, UD-008 | `Terminal.vue` not touched; UI note says VIS-010/011/012/021/023 no longer apply |
| AR-005 | Open (Medium) | Resolved | SR-009/010 | `SignInReading` union and per-runtime rules; adapter and page mappings; DEC-008; page cwd `os.homedir()`; reader built in `create-application-orchestration-services.ts` (both roots, confirmed at line 162) and for the studio service; GraphQL is studio-only (confirmed `build-studio-server.ts` 360) |
| AR-006 | Open (Medium) | Resolved | SR-009/010 | Bounded Local rules: the automatic re-check keeps `updated`; a user-started check clears finished results and skips running operations; mutation table updated |
| AR-007 | Open (Low) | Resolved | SR-009/010 | Cadence 2 s / 10 s matches `useEmbeddingSettings.ts`; dead-code check recorded; `commandRunner` option and test lines listed; supplement inventory updated (investigation notes 98–105) |

- New or remaining finding IDs: None.
- Material classification changes: none (Large/High confirmed).
- Recommended recipient: `/software_engineering_team/implementation_engineer`
- Remaining risks or uncertainty: keep today's adapter rules exactly (Codex `requiresOpenaiAuth !== true`; Claude non-JSON "logged in" fallback); R-02 vendor sources; `codex login` piped browser hand-off; Grok signed-in output; requirements-doc nits (baseline/readiness lines still say SR-007; REQ-008 traceability lists SCN-004).

### ARCH-REV-003 — Focused review of the SR-011 delta (Application agents in the running-agent count)

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-lifecycle-design-review/tickets/in-progress/runtime-lifecycle-review/design-review-report.md` (section "SR-011 Delta Review")
- Review round and trigger: round 3. The implementation engineer found that Application agents live in the application platform's own `AgentRunManager` (E-A10); SR-011 from the Solution Designer (run `solution_designer_01a89da60c294d39aa5390913af8a6f0`).
- Relevant solution revision IDs: SR-011 (basis SR-010 unchanged)
- Prior authoritative decision: Pass (ARCH-REV-002)
- Current authoritative decision: Pass
- What changed: SR-011 adds `ApplicationExecutionScope.countActiveAgentRuns`, exposed as `hostManagement.activeAgentRuns.countByRuntimeKind`. The studio composition sums it with the process manager's count into a `countRunningAgents(kind)` port; `agent-runtimes/` depends only on that port. This falls within REQ-003/AC-004/DEC-003; no behavior change. Verified against the kernel builder (108/131, 43–53, 187–208), `application-execution-scope.ts` 107, `build-application-platform-runtime.ts` 100/279–282 and the contracts at 67–70.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-001…AR-007 | Resolved/Obsolete (ARCH-REV-002) | Unchanged | SR-011 | The delta touches none of them |

- New or remaining finding IDs: AR-008 (Low, non-blocking). The kernel type doesn't expose `agentRunManager`, so `application-execution-scope-kernel-builder.ts` must add a narrow active-run reader. The file isn't in the file mapping. Application team members must be counted too, and tested with a real Application team run.
- Material classification changes: none (Large/High).
- Recommended recipient: `/software_engineering_team/implementation_engineer`
- Remaining risks or uncertainty: as in ARCH-REV-002.
