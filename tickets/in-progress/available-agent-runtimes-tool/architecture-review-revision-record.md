# Architecture Review Revision Record — autobyteus-303

The latest `design-review-report.md` remains authoritative.

## Revision Index

| Revision ID | Review Round / Trigger | Related Solution Revision IDs | Prior Decision | Current Decision | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| ARCH-REV-001 | Round 1 — Architecture Design Complete (Large/High), 2026-10-25 | SR-001 | N/A | Fail (Design Impact) | AR-001, AR-002, AR-003, AR-004, AR-005 |
| ARCH-REV-002 | Round 2 — SR-002 re-review, 2026-10-25 | SR-002 | Fail | Fail (Design Impact + Requirement Gap) | AR-002 (narrowed), AR-006 (new); AR-001, AR-003, AR-004, AR-005 resolved |
| ARCH-REV-003 | Round 3 — SR-003 re-review, 2026-10-25 | SR-003 | Fail | Pass | AR-002, AR-006 resolved; none open |
| ARCH-REV-004 | Round 4 — SR-004 addition (optional runtime note), 2026-10-25 | SR-004 | Pass | Fail (Design Impact) | AR-007 (new) |
| ARCH-REV-005 | Round 5 — SR-005 re-review, 2026-10-25 | SR-005 | Fail | Pass | AR-007 resolved; none open |

## Revision Entries

### ARCH-REV-001 — Initial review: Claude zero-token query, 20 s deadline, one install rule

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/available-agent-runtimes-tool/tickets/in-progress/available-agent-runtimes-tool/design-review-report.md`
- Review round and trigger: Round 1. Solution Designer handoff `handoff-architecture-review.md` (2026-10-25).
- Triggering role, report path, and finding IDs: Solution Designer; `design-spec.md` SR-001; N/A
- Relevant solution revision IDs: `SR-001`
- Prior authoritative decision: N/A
- Current authoritative decision: `Fail`, classification `Design Impact`
- Baseline established: the behavior basis is confirmed. The spine, ownership, interfaces, file mapping and the `Not Affected` persistence decision pass. The design fails on:
  - AR-001: the shared Claude control query writes a prompt with `maxTurns: 0`, and the SDK drops that value. This breaks REQ-008.
  - AR-002: the per-runtime chain has no deadline that keeps the answer ≤ 20 s, and a models-step failure has no state. This breaks REQ-010 and REQ-007.
  - AR-003: `RuntimeAvailabilityService` means a different check for each runtime, and it leaves out an Antigravity whose sign-in could not be checked. This breaks REQ-002 and DEC-002.
  - AR-004 and AR-005 are small type-placement and blocked-representation fixes.

#### Prior Finding Resolution

None

- New or remaining finding IDs: AR-001 (High), AR-002 (High), AR-003 (Medium), AR-004 (Low), AR-005 (Low). Material premise MP-001: Reachable.
- Material classification changes: none (Large/High confirmed)
- Recommended recipient: Solution Designer
- Remaining risks or uncertainty: RSK-001, RSK-002, UNK-001, UNK-002 as recorded upstream. Follow-up FU-001 (`follow-ups.md`).

### ARCH-REV-002 — SR-002 re-review: four findings resolved, step deadline and requirements text remain

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/available-agent-runtimes-tool/tickets/in-progress/available-agent-runtimes-tool/design-review-report.md`
- Review round and trigger: Round 2. Solution Designer re-review request for SR-002 (2026-10-25).
- Triggering role, report path, and finding IDs: Solution Designer; `design-spec.md` SR-002 § Review Findings Resolution; AR-001…AR-005
- Relevant solution revision IDs: `SR-002`
- Prior authoritative decision: `Fail` (ARCH-REV-001)
- Current authoritative decision: `Fail`, classification `Design Impact` (AR-002) + `Requirement Gap` (AR-006)
- What changed:
  - AR-001, AR-003, AR-004 and AR-005 are verified resolved against the spec and the code.
  - AR-002 is narrowed to one point: a cap must be a deadline across a step's several commands (Antigravity `agy --help` + `agy models`; Grok's per-probe `timeoutMs` + handshake; Codex lease release). Material premise: MP-002.
  - New AR-006: the requirements' UI states still list account/plan and a limit-level blocked badge; the model-block field is named `blockedUntil` in the requirements and `blocked: {until, by}` in the design; the "credits" wording conflicts with the provider balance.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-001 | Open (High) | Resolved | SR-002; C-15 | Spec: idle-input `withClaudeControlQuery`, `listModels` moved, constant removed (uses `claude-sdk-client.ts:13,396` only), failing-first test; Case 5 in `docs/design-cases.md` |
| AR-002 | Open (High) | Partially resolved; still open (Medium) | SR-002; C-17 | Budget 18 s, order, backstop and REQ-007 entries are present. The remaining gap is a deadline across several commands (`antigravity-cli-capability.ts:96-99`, `grok-build-capability.ts:81-85`, `codex-model-catalog.ts:20-45`) |
| AR-003 | Open (Medium) | Resolved | SR-002; C-16 | `readVersion !== null` for all four; `RuntimeAvailabilityService` not used; Case 2 updated |
| AR-004 | Open (Low) | Resolved | SR-002 | Provider usage types are in `llm-management/provider-usage/provider-usage-reader.ts` |
| AR-005 | Open (Low) | Resolved | SR-002 | One `read` form with `blockedReason`; the service blocks a provider's models |

- New or remaining finding IDs: AR-002 (Medium), AR-006 (Medium)
- Material classification changes: AR-006 adds `Requirement Gap` (text alignment within the direction)
- Recommended recipient: Solution Designer
- Remaining risks or uncertainty: GraphQL encoding of the mixed-type report fields (residual note); RSK-001…003, UNK-001/002; FU-001.

### ARCH-REV-003 — SR-003 re-review: Pass

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/available-agent-runtimes-tool/tickets/in-progress/available-agent-runtimes-tool/design-review-report.md`
- Review round and trigger: Round 3. Solution Designer re-review request for SR-003 (2026-10-25).
- Triggering role, report path, and finding IDs: Solution Designer; `design-spec.md` SR-003 § Review Findings Resolution; AR-002, AR-006
- Relevant solution revision IDs: `SR-003`
- Prior authoritative decision: `Fail` (ARCH-REV-002)
- Current authoritative decision: `Pass`
- What changed: AR-002 and AR-006 are verified resolved, and the design is ready for implementation. I checked Codex lease semantics (`codex-app-server-client-manager.ts:27-50`) to confirm that an abandoned request ends with its home-folder app-server.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-002 | Open (Medium, narrowed) | Resolved | SR-003; C-19 | `read-deadline.ts` (`ReadDeadline`, `commandTimeout` = min(usual, time left), nothing starts after the end, `raceDeadline`). Shared by `listAntigravityModels`, `discoverGrokBuildModels` (probes + handshake), `runAcpExtensionRequest`, `withClaudeControlQuery`. Codex races the deadline and releases in `finally`. Provider readers get `AbortSignal.timeout(time left)`. `deadline` and `timeoutMs` keep separate meanings. Tests: slow second command killed by the deadline; never-settling Codex request releases the lease |
| AR-006 | Open (Medium) | Resolved | SR-003 requirements | UI states (line 123) have no plan or limit badge; `blocked: {until, by}` in REQ-004, AC-003 and AC-004; REQ-004 shows provider money balance and not runtime credit details, consistent with AC-007 |

- New or remaining finding IDs: none
- Material classification changes: none (Large/High)
- Recommended recipient: Implementation Engineer; informational notice to the Solution Designer
- Remaining risks or uncertainty: implementation notes in the report's Residual Risks (Codex lease close before models ‖ limits; GraphQL encoding of mixed fields); RSK-001…004, UNK-001/002; FU-001.

### ARCH-REV-004 — SR-004 note: one field for two meanings

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/available-agent-runtimes-tool/tickets/in-progress/available-agent-runtimes-tool/design-review-report.md`
- Review round and trigger: Round 4. SR-004 (optional per-runtime `note`) after the ARCH-REV-003 Pass.
- Triggering role, report path, and finding IDs: Solution Designer; `design-spec.md` § SR-004 Addition; N/A
- Relevant solution revision IDs: `SR-004`
- Prior authoritative decision: `Pass` (ARCH-REV-003, SR-003)
- Current authoritative decision: `Fail`, classification `Design Impact`
- What changed: I reviewed only the SR-004 delta (design diff, REQ-004, AC-003, AC-006).
  - The intent and the internal placement (`UsageLimitsReading.read.note`, written by the strategy) are sound.
  - The output `ExternalAgentRuntimeEntry.note` joins the sign-in note and the limits note with "; ". That merges two meanings into one field. The page cannot place them apart without parsing the text, and the UI required states don't mention the limits note (AR-007).

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-001…AR-006 | Resolved (ARCH-REV-003) | Resolved, unaffected by SR-004 | SR-004 diff | The diff touches only the note field and two table labels |

- New or remaining finding IDs: AR-007
- Material classification changes: none (Large/High)
- Recommended recipient: Solution Designer
- Remaining risks or uncertainty: as in ARCH-REV-003. Implementation is in progress on SR-003; the AR-007 fix is additive.

### ARCH-REV-005 — SR-005: notes split, Pass

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/available-agent-runtimes-tool/tickets/in-progress/available-agent-runtimes-tool/design-review-report.md`
- Review round and trigger: Round 5. SR-005 for ARCH-REV-004 AR-007.
- Triggering role, report path, and finding IDs: Solution Designer; `design-spec.md` § SR-004 Addition and the report type; AR-007
- Relevant solution revision IDs: `SR-005`
- Prior authoritative decision: `Fail` (ARCH-REV-004)
- Current authoritative decision: `Pass`
- What changed: AR-007 is verified resolved in the SR-004 → SR-005 diff and in requirements REQ-004, REQ-007, AC-003, AC-006 and the UI states (line 123).

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-007 | Open | Resolved | SR-005 | `signIn?: "not checked"` (sign-in step only) and `limitsNote?: string` (only with read limits) are separate fields. The UI states show the limits note under the limits and the sign-in mark on the row. The AC and REQ field names match |

- New or remaining finding IDs: none
- Material classification changes: none (Large/High)
- Recommended recipient: Implementation Engineer; informational notice to the Solution Designer
- Remaining risks or uncertainty: as in ARCH-REV-003 (report § Residual Risks).
