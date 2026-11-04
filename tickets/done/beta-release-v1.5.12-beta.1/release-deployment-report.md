# Delivery / Release / Deployment Report — beta-release-v1.5.12-beta.1 (autobyteus-383)

## Release / Publication / Deployment Scope

- **Release Requested:** the next beta after stable `v1.5.11` (`next-beta` → `1.5.12-beta.1`). The work is already merged; there is no software change. The handoff is `handoff.md`, from the Solution Designer, 2026-11-04 (the user: "let's release a beta version, I forgot to say").
- Content: TICKETS_IN_RELEASE.
- Docs sync, handoff summary and Verify From Evidence do not apply to a release request; the release guide's checks are the verification.

## Project Release Guide

- `RELEASE.md`, read from `origin/personal`. Deviations: none, unless recorded below. Proposed fixes: `None`.

## Checks Before Tagging

CHECKS_SECTION

## Release

RELEASE_SECTION

## Repository Finalization And Cleanup

FINALIZATION_SECTION

## What The User Should Check After Updating

- Users on stable `v1.5.11` have the restart-resume recorder, so an update from `v1.5.11` to this beta is the **first** that resumes busy agents by itself: each continues with one note that the app restarted.
- With **Receive beta updates** on, the app is offered this beta. With **Update automatically** also on, it downloads, installs and restarts by itself (on macOS about half a minute after the download). Docker nodes whose own switch is on follow the desktop to this version.
- The app shows the beta's version in Settings → Updates.

## Rollback Criteria

- Never move or delete a published tag; fix forward with the next beta.
- A beta never becomes "Latest". `:latest` stays on `1.5.11`. Turning beta updates off waits for the next newer stable; desktop updates never downgrade.

## Final Status

FINAL_STATUS_SECTION
