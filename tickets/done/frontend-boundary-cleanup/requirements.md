# Requirements

- Status: `Refined`
- Ticket: `frontend-boundary-cleanup`
- Date: `2026-04-03`

## Problem

The current branch is functionally acceptable, but the latest review still left a few cleanup notes. The user also added one explicit architecture rule for this round: `autobyteus-web` must never depend directly on `autobyteus-ts`.

## In-Scope Requirements

- Remove duplicated invocation-alias normalization from the touched-files frontend boundary by giving that concern one shared web-owned utility.
- Remove dead public store surface that no longer has callers.
- Remove direct `autobyteus-ts` dependency from active `autobyteus-web` code paths, especially build/packaging scripts and active docs.
- Strengthen the web boundary guard so future regressions in active web code are blocked.

## Acceptance Criteria

1. `autobyteus-web` active runtime/build code no longer directly imports `autobyteus-ts` or directly orchestrates `autobyteus-ts` builds.
2. The web prepare-server boundary delegates shared dependency preparation to `autobyteus-server-ts` instead of reaching into `autobyteus-ts` directly.
3. Invocation-alias normalization is owned by one reusable web utility rather than duplicated across the touched-files store and lifecycle handler.
4. Dead public store API that is no longer used is removed in scope.
5. The web boundary guard scans the active web script boundary so the project fails fast if a direct `autobyteus-ts` dependency is reintroduced.
6. Focused web validation covers the shared utility / touched-files behavior and the strengthened boundary guard or packaging boundary commands.
