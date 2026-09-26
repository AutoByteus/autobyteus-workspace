# Solution Revision Record

## Revision Index

| Revision ID | Phase | Trigger | Finding IDs | Prior Status | Current Status | Affected IDs | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SR-001 | Requirements | User start request 2026-09-24 (follow-up of claude-sdk-background-task-lifecycle) | N/A | N/A | Ready for Approval | BEH-001..008, REQ-001..010, AC-001..011, DEC-001..006 | Baseline with live streaming probes E/F |
| SR-002 | Evidence | User: rebase onto newest origin/personal; Activity/To-Do findings; SDK Q&A | N/A | Ready for Approval | Ready for Approval | none (evidence only) | Worktree fast-forwarded to 6f7b5e371 (v1.4.81); Claude backend unchanged by the 44 commits |
| SR-003 | Requirements | User decision on DEC-002: no idle timer, process lives with the run (like Codex) | N/A | Ready for Approval | Ready for Approval | BEH-004, UC-004, REQ-006, AC-006, AC-007, SCN-005, QR-001, ASM-001, DEC-002 | Idle close removed from scope |
| SR-004 | Requirements | User decision on DEC-001: notice via existing SYSTEM_TASK_NOTIFICATION | N/A | Ready for Approval | Ready for Approval | REQ-003, DEC-001 | Notice mechanism fixed to the existing event |
| SR-005 | Requirements | User accepted DEC-003, DEC-005, DEC-006 (and reconfirmed DEC-001); asked about DEC-004 | N/A | Ready for Approval | Ready for Approval | DEC-003, DEC-005, DEC-006 | Only DEC-004 open |
| SR-006 | Mixed | User decision DEC-004 (include inline images) after image probes G/H/I | N/A | Ready for Approval | Approved | BEH-005, UC-005, REQ-011, AC-012, AC-013, SCN-007, DEC-004 | All decisions made; requirements Approved; next: architecture design |
| SR-007 | Design | Architecture investigation (probes J, K, L, M, N, O) and design-spec | N/A | Approved; no design | Approved; Design Ready | none (requirements unchanged) | Architecture Design Complete: Large / High → architecture review |
| SR-008 | Design | Architecture review ARCH-REV-001 (Fail, Design Impact): ARCH-F-001..006 | ARCH-F-001, 002, 003, 004, 005, 006 | Design Ready (round 1) | Design Ready (round 2) | none (requirements unchanged) | Design revised with probes P (both CLIs), P-prewait, Q; re-routed to architecture review |
| SR-009 | Design | Architecture review ARCH-REV-002 (Fail, Design Impact): ARCH-F-007, 008 | ARCH-F-007, ARCH-F-008 | Design Ready (round 2) | Design Ready (round 3) | none (requirements unchanged) | Consumption rule excludes abort frames; unsent-input Stop path defined; re-routed |
| SR-010 | Requirements | Implementation Design Impact IMP-DI-001 (IR-001): shared AgentRun claim rule blocks append | IMP-DI-001 | Approved; Design Ready (reviewed) | Ready for Approval (DEC-007); design Needs Revision | REQ-004, AC-003, AC-004; proposed REQ-012/AC-014 | Requirement Gap: shared/Codex scope decision needed from the user |
| SR-011 | Mixed | User decision DEC-007 = A (2026-09-26); design section for the shared claim rule | IMP-DI-001 | Ready for Approval; design Needs Revision | Approved; Design Ready (round 4) | REQ-012, BEH-009, AC-014..016, SCN-008, DEC-007 | Shared AgentRun append claim designed; re-routed to architecture review |
| SR-012 | Design | Code review failure-origin CRR-003 (CR-002) from API-REV-001 API-F-001 / RSK-007; API/E2E OBS-2 | CR-002, API-F-001, OBS-2 | Approved; Design Ready (ARCH-REV-004 Pass) | Approved; Design Ready (round 5) | none (restores REQ-010) | Series-restart usage rule designed; OBS-2 = warn + doc; re-routed to architecture review |

## Revision Entries

### SR-001 — Requirements baseline for the streaming-input migration

- Phase and classification: Requirements / Initial Baseline
- Trigger: "since its released. now we could work on the second ticket right? if you think that is more reasonable"; predecessor approval of the follow-up ticket
- Prior status: N/A
- Current status: requirements `Ready for Approval`; design not started
- IDs: BEH-001..008, SCN-001..006, REQ-001..010, AC-001..011, DEC-001..006
- Supplements: `probe-evidence/probeE.*`, `probeF.*` (evidence)
- Intended behavior changed: N/A (baseline)
- Approval impact: awaiting the user's decisions and approval
- Task size/risk: N/A before design (expected Large / High)
- Handoff: none (user conversation)
- Next action: user decides DEC-001..006 and approves

### SR-002 — Base refresh and evidence additions

- Phase and classification: Evidence / Refinement
- Trigger: user 2026-09-25, "make your work tree based on the newest Origin Personal"; earlier questions about the Activity To-Do area and background-task kinds
- Changes: worktree fast-forwarded from `40b1783f4` to `origin/personal` @ `6f7b5e371` (v1.4.81, 44 commits, no local commits to replay). `git diff` over the Claude backend, Claude runtime client and AgentRun input scope shows only a `package.json` build-script change. `CLAUDE_CLI_RUNTIME_POLICY_ENV` and `activeTurnAppend: "unsupported"` are unchanged. Investigation notes gained the "Activity-Area / To-Do Findings" section
- Intended behavior changed: No
- Approval impact: none (still awaiting approval)
- Next action: user decision to proceed and approve

### SR-003 — Process lifetime equals run lifetime (no idle timer)

- Phase and classification: Requirements / Refinement (user decision)
- Trigger: user 2026-09-25: "the process should leave as long as the run … no idle timer … we have a terminate … similar to codex runtime … more understandable codes instead of hiding weird code like idle for 5 minutes then kill the process"
- Evidence: Codex keeps one `codex app-server` per workspace for as long as any run uses it, released on run close; no idle timer (`runtime-management/codex/client/codex-app-server-client-manager.ts`)
- Changed: BEH-004 desired behavior, UC-004, REQ-006 (rewritten), AC-006/AC-007 (replaced: same-pid-while-idle, restore-after-restart), SCN-005, QR-001, ASM-001, DEC-002 (decided)
- Intended behavior changed: Yes (by the user's decision). Nothing was previously approved
- Approval impact: the remaining approval covers DEC-001, 003, 004, 005, 006 and the full requirements
- Next action: user approval

### SR-004 — Notice for Claude-started turns uses SYSTEM_TASK_NOTIFICATION

- Phase and classification: Requirements / Refinement (user decision)
- Trigger: user 2026-09-25: "if you use a system task notification then that's a good one"
- Evidence: the web already renders `SYSTEM_TASK_NOTIFICATION` in the conversation (`autobyteus-web/services/agentStreaming/handlers/systemTaskNotificationHandler.ts`, projector L187) for team task-delegation notices
- Changed: DEC-001 (decided), REQ-003 wording
- Intended behavior changed: Yes (by the user's decision). Nothing was previously approved
- Remaining approval: DEC-003, DEC-004, DEC-005, DEC-006 and the full requirements

### SR-005 — Decisions accepted; inline images questioned

- Phase and classification: Requirements / Refinement (user decisions)
- Trigger: user 2026-09-25: "I accept … your earlier recommendations: turns claude starts by itself, messages to a busy agent, roll out, and no background task UI. and why dont we support inline images?"
- Changed: DEC-003, DEC-005, DEC-006 decided as recommended; DEC-001 reconfirmed; DEC-004 annotated with image-handling evidence (Codex/native inline; Claude path + Read)
- Remaining: DEC-004 answer, then the requirements package can be marked Approved

### SR-006 — Inline images included; requirements approved

- Phase and classification: Mixed (Evidence + Requirements approval)
- Trigger: user 2026-09-25: "if use inline image is not complicated for claude agent sdk, then lets do it in this ticket as well" and "you can do some experiements, and find out how to inline image, then lets keep also use inline image in this ticket as well"
- Evidence: probes G/H/I (`probe-evidence/image-probe-results.md`)
- Changed: DEC-004 decided (include); BEH-005 desired behavior; UC-005, REQ-011, AC-012, AC-013, SCN-007 added; out-of-scope narrowed to inline documents
- Approval: requirements `Approved` at SR-006 based on the user's explicit decisions on every open item (SR-003..SR-006) and the confirmed direction
- Next action: architecture investigation (remaining probes: background completion while busy, MCP auto-backgrounding, crash/resume), then design-spec; expected Large / High → architecture review

### SR-007 — Architecture design complete

- Phase and classification: Design / Architecture Design Complete
- Trigger: user 2026-09-25 "continue your work, since the requirement is already approved"
- Evidence added: probes J (completion while busy), K (MCP not auto-backgrounded), L (crash + resume), M (split CLI turns; still-queued after interrupt), N (usage per turn vs cumulative modelUsage), O (background task survives interrupt); SDK `cancel_async_message` finding (RSK-006); usage reconciler check (RSK-007)
- Canonical sections changed: investigation-notes "Architecture Investigation Findings (SR-007)"; new `design-spec.md`
- Intended behavior changed: No (requirements at SR-006 unchanged)
- Task size/risk: `Large` / `High` (session lifecycle and concurrency rewrite, append contract, untyped SDK cancel method, additive memory trace type)
- Handoff: `solution-handoff.md`; routed per handoff rules
- Next action: independent architecture review

### SR-008 — Design revision for ARCH-REV-001

- Phase and classification: Design / Design Impact (review round 1 → round 2)
- Trigger: `/architecture_reviewer` ARCH-REV-001 Fail (`design-review-report.md`, `architecture-review-revision-record.md`)
- Findings addressed: ARCH-F-001 (interrupt cancellation/settlement), ARCH-F-002 (frame classification), ARCH-F-003 (turn-id uniqueness), ARCH-F-004 (notice trace scope), ARCH-F-005 (late completion, probed), ARCH-F-006 (failure after registerInput); P-007 closed
- New evidence: probes P `cq`/`cam` on the PATH CLI 2.1.281 and the bundled CLI 2.1.280, P-prewait, Q (unfiltered) — investigation-notes "Architecture Review Round 1 Evidence (SR-008)"
- Canonical sections changed: design-spec (status, risk, evidence, spines, a new frame classification, tracker rules with the single uuid-accounted settlement, registry consumption/carry-over rules, lifecycle capability check, interrupt, interface, file mapping for memory scope, examples, sequence, risks, "Review Round 1 Resolution"); investigation-notes (SR-008 section, RSK-006)
- Intended behavior changed: No. The Stop-time notice + carry-over realizes the approved REQ-002/REQ-003 under the SDK's `cancel_queued` semantics
- Task size/risk: unchanged `Large` / `High`
- Next action: re-review by `/architecture_reviewer`

### SR-009 — Design revision for ARCH-REV-002

- Phase and classification: Design / Design Impact (review round 2 → round 3)
- Trigger: `/architecture_reviewer` ARCH-REV-002 Fail. ARCH-F-001..006 confirmed resolved; new ARCH-F-007 (abort frames counted as consumption), ARCH-F-008 (Stop while input registered but unsent)
- Evidence: existing probes J, F, O, P `cq` (no new probe needed; the frame sequences are already captured)
- Canonical sections changed: design-spec (status; SPINE-3 consumption rule; SPINE-5 send-state rules; file mapping with the neutral sender-id module; examples; step-2 tests; "Review Round 2 Resolution")
- Intended behavior changed: No
- Task size/risk: unchanged `Large` / `High`
- Next action: round-3 review by `/architecture_reviewer`
- Review outcome (recorded 2026-09-25): ARCH-REV-003 **Pass** on SR-006..SR-009 (`design-review-report.md`, `architecture-review-revision-record.md`). ARCH-F-001..008 resolved. Implementation constraints from the reviewer:
  - IC-1 (binding): the no-SDK-call Stop path applies only when no uuid was sent and no CLI turn is open; a provider-initiated turn always uses `interrupt({cancelQueued:true})`.
  - IC-2 (hygiene): the agent is not told twice about a carried-over completion.
  The reviewer forwarded the package to `/implementation_engineer`. The Solution Designer did not forward it again.

### SR-010 — Requirement gap: shared AgentRun append claim (IMP-DI-001)

- Phase and classification: Requirements / Requirement Gap (via implementation Design Impact)
- Trigger: `/implementation_engineer` IR-001 finding IMP-DI-001 (checkpoint `26450e6b0`, `implementation-handoff.md`)
- Verified evidence: `autobyteus-server-ts/src/agent-execution/input/agent-run-input-admission-state.ts` `claimNext` (L154-157) inspects only the first non-terminal FIFO entry and returns null unless it is `queued`. The entry whose `start_turn` opened the active turn stays `forwarded` until that turn's terminal, so later inputs are never claimed as `append_to_active_turn`. This has been in place since `1e7837929`/`3f3aafa7c` (2026-08-13/15). The same code path makes Codex `turn/steer` unreachable in the normal scenario, contradicting `docs/modules/agent_execution.md` L312. The design (SR-007..009) assumed AgentRun's append contract was reusable unchanged. That premise is false, which triggers the escalation clause "AgentRun needs a contract change beyond declaring append support"
- Impact: REQ-004/AC-003/AC-004 cannot be met without changing shared AgentRun input admission. Any shared fix changes Codex runtime behavior, which the approved requirements put out of scope
- Status changes: requirements `Ready for Approval` for the delta (DEC-007); design-spec `Needs Revision` for the AgentRun claim rule (the rest of the reviewed design is unaffected); implementation paused on this item
- Intended behavior changed: pending the user's decision (option A extends REQ-004 behavior to Codex)
- Next action: user decides DEC-007 → requirements update + approval → design revision (claim rule, AgentRun tests, Codex check) → architecture re-review (shared-contract change)

### SR-011 — Shared AgentRun append claim approved and designed

- Phase and classification: Mixed (Requirements approval + Design)
- Trigger: user 2026-09-26: "thanks for your suggestion. lets do it according to your suggestion that means later implemetnation should add more tests and api e2e should also tests more i believe right?" (DEC-007 = A)
- Requirements changed: REQ-012, BEH-009, AC-014, AC-015, AC-016, SCN-008 added; the Codex out-of-scope line narrowed to exclude the shared rule. REQ-012 also includes the rule that a definitely-undelivered append starts the next turn instead of failing. This keeps option A from introducing a new failure mode for Codex and Claude users and was stated to the user in the same reply
- Design changed: new design-spec section "Shared AgentRun Append Claim (SR-011)" (claim rule, `undeliveredRetryAsStart`, invariants, files, tests); status `Ready`; reuse statement corrected
- Approval: requirements `Approved` at SR-011
- Task size/risk: unchanged `Large` / `High`
- Next action: architecture review of the new section; then implementation resumes from checkpoint `26450e6b0`
- Review outcome for SR-011 (recorded 2026-09-26): ARCH-REV-004 **Pass** on SR-010/SR-011 (shared AgentRun append claim). Implementation constraints from the reviewer:
  - IC-3: Codex reuses `CODEX_TURN_STEER_ID_MISMATCH` both before the RPC and for a returned-id mismatch after it; only the pre-RPC case may set `undeliveredRetryAsStart`.
  - IC-4 (non-blocking): the append turnId that `postUserMessage` returns at claim time can go stale after a requeue; no current caller reads it.
  The reviewer forwarded the package to `/implementation_engineer`. The Solution Designer did not forward it again.

### SR-012 — Usage accounting across process generations (CR-002)

- Phase and classification: Design / Design Impact (RSK-007 escalation trigger hit)
- Trigger: `/code_reviewer` CRR-003 finding CR-002 (failure-origin review of API-REV-001 API-F-001). Evidence: `api-e2e-evidence/c08-life-05-crash-and-usage.log`, `c08b-rsk007-usage-probe.log`. After an unexpected exit, the resumed CLI restarts cumulative `modelUsage` from the last clean-exit total, and the reconciler suppresses that turn as a regression (one turn lost per crash). The design premise "resumed saved total" held only after a clean exit
- Design change: new section "Usage Accounting Across Process Generations (SR-012)". The session marks the first result of every resume-opened process generation (`claude_sdk_series_restart`). The reconciler admits that result's per-turn main-loop usage as the selected delta and re-anchors the checkpoint. This is correct for any restart origin, including the undetectable reset where the new cumulative exceeds the old checkpoint. OBS-2: no env override; warning + operator doc note
- Requirements: unchanged. The fix restores REQ-010 accounting, and the OBS-2 choice preserves operator env (REQ-009 has no hidden policy)
- Task size/risk: unchanged `Large` / `High`
- Next action: architecture review → implementation → code review → API/E2E rerun (`-t "RSK-007"` already encodes the outcome)
- Review outcome for SR-012 (recorded 2026-09-26): ARCH-REV-005 **Pass** (usage accounting across process generations, including OBS-2). Constraint IC-5: the series-restart marker goes on the generation's first *emitted* observation. If the zero-usage guard drops the first raw result, the marker carries over to the next emitted result. The reviewer forwarded the package to `/implementation_engineer`; the Solution Designer did not forward it again. OBS-2 was also discussed with the user on 2026-09-26: AutoByteus no longer sets the variable (removed on the branch). Operator-set values are honored with a warning. The user has not asked for an override.
