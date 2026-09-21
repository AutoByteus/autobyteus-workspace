# F-002 — Empty Org model selection is described as unavailable model
2026-09-17 reporting addendum to API-REV-001; no new execution round or claimed retest. User explicitly requested recording this problem and sending it to Code Reviewer.

## Observed actual Org behavior
During ordinary fresh Org Run configuration, Runtime AutoByteus selected and Default LLM Model still `Select a model`: `/guide 的模型配置尚未就绪：所选模型在当前运行时中不可用。` (model configuration for /guide not ready: selected model unavailable for current runtime). Run disabled. Selecting available gpt-5.4-mini removed this diagnostic and enabled Run. Same missing-selection message also independently captured during Plus reproduction in f001-direct-plus-empty-draft.txt (lines46/77) and f001-mounted-plus-empty-draft.txt. F-002 is separate from missing Plus inheritance: it also occurs on a normal fresh form before any model choice.

## User-supplied Team comparison
Screenshot shows AutoByteus selected, `Select a model`, and disabled Run Team. It DOES contain the accurate bottom hint: `Team / needs a model before launch.` It does NOT show the Org-style selected-model-unavailable diagnostic. Thus do not describe Team as having no message at all. Screenshot is user-supplied evidence, not an independently executed Team comparison in this API round; its build/version is unverified. Reference (read-only, no user app/data changes):
/Users/normy/.autobyteus/server-data/memory/agent_orgs/software_development_department_75403d5130584669869fdd59725f6b3e/software_engineering_team_3e746e3211f34fb39aad3979b4751e04/api_e2e_engineer_450b25f17f2245fe89b9c52cd17038ae/context_files/ctx_3e598565a8f4__image.png

## Expected / problem
An empty model selection is an incomplete draft, not an unavailable selected model. Preserve disabled Run until required selections are valid. Distinguish missing model from a genuinely selected model absent from the chosen runtime, with an accurate neutral missing-selection hint consistent with Team behavior. Do not suppress real incompatibility/unavailability errors, weaken launch readiness, or invent a default model.

## Preliminary classification / requested review
Local Fix candidate: launch-form diagnostic state/wording; Code Reviewer to confirm origin and whether authoritative design clarification is needed. Related quality feedback in existing model-selection form, not evidence of backend/provider failure or stopped Save corruption. Current source translations: workspace.runModelConfig.selectedModelUnavailable and workspace.agentOrg.runConfig.schemaBlocked. Do not assume root cause is translation alone; distinguish empty selection in the producer/validation state before changing wording.

Request separate F-002 review alongside unresolved F-001; record appropriate acceptance/regression for initial empty state, runtime change that clears selection, valid selection clearing hint, and truly unavailable selected model retaining its error. No production/test code edits made. Existing actual observation and persisted AX evidence support this reporting addendum; services remain stopped. Overall API-REV-001 stays Fail83.6%, not a new test result or increased confidence.
