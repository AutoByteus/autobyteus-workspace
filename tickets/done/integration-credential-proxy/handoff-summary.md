# Handoff Summary — integration-credential-proxy (autobyteus-311 step 1: GitHub credential proxy)

## Ticket

- Package: `integration-credential-proxy`; Project Task `autobyteus-311` (step 1)
- Classification: `task_size=Large`, `architectural_risk=High`; route: reviewed. Architecture review ARCH-REV-002 Pass; code review CRR-001 Pass (average 9.4, no findings); API/E2E API-REV-001 Pass (95.6%); test-code review CRR-002 Pass.
- Archived ticket folder: `tickets/done/integration-credential-proxy/` on `personal` (worktree removed after finalization)

## What Changed

- **Card.** Settings → Server Settings → Basics → **GitHub**:
  - save a token, checked with GitHub and stored write-only in the vault;
  - Test and Remove;
  - "Connected as @login";
  - per-agent access.
- **Run pass.** Every run of an allowed agent, in every runtime and as a team member, gets a run pass. Its shell gets `AUTOBYTEUS_GITHUB_API_URL` and a git `insteadOf` redirect to the node's loopback credential proxy. The pass is revoked when the run is released or its activation fails.
- **Proxy.** It forwards only to the app's own GitHub definition (the `api.github.com` API and git smart-HTTP on `github.com`) and adds `Authorization` from the vault:
  - a caller's `Authorization` or cookie is dropped;
  - the token echoed in a response is replaced by `[REDACTED]`;
  - bodies stream;
  - loopback only, even with Phone Access on (`NOT_LOOPBACK`).
- **Activity log.** One record per call, value-free.
- **Generic by design.** The pass and proxy are general; Jira is a future definition.
- **Tests.** Unit and integration suites; GraphQL e2e on the built server; a gated live GitHub check; the gated runtime-shell e2e (a cell per runtime, plus no-model AGY and Grok cells); the card spec and probe.
- **Docs.**
  - `credential_proxy.md` (new), `secret_management.md`, `GLOSSARY.md`, `TESTING.md`, `docs/design-cases.md`;
  - `autobyteus-web/docs/settings.md` "Server Settings: GitHub", added by delivery.

## Integration

- Merge of `origin/personal` @ `f13dec395f` (25 commits: autobyteus-328 `read_file` media and `v1.5.11-beta.3`) → `8b53331099`; no conflicts.
- Checks, all Pass:
  - DR-01: core build and core unit (2089); server typecheck and build.
  - DR-02: credential-proxy unit and integration (41); GraphQL e2e on the built server (3).
  - DR-03: the gated live GitHub check (2: connect via GraphQL without showing the token; curl, `gh api`, `git ls-remote` and clone through the proxy). The scripted runtime-shell cells (AGY ticked/unticked/team, Grok): all show `200` for issue #1, the lifecycle `INTEGRATION_NOT_ALLOWED` → `200` → `RUN_PASS_INVALID`, and no token in shell output, on the wire or in the data dir.
- Secret Gate (`RELEASE.md`) over the 14 unpushed ticket commits: `PASS` before any push.

## Verification

- Judged from the evidence; no user check needed. Details in `release-deployment-report.md`.

## Release

- `No release`: the Task says "no release unless asked", and the user has not asked for this ticket. `release-notes.md` is ready. `v1.5.11-beta.4` is available on request.

## For The Solution Designer

- Follow-ups FU-001…FU-005 in `follow-ups.md`, none sent. FU-001 (the Claude API key in the runtime child env) is Medium (security).
- AR-007 (the stale `handoff.md` and the SR number in `requirements-doc.md`) is yours and still open.
- Residual risks:
  - live push to GitHub is not covered (read-only token, DEC-009; push is proven against a local git server);
  - echo redaction is proven against a fake upstream only;
  - R-5 (a restart ends the passes) is not exercised;
  - `activity.jsonl` grows without bound (R-3, accepted for phase 1);
  - the test token expires 2026-11-25.
- The live AGY, Claude and Grok runs added sessions to the user's CLI histories (TESTING.md).
