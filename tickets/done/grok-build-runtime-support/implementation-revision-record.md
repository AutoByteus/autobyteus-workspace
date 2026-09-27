# Implementation Revision Record — `grok-build-runtime-support`

The current code and `implementation-handoff.md` are authoritative. This record locates each implementation round.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Architecture Reviewer / `design-review-report.md` / ARCH-REV-002 Pass (round 2) | N/A | `Initial Baseline` | SR-005, SR-006, SR-007, SR-008, ARCH-REV-001, ARCH-REV-002; CRR/API-REV/DR: N/A | Implementation complete; routed to `/code_reviewer` |
| IR-002 | Architecture Reviewer / `design-review-report.md` / ARCH-REV-003 Pass (after code-review failure-origin CRR-002) | CR-001, CR-003, CR-004, CR-006 (CR-005, CR-007: no change by design) | `Local Fix` (CR-004) + design-directed revision (CR-006, SR-011) | SR-009, SR-010, SR-011, ARCH-REV-003, CRR-001, CRR-002 | Commit `d7d4aa2ad`; routed to `/code_reviewer` |

## Revision Entries

### IR-001 — Grok Build runtime on a runtime-neutral ACP layer; `grok-4.7` catalog row

- Triggering role, report path, and round: `/architecture_reviewer`, `tickets/in-progress/grok-build-runtime-support/design-review-report.md`, ARCH-REV-002 (Pass, round 2).
- Triggering finding IDs: N/A (AR-005 is non-blocking editorial wording in `design-spec.md`; owned by the Solution Designer; not edited here).
- Classification: `Initial Baseline`.
- Prior authoritative result: N/A.
- Current authoritative result: Design steps 1–7 implemented; step 5 (paid tool-set confirmation) passed; step 8 implementation-scoped tests added (gated live E2E and capability GraphQL e2e left to API/E2E); step 9 docs sync is delivery-owned (only the `autobyteus-ts` catalog docs named in step 1 were updated).
- Related solution revision IDs: SR-005, SR-006, SR-007, SR-008.
- Related architecture-review revision IDs: ARCH-REV-001, ARCH-REV-002.
- Related code-review revision IDs: N/A.
- Related API/E2E revision IDs: N/A.
- Related delivery revision IDs: N/A.
- Why this baseline is recorded: first implementation handoff for a Large/High package.
- Approved behavior or requirement IDs affected: BEH-001..BEH-013; REQ-001..REQ-018; AC-001..AC-016.
- Implementation delta:
  - `autobyteus-ts`: `grok-4.7` replaces `grok-4.6` (no alias), version-neutral schema text, tests and catalog docs updated.
  - Server: `@agentclientprotocol/sdk` pinned `1.5.0`; new `runtime-management/acp` (process, connection with pre-registration buffering and foreign-response filter, standard capabilities, launch-profile contract, discovery handshake); new `agent-execution/backends/acp` (session profile contract, converter, permission bridge, session state machine, backend, factory, prompt builder); new Grok profile (`runtime-management/grok`, `agent-execution/backends/grok`, `grok-build-model-catalog.ts`); seams for `grok_build` in enum/predicate, availability, both execution scopes, manager, restore/resume, context union, catalog/selection/app-launch diagnostics, credential authority (unsupported), token-usage types, historical migration exhaustive switch.
  - Contracts: `grok_build` added to the team-stream and collaboration-stream runtime-kind enums (enumeration sites missing from the design file list; required for team/org member DTOs), tracked `dist/` regenerated (AGY precedent `97f881366`).
  - Web: "Grok Build" runtime/token-usage labels, external model help, `grok` system-instruction source key with en/zh-CN copy, fixture union.
- Changed files or areas: see `implementation-handoff.md` "Key Files Or Areas".
- Local validation and result: server source typecheck clean; 17 new/touched server suites 132/132 pass; `autobyteus-ts` LLM unit suite 333/333 pass; related web suites 26 files/64 tests pass; full server unit suite shows 29 failing files/51 failing tests that fail identically on a clean `e06080b00` worktree (pre-existing); zero-cost live probes + one paid step-5 turn (US$0.0288) against Grok CLI 1.0.41; rendered launch form checked in the dev UI.
- Next recipient or routing: `/code_reviewer` (task_size=Large, architectural_risk=High).
- Remaining limitations or risks: see `implementation-handoff.md` "Known Risks" (live team/approval/interrupt/restore flows are covered by fixture replays and zero-cost probes, not by paid live runs; `session/load` + non-empty MCP not live-probed with a prompt; image prompt blocks intentionally not sent).

### IR-002 — Denial-ended turns complete; agent start errors surface; CR-001/CR-003 cleanup

- Triggering role, report path, and round: `/architecture_reviewer`, `design-review-report.md` ARCH-REV-003 (Pass) on SR-011, which followed code-review failure-origin `code-review-report.md` CRR-002.
- Triggering finding IDs: CR-006 (AC-004 deny outcome, user-approved amendment), CR-004 (start-time provider error lost), CR-001 (unused accessors), CR-003 (literal protocol version). CR-005 (credential authority) and CR-007 (provider auto-allow) intentionally unchanged per SR-011 (user deferral / precedent clarification). AR-006 honored (manager unchanged).
- Classification: `Local Fix` (CR-004, CR-001, CR-003) and design-directed behavior change (CR-006, SR-011).
- Prior authoritative result: IR-001, commit `2b31b046d`. Deny ended as `TURN_INTERRUPTED`; start-time `RequestError` replaced by the manager's generic message.
- Current authoritative result: commit `d7d4aa2ad` on top of `2b31b046d`.
- Related solution revision IDs: SR-009, SR-010, SR-011.
- Related architecture-review revision IDs: ARCH-REV-003.
- Related code-review revision IDs: CRR-001, CRR-002.
- Related API/E2E revision IDs: see `api-e2e-revision-record.md` (the findings that triggered CRR-002).
- Related delivery revision IDs: N/A.
- Why this implementation revision is recorded: upstream revision SR-011 plus confirmed implementation Local Fix CR-004.
- Approved behavior or requirement IDs affected: AC-004/REQ-005/BEH-004 (deny outcome), AC-012/REQ-015/BEH-011 (start-time error text), AC-016 (neutral ACP layer kept).
- Implementation delta:
  - CR-006:
    - `AcpAgentSession` keeps a per-turn `userDeniedInTurn` flag. It is reset at turn start and set only when the bridge reports `outcome:"rejected"`, i.e. the agent's reject-once was selected, never for `cancelled` answers.
    - `endTurnFor(stopReason)` classifies, with interrupt checked first:
      - `cancelled` while `cancelling` → `TURN_INTERRUPTED`;
      - `cancelled` while `prompting` after a denial → `TURN_COMPLETED` (`provider_stop_reason:"cancelled"`);
      - `cancelled` while `prompting` without a denial → `TURN_INTERRUPTED`;
      - any other stop reason → `TURN_COMPLETED`.
    - `finishTurn` now builds the events before leaving the turn state. No synthetic prompt is sent.
    - `AcpPermissionBridge.decide` returns `{kind:"answered", outcome:"allowed"|"rejected"|"cancelled"}`.
  - CR-004:
    - New runtime-neutral `runtime-management/acp/acp-error-message.ts`:
      - `describeAcpError` composes the message plus string `data`; the session now uses it.
      - `describeAcpActivationError` returns `"<agentLabel>: <provider text>"` for SDK `RequestError`, the message for safe ACP-layer errors (`ACP_*:` / `PLATFORM_AGENT_RUN_BINDING_INVALID:`), and null otherwise.
    - The factory's `launch` rollback rethrows those as `AgentCreationError`; other errors are unchanged.
    - The restore binding-invalid error is an `AgentCreationError`.
    - The manager is unchanged (AR-006): create surfaces the text; restore keeps it as the `cause` of `PlatformAgentRunRestoreError`.
  - CR-003: `initialize` sends the SDK `PROTOCOL_VERSION`.
  - CR-001: removed `AcpPermissionBridge.has()` and `AcpAgentProcess.stderrTail()`; stderr is drained only (`resume()`).
- Changed files or areas:
  - `src/agent-execution/backends/acp/session/{acp-agent-session,acp-permission-bridge}.ts`
  - `src/agent-execution/backends/acp/backend/acp-agent-run-backend-factory.ts`
  - `src/runtime-management/acp/{acp-error-message (new),acp-client-connection,acp-agent-process}.ts`
  - tests: `acp-agent-session.test.ts` (4 new cancel-classification cases), `acp-agent-run-backend-factory.test.ts` (new `session/new -32000` case; `AgentCreationError` assertions for MCP-unavailable, capability-missing, binding-invalid and `session/load` error), `acp-permission-bridge-and-prompt.test.ts` (outcomes).
- Local validation and result:
  - server source `tsc -p tsconfig.build.json --noEmit` is clean;
  - ACP/Grok unit suites: 12 files, 68 tests passed (the neutrality grep includes the new file);
  - API/E2E's uncommitted fake-agent replay and capability e2e: 8 passed; the live e2e is gated and skipped, and already expects `TURN_COMPLETED` after a denial.
- Next recipient or routing: `/code_reviewer`.
- Remaining limitations or risks: the denial → completed mapping relies on Grok ending the prompt with `stopReason:"cancelled"` after reject-once (ARC-28). It is verified only by fixture replay here; a paid live confirmation is left to the gated live E2E.
