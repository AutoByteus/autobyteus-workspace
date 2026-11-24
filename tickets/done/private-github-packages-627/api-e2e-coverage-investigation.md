# API/E2E Coverage Investigation — private-github-packages-627 (autobyteus-627)

## Investigation Meta

- Requirements Doc: `requirements-doc.md` (Approved); Investigation Notes: `investigation-notes.md`; Solution Revision Record: `solution-revision-record.md`
- Design Spec: `design-spec.md`; Design Review Report / Architecture Review Revision Record: present (the architecture reviewer's files stay uncommitted and untouched)
- Implementation Handoff: `implementation-handoff.md` (IR-001); Code Review: `code-review-report.md` (CRR-001 Pass, 9.5/10)
- API/E2E Revision Record: `api-e2e-revision-record.md`; Current API/E2E Revision ID: `API-REV-001`
- Round 1; Trigger: CRR-001 Pass (code `30fcc50ec7`, documents to `66688c11d9`); Prior Investigation: None
- Testing guideline: `TESTING.md` (root): layers, gated live suites with the test vault, Docker server nodes (test-owned container from the same image, this worktree's server package mounted read-only, fresh volumes), the GraphQL row (demo coverage + iOS demo build), fresh-start build inputs, tracked imports.

## Current Requirement And Design Basis

A private GitHub repository imports as an Agent Package or a Skill source with this node's GitHub token (one per node, in its vault; DEC-001). Every GitHub request goes without a token first and is retried with it only on 401/404; codeload gets the token as a header (DEC-005), so no URL ever carries a credential. Three failures are told apart: not connected, rejected, no access (C-4 texts). Checks and updates of a private source use the token on the normal schedule; a failed update keeps the installed content. The token never appears in logs, records, files or answers (REQ-005). A Docker node uses its own connection (REQ-006). Public sources work with no token or a rejected one (REQ-007). Persisted data: `Not Affected`.

## Supported Scenarios And Real Usage

- UC-001 … UC-005 of the requirements.
- Added from real use: RU-1, a user connects from the import line, imports, and later disconnects; the next scheduled check says "connect GitHub". RU-2, the token is revoked on GitHub while a private package is installed.
- Constraint found in this investigation (API-00): the GitHub test token reads one private repository, with one file and no folders, so it is neither a package nor a skill source. The token can push, but this validation writes nothing to the user's GitHub. So a full private *package* install against real GitHub cannot be made: real GitHub proves the transport, the token-save path and the three messages up to the package validation (the same validation as a public repository of the same shape); a private package's install, update and revocation run against the emulated GitHub on the built server.

## Changed Surface And Boundary Classification

| Surface | Affected | Repository evidence | Not exercised by it | Broader mode |
| --- | --- | --- | --- | --- |
| External integration (GitHub REST, ls-refs, codeload) | Yes | unit (recorded statuses), in-process GraphQL with faked GitHub, client-level live test | the built server's composition, its vault, its logs | built server against real GitHub (BS-L1) |
| Authentication / secrets (token in the node vault) | Yes | unit, in-process | the built node's vault, log and data folder | BS-L1, BS-E1, BS-D1 custody scans |
| Scheduled update pass | Yes | unit of the flow | the node's own scheduler and pass with a private source, before and after Disconnect | BS-E1 |
| Docker node | Yes | none | the image, its own vault | BS-D1 (test-owned container) |
| Browser (the import line, both screens) | Yes | web unit; IMP-10 probe | — | probe rerun (its fixture changed in this round) |
| GraphQL operations (`githubConnection`, `connectGitHub`, `disconnectGitHub`) | Yes | demo coverage spec (IMP-09) | the iOS demo build | `prepare-demo-web.sh --build` |
| Persisted data | No (`Not Affected`) | — | — | — |

## Existing Durable Coverage Inventory

| Path / Test | Decision | Action |
| --- | --- | --- |
| `tests/e2e/integrations/github-private-repository-live.e2e.test.ts` (client-level, live) | Still Valid | rerun before the token expires |
| `tests/e2e/integrations/github-private-repository-graphql.e2e.test.ts` (in process, faked GitHub) | Still Valid | in the whole E2E suite |
| `autobyteus-web/tests/e2e/github-connection-line-probe.mjs` + `fixtures/github-private-upstream.mjs` | Still Valid; the fixture Needs Update (serve every published commit, as GitHub does; the update path also reads the installed commit) | rerun the probe after the fixture change |
| Unit and integration suites of the change | Still Valid | Reused (IMP-04, IMP-12) |

## Planned Cases

| Case ID | Criteria | Boundary | Kind | Command Or Steps | Why |
| --- | --- | --- | --- | --- | --- |
| API-00 | — | GitHub (read-only) | Temporary probe | the token's private repositories by shape, anonymised | what real GitHub can prove |
| API-01 | AC-001, AC-004, AC-005 (transport) | client ↔ real GitHub | Existing Test (live) | the live client test | the token expires 2026-11-25 |
| API-02 | AC-001, AC-002, AC-005, AC-007 | built server ↔ real GitHub | Durable (new, live): BS-L1 | `github-private-repository-built-server.e2e.test.ts` | the handoff's open item |
| API-03 | AC-006 | test-owned Docker node ↔ real GitHub | Durable (new, live, gated): BS-D1 | `github-private-repository-docker-node.e2e.test.ts` | AC-006 |
| API-04 | AC-003, AC-004, AC-005, AC-007 | built server's scheduler ↔ emulated GitHub (+ real public GitHub) | Durable (new): BS-E1 | same file as BS-L1 | the scheduled path, Disconnect, a revoked token |
| API-05 | all | whole ungated server E2E | Existing Test | `env -i … pnpm test:e2e` | only the affected files ran (IMP-06) |
| API-06 | AC-002 (UI) | browser | Existing Test (rerun) | `pnpm -C autobyteus-web test:e2e:github-connection-line <fresh dir>` | its fixture changed |
| API-07 | — | GraphQL in the iOS demo | Existing Test | `autobyteus-ios/scripts/prepare-demo-web.sh --build` | TESTING.md GraphQL row |
| API-08 | — | build inputs (`autobyteus-web/package.json`) | Existing Test | fresh clone, frozen install, both typechecks | TESTING.md fresh start |
| API-09 | AC-005 | the branch | Existing Test | `scripts/check_secrets.sh` / gitleaks over the branch range | AC-005's method |
| API-10 | — | typechecks, tracked imports | Existing Test | server typecheck after the new tests; tracked-imports check | new test code |
| Reused | AC-002 … AC-005, AC-007 | unit, integration, web unit, guards | Reused | IMP-04, IMP-07, IMP-08, IMP-09, IMP-11, IMP-12 | no `src` change since `30fcc50ec7` |

## Not Tested / Infeasible / Deferred (planned)

| Behavior | Reason | Risk | Follow-up |
| --- | --- | --- | --- |
| A private *agent package* or *skill source* installed from real GitHub | No such repository is readable by the test token, and nothing is written to GitHub; real GitHub proves the transport up to validation (BS-L1, BS-D1), the emulated GitHub the install and update on the built server (BS-E1) | low: the same code path; the emulation answers as GitHub's measured responses (AR-001, IMP-01/02) | — |
| The scheduled check's first tick timing | the test moves the package's last check back in the stopped node's registry, since the 15-minute minimum interval would hold it | none for correctness | — |

## Investigation Decision

- Proceed: `Yes`. Durable coverage added: `Yes`. Reroute: `No`.

## Round 2 (SR-003, direct Small/Low)

- AC-008: the Update checks card's text in en and zh-CN, and `autobyteus-web/docs/settings.md`. Text only (IR-002). Plan: compare both catalogues with AC-008's texts; search for the old text; run the settings specs, the localization guards and both typechecks (TESTING.md: any TypeScript change). A browser run adds nothing for a text change the spec renders. Round 1's cases are not affected.
