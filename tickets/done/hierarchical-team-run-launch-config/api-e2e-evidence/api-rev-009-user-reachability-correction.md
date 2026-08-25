# API-REV-009 User Reachability Correction

## Trigger

After API-REV-009 was reported, the user challenged the premise that `ordinary_prompt` and `multiline_prompt` are real product settings or reachable through the normal current product workflow.

## Corrected Facts

- `ordinary_prompt` and `multiline_prompt` are API/E2E-invented temporary field names.
- The current owned `codex_app_server` / `gpt-5.6-luna` server catalog does not publish either field and publishes no free-text configuration field.
- API/E2E injected two temporary `type: string` properties into the owned page's Pinia catalog after the real persisted TeamRun loaded.
- API/E2E also placed the corresponding arbitrary keys in an isolated GraphQLJSON/V2 TeamRun fixture.
- No normal current user action can select those fields from the current Codex Luna configuration form.
- No repository product source, server catalog, durable test, user profile, or retained TeamRun was changed.

## Revised Applicability Classification

The probe directly exercises generic renderer mechanics that the code and schema types permit, and it reveals how a future/custom/free-text provider field or matching historical snapshot would render isolated CR. It does **not** prove a defect in a currently emitted Codex Luna setting or in the user's normal hierarchical TeamRun launch/configuration workflow.

The user then made the scope decision explicit: blocking API/E2E cases must be based on real, normally reachable user workflows. Therefore `API-E2E-F-003` is `Out Of Scope / Non-Blocking`, not a current implementation defect or an unresolved requirement gap.

## Preserved Real-Path Evidence

The prior retained actual-system flow remains valid: API-REV-006 configured the real private nested Team with distinct root/nested workspaces, root Codex `gpt-5.6-luna`, nested AutoByteus `deepseek-v4-flash`, exact V2 disk state, a real ordinary subteam message, and a real delegated task that was submitted, reviewed, and accepted.

API-REV-009 also proved the real current stored Settings path for currently emitted Codex fields and ordinary persisted values; only the invented free-text property made the CR visual observation reachable.

## Final Routing

- Cancel implementation correction routing for API-E2E-F-003.
- The earlier solution-clarification request is superseded by the user's explicit scope decision; no design reset is needed.
- Use API-REV-010 as current authority: `Pass` / `98%` for real current-user paths, with this synthetic observation retained only as a non-blocking robustness note.
