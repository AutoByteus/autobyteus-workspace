# Handoff Summary — integrations-page (autobyteus-337: Integrations page)

## Ticket

- Package: `integrations-page`; Project Task `autobyteus-337`; depends on autobyteus-311 step 1 (`v1.5.11-beta.4`)
- Classification: `task_size=Large`, `architectural_risk=High`; route: reviewed. Code review CRR-001 Pass (average 9.4, no findings); API/E2E API-REV-001 Pass (95.4%); test-code review CRR-002 Pass.
- Archived ticket folder: `tickets/done/integrations-page/` on `personal` (worktree removed after finalization)

## What Changed

- **The page.** A new main-menu page, **Integrations**:
  - cards per integration from imported skill sources (name, description, icon or letter tile, status chip);
  - **Import** from a GitHub link or a local folder, with each refusal coded;
  - **Manage sources** to update or remove;
  - **Connect** / Test / Remove for the token, which stays write-only in the vault;
  - tool presence (curl, jq, git).
- **Access rule.** Access to an integration now follows the agent's skills: an agent with the integration's skill (configured, or all installed skills) can use it. Removing or disabling the skill, or removing the source, stops access at the next call (`INTEGRATION_NOT_ALLOWED`).
- **Removed.** The GitHub card in Server Settings → Basics, and the per-agent tick API.
- **Upgrade from beta.4 data.** `connections.json` is usable as is: the token stays, and the ticks are ignored and dropped on the next write.
- **Tests.**
  - server unit, integration and e2e;
  - the runtime-shell suite gains AGY cells for all installed skills with disable/enable, a team-local member, and source removal on the Skills page;
  - web specs and the page probe.
- **Docs.**
  - `credential_proxy.md`, `skills.md`;
  - `autobyteus-web/docs/integrations.md` (new), `settings.md`;
  - `GLOSSARY.md`, `TESTING.md`.
- **AC-009.** The README of `AutoByteus/autobyteus-integrations` describes installing through the page.

## Integration

- Merge of `origin/personal` @ `ec3f721622` → `99ccc2ef5c`. That base was 65 commits and 197 non-ticket files ahead: autobyteus-285 restart-resume, -345 packaging, -357 code quality, and betas up to `v1.5.11-beta.9`. No conflicts.
- Shared files: `build-studio-server.ts` (the base added restart-resume next to the credential proxy host), `generated/graphql.ts`, `autobyteus-web/package.json`.
- Checks:
  - DR-01: core build, server typecheck and build; server unit 7729 passed, 0 failed files.
  - DR-02: full server e2e. The integrations, skills and credential-proxy suites pass. 8 files fail to load, 0 tests fail: they import `claude-live-agent-harness.ts`, which fails to transform (L24); identical on `personal` (FU-002 of autobyteus-311).
  - DR-03: gated live GitHub, 2/2. The scripted runtime-shell cells pass 7/7: AGY ticked, no skill, team, team-local, all installed with disable/enable, source removed on the Skills page, and Grok recorded. Each shows `200`, refusals on removal, disable and stop, and no token.
  - DR-04: web 4958 passed, 0 failed.
- Secret Gate before any push: `PASS` (13 commits). The integrations repository's 2 new commits were scanned with gitleaks' default rules: no leaks.

## Verification

- Judged from the evidence; no user check needed. Details in `release-deployment-report.md`.

## Release

- `No release`: the Task says "no release unless the user asks", and the user hasn't asked for this ticket. `release-notes.md` is ready, and `v1.5.11-beta.10` is available on request.

## For The Solution Designer

- Follow-ups FU-001…FU-004 in `follow-ups.md`, none sent.
- Residual risks:
  - DEC-016 (an update dropping an integration) is tested against a stub GitHub only;
  - the application bundle copy granting nothing is proven by a repository test only;
  - the AC-008 run was started through the instance API;
  - R-2: agents set to all installed skills get access once connected (DEC-002, documented);
  - R-4: a hand-deleted local folder leaves its token in the vault (accepted);
  - the test token expires 2026-11-25.
- The live runs added sessions to the user's CLI histories and one comment on issue #1 of the test repository.
