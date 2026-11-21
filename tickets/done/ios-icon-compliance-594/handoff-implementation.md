# Handoff: ios-icon-compliance-594 → Implementation

- **Result:** `Architecture Design Complete`, `task_size = Medium`, `architectural_risk = Low`. Rule: Small/Medium and Low → `/implementation_engineer` (direct route).
- **Task:** autobyteus-594 (Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`; related 592); SR-001.
- **Ticket folder:** `/Users/normy/autobyteus_org/autobyteus-worktrees/ios-icon-compliance-594/tickets/in-progress/ios-icon-compliance-594/`
- **Worktree / branch / base:** `/Users/normy/autobyteus_org/autobyteus-worktrees/ios-icon-compliance-594`, `codex/ios-icon-compliance-594`, `origin/personal` `9aeaf46aa9`. Finalization target: `origin/personal`. The ticket documents are uncommitted; commit them with your change.

## Original request

The PM's Task. The founder prioritized fixing these cleanly for all future iOS releases:
- the placeholder iOS app icon becomes the canonical AutoByteus product logo, with a reproducible generator and a drift check;
- `ITSAppUsesNonExemptEncryption` is declared accurately, after verifying the app's encryption use;
- the proof is the contract checks, the core tests, asset-catalog compilation and a green build-only iOS release run;
- the temporary branch `origin/codex/autobyteus-592-ios-product-icon` is deleted afterwards.

## Approval basis

Requirements were approved by the Solution Designer within the direction, with the founder informed (requirements-doc.md):
- **DEC-001:** Android's composition, the mark on full #1E3A8A;
- **DEC-002:** `false`. Only OS (WebKit/WebCrypto) and authentication-only (noVNC) encryption are present;
- **DEC-003:** regenerate rather than adopt the branch PNGs.

## What to build

design-spec.md D-1…D-6 and its Change / Refactor Sequence:
- the generator `autobyteus-web/scripts/build-ios-app-icon.mjs` (write / `--check`, with a pixel tolerance; measure and state the final numbers);
- the package scripts `ios-icon:build` and `ios-icon:check`;
- the regenerated PNGs;
- the Info.plist key;
- the contract check: icon structure through the PNG IHDR and no alpha, the key, and the workflow step;
- the workflow step;
- a TESTING.md row and the iOS README.

## Proof required

AC-001…004:
- visual evidence of the 1024 icon beside the desktop icon;
- the check, positive plus four negative cases;
- the contract check, positive plus negative;
- `plutil -p` on the built app;
- core tests and a local simulator build with no AppIcon warnings;
- a build-only `release-ios.yml` run on the branch (`publish_app_store_connect=false`; DESIGN.md rule 12).

## Constraints

- No upload, tag or release (beta.6 waits for the founder's word).
- Delivery deletes `origin/codex/autobyteus-592-ios-product-icon` after the merge.

## Documents

- `requirements-doc.md`
- `investigation-notes.md`
- `design-spec.md`
- `solution-revision-record.md`

## Route record

Sent to `/implementation_engineer`, 2026-11-21.
