# Solution Revision Record

## SR-001 (2026-11-28)

- Trigger: autobyteus-669 from `/project_task_manager` (the founder's avatars, 2026-11-26 and 2026-11-28).
- Status: requirements Approved (Solution Designer within the direction, user informed); design Ready.
- Findings:
  - avatars exist for definitions, with a personal setting and desktop `<img>` renderers;
  - there is no package convention;
  - the phone draws none;
  - tree rows name no definition;
  - avatar addresses are relative, which may not resolve in the installed `file://` window (unproven; the design holds either way).
- Decisions:
  - DEC-001: an `avatar.{png,jpg,jpeg,webp}` file, 1 MiB;
  - DEC-002: the order through the base address;
  - DEC-003: one picture per definition;
  - DEC-004: an authorized fetch with a shared cache;
  - DEC-005: the existing slots;
  - DEC-006: peers get the fallback;
  - DEC-007: orgs included.
- Data contract: the effective `avatarUrl`, a new route, `RunTreeRowDto.definitionId`; no stored data.
- Classification: `Large` / `High`. Routing: architecture review.

## SR-002 (2026-11-28)

- Trigger: ARCH-REV-001 failed (AR-001 blocking; N-1…N-5).
- AR-001: once `avatarUrl` is effective, the forms read and saved it as the user's picture.
  - A new `userAvatarUrl` is the one owner of "is there a user picture".
  - The forms (W-6) edit only it; Remove is offered only for it, and means null.
  - The server refuses `''` and any definition-avatar address (by path, any `?v=`) as a user picture, through one shared helper.
  - Walks recorded for package and own definitions of every kind.
- Notes adopted:
  - N-1: no symlinked avatar;
  - N-2: log on a change of reason;
  - N-3: hash reuse by size and mtime;
  - N-4: the feed carries personal-setting changes (verified);
  - N-5: Org parts' definition IDs come from `ownTreeOf`'s container branch.
- Requirements: REQ-003 made precise (Remove only for the user's picture). Within the direction, user informed.
- Classification: still `Large` / `High`. Routing: architecture review.
- Design case: Case 34 (a field that changes meaning keeps its old consumers).
