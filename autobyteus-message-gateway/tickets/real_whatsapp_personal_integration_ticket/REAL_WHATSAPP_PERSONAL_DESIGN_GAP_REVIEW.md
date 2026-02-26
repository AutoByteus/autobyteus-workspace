# Design Gap Review (Gateway Real WhatsApp Personal)

## Review Scope
- Design file: `REAL_WHATSAPP_PERSONAL_DESIGN.md`
- Runtime simulation file: `REAL_WHATSAPP_PERSONAL_RUNTIME_SIMULATION.md`

## Review Method
- Inspect each use-case call stack as if stepping through debug traces.
- Verify one-concern-per-file discipline.
- Check boundary clarity (route/service/adapter/client/store).
- Check end-to-end completeness for each use case.

## Findings

### 1. Mock-production confusion removed
- Previous smell: production route depended on simulated adapter behavior.
- Resolution: dedicated SDK client wrapper + credential store + mapper layers.
- Verdict: clean separation restored.

### 2. API contract mismatch fixed in design
- Previous smell: gateway session DTO and web store DTO did not match (`qr` vs `code`, `READY` vs `ACTIVE`).
- Resolution: explicit canonical DTO and status contract with temporary compatibility field.
- Verdict: clean contract boundary.

### 3. Provider transport collision risk controlled
- Previous smell: potential ambiguity between WhatsApp business and personal outbound routing.
- Resolution: strict `(provider, transport)` adapter key.
- Verdict: clean dispatch ownership.

### 4. Callback route contract mismatch corrected
- Previous smell: runtime simulation used a non-existent callback path.
- Resolution: aligned runtime/design to `POST /api/server-callback/v1/messages`.
- Verdict: cross-project callback contract is now consistent.

### 5. Inbound forward failure semantics clarified
- Previous smell: runtime simulation incorrectly implied no-data-loss guarantees on ingress-forward failure.
- Resolution: design now explicitly marks this as transient failure with telemetry only (no durable replay queue in phase 1).
- Verdict: behavior is now explicit and non-contradictory.

### 6. Remaining ambiguity removed via locked defaults
- Previous smell: phase-1 scope still left multi-account and SDK pinning undecided.
- Resolution: locked single-session phase-1 scope and explicit SDK-boundary/version-pinning strategy.
- Verdict: implementation handoff is decision-complete.

## Use-Case Cleanliness Verdict

| Use Case | End-to-End Complete | Separation Of Concerns | Boundary Clarity | Major Smell | Verdict |
| --- | --- | --- | --- | --- | --- |
| Start session + QR | Yes | Yes | Yes | No | Pass |
| Inbound DM forward | Yes | Yes | Yes | No | Pass |
| Outbound reply send | Yes | Yes | Yes | No | Pass |
| Restart recovery | Yes | Yes | Yes | No | Pass |

## Remaining Risks (Non-Structural)
- Personal WhatsApp mode depends on third-party session SDK behavior changes.
- Compliance/terms constraints for personal mode must be documented for users.
- Production hardening still needs runtime metrics/alert thresholds during implementation.

## Final Decision
Design is clean enough to proceed to implementation for real personal WhatsApp integration.
