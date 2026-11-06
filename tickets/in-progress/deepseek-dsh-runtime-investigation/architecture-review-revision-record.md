# Architecture Review Revision Record

The latest `design-review-report.md` remains authoritative.

## Revision Index

| Revision ID | Review Round / Trigger | Related Solution Revision IDs | Prior Decision | Current Decision | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| ARCH-REV-001 | Round 1 / Architecture Design Complete (Large, High) | SR-001, SR-002 | N/A | Fail (Design Impact) | AR-001…AR-007 |
| ARCH-REV-002 | Round 2 / design revision SR-003 | SR-003 | Fail | Fail (Design Impact) | AR-001…AR-007 resolved; AR-008 new |

## Revision Entries

### ARCH-REV-001 — Initial review of the DeepSeek Harness ACP runtime design

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/deepseek-dsh-runtime-investigation/tickets/in-progress/deepseek-dsh-runtime-investigation/design-review-report.md`
- Review round and trigger: round 1; Solution Designer handoff `handoff-architecture-design-complete.md`
- Triggering role, report path, and finding IDs: Solution Designer, `design-spec.md` (SR-002); N/A
- Relevant solution revision IDs: SR-001, SR-002
- Prior authoritative decision: N/A
- Current authoritative decision: `Fail`, classification `Design Impact`
- What changed in the review result or what baseline was established: baseline. Behavior basis confirmed against the requirements and current code at `e3187f78e9`. Four blocking findings: AR-001 (the reopen launch has no composed prompt), AR-002 (end/release ownership of the new owner handles), AR-003 (model access and discovery wiring per composition; P-001 Reachable), AR-004 (refusal envelope dsh can read). Three low findings for the same revision: AR-005 (unused `normalizeModels` on the shared contract), AR-006 (vocabulary versus Model Routing), AR-007 (probe forwarder body rewriting versus pass-through route).

#### Prior Finding Resolution

None.

- New or remaining finding IDs: AR-001, AR-002, AR-003, AR-004, AR-005, AR-006, AR-007
- Material classification changes: None (task_size `Large`, architectural_risk `High` confirmed)
- Recommended recipient: Solution Designer
- Remaining risks or uncertainty: P-002 (synchronous `finished` delivery), `RunPassRegistry.issue` order, pass visibility to shells for agents with integrations, atomic home-file writes, discovery `customSkillDirs`; RSK-002/004/006.

### ARCH-REV-002 — Round 2 on SR-003

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/deepseek-dsh-runtime-investigation/tickets/in-progress/deepseek-dsh-runtime-investigation/design-review-report.md`
- Review round and trigger: round 2; Solution Designer handoff `handoff-architecture-design-complete.md` (SR-003), commit `b40a9450b1`
- Triggering role, report path, and finding IDs: Solution Designer, `design-spec.md` (SR-003); AR-001…AR-007
- Relevant solution revision IDs: SR-003
- Prior authoritative decision: `Fail` (ARCH-REV-001)
- Current authoritative decision: `Fail`, classification `Design Impact`
- What changed in the review result: all seven round-1 findings are resolved and verified against the revised spec and the code. One new finding: AR-008. DEC-020 makes application launches in the studio a supported dsh path, and on that path relay-granted passes are never revoked (P-003, Reachable).

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-001 | Open (High) | Resolved | SR-003; design DS-004 (three forms), Ownership Map (`AcpAgentRunBackend` holds `instructions`), Removal Plan row "load", Concrete Examples "Reopen", inventory `acp-agent-run-backend.ts` | Reopen passes the held instructions in `open({mode: "restore", instructions})`; the factory composes them on create and restore and hands them to the backend; matches the callers at `acp-agent-run-backend.ts:219-232` |
| AR-002 | Open (Medium) | Resolved | DS-008; Removal Plan row for the factory end copy; `observe` identity-scoped unsubscribe | `end` is the one owner, in the order unsubscribe → close session → close connection/stop process → `launch.release()` → clear handles; `releaseResources` calls `end` and then skill cleanup; callers named (reopen, release, open failure) |
| AR-003 | Open (Medium-High) | Resolved | DEC-020; Interface `createForExecution({…, providerRelayAccess})`; Concrete Example "No relay access"; process relay slot; availability provider | Disposition per composition (studio, application platform runtime/scope threaded, standalone `null`); refusal before spawn; catalog and availability read the slot; the validator shows the unavailable reason (`application-launch-host-capability-validator.ts:76-86`). The revocation side of the same compositions is AR-008 |
| AR-004 | Open (Medium) | Resolved | Interface "Relay refusal body"; Concrete Example "Refusal seen by the user" | Anthropic envelope with type/code/message and a status per code; consistent with dsh `transport.ts:22-31` (AUTH on 401/403, not retried) |
| AR-005 | Open (Low) | Resolved | Removal Plan; Grok capability calls `normalizeGrokBuildModels` directly | Contract no longer carries `normalizeModels` |
| AR-006 | Open (Low) | Resolved | Terminology, Naming Check | "provider relay", `/relay/<relayId>`, `DSH_PROVIDER_ROUTE`; glossary entry names the distinction from Model Routing |
| AR-007 | Open (Low) | Resolved | DEC-019; supplemental artifact rows; investigation notes inventory | The relay never alters bodies; the probe's stripping is marked probe-only; live E2E runs on the product relay |

- New or remaining finding IDs: AR-008
- Material classification changes: None (`Large` / `High`)
- Recommended recipient: Solution Designer
- Remaining risks or uncertainty: slot set before the listener is up (transient diagnostic); per-process slot assumption (studio and standalone in separate processes); RSK-002/004/006.
