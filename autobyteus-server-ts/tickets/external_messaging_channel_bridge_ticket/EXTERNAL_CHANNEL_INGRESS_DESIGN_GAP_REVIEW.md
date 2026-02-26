# Design Gap Review (External Channel Ingress - Server TS)

## Review Input
- `/Users/normy/autobyteus_org/autobyteus-server-ts/tickets/external_messaging_channel_bridge_ticket/EXTERNAL_CHANNEL_INGRESS_DESIGN.md`
- `/Users/normy/autobyteus_org/autobyteus-server-ts/tickets/external_messaging_channel_bridge_ticket/EXTERNAL_CHANNEL_INGRESS_RUNTIME_SIMULATION.md`

## Iteration Summary
- Review mode: debug-style runtime call-stack inspection per use case (UC1-UC6).
- Validation focus:
  - end-to-end functional fulfillment at design level,
  - separation of concerns per file/module,
  - boundary clarity and dependency flow quality,
  - smell/gap detection before implementation continuation.

## Resolved Gaps

| Gap | Resolution In Design | Runtime Simulation Impact | Status |
| --- | --- | --- | --- |
| Runtime facade API mismatch (`sendTo*` vs generic dispatch) | standardized on `dispatchToBinding(...)` in design and explicit implementation file `default-channel-runtime-facade.ts` | UC1/UC2/UC5 stacks now use consistent frame names | Resolved |
| Callback-source ownership ambiguity | callback path now reads source context through `channel-message-receipt-service` + provider boundary | UC3 stack has clear source lookup ownership and no leaky provider cross-usage | Resolved |
| Missing explicit tool-approval event bridge boundary | added `tool-approval-requested-subscriber.ts` to design | UC4 has concrete entry frame and clean policy-service boundary | Resolved |
| Runtime responsibility creep for approval commands | split approval command boundary into `channel-runtime-approval-port.ts` instead of overloading dispatch facade | UC4 stack now isolates approval command from dispatch concern | Resolved |
| Binding lookup API ownership ambiguity in callback path | added `findBindingByDispatchTarget(...)` to `channel-binding-service` public API list | UC3 stack API now matches service-level contract | Resolved |
| Incomplete per-use-case verification format | runtime doc updated to template with per-use-case verification checklist | all UC sections now include explicit Yes/No verification rows | Resolved |
| Missing explicit design-level end-to-end statement | added `Use-Case Fulfillment Matrix (Design-Level)` and `Design Iteration Verdict` | each UC has a documented complete path in design | Resolved |
| Route wiring ambiguity (configured vs unconfigured dependencies) | added explicit dependency-composer file and updated route registration contract in design (`default-channel-ingress-route-dependencies.ts`) | UC1 path now reflects deterministic production wiring boundary | Resolved |
| Delivery-event callback key contract ambiguity | documented callback-key resolution order in design and added dedicated runtime simulation use case for delivery-event ingestion | UC6 now validates end-to-end lifecycle recording path and parse-boundary error handling (`INVALID_INPUT` on blank `correlationMessageId`) | Resolved |
| Signature policy ambiguity for local/dev deployments | documented conditional signature enforcement rule (enforced when secret exists, bypassed when unset) | UC1 and UC6 fallback paths now include deterministic auth bypass branch | Resolved |

## Current Separation-of-Concern Verdict
- Route + middleware concern is isolated from orchestration.
- Orchestration services are isolated from persistence providers.
- Runtime manager interaction is isolated behind runtime facade boundary.
- Runtime approval command publication is isolated behind a dedicated approval port boundary.
- Event subscribers are isolated entry boundaries for async runtime events.
- Delivery/callback/idempotency concerns are decomposed into separate services.
- Route dependency composition concern is isolated from route transport/auth mapping concerns.
- External-channel source context remains memory-first and independent from `agent-conversation`.

## Remaining Blocking Gaps
- None at design/runtime-simulation level for Phase 1.

## Residual Non-Blocking Notes
- Full executable end-to-end behavior remains implementation-dependent (route wiring, concrete SQL providers, subscribers, callback transport client).
- This is expected and tracked in implementation plan/progress artifacts.
