## Fixes
- Fixed Kimi `kimi-k2.7-code-highspeed` request construction so factory-created runs send provider-valid K2.7 fixed sampling values instead of the generic temperature default.
- Preserved `kimi-k2.7-code` and `kimi-k2.7-code-highspeed` as distinct official Kimi model IDs while sharing one K2.7 Code policy for fixed constraints.
- Fixed raw run `llmConfig` composition so missing fields do not override model defaults, standard keys are handled as first-class config, and provider-specific extras still pass through safely.
