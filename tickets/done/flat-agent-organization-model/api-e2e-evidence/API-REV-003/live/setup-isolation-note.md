# API-REV-003 setup and isolation note

- Intended isolated backend: `127.0.0.1:8437`; intended production renderer:
  `127.0.0.1:3437`; data root: `live/server-data`.
- The first Nuxt production build set only legacy `BACKEND_*` variables. The
  repository's `.env.production` retained `NUXT_PUBLIC_*` values for the shared
  `127.0.0.1:8000` backend. Performance-resource inspection detected this before
  any run was launched.
- The fixture import made through that incorrectly configured renderer was
  immediately removed through the same real Settings UI. The shared server's
  Agent list no longer showed the fixture definitions before testing resumed.
- The authoritative renderer was rebuilt with the exact `NUXT_PUBLIC_*` values
  pointing only to `8437`; every recorded package, Team, Org, task, persistence,
  restart, and responsive journey thereafter used the isolated root.
- Final direct shared configuration checks show `/home/autobyteus/data/.env`
  contains only the pre-existing public/private roots and
  `/home/autobyteus/data/agent-packages/registry.json` contains no reference to
  the API fixture. The broad retained grep log is not used as an absence
  assertion because normal conversation/trace evidence can legitimately contain
  the fixture path.
