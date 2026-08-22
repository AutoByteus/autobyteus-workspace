# Implementation Revision Record

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | `architecture_reviewer`; `ARCH-REV-003`; initial implementation round | N/A | `Initial Baseline` | `SR-011`, `ARCH-REV-003`; CRR/API/DR: N/A | Implementation complete and ready for source review; implementation-scoped checks pass. |

## Revision Entries

### IR-001 — Runtime-aware provider catalog, pricing, error transport, and launch validation

- Triggering role, report path, and round: `architecture_reviewer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/provider-catalog-pricing-error-messaging/architecture-review-revision-record.md`; architecture round `ARCH-REV-003`, followed by the initial implementation round.
- Triggering finding IDs: N/A. The approved architecture review passed with `ARCH-DI-001` through `ARCH-DI-005` resolved.
- Classification: `Initial Baseline`.
- Prior authoritative result: `N/A`.
- Current authoritative result: The reviewed design is implemented across catalog/adapters, current DeepSeek pricing, secret resolution, canonical provider-error transport, application/web projections, and runtime-scoped saved/direct model validation. The cumulative package is ready for `/code_reviewer`.
- Related solution revision IDs: `SR-011` (with `SR-009` and `SR-010` retained upstream).
- Related architecture-review revision IDs: `ARCH-REV-003`.
- Related code-review revision IDs: `N/A`.
- Related API/E2E revision IDs: `N/A`.
- Related delivery revision IDs: `N/A`.
- Why this baseline or implementation revision is recorded: Records the first completed implementation handoff and the local validation evidence for the approved design.
- Approved behavior or requirement IDs affected: `B-001`–`B-010`, `REQ-001`–`REQ-012`, `AC-001`–`AC-018`.
- Implementation delta:
  - Replaced named legacy catalog rows and provider request policies with Grok 4.6, Gemini 3.7 Flash, Kimi K3, GLM 5.3, and current MiniMax M3 metadata/configuration; removed Kimi K2 policy and legacy Gemini mapping rows.
  - Added serialized DeepSeek V4 UTC peak/off-peak pricing schedule and resolved period/provenance fields in the server pricing policy, including invalid-time missing pricing behavior.
  - Added safe provider-error extraction/redaction and stable `MissingApiKeyError`; mapped missing/blank vault credentials while preserving non-missing vault failures.
  - Replaced error-event `source` with required non-empty `code`, preserved provider message/evidence through AgentRun/team/websocket/web parsing, and stopped application projection from replacing terminal provider messages with a generic sentence.
  - Added effective `{runtimeKind, llmModelIdentifier}` expansion and AutoByteus-only exact current-model validation for saved profiles and direct agent/team launches before persistence, allocation, or creation side effects. External Claude/Codex selections retain existing backend ownership.
- Changed files or areas: `autobyteus-ts/src/llm`, `autobyteus-ts/src/secrets`, `autobyteus-ts/src/agent`; `autobyteus-server-ts/src/{secret-management,token-usage/pricing,agent-team-execution,services/agent-streaming,application-agent-streaming,application-orchestration}`; `autobyteus-team-stream-contracts`; `autobyteus-application-sdk-contracts`; and `autobyteus-web` stream/projection types and handlers. Focused durable unit fixtures were updated for the canonical contracts and current runtime/model identities.
- Local validation and result:
  - `pnpm -C autobyteus-ts build` — pass.
  - `pnpm -C autobyteus-team-stream-contracts build` — pass.
  - `pnpm -C autobyteus-application-sdk-contracts build` — pass.
  - `pnpm -C autobyteus-server-ts build` — pass, including Prisma generation and sanitized built-in-agent bootstrap smoke.
  - Focused `autobyteus-ts` unit tests — 8 files, 39 tests passed.
  - Focused `autobyteus-server-ts` unit tests — 6 files, 51 tests passed.
  - Focused `autobyteus-web` unit tests — 4 files, 71 tests passed; `pnpm -C autobyteus-web build` passed.
  - `pnpm -C autobyteus-server-ts typecheck` — fails on the repository's existing `tsconfig.json` `rootDir: src` versus `include: tests` (`TS6059` across test files); source/build compilation passes.
- Frontend self-validation: The changed web surface is stream state/protocol handling; the existing `ErrorSegment.vue` already renders `segment.message` and was not visually restyled. Nuxt production build and focused stream/handler tests passed. A browser session against a live backend was not run because no rendered component/layout changed and the provider/team path requires downstream API/E2E environment setup.
- Next recipient or routing: `/code_reviewer` with the cumulative solution and implementation artifacts.
- Remaining limitations or risks: GLM 5.3 and MiniMax M3 deployment endpoint/pricing evidence remains an explicit residual integration check; provider balance causality and Docker build identity remain unverified. API/E2E coverage investigation and execution remain with `api_e2e_engineer`. No integration/API/E2E test was run and no vault import was performed in this implementation round; if live integration is required downstream, use `pnpm import /Users/normy/.autobyteus/server-data/.env` as instructed by the user and do not expose imported secrets.
