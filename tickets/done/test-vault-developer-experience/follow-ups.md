# Follow-ups: test-vault-developer-experience

Problems outside this ticket's scope, recorded per `ticket-scope.md`. Only the
Solution Designer sends them, when the result leaves the team, and it fills in
`Sent`.

FU-001..FU-005 are the design spec's follow-ups FU-01..FU-05
(`design-spec.md`, Change Scope), copied here so that one file holds them all.
FU-006 is the API/E2E observation at AE-09, recorded at delivery.

| ID | Found by (role, document) | What is wrong, where | Evidence | Why it is outside this ticket | Urgent (`Yes`/`No`) | Suggested Task description | Sent (to, date) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| FU-001 | solution_designer, `design-spec.md` (FU-01) | `autobyteus-server-ts` `token-usage-model-list.e2e.test.ts` saves and restores environment variables, which the test setup already handles. | design spec, Change Scope | Redundant test code, but harmless. The ticket works without removing it. | No | Remove the redundant env save/restore from `token-usage-model-list.e2e.test.ts`. | |
| FU-002 | solution_designer, `design-spec.md` (FU-02) | The live desktop app exports legacy plaintext credential aliases (`*_API_KEY`) into agent shells. | design spec, Change Scope; ENV-1 in `api-e2e-execution-coverage-report.md` (13 inherited `*_API_KEY` variables) | Product desktop behavior, not test-vault selection. Test setups strip the variables, so the ticket works. | No | Stop the desktop app from exporting plaintext provider-key aliases into agent and terminal shells. | |
| FU-003 | solution_designer, `design-spec.md` (FU-03) | `secrets:import`, `test:e2e:real*` and `test-vault` rebuild on every call. | design spec, Change Scope | Command speed only; the behavior is correct. | No | Skip the rebuild in these root scripts when the build is current. | |
| FU-004 | solution_designer, `design-spec.md` (FU-04; DEC-008) | Existing worktree `db/test.db` files still hold real keys imported under the old flow. | design spec, Change Scope; DEC-008 | DEC-008 leaves the user's old stores alone; the user deletes them. | No | Give the user a list of worktree test DBs holding imported keys so they can delete them. | |
| FU-005 | solution_designer, `design-spec.md` (FU-05; R-D) | The 22 web probes that spawn backends with `...process.env` each own their own environment. An exported selector reaches 21 of them. | design spec R-D | Residual risk R-D: their assertions do not involve vault state, and TESTING.md says not to export the variable in a shell profile. | No | Give the web probes one shared backend-environment owner that drops `AUTOBYTEUS_TEST_VAULT` unless the probe is live. | |
| FU-006 | api_e2e_engineer, `api-e2e-execution-coverage-report.md` (AE-09); recorded by delivery_engineer | When a Settings API-key save is refused on a read-only test vault, the toast says only `Failed to save API key for DeepSeek`. The `SECRET_VAULT_READ_ONLY` code shows only in the browser console and the GraphQL error. | `evidence/AE-09-settings-save-refused-toast.png`, `evidence/AE-09-isolated-instance-journey.log` (`toasts: ['Failed to save API key for DeepSeek']`, `console: ['Failed to save API key: SECRET_VAULT_READ_ONLY']`) | AC-010 requires only that the save is refused, and it is (proven by AE-09). The design spec deliberately left the Settings UI alone. A clearer message is a Settings UI improvement. | No | In Settings > API Keys, show a read-only-vault message when a save fails with `SECRET_VAULT_READ_ONLY`, e.g. "This instance uses a read-only test vault; keys cannot be saved here." | |
