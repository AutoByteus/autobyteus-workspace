# Implementation Plan

## Scope Classification

- Classification: `Small`
- Reasoning:
  - Adds one new workflow and one setup document.
  - No runtime product behavior changes.
  - No schema/API changes.
- Workflow Depth:
  - `Small` -> implementation plan (solution sketch) -> design-based runtime call stack -> runtime call stack review -> refine until pass -> progress tracking.

## Plan Maturity

- Current Status: `Call-Stack-Review-Validated`
- Notes:
  - Review gate passed for both in-scope use cases (happy path and missing-secret failure path).

## Solution Sketch (Required For `Small`, Optional Otherwise)

- Use Cases In Scope:
  - Build desktop artifacts only when a tag is pushed.
  - Check out four repositories so existing `prepare-server.sh` dependency chain works in CI.
  - Fail early with a clear message when private repo token is missing.
- Touched Files/Modules:
  - `.github/workflows/desktop-tag-build.yml`
  - `docs/github-actions-tag-build.md`
  - `README.md`
- API/Behavior Delta:
  - Adds tag-triggered CI behavior at repository level.
- Key Assumptions:
  - `autobyteus-server-ts` remains private.
  - `autobyteus-ts` and `repository_prisma` are readable from CI without private credentials.
- Known Risks:
  - Windows shell/script differences may require small follow-up adjustments.
  - Missing or non-SSO-authorized token blocks private checkout.

## Runtime Call Stack Review Gate (Required Before Implementation)

| Use Case | Call Stack Location | Review Location | Business Flow Completeness | Structure & SoC Check | Dependency Flow Smells | Verdict |
| --- | --- | --- | --- | --- | --- | --- |
| Tag push triggers multi-platform build and artifacts | `tickets/desktop-tag-build-workflow/design-based-runtime-call-stack.md` | `tickets/desktop-tag-build-workflow/runtime-call-stack-review.md` | Pass | Pass | None | Pass |
| Missing secret fails early with explicit error | `tickets/desktop-tag-build-workflow/design-based-runtime-call-stack.md` | `tickets/desktop-tag-build-workflow/runtime-call-stack-review.md` | Pass | Pass | None | Pass |

## Go / No-Go Decision

- Decision: `Go`

## Principles

- Keep workflow changes isolated to CI/docs.
- Reuse existing package scripts (`build:electron:*`) rather than introducing new build entrypoints.
- Fail fast for missing required secret.

## Dependency And Sequencing Map

| Order | File/Module | Depends On | Why This Order |
| --- | --- | --- | --- |
| 1 | `.github/workflows/desktop-tag-build.yml` | Existing package scripts and prepare-server dependency chain | Core implementation unit |
| 2 | `docs/github-actions-tag-build.md` | Workflow behavior | User setup/operations guidance |
| 3 | `README.md` | Docs file | Discoverability entry point |

## Step-By-Step Plan

1. Add tag-triggered matrix workflow with four-repo checkout and private-secret precheck.
2. Add setup documentation with secrets, trigger flow, and artifact expectations.
3. Link docs from main README.
4. Validate workflow YAML and changed file set.

## Per-File Definition Of Done

| File | Implementation Done Criteria | Unit Test Criteria | Integration Test Criteria | Notes |
| --- | --- | --- | --- | --- |
| `.github/workflows/desktop-tag-build.yml` | Tag-only trigger, matrix builds, checkout sequence, artifact upload configured | N/A | YAML parses and workflow semantics align with repo scripts | Manual run after secrets are set |
| `docs/github-actions-tag-build.md` | Clear setup instructions and required/optional secrets documented | N/A | N/A | Ops documentation |
| `README.md` | Points to CI build setup doc | N/A | N/A | Discoverability |

## Test Strategy

- Unit tests: N/A (CI config/docs change).
- Integration tests:
  - Parse workflow YAML locally.
  - Trigger real tag build after secrets are configured.
