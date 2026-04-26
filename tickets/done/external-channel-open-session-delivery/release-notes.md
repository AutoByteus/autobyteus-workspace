# Release Notes — External Channel Open Session Delivery

- External messaging channels now keep delivering eligible output from the active bound run instead of stopping after the first inbound-message reply.
- Team bindings now deliver coordinator or entry-node follow-up responses back to Telegram/external channels even when the follow-up was triggered by an internal team-member handoff and the user did not send another message.
- Worker-only/internal team coordination messages remain private and are not sent to the external peer.
- External-channel delivery records are durable and once-only per route/run/turn, improving restart recovery and duplicate protection.
- Message gateway ingress handling now recognizes server `ACCEPTED` responses as completed accepted work, avoiding stale retry behavior from the old routed-status contract.
