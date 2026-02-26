# Design Gap Review (Web Setup For Real WhatsApp Personal)

## Review Scope
- `EXTERNAL_MESSAGING_SETUP_REAL_WHATSAPP_DESIGN.md`
- `EXTERNAL_MESSAGING_SETUP_REAL_WHATSAPP_RUNTIME_SIMULATION.md`

## Findings

### 1. Setup-only scope remains clean
- UI responsibilities remain onboarding/configuration only.
- No monitoring concern leaked into setup files.
- Verdict: clean separation retained.

### 2. Contract and ownership boundaries are now decision-complete
- Gateway REST boundary, error contracts, and session attach semantics are explicitly owned by client/store layers.
- Runtime stacks no longer rely on undefined files/modules.
- Verdict: boundary ownership is clear and stable.

### 3. Existing-session attach flow design is resolved
- `SESSION_ALREADY_RUNNING` contract is now first-class in design.
- Store-level `attachToExistingSession(...)` keeps control flow inside session store concern.
- Verdict: no remaining call-stack ambiguity.

### 4. Scannable QR rendering concern is isolated
- Dedicated QR service + render component removes UI/service mixing.
- Personal session card remains orchestration-only.
- Verdict: separation of concerns is preserved.

### 5. Checklist semantics are explicit
- Pre-session state maps to `PENDING`, not `BLOCKED`.
- BLOCKED is reserved for explicit error conditions.
- Verdict: setup progression semantics are clean and predictable.

### 6. Runtime simulation completeness is now aligned
- Use-case index now matches the documented use-case set.
- QR-expiry (`410 SESSION_QR_EXPIRED`) recovery branch is explicitly simulated.
- Verdict: no missing business-path branch in runtime artifact.

### 7. Stale QR persistence gap discovered and resolved
- Previous gap: `gatewaySessionSetupStore.ts:fetchPersonalSessionStatus(...)` could retain old QR even after status became `STOPPED` or `ACTIVE`, causing misleading UI.
- Design/runtime refinement:
  - lock status-aware QR lifecycle rule (`qr` renderable only while `PENDING_QR`);
  - add explicit runtime call-stack case for stale-QR cleanup.
- Implementation evidence:
  - `gatewaySessionSetupStore.ts` uses status-aware merge helper (`mergeSessionWithStatusAwareQr`);
  - focused store tests cover stale-QR cleanup on status transition.
- Verdict: resolved without cross-layer concern leakage.

### 8. Manual-only status transition is a UX/design gap (resolved at design level)
- Previous gap: UI required operator click on `Refresh Status` to observe `PENDING_QR -> ACTIVE`, even when gateway session was already active.
- Design/runtime refinement:
  - make session status auto-sync store-owned (`startSessionStatusAutoSync` / `stopSessionStatusAutoSync`);
  - isolate timing/retry policy into `personalSessionStatusSyncPolicy.ts`;
  - keep manual refresh as fallback only.
- Runtime simulation evidence:
  - new primary flow for auto-sync to `ACTIVE`;
  - explicit fallback for retry-budget exhaustion and manual refresh recovery.
- Verdict: design clean; implementation pending in next coding iteration.

### 9. Auto-sync runtime completeness gap found and resolved in simulation
- Gap found during re-verification:
  - existing-session attach call stack did not explicitly restart auto-sync;
  - stale-QR cleanup case was modeled only through manual refresh entry, not auto-sync tick;
  - fallback resume behavior was phrased as operator choice instead of deterministic store policy;
  - lifecycle cleanup on view unmount/session stop was not represented as an explicit use case.
- Refinements applied:
  - add `startSessionStatusAutoSync(sessionId)` step in existing-session attach flow;
  - make stale-QR cleanup primary path run through auto-sync polling loop;
  - lock manual-refresh fallback to deterministic auto-resume for `PENDING_QR`/`DEGRADED`;
  - add new use case for auto-sync lifecycle cleanup on unmount/stop.
- Verdict: runtime simulation now matches design ownership and lifecycle boundaries.

### 10. Implementation parity gap closed (design/runtime vs current code)
- Implementation evidence:
  - `gatewaySessionSetupStore.ts` now implements `startSessionStatusAutoSync` / `stopSessionStatusAutoSync` plus bounded polling loop behavior;
  - `services/sessionSync/personalSessionStatusSyncPolicy.ts` now exists as dedicated timing/retry policy boundary;
  - `ExternalMessagingManager.vue` now stops auto-sync on unmount for lifecycle-safe cleanup;
  - store tests cover auto-sync start, terminal stop, retry-budget pause, manual-resume, and stop cleanup behavior.
- Verdict: parity closed with clean boundaries and no new coupling smell.

## Use-Case Cleanliness Verdict

| Use Case | End-to-End Complete | Separation Of Concerns | Boundary Clarity | Major Smell | Verdict |
| --- | --- | --- | --- | --- | --- |
| Gateway validation | Yes | Yes | Yes | No | Pass |
| Personal QR onboarding | Yes | Yes | Yes | No | Pass |
| Existing-session attach | Yes | Yes | Yes | No | Pass |
| Personal-mode-disabled handling | Yes | Yes | Yes | No | Pass |
| Scannable QR rendering | Yes | Yes | Yes | No | Pass |
| Status activation flow | Yes | Yes | Yes | No | Pass |
| Binding + verification | Yes | Yes | Yes | No | Pass |
| Initial checklist semantics | Yes | Yes | Yes | No | Pass |
| Status-aware QR cleanup | Yes | Yes | Yes | No | Pass |
| Auto-sync to ACTIVE | Yes | Yes | Yes | No | Pass (design) |
| Manual refresh fallback | Yes | Yes | Yes | No | Pass (design) |
| Auto-sync lifecycle cleanup | Yes | Yes | Yes | No | Pass (design) |
| Design-to-code parity (auto-sync APIs/policy) | Yes | Yes | Yes | No | Pass |

## Remaining Risks (Non-Structural)
- UX depends on server GraphQL setup APIs being deployed.
- Personal-mode policy caveats should be clearly displayed in onboarding copy.

## Final Decision
Design and runtime simulation are clean and complete for the next implementation iteration of web-only personal WhatsApp setup.  
All in-scope setup use cases now have complete call stacks with explicit ownership and no structural design smell.  
Design-to-code parity for the auto-sync lifecycle is now closed.
