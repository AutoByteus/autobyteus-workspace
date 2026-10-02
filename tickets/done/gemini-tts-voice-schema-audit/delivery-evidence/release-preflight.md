# Stable Release Preflight — 2026-10-02

## User signal and remaining gate

User: **“the task is done. finaliize and release a stable version”**. Delivery records explicit acceptance/finalization approval for the current voice/style package and selection of a stable release. It does not infer acceptance of the separately recorded old Gemini 3.8 DR-004 hold or permission to stop that instance. A single clarification was presented asking whether approval also covers that prerequisite and whether its instance should stop; no answer has been received at this recorded result. No paid-call authorization is inferred.

## Read-only checks

- `git fetch origin personal --tags`: exit 0; latest target remains `5e3cb2f720e6fc80173099075daf55594ed58de9`.
- New ticket HEAD remains `b76e65f291a48fbcc69490ae61f23569d36477e7`; `git rev-list --left-right --count HEAD...origin/personal`: `9 0`. Target did not advance beyond the user handoff state; no additional integration/rerun needed solely for this refresh. DR-001 build and 242 passing non-paid tests remain the current integrated executable evidence.
- Current package version `1.4.92-beta.9`; GH latest stable API returns `v1.4.91`, published/non-draft/non-prerelease. Recent published releases are `v1.4.92-beta.1` through `.9`.
- `git ls-remote --tags origin refs/tags/v1.4.92`: exit 0, no matching tag. Next proposed stable is **1.4.92**; recheck absence immediately before helper execution. No version/tag was changed or reserved.
- `gh auth status`: authenticated repository/workflow-capable account; no token recorded.
- Root `personal` checkout is at the checked base but contains unrelated untracked article/application/shared build/receipt artifacts. Do not remove or stage those to satisfy release-helper cleanliness. Finalization must preserve them and use a safe clean release checkout after the recorded target is updated.

## Documented execution path — NOT EXECUTED

After both package acceptance gates are reconciled, refresh/check/finalize each applicable ticket and archive its folder before final commit. Ticket final commit → ticket push → recorded `personal` update → ticket merge → target push. Do not bypass old delivery by promoting its transitive ancestry through the new package.

Then use the documented root helper from a clean finalized checkout of the recorded target:

```sh
pnpm release 1.4.92 -- --release-notes tickets/done/gemini-tts-voice-schema-audit/release-notes.md
```

Helper owns package bump, curated-note sync, release commit, annotated tag and branch/tag push. A fresh tag push starts Desktop Release, Android APK Release, iOS App Store Connect Release and Server Docker Release. No immediate duplicate manual dispatch.

Monitor publication jobs, desktop architectures and updater metadata, stable non-draft/non-prerelease release/assets, Android artifact, iOS upload outcome and multi-architecture Docker version/latest publication. Tag push alone is not rollout success. No production runtime deployment, App Store public review approval or fresh provider entitlement is inferred from CI publication.

## Current result

Preflight **Pass**, execution **held** for the separately unresolved old user-verification/finalization gate. No archive, final commit/push, target merge, release commit/tag/push, publication, old instance operation or worktree/branch cleanup was performed this round.
