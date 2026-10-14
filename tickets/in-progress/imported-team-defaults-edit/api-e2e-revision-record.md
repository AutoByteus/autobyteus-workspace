# API/E2E Revision Record — imported-team-defaults-edit

| Round | Against | Date | Result | Summary |
| --- | --- | --- | --- | --- |
| API-001 | IR-001 (`b5caa04c45`) | 2026-10-14 | Fail (Local Fix) | New server E2E `registered-package-definition-edit.e2e.test.ts`. RPE-001..007 pass; mutation-checked against the old rule. Real-UI check on an isolated instance with a copy of `autobyteus-agents`: Team default save, run prefill, Org save and unwritable-folder error all pass. **API-F-001:** the atomic package save (`definition-package-transaction.ts:90`, `fs.cp` without `verbatimSymlinks`) rewrites relative symlinks in the package to absolute paths. Reproduced by RPE-008, which passes with the one-flag fix. Unit, integration and typecheck green (known exception only). The stale `agent-team-definitions-graphql.e2e` file is reported as a follow-up. |
