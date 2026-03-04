# Future-State Runtime Call Stack Review

- Ticket: `claude-agent-sdk-runtime-support`
- Review Basis:
  - `tickets/in-progress/claude-agent-sdk-runtime-support/requirements.md`
  - `tickets/in-progress/claude-agent-sdk-runtime-support/proposed-design.md`
  - `tickets/in-progress/claude-agent-sdk-runtime-support/future-state-runtime-call-stack.md`
- Current Call-Stack Version: `v2`

## Clean Review Streak

- Initial streak: `0`
- Round 1 result: `Candidate Go` (streak -> `1`)
- Round 2 result: `Go Confirmed` (streak -> `2`)

## Round 1 (Deep Review)

### Missing-Use-Case Discovery Sweep

- Requirement coverage sweep: all `R-001..R-011` map to at least one use case in call-stack index.
- Boundary crossing sweep: API -> composition/ingress -> runtime adapter/service, streaming bridge, team runtime mode, and projection provider registry all represented.
- Fallback/error sweep: each use case includes explicit error branch; provider fallback covered for projection.
- Design-risk sweep: decoupling risk represented by `UC-010` and verified against design inventory.
- New use cases discovered: `No`.

### Criteria Verdict Summary

| Criterion | Verdict |
| --- | --- |
| architecture fit check | Pass |
| layering fitness check | Pass |
| boundary placement check | Pass |
| decoupling check | Pass |
| existing-structure bias check | Pass |
| anti-hack check | Pass |
| local-fix degradation check | Pass |
| terminology / concept clarity | Pass |
| naming clarity | Pass |
| name-responsibility alignment | Pass |
| future-state alignment to design basis | Pass |
| use-case coverage completeness | Pass |
| use-case source traceability | Pass |
| requirement coverage closure | Pass |
| design-risk use-case justification | Pass |
| business flow completeness | Pass |
| redundancy / duplication | Pass |
| simplification opportunity check | Pass |
| remove/decommission completeness | Pass |
| legacy-retention cleanup check | Pass |
| backward-compat mechanism check | Pass |
| overall verdict | Pass |

### Findings

- Blocking findings: `None`.
- Required persisted artifact updates: `None`.

### Applied Updates

- Updated files: `None`.
- New artifact versions: `None`.
- Changed sections: `None`.
- Resolved findings: `N/A`.

### Round Verdict

- Status: `Candidate Go`
- Clean-review streak state: `Candidate Go (1/2)`

## Round 2 (Deep Review)

### Missing-Use-Case Discovery Sweep

- Requirement coverage re-check: no unmapped requirements or acceptance criteria traceability gaps.
- Boundary crossing re-check: runtime-neutral registries and codex-isolated internals remain separated in modeled flow.
- Error/fallback re-check: projection fallback + runtime capability rejection + mixed-team-runtime rejection still explicit.
- Design-risk re-check: `UC-010` still sufficient to guard against codex-coupled shared orchestration regression.
- New use cases discovered: `No`.

### Criteria Verdict Summary

| Criterion | Verdict |
| --- | --- |
| architecture fit check | Pass |
| layering fitness check | Pass |
| boundary placement check | Pass |
| decoupling check | Pass |
| existing-structure bias check | Pass |
| anti-hack check | Pass |
| local-fix degradation check | Pass |
| terminology / concept clarity | Pass |
| naming clarity | Pass |
| name-responsibility alignment | Pass |
| future-state alignment to design basis | Pass |
| use-case coverage completeness | Pass |
| use-case source traceability | Pass |
| requirement coverage closure | Pass |
| design-risk use-case justification | Pass |
| business flow completeness | Pass |
| redundancy / duplication | Pass |
| simplification opportunity check | Pass |
| remove/decommission completeness | Pass |
| legacy-retention cleanup check | Pass |
| backward-compat mechanism check | Pass |
| overall verdict | Pass |

### Findings

- Blocking findings: `None`.
- Required persisted artifact updates: `None`.

### Applied Updates

- Updated files: `None`.
- New artifact versions: `None`.
- Changed sections: `None`.
- Resolved findings: `N/A`.

### Round Verdict

- Status: `Go Confirmed`
- Clean-review streak state: `Go Confirmed (2/2)`

## Stage 5 Decision

- Gate Decision: `Pass`
- Decision Reason: two consecutive deep-review rounds had no blockers, no required persisted updates, and no newly discovered use cases.
- Next Stage: `6 (Implementation)`

## Re-Entry Round 3 (Deep Review, Requirement-Gap Delta)

### Missing-Use-Case Discovery Sweep

- Requirement delta sweep: `R-012` / `UC-011` added for hard live E2E parity-count criterion.
- Boundary sweep: no new runtime production architecture required; Stage 7 test-surface expansion only.
- Unsupported-path sweep: confirmed Claude adapter/service intentionally rejects tool approvals and inter-agent relay; must be asserted as live negative-path E2E.
- New use cases discovered: `Yes` (`UC-011`).

### Findings

- Blocking findings: `None`.
- Required persisted artifact updates: `implementation-plan.md`, `future-state-runtime-call-stack.md`, `requirements.md` (already updated).

### Applied Updates

- Updated files:
  - `tickets/in-progress/claude-agent-sdk-runtime-support/implementation-plan.md`
  - `tickets/in-progress/claude-agent-sdk-runtime-support/future-state-runtime-call-stack.md`
  - `tickets/in-progress/claude-agent-sdk-runtime-support/requirements.md`
- New artifact versions:
  - `implementation-plan.md` -> `v2`
  - `future-state-runtime-call-stack.md` -> `v2` (added `UC-011`)
- Changed sections:
  - Batch G (Claude live E2E parity expansion)
  - Use-case index + `UC-011` runtime call stack
- Resolved findings: parity requirement now explicitly modeled.

### Round Verdict

- Status: `Candidate Go`
- Clean-review streak state: `Candidate Go (1/2)` (re-entry cycle)

## Re-Entry Round 4 (Deep Review, Confirmation)

### Missing-Use-Case Discovery Sweep

- Re-check requirement coverage: `R-001..R-012` mapped, including parity-count gate.
- Re-check boundary fit: no production decoupling regression introduced by test-only parity expansion.
- Re-check unsupported-path handling: deterministic rejection contracts represented; no fake/synthetic pass criteria.
- New use cases discovered: `No`.

### Findings

- Blocking findings: `None`.
- Required persisted artifact updates: `None`.

### Applied Updates

- Updated files: `None`.
- New artifact versions: `None`.
- Changed sections: `None`.
- Resolved findings: `N/A`.

### Round Verdict

- Status: `Go Confirmed`
- Clean-review streak state: `Go Confirmed (2/2)` (re-entry cycle)

## Re-Entry Stage 5 Decision

- Gate Decision: `Pass`
- Decision Reason: two consecutive clean rounds completed for the re-entry requirement delta with no blockers.
- Next Stage: `6 (Implementation for test parity expansion)`

## Re-Entry Round 5 (Deep Review, Listener-Continuity Delta)

### Missing-Use-Case Discovery Sweep

- Requirement delta sweep: `R-013` adds explicit runtime-listener continuity requirement across terminate->continue.
- Boundary sweep: preferred fix is runtime-service listener lifecycle continuity, avoiding GraphQL-route-specific bridge refresh coupling.
- Risk sweep: if listener continuity is not runtime-level, any non-websocket send path can regress to no-event behavior.
- New use cases discovered: `Yes` (`UC-013`).

### Findings

- Blocking findings: `None`.
- Required persisted artifact updates: `requirements.md`, `implementation-plan.md`, `future-state-runtime-call-stack.md` (updated for `R-013`/`UC-013`).

### Applied Updates

- Updated files:
  - `tickets/in-progress/claude-agent-sdk-runtime-support/requirements.md`
  - `tickets/in-progress/claude-agent-sdk-runtime-support/implementation-plan.md`
  - `tickets/in-progress/claude-agent-sdk-runtime-support/future-state-runtime-call-stack.md`
- New artifact versions:
  - `requirements.md` -> `Design-ready (delta R-013)`
  - `implementation-plan.md` -> `v2 + Batch H`
  - `future-state-runtime-call-stack.md` -> `v1 + UC-013 delta`
- Changed sections:
  - Requirement and acceptance criteria additions (`R-013` / `AC-013`)
  - Batch H runtime-listener continuity plan
  - `UC-013` primary/error paths
- Resolved findings: listener continuity gap is now explicitly modeled.

### Round Verdict

- Status: `Candidate Go`
- Clean-review streak state: `Candidate Go (1/2)` (listener-continuity delta cycle)

## Re-Entry Round 6 (Deep Review, Listener-Continuity Confirmation)

### Missing-Use-Case Discovery Sweep

- Re-check requirement coverage: `R-001..R-013` mapped to use cases.
- Re-check boundary fit: runtime-level continuity approach keeps separation-of-concerns stronger than route-specific refresh patches.
- Re-check regression exposure: Stage 7 live Claude team continuation scenario remains direct executable proof.
- New use cases discovered: `No`.

### Findings

- Blocking findings: `None`.
- Required persisted artifact updates: `None`.

### Applied Updates

- Updated files: `None`.
- New artifact versions: `None`.
- Changed sections: `None`.
- Resolved findings: `N/A`.

### Round Verdict

- Status: `Go Confirmed`
- Clean-review streak state: `Go Confirmed (2/2)` (listener-continuity delta cycle)

## Re-Entry Stage 5 Decision (Listener-Continuity Delta)

- Gate Decision: `Pass`
- Decision Reason: two consecutive clean rounds completed with no blockers and no new required artifact updates.
- Next Stage: `6 (Implementation for listener continuity fix)`

## Re-Entry Round 7 (Deep Review, Claude `send_message_to` Parity Delta)

### Missing-Use-Case Discovery Sweep

- Requirement delta sweep: `R-014`/`AC-014` adds Claude team inter-agent relay tooling parity as mandatory behavior.
- Runtime boundary sweep: relay orchestration must be runtime-neutral (no codex-only hard gate), while runtime-specific tool surfaces stay isolated in runtime services/adapters.
- SDK capability sweep: Claude SDK MCP custom tools (`mcpServers` + in-process SDK MCP server) provides a valid runtime-level integration path for `send_message_to`.
- New use cases discovered: `Yes` (`UC-014`).

### Findings

- Blocking findings: `None`.
- Required persisted artifact updates: `requirements.md`, `implementation-plan.md`, `future-state-runtime-call-stack.md` (already updated in this cycle).

### Applied Updates

- Updated files:
  - `tickets/in-progress/claude-agent-sdk-runtime-support/requirements.md`
  - `tickets/in-progress/claude-agent-sdk-runtime-support/implementation-plan.md`
  - `tickets/in-progress/claude-agent-sdk-runtime-support/future-state-runtime-call-stack.md`
- New artifact versions:
  - `requirements.md` -> `Design-ready (delta R-014/AC-014)`
  - `implementation-plan.md` -> `v3 (Batch I)`
  - `future-state-runtime-call-stack.md` -> `v2 (added UC-014)`
- Changed sections:
  - Claude inter-agent parity requirement/acceptance additions
  - Batch I architecture and verification plan
  - `UC-014` runtime call flow and error branch
- Resolved findings: Claude relay parity flow now explicitly modeled end-to-end.

### Round Verdict

- Status: `Candidate Go`
- Clean-review streak state: `Candidate Go (1/2)` (Claude inter-agent parity cycle)

## Re-Entry Round 8 (Deep Review, Claude `send_message_to` Parity Confirmation)

### Missing-Use-Case Discovery Sweep

- Coverage re-check: `R-001..R-014` mapped, including new Claude relay parity contract.
- Layering/decoupling re-check: runtime-neutral orchestration + runtime-specific MCP tool adapter split remains coherent.
- Risk re-check: no new unresolved use-case gaps after adding `UC-014`; Stage 7 live relay roundtrip remains executable acceptance evidence.
- New use cases discovered: `No`.

### Findings

- Blocking findings: `None`.
- Required persisted artifact updates: `None`.

### Applied Updates

- Updated files: `None`.
- New artifact versions: `None`.
- Changed sections: `None`.
- Resolved findings: `N/A`.

### Round Verdict

- Status: `Go Confirmed`
- Clean-review streak state: `Go Confirmed (2/2)` (Claude inter-agent parity cycle)

## Re-Entry Stage 5 Decision (Claude `send_message_to` Parity Delta)

- Gate Decision: `Pass`
- Decision Reason: two consecutive clean rounds completed with no blockers, no new use cases, and no required persisted artifact updates.
- Next Stage: `6 (Implementation for Claude inter-agent tooling parity)`

## Re-Entry Round 9 (Deep Review, V2-Only Runtime Delta)

### Missing-Use-Case Discovery Sweep

- Requirement delta sweep: `R-015..R-017` add explicit V2-only runtime path, unstable-control interop boundary, and team-instruction injection strategy.
- Boundary sweep: confirmed V2 control access is confined to interop boundary in modeled flow; runtime service does not directly depend on raw internal SDK control members.
- Legacy sweep: modeled flow removes V1 `query()` turn path from active Claude runtime execution.
- New use cases discovered: `Yes` (`UC-015`).

### Findings

- Blocking findings: `None`.
- Required persisted artifact updates: `investigation-notes.md`, `requirements.md`, `proposed-design.md`, `future-state-runtime-call-stack.md` (updated in this cycle).

### Applied Updates

- Updated files:
  - `tickets/in-progress/claude-agent-sdk-runtime-support/investigation-notes.md`
  - `tickets/in-progress/claude-agent-sdk-runtime-support/requirements.md`
  - `tickets/in-progress/claude-agent-sdk-runtime-support/proposed-design.md`
  - `tickets/in-progress/claude-agent-sdk-runtime-support/future-state-runtime-call-stack.md`
- New artifact versions:
  - `proposed-design.md` -> `v2`
  - `future-state-runtime-call-stack.md` -> `v3`
- Changed sections:
  - V2 capability evidence + live probe findings
  - Requirements/AC additions `R-015..R-017` / `AC-015..AC-017`
  - V2-only architecture direction and runtime call stacks
- Resolved findings: V2-only path and unstable-control boundary are now explicitly modeled.

### Round Verdict

- Status: `Candidate Go`
- Clean-review streak state: `Candidate Go (1/2)` (V2-only runtime cycle)

## Re-Entry Round 10 (Deep Review, V2-Only Confirmation)

### Missing-Use-Case Discovery Sweep

- Coverage re-check: `R-001..R-017` are mapped, including V2-only contracts and new acceptance criteria.
- Decoupling re-check: runtime-neutral orchestration remains separate from runtime-specific V2 interop module.
- Legacy re-check: no remaining modeled dependency on V1 `query()` in active Claude turn execution.
- New use cases discovered: `No`.

### Findings

- Blocking findings: `None`.
- Required persisted artifact updates: `None`.

### Applied Updates

- Updated files: `None`.
- New artifact versions: `None`.
- Changed sections: `None`.
- Resolved findings: `N/A`.

### Round Verdict

- Status: `Go Confirmed`
- Clean-review streak state: `Go Confirmed (2/2)` (V2-only runtime cycle)

## Re-Entry Stage 5 Decision (V2-Only Runtime Delta)

- Gate Decision: `Pass`
- Decision Reason: two consecutive clean rounds completed with no blockers, no new use cases, and no required persisted artifact updates.
- Next Stage: `6 (Implementation for V2-only Claude runtime path)`

## Re-Entry Round 11 (Deep Review, Workspace CWD Propagation Delta)

### Missing-Use-Case Discovery Sweep

- Requirement delta sweep: `R-018` / `AC-018` require selected workspace path to be honored for Claude V2 run creation/restore.
- Boundary sweep: confirms workaround must stay in V2 interop boundary; runtime service should only forward workspace path.
- Concurrency sweep: identified race-risk if process cwd is scoped without serialization; requires explicit critical section.
- New use cases discovered: `Yes` (`UC-016`).

### Findings

- Blocking findings: `None`.
- Required persisted artifact updates:
  - `investigation-notes.md`
  - `requirements.md`
  - `implementation-plan.md`
  - `future-state-runtime-call-stack.md`

### Applied Updates

- Updated files:
  - `tickets/in-progress/claude-agent-sdk-runtime-support/investigation-notes.md`
  - `tickets/in-progress/claude-agent-sdk-runtime-support/requirements.md`
  - `tickets/in-progress/claude-agent-sdk-runtime-support/implementation-plan.md`
  - `tickets/in-progress/claude-agent-sdk-runtime-support/future-state-runtime-call-stack.md`
- New artifact versions:
  - `future-state-runtime-call-stack.md` -> `v4`
- Changed sections:
  - Workspace mismatch root-cause evidence against Claude SDK V2 source
  - Requirement/acceptance additions `R-018` / `AC-018`
  - New runtime call stack `UC-016` with serialized cwd scoping
- Resolved findings: workspace propagation is now modeled with explicit isolation/concurrency guardrails.

### Round Verdict

- Status: `Candidate Go`
- Clean-review streak state: `Candidate Go (1/2)` (workspace-cwd cycle)

## Re-Entry Round 12 (Deep Review, Workspace CWD Propagation Confirmation)

### Missing-Use-Case Discovery Sweep

- Coverage re-check: `R-001..R-018` mapped; `UC-016` included in runtime model.
- Decoupling re-check: no orchestration/service-layer SDK-internal leakage; interop owns workaround.
- Concurrency re-check: serialized critical section in model prevents cross-run cwd overlap during session spawn.
- New use cases discovered: `No`.

### Findings

- Blocking findings: `None`.
- Required persisted artifact updates: `None`.

### Applied Updates

- Updated files: `None`.
- New artifact versions: `None`.
- Changed sections: `None`.
- Resolved findings: `N/A`.

### Round Verdict

- Status: `Go Confirmed`
- Clean-review streak state: `Go Confirmed (2/2)` (workspace-cwd cycle)

## Re-Entry Stage 5 Decision (Workspace CWD Propagation Delta)

- Gate Decision: `Pass`
- Decision Reason: two consecutive clean rounds completed with no blockers, no newly discovered use cases, and no required persisted artifact updates.
- Next Stage: `6 (Implementation for workspace cwd propagation hardening)`

## Re-Entry Round 7 (Deep Review, Streaming-Cadence Delta)

### Missing-Use-Case Discovery Sweep

- Requirement delta sweep: `R-020` / `AC-020` adds explicit incremental stream cadence contract.
- Boundary sweep: fix boundary remains Claude normalizer/runtime event shaping; no frontend protocol branching.
- Fallback/error sweep: explicit no-op behavior retained for chunks without usable delta/fallback text.
- New use cases discovered: `Yes` (`UC-018`).

### Findings

- Blocking findings: `None`.
- Required persisted artifact updates: `requirements.md`, `proposed-design.md`, `future-state-runtime-call-stack.md`.

### Applied Updates

- Updated files:
  - `tickets/in-progress/claude-agent-sdk-runtime-support/requirements.md`
  - `tickets/in-progress/claude-agent-sdk-runtime-support/proposed-design.md`
  - `tickets/in-progress/claude-agent-sdk-runtime-support/future-state-runtime-call-stack.md`
- New artifact versions:
  - `requirements.md` -> `Design-ready (delta R-020/AC-020)`
  - `future-state-runtime-call-stack.md` -> `v3 + UC-018 delta`
- Changed sections:
  - `UC-018` addition and `UC-002` normalization precedence step
  - Re-entry design delta section for streaming cadence
- Resolved findings: streaming-cadence scope is now explicitly modeled.

### Round Verdict

- Status: `Candidate Go`
- Clean-review streak state: `Candidate Go (1/2)` (streaming-cadence delta cycle)

## Re-Entry Round 8 (Deep Review, Streaming-Cadence Confirmation)

### Missing-Use-Case Discovery Sweep

- Requirement coverage re-check: `R-001..R-020` mapped to call-stack use cases.
- Boundary re-check: runtime-neutral layers unchanged; Claude-specific behavior isolated.
- Fallback/error re-check: no synthetic chunk-splitting or client-side hacks introduced in model.
- New use cases discovered: `No`.

### Findings

- Blocking findings: `None`.
- Required persisted artifact updates: `None`.

### Applied Updates

- Updated files: `None`.
- New artifact versions: `None`.
- Changed sections: `None`.
- Resolved findings: `N/A`.

### Round Verdict

- Status: `Go Confirmed`
- Clean-review streak state: `Go Confirmed (2/2)` (streaming-cadence delta cycle)

## Re-Entry Stage 5 Decision (Streaming-Cadence Delta)

- Gate Decision: `Pass`
- Decision Reason: two consecutive clean rounds completed for streaming-cadence delta with no blockers and no additional persisted updates required.
- Next Stage: `6 (Implementation for Claude stream cadence fix)`
