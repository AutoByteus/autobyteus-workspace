# API/E2E Testing

## Acceptance criteria coverage
| ID | Scenario | Evidence | Status |
| --- | --- | --- | --- |
| AC1 | Codex full access toggle persists immediately on click | `pnpm test:nuxt components/settings/__tests__/CodexFullAccessCard.spec.ts --run` included in targeted suite | Pass |
| AC2 | Streaming parser toggle persists immediately on click | `pnpm test:nuxt components/settings/__tests__/StreamingParserCard.spec.ts --run` included in targeted suite | Pass |
| AC3 | No explicit save buttons for Codex full access / Streaming parser | Component tests assert missing `codex-full-access-save` and `streaming-parser-save` | Pass |
| AC4 | Remaining manual-save cards use stronger active save styling | Targeted component tests for media defaults, web search, featured catalog, compaction passed | Pass |
| AC5 | Validation checks pass | Targeted Nuxt tests, localization guard, literal audit | Pass |

## Commands
- `pnpm test:nuxt components/settings/__tests__/CodexFullAccessCard.spec.ts components/settings/__tests__/StreamingParserCard.spec.ts components/settings/__tests__/ServerSettingsBasicsPanel.spec.ts components/settings/__tests__/MediaDefaultModelsCard.spec.ts components/settings/__tests__/WebSearchConfigurationCard.spec.ts components/settings/__tests__/FeaturedCatalogItemsCard.spec.ts components/settings/__tests__/CompactionConfigCard.spec.ts --run` — Pass, 45 tests.
- `pnpm guard:localization-boundary && pnpm audit:localization-literals` — Pass.

## Browser smoke
- Opened local Nuxt dev server at `http://127.0.0.1:29695/settings?section=server-settings`.
- Route and settings shell loaded; card-level visual verification was blocked by unavailable local backend proxy (`/rest/health` refused), which is expected in this standalone frontend dev context.
