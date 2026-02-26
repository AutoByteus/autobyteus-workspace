# Design Gap Review (Server Real WhatsApp Support)

## Review Scope
- `EXTERNAL_CHANNEL_REAL_WHATSAPP_DESIGN.md`
- `EXTERNAL_CHANNEL_REAL_WHATSAPP_RUNTIME_SIMULATION.md`

## Findings

### 1. Memory-first constraint is preserved
- External-channel modules store only routing/source/delivery metadata.
- Runtime simulation does not require `agent-conversation` persistence.
- Verdict: clean and aligned with current architecture intent.

### 2. Callback source lookup gap identified and closed in design
- Previous gap: callback source retrieval primarily keyed by `agentId`.
- Risk: team dispatch path may lack callback source context.
- Design fix: add dispatch-target source lookup (`agentId`/`teamId`).
- Verdict: resolved.

### 3. Setup API exposure gap identified
- Previous gap: web setup relies on capability/binding GraphQL APIs that are not yet registered in schema.
- Design fix: add dedicated setup resolver and schema wiring.
- Runtime validation status: implemented and verified.
- Verification evidence:
  - resolver present at `/src/api/graphql/types/external-channel-setup.ts`
  - resolver registered in `/src/api/graphql/schema.ts`
  - GraphQL e2e tests pass for setup lifecycle
  - external-channel unit/integration/e2e suites pass (81 tests)
  - live GraphQL introspection shows all four setup fields
- Verdict: resolved.

### 4. Design/runtime API contradiction removed and implemented
- Previous gap: runtime simulation used `getLatestSourceByDispatchTarget` while file-level API table still exposed only `getLatestSourceByAgentId`.
- Design fix: locked dispatch-target lookup as preferred API, with agent-id lookup retained as compatibility fallback.
- Runtime validation status: implemented in receipt service/provider and consumed by callback service with compatibility fallback.
- Verification evidence:
  - `channel-message-receipt-service.ts` exposes `getLatestSourceByDispatchTarget`
  - `sql-channel-message-receipt-provider.ts` implements dispatch-target lookup
  - `reply-callback-service.ts` uses dispatch-target lookup first and falls back to agent lookup
  - targeted unit/integration tests pass
- Verdict: resolved.

### 5. Callback fallback trace simplified
- Previous smell: compatibility fallback and error branch were split into redundant trace blocks.
- Design fix: merged into one deterministic fallback branch with explicit success/null outcomes.
- Verdict: runtime stack readability improved.

## Use-Case Cleanliness Verdict (Design Target vs Current Runtime)

| Use Case | Design Completeness | Current Runtime Completeness | Separation Of Concerns | Boundary Clarity | Major Smell | Verdict |
| --- | --- | --- | --- | --- | --- |
| Inbound personal dispatch | Yes | Yes | Yes | Yes | No | Pass |
| Assistant callback publish | Yes | Yes | Yes | Yes | No | Pass |
| Delivery-event updates | Yes | Yes | Yes | Yes | No | Pass |
| Setup capability + binding CRUD | Yes | Yes | Yes | Yes | No | Pass |

## Remaining Risks / Gaps
- Role-specific binding authorization is deferred to a hardening ticket; phase-1 relies on existing authenticated GraphQL admin boundary.
- No blocking functional gaps remain for server-side setup APIs.

## Final Decision
Design direction is sound and runtime validation now confirms implementation alignment for in-scope use cases.
