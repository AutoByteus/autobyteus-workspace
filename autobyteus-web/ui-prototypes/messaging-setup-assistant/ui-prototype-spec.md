# Messaging Setup Assistant Prototype Spec (WhatsApp Flow)

## Scope
- Platform: web
- Flow: `whatsapp-setup`
- Fidelity: high
- Simulation mode: click-through
- Aspect ratio: 4:3
- Provider scope in this package: WhatsApp Personal only

## Why This Revision
This revision aligns prototype behavior with actual frontend runtime behavior from:
- `/Users/normy/autobyteus_org/autobyteus-web/components/settings/ExternalMessagingManager.vue`
- `/Users/normy/autobyteus_org/autobyteus-web/components/settings/externalMessaging/GatewayConnectionCard.vue`
- `/Users/normy/autobyteus_org/autobyteus-web/components/settings/externalMessaging/PersonalSessionSetupCard.vue`
- `/Users/normy/autobyteus_org/autobyteus-web/components/settings/externalMessaging/ChannelBindingSetupCard.vue`
- `/Users/normy/autobyteus_org/autobyteus-web/components/settings/externalMessaging/SetupVerificationCard.vue`
- `/Users/normy/autobyteus_org/autobyteus-web/stores/gatewaySessionSetupStore.ts`
- `/Users/normy/autobyteus_org/autobyteus-web/stores/externalMessagingSetupStore.ts`

## Runtime-Accurate WhatsApp Flow
1. User opens `Settings > Messaging` with WhatsApp provider selected.
2. User validates gateway connection (`Validate Connection`).
3. Gateway enters checking/loading state, then `READY` on healthy response.
4. Session setup starts (`Start Session`).
5. Session can enter `PENDING_QR`; QR may be unavailable initially (`SESSION_QR_NOT_READY`).
6. User refreshes QR/status until QR is available and device scans it.
7. Session reaches `ACTIVE`.
8. User configures and saves channel binding.
9. User runs setup verification.
10. Verification returns either:
   - `READY` (all done), or
   - `BLOCKED` with actionable error (example: inactive AGENT runtime).

## Design Intent
- Keep existing approved shell style and left navigation.
- Keep wording as `Messaging`.
- Preserve provider cards and guided stepper.
- Show one dominant next action per state.

## Deliverables
- Images: `/Users/normy/autobyteus_org/autobyteus-web/ui-prototypes/messaging-setup-assistant/images/web/whatsapp-setup/*.png`
- Prompts: `/Users/normy/autobyteus_org/autobyteus-web/ui-prototypes/messaging-setup-assistant/prompts/web/whatsapp-setup/*.md`
- Flow map: `/Users/normy/autobyteus_org/autobyteus-web/ui-prototypes/messaging-setup-assistant/flow-maps/web/whatsapp-setup.json`
- Viewer: `/Users/normy/autobyteus_org/autobyteus-web/ui-prototypes/messaging-setup-assistant/viewer/web/whatsapp-setup/`
