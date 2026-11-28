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
