# Requirements — GPT-6 Sol/Luna and Claude Opus 5.5

## Status and authority

- Package: `new-models-gpt6-opus55`; Solution Designer; 2026-09-23.
- Status: **Approved** for architecture design.
- Approved baseline: `SR-002` (revises SR-001 to include the Claude SDK freshness check and coordinated upgrades). Approval reference: user reply on 2026-09-23, “do you think you can start to work on it now? are we using the messages api for claude?”, directly following the request to approve SR-002 including both SDKs; Solution Designer explicitly interpreted it as approval in the next message without correction. This authorizes the presented SR-002 behavior, not new scope.
- Behavior-defining supplements: N/A. The three screenshots are input evidence, not a separate normative specification.

## Problem and desired outcome

The direct-API catalog already supports `gpt-6-astra` but not newly released `gpt-6-sol`, `gpt-6-luna`, or `claude-opus-5-5`. Users should be able to select and use the new exact API IDs through existing Autobyteus runtime paths, with valid provider requests, current metadata and Standard token-price accounting. The Codex runtime uses dynamic discovery rather than this static catalog; its GPT-6 path should be verified with real locally authenticated turns for the advertised models. The user also asked to check and update the Claude SDK; investigation found both the Claude Agent SDK and Anthropic API SDK behind their stable registry latest. This revised proposal upgrades both related SDKs together, with compatibility validation. OpenAI and Anthropic direct API keys are unavailable, so live direct-API success must not be claimed; deterministic unit/contract tests are required.

## Current, desired and preserved behavior

| Behavior | Kind / scenario | Evidence-backed current | Desired | Preserved | Evidence |
| --- | --- | --- | --- | --- | --- |
| BEH-001 | User/System; SCN-001 | Autobyteus static catalog has Astra, not Sol/Luna; OpenAI requests use Responses API. | Exact Sol/Luna IDs listed and usable with valid reasoning/tool request settings. | Astra and older OpenAI IDs/configurations. | I-01, I-04, I-05 |
| BEH-002 | User/System; SCN-002 | Anthropic catalog has Opus 5 but not 5.5; prefix request policy partially covers 5.5, tool-turn compatibility unverified. | Exact Opus 5.5 ID listed and usable for simple and existing agent/tool-turn paths under its restrictions. | Existing Anthropic models and supported behaviors. | I-02, I-04, I-06 |
| BEH-003 | System; SCN-003 | Cost estimates use catalog prices; missing model price is not trusted. | New direct-API models have documented Standard base/cache/tier rates. | Historical snapshots, older prices and missing-price semantics. | I-01, I-02, I-07 |
| BEH-004 | User/Operational; SCN-004 | Codex models and capabilities come from live `model/list`; selected ID passes to `thread/start` and `turn/start`. | Each of Astra, Sol and Luna that is advertised to the local Codex account remains selectable and completes a real Codex smoke turn. | Dynamic discovery, no static Codex alias/fallback. | I-03, I-08 |
| BEH-005 | Operational; SCN-005 | Prior models have tests; no direct provider keys now. | No-key API/Autobyteus tests plus a real Codex validation attempt and honest result. | No invented credentials or unverified live API claim. | User request, I-09 |
| BEH-006 | Operational/System; SCN-006 | Server pins Claude Agent SDK `0.3.231`; server and shared library pin Anthropic API SDK `0.116.0`. Neither is current stable. | Upgrade both to the stable latest resolved at implementation time, pin exact versions, and preserve supported Claude Agent SDK and direct-API behavior. | Existing Claude runtime auth, model discovery, sessions, tools, interrupts, events and direct-API paths. | User follow-up, I-11/I-12 |

## Stakeholders and scope guardrail

Agent operators need selectable, working exact models; usage viewers need trustworthy Standard estimates; maintainers need credential-aware evidence. Provider account entitlement still governs access.

- UC-001: Select and use GPT-6 Sol/Luna through existing Autobyteus direct OpenAI API runtime. Astra is a regression baseline, not a new model registration.
- UC-002: Select and use Claude Opus 5.5 through existing Autobyteus direct Anthropic API runtime, including an existing agent/tool-turn path.
- UC-003: Inspect correct metadata and Standard token-usage pricing for new direct-API rows.
- UC-004: Select and execute a provider-advertised GPT-6 model through existing Codex App Server runtime.
- UC-005: Validate under the stated credential limitations.
- UC-006: Maintain the existing Claude Agent SDK runtime and direct Anthropic API client on current stable SDK versions without regressing their supported integration contracts.
- **Out of scope:** unreleased Sonnet/Haiku 5.5; aliases not official API IDs; changing defaults; new GPT-6 platform features such as async tools or mid-turn steering; new Anthropic beta features/Fast mode/computer toolset migration not already in a supported journey; Bedrock/Vertex/Foundry direct integrations; static replacement of dynamic Claude Agent SDK or Codex catalogs; unrelated dependency upgrades; new UI design; performance benchmarks; live OpenAI/Anthropic billing proof without keys.
- **Preserved boundary:** Existing IDs, run configurations, successful legacy requests, Claude Agent SDK auth/session/tool/interrupt/event behavior, dynamic runtime discovery, historical usage/pricing snapshots and missing-price handling are not rewritten. No data migration is presumed.
- **Review authority:** A blocking design/implementation finding must cite an approved REQ/AC/preserved BEH. A new policy or behavior is a Requirement Gap requiring renewed user approval; reviewer suggestions alone are not authoritative.

## Requirements and acceptance criteria

| Requirement | Intended behavior / source | Acceptance criteria |
| --- | --- | --- |
| REQ-001 | Exact Sol/Luna direct-API catalog and valid Responses requests per [OpenAI catalog](https://developers.openai.com/api/docs/models) and [GPT-6 guide](https://developers.openai.com/api/docs/guides/latest-model). | AC-001: Each appears once with exact ID, 1.05M context, 128k output, `none/low/medium/high/xhigh/max` reasoning options and medium default; Astra remains once without `none`. AC-002: Mocked send/stream payloads use exact IDs, Responses reasoning shape and established tool/usage semantics; shorthand IDs are not silently aliased. |
| REQ-002 | Exact Opus 5.5 direct-API catalog and provider-valid simple/tool turns per [Anthropic model page](https://platform.claude.com/docs/en/models/opus-5-5/overview) and [breaking changes](https://platform.claude.com/docs/en/models/opus-5-5/whats-new-opus-5-5). | AC-003: One `claude-opus-5-5` row has 1M context/input and 128k output; Opus 5 remains. No unsupported disabled/manual thinking, sampling or forced `tool_choice` reaches Opus 5.5. AC-004: Mocked simple and representative agent/tool-turn send/stream paths satisfy adaptive-thinking and replay requirements; outputs/usage are consumable. Explicit unsupported user options fail clearly or normalize only in a documented behavior-preserving way. |
| REQ-003 | Documented Standard new-model pricing without changing old rates; [OpenAI pricing](https://developers.openai.com/api/docs/pricing), [Anthropic pricing](https://platform.claude.com/docs/en/models/opus-5-5/overview). | AC-005: Sol $2/$10, cached read $0.20, write $2.50; Luna $0.10/$0.50, cached read $0.01, write $0.125 per MTok. For >272k input, the **full request** uses 2x input/cache and 1.5x output. Opus 5.5 is $4/$20, cached read $0.20, 5m write $5, 1h write $8. Pricing tests show trusted status when complete and missing/partial status for missing dimensions, not fabricated zero. |
| REQ-004 | Preserve provider-discovered Codex model IDs/capabilities; verify each locally advertised GPT-6 Astra, Sol and Luna in a real smoke run. | AC-006: Each advertised GPT-6 ID and its efforts/tiers propagate through catalog/GraphQL/launch to `thread/start` and `turn/start`; a minimal locally authenticated turn completes for each. If one is not advertised or access fails, report that model's precise blocker, not a mock pass or hidden fallback. |
| REQ-005 | Credential-aware verification. | AC-007: Deterministic no-key OpenAI/Anthropic payload and Autobyteus-runtime unit/contract tests pass; real Codex test is attempted and outcome reported. Direct API live validation is marked Not Run (no keys). |
| REQ-006 | Preserve prior behavior and stored identities. | AC-008: Existing catalog entries, persisted run IDs/configs and historical pricing snapshots remain readable; no repricing or rewrite. |
| REQ-007 | Upgrade both Anthropic-maintained TypeScript SDK packages used by the product to the latest stable versions available at implementation time, pin exact versions, and adapt only affected integration code. | AC-009: Dependency manifests and lockfile resolve one current stable `@anthropic-ai/claude-agent-sdk` version for the server and one current stable `@anthropic-ai/sdk` version for the server/shared library; no prerelease or floating `latest` range. AC-010: Builds and focused no-key regression tests pass for Claude SDK model discovery, launch/resume, tools/permission, streaming/usage, interrupts and direct Anthropic API payloads; any live Claude-runtime test is attempted only if local auth is available and its result is reported separately. |

## Supported scenarios

| Scenario | Actor / goal / supported trigger | Product-level sequence and outcome | Alternate | Validity / evidence |
| --- | --- | --- | --- | --- |
| SCN-001 | User wants OpenAI model; selects Sol/Luna with provider configured. | Select, launch, receive response/stream and usage. | Normal credential/entitlement error. | Supported Normal Scenario: existing selector/Responses path and OpenAI docs; REQ-001, AC-001/002. |
| SCN-002 | User wants Opus 5.5; selects it with Anthropic configured. | Launch simple turn or agent tool cycle; receive response/tool continuation and usage. | Normal credential/entitlement error; invalid explicit option handled clearly. | Supported Normal Scenario: existing Anthropic agent path and Anthropic docs; REQ-002, AC-003/004. |
| SCN-003 | System receives new-model usage. | Resolve catalog price; persist/display documented Standard estimate and snapshot. | Missing dimensions remain visible. | Supported Normal Scenario: existing usage meter; REQ-003, AC-005. |
| SCN-004 | Codex user chooses a model advertised by local Codex. | Discover, configure, launch, complete turn. | Model unavailable to account/transport reported. | Supported Normal Scenario: dynamic Codex path and screenshot; REQ-004, AC-006. |
| SCN-005 | Maintainer validates without direct keys. | Run no-key contract tests and local authenticated Codex test. | Access blocker reported honestly. | Supported Explicit Edge Scenario: user constraint; REQ-005, AC-007. |
| SCN-006 | Maintainer responds to new provider release and user SDK-update request. | Check registry stable tags, update pinned Claude Agent SDK and Anthropic API SDK, run supported integration regressions. | If latest breaks a supported contract, report and resolve the incompatibility rather than silently retaining an older pin or claiming parity. | Supported Explicit Edge Scenario: user follow-up and existing dependency/SDK contracts; REQ-007, AC-009/010. |

## UI, quality, data and dependencies

- UI/interaction: Existing model selectors only; no new product-design request, prototype, UI/UX specification or visual reference (N/A — not applicable).
- QR-001 (REQ-005/AC-007, reliability): Direct-API tests are deterministic and do not require/expose provider keys.
- QR-002 (REQ-003/AC-005, financial correctness): Rate/cache/tier assertions match cited official Standard pricing as of 2026-09-23; unsupported processing tiers are not priced as Standard.
- QR-003 (REQ-006/AC-008, compatibility): Existing IDs and historical usage snapshots remain intact.
- QR-004 (REQ-007/AC-010, compatibility): A dependency refresh must retain the existing Claude Agent SDK runtime's supported launch, session, event, tool, permission, auth and interruption outcomes; new SDK features are not automatically adopted.
- Data continuity: Existing run configurations, model IDs and cost snapshots must be preserved; no acceptable loss. Test fixtures may be regenerated. No schema change or migration requirement is assumed; design investigation must verify model-ID storage constraints.
- External dependency: OpenAI/Anthropic live model access is account-specific and unverified without API keys. Codex model availability is locally/account-discovered.
- Supplements: User screenshots at the absolute paths in `investigation-notes.md` are evidence only, not a behavior-defining approval supplement.

## Assumptions / decisions for approval

- ASM-001: “Anthropic 5.5” means released **Opus 5.5** only; Sonnet/Haiku 5.5 are not yet released.
- ASM-002: “Support” includes current model metadata and Standard usage pricing because those are established catalog behaviors.
- DEC-001: A Codex live test that cannot access one of the three GPT-6 models is reported as an explicit model-specific validation blocker, never replaced by a mock or a different model.
- ASM-003: “Claude SDK” is interpreted as the Claude Agent SDK **and** the closely related Anthropic direct-API SDK, both currently behind stable latest. This coordinated two-package upgrade is part of the approved SR-002 baseline.

## Traceability and design-phase input

REQ-001→UC-001/BEH-001/SCN-001/AC-001,002; REQ-002→UC-002/BEH-002/SCN-002/AC-003,004; REQ-003→UC-003/BEH-003/SCN-003/AC-005; REQ-004→UC-004/BEH-004/SCN-004/AC-006; REQ-005→UC-005/BEH-005/SCN-005/AC-007; REQ-006→UC-001–004/BEH-001–004/SCN-001–004/AC-008; REQ-007→UC-006/BEH-006/SCN-006/AC-009,010.

After approval, architecture must map SCN-001–006 to production paths, verify Anthropic thinking/tool replay compatibility and any model-ID persistence constraint, assess both SDK upgrade compatibility, and preserve static direct-API versus dynamic Codex/Claude SDK catalog ownership. These are investigation inputs, **not** an approved design.

## Readiness

Current behavior evidence-backed: Yes. Desired/preserved behavior explicit: Yes. Scope/non-goals clear: Yes; ASM-001/002/003 are included in SR-002 approval. REQ/AC/scenario traceability and testability: Yes. Product visual approval: N/A. Material unknowns visible: Yes. **User approval received: Yes, reference above. Ready for architecture design: Yes.**
