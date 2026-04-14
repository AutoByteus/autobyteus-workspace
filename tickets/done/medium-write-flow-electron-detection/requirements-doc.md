# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)
Refined

## Goal / Problem Statement
Move the Browser subsystem off Electron's default app session and onto a dedicated Browser-owned persistent session so third-party browsing behavior is isolated, browser compatibility work has one explicit ownership boundary, and users retain normal browser-style auth persistence after one-time re-login.

## Investigation Findings
- Browser tabs are sandboxed Electron `WebContentsView` surfaces with no preload bridge, so the Medium behavior is not caused by selector/click failure or `window.electronAPI` leakage.
- The current Browser subsystem uses the default Electron session/profile because `BrowserViewFactory` does not specify a `session` or `partition`.
- Popup adoption currently forwards Electron-provided popup `webContents` into Browser view creation without an explicit Browser-session ownership check.
- `autobyteus-web/package.json` (`autobyteus` / `1.2.76`) matches the custom token seen in the reported user-agent, confirming app identity can leak through default browser identity.
- Electron exposes supported APIs for dedicated sessions/partitions and popup `webContents.session` inspection, so the refactor is technically feasible.
- The user accepted one-time re-login after the refactor but requires persistent auth afterward; repeated login prompts would make Browser unusable.

## Recommendations
- Refactor Browser to use a dedicated persistent Browser-owned Electron session/partition.
- Centralize Browser session ownership in the Browser subsystem so future UA/header/client-hint policy can be attached there without affecting the main app session.
- Preserve browser-style auth persistence by keeping all Browser tabs and popup-created tabs on the same persistent Browser session.
- Make popup adoption explicit: Browser may adopt a popup `webContents` only after validating that it belongs to the Browser-owned session; mismatches must be rejected without creating a child Browser session.
- Do not scope cookie/session migration from the current default session into this change; one-time re-login is acceptable.

## Scope Classification (`Small`/`Medium`/`Large`)
Medium

## In-Scope Use Cases
- `UC-001`: Opening a Browser tab creates or reuses a Browser surface backed by the dedicated Browser session instead of the default Electron session.
- `UC-002`: Popup/new-window flows created from a Browser tab stay inside the Browser subsystem and share the same Browser session when the popup `webContents` belongs to the Browser session.
- `UC-003`: After one-time re-login inside Browser, Google or other web auth state is reused across Browser tabs/sites and across app restarts.
- `UC-004`: Browser-specific compatibility work can be added later at the Browser session boundary without changing the main app session.
- `UC-005`: If Electron hands Browser a popup `webContents` from a non-Browser session, Browser rejects adoption, creates no child Browser session, and surfaces the mismatch as an explicit popup-adoption failure.

## Out of Scope
- Guaranteeing that Medium or every third-party site will accept the embedded Browser after this refactor.
- Site-specific compatibility hacks or per-domain overrides.
- Migrating cookies, cache, or auth state from the current default Electron session into the new Browser session.
- Full user-agent/client-hint hardening implementation for this ticket.

## Functional Requirements
- `REQ-001`: Browser-owned third-party web content must stop using Electron's default app session and must use one dedicated Browser-owned session instead.
- `REQ-002`: The dedicated Browser session must be persistent across app restarts so users do not need to re-login on each visit after the one-time post-refactor login.
- `REQ-003`: Popup-created Browser tabs/windows must remain in the Browser subsystem and share the same dedicated Browser session as their opener when the popup belongs to the Browser session.
- `REQ-004`: Session ownership and configuration for Browser tabs must be centralized inside the Electron Browser subsystem rather than spread across tab lifecycle callers.
- `REQ-005`: The refactor may require one-time re-login after rollout, but repeated login prompts caused by per-tab, in-memory, or reset session behavior are not acceptable.
- `REQ-006`: Repository docs and regression tests that currently encode default-session behavior must be updated to reflect the new dedicated Browser session ownership model.
- `REQ-007`: The Browser subsystem must expose one explicit location where future Browser-only compatibility policy can be attached without changing the main app session.
- `REQ-008`: Popup adoption must explicitly validate that adopted popup `webContents` belongs to the dedicated Browser session; a session mismatch must be rejected without creating a Browser child session.

## Acceptance Criteria
- `AC-001`: Browser tabs created through `BrowserViewFactory` or its replacement use an explicit dedicated Browser session/partition instead of relying on the default Electron session.
- `AC-002`: Popup/new-window Browser flows remain browser-like and inherit/share the dedicated Browser session rather than creating isolated or default-session Browser tabs.
- `AC-003`: After users re-login once inside Browser, auth state persists across Browser navigations, tabs, and app restarts through the dedicated persistent Browser session.
- `AC-004`: The design and implementation do not include cookie/session migration from the old default session; one-time re-login is accepted explicitly.
- `AC-005`: Docs and automated tests are updated so the codebase no longer asserts that Browser tabs use the default Electron session profile.
- `AC-006`: The refactor leaves one clear Browser-session boundary where future Browser-only compatibility policy can be added safely.
- `AC-007`: Regression coverage proves both popup-adoption outcomes: matching-session popup `webContents` are adopted successfully, and mismatched-session popup `webContents` are rejected/aborted with no child Browser session or popup-opened event created.

## Constraints / Dependencies
- Medium and other third-party websites can still reject embedded browsers for site-side policy reasons even after session isolation.
- Browser login persistence depends on using a persistent Electron partition rather than an in-memory session.
- Popup/browser-like tab behavior must remain compatible with the Browser shell's current lease/session lifecycle.
- Popup mismatch handling must work within Electron's `setWindowOpenHandler` / `createWindow` model, where final adoption checks happen when Electron provides popup `webContents`.

## Assumptions
- Electron popup webContents opened from a Browser-owned tab normally inherit the opener's session/profile.
- A one-time login reset after rollout is acceptable to users as long as subsequent Browser auth persists normally.
- Browser compatibility policy work will remain Browser-only and should not alter the main workspace shell session.

## Risks / Open Questions
- Some websites may still reject embedded Browser usage even after dedicated-session refactoring.
- Popup mismatch handling must close or abort foreign popup `webContents` cleanly enough that no stray Browser child state survives the failure path.
- Existing user auth stored in the default session will not carry into the new Browser session; rollout messaging may be needed.

## Requirement-To-Use-Case Coverage
- `REQ-001` -> `UC-001`
- `REQ-002` -> `UC-003`
- `REQ-003` -> `UC-002`, `UC-003`
- `REQ-004` -> `UC-001`, `UC-004`, `UC-005`
- `REQ-005` -> `UC-003`
- `REQ-006` -> `UC-001`, `UC-002`, `UC-004`, `UC-005`
- `REQ-007` -> `UC-004`
- `REQ-008` -> `UC-002`, `UC-005`

## Acceptance-Criteria-To-Scenario Intent
- `AC-001` -> proves non-popup Browser tabs stop relying on the default session
- `AC-002` -> proves popup/OAuth-style flows stay in the shared Browser session when ownership matches
- `AC-003` -> protects usable browser-style login persistence after the one-time re-login
- `AC-004` -> keeps rollout scope clean and avoids migration complexity
- `AC-005` -> removes stale default-session assumptions from docs/tests
- `AC-006` -> ensures future compatibility work has one clear ownership boundary
- `AC-007` -> protects the Browser boundary from foreign popup `webContents` bypass

## Approval Status
Approved by user on 2026-04-14 for design and refactor planning; one-time re-login accepted, repeated re-login rejected. Refined on 2026-04-14 after architect review to make popup session-match enforcement explicit.
