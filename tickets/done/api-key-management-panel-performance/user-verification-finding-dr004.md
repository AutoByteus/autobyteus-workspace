# User Verification Finding — Alibaba Cloud Custom Provider Models Unavailable

## Delivery Revision

`DR-004 — Resolved as external authentication; cosmetic presentation defect accepted for deferral.`

## User Observation

The user is currently running the DR-003 Electron package built from integrated merge `80308fb50884f67cdc29b30eabad1213a9a15f2e` with latest tracked base `origin/personal@a00f0d07d00450785c424b6ab79d2ca8fe828869`.

In **Settings -> API Keys**, selecting the configured custom provider shows:

- provider name: `alibaba_cloud`;
- provider type: `OPENAI_COMPATIBLE`;
- configured base URL: `https://token-plan.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1`;
- credential status: `Configured`;
- model count label: `null models`;
- model state: `Models unavailable — Could not load models. Your provider credentials remain available.`;
- available action: `Retry`.

Screenshot:

`/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_915e4b79d07545dcb15945824cf92e41/delivery_engineer_fba919f34f424f63abb8d4c5eee07865/context_files/ctx_6b0da2f081ce__image.png`

## Requested Investigation

Determine, with evidence, whether the unavailable catalog is caused by:

1. an AutoByteus implementation defect in custom-provider discovery, endpoint construction, authentication, response parsing, persistence, or Electron/server integration;
2. an Alibaba Cloud endpoint/API capability, region, authorization, account entitlement, or response-contract issue;
3. a user configuration problem such as an endpoint that supports inference but not OpenAI-compatible model listing; or
4. a requirement/design gap in how custom OpenAI-compatible providers without a working `/models` API should be represented or configured.

The visible `null models` label should also be assessed independently: even if Alibaba model discovery is externally unavailable, determine whether exposing `null` is a product/UI defect.

## Investigation Constraints

- Do not expose, copy, or request the user's plaintext Alibaba credential in a durable artifact.
- Prefer existing sanitized Electron/server logs, code-path inspection, and capability-safe reproduction.
- The authoritative `API-REV-003` result passed deterministic local custom-provider protocols, but optional live real-provider success was not run where credentials/capabilities were unavailable. Therefore the prior pass does not classify this live-provider observation.
- Electron packaging and bundled server/native runtime passed DR-003 structural verification; GUI behavior is now direct user evidence.

## Solution-Design Disposition (`SR-008`)

Solution design completed a source inspection and secret-safe live probe:

- Alibaba's official Singapore Token Plan base URL was configured correctly.
- The stored secret was confirmed only as nonempty and belonging to the documented Token Plan key class; no plaintext value, suffix, Authorization header, or secret-bearing response body was recorded.
- Authenticated exact `GET /models` returned `401 InvalidApiKey`.
- A safe non-inference `GET /chat/completions` control returned the same `401 invalid_api_key` authentication rejection.
- The common authentication failure controls out an AutoByteus-only model-list endpoint construction or response-parser defect for the observed state.

Final classification:

1. **Model-unavailable observation:** Alibaba Cloud credential/account authorization rejection. A valid paired credential is still needed before Token Plan `/models` capability can be assessed.
2. **`null models` label:** bounded AutoByteus presentation defect caused by interpolating the nullable count sentinel; unrelated to discovery failure.
3. **User disposition:** cosmetic defect explicitly accepted for deferral; no code/product update requested. The user authorizes repository finalization and release.

No requirements, design, source, test, persistence, migration, or compatibility update is required. No architecture/implementation/code-review/API-E2E reroute applies.

Evidence: `solution-revision-record.md` (`SR-008`), `investigation-notes.md`, and `validation-evidence/solution-dr004-sanitized-live-probe.log`.
