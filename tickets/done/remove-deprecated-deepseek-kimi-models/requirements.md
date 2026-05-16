# Requirements: Remove Deprecated DeepSeek and Kimi Model Support

Status: Design-ready

## User Intent

Remove support in `autobyteus-ts` for model identifiers that the user reports are being deprecated by the vendors:

- DeepSeek Chat (`deepseek-chat`)
- DeepSeek Reasoner (`deepseek-reasoner`)
- Kimi 2.5 (`kimi-k2.5`)

## Scope

### In scope

- Remove target identifiers from built-in supported model definitions.
- Remove target identifiers from curated metadata shipped by `autobyteus-ts`.
- Change provider default constructors so no target identifier remains reachable as an implicit default.
- Remove Kimi 2.5-specific provider normalization/tests while preserving retained Kimi normalization for `kimi-k2.6`.
- Update tests that assert built-in model catalog/metadata/default behavior.
- Update durable `autobyteus-ts/docs/**` documentation to describe the current retained model catalog.

### Out of scope

- Removing DeepSeek provider support entirely.
- Removing Kimi/Moonshot provider support entirely.
- Removing retained DeepSeek V4 models: `deepseek-v4-flash`, `deepseek-v4-pro`.
- Removing retained Kimi models: `kimi-k2.6`, `kimi-k2-thinking`.
- Rewriting historical ticket artifacts under `autobyteus-ts/tickets/**`.
- Verifying vendor deprecation announcements; this ticket implements the user-approved removal request.

## Acceptance Criteria

| ID | Criterion |
| --- | --- |
| AC-001 | `LLMFactory.listModelsByProvider(LLMProvider.DEEPSEEK)` no longer returns `deepseek-chat` or `deepseek-reasoner`; retained DeepSeek V4 models remain. |
| AC-002 | `LLMFactory.listModelsByProvider(LLMProvider.KIMI)` no longer returns `kimi-k2.5`; retained `kimi-k2.6` and `kimi-k2-thinking` remain. |
| AC-003 | `new DeepSeekLLM()` and `new KimiLLM()` default to retained model identifiers, not removed identifiers. |
| AC-004 | Curated metadata no longer contains removed identifiers, and metadata tests cover retained model behavior. |
| AC-005 | No source/test/docs reference outside archived ticket history advertises built-in support for `deepseek-chat`, `deepseek-reasoner`, or `kimi-k2.5`. |
| AC-006 | Targeted unit/integration tests and TypeScript build pass or any environmental blocker is recorded with compensating evidence. |

## Derived Use Cases

| ID | Use Case | Acceptance Criteria |
| --- | --- | --- |
| UC-001 | Consumer lists DeepSeek models through `LLMFactory` | AC-001, AC-004 |
| UC-002 | Consumer lists Kimi models through `LLMFactory` | AC-002, AC-004 |
| UC-003 | Consumer constructs provider LLM class without a model argument | AC-003 |
| UC-004 | Maintainer reads docs for currently supported model catalog | AC-005 |

## Constraints

- No backward-compatibility aliases, hidden fallback registrations, or legacy retained catalog entries for removed identifiers.
- Keep provider classes and shared OpenAI-compatible request behavior intact for retained models.
- Avoid broad package refactors unrelated to model deprecation removal.
