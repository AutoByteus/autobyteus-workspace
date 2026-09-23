# Solution Designer Handoff — Anthropic API key false failure

## Classification And Approval
- Package identifier: `anthropic-api-key-save-failure`
- Current solution revision: `SR-004`
- Result classification: **Architecture Design Complete**.
- `task_size=Small`; `architectural_risk=Low`. Evidence: one existing frontend credential-status store is the production edit, with focused tests/browser validation; no material GraphQL/API, backend vault, persistence, security, concurrency, deployment or ownership-boundary change.
- Approved requirements: `requirements-doc.md` `REQ-001–004` / `AC-001–004`, supported `SCN-001`, preserved `BEH-001–002`. User explicitly replied “approve” on 2026-09-23 to the proposed outcome: a successful save immediately shows Configured, displays success and clears the input, while genuine failures still show an error. `SR-003` records the approval; `SR-002` is the approved intended-behavior baseline. No behavior-defining supplements or Product UI/UX package apply.
- Design: `design-spec.md` Ready; current completed solution round `SR-004`.
- Workspace: `/home/autobyteus/workspace/.codex/worktrees/anthropic-api-key-save-failure`, branch `requirements/anthropic-api-key-save-failure`, isolated from the shared integration checkout.
- Resolved base: freshly fetched `origin/personal` revision `467c1bc12d439ee79243d124402c2f65f25c3cd2`. Finalization target: `origin/personal`.
- Independent architecture/code review artifacts at this point: `N/A — not applicable` under the completed Small/Low classification; current handoff rules decide the downstream route.

## Original Request And Verified Failure
The user reported that saving an Anthropic API key in Settings > API Keys showed “Failed to save API key for Anthropic,” with a screenshot at `/home/autobyteus/data/memory/agent_teams/software_engineering_team_5b7a15421115487783117d431b7f2b2b/solution_designer_9829cfc26b7241fc814365b719297af0/context_files/ctx_83b54a2a39d4__image.png`. They asked for investigation and then explicitly directed a real frontend+backend dummy-key test.

An isolated full browser reproduction matched the screenshot: Nuxt Settings showed Anthropic Not Configured; Chromium clicked Save Key with a synthetic key; GraphQL returned HTTP 200, no errors and `apiKeyConfigured=true`; the UI nevertheless showed the red failure toast, retained Not Configured and the input. A read-only backend status query showed configured=true and browser refresh showed Configured. The Console identified `TypeError: Cannot assign to read only property '0' of object '[object Array]'` at `llmProviderConfig.applyCredentialSetting`. `evidence/ui-probe-summary.json` and before/after screenshots preserve the value-free result. No real credential was read, logged, or overwritten; temporary DB/root key/processes were removed.

## Technical Cause And Designed Delta
`autobyteus-web/stores/llmProviderConfig.ts:399` assigns Apollo's read-only credential result array into Pinia state. After a successful GraphQL mutation, `applyCredentialSetting` at `:491–496` writes into/sorts that array in place and throws. `useProviderApiKeySectionRuntime.ts:287–312` catches the frontend exception as if the server rejected the save, so it never reaches input reset or success notification. This is a shared frontend collection-ownership defect, not an Anthropic key-format or backend vault failure.

The approved local design keeps the existing owners/interfaces and value-free GraphQL contract. The credential store copies the Apollo array at read ingress and publishes a new, sorted array when applying a returned setting; it does not mutate the current list or nested result values. UI/runtime/backend/model-catalog behavior remains otherwise unchanged. Remove the direct array alias and in-place update; do not add an Anthropic special path, fallback toast suppression, extra refetch, new API, or dual compatibility path. Persisted-data transition is **Not Affected**; no migration or data rewrite.

## Implementation And Validation Expectations
- Production owner: `autobyteus-web/stores/llmProviderConfig.ts` only, unless implementation discovers a material Design Impact.
- Focused regression: current tests save from a mutable empty list and miss the bug. Add frozen/read-only query result followed by successful and repeated saves, preserving unrelated rows and ordering; cover genuine rejection and value-free response. Candidate test owners: `autobyteus-web/tests/stores/llmProviderConfigStore.test.ts` and existing Apollo contract tests.
- Browser/API-E2E: against an isolated backend and synthetic key, verify successful GraphQL response yields immediate Configured badge, success feedback, cleared input, Configured after refresh and no read-only Console error; a genuine server rejection still shows failure. Preserve Gemini/Qwen/custom caller behavior of the shared upsert, without redesigning those flows.
- Do not use or overwrite the live Anthropic credential. The currently configured state of the local live backend cannot identify or validate the user's key.
- If a public contract, persisted semantics, new behavior, or material architectural scope change is discovered, return to Solution Designer for recovery before widening work.

## Canonical Cumulative Package
- Requirements: `/home/autobyteus/workspace/.codex/worktrees/anthropic-api-key-save-failure/tickets/in-progress/anthropic-api-key-save-failure/requirements-doc.md`
- Investigation (product and architecture evidence): `/home/autobyteus/workspace/.codex/worktrees/anthropic-api-key-save-failure/tickets/in-progress/anthropic-api-key-save-failure/investigation-notes.md`
- Design: `/home/autobyteus/workspace/.codex/worktrees/anthropic-api-key-save-failure/tickets/in-progress/anthropic-api-key-save-failure/design-spec.md`
- Solution history: `/home/autobyteus/workspace/.codex/worktrees/anthropic-api-key-save-failure/tickets/in-progress/anthropic-api-key-save-failure/solution-revision-record.md`
- Browser reproduction summary: `/home/autobyteus/workspace/.codex/worktrees/anthropic-api-key-save-failure/tickets/in-progress/anthropic-api-key-save-failure/evidence/ui-probe-summary.json`
- Before/after screenshots: `/home/autobyteus/workspace/.codex/worktrees/anthropic-api-key-save-failure/tickets/in-progress/anthropic-api-key-save-failure/evidence/before-save.png`, `/home/autobyteus/workspace/.codex/worktrees/anthropic-api-key-save-failure/tickets/in-progress/anthropic-api-key-save-failure/evidence/after-save.png`
- Reproduction logs: `/home/autobyteus/workspace/.codex/worktrees/anthropic-api-key-save-failure/tickets/in-progress/anthropic-api-key-save-failure/evidence/isolated-backend-runtime.log`, `/home/autobyteus/workspace/.codex/worktrees/anthropic-api-key-save-failure/tickets/in-progress/anthropic-api-key-save-failure/evidence/isolated-frontend-runtime.log`
- Behavior-defining supplements, Product artifacts, independent review artifacts: `N/A — not applicable`.

## Handoff Route
Pending `get_handoff_rules` decision for the completed Small/Low architecture package. Expected output from the next specialist is implementation with scoped self-checks and a cumulative implementation handoff, followed by executable validation under configured team routing.
