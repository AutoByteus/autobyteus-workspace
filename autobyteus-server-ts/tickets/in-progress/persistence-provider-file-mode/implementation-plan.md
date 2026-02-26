# Implementation Plan

## Plan Meta

- Ticket: `persistence-provider-file-mode`
- Scope: `Large`
- Requirements Source: `requirements.md` (`Refined`)
- Design Source: `proposed-design.md` (`v10`)
- Runtime Call Stack Source: `future-state-runtime-call-stack.md` (`v11`)
- Review Gate: `Go Confirmed` (`future-state-runtime-call-stack-review.md`, round 16)

## Execution Strategy

- Order: bottom-up and profile-safe (shared profile/file primitives -> domain providers/proxies -> startup/composition -> build/package profile -> tests).
- Legacy policy: remove hard-wired SQL-only composition paths and static SQL coupling where file profile requires decoupling.
- Implementation mode: one file/group at a time with immediate progress updates in `implementation-progress.md`.

## Requirement Traceability

| Requirement | Design / Change IDs | Runtime Use Cases | Implementation Tasks | Verification |
| --- | --- | --- | --- | --- |
| UC-001 file startup skips Prisma migrations | C-001, C-003, C-004 | UC-001 | T-01, T-10 | Unit startup config test + file-profile startup integration smoke |
| UC-002 prompt file persistence | C-007, C-008 | UC-002 | T-03 | Prompt GraphQL e2e under file profile |
| UC-003 agent definition + mapping file persistence | C-007, C-008 | UC-003 | T-04 | Agent-definition GraphQL e2e under file profile |
| UC-004 agent team file persistence | C-007, C-008 | UC-004 | T-05 | Agent-team GraphQL e2e under file profile |
| UC-005 MCP config file persistence | C-007, C-008 | UC-005 | T-06 | MCP config integration test under file profile |
| UC-006 external-channel file providers | C-007, C-008, C-009 | UC-006 | T-07 | External-channel setup GraphQL e2e + runtime service tests |
| UC-007 token usage file provider | C-005, C-006 | UC-007 | T-08 | Token-usage provider unit/integration test |
| UC-008 artifact file persistence | C-007, C-008 | UC-008 | T-09 | Agent-artifacts GraphQL e2e under file profile |
| UC-009 file build profile excludes Prisma graph | C-010, C-011, C-012 | UC-009 | T-11 | `pnpm build:file` compile check + grep/static checks |
| UC-010 one pattern (`registry + proxy`) | C-007, C-009, C-012 | UC-010 | T-02..T-09 | Code review + tests exercising proxies |
| UC-011 file package/install/runtime Prisma-free path | C-014 | UC-011 | T-12 | file-package manifest verification + file-profile runtime smoke |
| UC-012 SQL-profile regression guard | C-015 | UC-012 | T-13 | SQL profile startup + endpoint regression smoke |

## Task Breakdown

- T-01 Add shared persistence profile resolver (`src/persistence/profile.ts`) and profile helpers.
- T-02 Add shared file persistence primitives (`src/persistence/file/*`) for atomic JSON/JSONL storage and lightweight locking.
- T-03 Refactor prompt persistence to registry+proxy with file provider and lazy SQL loading.
- T-04 Refactor agent-definition + prompt-mapping persistence to registry+proxy with file providers and lazy SQL loading.
- T-05 Refactor agent-team-definition persistence to registry+proxy with file provider and lazy SQL loading.
- T-06 Refactor MCP config persistence to registry+proxy with file provider and lazy SQL loading.
- T-07 Refactor external-channel providers/composition to proxy-set pattern with file+SQL registries and lazy SQL loading.
- T-08 Refactor token-usage persistence registry/proxy to add file provider + lazy SQL loading.
- T-09 Refactor agent-artifacts persistence to provider abstraction with file provider + lazy SQL loading.
- T-10 Make startup migration path profile-aware (`file` skips Prisma; SQL profiles unchanged).
- T-11 Add build profile split (`build:full`, `build:file`, `tsconfig.build.file.json`) and remove static SQL imports from file build graph.
- T-12 Add file-profile packaging/dependency path (file runtime manifest/scripts) with Prisma-free dependency surface.
- T-13 Add SQL-profile regression verification path and tests.
- T-14 Endpoint-level verification run (GraphQL e2e under file profile, plus SQL regression smoke).
- T-15 Docs synchronization (`docs/`) for persistence profile/build/package behavior.

## Verification Strategy

- Unit tests:
  - profile resolver behavior and error handling.
  - file store primitive behavior (atomic write/read and lock semantics).
  - provider selection logic in persistence proxies.
- Integration tests:
  - domain provider behavior under file profile where feasible.
  - startup migration gating behavior by profile.
- Endpoint/E2E tests:
  - run representative GraphQL endpoints under `PERSISTENCE_PROVIDER=file` for prompts and agent definitions (critical persisted flows).
  - run SQL regression endpoint smoke under `PERSISTENCE_PROVIDER=sqlite`.
- Build/package verification:
  - `pnpm build:file` succeeds.
  - file-profile runtime/package path does not require Prisma at execution path.

## E2E Feasibility

- Feasible in this environment for GraphQL endpoint tests and file/sql profile toggling.
- External third-party integrations (real callback gateway) are not required for this ticket and will be validated at service-level test boundaries.
